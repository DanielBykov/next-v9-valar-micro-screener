# Rates & CB Policy Block — Research & Implementation Plan

## Overview

The Rates & CB Policy block tracks 6 indicators related to Federal Reserve monetary policy. This is the most API-friendly block — 4 of 6 indicators are fully automatable from FRED, 1 is derivable, and 1 requires manual input (~8x/year).

Current Fed Funds Rate (as of May 2026): **3.50–3.75%** (held steady since Sep 2025 cuts).

---

## Indicator Data Sources

| # | Indicator | FRED Series | Native Freq | Auto? | Notes |
|---|-----------|-------------|-------------|-------|-------|
| 1 | Fed Funds Rate Level | `DFF` (daily) / `FEDFUNDS` (monthly) | Daily / Monthly | Yes | Use `DFF` for daily granularity |
| 2 | Last Rate Change Direction | Derived from `DFF` or `DFEDTARU`/`DFEDTARL` | Event (~8x/yr) | Semi | Compare consecutive target rate values around FOMC dates |
| 3 | Forward Guidance Tone | None — qualitative | Event (~8x/yr) | No | Manual admin input or future NLP on FOMC statements |
| 4 | Yield Curve (2Y–10Y) | `T10Y2Y` | Daily | Yes | Direct series, no calculation needed |
| 5 | QE / QT Policy | `WALCL` | Weekly (Wed) | Yes | Calculate 4-week $ change → monthly pace |
| 6 | Real Interest Rate | `DGS10` minus `T10YIE` | Daily | Yes | Subtract two series: 10Y yield − 10Y breakeven inflation |

### FRED API Details

- Base URL: `https://api.stlouisfed.org/fred/series/observations`
- Auth: API key via `FRED_API` env var (already configured)
- Existing proxy route: `GET /api/admin/fred?series=DFF&start=YYYY-MM-DD&end=YYYY-MM-DD`
- Frequency param: `d` (daily), `w` (weekly), `m` (monthly) — can aggregate server-side
- Docs: https://fred.stlouisfed.org/docs/api/fred/series_observations.html

### Non-FRED Sources Considered

- **CME FedWatch API** ($25/mo) — rate probabilities implied by futures. Useful for forward-looking sentiment but not needed for MVP. https://www.cmegroup.com/market-data/market-data-api/fedwatch-api.html
- **FOMC Statements** — text available at https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm. Could be parsed with NLP/LLM in the future for Forward Guidance Tone automation.
- **Fed Target Rate series** (`DFEDTARU` / `DFEDTARL`) — upper/lower bounds of the target range. Better than `DFF` for detecting exact rate change decisions.

---

## Scoring Matrix

### 1. Fed Funds Rate Level

| Score | Range | Interpretation |
|-------|-------|----------------|
| 1 (Very Bearish) | >5.25% | Aggressive tightening; cost of capital very high |
| 2 (Bearish) | 4.00–5.25% | Restrictive territory; credit tightening underway |
| 3 (Neutral) | 2.50–3.99% | Near estimated neutral rate (~2.5–3%) |
| 4 (Bullish) | 1.00–2.49% | Accommodative; supportive for borrowing and risk assets |
| 5 (Very Bullish) | <1.00% | Emergency/near-zero; maximum monetary accommodation |

### 2. Last Rate Change Direction

| Score | Event | Interpretation |
|-------|-------|----------------|
| 1 | Hike >=50bps | Aggressive tightening; inflation emergency |
| 2 | Hike 25bps | Standard tightening; hawkish trajectory |
| 3 | Hold / No Change | Pause; could pivot either way |
| 4 | Cut 25bps | Easing cycle begins; bullish pivot signal |
| 5 | Cut >=50bps | Emergency/aggressive easing; very bullish |

Implementation: Compare consecutive `DFEDTARU` values. Between FOMC meetings, carry the last score forward.

### 3. Forward Guidance Tone

| Score | Tone | Interpretation |
|-------|------|----------------|
| 1 | Very Hawkish | Explicit language about more hikes needed |
| 2 | Hawkish | Bias toward tightening; inflation emphasis |
| 3 | Balanced / Neutral | Acknowledges both inflation and growth risks |
| 4 | Dovish | Emphasis on growth risks; hints at easing |
| 5 | Very Dovish | Explicit easing bias; mentions rate cuts |

Implementation: Manual admin entry after each FOMC meeting (~8x/year). Future: NLP on FOMC minutes/press conference text.

### 4. Yield Curve (2Y–10Y)

| Score | Range (bps) | Interpretation |
|-------|-------------|----------------|
| 1 | < -50 | Deep inversion; strong recession signal |
| 2 | -50 to -1 | Inverted; recession probability elevated |
| 3 | 0 to +50 | Flat to mildly positive; transition zone |
| 4 | +51 to +150 | Normal positive slope; healthy term premium |
| 5 | > +150 | Steep curve; strong growth expectations |

Note: Inversion has preceded every US recession since 1970. Un-inversion speed matters too.

### 5. QE / QT Policy

| Score | Monthly Balance Sheet Change | Interpretation |
|-------|------------------------------|----------------|
| 1 | QT > $60B/month | Aggressive balance sheet reduction |
| 2 | QT $30–60B/month | Moderate runoff; gradual liquidity withdrawal |
| 3 | No change / Taper pause | Balance sheet stable; neutral |
| 4 | Slowing QT / Taper talk | Liquidity drain easing; bullish shift |
| 5 | Active QE (expanding) | Maximum liquidity support |

Implementation: Fetch last ~5 `WALCL` observations, compute 4-week change, annualize/monthly-ize.

### 6. Real Interest Rate

| Score | Range (%) | Interpretation |
|-------|-----------|----------------|
| 1 | > 2.5% | Very restrictive; strong headwind for equities |
| 2 | 1.5–2.5% | Restrictive; real cost of capital elevated |
| 3 | 0.5–1.49% | Moderately positive; near neutral |
| 4 | -0.5% to 0.49% | Low/slightly negative; supportive for risk assets |
| 5 | < -0.5% | Deeply negative; very bullish for equities |

Implementation: `real_rate = DGS10_value - T10YIE_value` for the same date.

---

## Block Aggregate Scoring

| Block Average | Label | Interpretation |
|---------------|-------|----------------|
| 1.0–1.8 | VERY RESTRICTIVE | Aggressive tightening, deep inversion, hawkish guidance, active QT, high real rates. Maximum headwind. |
| 1.9–2.5 | RESTRICTIVE | Policy tight but not extreme. Rates elevated, curve flat/inverted. |
| 2.6–3.4 | NEUTRAL / TRANSITIONAL | Policy at crossroads. Rates near neutral, guidance balanced. |
| 3.5–4.2 | ACCOMMODATIVE | Easing cycle underway or imminent. Supportive for risk assets. |
| 4.3–5.0 | VERY ACCOMMODATIVE | Emergency easing, near-zero rates, active QE. Maximum tailwind. |

---

## Current Codebase State

### What exists
- FRED API proxy: `app/api/admin/fred/route.ts` — working, tested
- `FRED_API` env var configured in `.env`
- DB schema (`shared/schema.ts`): `snapshots`, `blocks`, `metrics`, `trendPoints` tables
- Dashboard UI renders blocks with 6 metrics each, scores, interpretations, top drivers
- Admin panel at `/admin` with database management and FRED test section
- Drizzle ORM + Neon PostgreSQL

### What's missing
- **No raw data storage** — schema only stores final scores, not underlying values (e.g., 3.75%, -22bps)
- **No scoring engine** — no logic to convert raw values → 1–5 scores
- **No automated fetcher** — no scheduled/triggered FRED data pull
- **No manual entry UI** — no way to input qualitative indicators (Forward Guidance Tone)
- **No derived calculations** — no logic to compute Real Interest Rate or detect rate changes

---

## Implementation Tasks (Dependency Order)

```
[1] Schema: Add raw indicator observations table
 └→ [2] FRED Fetcher: Bulk-fetch all Rates & CB Policy series
     └→ [3] Scoring: Fed Funds Rate Level
     └→ [4] Scoring: Yield Curve (2Y–10Y)
     └→ [5] Scoring: QE / QT Policy (balance sheet change)
     └→ [6] Scoring: Real Interest Rate (calculated)
     └→ [7] Scoring: Last Rate Change Direction (derived)
         └→ [8] Admin UI: Manual input for Forward Guidance Tone
             └→ [9] Block Aggregator: Compute block score + regime label
                 └→ [10] Dashboard: Wire real data to UI
```

Tasks 3–7 can be done in parallel. Task 8 is independent of 3–7.

### Task Details

1. **Schema: Add raw indicator observations table**
   - New `indicator_observations` table: `id`, `series_id` (e.g. "DFF"), `observation_date`, `value` (numeric), `source` (e.g. "FRED"), `fetched_at` (timestamp)
   - Drizzle schema + migration
   - Upsert logic (don't duplicate same series+date)

2. **FRED Fetcher: Bulk-fetch all Rates & CB Policy series**
   - Service function fetching `DFF`, `T10Y2Y`, `WALCL`, `DGS10`, `T10YIE` in parallel
   - Store all observations in the new table
   - API route: `POST /api/admin/fetch-indicators`
   - Accept date range params (default: last 90 days)

3. **Scoring: Fed Funds Rate Level** — Range-based on DFF value
4. **Scoring: Yield Curve** — Range-based on T10Y2Y value (in percentage, multiply by 100 for bps)
5. **Scoring: QE / QT Policy** — 4-week delta of WALCL, classify monthly pace
6. **Scoring: Real Interest Rate** — DGS10 - T10YIE, range-based
7. **Scoring: Last Rate Change Direction** — Detect changes in DFEDTARU between FOMC dates
8. **Admin UI: Manual Forward Guidance Tone** — Form with 1–5 score + justification text + date
9. **Block Aggregator** — Average 6 scores → block score → regime label → write to `blocks` + `metrics`
10. **Dashboard Wiring** — Replace seed data with real pipeline output for this block
