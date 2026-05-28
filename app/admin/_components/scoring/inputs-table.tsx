"use client";

import { ExternalLink, Pencil } from "lucide-react";
import type { ApiScoringInputUsed, ApiSeriesInput } from "./types";

type Props = {
  inputs: ApiSeriesInput[];
  inputsUsed: ApiScoringInputUsed[];
};

const FRED_URL = (seriesId: string) => `https://fred.stlouisfed.org/series/${seriesId}`;

export function InputsTable({ inputs, inputsUsed }: Props) {
  const usedByseries = new Map(inputsUsed.map((u) => [u.seriesId, u]));

  return (
    <table className="w-full text-xs font-mono">
      <thead className="text-text-muted">
        <tr className="border-b border-surface-overlay">
          <th className="text-left py-1.5 pr-3">Series</th>
          <th className="text-left py-1.5 pr-3">Source</th>
          <th className="text-left py-1.5 pr-3">Lookback</th>
          <th className="text-left py-1.5 pr-3">Required</th>
          <th className="text-left py-1.5 pr-3">Latest date</th>
          <th className="text-left py-1.5">Value</th>
        </tr>
      </thead>
      <tbody>
        {inputs.map((spec) => {
          const used = usedByseries.get(spec.seriesId);
          const isManual = spec.source === "manual";
          return (
            <tr key={spec.seriesId} className="border-b border-surface-overlay">
              <td className="py-1.5 pr-3">
                {isManual ? (
                  <a
                    href="/admin/manual-inputs"
                    className="text-text-faint hover:text-text-primary inline-flex items-center gap-1"
                  >
                    {spec.seriesId}
                    <Pencil className="h-3 w-3" />
                  </a>
                ) : (
                  <a
                    href={FRED_URL(spec.seriesId)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-text-faint hover:text-text-primary inline-flex items-center gap-1"
                  >
                    {spec.seriesId}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </td>
              <td className="py-1.5 pr-3 text-text-secondary">{spec.source}</td>
              <td className="py-1.5 pr-3 text-text-secondary">{spec.lookbackDays}d</td>
              <td className="py-1.5 pr-3 text-text-secondary">{spec.required ? "yes" : "no"}</td>
              <td className="py-1.5 pr-3 text-text-secondary">{used?.date ?? "—"}</td>
              <td className="py-1.5 text-text-faint">
                {used ? Number(used.value).toString() : "—"}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
