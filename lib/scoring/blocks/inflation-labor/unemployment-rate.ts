import { IndicatorScorer } from "@/lib/scoring/indicator-scorer";
import type {
  IndicatorExample,
  ScoreBand,
  ScoringInput,
  ScoringResult,
  SeriesInputSpec,
} from "@/lib/scoring/types";

/**
 * Unemployment Rate
 *
 * Latest level of UNRATE (BLS U-3, %). The scoring is non-monotonic — both
 * very high (recessionary) and very low (overheating) are penalized vs the
 * 3.5–3.9 sweet spot. See open question in block-2 spec about whether <3.5
 * should still earn the top score; we follow the spec verbatim for V1.
 *
 * The Sahm Rule (3-month avg vs 12-month low) is deferred — see block-2 spec.
 *
 * Source: FRED UNRATE (https://fred.stlouisfed.org/series/UNRATE)
 * Spec: docs_local/.../scoring-engine/block-2-inflation-labor.md §2.3
 */
export class UnemploymentRateScorer extends IndicatorScorer {
  readonly key = "unemployment_rate";
  readonly name = "Unemployment Rate";
  readonly blockKey = "inflation_labor";
  readonly unit = "%";
  // Spec weight 20% within Block 2.
  readonly weight = 20;
  readonly description =
    "Percentage of the labor force jobless and actively seeking work (BLS U-3). " +
    "The most-watched measure of labor market slack. Sweet spot is 3.5–4.5% — " +
    "full employment without overheating wage pressure.";
  readonly formula = "score(UNRATE_latest)";
  readonly formulaPretty = "score = band(UNRATE_latest) — most recent monthly observation";
  readonly inputs: SeriesInputSpec[] = [
    { seriesId: "UNRATE", lookbackDays: 45, required: true },
  ];
  readonly bands: ScoreBand[] = [
    {
      score: 1,
      label: "Severe Deterioration",
      rangeLabel: "> 7.0%",
      test: (v) => v > 7.0,
      interpretation: "Recession confirmed; consumer spending collapse risk.",
    },
    {
      score: 2,
      label: "Rising",
      rangeLabel: "5.5% – 7.0%",
      test: (v) => v >= 5.5 && v <= 7.0,
      interpretation: "Recessionary signal; negative for earnings but may trigger Fed easing.",
    },
    {
      score: 3,
      label: "Moderate",
      rangeLabel: "4.0% – 5.4%",
      test: (v) => v >= 4.0 && v < 5.5,
      interpretation: "Near NAIRU; balanced labor market; no extreme signals.",
    },
    {
      score: 4,
      label: "Healthy Tight",
      rangeLabel: "3.5% – 3.9%",
      test: (v) => v >= 3.5 && v < 4.0,
      interpretation: "Strong consumer; positive for earnings; manageable wage pressure.",
    },
    {
      score: 5,
      label: "Full Employment",
      rangeLabel: "< 3.5%",
      test: (v) => v < 3.5,
      interpretation: "Very tight labor market; strong consumer base; watch for overheating.",
    },
  ];
  readonly examples: IndicatorExample[] = [
    { description: "Apr 2020 COVID shock", inputs: { UNRATE: 14.7 }, expectedScore: 1 },
    { description: "2025 mid-year",        inputs: { UNRATE: 4.2 }, expectedScore: 3 },
    { description: "2023 historical tight", inputs: { UNRATE: 3.7 }, expectedScore: 4 },
    { description: "2019 50-year low",      inputs: { UNRATE: 3.4 }, expectedScore: 5 },
  ];

  compute(input: ScoringInput): ScoringResult {
    const obs = this.latest(input, "UNRATE");
    if (!obs) return this.missingInputs("Missing UNRATE observation in lookback window");

    const value = Number(obs.value);
    if (!Number.isFinite(value)) {
      return this.missingInputs(`Invalid UNRATE value: ${obs.value}`);
    }

    const band = this.band(value);
    return {
      indicatorKey: this.key,
      score: band.score,
      rawValue: value,
      bandLabel: band.label,
      interpretation: band.interpretation,
      inputsUsed: [{ seriesId: "UNRATE", date: obs.observationDate, value }],
      formulaTrace: `UNRATE (${obs.observationDate}) = ${value.toFixed(1)}% → ${band.label}`,
    };
  }
}
