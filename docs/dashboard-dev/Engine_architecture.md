# Scoring Engine & FRED Fetcher — Architecture

Cross-cutting infrastructure shared by all 6 blocks. Designed and first built alongside Block 1 (`Block1_Research--rates_cb_policy.md`); every subsequent block plugs into it by adding a folder under `lib/scoring/blocks/<block>/` and registering in `registry.ts`. No core changes per block.

---

## 1. Architectural decisions

### 1.1 On-demand computation (no persisted scores)
The engine reads `indicator_observations` and computes scores at request time. Nothing scoring-related is written back to the DB.

**Why**
- Formula edits (future admin feature) take effect instantly and retroactively across all historical dates.
- One source of truth: the scorer class IS the score. No drift between code and stored values.
- No invalidation/recompute jobs on formula changes.
- Simpler schema: `indicator_observations` (+ `indicator_manual_inputs`) is the only persisted truth.

**Trade-offs accepted**
- Per-request compute cost (small at this dataset size — measure before caching).
- No frozen historical record of "what was shown on day X under formula Y" until `scoring_formulas` versioning is added.
- Trend lines require N-date computation via `Promise.all`; revisit caching only if `/api/dashboard` exceeds ~200ms.

**Deferred**
- `scoring_formulas` (versioned bands) — only when the admin formula editor is built.
- `scoring_cache` — only if perf demands it.

### 1.2 Class-based, declarative scorers
Each indicator is a class extending `IndicatorScorer`, carrying four concerns in lockstep: `compute()`, `bands[]`, `formula` text, and `examples[]`. The admin engine page reads this metadata directly — no per-indicator UI code.

### 1.3 Score scale mapping
- Per-indicator score: `1–5` (matches `metrics.maxScore = 5`).
- Block score: `avg(indicator scores) × 4` → `0–20` (matches `blocks.maxScore = 20`).
- Total score: `Σ block scores` → `0–120` (matches `snapshots.totalScore`).

Preserves backwards compatibility with the existing UI and regime mappings.

### 1.4 Coexistence with mock dashboard
The seed-driven `snapshots/blocks/metrics/trendPoints` tables remain functional during rollout. A `mode` URL param on `/api/dashboard` switches data source; one dashboard component renders both since the engine adapter outputs the existing UI shape. `shared/schema.ts` marks these tables `// MOCK — remove when engine covers all 6 blocks`. Cutover: when all 6 blocks have scorers, delete the `mergeBlocks` fallback and the mock seed in one commit.

---

## 2. File layout

```
lib/scoring/
├── types.ts                # Score, ScoreBand, ScoringResult, BlockResult, SnapshotResult
├── indicator-scorer.ts     # Abstract base class
├── block-engine.ts         # Scores a single block
├── snapshot-engine.ts      # Orchestrates all blocks
├── observations-repo.ts    # Read layer over indicator_observations
├── manual-inputs-repo.ts   # CRUD over indicator_manual_inputs
├── manual-inputs-catalog.ts# Registry-derived catalog of source:"manual" series
├── helpers.ts              # clamp, latest, deltaOverDays, yoyPctFromIndex, observationAtOrBefore, etc.
├── dashboard-adapter.ts    # SnapshotResult → existing dashboard UI shape (PLANNED_BLOCK_NAMES)
├── registry.ts             # BLOCKS[] — single source of truth
└── blocks/<block>/         # per-block folder: index.ts (BlockDefinition) + one file per scorer
```

Future blocks: add `blocks/<block>/`, register in `registry.ts`. Zero core changes.

---

## 3. Core contracts

### 3.1 Types (`lib/scoring/types.ts`)
```ts
export type Score = 1 | 2 | 3 | 4 | 5;

export type SeriesInputSpec = {
  seriesId: string;          // "DFF", "WALCL"
  lookbackDays: number;
  required: boolean;
  source?: "fred" | "manual"; // omitted → indicator_observations
};

export type ScoreBand = {
  score: Score;
  label: string;             // "Very Bearish"
  rangeLabel: string;        // ">5.25%"
  test: (v: number) => boolean;
  interpretation: string;
};

export type ScoringResult = {
  indicatorKey: string;
  score: Score;
  rawValue: number | null;
  bandLabel: string;
  interpretation: string;
  inputsUsed: Array<{ seriesId: string; date: string; value: number }>;
  formulaTrace: string;      // "DGS10 (4.21) − T10YIE (2.32) = 1.89"
  warning?: string;
};

export type BlockResult = {
  blockKey: string;
  blockName: string;
  asOfDate: string;
  indicators: ScoringResult[];
  blockAverage: number;      // 1.0–5.0
  blockScore: number;        // avg × 4, 0–20
  regimeLabel: string;
};

export type SnapshotResult = {
  asOfDate: string;
  blocks: BlockResult[];
  totalScore: number;        // 0–120
  regime: string;
  computedAt: string;
};
```

### 3.2 Abstract base class (`lib/scoring/indicator-scorer.ts`)
Each scorer declares `key`, `name`, `blockKey`, `unit`, `description`, `formula`, `formulaPretty`, `inputs[]`, `bands[]`, `examples[]`, and a pure `compute(input): ScoringResult`.
- `latest(input, seriesId)` — newest observation for a series (`observations[seriesId]?.[0] ?? null`).
- `band(value)` — first `ScoreBand` whose `test(value)` passes; defaults to score 3.

### 3.3 Block & snapshot engines
`SnapshotEngine` runs `this.registry.map(def => new BlockEngine(def).scoreBlock(asOfDate))` in parallel via `Promise.all`, sums `blockScore` → `totalScore`, maps to a regime. `computeRange(dates[])` fans out for trend lines. Pure: same observations + same registry → same result. No DB writes, no globals.

### 3.4 Example scorer shape
The canonical pattern (from `blocks/rates/real-interest-rate.ts`): declare metadata + `bands[]` + `examples[]`, then `compute()` pulls `latest()` inputs, guards for missing data (return score 3 + `warning`), computes the raw value, calls `band()`, and returns a `ScoringResult` with a human-readable `formulaTrace`. Every scorer differs only in its `compute()` body and `bands[]`.

---

## 4. FRED bulk fetcher

Pure service layer (`lib/fred/fetcher.ts`, no Next.js dependency) callable from the API route, a future scheduler, or scripts.

- `fetchSeriesObservations(seriesId, start, end)` — single FRED call → `{ seriesId, observations: [{date, value}] }`. Throws on HTTP error or missing API key.
- `fetchAndStoreBlock(blockKey, start, end)`:
  1. Look up series from `SERIES_BY_BLOCK[blockKey]` (`lib/fred/series-catalog.ts`).
  2. Default `start` to today − 90 days, `end` to today (ISO `YYYY-MM-DD`).
  3. Run all series via `Promise.allSettled` (parallel, partial-success tolerant).
  4. Filter FRED's `"."` missing-value sentinel; batch-upsert per series via Drizzle `.onConflictDoUpdate` on the `indicator_observations_series_date_idx` unique index (`(seriesId, observationDate)`). Update `value` + `fetchedAt` on conflict. Source string `"FRED"`.
  5. Return per-series summary `{ seriesId, status, count, error? }[]` plus aggregates.

**`series-catalog.ts`** — central `BlockKey` union + `SERIES_BY_BLOCK` map. Only FRED-fetched series are listed; CSV-seeded (`source: "CBOE"`/`"FreeGoldAPI"`) and manual (`source: "manual"`) series are excluded so the auto-fetcher skips them.

### FRED API details
- Base URL: `https://api.stlouisfed.org/fred/series/observations`
- Auth: API key via `FRED_API` env var
- Existing single-series debug proxy: `GET /api/admin/fred?series=DFF&start=&end=` — **left untouched** (admin UI depends on it); the bulk fetcher reuses its URL-building logic via a local `buildFredUrl` helper.
- Docs: https://fred.stlouisfed.org/docs/api/fred/series_observations.html

---

## 5. API surface

| Route | Method | Purpose |
|---|---|---|
| `/api/dashboard?mode=mock\|engine&date=YYYY-MM-DD` | GET | Main dashboard. `mode=mock` reads seed tables; `mode=engine` runs `SnapshotEngine`, merges with mock fallback for unimplemented blocks. |
| `/api/admin/engine/metadata` | GET | Full registry — block defs, scorer metadata, bands, examples, formulas. Static, no DB. |
| `/api/admin/engine/live?date=YYYY-MM-DD` | GET | Raw `SnapshotResult` from the engine (untransformed). |
| `/api/admin/engine/trend?indicator=KEY&days=400` | GET | Historical scores for one indicator. |
| `/api/admin/fetch-indicators?block=KEY&start=&end=` | POST | FRED bulk fetch. `200` if ≥1 series succeeds, `502` if all fail, `400` bad params, `500` missing `FRED_API`. |
| `/api/admin/manual-inputs` | GET/POST | CRUD for `source:"manual"` series (registry-derived catalog). |

**`/api/dashboard?mode=engine` flow:** `SnapshotEngine.compute(today)` → `mergeBlocks(mockSnapshot, engineSnapshot)` (engine overrides matching blocks) → `dashboard-adapter` → JSON in existing UI shape.

---

## 6. Frontend mode switcher

Single toolbar control at the top of the dashboard, persisted to `localStorage`:
```
Data source:  ● Mock  ○ Engine
```
The switch only changes the fetch URL; the same `dashboard.tsx` renders both. When the engine fully covers everything, either flip the default to `engine` and retire the switch, or keep it for QA/regression demos.

---

## 7. Admin engine page (`/admin/engine`)

Read-only documentation page driven entirely by registry metadata — zero per-indicator UI code. Per-indicator cards render: header + live score badge + band label, description, formula block (`formulaPretty` + live `formulaTrace`), inputs table (FRED links), 5-row scoring-bands table (current band highlighted), 2–3 worked examples, a 12-month sparkline (`/api/admin/engine/trend`), and a client-side Try-it panel that runs `scorer.compute()` locally.

Components: `<IndicatorCard>`, `<ScoringBandsTable>`, `<FormulaBlock>`, `<TryItPanel>`, `<BlockSummary>`, `<IndicatorSparkline>` — all driven by registry metadata + the `/api/admin/engine/*` routes.

---

## 8. Schema impact

**No engine-specific tables** beyond `indicator_observations` and `indicator_manual_inputs`. Seed/mock tables (`snapshots`/`blocks`/`metrics`/`trendPoints`) remain during rollout, commented `// MOCK — remove when engine covers all 6 blocks`.

**Future additions** (not part of core):
- `scoring_formulas` (versioned `bands_json`) — when the admin formula editor lands; classes remain the canonical fallback.
- `scoring_cache` — only if perf demands it.

---

## 9. Key properties

- **Single source of truth** — scorer classes define name, description, formula, bands, examples, and computation in one place; the admin UI reads the same objects.
- **Pure functions** — same observations → same result. Easy to test, no globals.
- **Retroactive formula edits** — changing a band in code affects all historical dates on the next request.
- **Scalable to 6 blocks** — new block = new folder + register. No core changes.
- **Coexistence with mock** — the mode switcher allows incremental per-block rollout.
