import { NextRequest, NextResponse } from "next/server";
import { SnapshotEngine } from "@/lib/scoring/snapshot-engine";
import { BLOCKS } from "@/lib/scoring/registry";
import { buildDailyTrend, buildMonthlyTrend } from "@/lib/scoring/trend-builder";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MIN_MONTHS = 1;
const MAX_MONTHS = 24;
const DEFAULT_MONTHS = 12;
const MIN_DAYS = 1;
const MAX_DAYS = 90;
const DEFAULT_DAYS = 30;

/**
 * Parse a YYYY-MM-DD param into a Date anchored to noon ET (so toIsoDate
 * lands on the intended calendar day regardless of server timezone).
 */
function parseAnchor(dateParam: string | null): Date {
  if (!dateParam) return new Date();
  return new Date(`${dateParam}T17:00:00Z`);
}

function parseInt_(
  raw: string | null,
  fallback: number,
  min: number,
  max: number,
): number | { error: string } {
  if (raw === null) return fallback;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    return { error: `must be an integer between ${min} and ${max}` };
  }
  return parsed;
}

/**
 * GET /api/trend?date=YYYY-MM-DD&granularity=monthly|daily&months=12&days=30
 *
 * Live-computes the trailing Macro Pulse trend, oldest → newest. Nothing is
 * persisted. Dates with no underlying data are omitted, so fewer points than
 * requested may be returned.
 *
 * - granularity=monthly (default): one score per calendar month at month-end.
 * - granularity=daily: one score per calendar day at end-of-day.
 */
export async function GET(request: NextRequest) {
  const dateParam = request.nextUrl.searchParams.get("date");
  const granularity = request.nextUrl.searchParams.get("granularity") ?? "monthly";

  if (dateParam && !ISO_DATE_RE.test(dateParam)) {
    return NextResponse.json(
      { message: "date must be in YYYY-MM-DD format" },
      { status: 400 },
    );
  }

  if (granularity !== "monthly" && granularity !== "daily") {
    return NextResponse.json(
      { message: "granularity must be 'monthly' or 'daily'" },
      { status: 400 },
    );
  }

  const anchor = parseAnchor(dateParam);
  if (Number.isNaN(anchor.getTime())) {
    return NextResponse.json({ message: "Invalid date" }, { status: 400 });
  }

  const engine = new SnapshotEngine(BLOCKS);

  try {
    if (granularity === "daily") {
      const days = parseInt_(
        request.nextUrl.searchParams.get("days"),
        DEFAULT_DAYS,
        MIN_DAYS,
        MAX_DAYS,
      );
      if (typeof days !== "number") {
        return NextResponse.json({ message: `days ${days.error}` }, { status: 400 });
      }
      const trend = await buildDailyTrend(engine, anchor, days);
      return NextResponse.json({ trend, granularity });
    }

    const months = parseInt_(
      request.nextUrl.searchParams.get("months"),
      DEFAULT_MONTHS,
      MIN_MONTHS,
      MAX_MONTHS,
    );
    if (typeof months !== "number") {
      return NextResponse.json({ message: `months ${months.error}` }, { status: 400 });
    }
    const trend = await buildMonthlyTrend(engine, anchor, months);
    return NextResponse.json({ trend, granularity });
  } catch (err: any) {
    console.error("Trend API error:", err);
    return NextResponse.json(
      { message: err?.message ?? "Failed to compute trend" },
      { status: 500 },
    );
  }
}
