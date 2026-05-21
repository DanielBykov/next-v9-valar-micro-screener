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
 * Scorers will be registered as Tasks 3–7 land:
 *   - fed_funds_rate_level   (Task 3)
 *   - yield_curve_2y10y      (Task 4)
 *   - qe_qt_policy           (Task 5)
 *   - real_interest_rate     (Task 6)
 *   - last_rate_change       (Task 7)
 *   - forward_guidance_tone  (Task 8 — manual admin input, not auto-scored)
 */
export const ratesBlock: BlockDefinition = {
  key: "rates",
  name: "Rates & Central Bank Policy",
  sortOrder: 0,
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
