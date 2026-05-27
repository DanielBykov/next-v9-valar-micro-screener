import { IndicatorScorer } from "@/lib/scoring/indicator-scorer";
import type {
  IndicatorExample,
  ScoreBand,
  ScoringInput,
  ScoringResult,
  SeriesInputSpec,
} from "@/lib/scoring/types";
import type { IndicatorObservation } from "@/shared/schema";

const NFP_CONSENSUS_SERIES = "NFP_CONSENSUS";
const PAYEMS_SERIES = "PAYEMS";

/**
 * NFP Surprise
 *
 *   nfp_actual_k = PAYEMS_latest − PAYEMS_prior_month   (already in thousands)
 *   surprise_k   = nfp_actual_k − NFP_CONSENSUS_latest
 *
 * The "surprise" is what moves markets on release day — actual vs the
 * consensus forecast. Consensus is not on FRED; analysts enter it via the
 * /admin/manual-inputs page on release day. The consensus observation_date
 * must match the PAYEMS release date (the first business day of the month
 * after the reporting month, in practice — but the scorer is permissive
 * and matches on the latest PAYEMS observation_date).
 *
 * Source: FRED PAYEMS + manual NFP_CONSENSUS
 * Spec: docs_local/.../scoring-engine/block-2-inflation-labor.md §2.4
 */
export class NfpSurpriseScorer extends IndicatorScorer {
  readonly key = "nfp_surprise";
  readonly name = "NFP Surprise";
  readonly blockKey = "inflation_labor";
  readonly unit = "k jobs";
  // Spec weight 10% within Block 2.
  readonly weight = 10;
  readonly description =
    "Non-Farm Payrolls actual minus consensus forecast, in thousands of jobs. " +
    "The surprise component drives the immediate market reaction; the absolute " +
    "NFP level alone is not scored. Consensus is entered manually each month.";
  readonly formula = "(PAYEMS_latest − PAYEMS_prior_month) − NFP_CONSENSUS_latest";
  readonly formulaPretty =
    "surprise_k = (PAYEMS_latest − PAYEMS_prior_month) − NFP_CONSENSUS_latest";
  readonly inputs: SeriesInputSpec[] = [
    { seriesId: PAYEMS_SERIES, lookbackDays: 90, required: true, source: "fred" },
    { seriesId: NFP_CONSENSUS_SERIES, lookbackDays: 90, required: true, source: "manual" },
  ];
  readonly bands: ScoreBand[] = [
    {
      score: 1,
      label: "Dramatic Shortfall",
      rangeLabel: "< -150k miss",
      test: (v) => v < -150,
      interpretation: "Recession fear spike; risk-off across equities and credit.",
    },
    {
      score: 2,
      label: "Meaningful Miss",
      rangeLabel: "-150k to -50k",
      test: (v) => v >= -150 && v < -50,
      interpretation: "Labor market weakening faster than expected; dovish for Fed.",
    },
    {
      score: 3,
      label: "In Line",
      rangeLabel: "-50k to +50k",
      test: (v) => v >= -50 && v <= 50,
      interpretation: "No surprise; market moves driven by other data.",
    },
    {
      score: 4,
      label: "Positive Surprise",
      rangeLabel: "+50k to +150k",
      test: (v) => v > 50 && v <= 150,
      interpretation: "Economy resilient; supportive for cyclicals.",
    },
    {
      score: 5,
      label: "Blowout",
      rangeLabel: "> +150k beat",
      test: (v) => v > 150,
      interpretation: "Very strong economy; bullish near-term, may delay Fed cuts.",
    },
  ];
  readonly examples: IndicatorExample[] = [
    { description: "Severe miss",   inputs: { surprise_k: -200 }, expectedScore: 1 },
    { description: "Mild miss",     inputs: { surprise_k: -75 },  expectedScore: 2 },
    { description: "On consensus",  inputs: { surprise_k: 10 },   expectedScore: 3 },
    { description: "Solid beat",    inputs: { surprise_k: 90 },   expectedScore: 4 },
    { description: "Blowout 2023",  inputs: { surprise_k: 250 },  expectedScore: 5 },
  ];

  compute(input: ScoringInput): ScoringResult {
    const payemsSeries = input.observations[PAYEMS_SERIES] ?? [];
    if (payemsSeries.length < 2) {
      return this.missingInputs("Need at least 2 PAYEMS observations to compute m/m delta");
    }
    const payemsLatest = payemsSeries[0];
    const payemsPrior = payemsSeries[1];

    const latestValue = Number(payemsLatest.value);
    const priorValue = Number(payemsPrior.value);
    if (!Number.isFinite(latestValue) || !Number.isFinite(priorValue)) {
      return this.missingInputs("Invalid PAYEMS value(s)");
    }

    const consensus = this.findConsensusFor(input, payemsLatest);
    if (!consensus) {
      return this.missingInputs(
        `Awaiting NFP consensus entry for ${payemsLatest.observationDate}. ` +
        `Enter it at /admin/manual-inputs (series NFP_CONSENSUS).`,
      );
    }
    const consensusValue = Number(consensus.value);
    if (!Number.isFinite(consensusValue)) {
      return this.missingInputs(`Invalid NFP_CONSENSUS value: ${consensus.value}`);
    }

    // PAYEMS is published in thousands of jobs, so the m/m delta is already in 'k'.
    const actualK = latestValue - priorValue;
    const surpriseK = actualK - consensusValue;
    const band = this.band(surpriseK);

    const sign = surpriseK >= 0 ? "+" : "";
    return {
      indicatorKey: this.key,
      score: band.score,
      rawValue: surpriseK,
      bandLabel: band.label,
      interpretation: band.interpretation,
      inputsUsed: [
        { seriesId: PAYEMS_SERIES, date: payemsLatest.observationDate, value: latestValue },
        { seriesId: PAYEMS_SERIES, date: payemsPrior.observationDate, value: priorValue },
        { seriesId: NFP_CONSENSUS_SERIES, date: consensus.observationDate, value: consensusValue },
      ],
      formulaTrace:
        `(PAYEMS ${payemsLatest.observationDate} − ${payemsPrior.observationDate} = ` +
        `${actualK >= 0 ? "+" : ""}${actualK.toFixed(0)}k) − ` +
        `consensus ${consensus.observationDate} (${consensusValue.toFixed(0)}k) = ` +
        `${sign}${surpriseK.toFixed(0)}k → ${band.label}`,
    };
  }

  /**
   * Pick the consensus value most appropriate for the latest PAYEMS print.
   * Prefer an entry whose observation_date matches the latest PAYEMS date
   * exactly (one row per release); fall back to the most recent prior entry.
   */
  private findConsensusFor(
    input: ScoringInput,
    payemsLatest: IndicatorObservation,
  ): IndicatorObservation | null {
    const series = input.observations[NFP_CONSENSUS_SERIES] ?? [];
    if (series.length === 0) return null;
    const exact = series.find((o) => o.observationDate === payemsLatest.observationDate);
    if (exact) return exact;
    // DESC-sorted: first entry on/before payemsLatest.
    for (const obs of series) {
      if (obs.observationDate <= payemsLatest.observationDate) return obs;
    }
    return null;
  }
}
