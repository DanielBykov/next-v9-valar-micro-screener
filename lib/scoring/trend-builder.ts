import { SnapshotEngine } from "@/lib/scoring/snapshot-engine";
import { daysAgo, toIsoDate } from "@/lib/scoring/helpers";
import type { SnapshotResult } from "@/lib/scoring/types";

export type TrendPoint = {
  /** X-axis tick label. Monthly: "Feb 2025". Daily: day-of-month, e.g. "5". */
  label: string;
  /** ISO date (YYYY-MM-DD) of the point. */
  date: string;
  /** Macro Pulse Score (0–120) computed as of that date. */
  score: number;
  /** Oldest → newest ordering for the chart. */
  sortOrder: number;
};

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/**
 * Last calendar day of the month that `anchor` falls in, at noon UTC
 * (matches the dashboard's date anchoring so toIsoDate lands on the
 * intended day regardless of server timezone).
 */
function monthEnd(anchor: Date): Date {
  // Day 0 of next month = last day of this month.
  return new Date(
    Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + 1, 0, 12, 0, 0),
  );
}

function monthLabel(d: Date): string {
  return `${MONTH_LABELS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/**
 * Build the list of month-end anchor dates for the trailing `months`
 * window ending at `anchor` (inclusive), oldest → newest.
 */
function monthEndDates(anchor: Date, months: number): Date[] {
  const dates: Date[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(
      Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() - i, 1, 12, 0, 0),
    );
    dates.push(monthEnd(d));
  }
  return dates;
}

/**
 * True when a month-end snapshot has no real observations at all — every
 * indicator across every block fell back to its "missing inputs" warning.
 * Such months are omitted from the trend (per "show only months with data").
 */
function isEmptySnapshot(snapshot: SnapshotResult): boolean {
  return snapshot.blocks.every((block) =>
    block.indicators.every((ind) => ind.warning != null),
  );
}

/**
 * Compute the trailing 12-month Macro Pulse trend live (no persistence).
 *
 * One score per calendar month, taken at month-end. Uses the engine's
 * shared-window range compute so the whole series costs ~one DB query per
 * block rather than one per month. Months with no underlying data are
 * dropped, so the result may contain fewer than `months` points.
 */
export async function buildMonthlyTrend(
  engine: SnapshotEngine,
  anchor: Date = new Date(),
  months = 12,
): Promise<TrendPoint[]> {
  const dates = monthEndDates(anchor, months);
  return buildTrend(engine, dates, (d) => monthLabel(d));
}

/**
 * Build the list of day anchor dates for the trailing `days` window ending
 * at `anchor` (inclusive), oldest → newest. Each anchored to noon UTC.
 */
function dailyDates(anchor: Date, days: number): Date[] {
  const noon = new Date(
    Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), anchor.getUTCDate(), 12, 0, 0),
  );
  const dates: Date[] = [];
  for (let i = days - 1; i >= 0; i--) {
    dates.push(daysAgo(noon, i));
  }
  return dates;
}

/**
 * Compute the trailing N-day Macro Pulse trend live (no persistence).
 *
 * One score per calendar day, taken at end-of-day. X-axis label is the
 * day-of-month number. Days with no underlying data are dropped.
 */
export async function buildDailyTrend(
  engine: SnapshotEngine,
  anchor: Date = new Date(),
  days = 30,
): Promise<TrendPoint[]> {
  const dates = dailyDates(anchor, days);
  return buildTrend(engine, dates, (d) => String(d.getUTCDate()));
}

/**
 * Shared driver: score the given anchor dates via the engine's shared-window
 * range compute, drop empty (no-data) dates, label each via `labelFor`, and
 * re-index sortOrder oldest → newest.
 */
async function buildTrend(
  engine: SnapshotEngine,
  dates: Date[],
  labelFor: (d: Date) => string,
): Promise<TrendPoint[]> {
  const snapshots = await engine.computeRangeShared(dates);

  const points: TrendPoint[] = [];
  snapshots.forEach((snapshot, i) => {
    if (isEmptySnapshot(snapshot)) return;
    points.push({
      label: labelFor(dates[i]),
      date: toIsoDate(dates[i]),
      score: snapshot.totalScore,
      sortOrder: 0, // re-indexed below after filtering
    });
  });

  return points.map((p, i) => ({ ...p, sortOrder: i }));
}
