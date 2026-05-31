/**
 * One-off seed script — bulk-load CBOE VVIX historical CSV into
 * indicator_observations (series_id = "VVIX", source = "CBOE").
 *
 * Idempotent: re-runs upsert on the (series_id, observation_date) unique index.
 *
 * Usage:
 *   tsx lib/scripts/seed-vvix.ts
 * (or whatever runner the project uses for TS scripts — package.json doesn't
 *  yet declare a script entry; add one if you'll re-run this regularly.)
 *
 * CSV format (data/other/vvix_cboe_full_history.csv):
 *   DATE,VVIX
 *   03/06/2006,71.730000
 *   ...
 */
import fs from "node:fs";
import path from "node:path";
import { sql } from "drizzle-orm";
import { db, pool } from "@/lib/db";
import { indicatorObservations } from "@/shared/schema";

const VVIX_CSV = path.resolve(
  process.cwd(),
  "docs_local/one-drive-macro-screener/data/other/vvix_cboe_full_history.csv",
);

type Row = { observationDate: string; value: number };

/**
 * Convert MM/DD/YYYY → YYYY-MM-DD. Returns null on any parse failure.
 */
function parseUsDate(s: string): string | null {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s.trim());
  if (!m) return null;
  const [, mm, dd, yyyy] = m;
  const month = mm.padStart(2, "0");
  const day = dd.padStart(2, "0");
  return `${yyyy}-${month}-${day}`;
}

function parseCsv(text: string): Row[] {
  const out: Row[] = [];
  const lines = text.split(/\r?\n/);
  // Skip header (line 0) and blank lines.
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cols = line.split(",");
    if (cols.length < 2) continue;
    const observationDate = parseUsDate(cols[0]);
    const value = Number(cols[1]);
    if (!observationDate || !Number.isFinite(value)) continue;
    out.push({ observationDate, value });
  }
  return out;
}

async function main() {
  console.log(`[seed-vvix] reading ${VVIX_CSV}`);
  const text = fs.readFileSync(VVIX_CSV, "utf8");
  const rows = parseCsv(text);
  console.log(`[seed-vvix] parsed ${rows.length} rows`);

  if (rows.length === 0) {
    console.log("[seed-vvix] nothing to insert");
    return;
  }

  // Batch insert with ON CONFLICT DO UPDATE on (series_id, observation_date).
  const BATCH = 500;
  let written = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const slice = rows.slice(i, i + BATCH);
    await db
      .insert(indicatorObservations)
      .values(
        slice.map((r) => ({
          seriesId: "VVIX",
          observationDate: r.observationDate,
          value: String(r.value),
          source: "CBOE",
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
    process.stdout.write(`[seed-vvix] upserted ${written}/${rows.length}\r`);
  }
  console.log(`\n[seed-vvix] done: ${written} rows upserted into indicator_observations`);
}

main()
  .catch((err) => {
    console.error("[seed-vvix] failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
