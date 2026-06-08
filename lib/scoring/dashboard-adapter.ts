import type { BlockResult, ScoringResult, SnapshotResult } from "@/lib/scoring/types";
import type { DashboardData } from "@/app/components/dashboard/types";
import { getScorerByKey } from "@/lib/scoring/registry";

/**
 * Names of domain blocks that exist conceptually but do not yet have
 * a BlockDefinition + scorers in the engine registry. Rendered in the
 * dashboard as "Planned" placeholder cards so the layout reflects the
 * intended six-block design.
 */
export const PLANNED_BLOCK_NAMES = [
  "Narrative & Political Risk",
];

const TOP_DRIVER_MAX_SCORE = 2;
const BLOCK_MAX_SCORE = 20;
const METRIC_MAX_SCORE = 5;

type DashboardBlock = DashboardData["blocks"][number];
type DashboardMetric = DashboardBlock["metrics"][number];
type DashboardFlatMetric = DashboardData["metrics"][number];

function toDashboardMetric(
  indicator: ScoringResult,
  blockName: string,
  blockIndex: number,
  metricIndex: number,
): DashboardMetric {
  const isTopDriver = indicator.score <= TOP_DRIVER_MAX_SCORE ? 1 : 0;
  const scorer = getScorerByKey(indicator.indicatorKey);
  return {
    id: blockIndex * 100 + metricIndex + 1,
    name: indicatorDisplayName(indicator.indicatorKey),
    domain: blockName,
    score: indicator.score,
    maxScore: METRIC_MAX_SCORE,
    interpretation: indicator.interpretation,
    isTopDriver,
    rawValue: indicator.rawValue,
    unit: scorer?.unit ?? null,
  };
}

function indicatorDisplayName(indicatorKey: string): string {
  const scorer = getScorerByKey(indicatorKey);
  if (scorer) return scorer.name;
  // Fallback: convert "fed_funds_rate_level" -> "Fed Funds Rate Level"
  return indicatorKey
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function toDashboardBlock(block: BlockResult, blockIndex: number): DashboardBlock {
  const metrics = block.indicators.map((ind, j) =>
    toDashboardMetric(ind, block.blockName, blockIndex, j),
  );

  const drivers = metrics
    .filter((m) => m.isTopDriver === 1)
    .map((m) => ({ name: m.name, score: m.score }));

  return {
    id: blockIndex + 1,
    name: block.blockName,
    score: block.blockScore,
    maxScore: BLOCK_MAX_SCORE,
    summary: block.regimeLabel,
    drivers,
    metrics,
  };
}

function plannedBlock(name: string, blockIndex: number): DashboardBlock {
  return {
    id: blockIndex + 1,
    name,
    score: 0,
    maxScore: BLOCK_MAX_SCORE,
    summary: "Coming soon",
    drivers: [],
    metrics: [],
    isPlanned: true,
  };
}

export type DashboardAnchors = {
  /** Snapshot for the previous calendar day; null if observations unavailable. */
  yesterday?: SnapshotResult | null;
};

/**
 * Transform a pure SnapshotResult (engine output) into the DashboardData
 * shape the dashboard UI expects.
 *
 * vsYesterday is computed when an anchors.yesterday snapshot is provided.
 * Other comparisons (vs3mAvg, vs1yAvg, oneYearAgoScore) remain null until
 * their anchor snapshots are added. Trend is returned empty.
 */
export function toDashboardData(
  snapshot: SnapshotResult,
  anchors: DashboardAnchors = {},
  plannedBlockNames: string[] = PLANNED_BLOCK_NAMES,
): DashboardData {
  const realBlocks = snapshot.blocks.map((b, i) => toDashboardBlock(b, i));
  const planned = plannedBlockNames.map((name, i) =>
    plannedBlock(name, realBlocks.length + i),
  );
  const blocks = [...realBlocks, ...planned];

  const flatMetrics: DashboardFlatMetric[] = blocks.flatMap((b) =>
    b.metrics.map(({ isTopDriver, ...m }) => m),
  );

  const vsYesterday = anchors.yesterday
    ? snapshot.totalScore - anchors.yesterday.totalScore
    : null;

  return {
    snapshot: {
      id: 1,
      snapshotDate: snapshot.asOfDate,
      totalScore: snapshot.totalScore,
      regime: snapshot.regime,
      regimeSubtitle: null,
      interpretation: buildInterpretation(snapshot),
      vsYesterday,
      vs3mAvg: null,
      vs1yAvg: null,
      oneYearAgoScore: null,
    },
    blocks,
    metrics: flatMetrics,
    trend: [],
  };
}

function buildInterpretation(snapshot: SnapshotResult): string {
  const implementedCount = snapshot.blocks.length;
  return `Macro Pulse Score of ${snapshot.totalScore} (${snapshot.regime}) computed from ${implementedCount} implemented block${implementedCount === 1 ? "" : "s"}. Comparisons and trend will activate as more blocks come online.`;
}
