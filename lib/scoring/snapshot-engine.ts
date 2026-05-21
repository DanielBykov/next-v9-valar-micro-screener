import { BlockEngine } from "@/lib/scoring/block-engine";
import { regimeForTotalScore, toIsoDate } from "@/lib/scoring/helpers";
import type { BlockDefinition, SnapshotResult } from "@/lib/scoring/types";

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
}
