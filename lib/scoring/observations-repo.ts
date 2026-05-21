import { and, desc, gte, inArray, lte } from "drizzle-orm";
import { db } from "@/lib/db";
import { indicatorObservations } from "@/shared/schema";
import type { BlockDefinition, ObservationsByseries } from "@/lib/scoring/types";
import { daysAgo, toIsoDate } from "@/lib/scoring/helpers";

/**
 * Load all observations needed to score a single block as of a given date.
 *
 * Unions the input specs from every scorer in the block, queries
 * indicator_observations once per series range, and returns observations
 * grouped by series_id and sorted by observation_date DESC.
 */
export async function loadObservationsForBlock(
  def: BlockDefinition,
  asOfDate: Date,
): Promise<ObservationsByseries> {
  const maxLookbackBySeries = new Map<string, number>();
  for (const scorer of def.scorers) {
    for (const spec of scorer.inputs) {
      const prev = maxLookbackBySeries.get(spec.seriesId) ?? 0;
      if (spec.lookbackDays > prev) {
        maxLookbackBySeries.set(spec.seriesId, spec.lookbackDays);
      }
    }
  }

  if (maxLookbackBySeries.size === 0) {
    return {};
  }

  const seriesIds = Array.from(maxLookbackBySeries.keys());
  const earliest = Math.max(...Array.from(maxLookbackBySeries.values()));
  const startDate = toIsoDate(daysAgo(asOfDate, earliest));
  const endDate = toIsoDate(asOfDate);

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
  for (const seriesId of seriesIds) {
    grouped[seriesId] = [];
  }
  for (const row of rows) {
    (grouped[row.seriesId] ??= []).push(row);
  }
  return grouped;
}
