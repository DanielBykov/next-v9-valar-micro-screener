import { IndicatorScorer } from "@/lib/scoring/indicator-scorer";
import type {
  IndicatorExample,
  ScoreBand,
  ScoringInput,
  ScoringResult,
  SeriesInputSpec,
} from "@/lib/scoring/types";

/**
 * Leading Economic Index (LEI) — 5.2
 *
 * Conference Board composite of 10 leading indicators, scored on its YoY %.
 *
 * Manual monthly entry — the Conference Board paywalls history. The analyst
 * enters the headline index via the source CSV; the build step computes YoY
 * (handling the 2016 rebase) and that pre-computed YoY % is seeded directly as
 * series CB_LEI_YOY. The scorer bands the YoY value — no in-code YoY derivation
 * (avoids the rebase discontinuity).
 *
 * Source: Manual (Conference Board press release / TradingEconomics)
 * Spec: docs_local/.../scoring-engine/block-5-business-cycle.md §5.2
 */
export class LeiYoyScorer extends IndicatorScorer {
  readonly key = "lei_yoy";
  readonly name = "Leading Economic Index (LEI)";
  readonly blockKey = "business_cycle";
  readonly unit = "% YoY";
  // Spec weight 25% within Block 5.
  readonly weight = 25;
  readonly description =
    "Conference Board Leading Economic Index, year-over-year %. A composite of " +
    "10 leading indicators designed to lead the cycle by ~6 months. Sustained " +
    "negative YoY historically signals recession risk.";
  readonly formula = "score(CB_LEI_YOY_latest)";
  readonly formulaPretty = "score = band(CB_LEI_YOY_latest)";
  readonly inputs: SeriesInputSpec[] = [
    { seriesId: "CB_LEI_YOY", lookbackDays: 60, required: true, source: "manual" },
  ];
  readonly bands: ScoreBand[] = [
    {
      score: 1,
      label: "Deep Recession Signal",
      rangeLabel: "< −6% YoY",
      test: (v) => v < -6,
      interpretation: "Deep recession signal; multi-month sustained decline; cycle bottoming or worse.",
    },
    {
      score: 2,
      label: "Significant Weakness",
      rangeLabel: "−6% to −2% YoY",
      test: (v) => v >= -6 && v < -2,
      interpretation: "Significant weakness; recession risk elevated.",
    },
    {
      score: 3,
      label: "Stall / Transition",
      rangeLabel: "−2% to +2% YoY",
      test: (v) => v >= -2 && v <= 2,
      interpretation: "Stall / transition; recovery or further deterioration possible.",
    },
    {
      score: 4,
      label: "Healthy Expansion",
      rangeLabel: "+2% to +5% YoY",
      test: (v) => v > 2 && v <= 5,
      interpretation: "Healthy expansion; cycle confirmed; leading indicators positive.",
    },
    {
      score: 5,
      label: "Strong Expansion",
      rangeLabel: "> +5% YoY",
      test: (v) => v > 5,
      interpretation: "Strong expansion; cycle accelerating; broad-based positive momentum.",
    },
  ];
  readonly examples: IndicatorExample[] = [
    { description: "2023 trough",        inputs: { CB_LEI_YOY: -8.85 }, expectedScore: 1 },
    { description: "Early 2026",         inputs: { CB_LEI_YOY: -2.79 }, expectedScore: 2 },
    { description: "Apr 2026 stabilise", inputs: { CB_LEI_YOY: -1.22 }, expectedScore: 3 },
    { description: "Mid expansion",      inputs: { CB_LEI_YOY: 3.5 },   expectedScore: 4 },
    { description: "Recovery boom",      inputs: { CB_LEI_YOY: 7.0 },   expectedScore: 5 },
  ];

  compute(input: ScoringInput): ScoringResult {
    const obs = this.latest(input, "CB_LEI_YOY");
    if (!obs) return this.missingInputs("Missing CB_LEI_YOY manual input in lookback window");

    const value = Number(obs.value);
    if (!Number.isFinite(value)) {
      return this.missingInputs(`Invalid CB_LEI_YOY value: ${obs.value}`);
    }

    const band = this.band(value);
    const sign = value >= 0 ? "+" : "";
    return {
      indicatorKey: this.key,
      score: band.score,
      rawValue: value,
      bandLabel: band.label,
      interpretation: band.interpretation,
      inputsUsed: [{ seriesId: "CB_LEI_YOY", date: obs.observationDate, value }],
      formulaTrace: `CB_LEI_YOY (${obs.observationDate}) = ${sign}${value.toFixed(2)}% → ${band.label}`,
    };
  }
}
