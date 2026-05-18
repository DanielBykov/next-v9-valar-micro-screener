import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { indicatorObservations } from "@/shared/schema";

export async function GET() {
  try {
    const rows = await db
      .select({
        seriesId: indicatorObservations.seriesId,
        month: sql<string>`to_char(${indicatorObservations.observationDate}, 'YYYY-MM')`.as("month"),
        count: sql<number>`count(*)::int`.as("count"),
      })
      .from(indicatorObservations)
      .groupBy(indicatorObservations.seriesId, sql`to_char(${indicatorObservations.observationDate}, 'YYYY-MM')`)
      .orderBy(sql`month DESC`, indicatorObservations.seriesId);

    return NextResponse.json({ coverage: rows });
  } catch (err: any) {
    return NextResponse.json(
      { message: err?.message ?? "Failed to query coverage" },
      { status: 500 },
    );
  }
}
