import { CoreCpiYoyScorer } from "@/lib/scoring/blocks/inflation-labor/core-cpi-yoy";
import { CpiHeadlineYoyScorer } from "@/lib/scoring/blocks/inflation-labor/cpi-headline-yoy";
import { NfpSurpriseScorer } from "@/lib/scoring/blocks/inflation-labor/nfp-surprise";
import { ParticipationRateScorer } from "@/lib/scoring/blocks/inflation-labor/participation-rate";
import { UnemploymentRateScorer } from "@/lib/scoring/blocks/inflation-labor/unemployment-rate";
import { WageGrowthYoyScorer } from "@/lib/scoring/blocks/inflation-labor/wage-growth-yoy";
import type { BlockDefinition, BlockRegimeMapping } from "@/lib/scoring/types";

/**
 * Block 2 regime mapping (block_avg → label).
 * Source: docs_local/.../scoring-engine/block-2-inflation-labor.md, "Aggregate Block Scoring".
 */
const REGIME_MAP: BlockRegimeMapping[] = [
  {
    label: "STAGFLATION RISK",
    min: 1.0,
    max: 1.8,
    interpretation:
      "High/accelerating inflation with deteriorating labor market. Worst case for equities. " +
      "Fed trapped between fighting inflation and supporting growth.",
  },
  {
    label: "OVERHEATING / WEAKENING",
    min: 1.9,
    max: 2.5,
    interpretation:
      "Either inflation too high forcing Fed action, or jobs deteriorating with sticky prices. " +
      "Risk-off bias.",
  },
  {
    label: "MIXED SIGNALS",
    min: 2.6,
    max: 3.4,
    interpretation:
      "Inflation trending but not at target; labor market showing mixed prints. Data-dependent Fed.",
  },
  {
    label: "GOLDILOCKS EMERGING",
    min: 3.5,
    max: 4.2,
    interpretation:
      "Inflation approaching 2% target with healthy employment. Fed gaining confidence to ease.",
  },
  {
    label: "PERFECT MACRO",
    min: 4.3,
    max: 5.0,
    interpretation:
      "Low/stable inflation at target, full employment, sustainable wages. Ideal for risk-on positioning.",
  },
];

function regimeFor(blockAverage: number): string {
  const found = REGIME_MAP.find((r) => blockAverage >= r.min && blockAverage <= r.max);
  return found?.label ?? "UNKNOWN";
}

/**
 * Block 2 — Inflation & Labor Market.
 *
 * Scorers (ordered by intra-block weight, descending):
 *   - core_cpi_yoy         (30%)  CPILFESL → YoY %
 *   - unemployment_rate    (20%)  UNRATE (non-monotonic bands)
 *   - cpi_headline_yoy     (15%)  CPIAUCSL → YoY %
 *   - wage_growth_yoy      (15%)  CES0500000003 → YoY %
 *   - nfp_surprise         (10%)  PAYEMS m/m − NFP_CONSENSUS (manual)
 *   - participation_rate   (10%)  CIVPART
 *
 * Block weight in total Macro Pulse Score: 20%.
 */
export const inflationLaborBlock: BlockDefinition = {
  key: "inflation_labor",
  name: "Inflation & Labor Market",
  sortOrder: 1,
  weight: 20,
  scorers: [
    new CoreCpiYoyScorer(),
    new UnemploymentRateScorer(),
    new CpiHeadlineYoyScorer(),
    new WageGrowthYoyScorer(),
    new NfpSurpriseScorer(),
    new ParticipationRateScorer(),
  ],
  regimeMap: REGIME_MAP,
  regimeFor,
};
