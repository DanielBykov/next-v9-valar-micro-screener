import { IndicatorScorer } from "@/lib/scoring/indicator-scorer";
import type {
  IndicatorExample,
  ScoreBand,
  ScoringInput,
  ScoringResult,
  SeriesInputSpec,
} from "@/lib/scoring/types";

/**
 * Yield Curve (2Y–10Y)
 *
 * FRED's T10Y2Y series is the 10-Year minus 2-Year Treasury spread, expressed
 * in percentage points (e.g. 0.45 = +45 bps). We band it directly in bps.
 *
 * Inversion (negative spread) has preceded every US recession since 1970.
 *
 * Source: FRED series T10Y2Y (https://fred.stlouisfed.org/series/T10Y2Y)
 * Spec: docs/dashboard-dev/Block1_Research--rates_cb_policy.md §4
 */
export class YieldCurveScorer extends IndicatorScorer {
  readonly key = "yield_curve_2y10y";
  readonly name = "Yield Curve (2Y–10Y)";
  readonly blockKey = "rates";
  readonly unit = "bps";
  readonly description =
    "Spread between the 10-Year and 2-Year US Treasury yields. A positive slope reflects " +
    "normal term-premium and growth expectations. An inverted curve (negative spread) is " +
    "a classic recession predictor — it has preceded every US recession since 1970.";
  readonly formula = "T10Y2Y × 100 (bps)";
  readonly formulaPretty =
    "spread_bps = T10Y2Y × 100 — where T10Y2Y is the FRED 10Y−2Y series in percentage points";
  readonly inputs: SeriesInputSpec[] = [
    { seriesId: "T10Y2Y", lookbackDays: 7, required: true },
  ];
  readonly bands: ScoreBand[] = [
    {
      score: 1,
      label: "Deep Inversion",
      rangeLabel: "< -50 bps",
      test: (v) => v < -50,
      interpretation: "Deep inversion; strong recession signal.",
    },
    {
      score: 2,
      label: "Inverted",
      rangeLabel: "-50 to -1 bps",
      test: (v) => v >= -50 && v < 0,
      interpretation: "Inverted curve; recession probability elevated.",
    },
    {
      score: 3,
      label: "Flat",
      rangeLabel: "0 to +50 bps",
      test: (v) => v >= 0 && v <= 50,
      interpretation: "Flat to mildly positive; transition zone.",
    },
    {
      score: 4,
      label: "Normal",
      rangeLabel: "+51 to +150 bps",
      test: (v) => v > 50 && v <= 150,
      interpretation: "Normal positive slope; healthy term premium.",
    },
    {
      score: 5,
      label: "Steep",
      rangeLabel: "> +150 bps",
      test: (v) => v > 150,
      interpretation: "Steep curve; strong growth expectations.",
    },
  ];
  readonly examples: IndicatorExample[] = [
    { description: "Mid-2023 deep inversion", inputs: { T10Y2Y: -1.05 }, expectedScore: 1 },
    { description: "Late 2022 inversion onset", inputs: { T10Y2Y: -0.30 }, expectedScore: 2 },
    { description: "Post-uninversion flat", inputs: { T10Y2Y: 0.20 }, expectedScore: 3 },
    { description: "Normal 2017-era slope", inputs: { T10Y2Y: 1.00 }, expectedScore: 4 },
    { description: "2021 reflation steepener", inputs: { T10Y2Y: 1.60 }, expectedScore: 5 },
  ];

  compute(input: ScoringInput): ScoringResult {
    const obs = this.latest(input, "T10Y2Y");
    if (!obs) {
      return this.missingInputs("Missing T10Y2Y observation in lookback window");
    }

    const pct = Number(obs.value);
    if (!Number.isFinite(pct)) {
      return this.missingInputs(`Invalid T10Y2Y value: ${obs.value}`);
    }

    const spreadBps = pct * 100;
    const band = this.band(spreadBps);
    return {
      indicatorKey: this.key,
      score: band.score,
      rawValue: spreadBps,
      bandLabel: band.label,
      interpretation: band.interpretation,
      inputsUsed: [{ seriesId: "T10Y2Y", date: obs.observationDate, value: pct }],
      formulaTrace: `T10Y2Y (${obs.observationDate}) = ${pct.toFixed(2)}% → ${spreadBps.toFixed(0)} bps → ${band.label}`,
    };
  }
}
