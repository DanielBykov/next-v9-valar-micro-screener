import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { snapshots, blocks, metrics, trendPoints } from "@/shared/schema";
import { requireAuth } from "@/lib/auth";

export async function POST(request: Request) {
  const denied = await requireAuth(request);
  if (denied) return denied;

  try {
    await db.delete(metrics);
    await db.delete(trendPoints);
    await db.delete(blocks);
    await db.delete(snapshots);
    return NextResponse.json({ message: "All data cleared successfully." });
  } catch (error) {
    console.error("Clear data error:", error);
    return NextResponse.json({ message: "Failed to clear data." }, { status: 500 });
  }
}
