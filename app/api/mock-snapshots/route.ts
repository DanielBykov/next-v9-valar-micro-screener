import { NextResponse } from "next/server";
import { storage } from "@/lib/storage";
import { seedDatabase } from "@/lib/seed";

let seeded = false;

export async function GET() {
  try {
    if (!seeded) {
      await seedDatabase();
      seeded = true;
    }

    const list = await storage.getSnapshotList();

    const payload = list.map((s) => ({
      snapshotDate: s.snapshotDate,
      totalScore: s.totalScore,
    }));

    return NextResponse.json(payload);
  } catch (error) {
    console.error("Mock snapshots API error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
