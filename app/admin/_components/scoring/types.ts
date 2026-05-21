/**
 * Wire-format types for the engine admin page.
 *
 * These mirror the JSON shapes emitted by /api/admin/engine/{metadata,live,trend}.
 * `test` functions on bands are dropped at the wire layer; the page uses
 * `rangeLabel` for display and falls back to the registry for client-side
 * computation (TryItPanel).
 */

export type Score = 1 | 2 | 3 | 4 | 5;

export type ApiBand = {
  score: Score;
  label: string;
  rangeLabel: string;
  interpretation: string;
};

export type ApiSeriesInput = {
  seriesId: string;
  lookbackDays: number;
  required: boolean;
};

export type ApiExample = {
  description: string;
  inputs: Record<string, number>;
  expectedScore: Score;
};

export type ApiScorer = {
  key: string;
  name: string;
  blockKey: string;
  unit: string;
  description: string;
  formula: string;
  formulaPretty: string;
  inputs: ApiSeriesInput[];
  bands: ApiBand[];
  examples: ApiExample[];
};

export type ApiRegimeMapping = {
  label: string;
  min: number;
  max: number;
  interpretation: string;
};

export type ApiBlock = {
  key: string;
  name: string;
  sortOrder: number;
  regimeMap: ApiRegimeMapping[];
  scorers: ApiScorer[];
};

export type EngineMetadata = {
  blocks: ApiBlock[];
};

export type ApiScoringInputUsed = {
  seriesId: string;
  date: string;
  value: number;
};

export type ApiScoringResult = {
  indicatorKey: string;
  score: Score;
  rawValue: number | null;
  bandLabel: string;
  interpretation: string;
  inputsUsed: ApiScoringInputUsed[];
  formulaTrace: string;
  warning?: string;
};

export type ApiBlockResult = {
  blockKey: string;
  blockName: string;
  asOfDate: string;
  indicators: ApiScoringResult[];
  blockAverage: number;
  blockScore: number;
  regimeLabel: string;
};

export type ApiSnapshotResult = {
  asOfDate: string;
  blocks: ApiBlockResult[];
  totalScore: number;
  regime: string;
  computedAt: string;
};

export type ApiTrendPoint = {
  date: string;
  score: Score | null;
  rawValue: number | null;
  bandLabel: string | null;
  warning?: string;
};

export type ApiTrend = {
  indicatorKey: string;
  blockKey: string;
  from: string;
  to: string;
  days: number;
  points: ApiTrendPoint[];
};
