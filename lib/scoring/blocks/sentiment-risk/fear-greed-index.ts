import { IndicatorScorer } from "@/lib/scoring/indicator-scorer";
import type {
  IndicatorExample,
  ScoreBand,
  ScoringInput,
  ScoringResult,
  SeriesInputSpec,
} from "@/lib/scoring/types";

const FNG_SERIES = "FEAR_GREED_INDEX";

/**
 * Fear & Greed Index (CNN composite, 0–100)
 *
 * CNN's 7-input market-mood composite. 0 = extreme fear, 100 = extreme greed.
 * Block 3 scores current mood (no inversion): 0–20 = panic → score 1,
 * 81–100 = euphoria → score 5.
 *
 * Known overlap: F&G's sub-indicators include VIX (3.1) and Put/Call (3.2)
 * already counted in this block. Spec keeps F&G at 5% weight to limit
 * double-counting; see block-3-sentiment-risk.md open question on dropping it.
 *
 * Source: manual (indicator_manual_inputs, series_id = FEAR_GREED_INDEX)
 *         Ingested daily from CNN's public JSON via the manual CSV pipeline.
 * Spec:   docs_local/.../scoring-engine/block-3-sentiment-risk.md §3.3
 */
export class FearGreedIndexScorer extends IndicatorScorer {
  readonly key = "fear_greed_index";
  readonly name = "Fear & Greed Index";
  readonly blockKey = "sentiment_risk";
  readonly unit = "index (0–100)";
  // Spec weight 5% within Block 3 (kept low to limit double-counting).
  readonly weight = 5;
  readonly description =
    "CNN's market sentiment composite (0 = extreme fear, 100 = extreme greed). " +
    "Aggregates 7 inputs including VIX, breadth, junk-bond demand, momentum. " +
    "Low weight here because several sub-components are already scored separately in this block.";
  readonly formula = "score(FEAR_GREED_INDEX_latest)";
  readonly formulaPretty = "score = band(FEAR_GREED_INDEX_latest)";
  readonly inputs: SeriesInputSpec[] = [
    { seriesId: FNG_SERIES, lookbackDays: 14, required: true, source: "manual" },
  ];
  readonly bands: ScoreBand[] = [
    {
      score: 1,
      label: "Extreme Fear",
      rangeLabel: "0 – 20",
      test: (v) => v >= 0 && v <= 20,
      interpretation: "Capitulation-level fear; contrarian buy zone historically.",
    },
    {
      score: 2,
      label: "Fear",
      rangeLabel: "21 – 40",
      test: (v) => v > 20 && v <= 40,
      interpretation: "Bearish bias dominant; cautious positioning warranted.",
    },
    {
      score: 3,
      label: "Neutral",
      rangeLabel: "41 – 60",
      test: (v) => v > 40 && v <= 60,
      interpretation: "Balanced mood; sentiment is not driving the tape.",
    },
    {
      score: 4,
      label: "Greed",
      rangeLabel: "61 – 80",
      test: (v) => v > 60 && v <= 80,
      interpretation: "Bullish bias dominant; risk appetite healthy.",
    },
    {
      score: 5,
      label: "Extreme Greed",
      rangeLabel: "81 – 100",
      test: (v) => v > 80 && v <= 100,
      interpretation: "Euphoric positioning; contrarian sell warning.",
    },
  ];
  readonly examples: IndicatorExample[] = [
    { description: "Mar 2020 panic",       inputs: { FEAR_GREED_INDEX: 8 },  expectedScore: 1 },
    { description: "Oct 2022 risk-off",    inputs: { FEAR_GREED_INDEX: 30 }, expectedScore: 2 },
    { description: "Mid-2024 mixed",       inputs: { FEAR_GREED_INDEX: 52 }, expectedScore: 3 },
    { description: "2021 reopening rally", inputs: { FEAR_GREED_INDEX: 72 }, expectedScore: 4 },
    { description: "Jan 2018 euphoria",    inputs: { FEAR_GREED_INDEX: 90 }, expectedScore: 5 },
  ];

  compute(input: ScoringInput): ScoringResult {
    const obs = this.latest(input, FNG_SERIES);
    if (!obs) return this.missingInputs("Missing FEAR_GREED_INDEX observation in lookback window");

    const value = Number(obs.value);
    if (!Number.isFinite(value)) {
      return this.missingInputs(`Invalid FEAR_GREED_INDEX value: ${obs.value}`);
    }

    const band = this.band(value);
    return {
      indicatorKey: this.key,
      score: band.score,
      rawValue: value,
      bandLabel: band.label,
      interpretation: band.interpretation,
      inputsUsed: [{ seriesId: FNG_SERIES, date: obs.observationDate, value }],
      formulaTrace: `FEAR_GREED_INDEX (${obs.observationDate}) = ${value.toFixed(1)} → ${band.label}`,
    };
  }
}
