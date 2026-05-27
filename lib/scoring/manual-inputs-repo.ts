import { and, asc, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  indicatorManualInputs,
  type IndicatorManualInput,
  type IndicatorObservation,
} from "@/shared/schema";
import type { BlockDefinition, ObservationsByseries } from "@/lib/scoring/types";
import { daysAgo, toIsoDate } from "@/lib/scoring/helpers";

const MANUAL_SOURCE = "MANUAL";

/**
 * Adapt a manual-input row into the IndicatorObservation shape so the scoring
 * engine can consume manual and FRED data through the same observations map.
 *
 * Manual rows carry no `fetched_at` semantics; we surface `updated_at` as the
 * "fetched at" timestamp for callers that care.
 */
function toObservation(row: IndicatorManualInput): IndicatorObservation {
  return {
    id: row.id,
    seriesId: row.seriesId,
    observationDate: row.observationDate,
    value: row.value,
    source: MANUAL_SOURCE,
    fetchedAt: row.updatedAt,
  };
}

/**
 * Collect (seriesId → maxLookbackDays) for inputs declared `source: "manual"`.
 */
function manualSeriesLookbacks(def: BlockDefinition): Map<string, number> {
  const out = new Map<string, number>();
  for (const scorer of def.scorers) {
    for (const spec of scorer.inputs) {
      if (spec.source !== "manual") continue;
      const prev = out.get(spec.seriesId) ?? 0;
      if (spec.lookbackDays > prev) out.set(spec.seriesId, spec.lookbackDays);
    }
  }
  return out;
}

/**
 * Load manual-input observations needed to score a block as of asOfDate.
 * Returns ObservationsByseries (DESC sorted) for every manual series declared
 * by the block's scorers. Returns {} if the block declares no manual inputs.
 */
export async function loadManualInputsForBlock(
  def: BlockDefinition,
  asOfDate: Date,
): Promise<ObservationsByseries> {
  const lookbacks = manualSeriesLookbacks(def);
  if (lookbacks.size === 0) return {};

  const seriesIds = Array.from(lookbacks.keys());
  const earliest = Math.max(...Array.from(lookbacks.values()));
  const startDate = toIsoDate(daysAgo(asOfDate, earliest));
  const endDate = toIsoDate(asOfDate);

  const rows = await db
    .select()
    .from(indicatorManualInputs)
    .where(
      and(
        inArray(indicatorManualInputs.seriesId, seriesIds),
        gte(indicatorManualInputs.observationDate, startDate),
        lte(indicatorManualInputs.observationDate, endDate),
      ),
    )
    .orderBy(desc(indicatorManualInputs.observationDate));

  const grouped: ObservationsByseries = {};
  for (const seriesId of seriesIds) grouped[seriesId] = [];
  for (const row of rows) {
    (grouped[row.seriesId] ??= []).push(toObservation(row));
  }
  return grouped;
}

/**
 * Range variant — load enough manual history so any date in [fromDate, toDate]
 * can be scored. Extends the lower bound by the largest declared lookback.
 */
export async function loadManualInputsForBlockOverRange(
  def: BlockDefinition,
  fromDate: Date,
  toDate: Date,
): Promise<ObservationsByseries> {
  const lookbacks = manualSeriesLookbacks(def);
  if (lookbacks.size === 0) return {};

  const seriesIds = Array.from(lookbacks.keys());
  const maxLookback = Math.max(...Array.from(lookbacks.values()));
  const startDate = toIsoDate(daysAgo(fromDate, maxLookback));
  const endDate = toIsoDate(toDate);

  const rows = await db
    .select()
    .from(indicatorManualInputs)
    .where(
      and(
        inArray(indicatorManualInputs.seriesId, seriesIds),
        gte(indicatorManualInputs.observationDate, startDate),
        lte(indicatorManualInputs.observationDate, endDate),
      ),
    )
    .orderBy(desc(indicatorManualInputs.observationDate));

  const grouped: ObservationsByseries = {};
  for (const seriesId of seriesIds) grouped[seriesId] = [];
  for (const row of rows) {
    (grouped[row.seriesId] ??= []).push(toObservation(row));
  }
  return grouped;
}

export type ManualInputUpsert = {
  seriesId: string;
  observationDate: string; // YYYY-MM-DD
  value: string | number;
  note?: string | null;
};

/**
 * Insert or update a manual input for a (seriesId, observationDate) pair.
 * `updated_at` is bumped on every write; `created_at` is preserved on update.
 */
export async function upsertManualInput(
  input: ManualInputUpsert,
): Promise<IndicatorManualInput> {
  const value = typeof input.value === "number" ? String(input.value) : input.value;
  const [row] = await db
    .insert(indicatorManualInputs)
    .values({
      seriesId: input.seriesId,
      observationDate: input.observationDate,
      value,
      note: input.note ?? null,
    })
    .onConflictDoUpdate({
      target: [indicatorManualInputs.seriesId, indicatorManualInputs.observationDate],
      set: {
        value: sql`excluded."value"`,
        note: sql`excluded."note"`,
        updatedAt: sql`now()`,
      },
    })
    .returning();
  return row;
}

/**
 * List recent manual entries for a series (DESC by observation_date).
 */
export async function listManualInputs(
  seriesId: string,
  limit = 50,
): Promise<IndicatorManualInput[]> {
  return db
    .select()
    .from(indicatorManualInputs)
    .where(eq(indicatorManualInputs.seriesId, seriesId))
    .orderBy(desc(indicatorManualInputs.observationDate))
    .limit(limit);
}

/**
 * List all manual entries across every series (DESC by observation_date).
 * Used by the admin overview to render the global history table.
 */
export async function listAllManualInputs(limit = 200): Promise<IndicatorManualInput[]> {
  return db
    .select()
    .from(indicatorManualInputs)
    .orderBy(
      desc(indicatorManualInputs.observationDate),
      asc(indicatorManualInputs.seriesId),
    )
    .limit(limit);
}

/**
 * Remove the manual entry for a specific (seriesId, observation_date).
 * Returns the deleted row, or null if nothing matched.
 */
export async function deleteManualInput(
  seriesId: string,
  observationDate: string,
): Promise<IndicatorManualInput | null> {
  const rows = await db
    .delete(indicatorManualInputs)
    .where(
      and(
        eq(indicatorManualInputs.seriesId, seriesId),
        eq(indicatorManualInputs.observationDate, observationDate),
      ),
    )
    .returning();
  return rows[0] ?? null;
}
