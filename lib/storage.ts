import { eq, asc, desc } from "drizzle-orm";
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
  getBlocksBySnapshot(snapshotId: number): Promise<Block[]>;
  getMetricsByBlock(blockId: number): Promise<Metric[]>;
  getAllMetricsBySnapshot(snapshotId: number): Promise<Metric[]>;
  getTrendBySnapshot(snapshotId: number): Promise<TrendPoint[]>;
  createSnapshot(data: InsertSnapshot): Promise<Snapshot>;
  createBlock(data: InsertBlock): Promise<Block>;
  createMetric(data: InsertMetric): Promise<Metric>;
  createTrendPoint(data: InsertTrendPoint): Promise<TrendPoint>;
  hasData(): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  async getLatestSnapshot(): Promise<Snapshot | undefined> {
    const results = await db.select().from(snapshots).orderBy(desc(snapshots.id)).limit(1);
    return results[0];
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

  async hasData(): Promise<boolean> {
    const results = await db.select().from(snapshots).limit(1);
    return results.length > 0;
  }
}

export const storage = new DatabaseStorage();
