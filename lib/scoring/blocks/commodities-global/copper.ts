import { IndicatorScorer } from "@/lib/scoring/indicator-scorer";
import type {
  IndicatorExample,
  ScoreBand,
  ScoringInput,
  ScoringResult,
  SeriesInputSpec,
} from "@/lib/scoring/types";

/**
 * Copper — Industrial demand proxy ("Dr Copper")
 *
 * FRED PCOPPUSDM publishes monthly LME averages in USD per metric ton.
 * The spec rubric is expressed in USD per pound (COMEX scale), so the
 * scorer converts MT → lb via `÷ 2204.6228` before banding.
 *
 * Spec band 5 (>$4.80/lb) is ambiguous — can be demand boom (bullish) OR
 * supply shock (bearish-for-inflation). V1 documents the cross-check in
 * the interpretation; no auto-override (mentor guidance — no override
 * engines in V1).
 *
 * Source: FRED PCOPPUSDM (https://fred.stlouisfed.org/series/PCOPPUSDM)
 * Spec: docs_local/.../scoring-engine/block-4-commodities-global.md §4.4
 */
const MT_PER_LB = 2204.6228;

export class CopperScorer extends IndicatorScorer {
  readonly key = "copper";
  readonly name = "Copper";
  readonly blockKey = "commodities_global";
  readonly unit = "USD/lb";
  // Spec weight 10% within Block 4.
  readonly weight = 10;
  readonly description =
    "LME copper average price, converted to USD per pound. Industrial demand " +
    "proxy that often leads PMIs. High copper can mean either demand boom or " +
    "supply shock — cross-check with Global PMIs at extremes.";
  readonly formula = "score(PCOPPUSDM_latest / 2204.6228)";
  readonly formulaPretty =
    "usd_per_lb = PCOPPUSDM_latest / 2204.6228; score = band(usd_per_lb)";
  readonly inputs: SeriesInputSpec[] = [
    { seriesId: "PCOPPUSDM", lookbackDays: 60, required: true },
  ];
  readonly bands: ScoreBand[] = [
    {
      score: 1,
      label: "Demand Collapse",
      rangeLabel: "< $3.00",
      test: (v) => v < 3.0,
      interpretation: "Industrial demand collapse; classic recession signal.",
    },
    {
      score: 2,
      label: "Soft Growth",
      rangeLabel: "$3.00 – $3.60",
      test: (v) => v >= 3.0 && v < 3.6,
      interpretation: "Soft global growth; manufacturing slowdown.",
    },
    {
      score: 3,
      label: "Normal Demand",
      rangeLabel: "$3.60 – $4.20",
      test: (v) => v >= 3.6 && v < 4.2,
      interpretation: "Normal industrial demand; no extreme signal.",
    },
    {
      score: 4,
      label: "Strong Growth",
      rangeLabel: "$4.20 – $4.80",
      test: (v) => v >= 4.2 && v <= 4.8,
      interpretation: "Strong global growth confirmed; expansion narrative intact.",
    },
    {
      score: 5,
      label: "Boom or Supply Shock",
      rangeLabel: "> $4.80",
      test: (v) => v > 4.8,
      interpretation:
        "Boom-level demand OR supply shock — verify against Global PMIs " +
        "(4.5) to disambiguate (PMI-confirmed boom vs supply-driven price spike).",
    },
  ];
  readonly examples: IndicatorExample[] = [
    { description: "2016 China-slowdown trough", inputs: { usd_per_lb: 2.10 }, expectedScore: 1 },
    { description: "Late 2022 weak growth",      inputs: { usd_per_lb: 3.40 }, expectedScore: 2 },
    { description: "Typical mid-cycle",          inputs: { usd_per_lb: 3.90 }, expectedScore: 3 },
    { description: "2021 reflation",             inputs: { usd_per_lb: 4.50 }, expectedScore: 4 },
    { description: "2024 AI/EV demand peak",     inputs: { usd_per_lb: 5.10 }, expectedScore: 5 },
  ];

  compute(input: ScoringInput): ScoringResult {
    const obs = this.latest(input, "PCOPPUSDM");
    if (!obs) return this.missingInputs("Missing PCOPPUSDM observation in lookback window");

    const usdPerMt = Number(obs.value);
    if (!Number.isFinite(usdPerMt)) {
      return this.missingInputs(`Invalid PCOPPUSDM value: ${obs.value}`);
    }

    const usdPerLb = usdPerMt / MT_PER_LB;
    const band = this.band(usdPerLb);
    return {
      indicatorKey: this.key,
      score: band.score,
      rawValue: usdPerLb,
      bandLabel: band.label,
      interpretation: band.interpretation,
      inputsUsed: [{ seriesId: "PCOPPUSDM", date: obs.observationDate, value: usdPerMt }],
      formulaTrace:
        `PCOPPUSDM (${obs.observationDate}) = $${usdPerMt.toFixed(2)}/MT → ` +
        `$${usdPerLb.toFixed(3)}/lb → ${band.label}`,
    };
  }
}
