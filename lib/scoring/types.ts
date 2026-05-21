import type { IndicatorObservation } from "@/shared/schema";
import type { IndicatorScorer } from "@/lib/scoring/indicator-scorer";

export type Score = 1 | 2 | 3 | 4 | 5;

export type SeriesInputSpec = {
  seriesId: string;
  lookbackDays: number;
  required: boolean;
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
  indicators: ScoringResult[];
  blockAverage: number;
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
  scorers: IndicatorScorer[];
  regimeMap: BlockRegimeMapping[];
  regimeFor: (blockAverage: number) => string;
};
