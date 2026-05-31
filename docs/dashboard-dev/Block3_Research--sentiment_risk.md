# Block 3 — Sentiment & Risk

**Block key:** `sentiment_risk` · **Block weight:** 10% · **6 indicators**
**Spec source of truth:** `docs_local/one-drive-macro-screener/scoring-engine/block-3-sentiment-risk.md`
**Weights source:** `docs_local/one-drive-macro-screener/scoring-engine/weights.csv`
**Data status:** `docs_local/one-drive-macro-screener/scoring-engine/indicators-data-status.md`

---

## Design decisions (locked)

1. **Scoring direction — keep as written.** Score 5 = current calm/complacency, Score 1 = panic. Block 3 measures *current mood*, not forward returns. This is a known mixed signal in the total Macro Pulse Score (high Block 3 = complacency = historically precedes corrections). Inversion / U-shape redesign deferred post-V1.
2. **3.2 Put/Call — ship as V1 placeholder.** Manual CSV stores constant `0.85` (Neutral band → score 3). Real CBOE/Tiingo feed pending Tiingo key procurement.
3. **3.3 Fear & Greed — keep at 5%.** Double-counting with VIX (3.1), Put/Call (3.2), and Breadth (3.5) is documented and accepted. The 5% intra-block weight limits the overlap.
4. **VVIX ingestion — one-off CSV seed.** Not on FRED. Bulk-loaded into `indicator_observations` (source = `"CBOE"`) via `lib/scripts/seed-vvix.ts`. Excluded from `SERIES_BY_BLOCK` so the FRED auto-fetcher skips it.
5. **Manual CSV values — store raw numeric.** The seed pipeline stores the raw indicator value (`cnn_index_value`, `spread_4wk_ma × 100`, `pct_above_200dma`, constant `0.85` for P/C). Bands are applied in scorer code, not pre-baked. Keeps thresholds recalibratable without re-ingesting data.

---

## Indicators

| ID | Indicator | Series ID | Type | Indicator weight | Effective weight | Source | Lookback |
|---|---|---|---|---:|---:|---|---|
| 3.1 | VIX | `VIXCLS` | numeric_ascending | 30% | 3.00% | FRED | 14d |
| 3.2 | Put/Call Ratio | `PUT_CALL_RATIO` | numeric_descending | 20% | 2.00% | Manual (placeholder) | 14d |
| 3.5 | Market Breadth | `S5TH_PCT_ABOVE_200DMA` | numeric_ascending | 20% | 2.00% | Manual (Barchart) | 14d |
| 3.4 | AAII Spread | `AAII_SPREAD` | numeric_descending | 15% | 1.50% | Manual (AAII survey) | 14d |
| 3.6 | VVIX | `VVIX` | numeric_ascending | 10% | 1.00% | CBOE CSV seed | 14d |
| 3.3 | Fear & Greed Index | `FEAR_GREED_INDEX` | composite_index | 5% | 0.50% | Manual (CNN JSON) | 14d |

All series are daily frequency. AAII survey is weekly, forward-filled to daily in the manual CSV.

---

## Data sources & ingestion

| Series ID | Table | Ingestion method | CSV path |
|---|---|---|---|
| `VIXCLS` | `indicator_observations` | FRED auto-fetch (`SERIES_BY_BLOCK.sentiment_risk`) | `data/fred/VIXCLS.csv` |
| `VVIX` | `indicator_observations` | One-off seed: `tsx lib/scripts/seed-vvix.ts` | `data/other/vvix_cboe_full_history.csv` |
| `PUT_CALL_RATIO` | `indicator_manual_inputs` | Bulk seed: `tsx lib/scripts/seed-block3-manual.ts` | `data/manual/indicator_3.2_put_call_ratio/daily.csv` |
| `FEAR_GREED_INDEX` | `indicator_manual_inputs` | Bulk seed: `tsx lib/scripts/seed-block3-manual.ts` | `data/manual/indicator_3.3_fear_greed/daily.csv` |
| `AAII_SPREAD` | `indicator_manual_inputs` | Bulk seed: `tsx lib/scripts/seed-block3-manual.ts` | `data/manual/indicator_3.4_aaii_sentiment/daily.csv` |
| `S5TH_PCT_ABOVE_200DMA` | `indicator_manual_inputs` | Bulk seed: `tsx lib/scripts/seed-block3-manual.ts` | `data/manual/indicator_3.5_market_breadth/daily.csv` |

**Seed scripts usage:**
```bash
node --env-file=.env ./node_modules/.bin/tsx lib/scripts/seed-vvix.ts
node --env-file=.env ./node_modules/.bin/tsx lib/scripts/seed-block3-manual.ts
```

Both scripts are idempotent (upsert on unique index). Re-run freely as CSVs refresh.

---

## Scoring matrices (verbatim from spec)

### 3.1 VIX (`VIXCLS`)
| Score | Label | Range | Interpretation |
|---|---|---|---|
| 1 | Panic | > 35 | Crisis-level fear; capitulation territory |
| 2 | Elevated Fear | 25 – 35 | Risk-off positioning dominant |
| 3 | Normal | 18 – 24.9 | Average volatility regime |
| 4 | Calm | 13 – 17.9 | Below-average vol; supportive of risk assets |
| 5 | Complacent | < 13 | Extreme calm; historically precedes vol spikes |

### 3.2 Put/Call Ratio (`PUT_CALL_RATIO`)
| Score | Label | Range | Interpretation |
|---|---|---|---|
| 1 | Heavy Hedging | > 1.2 | Panic put buying; contrarian buy signal |
| 2 | Elevated Fear | 0.95 – 1.2 | Defensive positioning rising |
| 3 | Neutral | 0.70 – 0.94 | Balanced positioning |
| 4 | Bullish Skew | 0.50 – 0.69 | Call buying dominant |
| 5 | Euphoria | < 0.50 | Extreme call buying; contrarian sell warning |

**V1 note:** all placeholder values are `0.85` → score 3 (Neutral). Scorer emits a permanent `warning` field.

### 3.3 Fear & Greed Index (`FEAR_GREED_INDEX`, 0–100)
| Score | Label | Range | Interpretation |
|---|---|---|---|
| 1 | Extreme Fear | 0 – 20 | Capitulation-level fear |
| 2 | Fear | 21 – 40 | Bearish bias dominant |
| 3 | Neutral | 41 – 60 | Balanced mood |
| 4 | Greed | 61 – 80 | Bullish bias dominant |
| 5 | Extreme Greed | 81 – 100 | Euphoric positioning; contrarian sell warning |

### 3.4 AAII Spread (`AAII_SPREAD`, % 4-wk MA)
| Score | Label | Range | Interpretation |
|---|---|---|---|
| 1 | Extreme Bearish | < -30% | Retail capitulation; contrarian buy zone |
| 2 | Bearish | -30% to -10% | Retail leaning negative |
| 3 | Neutral | -10% to +10% | Balanced retail sentiment |
| 4 | Bullish | +10% to +30% | Retail leaning positive |
| 5 | Extreme Bullish | > +30% | Retail euphoria; contrarian sell warning |

Seed pipeline stores `spread_4wk_ma × 100` (fraction → percent conversion on ingest).

### 3.5 Market Breadth (`S5TH_PCT_ABOVE_200DMA`, %)
| Score | Label | Range | Interpretation |
|---|---|---|---|
| 1 | Washout | < 20% | Breadth collapse; oversold territory |
| 2 | Weak | 20% – 40% | Narrow participation |
| 3 | Neutral | 40% – 60% | Mixed participation |
| 4 | Healthy | 60% – 75% | Broad participation |
| 5 | Broad Advance | > 75% | Strong broad-based advance |

**Note:** unlike other Block 3 indicators, breadth is NOT contrarian. High breadth is genuinely bullish.

### 3.6 VVIX (`VVIX`)
| Score | Label | Range | Interpretation |
|---|---|---|---|
| 1 | Panic Vol-of-Vol | > 140 | Extreme stress; regime change likely |
| 2 | Elevated | 110 – 140 | Heightened vol-hedging; VIX spike risk |
| 3 | Normal | 85 – 109 | Average vol-of-vol regime |
| 4 | Calm | 70 – 84 | Subdued vol-of-vol |
| 5 | Complacent | < 70 | Extreme complacency in vol space |

---

## Block aggregation

```
blockAverage = Σ (score_i × weight_i) / Σ weight_i   // weighted mean, 1.0 – 5.0
blockScore   = round(blockAverage × 4)               // 0 – 20
```

Block 3's six indicator weights (30/20/20/15/10/5) sum to 100. Total Macro Pulse Score remains `Σ blockScore` across all registered blocks on the 0–120 scale.

### Block regime map
| blockAverage | Label | Interpretation |
|---|---|---|
| 1.0 – 1.8 | EXTREME STRESS / PANIC | Heavy fear, breadth collapsing — contrarian buy zone historically |
| 1.9 – 2.5 | ELEVATED FEAR | Risk-off dominant; contrarian signals building |
| 2.6 – 3.4 | BALANCED / NEUTRAL | Fundamentals-driven; no extreme readings |
| 3.5 – 4.2 | HEALTHY OPTIMISM | Good breadth, calm vol, sweet spot |
| 4.3 – 5.0 | EXTREME COMPLACENCY / EUPHORIA | Vulnerable to correction; tighten stops |

---

## Implementation notes

- **Scoring direction mixed signal.** Block 3 scores current mood, not forward returns. When Block 3 reads 5 (calm/euphoria), other blocks might read 4+ (healthy fundamentals) but historically such regimes precede corrections. The total Macro Pulse Score reflects this as a known mixed signal; the user must interpret Block 3 contextually.
- **VIX via FRED auto-fetch.** `VIXCLS` is added to `SERIES_BY_BLOCK.sentiment_risk` in `lib/fred/series-catalog.ts`. The existing `/admin/data-fetch` pipeline handles ingestion.
- **VVIX via `indicator_observations`.** Stored with `source = "CBOE"`. The scorer's `SeriesInputSpec` defaults to `source: "fred"` (i.e., omitted), which routes reads through `indicator_observations`. The FRED auto-fetcher only iterates `SERIES_BY_BLOCK` entries, and VVIX is not listed there, so it's never re-fetched — updates require re-running the seed script with a fresh CSV.
- **AAII 4-week MA.** The seed script stores the pre-computed `spread_4wk_ma` column from the CSV (multiplied by 100 for percent). The scorer does not recompute the MA — if the smoothing window needs to change, the CSV pipeline must be rebuilt.
- **Put/Call placeholder.** The scorer permanently emits `warning: "V1 placeholder data — real Tiingo/CBOE Put/Call feed pending."` so the dashboard/admin UI surfaces the limitation.
- **Market Breadth not contrarian.** Documented in the scorer source as a code comment for future inversion decisions.

---

## Open questions (carried from spec)

1. **Inversion / U-shape scoring.** Score 5 = complacency currently aligns with "good current mood" but historically precedes drawdowns. Three options documented in the spec: (a) keep as-is (chosen for V1), (b) invert Block 3 1↔5/2↔4, (c) U-shaped curve where extremes score low. Revisit post-V1 with empirical backtest.
2. **Fear & Greed double-counting.** F&G at 5% weight partially double-counts VIX, P/C, and breadth already in the block. Accepted in V1; may drop in V2 if backtesting shows redundancy.
3. **Put/Call real data.** Tiingo key unlocks CBOE equity P/C ratio (also needed for 5.3 Small/Large Caps and 5.4 Growth/Value). Post-MVP upgrade.
4. **VVIX refresh cadence.** Currently requires manual CSV download from CBOE + re-run of seed script. Could be automated with a scraper or CBOE API if one materializes.
5. **Breadth placeholder rows.** The early part of the breadth CSV (2023-01-01 through ~2023-01-02) has empty `pct_above_200dma` (placeholder score 3). The seed script skips these; the first real observation starts when Barchart data begins.

---

## Files

- `lib/scoring/blocks/sentiment-risk/index.ts` — block definition + regime map
- `lib/scoring/blocks/sentiment-risk/vix.ts` — 3.1 VIX scorer
- `lib/scoring/blocks/sentiment-risk/put-call-ratio.ts` — 3.2 Put/Call Ratio scorer
- `lib/scoring/blocks/sentiment-risk/fear-greed-index.ts` — 3.3 Fear & Greed Index scorer
- `lib/scoring/blocks/sentiment-risk/aaii-spread.ts` — 3.4 AAII Spread scorer
- `lib/scoring/blocks/sentiment-risk/market-breadth.ts` — 3.5 Market Breadth scorer
- `lib/scoring/blocks/sentiment-risk/vvix.ts` — 3.6 VVIX scorer
- `lib/scripts/seed-vvix.ts` — VVIX CSV → `indicator_observations` seed
- `lib/scripts/seed-block3-manual.ts` — 4 manual CSVs → `indicator_manual_inputs` seed
- `lib/fred/series-catalog.ts` — `sentiment_risk` block series (`VIXCLS`)
- `lib/scoring/registry.ts` — `sentimentRiskBlock` registration
- `lib/scoring/dashboard-adapter.ts` — removed "Sentiment & Volatility" from `PLANNED_BLOCK_NAMES`
