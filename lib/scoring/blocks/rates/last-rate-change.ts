import { IndicatorScorer } from "@/lib/scoring/indicator-scorer";
import type {
  IndicatorExample,
  ScoreBand,
  ScoringInput,
  ScoringResult,
  SeriesInputSpec,
} from "@/lib/scoring/types";

/**
 * Last Rate Change Direction
 *
 * Detects the most recent change in DFEDTARU (upper bound of the Federal Funds
 * target range). Between FOMC meetings the value is flat — we walk backwards
 * through the observation history to find the last point where the upper bound
 * differed from the current one.
 *
 *   delta_bps = (DFEDTARU_latest − DFEDTARU_pre_change) × 100
 *
 * Lookback is ~120 days, which comfortably covers 2–3 FOMC meetings. If no
 * change is detected in that window, the indicator scores 3 (Hold).
 *
 * Source: FRED DFEDTARU (https://fred.stlouisfed.org/series/DFEDTARU)
 * Spec: docs/dashboard-dev/Block1_Research--rates_cb_policy.md §2
 */
export class LastRateChangeScorer extends IndicatorScorer {
  readonly key = "last_rate_change";
  readonly name = "Last Rate Change Direction";
  readonly blockKey = "rates";
  readonly unit = "bps";
  readonly description =
    "Direction and magnitude of the Fed's most recent policy rate change, derived from " +
    "the upper bound of the Federal Funds target range (DFEDTARU). The score is carried " +
    "forward between FOMC meetings until the next change is detected.";
  readonly formula = "(DFEDTARU_latest − DFEDTARU_pre_change) × 100";
  readonly formulaPretty =
    "delta_bps = (DFEDTARU_latest − DFEDTARU_pre_change) × 100 — measured at the last detected step change";
  readonly inputs: SeriesInputSpec[] = [
    { seriesId: "DFEDTARU", lookbackDays: 120, required: true },
  ];
  readonly bands: ScoreBand[] = [
    {
      score: 1,
      label: "Aggressive Hike",
      rangeLabel: "≥ +50 bps",
      test: (v) => v >= 50,
      interpretation: "Aggressive tightening; inflation-emergency posture.",
    },
    {
      score: 2,
      label: "Standard Hike",
      rangeLabel: "+1 to +49 bps",
      test: (v) => v > 0 && v < 50,
      interpretation: "Standard tightening step; hawkish trajectory.",
    },
    {
      score: 3,
      label: "Hold",
      rangeLabel: "No change",
      test: (v) => v === 0,
      interpretation: "Pause; policy could pivot either way.",
    },
    {
      score: 4,
      label: "Standard Cut",
      rangeLabel: "-1 to -49 bps",
      test: (v) => v < 0 && v > -50,
      interpretation: "Easing cycle begins or continues; bullish pivot signal.",
    },
    {
      score: 5,
      label: "Aggressive Cut",
      rangeLabel: "≤ -50 bps",
      test: (v) => v <= -50,
      interpretation: "Emergency or aggressive easing; very bullish.",
    },
  ];
  readonly examples: IndicatorExample[] = [
    { description: "Mar 2022 first hike (25bps)"            , inputs: { latest: 0.50, prior: 0.25 }, expectedScore: 2 },
    { description: "Jun 2022 jumbo (75bps)"                , inputs: { latest: 1.75, prior: 1.00 }, expectedScore: 1 },
    { description: "Sep 2024 first cut (50bps)"             , inputs: { latest: 5.00, prior: 5.50 }, expectedScore: 5 },
    { description: "Nov 2024 follow-up (25bps cut)"        , inputs: { latest: 4.75, prior: 5.00 }, expectedScore: 4 },
    { description: "Between meetings (no change in window)", inputs: { latest: 3.75, prior: 3.75 }, expectedScore: 3 },
  ];

  compute(input: ScoringInput): ScoringResult {
    const series = input.observations["DFEDTARU"] ?? [];
    const latest = series[0];
    if (!latest) {
      return this.missingInputs("Missing DFEDTARU observations");
    }

    const latestValue = Number(latest.value);
    if (!Number.isFinite(latestValue)) {
      return this.missingInputs(`Invalid DFEDTARU value: ${latest.value}`);
    }

    // Walk back through the (DESC-sorted) series to find the first observation
    // whose value differs from latest. That's the value held just before the
    // most recent change.
    let preChange: typeof latest | null = null;
    for (let i = 1; i < series.length; i++) {
      const v = Number(series[i].value);
      if (Number.isFinite(v) && v !== latestValue) {
        preChange = series[i];
        break;
      }
    }

    if (!preChange) {
      // No change detected within the lookback window — Fed is on hold.
      const band = this.band(0);
      return {
        indicatorKey: this.key,
        score: band.score,
        rawValue: 0,
        bandLabel: band.label,
        interpretation: band.interpretation,
        inputsUsed: [{ seriesId: "DFEDTARU", date: latest.observationDate, value: latestValue }],
        formulaTrace: `No change in DFEDTARU within lookback window (latest = ${latestValue.toFixed(2)}%) → Hold`,
      };
    }

    const priorValue = Number(preChange.value);
    const deltaBps = (latestValue - priorValue) * 100;
    const band = this.band(deltaBps);
    const sign = deltaBps > 0 ? "+" : "";

    return {
      indicatorKey: this.key,
      score: band.score,
      rawValue: deltaBps,
      bandLabel: band.label,
      interpretation: band.interpretation,
      inputsUsed: [
        { seriesId: "DFEDTARU", date: latest.observationDate, value: latestValue },
        { seriesId: "DFEDTARU", date: preChange.observationDate, value: priorValue },
      ],
      formulaTrace:
        `DFEDTARU ${latest.observationDate} (${latestValue.toFixed(2)}%) − ` +
        `${preChange.observationDate} (${priorValue.toFixed(2)}%) = ` +
        `${sign}${deltaBps.toFixed(0)} bps → ${band.label}`,
    };
  }
}
