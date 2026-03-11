import { NextResponse } from "next/server";
import { storage } from "@/lib/storage";

export async function GET() {
  try {
    const list = await storage.getSnapshotList();
    return NextResponse.json(list);
  } catch (error) {
    console.error("Snapshots API error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
