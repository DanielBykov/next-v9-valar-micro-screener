import { NextResponse } from "next/server";
import { BLOCKS } from "@/lib/scoring/registry";

/**
 * GET /api/admin/engine/metadata
 *
 * Returns the full scoring registry — block definitions, scorer metadata,
 * bands, examples, and formulas. Pure metadata, no DB access.
 *
 * `test` functions on bands are not JSON-serialisable and are stripped out;
 * `rangeLabel` is the human-readable equivalent.
 */
export async function GET() {
  try {
    const blocks = BLOCKS.slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((block) => ({
        key: block.key,
        name: block.name,
        sortOrder: block.sortOrder,
        regimeMap: block.regimeMap,
        scorers: block.scorers.map((scorer) => ({
          key: scorer.key,
          name: scorer.name,
          blockKey: scorer.blockKey,
          unit: scorer.unit,
          description: scorer.description,
          formula: scorer.formula,
          formulaPretty: scorer.formulaPretty,
          inputs: scorer.inputs,
          bands: scorer.bands.map((b) => ({
            score: b.score,
            label: b.label,
            rangeLabel: b.rangeLabel,
            interpretation: b.interpretation,
          })),
          examples: scorer.examples,
        })),
      }));

    return NextResponse.json({ blocks });
  } catch (err: any) {
    return NextResponse.json(
      { message: err?.message ?? "Failed to load engine metadata" },
      { status: 500 },
    );
  }
}
