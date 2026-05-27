import { IndicatorScorer } from "@/lib/scoring/indicator-scorer";
import type {
  IndicatorExample,
  ScoreBand,
  ScoringInput,
  ScoringResult,
  SeriesInputSpec,
} from "@/lib/scoring/types";

/**
 * Labor Force Participation Rate
 *
 * Latest level of CIVPART (BLS, %). Rising participation expands labor supply
 * (anti-inflationary); falling participation tightens supply (inflationary).
 * Note: a structural demographic downtrend (~0.1–0.2pp/yr from boomer retirement)
 * means these absolute thresholds may need to drift lower over time.
 *
 * Source: FRED CIVPART (https://fred.stlouisfed.org/series/CIVPART)
 * Spec: docs_local/.../scoring-engine/block-2-inflation-labor.md §2.6
 */
export class ParticipationRateScorer extends IndicatorScorer {
  readonly key = "participation_rate";
  readonly name = "Participation Rate";
  readonly blockKey = "inflation_labor";
  readonly unit = "%";
  // Spec weight 10% within Block 2.
  readonly weight = 10;
  readonly description =
    "Percentage of the working-age population (16+) employed or actively seeking work. " +
    "Rising participation expands labor supply without wage pressure (disinflationary); " +
    "falling participation creates labor scarcity even at low unemployment.";
  readonly formula = "score(CIVPART_latest)";
  readonly formulaPretty = "score = band(CIVPART_latest) — most recent monthly observation";
  readonly inputs: SeriesInputSpec[] = [
    { seriesId: "CIVPART", lookbackDays: 45, required: true },
  ];
  readonly bands: ScoreBand[] = [
    {
      score: 1,
      label: "Structural Shortage",
      rangeLabel: "< 61.5%",
      test: (v) => v < 61.5,
      interpretation: "Shrinking workforce; constrains growth potential; inflationary.",
    },
    {
      score: 2,
      label: "Below Norm",
      rangeLabel: "61.5% – 62.0%",
      test: (v) => v >= 61.5 && v < 62.0,
      interpretation: "Below pre-COVID norm; labor supply still tight.",
    },
    {
      score: 3,
      label: "Post-COVID Equilibrium",
      rangeLabel: "62.0% – 62.7%",
      test: (v) => v >= 62.0 && v < 62.8,
      interpretation: "Gradual recovery; neutral for policy.",
    },
    {
      score: 4,
      label: "Approaching Pre-COVID",
      rangeLabel: "62.8% – 63.2%",
      test: (v) => v >= 62.8 && v <= 63.2,
      interpretation: "Labor supply expanding; reduces wage pressure.",
    },
    {
      score: 5,
      label: "Full Recovery",
      rangeLabel: "> 63.2%",
      test: (v) => v > 63.2,
      interpretation: "Abundant labor supply; disinflationary; very healthy.",
    },
  ];
  readonly examples: IndicatorExample[] = [
    { description: "COVID 2020 trough",        inputs: { CIVPART: 60.2 }, expectedScore: 1 },
    { description: "Early 2024 recovery",      inputs: { CIVPART: 61.8 }, expectedScore: 2 },
    { description: "2024–25 mid-recovery",     inputs: { CIVPART: 62.5 }, expectedScore: 3 },
    { description: "Pre-COVID 2019 baseline",  inputs: { CIVPART: 63.3 }, expectedScore: 5 },
  ];

  compute(input: ScoringInput): ScoringResult {
    const obs = this.latest(input, "CIVPART");
    if (!obs) return this.missingInputs("Missing CIVPART observation in lookback window");

    const value = Number(obs.value);
    if (!Number.isFinite(value)) {
      return this.missingInputs(`Invalid CIVPART value: ${obs.value}`);
    }

    const band = this.band(value);
    return {
      indicatorKey: this.key,
      score: band.score,
      rawValue: value,
      bandLabel: band.label,
      interpretation: band.interpretation,
      inputsUsed: [{ seriesId: "CIVPART", date: obs.observationDate, value }],
      formulaTrace: `CIVPART (${obs.observationDate}) = ${value.toFixed(1)}% → ${band.label}`,
    };
  }
}
