import { IndicatorScorer } from "@/lib/scoring/indicator-scorer";
import type {
  IndicatorExample,
  ScoreBand,
  ScoringInput,
  ScoringResult,
  SeriesInputSpec,
} from "@/lib/scoring/types";

/**
 * Global Manufacturing PMI — JP Morgan / S&P Global composite
 *
 * Manual monthly entry — S&P Global gates historical series behind a paid
 * subscription. Analyst enters the headline number from the free monthly
 * press release via /admin/manual-inputs on release day.
 *
 * PMI is the best read on world growth before GDP prints. >50 = expansion,
 * <50 = contraction.
 *
 * Source: Manual (S&P Global / JPMorgan press release)
 * Spec: docs_local/.../scoring-engine/block-4-commodities-global.md §4.5
 */
export class GlobalPmiScorer extends IndicatorScorer {
  readonly key = "global_pmi";
  readonly name = "Global Manufacturing PMI";
  readonly blockKey = "commodities_global";
  readonly unit = "index";
  // Spec weight 15% within Block 4.
  readonly weight = 15;
  readonly description =
    "JPMorgan/S&P Global Manufacturing PMI — composite of national PMIs. " +
    "Best leading read on world growth before GDP prints. The 50 line " +
    "separates expansion from contraction; the rubric centres on 49–51 stall speed.";
  readonly formula = "score(GLOBAL_MFG_PMI_latest)";
  readonly formulaPretty = "score = band(GLOBAL_MFG_PMI_latest)";
  readonly inputs: SeriesInputSpec[] = [
    { seriesId: "GLOBAL_MFG_PMI", lookbackDays: 60, required: true, source: "manual" },
  ];
  readonly bands: ScoreBand[] = [
    {
      score: 1,
      label: "Deep Contraction",
      rangeLabel: "< 45",
      test: (v) => v < 45,
      interpretation: "Recession-level global manufacturing contraction.",
    },
    {
      score: 2,
      label: "Manufacturing Recession",
      rangeLabel: "45 – 48.9",
      test: (v) => v >= 45 && v < 49,
      interpretation: "Sub-50 readings; manufacturing in recession.",
    },
    {
      score: 3,
      label: "Stall Speed",
      rangeLabel: "49 – 51",
      test: (v) => v >= 49 && v <= 51,
      interpretation: "Around the expansion/contraction line; no extreme signal.",
    },
    {
      score: 4,
      label: "Modest Expansion",
      rangeLabel: "51.1 – 54",
      test: (v) => v > 51 && v <= 54,
      interpretation: "Solid expansion; growth narrative supported.",
    },
    {
      score: 5,
      label: "Strong Expansion",
      rangeLabel: "> 54",
      test: (v) => v > 54,
      interpretation: "Cyclical boom in global manufacturing; broad risk-on backdrop.",
    },
  ];
  readonly examples: IndicatorExample[] = [
    { description: "Apr 2020 COVID trough",   inputs: { GLOBAL_MFG_PMI: 39.6 }, expectedScore: 1 },
    { description: "Late 2022 slowdown",      inputs: { GLOBAL_MFG_PMI: 47.5 }, expectedScore: 2 },
    { description: "2024 stall",              inputs: { GLOBAL_MFG_PMI: 50.4 }, expectedScore: 3 },
    { description: "Early 2021 recovery",     inputs: { GLOBAL_MFG_PMI: 53.0 }, expectedScore: 4 },
    { description: "Post-COVID reflation pk", inputs: { GLOBAL_MFG_PMI: 56.0 }, expectedScore: 5 },
  ];

  compute(input: ScoringInput): ScoringResult {
    const obs = this.latest(input, "GLOBAL_MFG_PMI");
    if (!obs) return this.missingInputs("Missing GLOBAL_MFG_PMI manual input in lookback window");

    const value = Number(obs.value);
    if (!Number.isFinite(value)) {
      return this.missingInputs(`Invalid GLOBAL_MFG_PMI value: ${obs.value}`);
    }

    const band = this.band(value);
    return {
      indicatorKey: this.key,
      score: band.score,
      rawValue: value,
      bandLabel: band.label,
      interpretation: band.interpretation,
      inputsUsed: [{ seriesId: "GLOBAL_MFG_PMI", date: obs.observationDate, value }],
      formulaTrace: `GLOBAL_MFG_PMI (${obs.observationDate}) = ${value.toFixed(1)} → ${band.label}`,
    };
  }
}
