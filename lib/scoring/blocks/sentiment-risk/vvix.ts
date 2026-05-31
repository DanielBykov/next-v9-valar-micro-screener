import { IndicatorScorer } from "@/lib/scoring/indicator-scorer";
import type {
  IndicatorExample,
  ScoreBand,
  ScoringInput,
  ScoringResult,
  SeriesInputSpec,
} from "@/lib/scoring/types";

const VVIX_SERIES = "VVIX";

/**
 * VVIX (Volatility of VIX, CBOE)
 *
 * Measures the implied volatility of VIX options — the "vol of vol". Often
 * leads VIX itself by 1–3 days during stress events because vol traders
 * hedge regime change before realized VIX spikes.
 *
 * Block 3 scores current mood (no inversion): elevated VVIX = stress = low
 * score; calm VVIX = complacency = high score. Bands taken from
 * block-3-sentiment-risk.md §3.6.
 *
 * Ingestion: not on FRED. Bulk-seeded into `indicator_observations` from
 * the CBOE historical CSV via `lib/scripts/seed-vvix.ts`, source = "CBOE".
 * The default SeriesInputSpec.source ("fred") routes the scorer through
 * the indicator_observations table regardless of the actual `source` column.
 *
 * Spec: docs_local/.../scoring-engine/block-3-sentiment-risk.md §3.6
 */
export class VvixScorer extends IndicatorScorer {
  readonly key = "vvix";
  readonly name = "VVIX";
  readonly blockKey = "sentiment_risk";
  readonly unit = "index";
  // Spec weight 10% within Block 3.
  readonly weight = 10;
  readonly description =
    "CBOE VVIX — the implied volatility of VIX options. The 'vol of vol' gauge. " +
    "Often leads VIX by 1–3 days because options-market participants hedge regime " +
    "change before realized VIX spikes.";
  readonly formula = "score(VVIX_latest)";
  readonly formulaPretty = "score = band(VVIX_latest)";
  readonly inputs: SeriesInputSpec[] = [
    { seriesId: VVIX_SERIES, lookbackDays: 14, required: true },
  ];
  readonly bands: ScoreBand[] = [
    {
      score: 1,
      label: "Panic Vol-of-Vol",
      rangeLabel: "> 140",
      test: (v) => v > 140,
      interpretation: "Extreme stress in the options market; regime change likely.",
    },
    {
      score: 2,
      label: "Elevated",
      rangeLabel: "110 – 140",
      test: (v) => v >= 110 && v <= 140,
      interpretation: "Heightened vol-hedging; VIX spike risk rising.",
    },
    {
      score: 3,
      label: "Normal",
      rangeLabel: "85 – 109",
      test: (v) => v >= 85 && v < 110,
      interpretation: "Average vol-of-vol regime; no signal.",
    },
    {
      score: 4,
      label: "Calm",
      rangeLabel: "70 – 84",
      test: (v) => v >= 70 && v < 85,
      interpretation: "Subdued vol-of-vol; supportive of risk-on.",
    },
    {
      score: 5,
      label: "Complacent",
      rangeLabel: "< 70",
      test: (v) => v < 70,
      interpretation: "Extreme complacency in vol space; historically precedes shocks.",
    },
  ];
  readonly examples: IndicatorExample[] = [
    { description: "Mar 2020 COVID",        inputs: { VVIX: 207 }, expectedScore: 1 },
    { description: "Aug 2024 vol spike",    inputs: { VVIX: 125 }, expectedScore: 2 },
    { description: "Typical 2024 reading",  inputs: { VVIX: 95 },  expectedScore: 3 },
    { description: "2017 low-vol regime",   inputs: { VVIX: 78 },  expectedScore: 4 },
    { description: "Mar 2017 complacency",  inputs: { VVIX: 68 },  expectedScore: 5 },
  ];

  compute(input: ScoringInput): ScoringResult {
    const obs = this.latest(input, VVIX_SERIES);
    if (!obs) return this.missingInputs("Missing VVIX observation in lookback window");

    const value = Number(obs.value);
    if (!Number.isFinite(value)) {
      return this.missingInputs(`Invalid VVIX value: ${obs.value}`);
    }

    const band = this.band(value);
    return {
      indicatorKey: this.key,
      score: band.score,
      rawValue: value,
      bandLabel: band.label,
      interpretation: band.interpretation,
      inputsUsed: [{ seriesId: VVIX_SERIES, date: obs.observationDate, value }],
      formulaTrace: `VVIX (${obs.observationDate}) = ${value.toFixed(2)} → ${band.label}`,
    };
  }
}
