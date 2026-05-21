import type { IndicatorObservation } from "@/shared/schema";

export function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function daysAgo(asOf: Date, days: number): Date {
  const d = new Date(asOf);
  d.setUTCDate(d.getUTCDate() - days);
  return d;
}

/**
 * Find the observation closest to (and not after) the target date.
 * Assumes observations are sorted by observation_date DESC.
 */
export function observationAtOrBefore(
  observations: IndicatorObservation[],
  targetDate: Date,
): IndicatorObservation | null {
  const target = toIsoDate(targetDate);
  for (const obs of observations) {
    if (obs.observationDate <= target) return obs;
  }
  return null;
}

/**
 * Map the total snapshot score (0–120) to a regime label.
 * Matches thresholds used in app/components/dashboard.tsx.
 */
export function regimeForTotalScore(totalScore: number): string {
  if (totalScore >= 100) return "Strong Risk-On";
  if (totalScore >= 85) return "Constructive Risk-On";
  if (totalScore >= 70) return "Neutral / Balanced";
  if (totalScore >= 55) return "Fragile & Volatile";
  return "Risk-Off";
}

/**
 * Map a 1–5 indicator average to a 0–20 block score.
 * Scale factor of 4: avg=1 → 4, avg=5 → 20.
 */
export function blockAverageToScore(average: number): number {
  return Math.round(average * 4);
}
