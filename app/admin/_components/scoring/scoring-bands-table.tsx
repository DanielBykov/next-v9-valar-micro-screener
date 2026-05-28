"use client";

import type { ApiBand, Score } from "./types";

type Props = {
  bands: ApiBand[];
  currentScore: Score | null;
};

export function ScoringBandsTable({ bands, currentScore }: Props) {
  return (
    <table className="w-full text-xs font-mono">
      <thead className="text-text-muted">
        <tr className="border-b border-surface-overlay">
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
              className={`border-b border-surface-overlay ${isCurrent ? "bg-surface-overlay/60" : ""}`}
            >
              <td className="py-1.5 pr-3 text-text-faint">{b.score}</td>
              <td
                className={`py-1.5 pr-3 ${
                  isCurrent ? "text-text-primary font-semibold" : "text-text-secondary"
                }`}
              >
                {b.label}
              </td>
              <td className="py-1.5 pr-3 text-text-faint">{b.rangeLabel}</td>
              <td className="py-1.5 text-text-secondary">{b.interpretation}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
