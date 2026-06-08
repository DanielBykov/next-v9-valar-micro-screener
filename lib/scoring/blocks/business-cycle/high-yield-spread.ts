import { IndicatorScorer } from "@/lib/scoring/indicator-scorer";
import type {
  IndicatorExample,
  ScoreBand,
  ScoringInput,
  ScoringResult,
  SeriesInputSpec,
} from "@/lib/scoring/types";

/**
 * High Yield Spread — 5.5
 *
 * ICE BofA US High Yield Index option-adjusted spread (OAS), in basis points.
 * One of the most reliable equity-market leading indicators — credit reprices
 * weeks-to-months before equities. Wide spread = stress = low score
 * (numeric_descending).
 *
 * Source: FRED BAMLH0A0HYM2 (daily, percent → converted to bps in code)
 * Spec: docs_local/.../scoring-engine/block-5-business-cycle.md §5.5
 */
export class HighYieldSpreadScorer extends IndicatorScorer {
  readonly key = "high_yield_spread";
  readonly name = "High Yield Spread";
  readonly blockKey = "business_cycle";
  readonly unit = "bps";
  // Spec weight 25% within Block 5.
  readonly weight = 25;
  readonly description =
    "ICE BofA US High Yield option-adjusted spread (OAS). The yield premium on " +
    "junk-rated corporate bonds over Treasuries — the cleanest credit-stress " +
    "gauge. Tight spreads = risk-on; wide spreads = stress (inverted scoring).";
  readonly formula = "score(BAMLH0A0HYM2_latest × 100)";
  readonly formulaPretty = "score = band(BAMLH0A0HYM2_latest_pct × 100 bps)";
  readonly inputs: SeriesInputSpec[] = [
    { seriesId: "BAMLH0A0HYM2", lookbackDays: 14, required: true, source: "fred" },
  ];
  readonly bands: ScoreBand[] = [
    {
      score: 1,
      label: "Credit Stress",
      rangeLabel: "> 800 bps",
      test: (v) => v > 800,
      interpretation: "Credit stress; recession-coincident or imminent; equity downside risk high.",
    },
    {
      score: 2,
      label: "Stress Building",
      rangeLabel: "600 – 800 bps",
      test: (v) => v >= 600 && v <= 800,
      interpretation: "Stress building; risk premium widening; defensive positioning.",
    },
    {
      score: 3,
      label: "Normal",
      rangeLabel: "450 – 599 bps",
      test: (v) => v >= 450 && v < 600,
      interpretation: "Normal credit conditions; no extreme signal.",
    },
    {
      score: 4,
      label: "Tight",
      rangeLabel: "350 – 449 bps",
      test: (v) => v >= 350 && v < 450,
      interpretation: "Tight spreads; healthy risk appetite; supportive of equity rally.",
    },
    {
      score: 5,
      label: "Very Tight",
      rangeLabel: "< 350 bps",
      test: (v) => v < 350,
      interpretation: "Very tight; abundant liquidity; max risk-on; watch for complacency at extremes.",
    },
  ];
  readonly examples: IndicatorExample[] = [
    { description: "2008 GFC peak",   inputs: { oas_bps: 2200 }, expectedScore: 1 },
    { description: "2022 hike cycle", inputs: { oas_bps: 650 },  expectedScore: 2 },
    { description: "Normal",          inputs: { oas_bps: 500 },  expectedScore: 3 },
    { description: "Tight",           inputs: { oas_bps: 400 },  expectedScore: 4 },
    { description: "2024 very tight", inputs: { oas_bps: 320 },  expectedScore: 5 },
  ];

  compute(input: ScoringInput): ScoringResult {
    const obs = this.latest(input, "BAMLH0A0HYM2");
    if (!obs) return this.missingInputs("Missing BAMLH0A0HYM2 observation in lookback window");

    const pct = Number(obs.value);
    if (!Number.isFinite(pct)) {
      return this.missingInputs(`Invalid BAMLH0A0HYM2 value: ${obs.value}`);
    }

    // FRED publishes the OAS in percent (e.g. 3.20); the rubric is in bps.
    const bps = pct * 100;
    const band = this.band(bps);
    return {
      indicatorKey: this.key,
      score: band.score,
      rawValue: bps,
      bandLabel: band.label,
      interpretation: band.interpretation,
      inputsUsed: [{ seriesId: "BAMLH0A0HYM2", date: obs.observationDate, value: pct }],
      formulaTrace:
        `BAMLH0A0HYM2 (${obs.observationDate}) = ${pct.toFixed(2)}% = ` +
        `${bps.toFixed(0)} bps → ${band.label}`,
    };
  }
}
