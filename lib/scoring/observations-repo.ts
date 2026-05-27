import { and, desc, gte, inArray, lte } from "drizzle-orm";
import { db } from "@/lib/db";
import { indicatorObservations } from "@/shared/schema";
import type { BlockDefinition, ObservationsByseries } from "@/lib/scoring/types";
import { daysAgo, toIsoDate } from "@/lib/scoring/helpers";
import {
  loadManualInputsForBlock,
  loadManualInputsForBlockOverRange,
} from "@/lib/scoring/manual-inputs-repo";

/**
 * Collect (seriesId → maxLookbackDays) for FRED-sourced inputs only.
 * Manual inputs are loaded separately via the manual-inputs repo and merged in.
 */
function fredSeriesLookbacks(def: BlockDefinition): Map<string, number> {
  const out = new Map<string, number>();
  for (const scorer of def.scorers) {
    for (const spec of scorer.inputs) {
      if (spec.source === "manual") continue;
      const prev = out.get(spec.seriesId) ?? 0;
      if (spec.lookbackDays > prev) out.set(spec.seriesId, spec.lookbackDays);
    }
  }
  return out;
}

async function loadFredObservations(
  lookbacks: Map<string, number>,
  startAsOf: Date,
  endAsOf: Date,
  startExtraDays: number,
): Promise<ObservationsByseries> {
  if (lookbacks.size === 0) return {};
  const seriesIds = Array.from(lookbacks.keys());
  const maxLookback = Math.max(...Array.from(lookbacks.values()), startExtraDays);
  const startDate = toIsoDate(daysAgo(startAsOf, maxLookback));
  const endDate = toIsoDate(endAsOf);

  const rows = await db
    .select()
    .from(indicatorObservations)
    .where(
      and(
        inArray(indicatorObservations.seriesId, seriesIds),
        gte(indicatorObservations.observationDate, startDate),
        lte(indicatorObservations.observationDate, endDate),
      ),
    )
    .orderBy(desc(indicatorObservations.observationDate));

  const grouped: ObservationsByseries = {};
  for (const seriesId of seriesIds) grouped[seriesId] = [];
  for (const row of rows) {
    (grouped[row.seriesId] ??= []).push(row);
  }
  return grouped;
}

/**
 * Load all observations needed to score a single block as of a given date.
 *
 * Unions FRED-backed inputs (indicator_observations) and analyst-backed inputs
 * (indicator_manual_inputs) queried in parallel, returned as ObservationsByseries
 * sorted by observation_date DESC per series. Scorers consume both via the same
 * input.observations[seriesId] lookup; the source distinction is invisible at
 * compute time.
 */
export async function loadObservationsForBlock(
  def: BlockDefinition,
  asOfDate: Date,
): Promise<ObservationsByseries> {
  const fredLookbacks = fredSeriesLookbacks(def);

  const [fredGrouped, manualGrouped] = await Promise.all([
    loadFredObservations(fredLookbacks, asOfDate, asOfDate, 0),
    loadManualInputsForBlock(def, asOfDate),
  ]);

  return { ...fredGrouped, ...manualGrouped };
}

/**
 * Load every observation a block could need to score any date in
 * [fromDate, toDate]. Extends the lower bound by the block's largest
 * lookbackDays so even the earliest date has its full history.
 *
 * Returns observations grouped by series_id and DESC-sorted by date —
 * the same shape `BlockEngine.scoreBlockWith` expects. Callers are
 * responsible for slicing per-date subsets (see `BlockEngine.scoreBlockRange`).
 *
 * Used by the trend endpoint to replace N per-date queries with one.
 */
export async function loadObservationsForBlockOverRange(
  def: BlockDefinition,
  fromDate: Date,
  toDate: Date,
): Promise<ObservationsByseries> {
  const fredLookbacks = fredSeriesLookbacks(def);

  const [fredGrouped, manualGrouped] = await Promise.all([
    loadFredObservations(fredLookbacks, fromDate, toDate, 0),
    loadManualInputsForBlockOverRange(def, fromDate, toDate),
  ]);

  return { ...fredGrouped, ...manualGrouped };
}
