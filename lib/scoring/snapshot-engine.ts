import { BlockEngine } from "@/lib/scoring/block-engine";
import { regimeForTotalScore, toIsoDate } from "@/lib/scoring/helpers";
import { loadObservationsForBlockOverRange } from "@/lib/scoring/observations-repo";
import type { BlockDefinition, BlockResult, SnapshotResult } from "@/lib/scoring/types";

/**
 * Top-level orchestrator. Runs every block in the registry for a given date,
 * sums their 0–20 scores into a 0–120 total, and resolves a top-level regime.
 *
 * Engine is pure: same observations + same registry → same result.
 * Nothing is written to the database.
 */
export class SnapshotEngine {
  constructor(private readonly registry: BlockDefinition[]) {}

  async compute(asOfDate: Date): Promise<SnapshotResult> {
    const blocks = await Promise.all(
      this.registry
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((def) => new BlockEngine(def).scoreBlock(asOfDate)),
    );

    const totalScore = blocks.reduce((sum, b) => sum + b.blockScore, 0);

    return {
      asOfDate: toIsoDate(asOfDate),
      blocks,
      totalScore,
      regime: regimeForTotalScore(totalScore),
      computedAt: new Date().toISOString(),
    };
  }

  /**
   * Compute many dates in parallel. Used for trend lines.
   * Each date independently loads its observation window; if perf becomes
   * an issue, a shared observations cache can be introduced here.
   */
  async computeRange(dates: Date[]): Promise<SnapshotResult[]> {
    return Promise.all(dates.map((d) => this.compute(d)));
  }

  /**
   * Compute full snapshots across many dates using a single shared
   * observation window per block. For each block we load the entire
   * [first, last] window once (loadObservationsForBlockOverRange), then
   * score every date in memory (scoreBlockRange). This replaces N×blocks
   * DB round-trips with blocks queries total — the right shape for trends.
   *
   * Returns one SnapshotResult per input date, in the same order.
   */
  async computeRangeShared(dates: Date[]): Promise<SnapshotResult[]> {
    if (dates.length === 0) return [];

    const ordered = this.registry
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder);

    const first = dates.reduce((min, d) => (d < min ? d : min), dates[0]);
    const last = dates.reduce((max, d) => (d > max ? d : max), dates[0]);

    // For each block: load its full window once, then score every date.
    const perBlockResults: BlockResult[][] = await Promise.all(
      ordered.map(async (def) => {
        const observations = await loadObservationsForBlockOverRange(
          def,
          first,
          last,
        );
        return new BlockEngine(def).scoreBlockRange(dates, observations);
      }),
    );

    // Transpose: column i across all blocks → one snapshot for dates[i].
    return dates.map((d, i) => {
      const blocks = perBlockResults.map((blockDates) => blockDates[i]);
      const totalScore = blocks.reduce((sum, b) => sum + b.blockScore, 0);
      return {
        asOfDate: toIsoDate(d),
        blocks,
        totalScore,
        regime: regimeForTotalScore(totalScore),
        computedAt: new Date().toISOString(),
      };
    });
  }
}
