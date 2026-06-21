import type { BlockResult, ScoringResult, SnapshotResult } from "@/lib/scoring/types";
import type { DashboardData } from "@/app/components/dashboard/types";
import { getScorerByKey } from "@/lib/scoring/registry";

/**
 * Names of domain blocks that exist conceptually but do not yet have
 * a BlockDefinition + scorers in the engine registry. Rendered in the
 * dashboard as "Planned" placeholder cards so the layout reflects the
 * intended six-block design.
 */
export const PLANNED_BLOCK_NAMES: string[] = [];

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
  /**
   * Trailing daily snapshots ending on (and including) the as-of date, oldest
   * first. Used to derive 3M/1Y averages and the score one year ago. When
   * provided, it should span at least ~365 days for the 1Y figures.
   */
  trailing?: SnapshotResult[];
};

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  const sum = values.reduce((acc, v) => acc + v, 0);
  return Math.round(sum / values.length);
}

/**
 * Derive vs3mAvg, vs1yAvg and oneYearAgoScore from a trailing daily series.
 *
 * The series is oldest-first and ends on the as-of date. Averages cover the
 * trailing 90 / 365 days; the deltas are current − average. oneYearAgoScore is
 * the score ~365 days back (first element of a full-year window).
 */
function deriveComparisons(
  totalScore: number,
  trailing: SnapshotResult[],
): { vs3mAvg: number | null; vs1yAvg: number | null; oneYearAgoScore: number | null } {
  if (trailing.length === 0) {
    return { vs3mAvg: null, vs1yAvg: null, oneYearAgoScore: null };
  }
  const scores = trailing.map((s) => s.totalScore);
  const last90 = scores.slice(-90);
  const last365 = scores.slice(-365);

  const avg3m = average(last90);
  const avg1y = average(last365);
  const oneYearAgoScore = scores.length >= 365 ? scores[scores.length - 365] : null;

  return {
    vs3mAvg: avg3m === null ? null : totalScore - avg3m,
    vs1yAvg: avg1y === null ? null : totalScore - avg1y,
    oneYearAgoScore,
  };
}

/**
 * Transform a pure SnapshotResult (engine output) into the DashboardData
 * shape the dashboard UI expects.
 *
 * vsYesterday is computed when an anchors.yesterday snapshot is provided.
 * vs3mAvg / vs1yAvg / oneYearAgoScore are computed from anchors.trailing.
 * Trend is returned empty.
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

  const { vs3mAvg, vs1yAvg, oneYearAgoScore } = deriveComparisons(
    snapshot.totalScore,
    anchors.trailing ?? [],
  );

  return {
    snapshot: {
      id: 1,
      snapshotDate: snapshot.asOfDate,
      totalScore: snapshot.totalScore,
      regime: snapshot.regime,
      regimeSubtitle: null,
      interpretation: buildInterpretation(snapshot),
      vsYesterday,
      vs3mAvg,
      vs1yAvg,
      oneYearAgoScore,
    },
    blocks,
    metrics: flatMetrics,
    trend: [],
  };
}

function buildInterpretation(snapshot: SnapshotResult): string {
  const implementedCount = snapshot.blocks.length;
  return `Macro Pulse Score of ${snapshot.totalScore} (${snapshot.regime}) computed from ${implementedCount} implemented block${implementedCount === 1 ? "" : "s"}.`;
}
