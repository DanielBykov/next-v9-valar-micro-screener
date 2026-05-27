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
 * CPI (Headline) — Year-over-Year %
 *
 *   cpi_yoy_pct = (CPIAUCSL_latest / CPIAUCSL_12m_prior − 1) × 100
 *
 * Higher inflation → more restrictive Fed response → lower (bearish) score.
 *
 * Source: FRED CPIAUCSL (https://fred.stlouisfed.org/series/CPIAUCSL)
 * Spec: docs_local/.../scoring-engine/block-2-inflation-labor.md §2.1
 */
export class CpiHeadlineYoyScorer extends IndicatorScorer {
  readonly key = "cpi_headline_yoy";
  readonly name = "CPI (Headline) YoY";
  readonly blockKey = "inflation_labor";
  readonly unit = "% YoY";
  // Spec weight 15% within Block 2.
  readonly weight = 15;
  readonly description =
    "Year-over-year change in the headline Consumer Price Index. Captures the full " +
    "basket including food and energy. Above the Fed's 2% target it pressures the Fed " +
    "to tighten; equities historically underperform when CPI exceeds 5% YoY.";
  readonly formula = "(CPIAUCSL_latest / CPIAUCSL_12m_prior − 1) × 100";
  readonly formulaPretty =
    "yoy_pct = (CPIAUCSL_latest / CPIAUCSL_~365d_prior − 1) × 100 — index ratio − 1";
  readonly inputs: SeriesInputSpec[] = [
    { seriesId: "CPIAUCSL", lookbackDays: 420, required: true },
  ];
  readonly bands: ScoreBand[] = [
    {
      score: 1,
      label: "Runaway",
      rangeLabel: "> 6.0% YoY",
      test: (v) => v > 6.0,
      interpretation: "Forces aggressive Fed hikes; severe equity headwind; stagflation risk.",
    },
    {
      score: 2,
      label: "Elevated",
      rangeLabel: "4.0% – 6.0% YoY",
      test: (v) => v >= 4.0 && v <= 6.0,
      interpretation: "Above target; Fed likely to continue tightening; weighs on growth/tech.",
    },
    {
      score: 3,
      label: "Above Target",
      rangeLabel: "2.5% – 3.9% YoY",
      test: (v) => v >= 2.5 && v < 4.0,
      interpretation: "Above 2% target but manageable; Fed watchful.",
    },
    {
      score: 4,
      label: "Near Target",
      rangeLabel: "1.5% – 2.4% YoY",
      test: (v) => v >= 1.5 && v < 2.5,
      interpretation: "Goldilocks zone; no pressure to tighten further; bullish.",
    },
    {
      score: 5,
      label: "Below Target",
      rangeLabel: "< 1.5% YoY",
      test: (v) => v < 1.5,
      interpretation: "Disinflation/deflation risk; Fed has room to ease; very supportive.",
    },
  ];
  readonly examples: IndicatorExample[] = [
    { description: "Jun 2022 peak",       inputs: { yoy: 9.1 }, expectedScore: 1 },
    { description: "Early 2023 elevated", inputs: { yoy: 5.0 }, expectedScore: 2 },
    { description: "2024 stabilising",    inputs: { yoy: 3.0 }, expectedScore: 3 },
    { description: "COVID 2020 trough",   inputs: { yoy: 1.4 }, expectedScore: 5 },
  ];

  compute(input: ScoringInput): ScoringResult {
    const series = input.observations["CPIAUCSL"] ?? [];
    const yoy = yoyPctFromIndex(series, input.asOfDate);
    if (!yoy) return this.missingInputs("Missing CPIAUCSL observations for YoY calculation");

    const { latest, prior, yoyPct } = yoy;
    const band = this.band(yoyPct);
    return {
      indicatorKey: this.key,
      score: band.score,
      rawValue: yoyPct,
      bandLabel: band.label,
      interpretation: band.interpretation,
      inputsUsed: [
        { seriesId: "CPIAUCSL", date: latest.observationDate, value: Number(latest.value) },
        { seriesId: "CPIAUCSL", date: prior.observationDate, value: Number(prior.value) },
      ],
      formulaTrace:
        `CPIAUCSL ${latest.observationDate} (${Number(latest.value).toFixed(2)}) / ` +
        `${prior.observationDate} (${Number(prior.value).toFixed(2)}) − 1 = ` +
        `${yoyPct.toFixed(2)}% YoY → ${band.label}`,
    };
  }
}
