import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { indicatorObservations, type InsertIndicatorObservation } from "@/shared/schema";
import { SERIES_BY_BLOCK, type BlockKey } from "@/lib/fred/series-catalog";

const FRED_SOURCE = "FRED";
const FRED_MISSING_VALUE = ".";
const DEFAULT_LOOKBACK_DAYS = 90;
const FRED_REQUEST_DELAY_MS = 600;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type FredObservation = {
  date: string;
  value: string;
};

export type FetchSeriesResult = {
  seriesId: string;
  observations: FredObservation[];
};

export type SeriesResultSummary = {
  seriesId: string;
  status: "ok" | "error";
  count: number;
  error?: string;
};

export type FetchAndStoreBlockResult = {
  block: BlockKey;
  start: string;
  end: string;
  totalStored: number;
  results: SeriesResultSummary[];
};

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function defaultRange(): { start: string; end: string } {
  const end = new Date();
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - DEFAULT_LOOKBACK_DAYS);
  return { start: toIsoDate(start), end: toIsoDate(end) };
}

function buildFredUrl(seriesId: string, apiKey: string, start: string, end: string): string {
  const url = new URL("https://api.stlouisfed.org/fred/series/observations");
  url.searchParams.set("series_id", seriesId);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("file_type", "json");
  url.searchParams.set("observation_start", start);
  url.searchParams.set("observation_end", end);
  return url.toString();
}

function getApiKey(): string {
  const apiKey = process.env.FRED_API;
  if (!apiKey) {
    throw new Error("FRED_API env var is not set");
  }
  return apiKey;
}

export async function fetchSeriesObservations(
  seriesId: string,
  start: string,
  end: string,
): Promise<FetchSeriesResult> {
  const apiKey = getApiKey();
  const url = buildFredUrl(seriesId, apiKey, start, end);

  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`FRED API error for ${seriesId}: ${res.status} - ${text}`);
  }

  const data = (await res.json()) as { observations?: Array<{ date: string; value: string }> };
  const observations = Array.isArray(data.observations) ? data.observations : [];

  return {
    seriesId,
    observations: observations.map((o) => ({ date: o.date, value: o.value })),
  };
}

async function upsertSeriesObservations(
  seriesId: string,
  observations: FredObservation[],
): Promise<number> {
  const rows: InsertIndicatorObservation[] = observations
    .filter((o) => o.value !== FRED_MISSING_VALUE && o.value !== "" && o.value != null)
    .map((o) => ({
      seriesId,
      observationDate: o.date,
      value: o.value,
      source: FRED_SOURCE,
    }));

  if (rows.length === 0) {
    return 0;
  }

  await db
    .insert(indicatorObservations)
    .values(rows)
    .onConflictDoUpdate({
      target: [indicatorObservations.seriesId, indicatorObservations.observationDate],
      set: {
        value: sql`excluded."value"`,
        fetchedAt: sql`now()`,
      },
    });

  return rows.length;
}

export type FetchAndStoreAllResult = {
  block: "all";
  start: string;
  end: string;
  totalStored: number;
  results: SeriesResultSummary[];
};

export async function fetchAndStoreAllBlocks(
  start?: string,
  end?: string,
): Promise<FetchAndStoreAllResult> {
  const blockKeys = Object.keys(SERIES_BY_BLOCK) as BlockKey[];
  const summaries: FetchAndStoreBlockResult[] = [];
  for (const key of blockKeys) {
    summaries.push(await fetchAndStoreBlock(key, start, end));
  }

  const results = summaries.flatMap((s) => s.results);
  const totalStored = summaries.reduce((sum, s) => sum + s.totalStored, 0);

  return {
    block: "all",
    start: summaries[0]?.start ?? "",
    end: summaries[0]?.end ?? "",
    totalStored,
    results,
  };
}

export async function fetchAndStoreBlock(
  blockKey: BlockKey,
  start?: string,
  end?: string,
): Promise<FetchAndStoreBlockResult> {
  const seriesList = SERIES_BY_BLOCK[blockKey];
  if (!seriesList) {
    throw new Error(`Unknown block key: ${blockKey}`);
  }

  const range = start && end ? { start, end } : defaultRange();
  const effectiveStart = start ?? range.start;
  const effectiveEnd = end ?? range.end;

  const results: SeriesResultSummary[] = [];
  let totalStored = 0;

  for (let i = 0; i < seriesList.length; i++) {
    const seriesId = seriesList[i];
    if (i > 0) await delay(FRED_REQUEST_DELAY_MS);
    try {
      const fetched = await fetchSeriesObservations(seriesId, effectiveStart, effectiveEnd);
      const count = await upsertSeriesObservations(seriesId, fetched.observations);
      totalStored += count;
      results.push({ seriesId, status: "ok", count });
    } catch (err) {
      results.push({
        seriesId,
        status: "error",
        count: 0,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return {
    block: blockKey,
    start: effectiveStart,
    end: effectiveEnd,
    totalStored,
    results,
  };
}
