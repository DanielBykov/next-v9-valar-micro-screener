import {pgTable, text, integer, serial, date, numeric, timestamp, uniqueIndex} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

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
