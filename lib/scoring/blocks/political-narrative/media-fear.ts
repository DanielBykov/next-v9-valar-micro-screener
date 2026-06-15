import { IndicatorScorer } from "@/lib/scoring/indicator-scorer";
import type {
  IndicatorExample,
  ScoreBand,
  ScoringInput,
  ScoringResult,
  SeriesInputSpec,
} from "@/lib/scoring/types";

/**
 * Media Fear Index — 6.4
 *
 * Daily GDELT TimelineTone for the query "financial market fear crisis
 * recession". The raw_tone.csv stores the daily average tone (roughly −20..+20;
 * negative = fearful). Banded in code from the raw tone — `numeric_descending`:
 * more negative tone = more fear = lower score. Thresholds calibrated from the
 * 2023–2026 distribution (see indicator README §Scoring thresholds).
 *
 * Source: Manual (GDELT Doc API TimelineTone; raw tone seeded as GDELT_FEAR_TONE)
 * Spec: docs_local/.../scoring-engine/block-6-political-narrative.md §6.4
 */
export class MediaFearScorer extends IndicatorScorer {
  readonly key = "media_fear";
  readonly name = "Media Fear Index";
  readonly blockKey = "political_narrative";
  readonly unit = "tone";
  // Spec weight 5% within Block 6 — noisiest, lowest-weight signal.
  readonly weight = 5;
  readonly description =
    "Daily GDELT average news tone for financial-fear coverage (negative = " +
    "fearful). Banded descending: more negative tone lowers the score. Captures " +
    "the narrative dimension of market fear.";
  readonly formula = "score(GDELT_FEAR_TONE_latest)";
  readonly formulaPretty = "score = band(GDELT_FEAR_TONE_latest)";
  readonly inputs: SeriesInputSpec[] = [
    { seriesId: "GDELT_FEAR_TONE", lookbackDays: 30, required: true, source: "manual" },
  ];
  readonly bands: ScoreBand[] = [
    {
      score: 1,
      label: "Crisis Fear",
      rangeLabel: "≤ −4.0",
      test: (v) => v <= -4.0,
      interpretation: "Multiple major outlets dominating with crisis language; panic narrative.",
    },
    {
      score: 2,
      label: "Elevated Fear",
      rangeLabel: "−4.0 to −2.5",
      test: (v) => v > -4.0 && v <= -2.5,
      interpretation: "Sustained negative tone across the financial press.",
    },
    {
      score: 3,
      label: "Normal",
      rangeLabel: "−2.5 to −1.0",
      test: (v) => v > -2.5 && v <= -1.0,
      interpretation: "Typical financial coverage baseline; mixed tone.",
    },
    {
      score: 4,
      label: "Calm",
      rangeLabel: "−1.0 to 0.0",
      test: (v) => v > -1.0 && v <= 0.0,
      interpretation: "Low-fear coverage; soft-landing / resilience narrative.",
    },
    {
      score: 5,
      label: "Optimistic",
      rangeLabel: "> 0.0",
      test: (v) => v > 0.0,
      interpretation: "Broadly positive tone; bull narrative dominant (historically rare).",
    },
  ];
  readonly examples: IndicatorExample[] = [
    { description: "Mar 2026 tariff peak", inputs: { GDELT_FEAR_TONE: -5.87 }, expectedScore: 1 },
    { description: "Elevated fear", inputs: { GDELT_FEAR_TONE: -3.1 }, expectedScore: 2 },
    { description: "Normal baseline", inputs: { GDELT_FEAR_TONE: -1.8 }, expectedScore: 3 },
    { description: "Calm coverage", inputs: { GDELT_FEAR_TONE: -0.5 }, expectedScore: 4 },
    { description: "Optimistic tone", inputs: { GDELT_FEAR_TONE: 0.4 }, expectedScore: 5 },
  ];

  compute(input: ScoringInput): ScoringResult {
    const obs = this.latest(input, "GDELT_FEAR_TONE");
    if (!obs) {
      return this.missingInputs("Missing GDELT_FEAR_TONE manual input in lookback window");
    }

    const value = Number(obs.value);
    if (!Number.isFinite(value)) {
      return this.missingInputs(`Invalid GDELT_FEAR_TONE value: ${obs.value}`);
    }

    const band = this.band(value);
    return {
      indicatorKey: this.key,
      score: band.score,
      rawValue: value,
      bandLabel: band.label,
      interpretation: band.interpretation,
      inputsUsed: [{ seriesId: "GDELT_FEAR_TONE", date: obs.observationDate, value }],
      formulaTrace: `GDELT_FEAR_TONE (${obs.observationDate}) = ${value.toFixed(2)} → ${band.label}`,
    };
  }
}
