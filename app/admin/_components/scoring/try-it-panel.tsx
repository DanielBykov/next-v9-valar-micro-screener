"use client";

import { useMemo, useState } from "react";
import { getScorerByKey } from "@/lib/scoring/registry";
import type { IndicatorObservation } from "@/shared/schema";
import type { ApiScorer, ApiScoringResult } from "./types";

type Props = {
  scorer: ApiScorer;
  /** Optional seed values (e.g., the live result) to pre-populate inputs. */
  initialValues?: Record<string, number>;
  /** ISO YYYY-MM-DD — the asOfDate used when running compute(). */
  asOfDate: string;
};

/**
 * Lets the user feed synthetic values for each FRED input and runs the
 * actual scorer.compute() client-side. Uses the real registry classes so
 * band thresholds, formula traces, and warnings come straight from the
 * production code — no API round-trip.
 */
export function TryItPanel({ scorer: scorerMeta, initialValues, asOfDate }: Props) {
  const runtimeScorer = useMemo(() => getScorerByKey(scorerMeta.key), [scorerMeta.key]);

  const [values, setValues] = useState<Record<string, string>>(() => {
    const seed: Record<string, string> = {};
    for (const input of scorerMeta.inputs) {
      const v = initialValues?.[input.seriesId];
      seed[input.seriesId] = v != null ? String(v) : "";
    }
    return seed;
  });
  const [result, setResult] = useState<ApiScoringResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!runtimeScorer) {
    return (
      <p className="text-[11px] text-red-400 font-mono">
        Runtime scorer not registered for key {scorerMeta.key}.
      </p>
    );
  }

  const onRun = () => {
    setError(null);
    try {
      const asOf = new Date(`${asOfDate}T00:00:00Z`);
      const fetchedAt = new Date();
      const observations: Record<string, IndicatorObservation[]> = {};
      for (const input of scorerMeta.inputs) {
        const raw = values[input.seriesId];
        if (raw === "" || raw == null) {
          if (input.required) throw new Error(`Missing required input ${input.seriesId}`);
          continue;
        }
        const num = Number(raw);
        if (!Number.isFinite(num)) {
          throw new Error(`${input.seriesId} is not a number`);
        }
        observations[input.seriesId] = [
          {
            id: -1,
            seriesId: input.seriesId,
            observationDate: asOfDate,
            // numeric() in drizzle types as string; scorers cast via Number()
            value: String(num),
            source: "try-it",
            fetchedAt,
          },
        ];
      }
      const computed = runtimeScorer.compute({ asOfDate: asOf, observations });
      setResult(computed as ApiScoringResult);
    } catch (err: any) {
      setError(err?.message ?? "Compute failed");
      setResult(null);
    }
  };

  const onReset = () => {
    setResult(null);
    setError(null);
    const seed: Record<string, string> = {};
    for (const input of scorerMeta.inputs) {
      seed[input.seriesId] = "";
    }
    setValues(seed);
  };

  return (
    <div className="space-y-2">
      <div className="text-[10px] uppercase tracking-wider text-text-muted">Try it</div>
      <div className="grid grid-cols-2 gap-2">
        {scorerMeta.inputs.map((input) => (
          <label key={input.seriesId} className="flex flex-col gap-1">
            <span className="text-[10px] font-mono text-text-secondary">
              {input.seriesId}
              {input.required ? "" : " (optional)"}
            </span>
            <input
              type="number"
              step="any"
              value={values[input.seriesId] ?? ""}
              onChange={(e) =>
                setValues((prev) => ({ ...prev, [input.seriesId]: e.target.value }))
              }
              className="bg-surface-base border border-border-subtle rounded-md px-2 py-1 text-xs font-mono text-text-primary focus:outline-none focus:border-border-default"
            />
          </label>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onRun}
          className="bg-surface-overlay hover:bg-border-subtle border border-border-subtle text-text-primary text-xs font-medium px-3 py-1.5 rounded-md transition-colors"
        >
          Compute
        </button>
        <button
          type="button"
          onClick={onReset}
          className="text-text-secondary hover:text-text-primary text-xs px-2 py-1.5 rounded-md transition-colors"
        >
          Reset
        </button>
      </div>

      {error && (
        <p className="text-[11px] text-red-400 font-mono">{error}</p>
      )}
      {result && (
        <div className="bg-surface-base border border-border-subtle rounded-md p-3 space-y-1 text-xs font-mono">
          <div>
            <span className="text-text-muted">score </span>
            <span className="text-text-primary font-semibold">{result.score}</span>
            <span className="text-text-muted"> · band </span>
            <span className="text-text-faint">{result.bandLabel}</span>
          </div>
          <div className="text-text-secondary">{result.formulaTrace}</div>
          <div className="text-text-secondary">{result.interpretation}</div>
          {result.warning && (
            <div className="text-amber-400">⚠ {result.warning}</div>
          )}
        </div>
      )}
    </div>
  );
}
