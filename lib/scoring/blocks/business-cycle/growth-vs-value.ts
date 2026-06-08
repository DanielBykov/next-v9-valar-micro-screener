import { IndicatorScorer } from "@/lib/scoring/indicator-scorer";
import type {
  IndicatorExample,
  ScoreBand,
  ScoringInput,
  ScoringResult,
  SeriesInputSpec,
} from "@/lib/scoring/types";

/**
 * Growth vs Value — 5.4
 *
 * S&P 500 Growth (SPYG) ÷ S&P 500 Value (SPYV), scored on the 90-day % change
 * of the ratio (tighter ±8/±2 thresholds than 5.3). Growth leadership proxies
 * for rate-cut expectations / risk-on.
 *
 * Like 5.3, the 90-day % change is *pre-computed upstream from continuous daily
 * underlying prices* and seeded directly as SPYG_SPYV_RATIO_90D_PCT; the scorer
 * bands the supplied value (in-code recomputation from the gappy ratio series
 * diverges from the validated source-of-truth score).
 *
 * Directional caveat (spec §5.4): growth leadership is ambiguous — "rate cuts
 * coming + risk-on" OR "defensive late-cycle flight to quality". Weakest
 * Block-5 indicator; possible future drop.
 *
 * Source: Manual (SPYG/SPYV daily close ratio download)
 * Spec: docs_local/.../scoring-engine/block-5-business-cycle.md §5.4
 */
export class GrowthVsValueScorer extends IndicatorScorer {
  readonly key = "growth_vs_value";
  readonly name = "Growth vs Value";
  readonly blockKey = "business_cycle";
  readonly unit = "% 90d";
  // Spec weight 10% within Block 5.
  readonly weight = 10;
  readonly description =
    "90-day percent change in the S&P 500 Growth (SPYG) ÷ Value (SPYV) ratio. " +
    "A proxy for rate expectations and cycle phase; growth leadership maps to " +
    "rate-cut / risk-on momentum (with a late-cycle defensive-growth caveat).";
  readonly formula = "score(SPYG_SPYV_RATIO_90D_PCT_latest)";
  readonly formulaPretty = "score = band(SPYG_SPYV_RATIO_90D_PCT_latest)";
  readonly inputs: SeriesInputSpec[] = [
    { seriesId: "SPYG_SPYV_RATIO_90D_PCT", lookbackDays: 14, required: true, source: "manual" },
  ];
  readonly bands: ScoreBand[] = [
    {
      score: 1,
      label: "Value Leading Hard",
      rangeLabel: "< −8%",
      test: (v) => v < -8,
      interpretation: "Aggressive value rotation; either inflation shock OR late-cycle quality.",
    },
    {
      score: 2,
      label: "Value-Leaning",
      rangeLabel: "−8% to −2%",
      test: (v) => v >= -8 && v < -2,
      interpretation: "Value-leaning rotation; mixed cycle signal.",
    },
    {
      score: 3,
      label: "Balanced",
      rangeLabel: "−2% to +2%",
      test: (v) => v >= -2 && v <= 2,
      interpretation: "Balanced; no clear style leadership.",
    },
    {
      score: 4,
      label: "Growth Leading",
      rangeLabel: "+2% to +8%",
      test: (v) => v > 2 && v <= 8,
      interpretation: "Growth leading; risk appetite + rate-cut expectations.",
    },
    {
      score: 5,
      label: "Strong Growth Leadership",
      rangeLabel: "> +8%",
      test: (v) => v > 8,
      interpretation: "Strong growth leadership; max risk-on OR rate-cut momentum.",
    },
  ];
  readonly examples: IndicatorExample[] = [
    { description: "Value rotation",    inputs: { ratio_90d_pct: -12 },  expectedScore: 1 },
    { description: "Value-leaning",     inputs: { ratio_90d_pct: -4 },   expectedScore: 2 },
    { description: "Balanced",          inputs: { ratio_90d_pct: 0.5 },  expectedScore: 3 },
    { description: "Growth leading",    inputs: { ratio_90d_pct: 3.51 }, expectedScore: 4 },
    { description: "Strong growth",     inputs: { ratio_90d_pct: 11 },   expectedScore: 5 },
  ];

  compute(input: ScoringInput): ScoringResult {
    const obs = this.latest(input, "SPYG_SPYV_RATIO_90D_PCT");
    if (!obs) {
      return this.missingInputs("Missing SPYG_SPYV_RATIO_90D_PCT manual input in lookback window");
    }

    const value = Number(obs.value);
    if (!Number.isFinite(value)) {
      return this.missingInputs(`Invalid SPYG_SPYV_RATIO_90D_PCT value: ${obs.value}`);
    }

    const band = this.band(value);
    const sign = value >= 0 ? "+" : "";
    return {
      indicatorKey: this.key,
      score: band.score,
      rawValue: value,
      bandLabel: band.label,
      interpretation: band.interpretation,
      inputsUsed: [{ seriesId: "SPYG_SPYV_RATIO_90D_PCT", date: obs.observationDate, value }],
      formulaTrace:
        `SPYG_SPYV_RATIO_90D_PCT (${obs.observationDate}) = ${sign}${value.toFixed(2)}% → ${band.label}`,
    };
  }
}
