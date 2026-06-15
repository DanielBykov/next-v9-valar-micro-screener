import { IndicatorScorer } from "@/lib/scoring/indicator-scorer";
import type {
  IndicatorExample,
  ScoreBand,
  ScoringInput,
  ScoringResult,
  SeriesInputSpec,
} from "@/lib/scoring/types";

/**
 * Sanctions Activity — 6.5
 *
 * Event-based manual indicator. No clean public numeric index exists; major
 * sanctions events are infrequent (0–2 scoreable events/year). The default
 * score is 3 (neutral) and is only overridden when an analyst seeds an event
 * score for SANCTIONS_ACTIVITY. With no input present, this returns a neutral
 * score 3 via missingInputs() — by design, not a data gap.
 *
 * `numeric_descending`: a major sanctions package = low score; relief = high.
 *
 * Source: Manual event scoring (OFAC Recent Actions + news scan). Optional input.
 * Spec: docs_local/.../scoring-engine/block-6-political-narrative.md §6.5
 */
export class SanctionsActivityScorer extends IndicatorScorer {
  readonly key = "sanctions_activity";
  readonly name = "Sanctions Activity";
  readonly blockKey = "political_narrative";
  readonly unit = "score";
  // Spec weight 10% within Block 6.
  readonly weight = 10;
  readonly description =
    "Frequency and severity of new economic sanctions imposed globally. " +
    "Event-scored; defaults to 3 (background activity) and is overridden only " +
    "when a major sanctions package or relief event is flagged.";
  readonly formula = "score(SANCTIONS_ACTIVITY_latest) ?? 3";
  readonly formulaPretty = "score = SANCTIONS_ACTIVITY_latest (default 3 when no event)";
  // Optional: absent input is the expected steady state, not a missing-data error.
  readonly inputs: SeriesInputSpec[] = [
    { seriesId: "SANCTIONS_ACTIVITY", lookbackDays: 120, required: false, source: "manual" },
  ];
  readonly bands: ScoreBand[] = [
    {
      score: 1,
      label: "Major Package",
      rangeLabel: "1",
      test: (v) => v === 1,
      interpretation: "Crisis-level economic warfare; severe commodity/FX disruption (G7-level package).",
    },
    {
      score: 2,
      label: "Significant New Sanctions",
      rangeLabel: "2",
      test: (v) => v === 2,
      interpretation: "Material economic impact; sector- or country-targeted disruption.",
    },
    {
      score: 3,
      label: "Routine Enforcement",
      rangeLabel: "3",
      test: (v) => v === 3,
      interpretation: "Background sanctions activity; no acute event (default state).",
    },
    {
      score: 4,
      label: "Easing",
      rangeLabel: "4",
      test: (v) => v === 4,
      interpretation: "Sanctions easing or removal; de-escalation for affected markets.",
    },
    {
      score: 5,
      label: "Broad Relief",
      rangeLabel: "5",
      test: (v) => v === 5,
      interpretation: "Broad sanctions relief; normalisation (historically rare).",
    },
  ];
  readonly examples: IndicatorExample[] = [
    { description: "2022 Russia SWIFT cutoff", inputs: { SANCTIONS_ACTIVITY: 1 }, expectedScore: 1 },
    { description: "Default — no event", inputs: { SANCTIONS_ACTIVITY: 3 }, expectedScore: 3 },
    { description: "Broad relief", inputs: { SANCTIONS_ACTIVITY: 5 }, expectedScore: 5 },
  ];

  compute(input: ScoringInput): ScoringResult {
    const obs = this.latest(input, "SANCTIONS_ACTIVITY");
    if (!obs) {
      // No event seeded → neutral background state (score 3), as designed.
      return {
        indicatorKey: this.key,
        score: 3,
        rawValue: 3,
        bandLabel: "Routine Enforcement",
        interpretation: this.bands[2].interpretation,
        inputsUsed: [],
        formulaTrace: "SANCTIONS_ACTIVITY: no event flagged → default 3 (Routine Enforcement)",
      };
    }

    const value = Number(obs.value);
    if (!Number.isFinite(value)) {
      return this.missingInputs(`Invalid SANCTIONS_ACTIVITY value: ${obs.value}`);
    }

    const band = this.band(value);
    return {
      indicatorKey: this.key,
      score: band.score,
      rawValue: value,
      bandLabel: band.label,
      interpretation: band.interpretation,
      inputsUsed: [{ seriesId: "SANCTIONS_ACTIVITY", date: obs.observationDate, value }],
      formulaTrace: `SANCTIONS_ACTIVITY (${obs.observationDate}) = ${value} → ${band.label}`,
    };
  }
}
