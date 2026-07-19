# Block 1 — Rates & Central Bank Policy

**Block key:** `rates` · **Block weight:** 25% · **6 indicators** · **`sortOrder: 0`**
**Spec source of truth:** `docs_local/one-drive-macro-screener/scoring-engine/block-1-rates-cb-policy.md`
**Weights source:** `docs_local/one-drive-macro-screener/scoring-engine/weights.csv`
**Data status:** `docs_local/one-drive-macro-screener/scoring-engine/indicators-data-status.md`

**Status: SHIPPED (5 of 6 indicators).** Block 1 is the foundational block — the scoring engine, FRED bulk fetcher, and `indicator_observations` schema were all built here first. Five scorers are wired into the engine and compute a live block score; **1.3 Forward Guidance Tone is not yet implemented** (manual/NLP input deferred). It is no longer in `PLANNED_BLOCK_NAMES`.

Current Fed Funds Rate (as of May 2026): **3.50–3.75%** (held steady since Sep 2025 cuts).

---

## Design decisions (V1, as built)

1. **On-demand computation (no persisted scores).** The engine reads `indicator_observations` and computes scores at request time. Nothing scoring-related is written back to the DB. Formula edits take effect instantly and retroactively; the scorer class IS the score (no drift, no recompute jobs). Trade-off: per-request compute cost (small at this dataset size) and no frozen historical record until `scoring_formulas` versioning is added later.
2. **Class-based, declarative scorers.** Each indicator is a class extending `IndicatorScorer`, carrying `compute()`, `bands[]`, `formula` text, and `examples[]` in lockstep. The admin engine page reads this metadata directly — no per-indicator UI code.
3. **Forward Guidance Tone (1.3) deferred.** No FRED series exists; it needs manual admin entry after each FOMC meeting (~8x/year) or future NLP on FOMC statements. The remaining 5 scorers (raw spec weights 25/20/15/15/5 → 80 total) are **renormalized to sum to 100** in `rates/index.ts`. When Forward Guidance ships, the per-scorer weights revert to the raw spec values.
4. **Last Rate Change Direction (1.2) derived from `DFEDTARU`.** Compare consecutive Fed target-rate upper-bound values around FOMC dates; carry the last score forward between meetings. Preferred over `DFF` for detecting exact rate decisions.
5. **Real Interest Rate (1.6) computed in-code** as `DGS10 − T10YIE` for the same date — the only true composite in the block.
6. **QE/QT (1.5) scored on 4-week balance-sheet delta.** Fetch recent `WALCL` observations, compute the 4-week change, classify the monthly pace.
7. **Score scale mapping** (backwards-compatible with the existing UI): per-indicator score `1–5`; block score `avg × 4` → `0–20`; total score `Σ block scores` → `0–120`.

---

## Indicators

| ID | Indicator | Series ID | Type | Indicator weight | Effective weight | Source | Auto? |
|---|---|---|---|---:|---:|---|---|
| 1.6 | Real Interest Rate | `DGS10` − `T10YIE` | numeric_descending (composite) | 25% | 6.25% | FRED | Yes (calculated) |
| 1.3 | Forward Guidance Tone | — (qualitative) | manual 1–5 | 20% | 5.00% | Manual (~8x/yr) | **No — not yet built** |
| 1.4 | Yield Curve (2Y–10Y) | `T10Y2Y` | numeric_ascending (bps) | 20% | 5.00% | FRED | Yes |
| 1.1 | Fed Funds Rate Level | `DFF` | numeric_descending | 15% | 3.75% | FRED | Yes |
| 1.5 | QE / QT Policy | `WALCL` | numeric_ascending (4-wk Δ) | 15% | 3.75% | FRED | Yes |
| 1.2 | Last Rate Change Direction | `DFEDTARU` | derived event 1–5 | 5% | 1.25% | FRED | Semi (derived) |

Indicator weights sum to 100% within Block 1; Block 1 = 25% of total → effective weights as shown. **As built, only the 5 non-Forward-Guidance scorers are active and renormalized to 100.**

---

## Scoring matrices (verbatim from spec)

### 1.1 Fed Funds Rate Level (`DFF`)
| Score | Range | Interpretation |
|---|---|---|
| 1 (Very Bearish) | > 5.25% | Aggressive tightening; cost of capital very high |
| 2 (Bearish) | 4.00 – 5.25% | Restrictive territory; credit tightening underway |
| 3 (Neutral) | 2.50 – 3.99% | Near estimated neutral rate (~2.5–3%) |
| 4 (Bullish) | 1.00 – 2.49% | Accommodative; supportive for borrowing and risk assets |
| 5 (Very Bullish) | < 1.00% | Emergency/near-zero; maximum monetary accommodation |

### 1.2 Last Rate Change Direction (derived from `DFEDTARU`)
| Score | Event | Interpretation |
|---|---|---|
| 1 | Hike ≥ 50bps | Aggressive tightening; inflation emergency |
| 2 | Hike 25bps | Standard tightening; hawkish trajectory |
| 3 | Hold / No Change | Pause; could pivot either way |
| 4 | Cut 25bps | Easing cycle begins; bullish pivot signal |
| 5 | Cut ≥ 50bps | Emergency/aggressive easing; very bullish |

Compare consecutive `DFEDTARU` values; between FOMC meetings carry the last score forward.

### 1.3 Forward Guidance Tone (manual, not yet built)
| Score | Tone | Interpretation |
|---|---|---|
| 1 | Very Hawkish | Explicit language about more hikes needed |
| 2 | Hawkish | Bias toward tightening; inflation emphasis |
| 3 | Balanced / Neutral | Acknowledges both inflation and growth risks |
| 4 | Dovish | Emphasis on growth risks; hints at easing |
| 5 | Very Dovish | Explicit easing bias; mentions rate cuts |

Implementation: manual admin entry after each FOMC meeting (~8x/year). Future: NLP on FOMC minutes/press conference text.

### 1.4 Yield Curve 2Y–10Y (`T10Y2Y`)
| Score | Range (bps) | Interpretation |
|---|---|---|
| 1 | < −50 | Deep inversion; strong recession signal |
| 2 | −50 to −1 | Inverted; recession probability elevated |
| 3 | 0 to +50 | Flat to mildly positive; transition zone |
| 4 | +51 to +150 | Normal positive slope; healthy term premium |
| 5 | > +150 | Steep curve; strong growth expectations |

`T10Y2Y` is published in percentage points; multiply by 100 for bps. Inversion has preceded every US recession since 1970.

### 1.5 QE / QT Policy (`WALCL`, 4-week balance-sheet change)
| Score | Monthly Balance Sheet Change | Interpretation |
|---|---|---|
| 1 | QT > $60B/month | Aggressive balance sheet reduction |
| 2 | QT $30–60B/month | Moderate runoff; gradual liquidity withdrawal |
| 3 | No change / Taper pause | Balance sheet stable; neutral |
| 4 | Slowing QT / Taper talk | Liquidity drain easing; bullish shift |
| 5 | Active QE (expanding) | Maximum liquidity support |

### 1.6 Real Interest Rate (`DGS10` − `T10YIE`)
| Score | Range (%) | Interpretation |
|---|---|---|
| 1 | > 2.5% | Very restrictive; strong headwind for equities |
| 2 | 1.5 – 2.5% | Restrictive; real cost of capital elevated |
| 3 | 0.5 – 1.49% | Moderately positive; near neutral |
| 4 | −0.5% to 0.49% | Low/slightly negative; supportive for risk assets |
| 5 | < −0.5% | Deeply negative; very bullish for equities |

`real_rate = DGS10_value − T10YIE_value` for the same date.

---

## Block aggregation

```
blockAverage = Σ (score_i × weight_i) / Σ weight_i   // weighted mean, 1.0 – 5.0
blockScore   = round(blockAverage × 4)               // 0 – 20
```

Total Macro Pulse Score remains `Σ blockScore` across all registered blocks on the 0–120 scale.

### Block regime map
| blockAverage | Label | Interpretation |
|---|---|---|
| 1.0 – 1.8 | VERY RESTRICTIVE | Aggressive tightening, deep inversion, hawkish guidance, active QT, high real rates. Maximum headwind. |
| 1.9 – 2.5 | RESTRICTIVE | Policy tight but not extreme. Rates elevated, curve flat/inverted. |
| 2.6 – 3.4 | NEUTRAL / TRANSITIONAL | Policy at crossroads. Rates near neutral, guidance balanced. |
| 3.5 – 4.2 | ACCOMMODATIVE | Easing cycle underway or imminent. Supportive for risk assets. |
| 4.3 – 5.0 | VERY ACCOMMODATIVE | Emergency easing, near-zero rates, active QE. Maximum tailwind. |

---

## Data sources & ingestion

| Series ID | Description | Native Freq | Table | Ingestion method |
|---|---|---|---|---|
| `DFF` | Fed Funds Effective Rate | Daily | `indicator_observations` | FRED auto-fetch (`SERIES_BY_BLOCK.rates`) |
| `T10Y2Y` | Yield curve 2Y–10Y | Daily | `indicator_observations` | FRED auto-fetch |
| `WALCL` | Fed balance sheet | Weekly (Wed) | `indicator_observations` | FRED auto-fetch |
| `DGS10` | 10Y Treasury yield | Daily | `indicator_observations` | FRED auto-fetch |
| `T10YIE` | 10Y breakeven inflation | Daily | `indicator_observations` | FRED auto-fetch |
| `DFEDTARU` | Fed target rate upper bound | Event (~8x/yr) | `indicator_observations` | FRED auto-fetch |

`SERIES_BY_BLOCK.rates = ["DFF", "T10Y2Y", "WALCL", "DGS10", "T10YIE", "DFEDTARU"]` in `lib/fred/series-catalog.ts`. All 6 are FRED auto-fetched (no manual/CSV series in this block).

**Bulk fetch usage** (fetcher mechanics in `Engine_architecture.md` §4):
```bash
# Defaults (last 90 days)
curl -X POST 'http://localhost:3000/api/admin/fetch-indicators?block=rates'
# Explicit range
curl -X POST 'http://localhost:3000/api/admin/fetch-indicators?block=rates&start=2026-01-01&end=2026-05-01'
```

**Non-FRED sources considered (not used in V1)**
- **CME FedWatch API** ($25/mo) — futures-implied rate probabilities; forward-looking sentiment, deferred.
- **FOMC statements** (https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm) — future NLP source for Forward Guidance Tone automation.

---

## Files added / modified

**New — scorers:**
- `lib/scoring/blocks/rates/index.ts` — `ratesBlock` + REGIME_MAP + regimeFor
- `lib/scoring/blocks/rates/fed-funds-rate.ts` — 1.1
- `lib/scoring/blocks/rates/last-rate-change.ts` — 1.2 (DFEDTARU diff)
- `lib/scoring/blocks/rates/yield-curve.ts` — 1.4
- `lib/scoring/blocks/rates/qe-qt-policy.ts` — 1.5 (4-week WALCL delta)
- `lib/scoring/blocks/rates/real-interest-rate.ts` — 1.6 (DGS10 − T10YIE)
- *(1.3 Forward Guidance Tone scorer — not yet created)*

**Engine core** (types, base class, engines, repos, registry, FRED fetcher, admin engine page) was built with Block 1 and is shared by all blocks — see **`Engine_architecture.md`**. Block-1-specific wiring into that infrastructure:
- `lib/scoring/registry.ts` — `ratesBlock` is the first entry in `BLOCKS[]`
- `lib/fred/series-catalog.ts` — `rates` `BlockKey` + `SERIES_BY_BLOCK.rates` (6 series)
- `lib/scoring/dashboard-adapter.ts` — `rates` removed from `PLANNED_BLOCK_NAMES`

**No schema changes** beyond the `indicator_observations` table added in Task 1.

---

## Open questions / caveats

1. **Forward Guidance Tone (1.3) not shipped.** Weights renormalized across the other 5 scorers meanwhile; per-scorer weights revert to raw spec (25/20/20/15/15/5) once it lands. Manual admin entry is the V1 path; NLP on FOMC text is a future option.
2. **`scoring_formulas` versioning deferred** — only needed when the admin formula editor is built. Until then there is no frozen record of "what was shown on day X under formula Y".
3. **`scoring_cache` deferred** — revisit only if `/api/dashboard` exceeds ~200ms (trend lines require N-date computation via `Promise.all`).
4. **Real Rate uses nominal 10Y breakeven** (`DGS10 − T10YIE`), not TIPS-derived real yield (`DFII10`). Documented simplification; both track closely.
5. **QE/QT 4-week window** is a coarse proxy for balance-sheet stance; sensitive to weekly `WALCL` reporting noise. Acceptable for V1.
