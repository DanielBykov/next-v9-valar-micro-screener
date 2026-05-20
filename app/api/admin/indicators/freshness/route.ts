import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { indicatorObservations } from "@/shared/schema";

export async function GET() {
  try {
    const rows = await db
      .select({
        seriesId: indicatorObservations.seriesId,
        lastFetchedAt: sql<string>`max(${indicatorObservations.fetchedAt})`.as("lastFetchedAt"),
        earliestDate: sql<string>`min(${indicatorObservations.observationDate})`.as("earliestDate"),
        latestDate: sql<string>`max(${indicatorObservations.observationDate})`.as("latestDate"),
        count: sql<number>`count(*)::int`.as("count"),
      })
      .from(indicatorObservations)
      .groupBy(indicatorObservations.seriesId)
      .orderBy(indicatorObservations.seriesId);

    return NextResponse.json({ freshness: rows });
  } catch (err: any) {
    return NextResponse.json(
      { message: err?.message ?? "Failed to query freshness" },
      { status: 500 },
    );
  }
}
