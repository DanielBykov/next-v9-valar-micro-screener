"use client";

import type { ApiExample } from "./types";

type Props = {
  examples: ApiExample[];
};

export function ExamplesTable({ examples }: Props) {
  if (examples.length === 0) {
    return <p className="text-[11px] text-[#64748B] italic">No examples provided.</p>;
  }

  return (
    <table className="w-full text-xs font-mono">
      <thead className="text-[#64748B]">
        <tr className="border-b border-[#1E293B]">
          <th className="text-left py-1.5 pr-3">Scenario</th>
          <th className="text-left py-1.5 pr-3">Inputs</th>
          <th className="text-left py-1.5">Expected</th>
        </tr>
      </thead>
      <tbody>
        {examples.map((ex) => (
          <tr key={ex.description} className="border-b border-[#1E293B]">
            <td className="py-1.5 pr-3 text-[#cbd5e1]">{ex.description}</td>
            <td className="py-1.5 pr-3 text-[#94A3B8]">
              {Object.entries(ex.inputs)
                .map(([k, v]) => `${k}=${v}`)
                .join(", ")}
            </td>
            <td className="py-1.5 text-[#cbd5e1]">{ex.expectedScore}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
