import { IndicatorScorer } from "@/lib/scoring/indicator-scorer";
import type {
  IndicatorExample,
  ScoreBand,
  ScoringInput,
  ScoringResult,
  SeriesInputSpec,
} from "@/lib/scoring/types";

const AAII_SERIES = "AAII_SPREAD";

/**
 * AAII Bull–Bear Spread (4-week moving average, %)
 *
 * AAII surveys individual investors weekly for their 6-month outlook
 * (Bullish / Neutral / Bearish). The bull–bear spread is %bull − %bear,
 * smoothed by a 4-week moving average to suppress weekly noise.
 *
 * Retail sentiment is a classic contrarian indicator at extremes: very
 * bearish spreads have historically marked good entries, very bullish
 * spreads have marked tops. Block 3 scores current mood (no inversion):
 * very bearish spread → score 1, very bullish spread → score 5.
 *
 * The seed pipeline stores `spread_4wk_ma × 100` (i.e., expressed as a
 * percent in the -50 … +50 range), so band thresholds are in percent.
 *
 * Source: manual (indicator_manual_inputs, series_id = AAII_SPREAD)
 *         Sourced from AAII weekly survey CSV, forward-filled to daily.
 * Spec:   docs_local/.../scoring-engine/block-3-sentiment-risk.md §3.4
 */
export class AaiiSpreadScorer extends IndicatorScorer {
  readonly key = "aaii_spread";
  readonly name = "AAII Spread";
  readonly blockKey = "sentiment_risk";
  readonly unit = "% (4-wk MA)";
  // Spec weight 15% within Block 3.
  readonly weight = 15;
  readonly description =
    "AAII retail-investor bull–bear sentiment spread (%bull − %bear), smoothed " +
    "by a 4-week moving average. Classic contrarian gauge at extremes — very " +
    "bearish readings historically precede rallies; very bullish readings precede pullbacks.";
  readonly formula = "score(spread_4wk_ma_latest)";
  readonly formulaPretty = "score = band(AAII_bull_bear_spread_4wk_ma)";
  readonly inputs: SeriesInputSpec[] = [
    { seriesId: AAII_SERIES, lookbackDays: 14, required: true, source: "manual" },
  ];
  readonly bands: ScoreBand[] = [
    {
      score: 1,
      label: "Extreme Bearish",
      rangeLabel: "< -30%",
      test: (v) => v < -30,
      interpretation: "Retail capitulation; contrarian buy zone historically.",
    },
    {
      score: 2,
      label: "Bearish",
      rangeLabel: "-30% to -10%",
      test: (v) => v >= -30 && v < -10,
      interpretation: "Retail leaning negative; cautious mood dominant.",
    },
    {
      score: 3,
      label: "Neutral",
      rangeLabel: "-10% to +10%",
      test: (v) => v >= -10 && v <= 10,
      interpretation: "Balanced retail sentiment; no extreme signal.",
    },
    {
      score: 4,
      label: "Bullish",
      rangeLabel: "+10% to +30%",
      test: (v) => v > 10 && v <= 30,
      interpretation: "Retail leaning positive; risk-on bias.",
    },
    {
      score: 5,
      label: "Extreme Bullish",
      rangeLabel: "> +30%",
      test: (v) => v > 30,
      interpretation: "Retail euphoria; contrarian sell warning.",
    },
  ];
  readonly examples: IndicatorExample[] = [
    { description: "Sep 2022 deep pessimism", inputs: { AAII_SPREAD: -34 }, expectedScore: 1 },
    { description: "Typical bearish lean",     inputs: { AAII_SPREAD: -20 }, expectedScore: 2 },
    { description: "Balanced cycle",           inputs: { AAII_SPREAD: 2 },   expectedScore: 3 },
    { description: "Healthy bull market",      inputs: { AAII_SPREAD: 20 },  expectedScore: 4 },
    { description: "Dec 2021 froth",           inputs: { AAII_SPREAD: 35 },  expectedScore: 5 },
  ];

  compute(input: ScoringInput): ScoringResult {
    const obs = this.latest(input, AAII_SERIES);
    if (!obs) return this.missingInputs("Missing AAII_SPREAD observation in lookback window");

    const value = Number(obs.value);
    if (!Number.isFinite(value)) {
      return this.missingInputs(`Invalid AAII_SPREAD value: ${obs.value}`);
    }

    const band = this.band(value);
    const sign = value >= 0 ? "+" : "";
    return {
      indicatorKey: this.key,
      score: band.score,
      rawValue: value,
      bandLabel: band.label,
      interpretation: band.interpretation,
      inputsUsed: [{ seriesId: AAII_SERIES, date: obs.observationDate, value }],
      formulaTrace: `AAII_SPREAD (${obs.observationDate}) = ${sign}${value.toFixed(1)}% → ${band.label}`,
    };
  }
}
