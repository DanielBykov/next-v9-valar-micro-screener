import { CopperScorer } from "@/lib/scoring/blocks/commodities-global/copper";
import { DtwexbgsScorer } from "@/lib/scoring/blocks/commodities-global/dtwexbgs";
import { GlobalPmiScorer } from "@/lib/scoring/blocks/commodities-global/global-pmi";
import { GoldYoyScorer } from "@/lib/scoring/blocks/commodities-global/gold-yoy";
import { OilWtiScorer } from "@/lib/scoring/blocks/commodities-global/oil-wti";
import { TreasuryLiquidityScorer } from "@/lib/scoring/blocks/commodities-global/treasury-liquidity";
import type { BlockDefinition, BlockRegimeMapping } from "@/lib/scoring/types";

/**
 * Block 4 regime mapping (block_avg → label).
 *
 * Direction: Block 4 measures conditions *favourable to risk assets / global
 * growth*. High score = weak USD, contained commodities, expansion PMIs,
 * abundant funding-side liquidity. Low score = strong USD, energy shock,
 * collapsing PMIs, funding stress.
 *
 * Source: docs_local/.../scoring-engine/block-4-commodities-global.md
 *         "Aggregate Block Scoring" table.
 */
const REGIME_MAP: BlockRegimeMapping[] = [
  {
    label: "GLOBAL STRESS",
    min: 1.0,
    max: 1.8,
    interpretation:
      "Strong dollar, oil shock, collapsing copper/PMIs, funding stress. " +
      "Risk-off transmission across geographies; EM under pressure.",
  },
  {
    label: "GLOBAL HEADWINDS",
    min: 1.9,
    max: 2.5,
    interpretation:
      "Dollar firm, energy elevated, manufacturing slowing. EM and " +
      "commodity exporters struggle; defensive bias warranted.",
  },
  {
    label: "MIXED GLOBAL SIGNALS",
    min: 2.6,
    max: 3.4,
    interpretation:
      "Cross-currents with no dominant theme. Stockpicking environment; " +
      "global macro is not the driver.",
  },
  {
    label: "GLOBAL EXPANSION",
    min: 3.5,
    max: 4.2,
    interpretation:
      "Weak-to-moderate USD, contained commodities, expansion PMIs. " +
      "Constructive backdrop for risk assets globally.",
  },
  {
    label: "GLOBAL BOOM",
    min: 4.3,
    max: 5.0,
    interpretation:
      "Maximum global liquidity, broad expansion, risk-on across " +
      "geographies. Watch for late-cycle excesses.",
  },
];

function regimeFor(blockAverage: number): string {
  const found = REGIME_MAP.find((r) => blockAverage >= r.min && blockAverage <= r.max);
  return found?.label ?? "UNKNOWN";
}

/**
 * Block 4 — Commodities & Global Flow.
 *
 * Scorers (ordered by intra-block weight, descending):
 *   - dtwexbgs           (30%)  DTWEXBGS — FRED (Nominal Broad USD Index)
 *   - oil_wti            (20%)  DCOILWTICO — FRED
 *   - global_pmi         (15%)  GLOBAL_MFG_PMI — manual (S&P Global press release)
 *   - treasury_liquidity (15%)  SOFR − IORB — FRED composite
 *   - gold_yoy           (10%)  GOLD_SPOT — seeded (FreeGoldAPI extract), 12M YoY
 *   - copper             (10%)  PCOPPUSDM — FRED (LME monthly, MT→lb conversion)
 *
 * Block weight in total Macro Pulse Score: 15%.
 */
export const commoditiesGlobalBlock: BlockDefinition = {
  key: "commodities_global",
  name: "Commodities & Global Flow",
  sortOrder: 3,
  weight: 15,
  scorers: [
    new DtwexbgsScorer(),
    new OilWtiScorer(),
    new GlobalPmiScorer(),
    new TreasuryLiquidityScorer(),
    new GoldYoyScorer(),
    new CopperScorer(),
  ],
  regimeMap: REGIME_MAP,
  regimeFor,
};
