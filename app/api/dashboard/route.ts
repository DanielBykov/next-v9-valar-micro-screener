import { NextRequest, NextResponse } from "next/server";
import { SnapshotEngine } from "@/lib/scoring/snapshot-engine";
import { BLOCKS } from "@/lib/scoring/registry";
import { toDashboardData } from "@/lib/scoring/dashboard-adapter";

/** Trailing window (days, inclusive of as-of) used for 3M/1Y comparisons. */
const TRAILING_DAYS = 365;

/**
 * Parse a YYYY-MM-DD param into a Date anchored to noon NY time (so toIsoDate
 * always lands on the intended calendar day regardless of server timezone).
 */
function parseAsOfDate(dateParam: string | null): Date {
  if (!dateParam) return new Date();
  // noon ET ≈ 17:00 UTC — safe across DST
  return new Date(`${dateParam}T17:00:00Z`);
}

/** Daily dates ending on `asOf` (inclusive), oldest first, spanning `days`. */
function trailingDates(asOf: Date, days: number): Date[] {
  const dates: Date[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(asOf);
    d.setUTCDate(d.getUTCDate() - i);
    dates.push(d);
  }
  return dates;
}

export async function GET(request: NextRequest) {
  try {
    const dateParam = request.nextUrl.searchParams.get("date");
    const asOf = parseAsOfDate(dateParam);

    const engine = new SnapshotEngine(BLOCKS);
    // One shared obs-window load per block scores the entire trailing year in
    // memory. The last element is the as-of snapshot; second-to-last is yesterday.
    const trailing = await engine.computeRangeShared(trailingDates(asOf, TRAILING_DAYS));
    const snapshot = trailing[trailing.length - 1];
    const yesterday = trailing.length >= 2 ? trailing[trailing.length - 2] : null;

    const data = toDashboardData(snapshot, { yesterday, trailing });
    return NextResponse.json(data);
  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
