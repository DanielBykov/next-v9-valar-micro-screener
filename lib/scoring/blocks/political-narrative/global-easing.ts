import { IndicatorScorer } from "@/lib/scoring/indicator-scorer";
import type {
  IndicatorExample,
  ScoreBand,
  ScoringInput,
  ScoringResult,
  SeriesInputSpec,
} from "@/lib/scoring/types";

/**
 * Global Easing/Tightening — 6.6
 *
 * Pre-scored manual series. The upstream daily.csv stores the final 1–5 score
 * derived from the BIS central-bank diffusion index (% cutting − % hiking).
 * This scorer ingests the score directly. `numeric_ascending`: synchronised
 * easing = high score; synchronised tightening = low score.
 *
 * Placement note (spec §6.6 open question): mechanically a monetary signal that
 * could live in Block 1; kept in Block 6 for V1 to capture the *political
 * coordination* of monetary policy. Revisit post-MVP.
 *
 * Source: Manual (BIS Policy Rates; diffusion computed upstream)
 * Spec: docs_local/.../scoring-engine/block-6-political-narrative.md §6.6
 */
export class GlobalEasingScorer extends IndicatorScorer {
  readonly key = "global_easing";
  readonly name = "Global Easing/Tightening";
  readonly blockKey = "political_narrative";
  readonly unit = "score";
  // Spec weight 10% within Block 6.
  readonly weight = 10;
  readonly description =
    "Diffusion index measuring whether the world's major central banks are " +
    "collectively easing or tightening (% cutting − % hiking across ~39 CBs). " +
    "Pre-scored 1–5; synchronised easing raises the score.";
  readonly formula = "score(GLOBAL_EASING_latest)";
  readonly formulaPretty = "score = GLOBAL_EASING_latest (pre-scored 1–5)";
  readonly inputs: SeriesInputSpec[] = [
    { seriesId: "GLOBAL_EASING", lookbackDays: 60, required: true, source: "manual" },
  ];
  readonly bands: ScoreBand[] = [
    {
      score: 1,
      label: "Synchronised Tightening",
      rangeLabel: "1",
      test: (v) => v === 1,
      interpretation: "Synchronised global tightening; canonical recession setup; broad selloff risk.",
    },
    {
      score: 2,
      label: "Net Tightening",
      rangeLabel: "2",
      test: (v) => v === 2,
      interpretation: "More tightening than easing; restrictive global liquidity.",
    },
    {
      score: 3,
      label: "Mixed / Transitioning",
      rangeLabel: "3",
      test: (v) => v === 3,
      interpretation: "Mixed; cycles diverging or transitioning.",
    },
    {
      score: 4,
      label: "Net Easing",
      rangeLabel: "4",
      test: (v) => v === 4,
      interpretation: "Net easing; supportive of global liquidity and risk assets.",
    },
    {
      score: 5,
      label: "Synchronised Easing",
      rangeLabel: "5",
      test: (v) => v === 5,
      interpretation: "Synchronised easing; flood of global liquidity; max risk-on signal.",
    },
  ];
  readonly examples: IndicatorExample[] = [
    { description: "2022 global tightening", inputs: { GLOBAL_EASING: 1 }, expectedScore: 1 },
    { description: "2024 transitioning", inputs: { GLOBAL_EASING: 3 }, expectedScore: 3 },
    { description: "2020 COVID easing", inputs: { GLOBAL_EASING: 5 }, expectedScore: 5 },
  ];

  compute(input: ScoringInput): ScoringResult {
    const obs = this.latest(input, "GLOBAL_EASING");
    if (!obs) {
      return this.missingInputs("Missing GLOBAL_EASING manual input in lookback window");
    }

    const value = Number(obs.value);
    if (!Number.isFinite(value)) {
      return this.missingInputs(`Invalid GLOBAL_EASING value: ${obs.value}`);
    }

    const band = this.band(value);
    return {
      indicatorKey: this.key,
      score: band.score,
      rawValue: value,
      bandLabel: band.label,
      interpretation: band.interpretation,
      inputsUsed: [{ seriesId: "GLOBAL_EASING", date: obs.observationDate, value }],
      formulaTrace: `GLOBAL_EASING (${obs.observationDate}) = ${value} → ${band.label}`,
    };
  }
}
