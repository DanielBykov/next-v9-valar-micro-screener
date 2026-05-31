import { IndicatorScorer } from "@/lib/scoring/indicator-scorer";
import type {
  IndicatorExample,
  ScoreBand,
  ScoringInput,
  ScoringResult,
  SeriesInputSpec,
} from "@/lib/scoring/types";

/**
 * VIX (CBOE Volatility Index)
 *
 * Latest level of VIXCLS — the implied volatility of S&P 500 options over the
 * next 30 days. Mean-reverting. Block 3 scores current mood (not forward
 * returns): low VIX = calm = high score, high VIX = stress = low score.
 *
 * Source: FRED VIXCLS (https://fred.stlouisfed.org/series/VIXCLS)
 * Spec: docs_local/.../scoring-engine/block-3-sentiment-risk.md §3.1
 */
export class VixScorer extends IndicatorScorer {
  readonly key = "vix";
  readonly name = "VIX";
  readonly blockKey = "sentiment_risk";
  readonly unit = "index";
  // Spec weight 30% within Block 3.
  readonly weight = 30;
  readonly description =
    "Implied volatility of S&P 500 options over the next 30 days. The headline " +
    "market-stress gauge; mean-reverting. Sustained <13 = complacency, >35 = panic.";
  readonly formula = "score(VIXCLS_latest)";
  readonly formulaPretty = "score = band(VIXCLS_latest)";
  readonly inputs: SeriesInputSpec[] = [
    { seriesId: "VIXCLS", lookbackDays: 14, required: true },
  ];
  readonly bands: ScoreBand[] = [
    {
      score: 1,
      label: "Panic",
      rangeLabel: "> 35",
      test: (v) => v > 35,
      interpretation: "Crisis-level fear; capitulation territory.",
    },
    {
      score: 2,
      label: "Elevated Fear",
      rangeLabel: "25 – 35",
      test: (v) => v >= 25 && v <= 35,
      interpretation: "Risk-off positioning dominant; market stressed.",
    },
    {
      score: 3,
      label: "Normal",
      rangeLabel: "18 – 24.9",
      test: (v) => v >= 18 && v < 25,
      interpretation: "Average volatility regime; no extreme signals.",
    },
    {
      score: 4,
      label: "Calm",
      rangeLabel: "13 – 17.9",
      test: (v) => v >= 13 && v < 18,
      interpretation: "Below-average vol; supportive of risk assets.",
    },
    {
      score: 5,
      label: "Complacent",
      rangeLabel: "< 13",
      test: (v) => v < 13,
      interpretation: "Extreme calm; historically precedes vol spikes.",
    },
  ];
  readonly examples: IndicatorExample[] = [
    { description: "Mar 2020 COVID peak",   inputs: { VIXCLS: 82.7 }, expectedScore: 1 },
    { description: "Oct 2022 risk-off",     inputs: { VIXCLS: 31.6 }, expectedScore: 2 },
    { description: "Typical 2024 reading",  inputs: { VIXCLS: 19.5 }, expectedScore: 3 },
    { description: "2017 low-vol regime",   inputs: { VIXCLS: 14.0 }, expectedScore: 4 },
    { description: "Jan 2018 pre-Volmageddon", inputs: { VIXCLS: 11.0 }, expectedScore: 5 },
  ];

  compute(input: ScoringInput): ScoringResult {
    const obs = this.latest(input, "VIXCLS");
    if (!obs) return this.missingInputs("Missing VIXCLS observation in lookback window");

    const value = Number(obs.value);
    if (!Number.isFinite(value)) {
      return this.missingInputs(`Invalid VIXCLS value: ${obs.value}`);
    }

    const band = this.band(value);
    return {
      indicatorKey: this.key,
      score: band.score,
      rawValue: value,
      bandLabel: band.label,
      interpretation: band.interpretation,
      inputsUsed: [{ seriesId: "VIXCLS", date: obs.observationDate, value }],
      formulaTrace: `VIXCLS (${obs.observationDate}) = ${value.toFixed(2)} → ${band.label}`,
    };
  }
}
