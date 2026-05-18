"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import { SERIES_BY_BLOCK } from "@/lib/fred/series-catalog";

type CoverageRow = { seriesId: string; month: string; count: number };

const ALL_SERIES: string[] = Array.from(new Set(Object.values(SERIES_BY_BLOCK).flat()));

export function CoverageTable() {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<"loading" | "error" | "done">("loading");
  const [error, setError] = useState("");
  const [months, setMonths] = useState<string[]>([]);
  const [grid, setGrid] = useState<Record<string, Record<string, number>>>({});

  useEffect(() => {
    fetch("/api/admin/indicators/coverage")
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);
        return data.coverage as CoverageRow[];
      })
      .then((rows) => {
        const lookup: Record<string, Record<string, number>> = {};
        const monthSet = new Set<string>();

        for (const r of rows) {
          monthSet.add(r.month);
          if (!lookup[r.month]) lookup[r.month] = {};
          lookup[r.month][r.seriesId] = r.count;
        }

        setMonths(Array.from(monthSet).sort().reverse());
        setGrid(lookup);
        setStatus("done");
      })
      .catch((err) => {
        setError(err.message || "Unknown error");
        setStatus("error");
      });
  }, []);

  return (
    <section className="bg-[#111827] border border-[#334155] rounded-xl">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between p-6 cursor-pointer"
      >
        <div className="text-left">
          <h2 className="text-sm font-semibold uppercase tracking-wider mb-1">Data Coverage</h2>
          <p className="text-xs text-[#94A3B8]">
            Observation counts per series per month.
          </p>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-[#94A3B8] transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {!open ? null : (
      <div className="px-6 pb-6">
      {status === "loading" && (
        <div className="flex items-center gap-2 text-xs text-[#94A3B8]">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading coverage…
        </div>
      )}

      {status === "error" && (
        <span className="text-xs text-red-400 font-mono">{error}</span>
      )}

      {status === "done" && months.length === 0 && (
        <span className="text-xs text-[#94A3B8] font-mono">No data found.</span>
      )}

      {status === "done" && months.length > 0 && (
        <div className="border border-[#334155] rounded-lg overflow-hidden">
          <div className="max-h-[500px] overflow-auto">
            <table className="w-full text-xs font-mono">
              <thead className="bg-[#1E293B] sticky top-0 z-10">
                <tr>
                  <th className="text-left px-4 py-2 text-[#94A3B8] font-medium sticky left-0 bg-[#1E293B]">
                    Month
                  </th>
                  {ALL_SERIES.map((sid) => (
                    <th key={sid} className="text-center px-3 py-2 text-[#94A3B8] font-medium whitespace-nowrap">
                      {sid}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {months.map((month) => (
                  <tr key={month} className="border-t border-[#334155]/50 hover:bg-[#1E293B]/50">
                    <td className="px-4 py-1.5 text-[#F8FAFC] sticky left-0 bg-[#111827]">
                      {month}
                    </td>
                    {ALL_SERIES.map((sid) => {
                      const count = grid[month]?.[sid] ?? 0;
                      return (
                        <td
                          key={sid}
                          className={`text-center px-3 py-1.5 ${
                            count > 0
                              ? "text-emerald-400 bg-emerald-500/10"
                              : "text-[#334155]"
                          }`}
                        >
                          {count || "—"}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      </div>
      )}
    </section>
  );
}
