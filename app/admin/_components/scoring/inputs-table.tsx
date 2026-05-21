"use client";

import { ExternalLink } from "lucide-react";
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
      <thead className="text-[#64748B]">
        <tr className="border-b border-[#1E293B]">
          <th className="text-left py-1.5 pr-3">Series</th>
          <th className="text-left py-1.5 pr-3">Lookback</th>
          <th className="text-left py-1.5 pr-3">Required</th>
          <th className="text-left py-1.5 pr-3">Latest date</th>
          <th className="text-left py-1.5">Value</th>
        </tr>
      </thead>
      <tbody>
        {inputs.map((spec) => {
          const used = usedByseries.get(spec.seriesId);
          return (
            <tr key={spec.seriesId} className="border-b border-[#1E293B]">
              <td className="py-1.5 pr-3">
                <a
                  href={FRED_URL(spec.seriesId)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#cbd5e1] hover:text-[#F8FAFC] inline-flex items-center gap-1"
                >
                  {spec.seriesId}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </td>
              <td className="py-1.5 pr-3 text-[#94A3B8]">{spec.lookbackDays}d</td>
              <td className="py-1.5 pr-3 text-[#94A3B8]">{spec.required ? "yes" : "no"}</td>
              <td className="py-1.5 pr-3 text-[#94A3B8]">{used?.date ?? "—"}</td>
              <td className="py-1.5 text-[#cbd5e1]">
                {used ? Number(used.value).toString() : "—"}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
