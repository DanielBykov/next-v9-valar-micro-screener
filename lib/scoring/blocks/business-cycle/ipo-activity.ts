import { IndicatorScorer } from "@/lib/scoring/indicator-scorer";
import type {
  IndicatorExample,
  ScoreBand,
  ScoringInput,
  ScoringResult,
  SeriesInputSpec,
} from "@/lib/scoring/types";

/**
 * IPO Activity — 5.6
 *
 * 12-month-trailing US IPO proceeds (USD bn) — a direct proxy for capital-
 * market risk appetite. Linear ascending: higher proceeds = higher score.
 *
 * Two-edged caveat (spec §5.6): extreme IPO booms historically mark cycle
 * peaks (1999, 2007, 2021). Score 5 therefore carries a frothiness / cycle-peak
 * flag. A U-shaped alternative remains an open design question; this V1 uses
 * the linear ascending rubric matching the seeded score column.
 *
 * Source: Manual (stockanalysis.com monthly count + proceeds; 12M trailing)
 * Spec: docs_local/.../scoring-engine/block-5-business-cycle.md §5.6
 */
export class IpoActivityScorer extends IndicatorScorer {
  readonly key = "ipo_activity";
  readonly name = "IPO Activity";
  readonly blockKey = "business_cycle";
  readonly unit = "$bn 12m";
  // Spec weight 5% within Block 5.
  readonly weight = 5;
  readonly description =
    "12-month-trailing US IPO proceeds in USD billions — a proxy for capital-" +
    "market risk appetite. Scored linear ascending; the top band carries a " +
    "cycle-peak frothiness caveat.";
  readonly formula = "score(IPO_TRAILING_12M_PROCEEDS_latest)";
  readonly formulaPretty = "score = band(IPO_TRAILING_12M_PROCEEDS_latest)";
  readonly inputs: SeriesInputSpec[] = [
    { seriesId: "IPO_TRAILING_12M_PROCEEDS", lookbackDays: 60, required: true, source: "manual" },
  ];
  readonly bands: ScoreBand[] = [
    {
      score: 1,
      label: "Markets Frozen",
      rangeLabel: "< $10B",
      test: (v) => v < 10,
      interpretation: "Capital markets frozen; risk appetite collapsed; cycle-bottom signal.",
    },
    {
      score: 2,
      label: "Subdued",
      rangeLabel: "$10B – $25B",
      test: (v) => v >= 10 && v < 25,
      interpretation: "Subdued IPO market; cautious risk appetite.",
    },
    {
      score: 3,
      label: "Normal",
      rangeLabel: "$25B – $50B",
      test: (v) => v >= 25 && v < 50,
      interpretation: "Normal IPO pace; healthy but unexceptional.",
    },
    {
      score: 4,
      label: "Strong Activity",
      rangeLabel: "$50B – $100B",
      test: (v) => v >= 50 && v < 100,
      interpretation: "Strong capital-market activity; broad risk appetite.",
    },
    {
      score: 5,
      label: "IPO Boom",
      rangeLabel: "> $100B",
      test: (v) => v >= 100,
      interpretation: "IPO boom; max risk appetite; contrarian flag — cycle-peak risk.",
    },
  ];
  readonly examples: IndicatorExample[] = [
    { description: "2022 freeze",        inputs: { proceeds_bn: 8 },   expectedScore: 1 },
    { description: "Subdued recovery",   inputs: { proceeds_bn: 20 },  expectedScore: 2 },
    { description: "2026 normal",        inputs: { proceeds_bn: 46.2 }, expectedScore: 3 },
    { description: "Strong activity",    inputs: { proceeds_bn: 75 },  expectedScore: 4 },
    { description: "2021 boom",          inputs: { proceeds_bn: 150 }, expectedScore: 5 },
  ];

  compute(input: ScoringInput): ScoringResult {
    const obs = this.latest(input, "IPO_TRAILING_12M_PROCEEDS");
    if (!obs) {
      return this.missingInputs("Missing IPO_TRAILING_12M_PROCEEDS manual input in lookback window");
    }

    const value = Number(obs.value);
    if (!Number.isFinite(value)) {
      return this.missingInputs(`Invalid IPO_TRAILING_12M_PROCEEDS value: ${obs.value}`);
    }

    const band = this.band(value);
    return {
      indicatorKey: this.key,
      score: band.score,
      rawValue: value,
      bandLabel: band.label,
      interpretation: band.interpretation,
      inputsUsed: [{ seriesId: "IPO_TRAILING_12M_PROCEEDS", date: obs.observationDate, value }],
      formulaTrace:
        `IPO_TRAILING_12M_PROCEEDS (${obs.observationDate}) = $${value.toFixed(1)}B → ${band.label}`,
    };
  }
}
