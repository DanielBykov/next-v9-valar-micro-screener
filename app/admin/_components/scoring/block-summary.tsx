"use client";

import type { ApiBlock, ApiBlockResult } from "./types";

type Props = {
  block: ApiBlock;
  liveBlock: ApiBlockResult | null;
};

export function BlockSummary({ block, liveBlock }: Props) {
  return (
    <section className="bg-[#0B1120] border border-[#475569] rounded-xl p-6">
      <div className="flex items-baseline gap-3 mb-1">
        <h2 className="text-base font-semibold tracking-wide text-[#F8FAFC]">{block.name}</h2>
        <span className="text-[10px] font-mono text-amber-400 border border-amber-500/20 bg-amber-500/10 rounded px-1.5 py-0.5">
          weight {block.weight}%
        </span>
        {liveBlock && (
          <span className="text-[10px] font-mono text-[#94A3B8]">
            avg {liveBlock.blockAverage.toFixed(2)} · score {liveBlock.blockScore}/20 ·{" "}
            <span className="text-[#F8FAFC] font-semibold">{liveBlock.regimeLabel}</span>
          </span>
        )}
      </div>
      <p className="text-xs text-[#94A3B8] mb-5">
        Block-average to regime mapping. Average is the indicator-weight-weighted mean of
        indicator scores (1–5); block score is average × 4 → 0–20.
      </p>

      <table className="w-full text-xs font-mono">
        <thead className="text-[#64748B]">
          <tr className="border-b border-[#1E293B]">
            <th className="text-left py-1.5 pr-3">Avg</th>
            <th className="text-left py-1.5 pr-3">Regime</th>
            <th className="text-left py-1.5">Interpretation</th>
          </tr>
        </thead>
        <tbody>
          {block.regimeMap.map((r) => {
            const isCurrent =
              liveBlock != null &&
              liveBlock.blockAverage >= r.min &&
              liveBlock.blockAverage <= r.max;
            return (
              <tr
                key={r.label}
                className={`border-b border-[#1E293B] ${
                  isCurrent ? "bg-[#1E293B]/60" : ""
                }`}
              >
                <td className="py-1.5 pr-3 text-[#cbd5e1]">
                  {r.min.toFixed(1)}–{r.max.toFixed(1)}
                </td>
                <td
                  className={`py-1.5 pr-3 ${
                    isCurrent ? "text-[#F8FAFC] font-semibold" : "text-[#94A3B8]"
                  }`}
                >
                  {r.label}
                </td>
                <td className="py-1.5 text-[#94A3B8]">{r.interpretation}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
