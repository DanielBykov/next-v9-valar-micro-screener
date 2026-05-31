/**
 * One-off seed script — bulk-load Block 3 manual CSVs into
 * indicator_manual_inputs. Idempotent (upserts on series_id+observation_date).
 *
 * Series loaded:
 *   - PUT_CALL_RATIO         (3.2)  V1 placeholder: stores constant 0.85 (neutral band)
 *   - FEAR_GREED_INDEX       (3.3)  cnn_index_value (0–100)
 *   - AAII_SPREAD            (3.4)  spread_4wk_ma × 100 (percent)
 *   - S5TH_PCT_ABOVE_200DMA  (3.5)  pct_above_200dma (raw %)
 *
 * Usage:
 *   node --env-file=.env ./node_modules/.bin/tsx lib/scripts/seed-block3-manual.ts
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
 * Minimal CSV parser for the Block-3 manual files. Handles:
 *   - Leading UTF-8 BOM
 *   - Quoted "cells" with no embedded commas/quotes (matches actual data shape)
 *   - Empty cells (preserved as empty string)
 *
 * Does NOT handle: embedded commas inside quotes, escaped quotes. None of the
 * Block 3 manual CSVs use those.
 */
function parseCsv(text: string): CsvRow[] {
  // Strip UTF-8 BOM if present.
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

/**
 * Build the rows to upsert for each manual series. Returns a flat list ready
 * for a single batched insert.
 */
function buildRows(): ManualRow[] {
  const out: ManualRow[] = [];

  // --- 3.2 Put/Call Ratio (V1 placeholder constant) -------------------
  // Real Tiingo/CBOE data not yet ingested. Store a constant 0.85 (Neutral
  // band) so the scorer reliably reports score 3 + its placeholder warning.
  const putCall = readCsv("indicator_3.2_put_call_ratio/daily.csv");
  for (const row of putCall) {
    const date = row.date;
    if (!date) continue;
    out.push({
      seriesId: "PUT_CALL_RATIO",
      observationDate: date,
      value: 0.85,
      note: "MVP placeholder — Tiingo P/C feed pending",
    });
  }

  // --- 3.3 Fear & Greed (cnn_index_value, 0–100) ----------------------
  const fng = readCsv("indicator_3.3_fear_greed/daily.csv");
  for (const row of fng) {
    const date = row.date;
    const raw = row.cnn_index_value;
    if (!date || !raw) continue;
    const v = Number(raw);
    if (!Number.isFinite(v)) continue;
    out.push({ seriesId: "FEAR_GREED_INDEX", observationDate: date, value: v });
  }

  // --- 3.4 AAII Spread (spread_4wk_ma × 100, percent) -----------------
  const aaii = readCsv("indicator_3.4_aaii_sentiment/daily.csv");
  for (const row of aaii) {
    const date = row.date;
    const raw = row.spread_4wk_ma;
    if (!date || raw === "" || raw == null) continue;
    const fraction = Number(raw);
    if (!Number.isFinite(fraction)) continue;
    out.push({
      seriesId: "AAII_SPREAD",
      observationDate: date,
      value: fraction * 100, // convert fraction (-0.21) → percent (-21.0)
    });
  }

  // --- 3.5 Market Breadth (pct_above_200dma, percent) -----------------
  // Early rows are placeholder-empty (score=3 with no raw); skip those.
  const breadth = readCsv("indicator_3.5_market_breadth/daily.csv");
  for (const row of breadth) {
    const date = row.date;
    const raw = row.pct_above_200dma;
    if (!date || !raw) continue; // skip empty/placeholder rows
    const v = Number(raw);
    if (!Number.isFinite(v)) continue;
    out.push({ seriesId: "S5TH_PCT_ABOVE_200DMA", observationDate: date, value: v });
  }

  return out;
}

async function main() {
  const rows = buildRows();
  const bySeries: Record<string, number> = {};
  for (const r of rows) bySeries[r.seriesId] = (bySeries[r.seriesId] ?? 0) + 1;
  console.log("[seed-block3-manual] rows by series:", bySeries);

  if (rows.length === 0) {
    console.log("[seed-block3-manual] nothing to insert");
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
    process.stdout.write(`[seed-block3-manual] upserted ${written}/${rows.length}\r`);
  }
  console.log(`\n[seed-block3-manual] done: ${written} rows upserted into indicator_manual_inputs`);
}

main()
  .catch((err) => {
    console.error("[seed-block3-manual] failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
