import { IndicatorScorer } from "@/lib/scoring/indicator-scorer";
import { yoyPctFromIndex } from "@/lib/scoring/helpers";
import type {
  IndicatorExample,
  ScoreBand,
  ScoringInput,
  ScoringResult,
  SeriesInputSpec,
} from "@/lib/scoring/types";

/**
 * Gold — 12-month Year-over-Year %
 *
 *   gold_yoy_pct = (GOLD_SPOT_latest / GOLD_SPOT_~365d_prior − 1) × 100
 *
 * Gold's absolute level drifts with long-run inflation, so the spec scores
 * the 12M rate of change rather than the level. This is the deliberate
 * exception to the Block 4 "score absolute level" convention.
 *
 * Sharp YoY rallies (>+30%) signal stress / dedollarization / real-rate
 * collapse → low score. Sharp drawdowns (< −15%) signal risk-on, rising
 * real rates → high score.
 *
 * Direction note: score is *inverted* relative to gold price — high gold
 * YoY = low score (Block 4 measures conditions favourable to risk assets).
 *
 * Source: indicator_observations seeded from
 *   docs_local/one-drive-macro-screener/data/extracted/gold_freegoldapi.csv
 *   (FreeGoldAPI / World Bank monthly extract; series_id = "GOLD_SPOT")
 * Spec: docs_local/.../scoring-engine/block-4-commodities-global.md §4.1
 */
const STALENESS_WARNING_DAYS = 90;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export class GoldYoyScorer extends IndicatorScorer {
  readonly key = "gold_yoy";
  readonly name = "Gold YoY";
  readonly blockKey = "commodities_global";
  readonly unit = "% YoY";
  // Spec weight 10% within Block 4.
  readonly weight = 10;
  readonly description =
    "Year-over-year change in spot gold price. Real-rate / safe-haven / " +
    "dedollarization signal. Scored as YoY % (not absolute level) because " +
    "gold's nominal level drifts with long-run inflation.";
  readonly formula = "(GOLD_SPOT_latest / GOLD_SPOT_12m_prior − 1) × 100";
  readonly formulaPretty =
    "yoy_pct = (GOLD_SPOT_latest / GOLD_SPOT_~365d_prior − 1) × 100";
  readonly inputs: SeriesInputSpec[] = [
    { seriesId: "GOLD_SPOT", lookbackDays: 420, required: true },
  ];
  readonly bands: ScoreBand[] = [
    {
      score: 1,
      label: "Sharp Rally",
      rangeLabel: "> +30% YoY",
      test: (v) => v > 30,
      interpretation: "Stress / dedollarization / inflation fear; risk-off signal.",
    },
    {
      score: 2,
      label: "Significant Safe-Haven Demand",
      rangeLabel: "+15% to +30% YoY",
      test: (v) => v >= 15 && v <= 30,
      interpretation: "Real rates falling or risk-off bid building.",
    },
    {
      score: 3,
      label: "Normal Flows",
      rangeLabel: "−5% to +15% YoY",
      test: (v) => v >= -5 && v < 15,
      interpretation: "No extreme safe-haven or risk-on signal from gold.",
    },
    {
      score: 4,
      label: "Gold Weakness",
      rangeLabel: "−15% to −5% YoY",
      test: (v) => v >= -15 && v < -5,
      interpretation: "Real rates rising or risk appetite returning.",
    },
    {
      score: 5,
      label: "Major Drawdown",
      rangeLabel: "< −15% YoY",
      test: (v) => v < -15,
      interpretation: "Maximum risk-on; safe-haven flows reversing aggressively.",
    },
  ];
  readonly examples: IndicatorExample[] = [
    { description: "2024 Asia/CB buying surge",  inputs: { yoy: 35.0 }, expectedScore: 1 },
    { description: "Mid-2020 COVID flight",      inputs: { yoy: 22.0 }, expectedScore: 2 },
    { description: "Typical mid-cycle",          inputs: { yoy: 5.0 },  expectedScore: 3 },
    { description: "2013 taper-tantrum drop",    inputs: { yoy: -10.0 }, expectedScore: 4 },
    { description: "2013 H2 ETF outflow peak",   inputs: { yoy: -25.0 }, expectedScore: 5 },
  ];

  compute(input: ScoringInput): ScoringResult {
    const series = input.observations["GOLD_SPOT"] ?? [];
    const yoy = yoyPctFromIndex(series, input.asOfDate);
    if (!yoy) return this.missingInputs("Missing GOLD_SPOT observations for YoY calculation");

    const { latest, prior, yoyPct } = yoy;
    const band = this.band(yoyPct);

    // Staleness check — FreeGoldAPI extract historically lags; flag when the
    // latest observation is more than 90 days behind asOfDate.
    const latestMs = new Date(latest.observationDate).getTime();
    const asOfMs = input.asOfDate.getTime();
    const stalenessDays = Math.floor((asOfMs - latestMs) / MS_PER_DAY);
    const warning =
      stalenessDays > STALENESS_WARNING_DAYS
        ? `GOLD_SPOT extract is ${stalenessDays} days behind asOfDate; refresh seed.`
        : undefined;

    return {
      indicatorKey: this.key,
      score: band.score,
      rawValue: yoyPct,
      bandLabel: band.label,
      interpretation: band.interpretation,
      inputsUsed: [
        { seriesId: "GOLD_SPOT", date: latest.observationDate, value: Number(latest.value) },
        { seriesId: "GOLD_SPOT", date: prior.observationDate, value: Number(prior.value) },
      ],
      formulaTrace:
        `GOLD_SPOT ${latest.observationDate} ($${Number(latest.value).toFixed(2)}) / ` +
        `${prior.observationDate} ($${Number(prior.value).toFixed(2)}) − 1 = ` +
        `${yoyPct.toFixed(2)}% YoY → ${band.label}`,
      ...(warning ? { warning } : {}),
    };
  }
}
