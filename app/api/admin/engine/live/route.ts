import { NextRequest, NextResponse } from "next/server";
import { BLOCKS } from "@/lib/scoring/registry";
import { SnapshotEngine } from "@/lib/scoring/snapshot-engine";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * GET /api/admin/engine/live?date=YYYY-MM-DD
 *
 * Runs SnapshotEngine for the given date (defaults to today) and returns
 * the raw, untransformed SnapshotResult — every block, every indicator,
 * inputsUsed, formulaTrace, bandLabel. No adapter, no DB writes.
 */
export async function GET(request: NextRequest) {
  const dateParam = request.nextUrl.searchParams.get("date");

  let asOfDate: Date;
  if (dateParam) {
    if (!ISO_DATE_RE.test(dateParam)) {
      return NextResponse.json(
        { message: "date must be in YYYY-MM-DD format" },
        { status: 400 },
      );
    }
    asOfDate = new Date(`${dateParam}T00:00:00Z`);
    if (Number.isNaN(asOfDate.getTime())) {
      return NextResponse.json({ message: "Invalid date" }, { status: 400 });
    }
  } else {
    asOfDate = new Date();
  }

  try {
    const engine = new SnapshotEngine(BLOCKS);
    const snapshot = await engine.compute(asOfDate);
    return NextResponse.json(snapshot);
  } catch (err: any) {
    return NextResponse.json(
      { message: err?.message ?? "Failed to compute engine snapshot" },
      { status: 500 },
    );
  }
}
