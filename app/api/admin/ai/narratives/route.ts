import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { SnapshotEngine } from "@/lib/scoring/snapshot-engine";
import { BLOCKS } from "@/lib/scoring/registry";
import { inputHash } from "@/lib/ai/narrative-prompt";
import { listNarrativesLatestPerDate, deleteSupersededForDate } from "@/lib/ai/narrative-repo";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Ledger of generated narratives — latest note per date + version count. */
export async function GET(request: NextRequest) {
  const denied = await requireAuth(request);
  if (denied) return denied;

  const rows = await listNarrativesLatestPerDate();
  return NextResponse.json({ narratives: rows });
}

/**
 * Clean up superseded narratives for a date: keep only the note matching the
 * current live score config, delete the rest. Computes the live snapshot to
 * resolve the hash to keep.
 */
export async function DELETE(request: NextRequest) {
  const denied = await requireAuth(request);
  if (denied) return denied;

  const date = request.nextUrl.searchParams.get("date");
  if (!date || !ISO_DATE_RE.test(date)) {
    return NextResponse.json({ message: "date (YYYY-MM-DD) is required" }, { status: 400 });
  }

  const snapshot = await new SnapshotEngine(BLOCKS).compute(new Date(`${date}T17:00:00Z`));
  const removed = await deleteSupersededForDate(date, inputHash(snapshot));
  return NextResponse.json({ removed });
}
