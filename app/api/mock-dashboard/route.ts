import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/lib/storage";
import { seedDatabase } from "@/lib/seed";

let seeded = false;

export async function GET(request: NextRequest) {
  try {
    if (!seeded) {
      await seedDatabase();
      seeded = true;
    }

    const snapshotIdParam = request.nextUrl.searchParams.get("snapshotId");
    const dateParam = request.nextUrl.searchParams.get("date");

    let snapshot;
    if (dateParam) {
      snapshot = await storage.getSnapshotByDate(dateParam);
    } else if (snapshotIdParam) {
      const id = Number(snapshotIdParam);
      if (Number.isNaN(id)) {
        return NextResponse.json({ message: "Invalid snapshotId." }, { status: 400 });
      }
      snapshot = await storage.getSnapshotById(id);
    } else {
      snapshot = await storage.getLatestSnapshot();
    }

    if (!snapshot) {
      return NextResponse.json({ message: "No snapshot data found." }, { status: 404 });
    }

    const blocksData = await storage.getBlocksBySnapshot(snapshot.id);

    const blocksWithMetrics = await Promise.all(
      blocksData.map(async (block) => {
        const blockMetrics = await storage.getMetricsByBlock(block.id);
        const drivers = blockMetrics.filter((m) => m.isTopDriver === 1);
        return {
          ...block,
          metrics: blockMetrics,
          drivers: drivers.map((d) => ({ name: d.name, score: d.score })),
        };
      })
    );

    const allMetrics = await storage.getAllMetricsBySnapshot(snapshot.id);
    const trend = await storage.getTrendBySnapshot(snapshot.id);

    return NextResponse.json({
      snapshot,
      blocks: blocksWithMetrics,
      metrics: allMetrics,
      trend,
    });
  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
