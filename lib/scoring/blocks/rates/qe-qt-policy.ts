import { IndicatorScorer } from "@/lib/scoring/indicator-scorer";
import type {
  IndicatorExample,
  ScoreBand,
  ScoringInput,
  ScoringResult,
  SeriesInputSpec,
} from "@/lib/scoring/types";
import type { IndicatorObservation } from "@/shared/schema";

const FOUR_WEEKS_DAYS = 28;
const MILLIONS_TO_BILLIONS = 1000;

/**
 * QE / QT Policy
 *
 * Approximates the monthly pace of balance-sheet change using a 4-week delta
 * on FRED's WALCL series (total Federal Reserve assets, in $ millions, weekly).
 *
 *   monthly_delta_B = (WALCL_latest − WALCL_4w_prior) / 1000
 *
 * Positive = expansion = QE-like = bullish for liquidity.
 * Negative = contraction = QT.
 *
 * Source: FRED series WALCL (https://fred.stlouisfed.org/series/WALCL)
 * Spec: docs/dashboard-dev/Block1_Research--rates_cb_policy.md §5
 */
export class QePolicyScorer extends IndicatorScorer {
  readonly key = "qe_qt_policy";
  readonly name = "QE / QT Policy";
  readonly blockKey = "rates";
  readonly unit = "$B/mo";
  readonly description =
    "Net change in the Fed's balance sheet over the last 4 weeks, used as a proxy for " +
    "the monthly pace of QE (expansion) or QT (runoff). Expansionary policy injects " +
    "liquidity; QT drains it.";
  readonly formula = "(WALCL_latest − WALCL_-4w) / 1000";
  readonly formulaPretty =
    "monthly_pace_$B = (WALCL_latest − WALCL_4_weeks_prior) ÷ 1000   (WALCL is in $ millions)";
  readonly inputs: SeriesInputSpec[] = [
    { seriesId: "WALCL", lookbackDays: 45, required: true },
  ];
  readonly bands: ScoreBand[] = [
    {
      score: 1,
      label: "Aggressive QT",
      rangeLabel: "< -$60B/mo",
      test: (v) => v < -60,
      interpretation: "Aggressive balance sheet reduction; strong liquidity withdrawal.",
    },
    {
      score: 2,
      label: "Moderate QT",
      rangeLabel: "-$60B to -$30B/mo",
      test: (v) => v >= -60 && v < -30,
      interpretation: "Moderate runoff; gradual liquidity withdrawal.",
    },
    {
      score: 3,
      label: "Stable",
      rangeLabel: "-$30B to +$5B/mo",
      test: (v) => v >= -30 && v <= 5,
      interpretation: "Balance sheet roughly stable; neutral liquidity stance.",
    },
    {
      score: 4,
      label: "Slowing QT / Mild QE",
      rangeLabel: "+$5B to +$30B/mo",
      test: (v) => v > 5 && v <= 30,
      interpretation: "Liquidity drain easing or mild expansion; bullish shift.",
    },
    {
      score: 5,
      label: "Active QE",
      rangeLabel: "> +$30B/mo",
      test: (v) => v > 30,
      interpretation: "Active balance-sheet expansion; maximum liquidity support.",
    },
  ];
  readonly examples: IndicatorExample[] = [
    { description: "Aggressive QT (2022-23 peak pace)", inputs: { delta_B: -90 }, expectedScore: 1 },
    { description: "Moderate QT (2024 taper)", inputs: { delta_B: -45 }, expectedScore: 2 },
    { description: "Stable balance sheet", inputs: { delta_B: -5 }, expectedScore: 3 },
    { description: "Mild expansion (BTFP-era)", inputs: { delta_B: 20 }, expectedScore: 4 },
    { description: "COVID QE surge", inputs: { delta_B: 300 }, expectedScore: 5 },
  ];

  compute(input: ScoringInput): ScoringResult {
    const series = input.observations["WALCL"] ?? [];
    const latest = series[0];
    if (!latest) {
      return this.missingInputs("Missing WALCL observations");
    }

    const prior = this.findPriorObservation(series, latest, FOUR_WEEKS_DAYS);
    if (!prior) {
      return this.missingInputs("Missing 4-week-prior WALCL observation in lookback window");
    }

    const latestValue = Number(latest.value);
    const priorValue = Number(prior.value);
    if (!Number.isFinite(latestValue) || !Number.isFinite(priorValue)) {
      return this.missingInputs("Invalid WALCL value(s)");
    }

    const deltaMillions = latestValue - priorValue;
    const deltaBillions = deltaMillions / MILLIONS_TO_BILLIONS;
    const band = this.band(deltaBillions);

    return {
      indicatorKey: this.key,
      score: band.score,
      rawValue: deltaBillions,
      bandLabel: band.label,
      interpretation: band.interpretation,
      inputsUsed: [
        { seriesId: "WALCL", date: latest.observationDate, value: latestValue },
        { seriesId: "WALCL", date: prior.observationDate, value: priorValue },
      ],
      formulaTrace:
        `WALCL ${latest.observationDate} ($${(latestValue / 1000).toFixed(1)}B) − ` +
        `${prior.observationDate} ($${(priorValue / 1000).toFixed(1)}B) = ` +
        `${deltaBillions >= 0 ? "+" : ""}${deltaBillions.toFixed(1)} $B/4w → ${band.label}`,
    };
  }

  /**
   * Find the observation closest to (latest.date − targetDays).
   * WALCL is weekly (Wednesdays), so the exact day may not be present;
   * pick whichever neighbouring observation is closest to the target.
   */
  private findPriorObservation(
    series: IndicatorObservation[],
    latest: IndicatorObservation,
    targetDays: number,
  ): IndicatorObservation | null {
    const latestMs = new Date(latest.observationDate).getTime();
    const targetMs = latestMs - targetDays * 24 * 60 * 60 * 1000;
    let best: IndicatorObservation | null = null;
    let bestDiff = Infinity;
    for (const obs of series) {
      if (obs === latest) continue;
      const diff = Math.abs(new Date(obs.observationDate).getTime() - targetMs);
      if (diff < bestDiff) {
        bestDiff = diff;
        best = obs;
      }
    }
    return best;
  }
}
