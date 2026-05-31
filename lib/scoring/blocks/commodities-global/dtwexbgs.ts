import { IndicatorScorer } from "@/lib/scoring/indicator-scorer";
import type {
  IndicatorExample,
  ScoreBand,
  ScoringInput,
  ScoringResult,
  SeriesInputSpec,
} from "@/lib/scoring/types";

/**
 * DTWEXBGS — Nominal Broad U.S. Dollar Index
 *
 * Latest level of the FRED Nominal Broad USD Index — a trade-weighted basket
 * of ~26 currencies including CNY. Replaces ICE DXY (6 currencies, 1973
 * weights, no CNY); thresholds calibrated for the DTWEXBGS scale (post-2010
 * equilibrium ~115–120).
 *
 * Higher USD = global liquidity tightening = EM stress = lower score.
 *
 * Source: FRED DTWEXBGS (https://fred.stlouisfed.org/series/DTWEXBGS)
 * Spec: docs_local/.../scoring-engine/block-4-commodities-global.md §4.3
 */
export class DtwexbgsScorer extends IndicatorScorer {
  readonly key = "dtwexbgs";
  readonly name = "DTWEXBGS (Nominal Broad USD)";
  readonly blockKey = "commodities_global";
  readonly unit = "index";
  // Spec weight 30% within Block 4 — highest single weight in the block.
  readonly weight = 30;
  readonly description =
    "Nominal Broad U.S. Dollar Index — trade-weighted basket of ~26 currencies " +
    "including CNY. Dominant global liquidity gauge: strong USD tightens " +
    "global financial conditions, pressures EM, weighs on commodities.";
  readonly formula = "score(DTWEXBGS_latest)";
  readonly formulaPretty = "score = band(DTWEXBGS_latest)";
  readonly inputs: SeriesInputSpec[] = [
    { seriesId: "DTWEXBGS", lookbackDays: 14, required: true },
  ];
  readonly bands: ScoreBand[] = [
    {
      score: 1,
      label: "Crisis-Level Strong USD",
      rangeLabel: "> 128",
      test: (v) => v > 128,
      interpretation: "Severe EM stress; global liquidity squeeze; risk-off transmission.",
    },
    {
      score: 2,
      label: "Strong USD",
      rangeLabel: "122 – 128",
      test: (v) => v >= 122 && v <= 128,
      interpretation: "Global tightening; commodity and EM headwinds.",
    },
    {
      score: 3,
      label: "Mid-Cycle USD",
      rangeLabel: "115 – 121",
      test: (v) => v >= 115 && v < 122,
      interpretation: "Post-2015 equilibrium range; no extreme signal.",
    },
    {
      score: 4,
      label: "Weak USD",
      rangeLabel: "108 – 114",
      test: (v) => v >= 108 && v < 115,
      interpretation: "EM and commodity tailwind; easing global financial conditions.",
    },
    {
      score: 5,
      label: "Very Weak USD",
      rangeLabel: "< 108",
      test: (v) => v < 108,
      interpretation: "Maximum global liquidity; broad risk-on across geographies.",
    },
  ];
  readonly examples: IndicatorExample[] = [
    { description: "Sep 2022 multi-decade peak", inputs: { DTWEXBGS: 128.5 }, expectedScore: 1 },
    { description: "Early 2025 firm USD",        inputs: { DTWEXBGS: 124.0 }, expectedScore: 2 },
    { description: "Typical 2024 mid-cycle",     inputs: { DTWEXBGS: 118.0 }, expectedScore: 3 },
    { description: "2021 reflation weakness",    inputs: { DTWEXBGS: 111.0 }, expectedScore: 4 },
    { description: "2014 pre-taper-tantrum",     inputs: { DTWEXBGS: 105.0 }, expectedScore: 5 },
  ];

  compute(input: ScoringInput): ScoringResult {
    const obs = this.latest(input, "DTWEXBGS");
    if (!obs) return this.missingInputs("Missing DTWEXBGS observation in lookback window");

    const value = Number(obs.value);
    if (!Number.isFinite(value)) {
      return this.missingInputs(`Invalid DTWEXBGS value: ${obs.value}`);
    }

    const band = this.band(value);
    return {
      indicatorKey: this.key,
      score: band.score,
      rawValue: value,
      bandLabel: band.label,
      interpretation: band.interpretation,
      inputsUsed: [{ seriesId: "DTWEXBGS", date: obs.observationDate, value }],
      formulaTrace: `DTWEXBGS (${obs.observationDate}) = ${value.toFixed(2)} → ${band.label}`,
    };
  }
}
