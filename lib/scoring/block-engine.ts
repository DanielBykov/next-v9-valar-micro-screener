import type { BlockDefinition, BlockResult, ScoringInput } from "@/lib/scoring/types";
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
}
