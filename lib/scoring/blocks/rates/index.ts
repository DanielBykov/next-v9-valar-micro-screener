import { FedFundsRateLevelScorer } from "@/lib/scoring/blocks/rates/fed-funds-rate";
import { LastRateChangeScorer } from "@/lib/scoring/blocks/rates/last-rate-change";
import { QePolicyScorer } from "@/lib/scoring/blocks/rates/qe-qt-policy";
import { RealInterestRateScorer } from "@/lib/scoring/blocks/rates/real-interest-rate";
import { YieldCurveScorer } from "@/lib/scoring/blocks/rates/yield-curve";
import type { BlockDefinition, BlockRegimeMapping } from "@/lib/scoring/types";

/**
 * Block regime mapping for Rates & CB Policy.
 * See Block1_Research--rates_cb_policy.md → "Block Aggregate Scoring".
 */
const REGIME_MAP: BlockRegimeMapping[] = [
  {
    label: "VERY RESTRICTIVE",
    min: 1.0,
    max: 1.8,
    interpretation:
      "Aggressive tightening, deep inversion, hawkish guidance, active QT, high real rates. Maximum headwind.",
  },
  {
    label: "RESTRICTIVE",
    min: 1.9,
    max: 2.5,
    interpretation: "Policy tight but not extreme. Rates elevated, curve flat/inverted.",
  },
  {
    label: "NEUTRAL / TRANSITIONAL",
    min: 2.6,
    max: 3.4,
    interpretation: "Policy at crossroads. Rates near neutral, guidance balanced.",
  },
  {
    label: "ACCOMMODATIVE",
    min: 3.5,
    max: 4.2,
    interpretation: "Easing cycle underway or imminent. Supportive for risk assets.",
  },
  {
    label: "VERY ACCOMMODATIVE",
    min: 4.3,
    max: 5.0,
    interpretation: "Emergency easing, near-zero rates, active QE. Maximum tailwind.",
  },
];

function regimeFor(blockAverage: number): string {
  const found = REGIME_MAP.find((r) => blockAverage >= r.min && blockAverage <= r.max);
  return found?.label ?? "UNKNOWN";
}

/**
 * Rates & CB Policy block.
 *
 * NOTE on weights: the V1 spec assigns 1.3 Forward Guidance Tone a 20%
 * intra-block weight, but that scorer is not yet implemented. The remaining
 * 5 scorers (raw spec weights 25/20/15/15/5 → 80 total) are renormalized to
 * sum to 100. When Forward Guidance ships the per-scorer weights revert to
 * the raw spec values.
 */
export const ratesBlock: BlockDefinition = {
  key: "rates",
  name: "Rates & Central Bank Policy",
  sortOrder: 0,
  weight: 25,
  scorers: [
    new FedFundsRateLevelScorer(),
    new LastRateChangeScorer(),
    new YieldCurveScorer(),
    new QePolicyScorer(),
    new RealInterestRateScorer(),
  ],
  regimeMap: REGIME_MAP,
  regimeFor,
};
