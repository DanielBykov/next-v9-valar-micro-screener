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
   */
  scoreBlockWith(asOfDate: Date, input: ScoringInput): BlockResult {
    const indicators = this.def.scorers.map((scorer) => scorer.compute(input));

    const blockAverage = indicators.length
      ? indicators.reduce((sum, r) => sum + r.score, 0) / indicators.length
      : 0;
    const blockScore = blockAverageToScore(blockAverage);

    return {
      blockKey: this.def.key,
      blockName: this.def.name,
      asOfDate: toIsoDate(asOfDate),
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
