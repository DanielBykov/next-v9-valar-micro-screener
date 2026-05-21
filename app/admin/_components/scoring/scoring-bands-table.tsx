"use client";

import type { ApiBand, Score } from "./types";

type Props = {
  bands: ApiBand[];
  currentScore: Score | null;
};

export function ScoringBandsTable({ bands, currentScore }: Props) {
  return (
    <table className="w-full text-xs font-mono">
      <thead className="text-[#64748B]">
        <tr className="border-b border-[#1E293B]">
          <th className="text-left py-1.5 pr-3 w-8">#</th>
          <th className="text-left py-1.5 pr-3">Label</th>
          <th className="text-left py-1.5 pr-3">Range</th>
          <th className="text-left py-1.5">Interpretation</th>
        </tr>
      </thead>
      <tbody>
        {bands.map((b) => {
          const isCurrent = b.score === currentScore;
          return (
            <tr
              key={b.score}
              className={`border-b border-[#1E293B] ${isCurrent ? "bg-[#1E293B]/60" : ""}`}
            >
              <td className="py-1.5 pr-3 text-[#cbd5e1]">{b.score}</td>
              <td
                className={`py-1.5 pr-3 ${
                  isCurrent ? "text-[#F8FAFC] font-semibold" : "text-[#94A3B8]"
                }`}
              >
                {b.label}
              </td>
              <td className="py-1.5 pr-3 text-[#cbd5e1]">{b.rangeLabel}</td>
              <td className="py-1.5 text-[#94A3B8]">{b.interpretation}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
