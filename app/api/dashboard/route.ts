import { NextRequest, NextResponse } from "next/server";
import { SnapshotEngine } from "@/lib/scoring/snapshot-engine";
import { BLOCKS } from "@/lib/scoring/registry";
import { toDashboardData } from "@/lib/scoring/dashboard-adapter";

/**
 * Parse a YYYY-MM-DD param into a Date anchored to noon NY time (so toIsoDate
 * always lands on the intended calendar day regardless of server timezone).
 */
function parseAsOfDate(dateParam: string | null): Date {
  if (!dateParam) return new Date();
  // noon ET ≈ 17:00 UTC — safe across DST
  return new Date(`${dateParam}T17:00:00Z`);
}

export async function GET(request: NextRequest) {
  try {
    const dateParam = request.nextUrl.searchParams.get("date");
    const asOf = parseAsOfDate(dateParam);
    const yesterday = new Date(asOf);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);

    const engine = new SnapshotEngine(BLOCKS);
    const [snapshot, yesterdaySnapshot] = await Promise.all([
      engine.compute(asOf),
      engine.compute(yesterday).catch(() => null),
    ]);

    const data = toDashboardData(snapshot, { yesterday: yesterdaySnapshot });
    return NextResponse.json(data);
  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
