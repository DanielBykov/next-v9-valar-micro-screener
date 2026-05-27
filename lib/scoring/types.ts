import type { IndicatorObservation } from "@/shared/schema";
import type { IndicatorScorer } from "@/lib/scoring/indicator-scorer";

export type Score = 1 | 2 | 3 | 4 | 5;

/**
 * Where a series' observations come from.
 * - "fred": automated FRED fetch into indicator_observations.
 * - "manual": analyst-entered value in indicator_manual_inputs.
 *
 * Defaulting to "fred" preserves existing scorers untouched; only scorers
 * that need manual inputs need to set this explicitly.
 */
export type SeriesSource = "fred" | "manual";

export type SeriesInputSpec = {
  seriesId: string;
  lookbackDays: number;
  required: boolean;
  source?: SeriesSource;
};

export type ScoreBand = {
  score: Score;
  label: string;
  rangeLabel: string;
  test: (value: number) => boolean;
  interpretation: string;
};

export type IndicatorExample = {
  description: string;
  inputs: Record<string, number>;
  expectedScore: Score;
};

export type ObservationsByseries = Record<string, IndicatorObservation[]>;

export type ScoringInput = {
  asOfDate: Date;
  /** Observations grouped by series_id, each list sorted by observation_date DESC. */
  observations: ObservationsByseries;
};

export type ScoringInputUsed = {
  seriesId: string;
  date: string;
  value: number;
};

export type ScoringResult = {
  indicatorKey: string;
  score: Score;
  rawValue: number | null;
  bandLabel: string;
  interpretation: string;
  inputsUsed: ScoringInputUsed[];
  formulaTrace: string;
  warning?: string;
};

export type BlockResult = {
  blockKey: string;
  blockName: string;
  asOfDate: string;
  /** Percent of total score this block carries in the V1 framework (metadata). */
  blockWeight: number;
  indicators: ScoringResult[];
  /** Weighted average of indicator scores (range 1.0 – 5.0). */
  blockAverage: number;
  /** Rounded blockAverage × 4 (range 0 – 20). */
  blockScore: number;
  regimeLabel: string;
};

export type SnapshotResult = {
  asOfDate: string;
  blocks: BlockResult[];
  totalScore: number;
  regime: string;
  computedAt: string;
};

export type BlockRegimeMapping = {
  label: string;
  min: number;
  max: number;
  interpretation: string;
};

export type BlockDefinition = {
  key: string;
  name: string;
  sortOrder: number;
  /**
   * Percent of total Macro Pulse Score this block carries in the V1 framework
   * (see docs_local/.../weights.md). Stored for display + future weighted
   * total-score aggregation; not currently applied to totalScore (totals
   * remain Σ blockScore on the 0–120 scale).
   */
  weight: number;
  scorers: IndicatorScorer[];
  regimeMap: BlockRegimeMapping[];
  regimeFor: (blockAverage: number) => string;
};
