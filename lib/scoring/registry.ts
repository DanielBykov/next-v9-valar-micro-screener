import { ratesBlock } from "@/lib/scoring/blocks/rates";
import type { IndicatorScorer } from "@/lib/scoring/indicator-scorer";
import type { BlockDefinition } from "@/lib/scoring/types";

/**
 * Single source of truth for all blocks the engine knows about.
 * Add future blocks by importing their BlockDefinition and appending here.
 */
export const BLOCKS: BlockDefinition[] = [ratesBlock];

export function getBlockByKey(key: string): BlockDefinition | undefined {
  return BLOCKS.find((b) => b.key === key);
}

export function getAllScorers(): IndicatorScorer[] {
  return BLOCKS.flatMap((b) => b.scorers);
}

export function getScorerByKey(indicatorKey: string): IndicatorScorer | undefined {
  return getAllScorers().find((s) => s.key === indicatorKey);
}
