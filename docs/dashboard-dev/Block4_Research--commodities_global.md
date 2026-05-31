# Block 4 — Commodities & Global Flow

**Block key:** `commodities_global` · **Block weight:** 15% · **6 indicators**
**Spec source of truth:** `docs_local/one-drive-macro-screener/scoring-engine/block-4-commodities-global.md`
**Weights source:** `docs_local/one-drive-macro-screener/scoring-engine/weights.csv`
**Data status:** `docs_local/one-drive-macro-screener/scoring-engine/indicators-data-status.md`

---

## Design decisions (proposed for V1)

1. **DTWEXBGS over ICE DXY (locked 2026-05-29 in spec).** Use FRED `DTWEXBGS` (Nominal Broad USD Index). It is free, covers ~26 currencies (incl. CNY), and is calibrated post-2010 — thresholds in §4.3 already reflect this scale. ICE DXY (6 currencies, 1973 weights, no CNY) is not used.
2. **Gold scored as 12M YoY %, not absolute level.** Gold's absolute price drifts with long-run inflation ($1,500 was a high in 2015, a low in 2024). The 12M rate-of-change is regime-stable across decades. All other Block 4 indicators score from absolute level — gold is the deliberate exception and is documented as such.
3. **Copper scored in USD/lb (COMEX scale) per spec rubric.** FRED `PCOPPUSDM` publishes monthly LME averages in USD/MT. Scorer converts MT → lb (`÷ 2204.6228`) so the thresholds in §4.4 (3.00, 3.60, 4.20, 4.80) apply unchanged. Yahoo `HG=F` daily is a secondary source but not required for V1.
4. **Treasury Liquidity = SOFR − IORB spread (V1 MVP).** Single proxy; catches funding stress (2019 repo, 2020 dash-for-cash style). Composite with MOVE Index + on/off-the-run premium deferred. Documented limitation: this is a *funding* signal, not full *market* liquidity.
5. **Global PMIs — manual monthly entry.** S&P Global gates historical series behind subscription. Free monthly press release provides the headline number; analyst enters it via `/admin/manual-inputs` on release day. Same pattern as 2.4 NFP Consensus, 4.5 Global PMIs entry, etc.
6. **Score-5 ambiguity at extremes (Oil <$55, Copper >$4.80) — documented, no override.** Spec calls for cross-checking with neighbouring indicators (oil vs copper vs PMI to disambiguate demand destruction vs tailwind). V1 ships the verbatim score and surfaces the disambiguation in `interpretation`/`warning` text. Auto-override engine deferred (mentor guidance: no override engines in V1, mirrors Block 2 Sahm-rule deferral).
7. **Mixed cadence handled by last-value-carry-forward** per `FR-DI-04`. 4.1 mixed (monthly pre-2025 / daily 2025+), 4.4 monthly, 4.5 monthly; 4.2, 4.3, 4.6 daily. The existing `observationAtOrBefore` helper handles this.

---

## Indicators

| ID | Indicator | Series ID | Type | Indicator weight | Effective weight | Source | Lookback |
|---|---|---|---|---:|---:|---|---|
| 4.3 | DTWEXBGS (Nominal Broad USD) | `DTWEXBGS` | numeric_descending | 30% | 4.50% | FRED | 14d |
| 4.2 | Oil (WTI) | `DCOILWTICO` | numeric_descending | 20% | 3.00% | FRED | 14d |
| 4.5 | Global PMIs | `GLOBAL_MFG_PMI` | numeric_ascending | 15% | 2.25% | Manual (S&P press release) | 60d |
| 4.6 | Treasury Liquidity | `SOFR` + `IORB` | numeric_ascending* | 15% | 2.25% | FRED | 14d |
| 4.1 | Gold YoY | `GOLD_SPOT` | numeric_descending (on 12M %) | 10% | 1.50% | FreeGoldAPI seed | 420d |
| 4.4 | Copper | `PCOPPUSDM` | numeric_ascending | 10% | 1.50% | FRED | 60d |

\* Treasury Liquidity rubric is *ascending* on the SOFR−IORB spread when read in the "deeper liquidity = higher score" direction: more negative spread → higher score, large positive spread → score 1. Implemented as a custom band test on the computed spread, not on either series alone.

Sums: indicator weights = 100% within Block 4; Block 4 = 15% of total score → effective weights as shown.

---

## Scoring matrices (verbatim from spec)

### 4.1 Gold YoY (`GOLD_SPOT` → 12M %)
| Score | Label | Range | Interpretation |
|---|---|---|---|
| 1 | Very Bearish | > +30% YoY | Sharp rally; stress, dedollarization, or inflation fear; risk-off |
| 2 | Bearish | +15% to +30% YoY | Significant safe-haven demand; real rates falling |
| 3 | Neutral | −5% to +15% YoY | Normal flows |
| 4 | Bullish | −15% to −5% YoY | Gold weakness; real rates rising or risk appetite returning |
| 5 | Very Bullish | < −15% YoY | Major gold drawdown; max risk-on |

### 4.2 Oil WTI (`DCOILWTICO`, USD/bbl)
| Score | Label | Range | Interpretation |
|---|---|---|---|
| 1 | Very Bearish | > $110 | Energy shock; inflation accelerant + growth tax |
| 2 | Bearish | $90 – $110 | Elevated; pressures inflation and consumer |
| 3 | Neutral | $70 – $89 | Balanced — supports producers without crippling consumers |
| 4 | Bullish | $55 – $69 | Consumer tailwind; disinflation support |
| 5 | Very Bullish | < $55 | Major disinflation boost — verify against copper/PMI for demand-destruction risk |

### 4.3 DTWEXBGS (`DTWEXBGS`, index)
| Score | Label | Range | Interpretation |
|---|---|---|---|
| 1 | Very Bearish | > 128 | Crisis-level USD strength; severe EM stress |
| 2 | Bearish | 122 – 128 | Strong USD; global tightening |
| 3 | Neutral | 115 – 121 | Mid-cycle; post-2015 equilibrium |
| 4 | Bullish | 108 – 114 | Weak USD; EM and commodity tailwind |
| 5 | Very Bullish | < 108 | Very weak USD; maximum global liquidity |

### 4.4 Copper (`PCOPPUSDM`, USD/lb after MT→lb conversion)
| Score | Label | Range | Interpretation |
|---|---|---|---|
| 1 | Very Bearish | < $3.00 | Industrial demand collapse; recession signal |
| 2 | Bearish | $3.00 – 3.60 | Soft global growth |
| 3 | Neutral | $3.60 – 4.20 | Normal industrial demand |
| 4 | Bullish | $4.20 – 4.80 | Strong global growth; expansion confirmed |
| 5 | Very Bullish | > $4.80 | Boom OR supply shock — verify against PMI |

### 4.5 Global PMIs (`GLOBAL_MFG_PMI`, index)
| Score | Label | Range | Interpretation |
|---|---|---|---|
| 1 | Very Bearish | < 45 | Deep global contraction; recession-level |
| 2 | Bearish | 45 – 48.9 | Manufacturing recession |
| 3 | Neutral | 49 – 51 | Stall speed |
| 4 | Bullish | 51.1 – 54 | Modest expansion |
| 5 | Very Bullish | > 54 | Strong expansion / cyclical boom |

### 4.6 Treasury Liquidity (SOFR − IORB spread, bps)
| Score | Label | Range | Interpretation |
|---|---|---|---|
| 1 | Very Bearish | > +20 bps | Major funding stress; systemic risk; 2019-repo-style |
| 2 | Bearish | +5 to +20 bps | Elevated funding pressure |
| 3 | Neutral | −5 to +5 bps | Normal — SOFR near IORB |
| 4 | Bullish | −5 to −15 bps | Abundant reserves; healthy plumbing |
| 5 | Very Bullish | < −15 bps | Excess liquidity |

Spread computed as `(SOFR − IORB) × 100` to convert decimal-percentage difference into bps (both series are published in % terms on FRED).

---

## Data sources & ingestion

| Series ID | Table | Ingestion method | Source path |
|---|---|---|---|
| `DCOILWTICO` | `indicator_observations` | FRED auto-fetch (`SERIES_BY_BLOCK.commodities_global`) | `data/fred/DCOILWTICO.csv` |
| `DTWEXBGS` | `indicator_observations` | FRED auto-fetch | `data/fred/DTWEXBGS.csv` |
| `PCOPPUSDM` | `indicator_observations` | FRED auto-fetch | `data/fred/PCOPPUSDM.csv` |
| `SOFR` | `indicator_observations` | FRED auto-fetch | `data/fred/SOFR.csv` |
| `IORB` | `indicator_observations` | FRED auto-fetch | `data/fred/IORB.csv` |
| `GOLD_SPOT` | `indicator_observations` | One-off seed: `tsx lib/scripts/seed-gold.ts` | `data/extracted/gold_freegoldapi.csv` |
| `GLOBAL_MFG_PMI` | `indicator_manual_inputs` | Manual entry via `/admin/manual-inputs` | n/a |

**Seed scripts usage:**
```bash
node --env-file=.env ./node_modules/.bin/tsx lib/scripts/seed-gold.ts
```

Gold seed is idempotent on `(series_id, observation_date)`. Re-runnable as the FreeGoldAPI extract refreshes.

**FRED catalog change:** add to `lib/fred/series-catalog.ts`:
```ts
commodities_global: [
  "DCOILWTICO",
  "DTWEXBGS",
  "PCOPPUSDM",
  "SOFR",
  "IORB",
],
```
And extend `BlockKey` union with `"commodities_global"`.

`GOLD_SPOT` is excluded from `SERIES_BY_BLOCK` (CSV-seeded, mirrors VVIX pattern). `GLOBAL_MFG_PMI` is excluded (manual input, mirrors NFP_CONSENSUS pattern).

---

## Implementation plan

### Files to add

```
lib/scoring/blocks/commodities-global/
  index.ts                    — commoditiesGlobalBlock definition + REGIME_MAP
  dtwexbgs.ts                 — 4.3 scorer (heaviest, do first)
  oil-wti.ts                  — 4.2 scorer
  global-pmi.ts               — 4.5 scorer (manual input)
  treasury-liquidity.ts       — 4.6 scorer (composite SOFR−IORB)
  gold-yoy.ts                 — 4.1 scorer (uses yoyPctFromIndex)
  copper.ts                   — 4.4 scorer (with MT→lb conversion)

lib/scripts/
  seed-gold.ts                — extracted/gold_freegoldapi.csv → indicator_observations
```

### Files to modify

| File | Change |
|---|---|
| `lib/scoring/registry.ts` | Import `commoditiesGlobalBlock`; append to `BLOCKS` array |
| `lib/fred/series-catalog.ts` | Add `commodities_global` to `BlockKey` union; add `SERIES_BY_BLOCK.commodities_global` entry (5 FRED series) |
| `lib/scoring/dashboard-adapter.ts` | Remove `"Commodities & Global Flow"` from `PLANNED_BLOCK_NAMES` |

### Scorer specifics

**4.3 DTWEXBGS (template — simplest, daily level lookup).**
- `inputs: [{ seriesId: "DTWEXBGS", lookbackDays: 14, required: true }]`
- `compute()`: `this.latest(input, "DTWEXBGS")` → `band(value)` → `ScoringResult`. Mirror `vix.ts` shape exactly.

**4.2 Oil WTI.** Same pattern as 4.3 with `DCOILWTICO`.

**4.4 Copper.** Same pattern as 4.3 with `PCOPPUSDM`, but apply `usdPerLb = usdPerMT / 2204.6228` before banding. Document the conversion in `formulaTrace`.

**4.1 Gold YoY.**
- `inputs: [{ seriesId: "GOLD_SPOT", lookbackDays: 420, required: true }]`
- `compute()`: use existing `yoyPctFromIndex(series, asOfDate)` helper (already proven in Block 2 CPI scorers). Returns `{ latest, prior, yoyPct }` or null.
- Mixed cadence (monthly pre-2025 / daily 2025+) is handled by `observationAtOrBefore`; no scorer-level change needed.
- Warning emitted if FreeGoldAPI extract is older than the asOfDate by more than 90 days (data staleness flag).

**4.6 Treasury Liquidity (only true composite).**
- `inputs: [{ seriesId: "SOFR", lookbackDays: 14, required: true }, { seriesId: "IORB", lookbackDays: 14, required: true }]`
- `compute()`: get latest SOFR and IORB observations, compute `spreadBps = (sofr − iorb) × 100`, band on spreadBps.
- `formulaTrace`: `"SOFR (date) − IORB (date) = (sofr_pct − iorb_pct)% × 100 = spreadBps bps → band"`.
- The IORB series has a short history (introduced July 2021) — for asOfDates before that, scorer should return a `warning` and fall back to score 3.

**4.5 Global PMIs (manual).**
- `inputs: [{ seriesId: "GLOBAL_MFG_PMI", lookbackDays: 60, required: true, source: "manual" }]`
- `compute()`: `this.latest(input, "GLOBAL_MFG_PMI")` → `band(value)`.
- Declaring `source: "manual"` automatically registers the series in `manual-inputs-catalog.ts` → surfaces in `/admin/manual-inputs` UI.
- Lookback 60d because the series is monthly and we want a comfortable buffer for release-day latency.

### Block index (`commodities-global/index.ts`)

Skeleton (modelled on `sentiment-risk/index.ts`):

```ts
export const commoditiesGlobalBlock: BlockDefinition = {
  key: "commodities_global",
  name: "Commodities & Global Flow",
  sortOrder: 3,         // after rates=0, inflation_labor=1, sentiment_risk=2
  weight: 15,
  scorers: [
    new DtwexbgsScorer(),         // 30%
    new OilWtiScorer(),           // 20%
    new GlobalPmiScorer(),        // 15%
    new TreasuryLiquidityScorer(),// 15%
    new GoldYoyScorer(),          // 10%
    new CopperScorer(),           // 10%
  ],
  regimeMap: REGIME_MAP,
  regimeFor,
};
```

### Regime map (from spec §Aggregate Block Scoring)

| blockAverage | Label | Interpretation |
|---|---|---|
| 1.0 – 1.8 | GLOBAL STRESS | Strong dollar, oil shock, collapsing copper/PMIs, funding stress |
| 1.9 – 2.5 | GLOBAL HEADWINDS | Dollar firm, energy elevated, manufacturing slowing — EM struggles |
| 2.6 – 3.4 | MIXED GLOBAL SIGNALS | Cross-currents; no dominant theme — bottoms-up stockpicking |
| 3.5 – 4.2 | GLOBAL EXPANSION | Weak-to-moderate USD, contained commodities, expansion PMIs |
| 4.3 – 5.0 | GLOBAL BOOM | Maximum global liquidity, broad expansion, risk-on across geographies |

---

## Step-by-step execution order

1. **Seed gold data.** Write `lib/scripts/seed-gold.ts` (mirror `seed-vvix.ts`). Parse `data/extracted/gold_freegoldapi.csv` → upsert into `indicator_observations` with `source = "FreeGoldAPI"`. Verify row count, latest date, sanity-check 2025+ values.
2. **Scaffold scorer files.** Create `commodities-global/` directory with the six `.ts` files. Start with `dtwexbgs.ts` (simplest, also heaviest-weight). Use `vix.ts` as the literal template.
3. **Write `commodities-global/index.ts`.** Wire up the six scorers, REGIME_MAP, regimeFor.
4. **Wire into registry.** Add to `BLOCKS` in `lib/scoring/registry.ts`.
5. **Update FRED catalog.** Extend `BlockKey` union; add `SERIES_BY_BLOCK.commodities_global` with the five FRED series. Re-run `/admin/data-fetch` to populate observations.
6. **Remove placeholder.** Delete `"Commodities & Global Flow"` from `PLANNED_BLOCK_NAMES` in `dashboard-adapter.ts`.
7. **Manual-input verification.** Confirm `GLOBAL_MFG_PMI` appears in `/admin/manual-inputs`. Enter a recent PMI value (latest available press release). Verify scorer returns expected score.
8. **End-to-end check.** Hit the dashboard with `asOfDate=today`. Block 4 should render with 6 indicators, a block average, a block score (0–20), and the regime label. Compare individual scores against hand-computed values from spec.
9. **Backfill staleness flags.** If gold extract is >90 days stale, the scorer should emit a warning. Verify warning surfaces in the dashboard/admin UI.

---

## Open questions (carried from spec + new for V1)

1. **Gold YoY vs absolute level.** Spec uses YoY; other blocks use absolute level. Spec rationale (gold's nominal level drifts with long-run inflation) is sound, but it does break the cross-block consistency rule. Keep for V1; revisit if backtest shows non-monotonic anomalies.
2. **Copper score-5 ambiguity.** >$4.80 can mean demand boom (bullish) OR supply shock (bearish-for-inflation). Spec calls for cross-check against Global PMI. V1 ships the verbatim score; cross-check is documented in `interpretation` text. Auto-override deferred.
3. **Oil score-5 ambiguity.** <$55 can mean tailwind OR demand destruction. Same disambiguation pattern as copper. Same V1 treatment.
4. **Treasury Liquidity proxy completeness.** SOFR−IORB catches funding stress only. Full liquidity composite (+ MOVE Index + on/off-the-run premium + dealer positions) deferred. Acceptable for V1 because the proxy captures the canonical stress events (2019, 2020, 2022, 2023).
5. **Global PMI data source — paid alternative?** Manual entry is acceptable for V1. If S&P Global API becomes free/affordable, swap with no scoring change (same `GLOBAL_MFG_PMI` key).
6. **IORB pre-2021.** For asOfDates before July 2021, IORB doesn't exist (IOER was the predecessor with different mechanics). V1 returns score 3 + warning. Backfill with IOER + a small offset is deferred to V2.
7. **Stress-regime auto-flag** (future enhancement, spec §Implementation Notes). When 4.6 scores 1 (SOFR−IORB >+20bps), the screener could auto-flag "stress regime" overriding total score. Not in V1.
8. **Gold data freshness.** FreeGoldAPI auto-refresh has historically stalled (per spec, was 3mo stale on 2026-05-29). Watch the staleness warning; consider a fallback to Yahoo `GC=F` daily extract if FreeGoldAPI continues to lag.

---

## Files (to be created / modified)

**New:**
- `lib/scoring/blocks/commodities-global/index.ts`
- `lib/scoring/blocks/commodities-global/dtwexbgs.ts`
- `lib/scoring/blocks/commodities-global/oil-wti.ts`
- `lib/scoring/blocks/commodities-global/copper.ts`
- `lib/scoring/blocks/commodities-global/gold-yoy.ts`
- `lib/scoring/blocks/commodities-global/treasury-liquidity.ts`
- `lib/scoring/blocks/commodities-global/global-pmi.ts`
- `lib/scripts/seed-gold.ts`

**Modified:**
- `lib/scoring/registry.ts` — register `commoditiesGlobalBlock`
- `lib/fred/series-catalog.ts` — `BlockKey` + `SERIES_BY_BLOCK.commodities_global`
- `lib/scoring/dashboard-adapter.ts` — drop placeholder name

**No schema changes required.** Existing `indicator_observations` + `indicator_manual_inputs` tables suffice. Manual inputs catalog auto-populates from scorer `source: "manual"` declarations.
