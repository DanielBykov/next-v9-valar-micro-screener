import { ChinaUsTensionScorer } from "@/lib/scoring/blocks/political-narrative/china-us-tension";
import { GeopoliticalRiskScorer } from "@/lib/scoring/blocks/political-narrative/geopolitical-risk";
import { GlobalEasingScorer } from "@/lib/scoring/blocks/political-narrative/global-easing";
import { MediaFearScorer } from "@/lib/scoring/blocks/political-narrative/media-fear";
import { SanctionsActivityScorer } from "@/lib/scoring/blocks/political-narrative/sanctions-activity";
import { UsPolicyUncertaintyScorer } from "@/lib/scoring/blocks/political-narrative/us-policy-uncertainty";
import type { BlockDefinition, BlockRegimeMapping } from "@/lib/scoring/types";

/**
 * Block 6 regime mapping (block_avg → label).
 *
 * Direction: Block 6 is a tail-risk overlay. High score = calm geopolitics +
 * coordinated easing + low policy uncertainty. Low score = acute external
 * crisis (war-level GPR, crisis EPU, sanctions wave, panic media, synchronised
 * tightening). Will sit at 3 (Default/Background) most of the time; the 1–2
 * range matters disproportionately at inflection points.
 *
 * Source: docs_local/.../scoring-engine/block-6-political-narrative.md
 *         "Block Average → Interpretation" table.
 */
const REGIME_MAP: BlockRegimeMapping[] = [
  {
    label: "ACUTE EXTERNAL CRISIS",
    min: 1.0,
    max: 1.8,
    interpretation:
      "War-level GPR, crisis-level EPU, major sanctions wave, panic media, " +
      "synchronised tightening. Risk-off bias justified regardless of other " +
      "blocks. Historically rare; aligned with 2008, 2020, 2022.",
  },
  {
    label: "ELEVATED EXTERNAL RISK",
    min: 1.9,
    max: 2.5,
    interpretation:
      "Significant geopolitical or policy stress; sanctions/conflict active. " +
      "Defensive tilt warranted as an overlay on other blocks.",
  },
  {
    label: "DEFAULT / BACKGROUND",
    min: 2.6,
    max: 3.4,
    interpretation:
      "Normal political and narrative noise; no acute risks dominating. " +
      "Block 6 doesn't move the needle. The most common state.",
  },
  {
    label: "CALM GEOPOLITICAL BACKDROP",
    min: 3.5,
    max: 4.2,
    interpretation: "Quiet period; supportive overlay for risk assets.",
  },
  {
    label: "COORDINATED TAILWIND",
    min: 4.3,
    max: 5.0,
    interpretation:
      "Synchronised global easing + calm geopolitics. Rare and bullish — " +
      "adds confirmation to other blocks.",
  },
];

function regimeFor(blockAverage: number): string {
  const found = REGIME_MAP.find((r) => blockAverage >= r.min && blockAverage <= r.max);
  return found?.label ?? "UNKNOWN";
}

/**
 * Block 6 — Political & Narrative Risk.
 *
 * Scorers (ordered by intra-block weight, descending):
 *   - geopolitical_risk      (40%)  GPR_MONTHLY — manual (pre-scored 1–5)
 *   - us_policy_uncertainty  (25%)  USEPUINDXM — FRED (raw index, descending)
 *   - china_us_tension       (10%)  EPU_CHINA — manual (pre-scored 1–5)
 *   - sanctions_activity     (10%)  SANCTIONS_ACTIVITY — manual event (default 3)
 *   - global_easing          (10%)  GLOBAL_EASING — manual (pre-scored 1–5)
 *   - media_fear             (5%)   GDELT_FEAR_TONE — manual (raw tone, descending)
 *
 * Block weight in total Macro Pulse Score: 5% (metadata; not applied to total).
 */
export const politicalNarrativeBlock: BlockDefinition = {
  key: "political_narrative",
  name: "Political & Narrative Risk",
  sortOrder: 5,
  weight: 5,
  scorers: [
    new ChinaUsTensionScorer(),
    new UsPolicyUncertaintyScorer(),
    new GeopoliticalRiskScorer(),
    new MediaFearScorer(),
    new SanctionsActivityScorer(),
    new GlobalEasingScorer(),
  ],
  regimeMap: REGIME_MAP,
  regimeFor,
};
