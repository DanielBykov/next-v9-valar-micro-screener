# Block 2 — Inflation & Labor Market

**Block key:** `inflation_labor` · **Block weight:** 20% · **6 indicators**
**Spec source of truth:** `docs_local/one-drive-macro-screener/scoring-engine/block-2-inflation-labor.md`
**Weights source:** `docs_local/one-drive-macro-screener/scoring-engine/weights.csv`

---

## Indicators

| ID | Indicator | FRED Series | Type | Indicator weight | Effective weight | Source |
|---|---|---|---|---:|---:|---|
| 2.2 | Core CPI YoY | `CPILFESL` | numeric_descending | 30% | 6.00% | FRED |
| 2.3 | Unemployment Rate | `UNRATE` | numeric_ascending (non-monotonic) | 20% | 4.00% | FRED |
| 2.1 | CPI Headline YoY | `CPIAUCSL` | numeric_descending | 15% | 3.00% | FRED |
| 2.5 | Wage Growth YoY | `CES0500000003` (AHE) | numeric_descending | 15% | 3.00% | FRED |
| 2.4 | NFP Surprise | `PAYEMS` + `NFP_CONSENSUS` | numeric_ascending | 10% | 2.00% | FRED + manual |
| 2.6 | Participation Rate | `CIVPART` | numeric_ascending | 10% | 2.00% | FRED |

All series are released monthly. CPI/Core CPI mid-month; the rest first Friday alongside the BLS Employment Situation report.

---

## Scoring matrices (verbatim from spec)

### Core CPI YoY (`CPILFESL` → YoY %)
| Score | Range |
|---|---|
| 1 | > 5.5% |
| 2 | 4.0 – 5.5% |
| 3 | 2.5 – 3.9% |
| 4 | 1.5 – 2.4% |
| 5 | < 1.5% |

### Unemployment Rate (`UNRATE`, non-monotonic)
| Score | Range |
|---|---|
| 1 | > 7.0% |
| 2 | 5.5 – 7.0% |
| 3 | 4.0 – 5.4% |
| 4 | 3.5 – 3.9% |
| 5 | < 3.5% |

Note: scoring is non-monotonic — < 3.5% scores 5 (full employment) but overheating risk is real; see open question below.

### CPI Headline YoY (`CPIAUCSL` → YoY %)
| Score | Range |
|---|---|
| 1 | > 6.0% |
| 2 | 4.0 – 6.0% |
| 3 | 2.5 – 3.9% |
| 4 | 1.5 – 2.4% |
| 5 | < 1.5% |

### Wage Growth YoY (`CES0500000003` AHE → YoY %)
| Score | Range |
|---|---|
| 1 | > 6.0% |
| 2 | 5.0 – 6.0% |
| 3 | 3.5 – 4.9% |
| 4 | 2.5 – 3.4% |
| 5 | < 2.5% |

### NFP Surprise (k jobs)
`surprise = (PAYEMS_latest − PAYEMS_prior_month) − NFP_CONSENSUS_latest`

| Score | Range |
|---|---|
| 1 | < −150k |
| 2 | −150 to −50k |
| 3 | −50 to +50k |
| 4 | +50 to +150k |
| 5 | > +150k |

### Participation Rate (`CIVPART`)
| Score | Range |
|---|---|
| 1 | < 61.5% |
| 2 | 61.5 – 62.0% |
| 3 | 62.0 – 62.7% |
| 4 | 62.8 – 63.2% |
| 5 | > 63.2% |

---

## Block aggregation

```
blockAverage = Σ (score_i × weight_i) / Σ weight_i   // weighted mean, 1.0 – 5.0
blockScore   = round(blockAverage × 4)               // 0 – 20
```

Block 2's six indicator weights (30/20/15/15/10/10) sum to 100, so the weighted mean is well-defined. Total Macro Pulse Score remains `Σ blockScore` across all registered blocks on the 0–120 scale.

### Block regime map
| blockAverage | Label |
|---|---|
| 1.0 – 1.8 | STAGFLATION RISK |
| 1.9 – 2.5 | OVERHEATING / WEAKENING |
| 2.6 – 3.4 | MIXED SIGNALS |
| 3.5 – 4.2 | GOLDILOCKS EMERGING |
| 4.3 – 5.0 | PERFECT MACRO |

---

## Implementation notes

- **YoY % from monthly index level** — CPI, Core CPI, and Wage Growth use FRED index series. The `yoyPctFromIndex` helper in `lib/scoring/helpers.ts` picks the latest observation ≤ asOfDate and the closest observation around 365 days prior, then returns `(latest / prior − 1) × 100`. Lookback specs are 420 days to cover publication lag.
- **NFP Surprise** — `PAYEMS` is published in thousands of jobs, so `PAYEMS_latest − PAYEMS_prior_month` is already in 'k'. The consensus value is entered manually for the same `observation_date` as the latest PAYEMS release; when missing, the scorer returns `score: 3` plus a warning pointing analysts to `/admin/manual-inputs`.
- **`NFP_CONSENSUS` series id** is what scorers reference. Analysts enter it through the new `/admin/manual-inputs` page, which lists every series declared `source: "manual"` by any scorer in the registry.
- **Unemployment is non-monotonic** per spec; we ship the spec verbatim for V1.
- **Sahm Rule** — deferred. The block-2 spec calls for a 3-month-avg vs 12-month-low override; mentor guidance flagged override engines as out-of-scope for V1.

---

## Open questions (carried from spec)

1. **CPI vs Core CPI double-counting.** Headline + Core are typically > 0.85 correlated; effectively gives inflation 2× weight inside Block 2. Spec accepts the double weight intentionally.
2. **Sahm Rule integration.** Deferred to a later block iteration.
3. **NFP Surprise — first print vs revised.** Currently scored on the latest PAYEMS observation; revisions land 1–2 months later and the m/m delta updates implicitly. Consensus is entered once on release day and not retroactively updated.
4. **Wage measure.** AHE (FRED `CES0500000003`) shipped; Atlanta Fed Wage Tracker considered as alternative for V2.
5. **Unemployment scoring direction.** Verbatim non-monotonic per spec. Open whether sub-3.5% should be 4 instead of 5 in overheating regimes.

---

## Files

- `lib/scoring/blocks/inflation-labor/index.ts` — block definition
- `lib/scoring/blocks/inflation-labor/{cpi-headline-yoy,core-cpi-yoy,unemployment-rate,nfp-surprise,wage-growth-yoy,participation-rate}.ts` — 6 scorers
- `lib/scoring/helpers.ts` — `yoyPctFromIndex` helper
- `lib/fred/series-catalog.ts` — `inflation_labor` block series list
- `shared/schema.ts` — `indicator_manual_inputs` table
- `lib/scoring/manual-inputs-repo.ts` — manual inputs CRUD
- `lib/scoring/manual-inputs-catalog.ts` — registry-derived manual series catalog
- `app/api/admin/manual-inputs/route.ts` — admin API
- `app/admin/manual-inputs/page.tsx` + `app/admin/_components/manual-inputs/series-card.tsx` — admin UI
