import { eq, asc, desc, inArray } from "drizzle-orm";
import { db } from "./db";
import {
  snapshots, blocks, metrics, trendPoints,
  type Snapshot, type InsertSnapshot,
  type Block, type InsertBlock,
  type Metric, type InsertMetric,
  type TrendPoint, type InsertTrendPoint,
} from "@/shared/schema";

export interface IStorage {
  getLatestSnapshot(): Promise<Snapshot | undefined>;
  getSnapshotById(id: number): Promise<Snapshot | undefined>;
  getSnapshotByDate(date: string): Promise<Snapshot | undefined>;
  getSnapshotList(): Promise<Pick<Snapshot, 'id' | 'snapshotDate' | 'totalScore' | 'regime'>[]>;
  getBlocksBySnapshot(snapshotId: number): Promise<Block[]>;
  getMetricsByBlock(blockId: number): Promise<Metric[]>;
  getAllMetricsBySnapshot(snapshotId: number): Promise<Metric[]>;
  getTrendBySnapshot(snapshotId: number): Promise<TrendPoint[]>;
  createSnapshot(data: InsertSnapshot): Promise<Snapshot>;
  createBlock(data: InsertBlock): Promise<Block>;
  createMetric(data: InsertMetric): Promise<Metric>;
  createTrendPoint(data: InsertTrendPoint): Promise<TrendPoint>;
  deleteSnapshot(id: number): Promise<void>;
  hasData(): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  async getLatestSnapshot(): Promise<Snapshot | undefined> {
    const results = await db.select().from(snapshots).orderBy(desc(snapshots.snapshotDate)).limit(1);
    return results[0];
  }

  async getSnapshotById(id: number): Promise<Snapshot | undefined> {
    const results = await db.select().from(snapshots).where(eq(snapshots.id, id)).limit(1);
    return results[0];
  }

  async getSnapshotByDate(date: string): Promise<Snapshot | undefined> {
    const results = await db.select().from(snapshots).where(eq(snapshots.snapshotDate, date)).limit(1);
    return results[0];
  }

  async getSnapshotList(): Promise<Pick<Snapshot, 'id' | 'snapshotDate' | 'totalScore' | 'regime'>[]> {
    return db
      .select({
        id: snapshots.id,
        snapshotDate: snapshots.snapshotDate,
        totalScore: snapshots.totalScore,
        regime: snapshots.regime,
      })
      .from(snapshots)
      .orderBy(desc(snapshots.snapshotDate));
  }

  async getBlocksBySnapshot(snapshotId: number): Promise<Block[]> {
    return db.select().from(blocks).where(eq(blocks.snapshotId, snapshotId)).orderBy(asc(blocks.sortOrder));
  }

  async getMetricsByBlock(blockId: number): Promise<Metric[]> {
    return db.select().from(metrics).where(eq(metrics.blockId, blockId)).orderBy(asc(metrics.sortOrder));
  }

  async getAllMetricsBySnapshot(snapshotId: number): Promise<Metric[]> {
    const snapshotBlocks = await this.getBlocksBySnapshot(snapshotId);
    const allMetrics: Metric[] = [];
    for (const block of snapshotBlocks) {
      const blockMetrics = await this.getMetricsByBlock(block.id);
      allMetrics.push(...blockMetrics);
    }
    return allMetrics;
  }

  async getTrendBySnapshot(snapshotId: number): Promise<TrendPoint[]> {
    return db.select().from(trendPoints).where(eq(trendPoints.snapshotId, snapshotId)).orderBy(asc(trendPoints.sortOrder));
  }

  async createSnapshot(data: InsertSnapshot): Promise<Snapshot> {
    const [result] = await db.insert(snapshots).values(data).returning();
    return result;
  }

  async createBlock(data: InsertBlock): Promise<Block> {
    const [result] = await db.insert(blocks).values(data).returning();
    return result;
  }

  async createMetric(data: InsertMetric): Promise<Metric> {
    const [result] = await db.insert(metrics).values(data).returning();
    return result;
  }

  async createTrendPoint(data: InsertTrendPoint): Promise<TrendPoint> {
    const [result] = await db.insert(trendPoints).values(data).returning();
    return result;
  }

  async deleteSnapshot(id: number): Promise<void> {
    const snapshotBlocks = await this.getBlocksBySnapshot(id);
    const blockIds = snapshotBlocks.map((b) => b.id);
    if (blockIds.length > 0) {
      await db.delete(metrics).where(inArray(metrics.blockId, blockIds));
    }
    await db.delete(blocks).where(eq(blocks.snapshotId, id));
    await db.delete(trendPoints).where(eq(trendPoints.snapshotId, id));
    await db.delete(snapshots).where(eq(snapshots.id, id));
  }

  async hasData(): Promise<boolean> {
    const results = await db.select().from(snapshots).limit(1);
    return results.length > 0;
  }
}

export const storage = new DatabaseStorage();
