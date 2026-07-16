import { createHash } from "node:crypto";
import type { SnapshotResult } from "@/lib/scoring/types";

/**
 * System prompt for the AI Analyst Note. Kept as a stable constant so it can be
 * prompt-cached across generations (a cache_control breakpoint is placed on it
 * in narrative.ts).
 */
export const NARRATIVE_SYSTEM = `You are a macro strategist writing the analyst note for an institutional macro dashboard.

You are given a Macro Pulse Score (0-120) across 6 domain blocks and up to 36 underlying metrics, each scored 1-5 with a band label. Write a tight regime read.

Rules:
- Ground every claim in the numbers provided. Never invent a metric, block, or value that is not in the input.
- Lead with the regime and what is driving it. Then the sharpest cross-block divergence or tension. Then the main risk to watch.
- No preamble ("Here is...", "Based on..."), no bullet lists, no headings, no emoji.
- Institutional desk tone: direct, specific, quantitative. 2-3 short paragraphs.`;

/**
 * Render a SnapshotResult into the compact, deterministic text the model reads.
 */
export function serializeSnapshot(s: SnapshotResult): string {
  const blocks = s.blocks
    .map((b) => {
      const metrics = b.indicators
        .map((i) => `  - ${i.indicatorKey}: ${i.score}/5 (${i.bandLabel})`)
        .join("\n");
      return `## ${b.blockName} — ${b.blockScore}/20 (${b.regimeLabel})\n${metrics}`;
    })
    .join("\n\n");

  return `Macro Pulse Score: ${s.totalScore}/120 — regime: ${s.regime}
As of: ${s.asOfDate}

${blocks}`;
}

/**
 * Stable cache key over only the inputs that would change the narrative: the
 * total, the regime, and each block/metric score. Excludes computedAt and any
 * timestamp so recomputing the same scores hits cache instead of regenerating.
 */
export function inputHash(s: SnapshotResult): string {
  const payload = {
    total: s.totalScore,
    regime: s.regime,
    blocks: s.blocks.map((b) => ({
      k: b.blockKey,
      s: b.blockScore,
      m: b.indicators.map((i) => [i.indicatorKey, i.score] as const),
    })),
  };
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex").slice(0, 16);
}
