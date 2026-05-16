# FRED Fetcher: Bulk-fetch Rates & CB Policy series

## Context

The `Rates & CB Policy` block is one of 6 blocks in the macro screener. It tracks 6 indicators driven by FRED time series. Today, only the existing single-series proxy `app/api/admin/fred/route.ts` exists — it fetches one series and returns raw JSON without persistence. The `indicator_observations` table was added in a recent migration but is unused.

This task delivers the next dependency in the roadmap (Task 2 from `context_docs/rates_cb_policy_research.md`): a **bulk fetcher** that pulls all FRED series needed for the Rates & CB Policy block in parallel and persists them via upsert. Downstream scoring engines (Tasks 3–7) will read from `indicator_observations`, so this fetcher is the foundation for real (non-seeded) data flowing into the dashboard.

ClickUp: [Dev] FRED Fetcher: Bulk-fetch Rates & CB Policy series — `86d2we69w`.

---

## Series to fetch

Hard-coded registry for the `rates` block:

| Series ID  | Description                        | Frequency |
|------------|------------------------------------|-----------|
| `DFF`      | Fed Funds Effective Rate           | Daily     |
| `T10Y2Y`   | Yield curve 2Y–10Y                 | Daily     |
| `WALCL`    | Fed balance sheet                  | Weekly    |
| `DGS10`    | 10Y Treasury yield                 | Daily     |
| `T10YIE`   | 10Y breakeven inflation            | Daily     |
| `DFEDTARU` | Fed target rate upper bound        | Event     |

---

## Files to create

### 1. `lib/fred/series-catalog.ts` (new)
Central source of truth mapping block keys → series. Allows future blocks (Inflation, Liquidity, etc.) to register their series without changing the fetcher.

```ts
export type BlockKey = "rates"; // future: "inflation" | "liquidity" | ...

export const SERIES_BY_BLOCK: Record<BlockKey, readonly string[]> = {
  rates: ["DFF", "T10Y2Y", "WALCL", "DGS10", "T10YIE", "DFEDTARU"],
};
```

### 2. `lib/fred/fetcher.ts` (new)
Pure service layer (no Next.js dependency) — callable from the API route, future scheduler, or scripts.

Exports:
- `fetchSeriesObservations(seriesId, start, end)` — single FRED call. Returns `{ seriesId, observations: Array<{date: string, value: string}> }`. Throws on HTTP error or missing API key.
- `fetchAndStoreBlock(blockKey, start, end)` — main entry point:
  1. Look up series from `SERIES_BY_BLOCK[blockKey]`.
  2. Default `start` to today − 90 days, `end` to today (ISO `YYYY-MM-DD`).
  3. Run all `fetchSeriesObservations` calls via `Promise.allSettled` (parallel, partial-success tolerant).
  4. For each successful series, filter out FRED's `"."` missing-value sentinel and upsert observations into `indicator_observations` using Drizzle's `.onConflictDoUpdate` against the `indicator_observations_series_date_idx` unique index. Update `value` and `fetchedAt` on conflict.
  5. Return per-series summary: `{ seriesId, status: "ok" | "error", count: number, error?: string }[]` plus aggregates.

Implementation notes:
- Reuse FRED URL building logic from `app/api/admin/fred/route.ts:17-22` (move to a small `buildFredUrl` helper inside `fetcher.ts`; do NOT modify the existing route).
- Use `db` from `lib/db.ts` and `indicatorObservations` from `shared/schema.ts:62`.
- Source string: `"FRED"`.
- Batch upsert per series in a single `db.insert(...).values([...]).onConflictDoUpdate(...)` call to minimize round-trips.

### 3. `app/api/admin/fetch-indicators/route.ts` (new)
Thin POST handler that delegates to the service.

- Method: `POST`
- Query params:
  - `block` — required, currently only `"rates"` accepted (validate against `SERIES_BY_BLOCK` keys).
  - `start`, `end` — optional ISO `YYYY-MM-DD`. Validate format if provided.
- Behavior: call `fetchAndStoreBlock(block, start, end)`, return summary JSON.
- Response shape:
  ```json
  {
    "block": "rates",
    "start": "2026-02-09",
    "end": "2026-05-10",
    "totalStored": 540,
    "results": [
      { "seriesId": "DFF", "status": "ok", "count": 90 },
      { "seriesId": "WALCL", "status": "error", "count": 0, "error": "..." }
    ]
  }
  ```
- HTTP status: `200` if at least one series succeeded, `502` if all failed, `400` on bad params, `500` on missing `FRED_API`.

---

## Files to leave untouched
- `app/api/admin/fred/route.ts` — keep as-is (current admin UI debug tool depends on it).
- `app/admin/fred-section.tsx` — UI wiring is out of scope for this task.
- `shared/schema.ts` — table already exists and is correct.

---

## Reusable utilities found
- `db` instance: `lib/db.ts:15`
- `indicatorObservations` table + `InsertIndicatorObservation` type: `shared/schema.ts:62-82`
- Unique index for upsert: `indicator_observations_series_date_idx` on `(seriesId, observationDate)` — `shared/schema.ts:73`
- FRED URL pattern reference: `app/api/admin/fred/route.ts:17-22`

No prior bulk fetcher / series catalog exists — these are the first.

---

## Verification

1. **Type check**: `npm run check` (or `tsc --noEmit`) passes.
2. **Manual API test** (dev server running):
   ```bash
   # Defaults (last 90 days)
   curl -X POST 'http://localhost:3000/api/admin/fetch-indicators?block=rates'

   # Explicit range
   curl -X POST 'http://localhost:3000/api/admin/fetch-indicators?block=rates&start=2026-01-01&end=2026-05-01'
   ```
   Expect 200 with per-series counts > 0 for daily series; `WALCL` count smaller (weekly).
3. **Idempotency**: re-run the same request — `totalStored` should be similar and DB row count unchanged (upsert path).
4. **DB inspection** (psql or Drizzle Studio):
   ```sql
   SELECT series_id, COUNT(*), MIN(observation_date), MAX(observation_date)
   FROM indicator_observations GROUP BY series_id;
   ```
   Expect 6 rows, one per series, with date ranges within the requested window.
5. **Error handling check**: temporarily pass `block=invalid` → 400; temporarily unset `FRED_API` → 500; invalid date format → 400.
6. **Partial-failure check**: pass an unrealistically future range (e.g. `start=2099-01-01`) → series return 0 observations but request still 200.
