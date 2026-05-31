import { IndicatorScorer } from "@/lib/scoring/indicator-scorer";
import type {
  IndicatorExample,
  ScoreBand,
  ScoringInput,
  ScoringResult,
  SeriesInputSpec,
} from "@/lib/scoring/types";

const PUT_CALL_SERIES = "PUT_CALL_RATIO";

/**
 * Put/Call Ratio (Equity, CBOE)
 *
 * Daily ratio of total equity put-option volume to call-option volume.
 * Contrarian at extremes: heavy hedging (>1.2) often marks bottoms, and
 * heavy call buying (<0.5) often marks tops. Block 3 scores current mood:
 * high P/C = fear = low score; low P/C = greed = high score.
 *
 * V1 MVP note: real CBOE/Tiingo P/C data is not yet ingested. The manual
 * CSV currently ships a placeholder (all values → neutral 0.85). The
 * `warning` field below surfaces this limitation in the UI.
 *
 * Source: manual (indicator_manual_inputs, series_id = PUT_CALL_RATIO)
 * Spec: docs_local/.../scoring-engine/block-3-sentiment-risk.md §3.2
 */
export class PutCallRatioScorer extends IndicatorScorer {
  readonly key = "put_call_ratio";
  readonly name = "Put/Call Ratio";
  readonly blockKey = "sentiment_risk";
  readonly unit = "ratio";
  // Spec weight 20% within Block 3.
  readonly weight = 20;
  readonly description =
    "Total equity put-option volume divided by call-option volume. Contrarian " +
    "at extremes — heavy put buying marks panic bottoms, heavy call buying " +
    "marks euphoric tops.";
  readonly formula = "score(PUT_CALL_RATIO_latest)";
  readonly formulaPretty = "score = band(PUT_CALL_RATIO_latest)";
  readonly inputs: SeriesInputSpec[] = [
    { seriesId: PUT_CALL_SERIES, lookbackDays: 14, required: true, source: "manual" },
  ];
  readonly bands: ScoreBand[] = [
    {
      score: 1,
      label: "Heavy Hedging",
      rangeLabel: "> 1.2",
      test: (v) => v > 1.2,
      interpretation: "Panic put buying; historically a contrarian buy signal.",
    },
    {
      score: 2,
      label: "Elevated Fear",
      rangeLabel: "0.95 – 1.2",
      test: (v) => v >= 0.95 && v <= 1.2,
      interpretation: "Defensive positioning rising; bearish lean dominant.",
    },
    {
      score: 3,
      label: "Neutral",
      rangeLabel: "0.70 – 0.94",
      test: (v) => v >= 0.7 && v < 0.95,
      interpretation: "Balanced positioning; no extreme signal.",
    },
    {
      score: 4,
      label: "Bullish Skew",
      rangeLabel: "0.50 – 0.69",
      test: (v) => v >= 0.5 && v < 0.7,
      interpretation: "Call buying dominant; supportive of risk-on.",
    },
    {
      score: 5,
      label: "Euphoria",
      rangeLabel: "< 0.50",
      test: (v) => v < 0.5,
      interpretation: "Extreme call buying; contrarian sell warning.",
    },
  ];
  readonly examples: IndicatorExample[] = [
    { description: "Mar 2020 COVID puts",   inputs: { PUT_CALL_RATIO: 1.35 }, expectedScore: 1 },
    { description: "Oct 2022 risk-off",     inputs: { PUT_CALL_RATIO: 1.05 }, expectedScore: 2 },
    { description: "Typical mid-cycle",     inputs: { PUT_CALL_RATIO: 0.85 }, expectedScore: 3 },
    { description: "2021 reopening bull",   inputs: { PUT_CALL_RATIO: 0.60 }, expectedScore: 4 },
    { description: "Jan 2018 euphoria",     inputs: { PUT_CALL_RATIO: 0.45 }, expectedScore: 5 },
  ];

  compute(input: ScoringInput): ScoringResult {
    const obs = this.latest(input, PUT_CALL_SERIES);
    if (!obs) return this.missingInputs("Missing PUT_CALL_RATIO observation in lookback window");

    const value = Number(obs.value);
    if (!Number.isFinite(value)) {
      return this.missingInputs(`Invalid PUT_CALL_RATIO value: ${obs.value}`);
    }

    const band = this.band(value);
    return {
      indicatorKey: this.key,
      score: band.score,
      rawValue: value,
      bandLabel: band.label,
      interpretation: band.interpretation,
      inputsUsed: [{ seriesId: PUT_CALL_SERIES, date: obs.observationDate, value }],
      formulaTrace: `PUT_CALL_RATIO (${obs.observationDate}) = ${value.toFixed(2)} → ${band.label}`,
      warning:
        "V1 placeholder data — real Tiingo/CBOE Put/Call feed pending. Score will always trend Neutral until live data arrives.",
    };
  }
}
