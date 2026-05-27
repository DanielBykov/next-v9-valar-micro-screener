import { IndicatorScorer } from "@/lib/scoring/indicator-scorer";
import { yoyPctFromIndex } from "@/lib/scoring/helpers";
import type {
  IndicatorExample,
  ScoreBand,
  ScoringInput,
  ScoringResult,
  SeriesInputSpec,
} from "@/lib/scoring/types";

/**
 * Wage Growth — Year-over-Year % of Average Hourly Earnings
 *
 *   wage_yoy_pct = (CES0500000003_latest / CES0500000003_12m_prior − 1) × 100
 *
 * Average Hourly Earnings, total private. Sustainable wage growth =
 * productivity (~1.5%) + inflation target (2%) ≈ 3.5%. Above this risks
 * a wage-price spiral; below 3% signals weak labor demand.
 *
 * Source: FRED CES0500000003 (https://fred.stlouisfed.org/series/CES0500000003)
 * Spec: docs_local/.../scoring-engine/block-2-inflation-labor.md §2.5
 */
export class WageGrowthYoyScorer extends IndicatorScorer {
  readonly key = "wage_growth_yoy";
  readonly name = "Wage Growth YoY";
  readonly blockKey = "inflation_labor";
  readonly unit = "% YoY";
  // Spec weight 15% within Block 2.
  readonly weight = 15;
  readonly description =
    "Year-over-year change in Average Hourly Earnings (total private). The key " +
    "feedback loop between labor-market tightness and inflation. Sustainable rate " +
    "≈ 3.5% (productivity + inflation target).";
  readonly formula = "(AHE_latest / AHE_12m_prior − 1) × 100";
  readonly formulaPretty =
    "yoy_pct = (CES0500000003_latest / CES0500000003_~365d_prior − 1) × 100";
  readonly inputs: SeriesInputSpec[] = [
    { seriesId: "CES0500000003", lookbackDays: 420, required: true },
  ];
  readonly bands: ScoreBand[] = [
    {
      score: 1,
      label: "Spiral Risk",
      rangeLabel: "> 6.0% YoY",
      test: (v) => v > 6.0,
      interpretation: "Wage-price spiral risk; Fed forced to tighten aggressively.",
    },
    {
      score: 2,
      label: "Hot",
      rangeLabel: "5.0% – 6.0% YoY",
      test: (v) => v >= 5.0 && v <= 6.0,
      interpretation: "Above sustainable level; inflation pressure from labor costs.",
    },
    {
      score: 3,
      label: "Above Productivity",
      rangeLabel: "3.5% – 4.9% YoY",
      test: (v) => v >= 3.5 && v < 5.0,
      interpretation: "Above inflation but manageable; supports consumer spending.",
    },
    {
      score: 4,
      label: "Goldilocks",
      rangeLabel: "2.5% – 3.4% YoY",
      test: (v) => v >= 2.5 && v < 3.5,
      interpretation: "Tracks productivity; healthy for consumers and margins.",
    },
    {
      score: 5,
      label: "Soft",
      rangeLabel: "< 2.5% YoY",
      test: (v) => v < 2.5,
      interpretation: "Disinflation signal; removes inflation fear (with consumer weakness risk).",
    },
  ];
  readonly examples: IndicatorExample[] = [
    { description: "2022 peak",         inputs: { yoy: 6.7 }, expectedScore: 1 },
    { description: "2023 mid",          inputs: { yoy: 5.2 }, expectedScore: 2 },
    { description: "2024 cooling",      inputs: { yoy: 3.6 }, expectedScore: 3 },
    { description: "Pre-COVID 2019",    inputs: { yoy: 3.3 }, expectedScore: 4 },
  ];

  compute(input: ScoringInput): ScoringResult {
    const series = input.observations["CES0500000003"] ?? [];
    const yoy = yoyPctFromIndex(series, input.asOfDate);
    if (!yoy) return this.missingInputs("Missing CES0500000003 observations for YoY calculation");

    const { latest, prior, yoyPct } = yoy;
    const band = this.band(yoyPct);
    return {
      indicatorKey: this.key,
      score: band.score,
      rawValue: yoyPct,
      bandLabel: band.label,
      interpretation: band.interpretation,
      inputsUsed: [
        { seriesId: "CES0500000003", date: latest.observationDate, value: Number(latest.value) },
        { seriesId: "CES0500000003", date: prior.observationDate, value: Number(prior.value) },
      ],
      formulaTrace:
        `AHE ${latest.observationDate} ($${Number(latest.value).toFixed(2)}) / ` +
        `${prior.observationDate} ($${Number(prior.value).toFixed(2)}) − 1 = ` +
        `${yoyPct.toFixed(2)}% YoY → ${band.label}`,
    };
  }
}
