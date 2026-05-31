import { AaiiSpreadScorer } from "@/lib/scoring/blocks/sentiment-risk/aaii-spread";
import { FearGreedIndexScorer } from "@/lib/scoring/blocks/sentiment-risk/fear-greed-index";
import { MarketBreadthScorer } from "@/lib/scoring/blocks/sentiment-risk/market-breadth";
import { PutCallRatioScorer } from "@/lib/scoring/blocks/sentiment-risk/put-call-ratio";
import { VixScorer } from "@/lib/scoring/blocks/sentiment-risk/vix";
import { VvixScorer } from "@/lib/scoring/blocks/sentiment-risk/vvix";
import type { BlockDefinition, BlockRegimeMapping } from "@/lib/scoring/types";

/**
 * Block 3 regime mapping (block_avg → label).
 *
 * Note on direction: Block 3 measures *current* market mood, NOT forward
 * returns. Score 5 (e.g., low VIX, low P/C, high greed, broad breadth) means
 * markets are calm/euphoric right now. Historically this regime precedes
 * corrections — a known mixed signal in the total Macro Pulse Score.
 * V1 keeps spec-as-written; see block-3-sentiment-risk.md open question on
 * inversion / U-shape scoring redesign.
 *
 * Source: docs_local/.../scoring-engine/block-3-sentiment-risk.md
 *         "Block Average → Interpretation" table.
 */
const REGIME_MAP: BlockRegimeMapping[] = [
  {
    label: "EXTREME STRESS / PANIC",
    min: 1.0,
    max: 1.8,
    interpretation:
      "Heavy fear, breadth collapsing, vol elevated. Historically a contrarian " +
      "buy zone — capitulation regimes precede strong forward returns.",
  },
  {
    label: "ELEVATED FEAR",
    min: 1.9,
    max: 2.5,
    interpretation:
      "Risk-off positioning dominant; defensive hedging persistent. Contrarian " +
      "signals building but not extreme.",
  },
  {
    label: "BALANCED / NEUTRAL",
    min: 2.6,
    max: 3.4,
    interpretation:
      "Sentiment is not the driver; fundamentals and macro dominate. No extreme readings.",
  },
  {
    label: "HEALTHY OPTIMISM",
    min: 3.5,
    max: 4.2,
    interpretation:
      "Good breadth, calm vol, constructive retail sentiment. The sweet-spot regime for risk assets.",
  },
  {
    label: "EXTREME COMPLACENCY / EUPHORIA",
    min: 4.3,
    max: 5.0,
    interpretation:
      "Compressed vol, frothy retail positioning, broad participation. Vulnerable to correction; tighten stops.",
  },
];

function regimeFor(blockAverage: number): string {
  const found = REGIME_MAP.find((r) => blockAverage >= r.min && blockAverage <= r.max);
  return found?.label ?? "UNKNOWN";
}

/**
 * Block 3 — Sentiment & Risk.
 *
 * Scorers (ordered by intra-block weight, descending):
 *   - vix              (30%)  VIXCLS — FRED
 *   - put_call_ratio   (20%)  PUT_CALL_RATIO — manual (V1 placeholder)
 *   - market_breadth   (20%)  S5TH_PCT_ABOVE_200DMA — manual (Barchart)
 *   - aaii_spread      (15%)  AAII_SPREAD — manual (AAII survey, 4wk MA)
 *   - vvix             (10%)  VVIX — bulk-seeded from CBOE history
 *   - fear_greed_index ( 5%)  FEAR_GREED_INDEX — manual (CNN composite)
 *
 * Block weight in total Macro Pulse Score: 10%.
 */
export const sentimentRiskBlock: BlockDefinition = {
  key: "sentiment_risk",
  name: "Sentiment & Risk",
  sortOrder: 2,
  weight: 10,
  scorers: [
    new VixScorer(),
    new PutCallRatioScorer(),
    new MarketBreadthScorer(),
    new AaiiSpreadScorer(),
    new VvixScorer(),
    new FearGreedIndexScorer(),
  ],
  regimeMap: REGIME_MAP,
  regimeFor,
};
