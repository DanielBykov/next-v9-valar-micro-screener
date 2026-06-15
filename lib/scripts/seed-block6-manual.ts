/**
 * One-off seed script — bulk-load Block 6 manual CSVs into
 * indicator_manual_inputs. Idempotent (upserts on series_id+observation_date).
 *
 * Series loaded:
 *   - EPU_CHINA        (6.1)  pre-scored 1–5 (China–US Tension)
 *   - GPR_MONTHLY      (6.3)  pre-scored 1–5 (Geopolitical Risk Index)
 *   - GLOBAL_EASING    (6.6)  pre-scored 1–5 (Global Easing/Tightening)
 *   - GDELT_FEAR_TONE  (6.4)  raw daily GDELT tone (banded in-code by the scorer)
 *
 * Not seeded here:
 *   - USEPUINDXM       (6.2)  FRED series — fetched via
 *                             /api/admin/fetch-indicators?block=political_narrative
 *   - SANCTIONS_ACTIVITY (6.5) event-scored; no backfill data. The scorer
 *                             defaults to 3 (Routine Enforcement) until an
 *                             analyst seeds an event row.
 *
 * 6.1/6.3/6.6 store the final score in a `score` column; we seed that directly
 * (pass-through scorers). 6.4 stores raw `tone` with YYYYMMDD dates — we
 * normalise the date to YYYY-MM-DD and skip zero-tone rows (weekend / low-volume
 * gaps per the indicator README; the scorer forward-fills via its lookback).
 *
 * Usage:
 *   node --env-file=.env ./node_modules/.bin/tsx lib/scripts/seed-block6-manual.ts
 */
import fs from "node:fs";
import path from "node:path";
import { sql } from "drizzle-orm";
import { db, pool } from "@/lib/db";
import { indicatorManualInputs } from "@/shared/schema";

type CsvRow = Record<string, string>;
type ManualRow = { seriesId: string; observationDate: string; value: number; note?: string };

const BASE = path.resolve(process.cwd(), "docs_local/one-drive-macro-screener/data/manual");

/**
 * Minimal CSV parser for the Block-6 manual files. Handles a leading UTF-8 BOM
 * and quoted cells with no embedded commas/quotes (matches the actual data).
 */
function parseCsv(text: string): CsvRow[] {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length === 0) return [];
  const headers = splitLine(lines[0]);
  const rows: CsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = splitLine(lines[i]);
    const row: CsvRow = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = cells[j] ?? "";
    }
    rows.push(row);
  }
  return rows;
}

function splitLine(line: string): string[] {
  return line.split(",").map((c) => c.replace(/^"|"$/g, ""));
}

function readCsv(rel: string): CsvRow[] {
  const full = path.join(BASE, rel);
  return parseCsv(fs.readFileSync(full, "utf8"));
}

/** Push one (date, valueColumn) series, skipping empty/non-numeric values. */
function pushSeries(
  out: ManualRow[],
  rows: CsvRow[],
  seriesId: string,
  valueColumn: string,
): void {
  for (const row of rows) {
    const date = row.date;
    const raw = row[valueColumn];
    if (!date || raw === "" || raw == null) continue; // skip placeholder rows
    const v = Number(raw);
    if (!Number.isFinite(v)) continue;
    out.push({ seriesId, observationDate: date, value: v });
  }
}

/** Normalise a YYYYMMDD string to YYYY-MM-DD; returns null if unparseable. */
function normaliseCompactDate(s: string): string | null {
  const m = /^(\d{4})(\d{2})(\d{2})$/.exec(s.trim());
  if (!m) return null;
  return `${m[1]}-${m[2]}-${m[3]}`;
}

/**
 * Push the GDELT raw-tone series (6.4). Dates are YYYYMMDD; tone is a float.
 * Zero-tone rows are weekend/low-volume gaps (per the indicator README) and are
 * skipped so the scorer forward-fills from the last real observation.
 */
function pushFearTone(out: ManualRow[], rows: CsvRow[]): void {
  for (const row of rows) {
    const date = normaliseCompactDate(row.date ?? "");
    const raw = row.tone;
    if (!date || raw === "" || raw == null) continue;
    const v = Number(raw);
    if (!Number.isFinite(v) || v === 0) continue; // skip gaps (zero tone)
    out.push({ seriesId: "GDELT_FEAR_TONE", observationDate: date, value: v });
  }
}

function buildRows(): ManualRow[] {
  const out: ManualRow[] = [];

  // --- 6.1 China–US Tension (pre-scored 1–5) ------------------------
  pushSeries(out, readCsv("indicator_6.1_china_us_tension/daily.csv"), "EPU_CHINA", "score");

  // --- 6.3 Geopolitical Risk Index (pre-scored 1–5) -----------------
  pushSeries(out, readCsv("indicator_6.3_gpr/daily.csv"), "GPR_MONTHLY", "score");

  // --- 6.6 Global Easing/Tightening (pre-scored 1–5) ----------------
  pushSeries(out, readCsv("indicator_6.6_global_easing/daily.csv"), "GLOBAL_EASING", "score");

  // --- 6.4 Media Fear (raw GDELT tone; banded in-code) --------------
  pushFearTone(out, readCsv("indicator_6.4_media_fear/raw_tone.csv"));
  pushFearTone(out, readCsv("indicator_6.4_media_fear/new_rows.csv"));

  return out;
}

async function main() {
  const rows = buildRows();
  const bySeries: Record<string, number> = {};
  for (const r of rows) bySeries[r.seriesId] = (bySeries[r.seriesId] ?? 0) + 1;
  console.log("[seed-block6-manual] rows by series:", bySeries);

  if (rows.length === 0) {
    console.log("[seed-block6-manual] nothing to insert");
    return;
  }

  const BATCH = 500;
  let written = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const slice = rows.slice(i, i + BATCH);
    await db
      .insert(indicatorManualInputs)
      .values(
        slice.map((r) => ({
          seriesId: r.seriesId,
          observationDate: r.observationDate,
          value: String(r.value),
          note: r.note ?? null,
        })),
      )
      .onConflictDoUpdate({
        target: [indicatorManualInputs.seriesId, indicatorManualInputs.observationDate],
        set: {
          value: sql`excluded."value"`,
          note: sql`excluded."note"`,
          updatedAt: sql`now()`,
        },
      });
    written += slice.length;
    process.stdout.write(`[seed-block6-manual] upserted ${written}/${rows.length}\r`);
  }
  console.log(`\n[seed-block6-manual] done: ${written} rows upserted into indicator_manual_inputs`);
}

main()
  .catch((err) => {
    console.error("[seed-block6-manual] failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
