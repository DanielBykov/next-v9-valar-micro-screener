import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getManualSeriesCatalog } from "@/lib/scoring/manual-inputs-catalog";
import {
  deleteManualInput,
  listAllManualInputs,
  listManualInputs,
  upsertManualInput,
} from "@/lib/scoring/manual-inputs-repo";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * GET /api/admin/manual-inputs
 *   ?series=NFP_CONSENSUS  → entries for one series (limit 50)
 *   (no params)            → { catalog, recent } across all manual series
 */
export async function GET(request: NextRequest) {
  const denied = await requireAuth(request);
  if (denied) return denied;

  const series = request.nextUrl.searchParams.get("series");
  if (series) {
    const entries = await listManualInputs(series, 100);
    return NextResponse.json({ seriesId: series, entries });
  }

  const catalog = getManualSeriesCatalog();
  const recent = await listAllManualInputs(200);
  return NextResponse.json({ catalog, recent });
}

/**
 * POST /api/admin/manual-inputs
 * Body: { seriesId, observationDate, value, note? }
 * Upserts on (seriesId, observationDate).
 */
export async function POST(request: NextRequest) {
  const denied = await requireAuth(request);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON body" }, { status: 400 });
  }

  const { seriesId, observationDate, value, note } = (body ?? {}) as Record<string, unknown>;

  if (typeof seriesId !== "string" || seriesId.trim() === "") {
    return NextResponse.json({ message: "seriesId is required" }, { status: 400 });
  }
  if (typeof observationDate !== "string" || !ISO_DATE_RE.test(observationDate)) {
    return NextResponse.json(
      { message: "observationDate must be in YYYY-MM-DD format" },
      { status: 400 },
    );
  }
  const valueNum = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(valueNum)) {
    return NextResponse.json({ message: "value must be a finite number" }, { status: 400 });
  }

  // Reject series not declared as manual anywhere in the registry — prevents
  // creating orphan rows from typos.
  const catalog = getManualSeriesCatalog();
  if (!catalog.some((s) => s.seriesId === seriesId)) {
    return NextResponse.json(
      { message: `Series '${seriesId}' is not declared as a manual input by any scorer` },
      { status: 400 },
    );
  }

  try {
    const row = await upsertManualInput({
      seriesId,
      observationDate,
      value: String(valueNum),
      note: typeof note === "string" ? note : null,
    });
    return NextResponse.json({ entry: row });
  } catch (err: any) {
    return NextResponse.json(
      { message: err?.message ?? "Failed to upsert manual input" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/admin/manual-inputs?series=…&date=YYYY-MM-DD
 */
export async function DELETE(request: NextRequest) {
  const denied = await requireAuth(request);
  if (denied) return denied;

  const seriesId = request.nextUrl.searchParams.get("series");
  const observationDate = request.nextUrl.searchParams.get("date");

  if (!seriesId) {
    return NextResponse.json({ message: "series query param is required" }, { status: 400 });
  }
  if (!observationDate || !ISO_DATE_RE.test(observationDate)) {
    return NextResponse.json(
      { message: "date query param must be in YYYY-MM-DD format" },
      { status: 400 },
    );
  }

  try {
    const deleted = await deleteManualInput(seriesId, observationDate);
    if (!deleted) {
      return NextResponse.json(
        { message: "No matching manual input to delete" },
        { status: 404 },
      );
    }
    return NextResponse.json({ entry: deleted });
  } catch (err: any) {
    return NextResponse.json(
      { message: err?.message ?? "Failed to delete manual input" },
      { status: 500 },
    );
  }
}
