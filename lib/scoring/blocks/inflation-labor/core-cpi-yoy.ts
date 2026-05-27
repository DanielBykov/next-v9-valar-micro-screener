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
 * Core CPI (ex food & energy) — Year-over-Year %
 *
 *   core_cpi_yoy_pct = (CPILFESL_latest / CPILFESL_12m_prior − 1) × 100
 *
 * The Fed's preferred trend signal for underlying inflation. Sticky shelter
 * (~40% of Core CPI) makes this slow to fall — band 1 threshold (5.5%) is
 * stricter than headline because Core "shouldn't" be that high if energy/food
 * spikes are excluded.
 *
 * Source: FRED CPILFESL (https://fred.stlouisfed.org/series/CPILFESL)
 * Spec: docs_local/.../scoring-engine/block-2-inflation-labor.md §2.2
 */
export class CoreCpiYoyScorer extends IndicatorScorer {
  readonly key = "core_cpi_yoy";
  readonly name = "Core CPI YoY";
  readonly blockKey = "inflation_labor";
  readonly unit = "% YoY";
  // Spec weight 30% within Block 2 — highest single weight in the block.
  readonly weight = 30;
  readonly description =
    "Year-over-year change in CPI excluding food and energy. The Fed's preferred " +
    "trend signal — services and shelter inflation that drives policy decisions. " +
    "Shelter (~40% of Core CPI) is the stickiest sub-component.";
  readonly formula = "(CPILFESL_latest / CPILFESL_12m_prior − 1) × 100";
  readonly formulaPretty =
    "yoy_pct = (CPILFESL_latest / CPILFESL_~365d_prior − 1) × 100";
  readonly inputs: SeriesInputSpec[] = [
    { seriesId: "CPILFESL", lookbackDays: 420, required: true },
  ];
  readonly bands: ScoreBand[] = [
    {
      score: 1,
      label: "Sticky High",
      rangeLabel: "> 5.5% YoY",
      test: (v) => v > 5.5,
      interpretation: "Services inflation entrenched; Fed forced into prolonged tightening.",
    },
    {
      score: 2,
      label: "Elevated",
      rangeLabel: "4.0% – 5.5% YoY",
      test: (v) => v >= 4.0 && v <= 5.5,
      interpretation: "Slow progress toward target; Fed maintains restrictive stance.",
    },
    {
      score: 3,
      label: "Above Target",
      rangeLabel: "2.5% – 3.9% YoY",
      test: (v) => v >= 2.5 && v < 4.0,
      interpretation: "Trending in right direction; market cautiously optimistic.",
    },
    {
      score: 4,
      label: "At Target",
      rangeLabel: "1.5% – 2.4% YoY",
      test: (v) => v >= 1.5 && v < 2.5,
      interpretation: "Mission accomplished zone; Fed can pivot to easing.",
    },
    {
      score: 5,
      label: "Below Target",
      rangeLabel: "< 1.5% YoY",
      test: (v) => v < 1.5,
      interpretation: "Deflation risk; maximum room for accommodation.",
    },
  ];
  readonly examples: IndicatorExample[] = [
    { description: "Sep 2022 peak",     inputs: { yoy: 6.6 }, expectedScore: 1 },
    { description: "Early 2023",        inputs: { yoy: 5.0 }, expectedScore: 2 },
    { description: "2024 mid-cycle",    inputs: { yoy: 3.0 }, expectedScore: 3 },
    { description: "Pre-COVID 2020",    inputs: { yoy: 1.6 }, expectedScore: 4 },
  ];

  compute(input: ScoringInput): ScoringResult {
    const series = input.observations["CPILFESL"] ?? [];
    const yoy = yoyPctFromIndex(series, input.asOfDate);
    if (!yoy) return this.missingInputs("Missing CPILFESL observations for YoY calculation");

    const { latest, prior, yoyPct } = yoy;
    const band = this.band(yoyPct);
    return {
      indicatorKey: this.key,
      score: band.score,
      rawValue: yoyPct,
      bandLabel: band.label,
      interpretation: band.interpretation,
      inputsUsed: [
        { seriesId: "CPILFESL", date: latest.observationDate, value: Number(latest.value) },
        { seriesId: "CPILFESL", date: prior.observationDate, value: Number(prior.value) },
      ],
      formulaTrace:
        `CPILFESL ${latest.observationDate} (${Number(latest.value).toFixed(2)}) / ` +
        `${prior.observationDate} (${Number(prior.value).toFixed(2)}) − 1 = ` +
        `${yoyPct.toFixed(2)}% YoY → ${band.label}`,
    };
  }
}
