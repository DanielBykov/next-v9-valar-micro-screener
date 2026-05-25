export interface DashboardData {
  snapshot: {
    id: number;
    snapshotDate: string;
    totalScore: number;
    regime: string;
    regimeSubtitle: string | null;
    interpretation: string;
    vsYesterday: number | null;
    vs3mAvg: number | null;
    vs1yAvg: number | null;
    oneYearAgoScore: number | null;
  };
  blocks: Array<{
    id: number;
    name: string;
    score: number;
    maxScore: number;
    summary: string;
    drivers: Array<{ name: string; score: number }>;
    metrics: Array<{
      id: number;
      name: string;
      domain: string;
      score: number;
      maxScore: number;
      interpretation: string;
      isTopDriver: number;
    }>;
    isPlanned?: boolean;
  }>;
  metrics: Array<{
    id: number;
    name: string;
    domain: string;
    score: number;
    maxScore: number;
    interpretation: string;
  }>;
  trend: Array<{
    month: string;
    score: number;
    sortOrder: number;
  }>;
}
