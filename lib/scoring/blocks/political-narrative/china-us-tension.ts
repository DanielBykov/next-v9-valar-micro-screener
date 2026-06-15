import { IndicatorScorer } from "@/lib/scoring/indicator-scorer";
import type {
  IndicatorExample,
  ScoreBand,
  ScoringInput,
  ScoringResult,
  SeriesInputSpec,
} from "@/lib/scoring/types";

/**
 * China–US Tension Index — 6.1
 *
 * Pre-scored manual series. The upstream daily.csv stores the final 1–5 score
 * (derived from the Davis-Liu-Sheng EPU-China proxy + documented escalation
 * episodes), so this scorer ingests the score directly and selects the matching
 * band purely for the label/interpretation. `numeric_descending`: rising
 * tension = low score.
 *
 * Source: Manual (policyuncertainty.com EPU-China proxy; research-scored)
 * Spec: docs_local/.../scoring-engine/block-6-political-narrative.md §6.1
 */
export class ChinaUsTensionScorer extends IndicatorScorer {
  readonly key = "china_us_tension";
  readonly name = "China–US Tension Index";
  readonly blockKey = "political_narrative";
  readonly unit = "score";
  // Spec weight 10% within Block 6.
  readonly weight = 10;
  readonly description =
    "Measure of US–China geopolitical and economic friction, proxied by the " +
    "Davis-Liu-Sheng EPU-China index and documented escalation episodes. " +
    "Pre-scored 1–5; rising tension lowers the score.";
  readonly formula = "score(EPU_CHINA_latest)";
  readonly formulaPretty = "score = EPU_CHINA_latest (pre-scored 1–5)";
  readonly inputs: SeriesInputSpec[] = [
    { seriesId: "EPU_CHINA", lookbackDays: 60, required: true, source: "manual" },
  ];
  readonly bands: ScoreBand[] = [
    {
      score: 1,
      label: "Crisis-Level Tensions",
      rangeLabel: "1",
      test: (v) => v === 1,
      interpretation: "Crisis-level tensions; sanctions/military risk; severe risk-off.",
    },
    {
      score: 2,
      label: "Elevated Friction",
      rangeLabel: "2",
      test: (v) => v === 2,
      interpretation: "Elevated friction; tariff/policy battles in progress.",
    },
    {
      score: 3,
      label: "Background Tension",
      rangeLabel: "3",
      test: (v) => v === 3,
      interpretation: "Normal background tension; no acute escalation.",
    },
    {
      score: 4,
      label: "De-escalation",
      rangeLabel: "4",
      test: (v) => v === 4,
      interpretation: "Quiet period; de-escalation phase.",
    },
    {
      score: 5,
      label: "Engagement / Detente",
      rangeLabel: "5",
      test: (v) => v === 5,
      interpretation: "Active engagement / detente; minimal friction (historically rare).",
    },
  ];
  readonly examples: IndicatorExample[] = [
    { description: "2018 trade-war peak", inputs: { EPU_CHINA: 1 }, expectedScore: 1 },
    { description: "2025 tariff friction", inputs: { EPU_CHINA: 2 }, expectedScore: 2 },
    { description: "Normal background", inputs: { EPU_CHINA: 3 }, expectedScore: 3 },
  ];

  compute(input: ScoringInput): ScoringResult {
    const obs = this.latest(input, "EPU_CHINA");
    if (!obs) {
      return this.missingInputs("Missing EPU_CHINA manual input in lookback window");
    }

    const value = Number(obs.value);
    if (!Number.isFinite(value)) {
      return this.missingInputs(`Invalid EPU_CHINA value: ${obs.value}`);
    }

    const band = this.band(value);
    return {
      indicatorKey: this.key,
      score: band.score,
      rawValue: value,
      bandLabel: band.label,
      interpretation: band.interpretation,
      inputsUsed: [{ seriesId: "EPU_CHINA", date: obs.observationDate, value }],
      formulaTrace: `EPU_CHINA (${obs.observationDate}) = ${value} → ${band.label}`,
    };
  }
}
