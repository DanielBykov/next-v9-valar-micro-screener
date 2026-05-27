import type { IndicatorObservation } from "@/shared/schema";

/*
 * Weighting math (V1, see docs_local/.../weights.md):
 *
 *   blockAverage = Σ (score_i × indicator_weight_i) / Σ indicator_weight_i   // 1.0 – 5.0
 *   blockScore   = round(blockAverage × 4)                                   // 0 – 20
 *   totalScore   = Σ blockScore                                              // 0 – 120
 *
 * Block weights (block.weight) are stored on BlockDefinition and surfaced
 * to the admin UI but NOT applied to totalScore — totals remain on the
 * 0–120 scale to preserve existing regime thresholds and dashboard gauge.
 */

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

const ONE_YEAR_DAYS = 365;

/**
 * Compute a year-over-year percentage change from a monthly index series.
 *
 * Picks the latest observation on or before `asOfDate` as `latest`, then
 * searches the DESC-sorted list for the observation whose date is closest
 * to `latest.observationDate − 365 days`. Returns null if either is missing.
 *
 * Used by CPI / Core CPI / Wage Growth scorers — FRED publishes these as
 * monthly index levels; the rubric is expressed in YoY %.
 *
 * Caller must ensure each scorer's `lookbackDays` is ≥ ~400 to cover the
 * full 12-month window comfortably even with publication lag.
 */
export function yoyPctFromIndex(
  observations: IndicatorObservation[],
  asOfDate: Date,
): {
  latest: IndicatorObservation;
  prior: IndicatorObservation;
  yoyPct: number;
} | null {
  if (observations.length === 0) return null;
  const latest = observationAtOrBefore(observations, asOfDate);
  if (!latest) return null;

  const latestMs = new Date(latest.observationDate).getTime();
  const targetMs = latestMs - ONE_YEAR_DAYS * 24 * 60 * 60 * 1000;

  let prior: IndicatorObservation | null = null;
  let bestDiff = Infinity;
  for (const obs of observations) {
    if (obs === latest) continue;
    const ms = new Date(obs.observationDate).getTime();
    // Only consider observations strictly before `latest` to avoid picking
    // the same month twice when the series has duplicated dates.
    if (ms >= latestMs) continue;
    const diff = Math.abs(ms - targetMs);
    if (diff < bestDiff) {
      bestDiff = diff;
      prior = obs;
    }
  }
  if (!prior) return null;

  const latestValue = Number(latest.value);
  const priorValue = Number(prior.value);
  if (!Number.isFinite(latestValue) || !Number.isFinite(priorValue) || priorValue === 0) {
    return null;
  }

  const yoyPct = (latestValue / priorValue - 1) * 100;
  return { latest, prior, yoyPct };
}
