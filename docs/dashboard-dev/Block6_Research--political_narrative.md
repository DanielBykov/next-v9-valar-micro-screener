# Block 6 — Political & Narrative Risk

**Block key:** `political_narrative` · **Block weight:** 5% · **6 indicators** · **`sortOrder: 5`**
**Spec source of truth:** `docs_local/one-drive-macro-screener/scoring-engine/block-6-political-narrative.md`
**Weights source:** `docs_local/one-drive-macro-screener/scoring-engine/weights.csv`
**Data status:** `docs_local/one-drive-macro-screener/scoring-engine/indicators-data-status.md`

**Status: WIRED (code complete; data seed pending).** Block 6 is registered in the engine registry and removed from `PLANNED_BLOCK_NAMES`. `npm run check` (tsc) is clean. All 6 indicators ship. **Data seed not yet run from this environment** — the Neon Postgres host (`ap-southeast-2`) was unreachable (`ETIMEDOUT`); run the seed + FRED fetch from an environment with DB access (commands below). Until then, manual indicators report "missing" (neutral 3) and 6.2 awaits its FRED fetch.

---

## Design decisions (V1, as built)

1. **Ship all 6 indicators** (per spec prose), even though the data-status inventory flagged 6.4/6.5 as "drop for V1". 6.4 (Media Fear) is built from real raw GDELT tone; 6.5 (Sanctions) defaults to neutral until an event is flagged. This keeps the block at 6 indicators / weights summing to 100%.
2. **6.1, 6.3, 6.6 = pre-scored pass-through.** Their `daily.csv` files store the final 1–5 `score` (not a raw index level). The scorers ingest that score directly and use bands only for the label/interpretation (`test: (v) => v === N`). This honours the validated source-of-truth scores rather than re-deriving from raw values that aren't in the daily CSVs. (Same philosophy as Block 5's pre-computed `lei_yoy` / `ratio_90d_pct` exceptions.)
3. **6.2 (US EPU) = FRED, banded in-code.** `USEPUINDXM` is auto-fetched into `indicator_observations`; the scorer bands the raw monthly index level `numeric_descending` (>300 → 1 … <75 → 5). The only data-driven FRED feed in Block 6.
4. **6.4 (Media Fear) = raw GDELT tone, banded in-code.** The README documents tone→score thresholds calibrated from the 2023–2026 distribution. The CSV (`raw_tone.csv`) stores raw daily average tone with `YYYYMMDD` dates and **no score column**, so — unlike 6.1/6.3/6.6 — this scorer bands the raw tone (`numeric_descending`: more negative = more fear = lower score). The seed normalises `YYYYMMDD`→`YYYY-MM-DD` and skips zero-tone rows (weekend/low-volume gaps); the scorer forward-fills via its 30-day lookback.
5. **6.5 (Sanctions) = event-scored, default 3.** No clean public numeric index exists and there's no backfill data on disk. The scorer's input is `required: false`; when absent it returns a neutral score 3 ("Routine Enforcement") by design (not a missing-data warning). An analyst seeds an event row to override.
6. **6.6 kept in Block 6** (open question: it's mechanically a monetary signal that could live in Block 1). Kept for V1 to capture the *political coordination* of monetary policy; revisit post-MVP.
7. **Block weight (5%) is metadata only.** Like the other five blocks, the total stays Σ blockScore on the 0–120 scale; `weight` is stored for display / future weighted aggregation.

---

## Indicators

| ID | Indicator | Series ID | Type | Indicator weight | Effective weight | Source | Lookback |
|---|---|---|---|---:|---:|---|---|
| 6.3 | Geopolitical Risk (GPR) | `GPR_MONTHLY` | pre-scored 1–5 (descending) | 40% | 2.00% | Manual | 60d |
| 6.2 | Policy Conflict (US EPU) | `USEPUINDXM` | numeric_descending (index) | 25% | 1.25% | FRED | 90d |
| 6.1 | China–US Tension | `EPU_CHINA` | pre-scored 1–5 (descending) | 10% | 0.50% | Manual | 60d |
| 6.5 | Sanctions Activity | `SANCTIONS_ACTIVITY` | event 1–5 (descending, default 3) | 10% | 0.50% | Manual (optional) | 120d |
| 6.6 | Global Easing/Tightening | `GLOBAL_EASING` | pre-scored 1–5 (ascending) | 10% | 0.50% | Manual | 60d |
| 6.4 | Media Fear | `GDELT_FEAR_TONE` | numeric_descending (tone) | 5% | 0.25% | Manual | 30d |

Indicator weights sum to 100% within Block 6; Block 6 = 5% of total → effective weights as shown.

---

## Scoring matrices (as built)

### 6.1 China–US Tension (`EPU_CHINA`, pre-scored 1–5, descending)
| Score | Label |
|---|---|
| 1 | Crisis-Level Tensions |
| 2 | Elevated Friction |
| 3 | Background Tension |
| 4 | De-escalation |
| 5 | Engagement / Detente |

### 6.2 Policy Conflict — US EPU (`USEPUINDXM`, index level, descending)
| Score | Label | Range |
|---|---|---|
| 1 | Extreme Uncertainty | > 300 |
| 2 | Elevated Uncertainty | 200 – 300 |
| 3 | Normal | 100 – 200 |
| 4 | Calm Policy Environment | 75 – 99 |
| 5 | Unusually Low | < 75 |

### 6.3 Geopolitical Risk — GPR (`GPR_MONTHLY`, pre-scored 1–5, descending)
| Score | Label |
|---|---|
| 1 | War-Level Risk |
| 2 | Elevated Risk |
| 3 | Background Noise |
| 4 | Calm Period |
| 5 | Unusual Calm |

### 6.4 Media Fear (`GDELT_FEAR_TONE`, raw tone, descending)
| Score | Label | Range (GDELT tone) |
|---|---|---|
| 1 | Crisis Fear | ≤ −4.0 |
| 2 | Elevated Fear | −4.0 to −2.5 |
| 3 | Normal | −2.5 to −1.0 |
| 4 | Calm | −1.0 to 0.0 |
| 5 | Optimistic | > 0.0 |

### 6.5 Sanctions Activity (`SANCTIONS_ACTIVITY`, event 1–5, descending; default 3)
| Score | Label |
|---|---|
| 1 | Major Package |
| 2 | Significant New Sanctions |
| 3 | Routine Enforcement (default) |
| 4 | Easing |
| 5 | Broad Relief |

### 6.6 Global Easing/Tightening (`GLOBAL_EASING`, pre-scored 1–5, ascending)
| Score | Label |
|---|---|
| 1 | Synchronised Tightening |
| 2 | Net Tightening |
| 3 | Mixed / Transitioning |
| 4 | Net Easing |
| 5 | Synchronised Easing |

---

## Data sources & ingestion

| Series ID | Table | Ingestion method | Source CSV |
|---|---|---|---|
| `USEPUINDXM` | `indicator_observations` | FRED auto-fetch (`SERIES_BY_BLOCK.political_narrative`) | n/a (FRED API) |
| `EPU_CHINA` | `indicator_manual_inputs` | seed-block6-manual.ts | `indicator_6.1_china_us_tension/daily.csv` col `score` |
| `GPR_MONTHLY` | `indicator_manual_inputs` | seed-block6-manual.ts | `indicator_6.3_gpr/daily.csv` col `score` |
| `GLOBAL_EASING` | `indicator_manual_inputs` | seed-block6-manual.ts | `indicator_6.6_global_easing/daily.csv` col `score` |
| `GDELT_FEAR_TONE` | `indicator_manual_inputs` | seed-block6-manual.ts | `indicator_6.4_media_fear/raw_tone.csv` + `new_rows.csv` col `tone` (date `YYYYMMDD`) |
| `SANCTIONS_ACTIVITY` | `indicator_manual_inputs` | analyst-entered events only (no backfill) | n/a |

Base manual-data path: `docs_local/one-drive-macro-screener/data/manual/`.

**Seed usage (idempotent on `(series_id, observation_date)`):**
```bash
node --env-file=.env ./node_modules/.bin/tsx lib/scripts/seed-block6-manual.ts
```
Expected row counts (from CSV parse, pre-DB): EPU_CHINA 1217, GPR_MONTHLY 1217, GLOBAL_EASING 1217, GDELT_FEAR_TONE 430 (after skipping zero-tone gaps) — total 4,081. SANCTIONS_ACTIVITY not seeded.

**FRED fetch (6.2):**
```bash
# via the running app:
GET /api/admin/fetch-indicators?block=political_narrative
# or programmatically: fetchAndStoreBlock("political_narrative", from, to)
```

**FRED catalog change** (`lib/fred/series-catalog.ts`):
```ts
political_narrative: [
  "USEPUINDXM",  // Baker-Bloom-Davis US EPU, monthly (6.2)
  // EPU_CHINA (6.1), GPR_MONTHLY (6.3), GDELT_FEAR_TONE (6.4),
  // SANCTIONS_ACTIVITY (6.5), GLOBAL_EASING (6.6): manual — bulk-seeded,
  // excluded so the FRED fetcher skips them.
],
```
`BlockKey` union extended with `"political_narrative"`.

---

## Files added / modified

**New:**
- `lib/scoring/blocks/political-narrative/index.ts` — `politicalNarrativeBlock` + REGIME_MAP
- `lib/scoring/blocks/political-narrative/china-us-tension.ts` — 6.1 (pre-scored)
- `lib/scoring/blocks/political-narrative/us-policy-uncertainty.ts` — 6.2 (FRED, descending)
- `lib/scoring/blocks/political-narrative/geopolitical-risk.ts` — 6.3 (pre-scored)
- `lib/scoring/blocks/political-narrative/media-fear.ts` — 6.4 (raw tone, descending)
- `lib/scoring/blocks/political-narrative/sanctions-activity.ts` — 6.5 (event, default 3)
- `lib/scoring/blocks/political-narrative/global-easing.ts` — 6.6 (pre-scored, ascending)
- `lib/scripts/seed-block6-manual.ts` — bulk-load 4 manual series (6.1/6.3/6.4/6.6)

**Modified:**
- `lib/scoring/registry.ts` — import + append `politicalNarrativeBlock` to `BLOCKS`
- `lib/fred/series-catalog.ts` — `BlockKey` union + `SERIES_BY_BLOCK.political_narrative`
- `lib/scoring/dashboard-adapter.ts` — emptied `PLANNED_BLOCK_NAMES` (Block 6 was the last planned placeholder; now a real block)

**No schema changes.** Existing `indicator_observations` + `indicator_manual_inputs` tables suffice.

---

## Regime map (block average → label)

| blockAverage | Label | Interpretation |
|---|---|---|
| 1.0 – 1.8 | ACUTE EXTERNAL CRISIS | War-level GPR, crisis EPU, sanctions wave, panic media, synchronised tightening. Risk-off justified regardless of other blocks (2008/2020/2022). |
| 1.9 – 2.5 | ELEVATED EXTERNAL RISK | Significant geopolitical/policy stress; sanctions/conflict active. Defensive tilt as overlay. |
| 2.6 – 3.4 | DEFAULT / BACKGROUND | Normal political/narrative noise; no acute risks. The most common state. |
| 3.5 – 4.2 | CALM GEOPOLITICAL BACKDROP | Quiet period; supportive overlay for risk assets. |
| 4.3 – 5.0 | COORDINATED TAILWIND | Synchronised easing + calm geopolitics. Rare and bullish. |

Direction: high score = calm/supportive; low score = acute external crisis. Block 6 sits at 3 most of the time; the 1–2 range matters disproportionately at inflection points.

---

## Verification

`npm run check` (tsc) clean. CSV-parse row counts confirmed via the seed script's dry summary (EPU_CHINA/GPR_MONTHLY/GLOBAL_EASING 1217 each; GDELT_FEAR_TONE 430). **End-to-end engine verification pending the data seed** — the Neon DB (`ep-noisy-grass-...ap-southeast-2.aws.neon.tech`) was unreachable from the build environment (`ETIMEDOUT`). Re-run the seed + FRED fetch where the DB is reachable, then spot-check a recent `asOfDate` against the seeded `score` columns (as done for Block 5).

---

## Open questions / caveats

1. **6.6 placement (Block 6 vs Block 1).** Mechanically a monetary signal. Kept in Block 6 for V1 to capture political coordination of policy; cleaner taxonomy would move it to Block 1. Decision deferred post-MVP.
2. **6.5 has no backfill data.** Defaults to neutral 3 until an analyst flags an event. Carries 10% intra-block weight while effectively constant — consider down-weighting or relabeling if it stays empty (spec lead open question).
3. **6.4 source-of-truth coupling + gaps.** Raw GDELT tone has weekend/low-volume zero rows (skipped at seed) and large fetch gaps that the README forward-fills as estimates. The scorer's 30-day lookback forward-fills naturally; treat long-gap scores as estimates. README claims a `daily.csv` exists but only `raw_tone.csv`/`new_rows.csv` are present — seed uses the raw files and bands in-code.
4. **6.1 EPU-China proxy.** Captures the right episodes but isn't a purpose-built US–China index; co-moves with 6.2 (shared EPU lineage), so 6.1 and 6.2 are not fully independent. Flagged in spec for post-MVP replacement.
5. **6.2 band boundary at 200.** Spec lists band 2 as "200–300" and band 3 as "100–199"; as built, band 2 is `>200`, band 3 is `100–200` inclusive, so exactly 200 scores 3. Minor edge-case choice to avoid an unhandled value.
6. **Block-6 weight (5%) vs signal quality.** Noisiest block; mentor advised equal weighting for V1, revisit after backtest. Weight is metadata only today.
