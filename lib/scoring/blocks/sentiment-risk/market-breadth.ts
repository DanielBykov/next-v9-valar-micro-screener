import { IndicatorScorer } from "@/lib/scoring/indicator-scorer";
import type {
  IndicatorExample,
  ScoreBand,
  ScoringInput,
  ScoringResult,
  SeriesInputSpec,
} from "@/lib/scoring/types";

const BREADTH_SERIES = "S5TH_PCT_ABOVE_200DMA";

/**
 * Market Breadth — % of S&P 500 members above their 200-day moving average
 *
 * Direct rally-quality gauge: how many stocks are actually participating?
 * Unlike the other Block 3 indicators, breadth is NOT contrarian — high
 * participation is a genuinely bullish read (broad-based advance), and
 * sub-20% breadth marks washouts that historically precede rallies but
 * concurrent breadth alone doesn't flip bearish.
 *
 * Source: manual (indicator_manual_inputs, series_id = S5TH_PCT_ABOVE_200DMA)
 *         Sourced from Barchart S5TH daily CSV, ingested via manual pipeline.
 * Spec:   docs_local/.../scoring-engine/block-3-sentiment-risk.md §3.5
 */
export class MarketBreadthScorer extends IndicatorScorer {
  readonly key = "market_breadth";
  readonly name = "Market Breadth";
  readonly blockKey = "sentiment_risk";
  readonly unit = "% above 200DMA";
  // Spec weight 20% within Block 3.
  readonly weight = 20;
  readonly description =
    "Percentage of S&P 500 constituents trading above their 200-day moving " +
    "average. Direct read on rally participation. <20% is washout territory; " +
    ">75% is a healthy broad-based advance.";
  readonly formula = "score(S5TH_PCT_ABOVE_200DMA_latest)";
  readonly formulaPretty = "score = band(pct_above_200dma_latest)";
  readonly inputs: SeriesInputSpec[] = [
    { seriesId: BREADTH_SERIES, lookbackDays: 14, required: true, source: "manual" },
  ];
  readonly bands: ScoreBand[] = [
    {
      score: 1,
      label: "Washout",
      rangeLabel: "< 20%",
      test: (v) => v < 20,
      interpretation: "Breadth collapse; oversold territory historically.",
    },
    {
      score: 2,
      label: "Weak",
      rangeLabel: "20% – 40%",
      test: (v) => v >= 20 && v < 40,
      interpretation: "Narrow participation; rally quality poor.",
    },
    {
      score: 3,
      label: "Neutral",
      rangeLabel: "40% – 60%",
      test: (v) => v >= 40 && v < 60,
      interpretation: "Mixed participation; no clear signal.",
    },
    {
      score: 4,
      label: "Healthy",
      rangeLabel: "60% – 75%",
      test: (v) => v >= 60 && v < 75,
      interpretation: "Broad participation; rally is well-supported.",
    },
    {
      score: 5,
      label: "Broad Advance",
      rangeLabel: "> 75%",
      test: (v) => v >= 75,
      interpretation: "Strong broad-based advance; bull market in good health.",
    },
  ];
  readonly examples: IndicatorExample[] = [
    { description: "Mar 2020 crash",        inputs: { S5TH_PCT_ABOVE_200DMA: 10 }, expectedScore: 1 },
    { description: "Oct 2022 risk-off",     inputs: { S5TH_PCT_ABOVE_200DMA: 25 }, expectedScore: 2 },
    { description: "Mid-cycle rotation",    inputs: { S5TH_PCT_ABOVE_200DMA: 50 }, expectedScore: 3 },
    { description: "Healthy bull market",   inputs: { S5TH_PCT_ABOVE_200DMA: 68 }, expectedScore: 4 },
    { description: "Mid-2021 broad advance", inputs: { S5TH_PCT_ABOVE_200DMA: 85 }, expectedScore: 5 },
  ];

  compute(input: ScoringInput): ScoringResult {
    const obs = this.latest(input, BREADTH_SERIES);
    if (!obs) return this.missingInputs(`Missing ${BREADTH_SERIES} observation in lookback window`);

    const value = Number(obs.value);
    if (!Number.isFinite(value)) {
      return this.missingInputs(`Invalid ${BREADTH_SERIES} value: ${obs.value}`);
    }

    const band = this.band(value);
    return {
      indicatorKey: this.key,
      score: band.score,
      rawValue: value,
      bandLabel: band.label,
      interpretation: band.interpretation,
      inputsUsed: [{ seriesId: BREADTH_SERIES, date: obs.observationDate, value }],
      formulaTrace: `${BREADTH_SERIES} (${obs.observationDate}) = ${value.toFixed(1)}% → ${band.label}`,
    };
  }
}
