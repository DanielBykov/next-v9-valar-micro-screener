import { NextResponse } from "next/server";
import { desc, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { indicatorObservations } from "@/shared/schema";
import { SnapshotEngine } from "@/lib/scoring/snapshot-engine";
import { BLOCKS, getAllScorers } from "@/lib/scoring/registry";

/** Cap the calendar to the last N days of available observations. */
const CALENDAR_WINDOW_DAYS = 90;

export async function GET() {
  try {
    const seriesIds = Array.from(
      new Set(getAllScorers().flatMap((s) => s.inputs.map((i) => i.seriesId))),
    );
    if (seriesIds.length === 0) {
      return NextResponse.json([]);
    }

    const rows = await db
      .selectDistinct({ observationDate: indicatorObservations.observationDate })
      .from(indicatorObservations)
      .where(inArray(indicatorObservations.seriesId, seriesIds))
      .orderBy(desc(indicatorObservations.observationDate))
      .limit(CALENDAR_WINDOW_DAYS);

    const dates = rows.map((r) => r.observationDate);
    const engine = new SnapshotEngine(BLOCKS);
    const snapshots = await engine.computeRange(
      dates.map((d) => new Date(`${d}T17:00:00Z`)),
    );

    const payload = snapshots.map((s) => ({
      snapshotDate: s.asOfDate,
      totalScore: s.totalScore,
    }));

    return NextResponse.json(payload);
  } catch (error) {
    console.error("Snapshots API error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
