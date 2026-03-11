import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, serial, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const snapshots = pgTable("snapshots", {
  id: serial("id").primaryKey(),
  snapshotDate: date("snapshot_date").notNull().unique(),
  totalScore: integer("total_score").notNull(),
  regime: text("regime").notNull(),
  regimeSubtitle: text("regime_subtitle"),
  interpretation: text("interpretation").notNull(),
  vsYesterday: integer("vs_yesterday"),
  vs3mAvg: integer("vs_3m_avg"),
  vs1yAvg: integer("vs_1y_avg"),
  oneYearAgoScore: integer("one_year_ago_score"),
});

export const blocks = pgTable("blocks", {
  id: serial("id").primaryKey(),
  snapshotId: integer("snapshot_id").notNull(),
  name: text("name").notNull(),
  score: integer("score").notNull(),
  maxScore: integer("max_score").notNull().default(20),
  summary: text("summary").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const metrics = pgTable("metrics", {
  id: serial("id").primaryKey(),
  blockId: integer("block_id").notNull(),
  name: text("name").notNull(),
  domain: text("domain").notNull(),
  score: integer("score").notNull(),
  maxScore: integer("max_score").notNull().default(5),
  interpretation: text("interpretation").notNull(),
  isTopDriver: integer("is_top_driver").notNull().default(0),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const trendPoints = pgTable("trend_points", {
  id: serial("id").primaryKey(),
  snapshotId: integer("snapshot_id").notNull(),
  month: text("month").notNull(),
  score: integer("score").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const insertSnapshotSchema = createInsertSchema(snapshots).omit({ id: true });
export const insertBlockSchema = createInsertSchema(blocks).omit({ id: true });
export const insertMetricSchema = createInsertSchema(metrics).omit({ id: true });
export const insertTrendPointSchema = createInsertSchema(trendPoints).omit({ id: true });

export type Snapshot = typeof snapshots.$inferSelect;
export type InsertSnapshot = z.infer<typeof insertSnapshotSchema>;
export type Block = typeof blocks.$inferSelect;
export type InsertBlock = z.infer<typeof insertBlockSchema>;
export type Metric = typeof metrics.$inferSelect;
export type InsertMetric = z.infer<typeof insertMetricSchema>;
export type TrendPoint = typeof trendPoints.$inferSelect;
export type InsertTrendPoint = z.infer<typeof insertTrendPointSchema>;
