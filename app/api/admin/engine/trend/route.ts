import { NextRequest, NextResponse } from "next/server";
import { BlockEngine } from "@/lib/scoring/block-engine";
import { daysAgo, toIsoDate } from "@/lib/scoring/helpers";
import { getBlockByKey, getScorerByKey } from "@/lib/scoring/registry";

const MIN_DAYS = 1;
const MAX_DAYS = 1000;
const DEFAULT_DAYS = 400;

/**
 * GET /api/admin/engine/trend?indicator=KEY&days=400
 *
 * Returns the historical score series for a single indicator: one data point
 * per calendar day going back `days` from today. Each point includes the
 * computed score and the raw value at that date.
 *
 * Only the block that owns the indicator is computed — not the full snapshot.
 */
export async function GET(request: NextRequest) {
  const indicatorKey = request.nextUrl.searchParams.get("indicator");
  const daysParam = request.nextUrl.searchParams.get("days");

  if (!indicatorKey) {
    return NextResponse.json(
      { message: "indicator query param is required" },
      { status: 400 },
    );
  }

  const scorer = getScorerByKey(indicatorKey);
  if (!scorer) {
    return NextResponse.json(
      { message: `Unknown indicator: ${indicatorKey}` },
      { status: 404 },
    );
  }

  const block = getBlockByKey(scorer.blockKey);
  if (!block) {
    return NextResponse.json(
      { message: `Indicator ${indicatorKey} has no parent block` },
      { status: 500 },
    );
  }

  let days = DEFAULT_DAYS;
  if (daysParam !== null) {
    const parsed = Number(daysParam);
    if (!Number.isInteger(parsed) || parsed < MIN_DAYS || parsed > MAX_DAYS) {
      return NextResponse.json(
        { message: `days must be an integer between ${MIN_DAYS} and ${MAX_DAYS}` },
        { status: 400 },
      );
    }
    days = parsed;
  }

  try {
    const today = new Date();
    const dates: Date[] = [];
    for (let i = days - 1; i >= 0; i--) {
      dates.push(daysAgo(today, i));
    }

    const engine = new BlockEngine(block);
    const blockResults = await Promise.all(dates.map((d) => engine.scoreBlock(d)));

    const points = blockResults.map((br) => {
      const indicator = br.indicators.find((i) => i.indicatorKey === indicatorKey);
      return {
        date: br.asOfDate,
        score: indicator?.score ?? null,
        rawValue: indicator?.rawValue ?? null,
        bandLabel: indicator?.bandLabel ?? null,
        warning: indicator?.warning,
      };
    });

    return NextResponse.json({
      indicatorKey,
      blockKey: block.key,
      from: toIsoDate(dates[0]),
      to: toIsoDate(dates[dates.length - 1]),
      days,
      points,
    });
  } catch (err: any) {
    return NextResponse.json(
      { message: err?.message ?? "Failed to compute trend" },
      { status: 500 },
    );
  }
}
