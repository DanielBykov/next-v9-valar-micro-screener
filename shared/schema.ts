import {pgTable, text, integer, serial, date, numeric, timestamp, uniqueIndex} from "drizzle-orm/pg-core";
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

/**
 * Cache of LLM-generated regime narratives. Keyed by (snapshotDate, inputHash)
 * so a narrative is regenerated only when the underlying 36 scores actually
 * change — not on every recompute. See lib/ai/narrative-prompt.ts#inputHash.
 */
export const snapshotNarratives = pgTable(
    "snapshot_narratives",
    {
      id: serial("id").primaryKey(),
      snapshotDate: date("snapshot_date").notNull(),
      inputHash: text("input_hash").notNull(),
      headline: text("headline").notNull(),
      narrative: text("narrative").notNull(),
      model: text("model").notNull(),
      generatedAt: timestamp("generated_at", { withTimezone: true }).notNull().defaultNow(),
    },
    (t) => [
      uniqueIndex("snapshot_narratives_date_hash_idx").on(t.snapshotDate, t.inputHash),
    ],
);

export type SnapshotNarrative = typeof snapshotNarratives.$inferSelect;

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

export const indicatorObservations = pgTable(
    "indicator_observations",
    {
      id: serial("id").primaryKey(),
      seriesId: text("series_id").notNull(),
      observationDate: date("observation_date").notNull(),
      value: numeric("value", { precision: 20, scale: 6 }).notNull(),
      source: text("source").notNull(),
      fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
    },
    (t) => [
      uniqueIndex("indicator_observations_series_date_idx").on(t.seriesId, t.observationDate),
    ],
);

export const insertIndicatorObservationSchema = createInsertSchema(indicatorObservations).omit({
  id: true,
  fetchedAt: true,
});
export type IndicatorObservation = typeof indicatorObservations.$inferSelect;
export type InsertIndicatorObservation = z.infer<typeof insertIndicatorObservationSchema>;

/**
 * Analyst-entered values for indicators with no automated free source
 * (e.g. NFP consensus, Forward Guidance Tone). Mirrors indicator_observations
 * shape so scorers can consume both via the same observations map.
 */
export const indicatorManualInputs = pgTable(
    "indicator_manual_inputs",
    {
      id: serial("id").primaryKey(),
      seriesId: text("series_id").notNull(),
      observationDate: date("observation_date").notNull(),
      value: numeric("value", { precision: 20, scale: 6 }).notNull(),
      note: text("note"),
      createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
      updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    },
    (t) => [
      uniqueIndex("indicator_manual_inputs_series_date_idx").on(t.seriesId, t.observationDate),
    ],
);

export const insertIndicatorManualInputSchema = createInsertSchema(indicatorManualInputs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type IndicatorManualInput = typeof indicatorManualInputs.$inferSelect;
export type InsertIndicatorManualInput = z.infer<typeof insertIndicatorManualInputSchema>;
