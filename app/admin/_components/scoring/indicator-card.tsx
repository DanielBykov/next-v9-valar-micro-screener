"use client";

import Link from "next/link";
import { Pencil } from "lucide-react";
import type { ApiScorer, ApiScoringResult } from "./types";
import { FormulaBlock } from "./formula-block";
import { ScoringBandsTable } from "./scoring-bands-table";
import { InputsTable } from "./inputs-table";
import { ExamplesTable } from "./examples-table";
import { IndicatorSparkline } from "./indicator-sparkline";
import { TryItPanel } from "./try-it-panel";

type Props = {
  scorer: ApiScorer;
  liveResult: ApiScoringResult | null;
};

function scoreBadgeClasses(score: number) {
  if (score >= 4) return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
  if (score === 3) return "bg-blue-500/10 text-blue-400 border-blue-500/20";
  if (score === 2) return "bg-amber-500/10 text-amber-400 border-amber-500/20";
  return "bg-red-500/10 text-red-400 border-red-500/20";
}

export function IndicatorCard({ scorer, liveResult }: Props) {
  const initialValues = liveResult?.inputsUsed
    ? Object.fromEntries(liveResult.inputsUsed.map((u) => [u.seriesId, Number(u.value)]))
    : undefined;

  const hasManualInput = scorer.inputs.some((i) => i.source === "manual");

  return (
    <section
      id={`indicator-${scorer.key}`}
      className="bg-surface-raised border border-border-subtle rounded-xl p-6 space-y-5"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-text-primary">{scorer.name}</h3>
            <span className="text-[10px] font-mono text-amber-400 border border-amber-500/20 bg-amber-500/10 rounded px-1.5 py-0.5">
              weight {scorer.weight}%
            </span>
            {hasManualInput && (
              <Link
                href="/admin/manual-inputs"
                className="inline-flex items-center gap-1 text-[10px] font-mono text-blue-400 border border-blue-500/20 bg-blue-500/10 rounded px-1.5 py-0.5 hover:bg-blue-500/20 transition-colors"
                title="This indicator requires a manual analyst entry"
              >
                <Pencil className="h-3 w-3" />
                manual input
              </Link>
            )}
          </div>
          <p className="text-[11px] font-mono text-text-muted mt-0.5">
            {scorer.key} · unit {scorer.unit}
          </p>
        </div>
        {liveResult ? (
          <div className="flex items-center gap-2">
            <span
              className={`text-[11px] font-mono font-semibold px-2 py-0.5 rounded border ${scoreBadgeClasses(liveResult.score)}`}
            >
              {liveResult.score} · {liveResult.bandLabel}
            </span>
            {liveResult.rawValue != null && (
              <span className="text-[11px] font-mono text-text-secondary">
                raw {liveResult.rawValue.toFixed(2)}{scorer.unit === "%" ? "%" : ""}
              </span>
            )}
          </div>
        ) : (
          <span className="text-[11px] font-mono text-text-muted">no live data</span>
        )}
      </div>

      {/* Description */}
      <p className="text-xs text-text-faint leading-relaxed">{scorer.description}</p>

      {/* Live warning */}
      {liveResult?.warning && (
        <p className="text-[11px] font-mono text-amber-400">⚠ {liveResult.warning}</p>
      )}

      {/* Formula */}
      <FormulaBlock
        formulaPretty={scorer.formulaPretty}
        trace={liveResult ? liveResult.formulaTrace : null}
      />

      {/* Inputs */}
      <div className="space-y-1">
        <div className="text-[10px] uppercase tracking-wider text-text-muted">Inputs</div>
        <InputsTable inputs={scorer.inputs} inputsUsed={liveResult?.inputsUsed ?? []} />
      </div>

      {/* Bands */}
      <div className="space-y-1">
        <div className="text-[10px] uppercase tracking-wider text-text-muted">Bands</div>
        <ScoringBandsTable bands={scorer.bands} currentScore={liveResult?.score ?? null} />
      </div>

      {/* Examples */}
      <div className="space-y-1">
        <div className="text-[10px] uppercase tracking-wider text-text-muted">Examples</div>
        <ExamplesTable examples={scorer.examples} />
      </div>

      {/* Sparkline */}
      <IndicatorSparkline indicatorKey={scorer.key} />

      {/* Try it */}
      <TryItPanel scorer={scorer} initialValues={initialValues} />
    </section>
  );
}
