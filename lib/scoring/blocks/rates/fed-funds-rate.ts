import { IndicatorScorer } from "@/lib/scoring/indicator-scorer";
import type {
  IndicatorExample,
  ScoreBand,
  ScoringInput,
  ScoringResult,
  SeriesInputSpec,
} from "@/lib/scoring/types";

/**
 * Fed Funds Rate Level
 *
 * Range-based score over the latest DFF (Effective Federal Funds Rate, daily)
 * observation. Higher rate = more restrictive = lower (more bearish) score.
 *
 * Source: FRED series DFF (https://fred.stlouisfed.org/series/DFF)
 * Spec: docs/dashboard-dev/Block1_Research--rates_cb_policy.md §1
 */
export class FedFundsRateLevelScorer extends IndicatorScorer {
  readonly key = "fed_funds_rate_level";
  readonly name = "Fed Funds Rate Level";
  readonly blockKey = "rates";
  readonly unit = "%";
  readonly description =
    "Current level of the Effective Federal Funds Rate. The Fed's primary policy lever — " +
    "directly sets the floor for short-term borrowing costs across the economy. " +
    "Higher rates restrict credit and pressure risk assets; lower rates stimulate.";
  readonly formula = "score(DFF_latest)";
  readonly formulaPretty = "score = band(DFF_latest) where DFF_latest is the most recent daily observation";
  readonly inputs: SeriesInputSpec[] = [
    { seriesId: "DFF", lookbackDays: 7, required: true },
  ];
  readonly bands: ScoreBand[] = [
    {
      score: 1,
      label: "Very Restrictive",
      rangeLabel: "> 5.25%",
      test: (v) => v > 5.25,
      interpretation: "Aggressive tightening; cost of capital very high.",
    },
    {
      score: 2,
      label: "Restrictive",
      rangeLabel: "4.00% – 5.25%",
      test: (v) => v >= 4.0 && v <= 5.25,
      interpretation: "Restrictive territory; credit tightening underway.",
    },
    {
      score: 3,
      label: "Neutral",
      rangeLabel: "2.50% – 3.99%",
      test: (v) => v >= 2.5 && v < 4.0,
      interpretation: "Near estimated long-run neutral rate (~2.5–3%).",
    },
    {
      score: 4,
      label: "Accommodative",
      rangeLabel: "1.00% – 2.49%",
      test: (v) => v >= 1.0 && v < 2.5,
      interpretation: "Accommodative; supportive for borrowing and risk assets.",
    },
    {
      score: 5,
      label: "Very Accommodative",
      rangeLabel: "< 1.00%",
      test: (v) => v < 1.0,
      interpretation: "Emergency / near-zero; maximum monetary accommodation.",
    },
  ];
  readonly examples: IndicatorExample[] = [
    { description: "May 2026 (current hold)", inputs: { DFF: 3.63 }, expectedScore: 3 },
    { description: "Mid-2023 peak", inputs: { DFF: 5.33 }, expectedScore: 1 },
    { description: "Pre-2022 ZIRP", inputs: { DFF: 0.08 }, expectedScore: 5 },
    { description: "2019 (pre-COVID neutral)", inputs: { DFF: 2.40 }, expectedScore: 4 },
  ];

  compute(input: ScoringInput): ScoringResult {
    const obs = this.latest(input, "DFF");
    if (!obs) {
      return this.missingInputs("Missing DFF observation in lookback window");
    }

    const value = Number(obs.value);
    if (!Number.isFinite(value)) {
      return this.missingInputs(`Invalid DFF value: ${obs.value}`);
    }

    const band = this.band(value);
    return {
      indicatorKey: this.key,
      score: band.score,
      rawValue: value,
      bandLabel: band.label,
      interpretation: band.interpretation,
      inputsUsed: [{ seriesId: "DFF", date: obs.observationDate, value }],
      formulaTrace: `DFF (${obs.observationDate}) = ${value.toFixed(2)}% → ${band.label}`,
    };
  }
}
