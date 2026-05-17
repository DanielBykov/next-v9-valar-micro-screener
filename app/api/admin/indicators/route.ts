import { NextRequest, NextResponse } from "next/server";
import { and, asc, gte, inArray, lte, SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { indicatorObservations } from "@/shared/schema";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_ROWS = 1000;

export async function GET(request: NextRequest) {
  const from = request.nextUrl.searchParams.get("from");
  const to = request.nextUrl.searchParams.get("to");
  const seriesParam = request.nextUrl.searchParams.get("series");

  if (from && !ISO_DATE_RE.test(from)) {
    return NextResponse.json({ message: "from must be in YYYY-MM-DD format" }, { status: 400 });
  }
  if (to && !ISO_DATE_RE.test(to)) {
    return NextResponse.json({ message: "to must be in YYYY-MM-DD format" }, { status: 400 });
  }

  const series = seriesParam
    ? seriesParam.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  const conditions: SQL[] = [];
  if (from) conditions.push(gte(indicatorObservations.observationDate, from));
  if (to) conditions.push(lte(indicatorObservations.observationDate, to));
  if (series.length) conditions.push(inArray(indicatorObservations.seriesId, series));

  try {
    const rows = await db
      .select({
        id: indicatorObservations.id,
        seriesId: indicatorObservations.seriesId,
        observationDate: indicatorObservations.observationDate,
        value: indicatorObservations.value,
      })
      .from(indicatorObservations)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(asc(indicatorObservations.observationDate), asc(indicatorObservations.seriesId))
      .limit(MAX_ROWS);

    return NextResponse.json({ rows, limit: MAX_ROWS });
  } catch (err: any) {
    return NextResponse.json(
      { message: err?.message ?? "Failed to query indicator_observations" },
      { status: 500 },
    );
  }
}
