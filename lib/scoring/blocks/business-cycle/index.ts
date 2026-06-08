import { GrowthVsValueScorer } from "@/lib/scoring/blocks/business-cycle/growth-vs-value";
import { HighYieldSpreadScorer } from "@/lib/scoring/blocks/business-cycle/high-yield-spread";
import { IpoActivityScorer } from "@/lib/scoring/blocks/business-cycle/ipo-activity";
import { IsmPmiScorer } from "@/lib/scoring/blocks/business-cycle/ism-pmi";
import { LeiYoyScorer } from "@/lib/scoring/blocks/business-cycle/lei-yoy";
import { SmallVsLargeScorer } from "@/lib/scoring/blocks/business-cycle/small-vs-large";
import type { BlockDefinition, BlockRegimeMapping } from "@/lib/scoring/types";

/**
 * Block 5 regime mapping (block_avg → label).
 *
 * Direction: Block 5 reads *where the US business cycle sits*. High score =
 * early/mid expansion (firm PMIs, positive LEI, small-cap & cyclical
 * leadership, tight credit, healthy IPO pace). Low score = contraction
 * (sub-50 PMIs, negative LEI, defensive rotation, wide HY spreads, frozen
 * capital markets).
 *
 * Source: docs_local/.../scoring-engine/block-5-business-cycle.md
 *         "Block Average → Interpretation" table.
 */
const REGIME_MAP: BlockRegimeMapping[] = [
  {
    label: "RECESSION / CONTRACTION",
    min: 1.0,
    max: 1.8,
    interpretation:
      "PMIs deep <50, LEI deeply negative, defensive rotation, HY spreads " +
      ">800bps, capital markets frozen. Cycle-bottom or active recession.",
  },
  {
    label: "LATE CYCLE / SLOWDOWN",
    min: 1.9,
    max: 2.5,
    interpretation:
      "PMIs slipping, LEI weak, large-cap and growth defensive leadership, " +
      "credit widening. Quality + defensives over cyclicals.",
  },
  {
    label: "MID-CYCLE / MIXED",
    min: 2.6,
    max: 3.4,
    interpretation:
      "Survey data steady ~50, LEI flat, rotation balanced, credit normal. " +
      "Stock-picking matters more than top-down.",
  },
  {
    label: "HEALTHY EXPANSION",
    min: 3.5,
    max: 4.2,
    interpretation:
      "PMIs >51, LEI positive, broad participation, tight credit, healthy IPO " +
      "pace. Cyclicals lead, small-caps participate, value/growth balanced.",
  },
  {
    label: "EARLY CYCLE / RECOVERY BOOM",
    min: 4.3,
    max: 5.0,
    interpretation:
      "Strong survey expansion, LEI accelerating, small-cap and cyclical " +
      "leadership, very tight HY spreads, IPO boom (frothy-extreme caveat). " +
      "Maximum cyclical tailwind.",
  },
];

function regimeFor(blockAverage: number): string {
  const found = REGIME_MAP.find((r) => blockAverage >= r.min && blockAverage <= r.max);
  return found?.label ?? "UNKNOWN";
}

/**
 * Block 5 — Business Cycle & Rotation.
 *
 * Scorers (ordered by intra-block weight, descending):
 *   - ism_pmi            (25%)  ISM_MFG_PMI — manual (press-release headline)
 *   - lei_yoy            (25%)  CB_LEI_YOY — manual (pre-computed YoY, handles rebase)
 *   - high_yield_spread  (25%)  BAMLH0A0HYM2 — FRED (OAS %, ×100 → bps, descending)
 *   - small_vs_large     (10%)  IWM_SPY_RATIO — manual (90-day % change)
 *   - growth_vs_value    (10%)  SPYG_SPYV_RATIO — manual (90-day % change)
 *   - ipo_activity       (5%)   IPO_TRAILING_12M_PROCEEDS — manual (linear ascending)
 *
 * Block weight in total Macro Pulse Score: 25%.
 */
export const businessCycleBlock: BlockDefinition = {
  key: "business_cycle",
  name: "Business Cycle & Rotation",
  sortOrder: 4,
  weight: 25,
  scorers: [
    new IsmPmiScorer(),
    new LeiYoyScorer(),
    new HighYieldSpreadScorer(),
    new SmallVsLargeScorer(),
    new GrowthVsValueScorer(),
    new IpoActivityScorer(),
  ],
  regimeMap: REGIME_MAP,
  regimeFor,
};
