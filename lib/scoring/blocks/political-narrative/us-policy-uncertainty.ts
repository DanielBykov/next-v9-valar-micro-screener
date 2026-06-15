import { IndicatorScorer } from "@/lib/scoring/indicator-scorer";
import type {
  IndicatorExample,
  ScoreBand,
  ScoringInput,
  ScoringResult,
  SeriesInputSpec,
} from "@/lib/scoring/types";

/**
 * Policy Conflict Indicator (US EPU) — 6.2
 *
 * FRED series USEPUINDXM (Baker-Bloom-Davis US Economic Policy Uncertainty
 * Index, monthly index level). Banded in code from the raw index level —
 * `numeric_descending`: high uncertainty = low score. The only data-driven
 * FRED feed in Block 6.
 *
 * Source: FRED USEPUINDXM (free, no key)
 * Spec: docs_local/.../scoring-engine/block-6-political-narrative.md §6.2
 */
export class UsPolicyUncertaintyScorer extends IndicatorScorer {
  readonly key = "us_policy_uncertainty";
  readonly name = "Policy Conflict (US EPU)";
  readonly blockKey = "political_narrative";
  readonly unit = "index";
  // Spec weight 25% within Block 6.
  readonly weight = 25;
  readonly description =
    "US Economic Policy Uncertainty Index (Baker-Bloom-Davis) — counts " +
    "newspaper coverage of policy uncertainty, expiring tax provisions, and " +
    "forecaster disagreement. Banded descending: high uncertainty lowers the score.";
  readonly formula = "score(USEPUINDXM_latest)";
  readonly formulaPretty = "score = band(USEPUINDXM_latest)";
  readonly inputs: SeriesInputSpec[] = [
    { seriesId: "USEPUINDXM", lookbackDays: 90, required: true },
  ];
  readonly bands: ScoreBand[] = [
    {
      score: 1,
      label: "Extreme Uncertainty",
      rangeLabel: "> 300",
      test: (v) => v > 300,
      interpretation: "Extreme policy uncertainty; crisis-level (2020 COVID; 2008 GFC); investment paralysis.",
    },
    {
      score: 2,
      label: "Elevated Uncertainty",
      rangeLabel: "200 – 300",
      test: (v) => v > 200 && v <= 300,
      interpretation: "Elevated uncertainty; policy battles dominate news flow.",
    },
    {
      score: 3,
      label: "Normal",
      rangeLabel: "100 – 199",
      test: (v) => v >= 100 && v <= 200,
      interpretation: "Normal level; routine policy debates.",
    },
    {
      score: 4,
      label: "Calm Policy Environment",
      rangeLabel: "75 – 99",
      test: (v) => v >= 75 && v < 100,
      interpretation: "Calm policy environment; supportive of business planning.",
    },
    {
      score: 5,
      label: "Unusually Low",
      rangeLabel: "< 75",
      test: (v) => v < 75,
      interpretation: "Unusually low uncertainty; predictable policy regime (historically rare).",
    },
  ];
  readonly examples: IndicatorExample[] = [
    { description: "2020 COVID all-time high", inputs: { USEPUINDXM: 350 }, expectedScore: 1 },
    { description: "Debt-ceiling stress", inputs: { USEPUINDXM: 240 }, expectedScore: 2 },
    { description: "Routine policy debate", inputs: { USEPUINDXM: 130 }, expectedScore: 3 },
    { description: "Calm environment", inputs: { USEPUINDXM: 85 }, expectedScore: 4 },
    { description: "Unusually predictable", inputs: { USEPUINDXM: 60 }, expectedScore: 5 },
  ];

  compute(input: ScoringInput): ScoringResult {
    const obs = this.latest(input, "USEPUINDXM");
    if (!obs) {
      return this.missingInputs("Missing USEPUINDXM observation in lookback window");
    }

    const value = Number(obs.value);
    if (!Number.isFinite(value)) {
      return this.missingInputs(`Invalid USEPUINDXM value: ${obs.value}`);
    }

    const band = this.band(value);
    return {
      indicatorKey: this.key,
      score: band.score,
      rawValue: value,
      bandLabel: band.label,
      interpretation: band.interpretation,
      inputsUsed: [{ seriesId: "USEPUINDXM", date: obs.observationDate, value }],
      formulaTrace: `USEPUINDXM (${obs.observationDate}) = ${value.toFixed(1)} → ${band.label}`,
    };
  }
}
