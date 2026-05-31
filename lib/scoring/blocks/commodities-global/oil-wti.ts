import { IndicatorScorer } from "@/lib/scoring/indicator-scorer";
import type {
  IndicatorExample,
  ScoreBand,
  ScoringInput,
  ScoringResult,
  SeriesInputSpec,
} from "@/lib/scoring/types";

/**
 * Oil WTI — Crude Oil West Texas Intermediate spot, USD per barrel
 *
 * Latest level of FRED DCOILWTICO. Oil is the canonical inflation accelerant
 * and growth tax: high oil feeds CPI energy and squeezes consumer
 * discretionary; very low oil eases inflation but can also signal demand
 * destruction (spec §4.2 — V1 documents this ambiguity in band 5
 * interpretation; no auto-override).
 *
 * Source: FRED DCOILWTICO (https://fred.stlouisfed.org/series/DCOILWTICO)
 * Spec: docs_local/.../scoring-engine/block-4-commodities-global.md §4.2
 */
export class OilWtiScorer extends IndicatorScorer {
  readonly key = "oil_wti";
  readonly name = "Oil (WTI)";
  readonly blockKey = "commodities_global";
  readonly unit = "USD/bbl";
  // Spec weight 20% within Block 4.
  readonly weight = 20;
  readonly description =
    "WTI crude oil spot price. Inflation accelerant + growth tax with " +
    "geopolitical transmission. Low oil = consumer tailwind, but extreme " +
    "lows can also signal demand destruction (cross-check with Copper/PMI).";
  readonly formula = "score(DCOILWTICO_latest)";
  readonly formulaPretty = "score = band(DCOILWTICO_latest)";
  readonly inputs: SeriesInputSpec[] = [
    { seriesId: "DCOILWTICO", lookbackDays: 14, required: true },
  ];
  readonly bands: ScoreBand[] = [
    {
      score: 1,
      label: "Energy Shock",
      rangeLabel: "> $110",
      test: (v) => v > 110,
      interpretation: "Severe inflation accelerant + growth tax; risk-off for equities.",
    },
    {
      score: 2,
      label: "Elevated",
      rangeLabel: "$90 – $110",
      test: (v) => v >= 90 && v <= 110,
      interpretation: "Pressures inflation and consumer discretionary spending.",
    },
    {
      score: 3,
      label: "Balanced",
      rangeLabel: "$70 – $89",
      test: (v) => v >= 70 && v < 90,
      interpretation: "Supports producers without crippling consumers; no extreme signal.",
    },
    {
      score: 4,
      label: "Consumer Tailwind",
      rangeLabel: "$55 – $69",
      test: (v) => v >= 55 && v < 70,
      interpretation: "Disinflation support; consumer discretionary boost.",
    },
    {
      score: 5,
      label: "Major Disinflation Boost",
      rangeLabel: "< $55",
      test: (v) => v < 55,
      interpretation:
        "Maximum disinflation tailwind — but verify against Copper (4.4) and " +
        "Global PMIs (4.5) to rule out demand-destruction (cheap oil as a " +
        "symptom of recession, not a cause of growth).",
    },
  ];
  readonly examples: IndicatorExample[] = [
    { description: "Mar 2022 post-invasion peak", inputs: { DCOILWTICO: 123.7 }, expectedScore: 1 },
    { description: "Late 2021 reflation",         inputs: { DCOILWTICO: 95.0 },  expectedScore: 2 },
    { description: "Typical 2024 range",          inputs: { DCOILWTICO: 78.0 },  expectedScore: 3 },
    { description: "Mid-2017 oversupply",         inputs: { DCOILWTICO: 60.0 },  expectedScore: 4 },
    { description: "Apr 2020 COVID collapse",     inputs: { DCOILWTICO: 20.0 },  expectedScore: 5 },
  ];

  compute(input: ScoringInput): ScoringResult {
    const obs = this.latest(input, "DCOILWTICO");
    if (!obs) return this.missingInputs("Missing DCOILWTICO observation in lookback window");

    const value = Number(obs.value);
    if (!Number.isFinite(value)) {
      return this.missingInputs(`Invalid DCOILWTICO value: ${obs.value}`);
    }

    const band = this.band(value);
    return {
      indicatorKey: this.key,
      score: band.score,
      rawValue: value,
      bandLabel: band.label,
      interpretation: band.interpretation,
      inputsUsed: [{ seriesId: "DCOILWTICO", date: obs.observationDate, value }],
      formulaTrace: `DCOILWTICO (${obs.observationDate}) = $${value.toFixed(2)} → ${band.label}`,
    };
  }
}
