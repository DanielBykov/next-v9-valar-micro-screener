# Block 5 — Business Cycle & Rotation

**Block key:** `business_cycle` · **Block weight:** 25% · **6 indicators** · **`sortOrder: 4`**
**Spec source of truth:** `docs_local/one-drive-macro-screener/scoring-engine/block-5-business-cycle.md`
**Weights source:** `docs_local/one-drive-macro-screener/scoring-engine/weights.csv`
**Data status:** `docs_local/one-drive-macro-screener/scoring-engine/indicators-data-status.md`

**Status: SHIPPED.** Block 5 is wired into the engine and computes a live score. It is no longer in `PLANNED_BLOCK_NAMES`. Verified on `asOfDate=2026-05-01`: all 6 indicators match the validated seeded `score` columns (block avg 3.85 → score 15 → HEALTHY EXPANSION).

---

## Design decisions (V1, as built)

1. **5.1 ISM PMI, 5.2 LEI, 5.3 Small/Large, 5.4 Growth/Value, 5.6 IPO = manual inputs; 5.5 HY Spread = FRED.** The five manual series are bulk-seeded into `indicator_manual_inputs` via `seed-block5-manual.ts` and also surface on `/admin/manual-inputs` for monthly refresh. 5.5 `BAMLH0A0HYM2` is auto-fetched from FRED.
2. **5.2 LEI seeds the pre-computed `lei_yoy` column, not the raw index.** The Conference Board LEI was rebased in 2016; deriving YoY in-code across the rebase would corrupt the result. The source-of-truth CSV already publishes a correctly rebase-adjusted `lei_yoy`. The scorer bands that value directly. (Same philosophy as Block 4's gold-YoY exception, but here the YoY is pre-computed upstream rather than computed in-code.)
3. **5.3 / 5.4 seed the pre-computed `ratio_90d_pct`, not the raw ratio level — DESIGN PIVOT.** The original plan was to seed the raw daily ratio and recompute the 90-day % change in code (a new `pctChangeOverWindow` helper). During verification this diverged ~11% from the validated seeded scores: the CSV's `ratio_90d_pct` is computed upstream from *continuous daily underlying prices*, but the seeded ratio series has mixed weekly/daily cadence plus forward-fill, so an in-code 90-calendar-day window lands on a different baseline. Concrete case (2026-05-01): in-code recompute gave +7.71% (score 4) vs the validated +0.15% (score 3). **Resolution:** seed and band the validated upstream `ratio_90d_pct` directly under series IDs `IWM_SPY_RATIO_90D_PCT` / `SPYG_SPYV_RATIO_90D_PCT`. The `pctChangeOverWindow` helper was removed (never shipped to `main`).
4. **5.6 IPO scored linear ascending** on 12M-trailing proceeds ($bn), matching the seeded `score` column. Top band carries a documented cycle-peak frothiness caveat (1999/2007/2021). A U-shaped rubric (penalising froth) stays a documented future option.
5. **5.5 HY Spread: FRED publishes OAS in percent; scorer converts ×100 → bps.** `BAMLH0A0HYM2` value `2.77` = 277 bps. Scored numeric_descending (tight spreads = high score).
6. **Empty placeholder rows skipped at seed time.** 5.3/5.4/5.6 CSVs have leading placeholder windows with empty value columns; `pushSeries` skips empty/non-numeric values, so the scorer reports "missing" until real data starts.

---

## Indicators

| ID | Indicator | Series ID | Type | Indicator weight | Effective weight | Source | Lookback |
|---|---|---|---|---:|---:|---|---|
| 5.1 | ISM Manufacturing PMI | `ISM_MFG_PMI` | numeric_ascending (level) | 25% | 6.25% | Manual | 60d* |
| 5.2 | LEI YoY | `CB_LEI_YOY` | numeric_ascending (pre-computed YoY) | 25% | 6.25% | Manual | 60d* |
| 5.5 | High Yield Spread | `BAMLH0A0HYM2` | numeric_descending (bps) | 25% | 6.25% | FRED | 14d |
| 5.3 | Small vs Large | `IWM_SPY_RATIO_90D_PCT` | numeric_ascending (pre-computed 90d %) | 10% | 2.50% | Manual | 14d |
| 5.4 | Growth vs Value | `SPYG_SPYV_RATIO_90D_PCT` | numeric_ascending (pre-computed 90d %) | 10% | 2.50% | Manual | 14d |
| 5.6 | IPO Activity | `IPO_TRAILING_12M_PROCEEDS` | numeric_ascending (level) | 5% | 1.25% | Manual | 60d |

\* As-built lookback values: ISM and LEI use the daily-cadence seeded series so a short window suffices; confirm exact `lookbackDays` in each scorer file. Indicator weights sum to 100% within Block 5; Block 5 = 25% of total → effective weights as shown.

---

## Scoring matrices (as built — bands match seeded `score` columns)

### 5.1 ISM Manufacturing PMI (`ISM_MFG_PMI`, index level)
| Score | Label | Range |
|---|---|---|
| 1 | Deep Contraction | < 45 |
| 2 | Contraction | 45 – 48.9 |
| 3 | Stall / Neutral | 49 – 51 |
| 4 | Healthy Expansion | 51.1 – 55 |
| 5 | Strong Expansion | > 55 |

### 5.2 LEI YoY (`CB_LEI_YOY`, % YoY pre-computed)
| Score | Label | Range |
|---|---|---|
| 1 | Recession Signal | < −6% |
| 2 | Weakening | −6% to −2% |
| 3 | Stall / Transition | −2% to +2% |
| 4 | Expanding | +2% to +5% |
| 5 | Strong Expansion | > +5% |

### 5.5 High Yield Spread (`BAMLH0A0HYM2`, OAS → bps, descending)
| Score | Label | Range |
|---|---|---|
| 1 | Distress | > 800 bps |
| 2 | Stressed | 600 – 800 bps |
| 3 | Normal | 450 – 599 bps |
| 4 | Tight | 350 – 449 bps |
| 5 | Very Tight | < 350 bps |

### 5.3 Small vs Large (`IWM_SPY_RATIO_90D_PCT`, 90d % pre-computed)
| Score | Label | Range |
|---|---|---|
| 1 | Large Leading Hard | < −10% |
| 2 | Large-Leaning | −10% to −3% |
| 3 | Balanced | −3% to +3% |
| 4 | Small-Cap Leading | +3% to +10% |
| 5 | Strong Small-Cap Leadership | > +10% |

### 5.4 Growth vs Value (`SPYG_SPYV_RATIO_90D_PCT`, 90d % pre-computed)
| Score | Label | Range |
|---|---|---|
| 1 | Value Leading Hard | < −8% |
| 2 | Value-Leaning | −8% to −2% |
| 3 | Balanced | −2% to +2% |
| 4 | Growth Leading | +2% to +8% |
| 5 | Strong Growth Leadership | > +8% |

Tighter ±8/±2 thresholds than 5.3. Directional caveat (spec §5.4): growth leadership is ambiguous (rate-cut/risk-on OR late-cycle defensive flight). Weakest Block-5 indicator; possible future drop.

### 5.6 IPO Activity (`IPO_TRAILING_12M_PROCEEDS`, $bn 12M trailing, ascending)
| Score | Label | Range |
|---|---|---|
| 1 | Markets Frozen | < $10B |
| 2 | Subdued | $10B – $25B |
| 3 | Normal | $25B – $50B |
| 4 | Strong Activity | $50B – $100B |
| 5 | IPO Boom | > $100B (cycle-peak frothiness flag) |

---

## Data sources & ingestion

| Series ID | Table | Ingestion method | Source CSV |
|---|---|---|---|
| `BAMLH0A0HYM2` | `indicator_observations` | FRED auto-fetch (`SERIES_BY_BLOCK.business_cycle`) | n/a (FRED API) |
| `ISM_MFG_PMI` | `indicator_manual_inputs` | seed-block5-manual.ts | `indicator_5.1_ism_pmi/daily.csv` col `ism_pmi` |
| `CB_LEI_YOY` | `indicator_manual_inputs` | seed-block5-manual.ts | `indicator_5.2_lei/daily.csv` col `lei_yoy` |
| `IWM_SPY_RATIO_90D_PCT` | `indicator_manual_inputs` | seed-block5-manual.ts | `indicator_5.3_small_large/daily.csv` col `ratio_90d_pct` |
| `SPYG_SPYV_RATIO_90D_PCT` | `indicator_manual_inputs` | seed-block5-manual.ts | `indicator_5.4_growth_value/daily.csv` col `ratio_90d_pct` |
| `IPO_TRAILING_12M_PROCEEDS` | `indicator_manual_inputs` | seed-block5-manual.ts | `indicator_5.6_ipo_activity/daily.csv` col `trailing_12m_proceeds_bn` |

Base manual-data path: `docs_local/one-drive-macro-screener/data/manual/`.

**Seed usage (idempotent on `(series_id, observation_date)`):**
```bash
node --env-file=.env ./node_modules/.bin/tsx lib/scripts/seed-block5-manual.ts
```
Seeded row counts (2026-05): ISM_MFG_PMI 1217, CB_LEI_YOY 1217, IWM_SPY_RATIO_90D_PCT 1128, SPYG_SPYV_RATIO_90D_PCT 1128, IPO_TRAILING_12M_PROCEEDS 883 — total 5,573.

**FRED catalog change** (`lib/fred/series-catalog.ts`):
```ts
business_cycle: [
  "BAMLH0A0HYM2",  // ICE BofA US HY Index OAS, %, daily (5.5)
  // ISM_MFG_PMI, CB_LEI_YOY, IWM_SPY_RATIO_90D_PCT, SPYG_SPYV_RATIO_90D_PCT,
  // IPO_TRAILING_12M_PROCEEDS: manual inputs — bulk-seeded, excluded so the
  // FRED fetcher skips them.
],
```
Extend `BlockKey` union with `"business_cycle"`. HY spread fetched via `fetchAndStoreBlock("business_cycle", from, to)` (or `/api/admin/fetch-indicators?block=business_cycle`); 769 observations stored for 2022-09→2026-05.

---

## Files added / modified

**New:**
- `lib/scoring/blocks/business-cycle/index.ts` — `businessCycleBlock` + REGIME_MAP
- `lib/scoring/blocks/business-cycle/ism-pmi.ts` — 5.1
- `lib/scoring/blocks/business-cycle/lei-yoy.ts` — 5.2 (bands pre-computed YoY)
- `lib/scoring/blocks/business-cycle/high-yield-spread.ts` — 5.5 (FRED, ×100 → bps, descending)
- `lib/scoring/blocks/business-cycle/small-vs-large.ts` — 5.3 (bands pre-computed `IWM_SPY_RATIO_90D_PCT`)
- `lib/scoring/blocks/business-cycle/growth-vs-value.ts` — 5.4 (bands pre-computed `SPYG_SPYV_RATIO_90D_PCT`)
- `lib/scoring/blocks/business-cycle/ipo-activity.ts` — 5.6 (linear ascending)
- `lib/scripts/seed-block5-manual.ts` — bulk-load 5 manual series

**Modified:**
- `lib/scoring/registry.ts` — import + append `businessCycleBlock` to `BLOCKS`
- `lib/fred/series-catalog.ts` — `BlockKey` union + `SERIES_BY_BLOCK.business_cycle`
- `lib/scoring/dashboard-adapter.ts` — removed `"Business Cycle & Rotation"` from `PLANNED_BLOCK_NAMES`

**No schema changes.** Existing `indicator_observations` + `indicator_manual_inputs` tables suffice.

---

## Regime map (block average → label)

| blockAverage | Label | Interpretation |
|---|---|---|
| 1.0 – 1.8 | RECESSION / CONTRACTION | PMIs deep <50, LEI deeply negative, defensive rotation, HY >800bps, capital markets frozen |
| 1.9 – 2.5 | LATE CYCLE / SLOWDOWN | PMIs slipping, LEI weak, large-cap/growth defensive leadership, credit widening |
| 2.6 – 3.4 | MID-CYCLE / MIXED | Survey data steady ~50, LEI flat, rotation balanced, credit normal |
| 3.5 – 4.2 | HEALTHY EXPANSION | PMIs >51, LEI positive, broad participation, tight credit, healthy IPO pace |
| 4.3 – 5.0 | EARLY CYCLE / RECOVERY BOOM | Strong survey expansion, LEI accelerating, small-cap/cyclical leadership, very tight HY, IPO boom |

Direction: high score = early/mid expansion; low score = contraction.

---

## Verification (2026-05-01)

| Indicator | Engine score | Raw | Band | Matches seeded |
|---|---:|---|---|---|
| ism_pmi | 4 | 54.0 | Healthy Expansion | ✅ |
| lei_yoy | 3 | −1.22% | Stall / Transition | ✅ |
| high_yield_spread | 5 | 277 bps | Very Tight | ✅ |
| small_vs_large | 3 | +0.15% | Balanced | ✅ (was 4 pre-pivot) |
| growth_vs_value | 4 | +3.51% | Growth Leading | ✅ |
| ipo_activity | 3 | $46.2B | Normal | ✅ |

Block average **3.85** → block score **15** → **HEALTHY EXPANSION**. No warnings on any indicator. `npm run check` (tsc) clean.

---

## Open questions / caveats

1. **5.3/5.4 source-of-truth coupling.** The scorers now depend on an upstream pre-computed `ratio_90d_pct`. If the underlying IWM/SPY/SPYG/SPYV price feed changes cadence or methodology, that column must be regenerated upstream — the engine has no fallback recompute. Documented trade-off vs the validated-score divergence.
2. **5.4 known price discontinuities** (Jan/Aug 2025, Mar 2026) — out of scope for this wiring. A dividend-adjusted re-pull of the underlying is a separate data task; the pre-computed column inherits whatever the upstream extract used.
3. **5.4 directional ambiguity** — growth leadership can mean risk-on OR late-cycle flight to quality. Weakest Block-5 indicator (10% weight); flagged as a possible future drop in the spec.
4. **5.6 linear vs U-shaped.** V1 uses linear ascending matching the seeded column. Extreme IPO booms historically mark cycle peaks; a U-shaped rubric penalising froth stays a documented future option. Score 5 carries an `interpretation` cycle-peak caveat in the meantime.
5. **5.5 IORB-style pre-history not relevant.** `BAMLH0A0HYM2` has long FRED history (1996+), so no pre-availability fallback needed (unlike Block 4's IORB).
6. **Manual refresh cadence.** ISM, LEI, IPO refresh monthly; 5.3/5.4 `ratio_90d_pct` refresh whenever the upstream price extract is regenerated. All five appear in `/admin/manual-inputs` via their `source: "manual"` declarations.
