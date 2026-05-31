/**
 * One-off seed script — bulk-load gold spot CSV (FreeGoldAPI / World Bank
 * extract) into indicator_observations (series_id = "GOLD_SPOT").
 *
 * Idempotent: re-runs upsert on the (series_id, observation_date) unique index.
 *
 * Usage:
 *    node --env-file=.env ./node_modules/.bin/tsx lib/scripts/seed-gold.ts
 *
 * CSV format (data/extracted/gold_freegoldapi.csv):
 *   "date","price_usd","source"
 *   "2021-01-01","1866.98","worldbank"
 *   ...
 *
 * Note: extract is mixed-cadence (monthly pre-2025, daily 2025+) and may be
 * stale. Block 4.1 (Gold YoY) scorer emits a staleness warning when the
 * latest observation is >90 days behind asOfDate.
 */
import fs from "node:fs";
import path from "node:path";
import { sql } from "drizzle-orm";
import { db, pool } from "@/lib/db";
import { indicatorObservations } from "@/shared/schema";

const GOLD_CSV = path.resolve(
  process.cwd(),
  "docs_local/one-drive-macro-screener/data/extracted/gold_freegoldapi.csv",
);

type Row = { observationDate: string; value: number; source: string };

function unquote(s: string): string {
  return s.trim().replace(/^"|"$/g, "");
}

function parseCsv(text: string): Row[] {
  const out: Row[] = [];
  // Strip BOM if present.
  const clean = text.replace(/^\uFEFF/, "");
  const lines = clean.split(/\r?\n/);
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cols = line.split(",");
    if (cols.length < 2) continue;
    const observationDate = unquote(cols[0]);
    const value = Number(unquote(cols[1]));
    const source = cols[2] ? unquote(cols[2]) : "FreeGoldAPI";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(observationDate)) continue;
    if (!Number.isFinite(value)) continue;
    out.push({ observationDate, value, source });
  }
  return out;
}

async function main() {
  console.log(`[seed-gold] reading ${GOLD_CSV}`);
  const text = fs.readFileSync(GOLD_CSV, "utf8");
  const rows = parseCsv(text);
  console.log(`[seed-gold] parsed ${rows.length} rows`);

  if (rows.length === 0) {
    console.log("[seed-gold] nothing to insert");
    return;
  }

  const BATCH = 500;
  let written = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const slice = rows.slice(i, i + BATCH);
    await db
      .insert(indicatorObservations)
      .values(
        slice.map((r) => ({
          seriesId: "GOLD_SPOT",
          observationDate: r.observationDate,
          value: String(r.value),
          source: r.source,
        })),
      )
      .onConflictDoUpdate({
        target: [indicatorObservations.seriesId, indicatorObservations.observationDate],
        set: {
          value: sql`excluded."value"`,
          source: sql`excluded."source"`,
          fetchedAt: sql`now()`,
        },
      });
    written += slice.length;
    process.stdout.write(`[seed-gold] upserted ${written}/${rows.length}\r`);
  }
  console.log(`\n[seed-gold] done: ${written} rows upserted into indicator_observations`);
}

main()
  .catch((err) => {
    console.error("[seed-gold] failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
