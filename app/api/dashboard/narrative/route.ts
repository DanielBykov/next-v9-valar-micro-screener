import { NextRequest, NextResponse } from "next/server";
import { SnapshotEngine } from "@/lib/scoring/snapshot-engine";
import { BLOCKS } from "@/lib/scoring/registry";
import { getRegimeNarrative } from "@/lib/ai/narrative";

/**
 * Parse a YYYY-MM-DD param into a Date anchored to noon ET (17:00 UTC), matching
 * /api/dashboard so both routes resolve to the same as-of calendar day.
 */
function parseAsOfDate(dateParam: string | null): Date {
  if (!dateParam) return new Date();
  return new Date(`${dateParam}T17:00:00Z`);
}

/**
 * AI Analyst Note for a given date. Read-through cache: serves the precomputed
 * narrative when warm, generates + caches on a cold miss. Returns
 * { narrative: null } (200) when generation is unavailable, so the dashboard
 * degrades gracefully rather than surfacing an error.
 */
export async function GET(request: NextRequest) {
  try {
    const asOf = parseAsOfDate(request.nextUrl.searchParams.get("date"));

    const engine = new SnapshotEngine(BLOCKS);
    const snapshot = await engine.compute(asOf);

    const outcome = await getRegimeNarrative(snapshot);
    const narrative = outcome.status === "ok" ? outcome.narrative : null;
    return NextResponse.json({ narrative });
  } catch (error) {
    console.error("Narrative API error:", error);
    return NextResponse.json({ narrative: null }, { status: 200 });
  }
}
