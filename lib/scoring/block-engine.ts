import type {
  BlockDefinition,
  BlockResult,
  ObservationsByseries,
  ScoringInput,
} from "@/lib/scoring/types";
import { blockAverageToScore, toIsoDate } from "@/lib/scoring/helpers";
import { loadObservationsForBlock } from "@/lib/scoring/observations-repo";

/**
 * Computes the score for a single block as of a given date.
 *
 * Runs every scorer in the block definition against the same observation
 * snapshot, averages the indicator scores, and resolves a regime label
 * from the block's regimeFor() function.
 */
export class BlockEngine {
  constructor(private readonly def: BlockDefinition) {}

  async scoreBlock(asOfDate: Date): Promise<BlockResult> {
    const observations = await loadObservationsForBlock(this.def, asOfDate);
    return this.scoreBlockWith(asOfDate, { asOfDate, observations });
  }

  /**
   * Variant that accepts a pre-loaded ScoringInput. Used by SnapshotEngine
   * when computing many dates in parallel against the same observations cache.
   *
   * blockAverage is the weighted average of indicator scores using each
   * scorer's `weight` (percent within block). If the weight sum is zero
   * (mis-configured block) we fall back to an unweighted mean to avoid NaN.
   */
  scoreBlockWith(asOfDate: Date, input: ScoringInput): BlockResult {
    const indicators = this.def.scorers.map((scorer) => scorer.compute(input));

    let blockAverage = 0;
    if (indicators.length > 0) {
      let weightSum = 0;
      let weightedScoreSum = 0;
      for (let i = 0; i < indicators.length; i++) {
        const w = this.def.scorers[i].weight;
        weightSum += w;
        weightedScoreSum += w * indicators[i].score;
      }
      if (weightSum > 0) {
        blockAverage = weightedScoreSum / weightSum;
      } else {
        blockAverage =
          indicators.reduce((sum, r) => sum + r.score, 0) / indicators.length;
      }
    }
    const blockScore = blockAverageToScore(blockAverage);

    return {
      blockKey: this.def.key,
      blockName: this.def.name,
      asOfDate: toIsoDate(asOfDate),
      blockWeight: this.def.weight,
      indicators,
      blockAverage,
      blockScore,
      regimeLabel: this.def.regimeFor(blockAverage),
    };
  }

  /**
   * Score the block across many dates using a single pre-loaded observations
   * payload covering the entire window.
   *
   * For each date we slice the DESC-sorted observation arrays to entries
   * with date <= asOfDate, then delegate to `scoreBlockWith`. Pure and
   * in-memory; no DB I/O. Powers the trend endpoint.
   *
   * Assumes `full` is DESC-sorted by observation_date (as returned by
   * `loadObservationsForBlockOverRange`).
   */
  scoreBlockRange(dates: Date[], full: ObservationsByseries): BlockResult[] {
    const seriesIds = Object.keys(full);
    return dates.map((asOfDate) => {
      const isoAsOf = toIsoDate(asOfDate);
      const filtered: ObservationsByseries = {};
      for (const seriesId of seriesIds) {
        const series = full[seriesId];
        // DESC-sorted: walk forward until we land on entries <= asOfDate.
        let i = 0;
        while (i < series.length && series[i].observationDate > isoAsOf) i++;
        filtered[seriesId] = i === 0 ? series : series.slice(i);
      }
      return this.scoreBlockWith(asOfDate, { asOfDate, observations: filtered });
    });
  }
}
