import { NextRequest, NextResponse } from "next/server";
import { fetchAndStoreBlock, fetchAndStoreAllBlocks } from "@/lib/fred/fetcher";
import { isBlockKey } from "@/lib/fred/series-catalog";
import { requireAuth } from "@/lib/auth";
import { SnapshotEngine } from "@/lib/scoring/snapshot-engine";
import { BLOCKS } from "@/lib/scoring/registry";
import { getRegimeNarrative } from "@/lib/ai/narrative";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Warm the AI regime narrative for today after fresh FRED data lands. Fire-and-
 * forget: never blocks or fails the fetch response. Because getRegimeNarrative
 * is keyed on the score configuration, this is a no-op cache hit when the new
 * data didn't move any of the 36 metric scores (no API call, no cost).
 */
function precomputeNarrative(): void {
  void (async () => {
    try {
      const snapshot = await new SnapshotEngine(BLOCKS).compute(new Date());
      await getRegimeNarrative(snapshot);
    } catch (err) {
      console.error("Narrative precompute failed:", err);
    }
  })();
}

export async function POST(request: NextRequest) {
  const denied = await requireAuth(request);
  if (denied) return denied;

  if (!process.env.FRED_API) {
    return NextResponse.json({ message: "FRED_API env var is not set" }, { status: 500 });
  }

  const block = request.nextUrl.searchParams.get("block");
  const start = request.nextUrl.searchParams.get("start");
  const end = request.nextUrl.searchParams.get("end");

  if (!block) {
    return NextResponse.json({ message: "block query param is required" }, { status: 400 });
  }
  if (block !== "all" && !isBlockKey(block)) {
    return NextResponse.json({ message: `Unknown block: ${block}` }, { status: 400 });
  }

  if (start && !ISO_DATE_RE.test(start)) {
    return NextResponse.json(
      { message: "start must be in YYYY-MM-DD format" },
      { status: 400 },
    );
  }
  if (end && !ISO_DATE_RE.test(end)) {
    return NextResponse.json(
      { message: "end must be in YYYY-MM-DD format" },
      { status: 400 },
    );
  }

  try {
    if (block === "all") {
      const summary = await fetchAndStoreAllBlocks(start ?? undefined, end ?? undefined);
      const anySuccess = summary.results.some((r) => r.status === "ok");
      const status = anySuccess ? 200 : 502;
      if (anySuccess) precomputeNarrative();
      return NextResponse.json(summary, { status });
    }

    const summary = await fetchAndStoreBlock(block, start ?? undefined, end ?? undefined);
    const anySuccess = summary.results.some((r) => r.status === "ok");
    const status = anySuccess ? 200 : 502;
    return NextResponse.json(summary, { status });
  } catch (err: any) {
    return NextResponse.json(
      { message: err?.message ?? "Failed to fetch indicators" },
      { status: 500 },
    );
  }
}
