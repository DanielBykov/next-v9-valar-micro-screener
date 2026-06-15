import { IndicatorScorer } from "@/lib/scoring/indicator-scorer";
import type {
  IndicatorExample,
  ScoreBand,
  ScoringInput,
  ScoringResult,
  SeriesInputSpec,
} from "@/lib/scoring/types";

/**
 * Geopolitical Risk Index (GPR) — 6.3
 *
 * Pre-scored manual series. The upstream daily.csv stores the final 1–5 score
 * derived from the Caldara-Iacoviello GPR index level (NOT FRED; manual XLS
 * download). This scorer ingests the score directly. `numeric_descending`:
 * high GPR (war-level risk) = low score. The cleanest single signal in Block 6.
 *
 * Source: Manual (matteoiacoviello.com GPR monthly export)
 * Spec: docs_local/.../scoring-engine/block-6-political-narrative.md §6.3
 */
export class GeopoliticalRiskScorer extends IndicatorScorer {
  readonly key = "geopolitical_risk";
  readonly name = "Geopolitical Risk Index (GPR)";
  readonly blockKey = "political_narrative";
  readonly unit = "score";
  // Spec weight 40% within Block 6 — the dominant, highest-quality signal.
  readonly weight = 40;
  readonly description =
    "Caldara-Iacoviello Geopolitical Risk Index — share of articles in 10 " +
    "major newspapers discussing geopolitical risk events. Pre-scored 1–5; " +
    "war-level risk lowers the score.";
  readonly formula = "score(GPR_MONTHLY_latest)";
  readonly formulaPretty = "score = GPR_MONTHLY_latest (pre-scored 1–5)";
  readonly inputs: SeriesInputSpec[] = [
    { seriesId: "GPR_MONTHLY", lookbackDays: 60, required: true, source: "manual" },
  ];
  readonly bands: ScoreBand[] = [
    {
      score: 1,
      label: "War-Level Risk",
      rangeLabel: "1",
      test: (v) => v === 1,
      interpretation: "War-level risk; major conflict underway (9/11, 2003 Iraq, 2022 Ukraine).",
    },
    {
      score: 2,
      label: "Elevated Risk",
      rangeLabel: "2",
      test: (v) => v === 2,
      interpretation: "Elevated risk; significant tensions or active proxy conflicts.",
    },
    {
      score: 3,
      label: "Background Noise",
      rangeLabel: "3",
      test: (v) => v === 3,
      interpretation: "Background geopolitical noise; normal state.",
    },
    {
      score: 4,
      label: "Calm Period",
      rangeLabel: "4",
      test: (v) => v === 4,
      interpretation: "Calm period; few active hot spots.",
    },
    {
      score: 5,
      label: "Unusual Calm",
      rangeLabel: "5",
      test: (v) => v === 5,
      interpretation: "Unusual calm; peaceful global environment (historically rare).",
    },
  ];
  readonly examples: IndicatorExample[] = [
    { description: "Mar 2026 spike", inputs: { GPR_MONTHLY: 1 }, expectedScore: 1 },
    { description: "Israel-Hamas elevated", inputs: { GPR_MONTHLY: 2 }, expectedScore: 2 },
    { description: "Normal state", inputs: { GPR_MONTHLY: 3 }, expectedScore: 3 },
  ];

  compute(input: ScoringInput): ScoringResult {
    const obs = this.latest(input, "GPR_MONTHLY");
    if (!obs) {
      return this.missingInputs("Missing GPR_MONTHLY manual input in lookback window");
    }

    const value = Number(obs.value);
    if (!Number.isFinite(value)) {
      return this.missingInputs(`Invalid GPR_MONTHLY value: ${obs.value}`);
    }

    const band = this.band(value);
    return {
      indicatorKey: this.key,
      score: band.score,
      rawValue: value,
      bandLabel: band.label,
      interpretation: band.interpretation,
      inputsUsed: [{ seriesId: "GPR_MONTHLY", date: obs.observationDate, value }],
      formulaTrace: `GPR_MONTHLY (${obs.observationDate}) = ${value} → ${band.label}`,
    };
  }
}
