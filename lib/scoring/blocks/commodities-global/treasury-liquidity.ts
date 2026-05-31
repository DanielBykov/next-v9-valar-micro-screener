import { IndicatorScorer } from "@/lib/scoring/indicator-scorer";
import type {
  IndicatorExample,
  ScoreBand,
  ScoringInput,
  ScoringResult,
  SeriesInputSpec,
} from "@/lib/scoring/types";

/**
 * Treasury Liquidity — SOFR − IORB spread, in basis points
 *
 * V1 MVP proxy: spread between the Secured Overnight Financing Rate (SOFR,
 * the market funding rate) and the Interest on Reserve Balances (IORB, the
 * Fed's administered floor). Large positive spread = SOFR trading above
 * the floor = funding stress (2019 repo, 2020 dash-for-cash style). Large
 * negative spread = abundant reserves.
 *
 *   spread_bps = (SOFR_pct − IORB_pct) × 100
 *
 * IORB pre-July 2021: returns score 3 + warning (IOER was the predecessor
 * with different mechanics; backfill deferred to V2).
 *
 * V2 candidate: composite with MOVE Index + on/off-the-run premium for
 * full market-liquidity coverage. V1 funding proxy catches the canonical
 * stress events (2019, 2020, 2022, 2023).
 *
 * Sources: FRED SOFR (https://fred.stlouisfed.org/series/SOFR)
 *          FRED IORB (https://fred.stlouisfed.org/series/IORB)
 * Spec: docs_local/.../scoring-engine/block-4-commodities-global.md §4.6
 */
export class TreasuryLiquidityScorer extends IndicatorScorer {
  readonly key = "treasury_liquidity";
  readonly name = "Treasury Liquidity (SOFR − IORB)";
  readonly blockKey = "commodities_global";
  readonly unit = "bps";
  // Spec weight 15% within Block 4.
  readonly weight = 15;
  readonly description =
    "Funding-stress proxy: SOFR minus IORB, expressed in basis points. " +
    "Positive = SOFR trading above the Fed's floor (funding pressure); " +
    "negative = abundant reserves. Catches repo/funding stress events.";
  readonly formula = "(SOFR_pct − IORB_pct) × 100";
  readonly formulaPretty =
    "spread_bps = (SOFR_latest − IORB_latest) × 100  // both in % terms";
  readonly inputs: SeriesInputSpec[] = [
    { seriesId: "SOFR", lookbackDays: 14, required: true },
    { seriesId: "IORB", lookbackDays: 14, required: true },
  ];
  readonly bands: ScoreBand[] = [
    {
      score: 1,
      label: "Major Funding Stress",
      rangeLabel: "> +20 bps",
      test: (v) => v > 20,
      interpretation: "Systemic funding stress; 2019-repo-style; risk-off transmission.",
    },
    {
      score: 2,
      label: "Elevated Funding Pressure",
      rangeLabel: "+5 to +20 bps",
      test: (v) => v > 5 && v <= 20,
      interpretation: "SOFR persistently above the floor; reserves tightening.",
    },
    {
      score: 3,
      label: "Normal",
      rangeLabel: "−5 to +5 bps",
      test: (v) => v >= -5 && v <= 5,
      interpretation: "SOFR near IORB; plumbing functioning normally.",
    },
    {
      score: 4,
      label: "Abundant Reserves",
      rangeLabel: "−15 to −5 bps",
      test: (v) => v >= -15 && v < -5,
      interpretation: "SOFR comfortably below the floor; healthy market liquidity.",
    },
    {
      score: 5,
      label: "Excess Liquidity",
      rangeLabel: "< −15 bps",
      test: (v) => v < -15,
      interpretation: "Excess reserves; maximum funding-side liquidity.",
    },
  ];
  readonly examples: IndicatorExample[] = [
    { description: "Sep 2019 repo blowup",      inputs: { spread_bps: 80 },  expectedScore: 1 },
    { description: "Late 2023 RRP drawdown",    inputs: { spread_bps: 8 },   expectedScore: 2 },
    { description: "Typical 2024 reading",      inputs: { spread_bps: 0 },   expectedScore: 3 },
    { description: "2022 excess reserves",      inputs: { spread_bps: -8 },  expectedScore: 4 },
    { description: "QE-flooded reserves regime", inputs: { spread_bps: -20 }, expectedScore: 5 },
  ];

  compute(input: ScoringInput): ScoringResult {
    const sofrObs = this.latest(input, "SOFR");
    const iorbObs = this.latest(input, "IORB");

    if (!sofrObs) return this.missingInputs("Missing SOFR observation in lookback window");
    if (!iorbObs) {
      // IORB only exists from July 2021. Pre-2021 asOfDates fall back to
      // neutral score 3 with a warning (spec §4.6 — IOER backfill deferred).
      return {
        indicatorKey: this.key,
        score: 3,
        rawValue: null,
        bandLabel: "Unknown (no IORB)",
        interpretation:
          "Insufficient data: IORB not published before July 2021. Score defaulted to neutral.",
        inputsUsed: sofrObs
          ? [{ seriesId: "SOFR", date: sofrObs.observationDate, value: Number(sofrObs.value) }]
          : [],
        formulaTrace: "IORB unavailable in lookback window; returning neutral score.",
        warning: "IORB unavailable (pre-July 2021 asOfDate?); SOFR−IORB spread cannot be computed.",
      };
    }

    const sofrPct = Number(sofrObs.value);
    const iorbPct = Number(iorbObs.value);
    if (!Number.isFinite(sofrPct) || !Number.isFinite(iorbPct)) {
      return this.missingInputs(
        `Invalid SOFR/IORB values: SOFR=${sofrObs.value}, IORB=${iorbObs.value}`,
      );
    }

    const spreadBps = (sofrPct - iorbPct) * 100;
    const band = this.band(spreadBps);
    return {
      indicatorKey: this.key,
      score: band.score,
      rawValue: spreadBps,
      bandLabel: band.label,
      interpretation: band.interpretation,
      inputsUsed: [
        { seriesId: "SOFR", date: sofrObs.observationDate, value: sofrPct },
        { seriesId: "IORB", date: iorbObs.observationDate, value: iorbPct },
      ],
      formulaTrace:
        `SOFR ${sofrObs.observationDate} (${sofrPct.toFixed(2)}%) − ` +
        `IORB ${iorbObs.observationDate} (${iorbPct.toFixed(2)}%) = ` +
        `${spreadBps.toFixed(1)} bps → ${band.label}`,
    };
  }
}
