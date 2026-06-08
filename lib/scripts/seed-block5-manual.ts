/**
 * One-off seed script — bulk-load Block 5 manual CSVs into
 * indicator_manual_inputs. Idempotent (upserts on series_id+observation_date).
 *
 * Series loaded:
 *   - ISM_MFG_PMI               (5.1)  ism_pmi (index level)
 *   - CB_LEI_YOY                (5.2)  lei_yoy (% YoY, pre-computed, handles rebase)
 *   - IWM_SPY_RATIO_90D_PCT     (5.3)  ratio_90d_pct (pre-computed 90d % change)
 *   - SPYG_SPYV_RATIO_90D_PCT   (5.4)  ratio_90d_pct (pre-computed 90d % change)
 *   - IPO_TRAILING_12M_PROCEEDS (5.6)  trailing_12m_proceeds_bn ($bn)
 *
 * 5.3/5.4 seed the upstream pre-computed `ratio_90d_pct` (computed from
 * continuous daily underlying prices) rather than the raw ratio level —
 * recomputing the 90d window in-code from the mixed-cadence ratio series
 * diverges from the validated source-of-truth score.
 *
 * 5.5 (High Yield Spread, BAMLH0A0HYM2) is a FRED series — fetched via
 * /api/admin/fetch-indicators?block=business_cycle, not seeded here.
 *
 * Rows with an empty value column (placeholder windows in 5.3/5.4/5.6) are
 * skipped — the scorer reports "missing" until real data starts.
 *
 * Usage:
 *   node --env-file=.env ./node_modules/.bin/tsx lib/scripts/seed-block5-manual.ts
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
 * Minimal CSV parser for the Block-5 manual files. Handles a leading UTF-8 BOM
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

function buildRows(): ManualRow[] {
  const out: ManualRow[] = [];

  // --- 5.1 ISM Manufacturing PMI (index level) -----------------------
  pushSeries(out, readCsv("indicator_5.1_ism_pmi/daily.csv"), "ISM_MFG_PMI", "ism_pmi");

  // --- 5.2 LEI (pre-computed YoY %, handles 2016 rebase) -------------
  pushSeries(out, readCsv("indicator_5.2_lei/daily.csv"), "CB_LEI_YOY", "lei_yoy");

  // --- 5.3 Small vs Large (pre-computed 90d % change) ---------------
  pushSeries(
    out,
    readCsv("indicator_5.3_small_large/daily.csv"),
    "IWM_SPY_RATIO_90D_PCT",
    "ratio_90d_pct",
  );

  // --- 5.4 Growth vs Value (pre-computed 90d % change) --------------
  pushSeries(
    out,
    readCsv("indicator_5.4_growth_value/daily.csv"),
    "SPYG_SPYV_RATIO_90D_PCT",
    "ratio_90d_pct",
  );

  // --- 5.6 IPO Activity (12M-trailing proceeds, $bn) ----------------
  pushSeries(
    out,
    readCsv("indicator_5.6_ipo_activity/daily.csv"),
    "IPO_TRAILING_12M_PROCEEDS",
    "trailing_12m_proceeds_bn",
  );

  return out;
}

async function main() {
  const rows = buildRows();
  const bySeries: Record<string, number> = {};
  for (const r of rows) bySeries[r.seriesId] = (bySeries[r.seriesId] ?? 0) + 1;
  console.log("[seed-block5-manual] rows by series:", bySeries);

  if (rows.length === 0) {
    console.log("[seed-block5-manual] nothing to insert");
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
    process.stdout.write(`[seed-block5-manual] upserted ${written}/${rows.length}\r`);
  }
  console.log(`\n[seed-block5-manual] done: ${written} rows upserted into indicator_manual_inputs`);
}

main()
  .catch((err) => {
    console.error("[seed-block5-manual] failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
