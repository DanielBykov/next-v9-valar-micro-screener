import { IndicatorScorer } from "@/lib/scoring/indicator-scorer";
import type {
  IndicatorExample,
  ScoreBand,
  ScoringInput,
  ScoringResult,
  SeriesInputSpec,
} from "@/lib/scoring/types";

/**
 * Real Interest Rate (10Y)
 *
 *   real_rate = DGS10 − T10YIE
 *
 * The cost of capital after stripping out market-implied inflation expectations.
 * Deeply positive real rates are restrictive for equities; deeply negative real
 * rates are highly stimulative.
 *
 * Sources:
 *   - FRED DGS10  (https://fred.stlouisfed.org/series/DGS10) — 10Y Treasury yield
 *   - FRED T10YIE (https://fred.stlouisfed.org/series/T10YIE) — 10Y breakeven inflation
 * Spec: docs/dashboard-dev/Block1_Research--rates_cb_policy.md §6
 */
export class RealInterestRateScorer extends IndicatorScorer {
  readonly key = "real_interest_rate";
  readonly name = "Real Interest Rate";
  readonly blockKey = "rates";
  readonly unit = "%";
  readonly description =
    "Inflation-adjusted 10-year Treasury yield. Computed as the nominal 10Y yield minus " +
    "the 10Y breakeven (market-implied) inflation rate. High real rates pressure asset " +
    "valuations; negative real rates fuel risk-asset rallies.";
  readonly formula = "DGS10 - T10YIE";
  readonly formulaPretty = "real_rate_% = DGS10 (10Y nominal yield) − T10YIE (10Y breakeven inflation)";
  readonly inputs: SeriesInputSpec[] = [
    { seriesId: "DGS10", lookbackDays: 7, required: true },
    { seriesId: "T10YIE", lookbackDays: 7, required: true },
  ];
  readonly bands: ScoreBand[] = [
    {
      score: 1,
      label: "Very Restrictive",
      rangeLabel: "> 2.5%",
      test: (v) => v > 2.5,
      interpretation: "Very restrictive; strong headwind for equities.",
    },
    {
      score: 2,
      label: "Restrictive",
      rangeLabel: "1.5% – 2.5%",
      test: (v) => v > 1.5 && v <= 2.5,
      interpretation: "Restrictive; real cost of capital elevated.",
    },
    {
      score: 3,
      label: "Near Neutral",
      rangeLabel: "0.5% – 1.5%",
      test: (v) => v >= 0.5 && v <= 1.5,
      interpretation: "Moderately positive; near long-run neutral.",
    },
    {
      score: 4,
      label: "Accommodative",
      rangeLabel: "-0.5% – 0.5%",
      test: (v) => v >= -0.5 && v < 0.5,
      interpretation: "Low or slightly negative; supportive for risk assets.",
    },
    {
      score: 5,
      label: "Very Accommodative",
      rangeLabel: "< -0.5%",
      test: (v) => v < -0.5,
      interpretation: "Deeply negative; very bullish for equities.",
    },
  ];
  readonly examples: IndicatorExample[] = [
    { description: "2023 peak real rates" , inputs: { DGS10: 4.80, T10YIE: 2.20 }, expectedScore: 1 },
    { description: "2024 mid-cycle"       , inputs: { DGS10: 4.20, T10YIE: 2.30 }, expectedScore: 2 },
    { description: "2018 normalisation"   , inputs: { DGS10: 3.20, T10YIE: 2.10 }, expectedScore: 3 },
    { description: "2017 stable"          , inputs: { DGS10: 2.40, T10YIE: 2.00 }, expectedScore: 4 },
    { description: "COVID lows (Aug 2020)", inputs: { DGS10: 0.55, T10YIE: 1.70 }, expectedScore: 5 },
  ];

  compute(input: ScoringInput): ScoringResult {
    const dgs10 = this.latest(input, "DGS10");
    const t10yie = this.latest(input, "T10YIE");
    if (!dgs10 || !t10yie) {
      return this.missingInputs("Missing DGS10 or T10YIE observation in lookback window");
    }

    const nominal = Number(dgs10.value);
    const breakeven = Number(t10yie.value);
    if (!Number.isFinite(nominal) || !Number.isFinite(breakeven)) {
      return this.missingInputs("Invalid DGS10 or T10YIE value");
    }

    const realRate = nominal - breakeven;
    const band = this.band(realRate);

    return {
      indicatorKey: this.key,
      score: band.score,
      rawValue: realRate,
      bandLabel: band.label,
      interpretation: band.interpretation,
      inputsUsed: [
        { seriesId: "DGS10", date: dgs10.observationDate, value: nominal },
        { seriesId: "T10YIE", date: t10yie.observationDate, value: breakeven },
      ],
      formulaTrace:
        `DGS10 (${nominal.toFixed(2)}%) − T10YIE (${breakeven.toFixed(2)}%) = ` +
        `${realRate.toFixed(2)}% → ${band.label}`,
    };
  }
}
