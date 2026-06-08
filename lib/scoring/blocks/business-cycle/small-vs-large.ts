import { IndicatorScorer } from "@/lib/scoring/indicator-scorer";
import type {
  IndicatorExample,
  ScoreBand,
  ScoringInput,
  ScoringResult,
  SeriesInputSpec,
} from "@/lib/scoring/types";

/**
 * Small vs Large Caps — 5.3
 *
 * Russell 2000 (IWM) ÷ S&P 500 (SPY), scored on the 90-day % change of the
 * ratio. Rising = small-caps outperforming = risk-on / early-cycle. The
 * absolute level is regime-dependent (M7 era distorts), so the spec scores the
 * 90-day momentum change, not the level.
 *
 * The 90-day % change is *pre-computed upstream from continuous daily
 * underlying prices* and seeded directly as IWM_SPY_RATIO_90D_PCT — recomputing
 * it in-code from the (mixed weekly/daily, forward-filled) ratio series lands on
 * a different baseline and diverges from the validated source-of-truth score.
 * The scorer therefore bands the supplied value directly.
 *
 * Source: Manual (IWM/SPY daily close ratio download; Tiingo would automate)
 * Spec: docs_local/.../scoring-engine/block-5-business-cycle.md §5.3
 */
export class SmallVsLargeScorer extends IndicatorScorer {
  readonly key = "small_vs_large";
  readonly name = "Small vs Large Caps";
  readonly blockKey = "business_cycle";
  readonly unit = "% 90d";
  // Spec weight 10% within Block 5.
  readonly weight = 10;
  readonly description =
    "90-day percent change in the Russell 2000 (IWM) ÷ S&P 500 (SPY) ratio. " +
    "Small-cap relative strength is a classic risk-on / early-cycle signal; " +
    "scored on momentum rather than the regime-dependent ratio level.";
  readonly formula = "score(IWM_SPY_RATIO_90D_PCT_latest)";
  readonly formulaPretty = "score = band(IWM_SPY_RATIO_90D_PCT_latest)";
  readonly inputs: SeriesInputSpec[] = [
    { seriesId: "IWM_SPY_RATIO_90D_PCT", lookbackDays: 14, required: true, source: "manual" },
  ];
  readonly bands: ScoreBand[] = [
    {
      score: 1,
      label: "Aggressive Flight to Mega-Caps",
      rangeLabel: "< −10%",
      test: (v) => v < -10,
      interpretation: "Aggressive flight to mega-caps; defensive rotation; cycle peak or recession fear.",
    },
    {
      score: 2,
      label: "Mild Defensive Rotation",
      rangeLabel: "−10% to −3%",
      test: (v) => v >= -10 && v < -3,
      interpretation: "Mild defensive rotation; risk appetite declining.",
    },
    {
      score: 3,
      label: "Balanced",
      rangeLabel: "−3% to +3%",
      test: (v) => v >= -3 && v <= 3,
      interpretation: "Balanced; no clear rotation signal.",
    },
    {
      score: 4,
      label: "Small-Caps Gaining",
      rangeLabel: "+3% to +10%",
      test: (v) => v > 3 && v <= 10,
      interpretation: "Small-caps gaining; cyclical optimism building.",
    },
    {
      score: 5,
      label: "Strong Small-Cap Leadership",
      rangeLabel: "> +10%",
      test: (v) => v > 10,
      interpretation: "Strong small-cap leadership; risk-on; early-cycle signal.",
    },
  ];
  readonly examples: IndicatorExample[] = [
    { description: "Flight to mega-caps", inputs: { ratio_90d_pct: -15 },   expectedScore: 1 },
    { description: "Mild defensive",      inputs: { ratio_90d_pct: -5 },    expectedScore: 2 },
    { description: "Balanced (2026)",     inputs: { ratio_90d_pct: 0.15 },  expectedScore: 3 },
    { description: "Cyclical optimism",   inputs: { ratio_90d_pct: 6 },     expectedScore: 4 },
    { description: "Small-cap surge",     inputs: { ratio_90d_pct: 14 },    expectedScore: 5 },
  ];

  compute(input: ScoringInput): ScoringResult {
    const obs = this.latest(input, "IWM_SPY_RATIO_90D_PCT");
    if (!obs) {
      return this.missingInputs("Missing IWM_SPY_RATIO_90D_PCT manual input in lookback window");
    }

    const value = Number(obs.value);
    if (!Number.isFinite(value)) {
      return this.missingInputs(`Invalid IWM_SPY_RATIO_90D_PCT value: ${obs.value}`);
    }

    const band = this.band(value);
    const sign = value >= 0 ? "+" : "";
    return {
      indicatorKey: this.key,
      score: band.score,
      rawValue: value,
      bandLabel: band.label,
      interpretation: band.interpretation,
      inputsUsed: [{ seriesId: "IWM_SPY_RATIO_90D_PCT", date: obs.observationDate, value }],
      formulaTrace:
        `IWM_SPY_RATIO_90D_PCT (${obs.observationDate}) = ${sign}${value.toFixed(2)}% → ${band.label}`,
    };
  }
}
