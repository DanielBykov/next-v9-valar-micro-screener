import { IndicatorScorer } from "@/lib/scoring/indicator-scorer";
import type {
  IndicatorExample,
  ScoreBand,
  ScoringInput,
  ScoringResult,
  SeriesInputSpec,
} from "@/lib/scoring/types";

/**
 * ISM Manufacturing PMI — 5.1
 *
 * Manual monthly entry — ISM paywalls historical data and FRED does not host
 * it, so the analyst enters the headline number from the free monthly press
 * release via /admin/manual-inputs on release day (first business day).
 *
 * Diffusion index: 50 = no change, >50 = expansion, <50 = contraction. The
 * single most-watched manufacturing cycle signal.
 *
 * Source: Manual (ISM press release / Investing.com / TradingEconomics)
 * Spec: docs_local/.../scoring-engine/block-5-business-cycle.md §5.1
 */
export class IsmPmiScorer extends IndicatorScorer {
  readonly key = "ism_pmi";
  readonly name = "ISM Manufacturing PMI";
  readonly blockKey = "business_cycle";
  readonly unit = "index";
  // Spec weight 25% within Block 5.
  readonly weight = 25;
  readonly description =
    "ISM Manufacturing Purchasing Managers' Index — monthly survey of ~300 " +
    "manufacturing executives. Diffusion index where 50 separates expansion " +
    "from contraction; the rubric centres on 49–51 stall speed.";
  readonly formula = "score(ISM_MFG_PMI_latest)";
  readonly formulaPretty = "score = band(ISM_MFG_PMI_latest)";
  readonly inputs: SeriesInputSpec[] = [
    { seriesId: "ISM_MFG_PMI", lookbackDays: 60, required: true, source: "manual" },
  ];
  readonly bands: ScoreBand[] = [
    {
      score: 1,
      label: "Deep Contraction",
      rangeLabel: "< 45",
      test: (v) => v < 45,
      interpretation: "Deep contraction; recession-coincident; manufacturing collapse.",
    },
    {
      score: 2,
      label: "Manufacturing Recession",
      rangeLabel: "45 – 48.9",
      test: (v) => v >= 45 && v < 49,
      interpretation: "Manufacturing recession; persistent below 50; cycle-weakening.",
    },
    {
      score: 3,
      label: "Stall Speed",
      rangeLabel: "49 – 51",
      test: (v) => v >= 49 && v <= 51,
      interpretation: "Stall speed; could break either way; watch sub-components.",
    },
    {
      score: 4,
      label: "Healthy Expansion",
      rangeLabel: "51.1 – 55",
      test: (v) => v > 51 && v <= 55,
      interpretation: "Healthy expansion; new orders firm; mid-cycle.",
    },
    {
      score: 5,
      label: "Strong Expansion",
      rangeLabel: "> 55",
      test: (v) => v > 55,
      interpretation: "Strong expansion; boom-level; cyclicals leading.",
    },
  ];
  readonly examples: IndicatorExample[] = [
    { description: "Apr 2020 COVID trough",  inputs: { ISM_MFG_PMI: 41.5 }, expectedScore: 1 },
    { description: "2022–24 mfg recession",  inputs: { ISM_MFG_PMI: 47.4 }, expectedScore: 2 },
    { description: "2024 stall",             inputs: { ISM_MFG_PMI: 50.0 }, expectedScore: 3 },
    { description: "2026 recovery",          inputs: { ISM_MFG_PMI: 54.0 }, expectedScore: 4 },
    { description: "2021 recovery boom",     inputs: { ISM_MFG_PMI: 63.7 }, expectedScore: 5 },
  ];

  compute(input: ScoringInput): ScoringResult {
    const obs = this.latest(input, "ISM_MFG_PMI");
    if (!obs) return this.missingInputs("Missing ISM_MFG_PMI manual input in lookback window");

    const value = Number(obs.value);
    if (!Number.isFinite(value)) {
      return this.missingInputs(`Invalid ISM_MFG_PMI value: ${obs.value}`);
    }

    const band = this.band(value);
    return {
      indicatorKey: this.key,
      score: band.score,
      rawValue: value,
      bandLabel: band.label,
      interpretation: band.interpretation,
      inputsUsed: [{ seriesId: "ISM_MFG_PMI", date: obs.observationDate, value }],
      formulaTrace: `ISM_MFG_PMI (${obs.observationDate}) = ${value.toFixed(1)} → ${band.label}`,
    };
  }
}
