import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { SnapshotEngine } from "@/lib/scoring/snapshot-engine";
import { BLOCKS } from "@/lib/scoring/registry";
import { getRegimeNarrative } from "@/lib/ai/narrative";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Generate (or, with force, regenerate) the narrative for a single date.
 * `force` bypasses the cache and overwrites the stored note for the date's
 * current live score configuration. Returns the classified outcome so the UI
 * can report success or the reason it failed.
 */
export async function POST(request: NextRequest) {
  const denied = await requireAuth(request);
  if (denied) return denied;

  const body = (await request.json().catch(() => ({}))) as { date?: string; force?: boolean };
  const { date, force } = body;

  if (!date || !ISO_DATE_RE.test(date)) {
    return NextResponse.json({ message: "date (YYYY-MM-DD) is required" }, { status: 400 });
  }

  const snapshot = await new SnapshotEngine(BLOCKS).compute(new Date(`${date}T17:00:00Z`));
  const outcome = await getRegimeNarrative(snapshot, { force: Boolean(force) });
  return NextResponse.json({ date, outcome });
}
