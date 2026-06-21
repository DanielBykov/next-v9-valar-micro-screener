"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import { SERIES_BY_BLOCK, type BlockKey } from "@/lib/fred/series-catalog";

type CoverageRow = { seriesId: string; month: string; count: number };

const BLOCK_ORDER: BlockKey[] = [
  "rates",
  "inflation_labor",
  "sentiment_risk",
  "commodities_global",
  "business_cycle",
  "political_narrative",
];

const BLOCK_LABELS: Record<BlockKey, string> = {
  rates: "Rates & CB Policy",
  inflation_labor: "Inflation & Labor",
  sentiment_risk: "Sentiment & Risk",
  commodities_global: "Commodities & Global",
  business_cycle: "Business Cycle",
  political_narrative: "Political & Narrative",
};

export function CoverageTable({ onMonthClick }: { onMonthClick?: (month: string) => void }) {
  const [open, setOpen] = useState(true);
  const [status, setStatus] = useState<"loading" | "error" | "done">("loading");
  const [error, setError] = useState("");
  const [months, setMonths] = useState<string[]>([]);
  const [grid, setGrid] = useState<Record<string, Record<string, number>>>({});
  const [collapsedBlocks, setCollapsedBlocks] = useState<Set<BlockKey>>(new Set());

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

  const toggleBlock = (block: BlockKey) => {
    setCollapsedBlocks((prev) => {
      const next = new Set(prev);
      if (next.has(block)) next.delete(block);
      else next.add(block);
      return next;
    });
  };

  return (
    <section className="bg-surface-raised border border-border-subtle rounded-xl">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between p-6 cursor-pointer"
      >
        <div className="text-left">
          <h2 className="text-sm font-semibold uppercase tracking-wider mb-1">Data Coverage</h2>
          <p className="text-xs text-text-secondary">
            Observation counts per series per month.
          </p>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-text-secondary transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {!open ? null : (
      <div className="px-6 pb-6">
      {status === "loading" && (
        <div className="flex items-center gap-2 text-xs text-text-secondary">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading coverage…
        </div>
      )}

      {status === "error" && (
        <span className="text-xs text-red-400 font-mono">{error}</span>
      )}

      {status === "done" && months.length === 0 && (
        <span className="text-xs text-text-secondary font-mono">No data found.</span>
      )}

      {status === "done" && months.length > 0 && (
        <div className="border border-border-subtle rounded-lg overflow-hidden">
          <div className="max-h-80 overflow-auto">
            <table className="w-full text-xs font-mono">
              <thead className="bg-surface-overlay sticky top-0 z-10">
                <tr>
                  <th
                    rowSpan={2}
                    className="text-left px-4 py-2 text-text-secondary font-medium sticky left-0 bg-surface-overlay border-r border-border-subtle"
                  >
                    Month
                  </th>
                  {BLOCK_ORDER.map((block) => {
                    const series = SERIES_BY_BLOCK[block];
                    if (series.length === 0) return null;
                    const isCollapsed = collapsedBlocks.has(block);
                    return (
                      <th
                        key={block}
                        colSpan={isCollapsed ? 1 : series.length}
                        className="px-3 py-2 text-text-secondary font-medium border-l border-border-subtle bg-surface-overlay"
                      >
                        <button
                          type="button"
                          onClick={() => toggleBlock(block)}
                          className="w-full flex items-center justify-center gap-1.5 cursor-pointer hover:text-text-primary transition-colors"
                          title={isCollapsed ? "Expand block" : "Collapse block"}
                        >
                          <ChevronDown
                            className={`h-3 w-3 transition-transform ${isCollapsed ? "-rotate-90" : ""}`}
                          />
                          <span className="uppercase tracking-wider text-[10px]">
                            {BLOCK_LABELS[block]}
                          </span>
                          <span className="text-text-secondary/60">({series.length})</span>
                        </button>
                      </th>
                    );
                  })}
                </tr>
                <tr>
                  {BLOCK_ORDER.map((block) => {
                    const series = SERIES_BY_BLOCK[block];
                    if (series.length === 0) return null;
                    const isCollapsed = collapsedBlocks.has(block);
                    if (isCollapsed) {
                      return (
                        <th
                          key={block}
                          className="text-center px-3 py-2 text-text-secondary/60 font-medium border-l border-border-subtle bg-surface-overlay text-[10px]"
                        >
                          —
                        </th>
                      );
                    }
                    return series.map((sid, idx) => (
                      <th
                        key={sid}
                        className={`text-center px-3 py-2 text-text-secondary font-medium whitespace-nowrap bg-surface-overlay ${idx === 0 ? "border-l border-border-subtle" : ""}`}
                      >
                        {sid}
                      </th>
                    ));
                  })}
                </tr>
              </thead>
              <tbody>
                {months.map((month) => (
                  <tr key={month} className="border-t border-border-subtle/50 hover:bg-surface-overlay/50">
                    <td
                      className={`px-4 py-1.5 text-text-primary text-nowrap sticky left-0 bg-surface-raised border-r border-border-subtle${onMonthClick ? " cursor-pointer hover:text-amber-400 transition-colors" : ""}`}
                      onClick={() => onMonthClick?.(month)}
                    >
                      {month}
                    </td>
                    {BLOCK_ORDER.map((block) => {
                      const series = SERIES_BY_BLOCK[block];
                      if (series.length === 0) return null;
                      const isCollapsed = collapsedBlocks.has(block);

                      if (isCollapsed) {
                        const withData = series.filter((sid) => (grid[month]?.[sid] ?? 0) > 0).length;
                        const hasAny = withData > 0;
                        return (
                          <td
                            key={block}
                            className={`text-center px-3 py-1.5 border-l border-border-subtle ${
                              hasAny ? "text-emerald-400 bg-emerald-500/10" : "text-border-subtle"
                            }`}
                          >
                            {hasAny ? `${withData}/${series.length}` : "—"}
                          </td>
                        );
                      }

                      return series.map((sid, idx) => {
                        const count = grid[month]?.[sid] ?? 0;
                        return (
                          <td
                            key={sid}
                            className={`text-center px-3 py-1.5 ${idx === 0 ? "border-l border-border-subtle" : ""} ${
                              count > 0
                                ? "text-emerald-400 bg-emerald-500/10"
                                : "text-border-subtle"
                            }`}
                          >
                            {count || "—"}
                          </td>
                        );
                      });
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
