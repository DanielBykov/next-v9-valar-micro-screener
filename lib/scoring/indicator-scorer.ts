import type {
  IndicatorExample,
  ScoreBand,
  ScoringInput,
  ScoringResult,
  SeriesInputSpec,
} from "@/lib/scoring/types";
import type { IndicatorObservation } from "@/shared/schema";

/**
 * Base class for an indicator scoring rule.
 *
 * Each subclass declares:
 *   - identity (key, name, blockKey, unit)
 *   - documentation (description, formula, formulaPretty, examples)
 *   - inputs it needs from indicator_observations
 *   - the 1–5 scoring bands
 *   - a pure compute() that turns observations into a ScoringResult
 *
 * The same instance powers both the runtime engine and the admin docs page.
 */
export abstract class IndicatorScorer {
  abstract readonly key: string;
  abstract readonly name: string;
  abstract readonly blockKey: string;
  abstract readonly unit: string;
  abstract readonly description: string;
  abstract readonly formula: string;
  abstract readonly formulaPretty: string;
  abstract readonly inputs: SeriesInputSpec[];
  abstract readonly bands: ScoreBand[];
  abstract readonly examples: IndicatorExample[];

  /** Pure function: observations → scoring result. */
  abstract compute(input: ScoringInput): ScoringResult;

  /** Latest (most recent) observation for a series, or null if missing. */
  protected latest(input: ScoringInput, seriesId: string): IndicatorObservation | null {
    return input.observations[seriesId]?.[0] ?? null;
  }

  /** Map a numeric value through the bands. Falls back to the middle band (3) if no band matches. */
  protected band(value: number): ScoreBand {
    const found = this.bands.find((b) => b.test(value));
    if (found) return found;
    return this.bands.find((b) => b.score === 3) ?? this.bands[Math.floor(this.bands.length / 2)];
  }

  /** Convenience: build a "missing inputs" result with a warning. */
  protected missingInputs(warning: string): ScoringResult {
    return {
      indicatorKey: this.key,
      score: 3,
      rawValue: null,
      bandLabel: "Unknown",
      interpretation: "Insufficient data to compute score.",
      inputsUsed: [],
      formulaTrace: "n/a",
      warning,
    };
  }
}
