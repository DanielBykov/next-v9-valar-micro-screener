"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { SERIES_BY_BLOCK } from "@/lib/fred/series-catalog";

type Row = {
  id: number;
  seriesId: string;
  observationDate: string;
  value: string;
};

const ALL_SERIES: string[] = Array.from(new Set(Object.values(SERIES_BY_BLOCK).flat()));

export function IndicatorsTable() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [selectedSeries, setSelectedSeries] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<{ type: "idle" | "loading" | "success" | "error"; message?: string }>({ type: "idle" });
  const [rows, setRows] = useState<Row[]>([]);

  function toggleSeries(sid: string) {
    setSelectedSeries((prev) => {
      const next = new Set(prev);
      if (next.has(sid)) next.delete(sid);
      else next.add(sid);
      return next;
    });
  }

  async function handleFetch() {
    setStatus({ type: "loading" });
    setRows([]);
    try {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      if (selectedSeries.size > 0) params.set("series", Array.from(selectedSeries).join(","));

      const res = await fetch(`/api/admin/indicators?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setRows(data.rows || []);
      setStatus({ type: "success", message: `${data.rows?.length ?? 0} rows returned` });
    } catch (err: any) {
      setStatus({ type: "error", message: err.message || "Unknown error" });
    }
  }

  return (
    <section className="bg-[#111827] border border-[#334155] rounded-xl p-6">
      <h2 className="text-sm font-semibold uppercase tracking-wider mb-1">Indicators</h2>
      <p className="text-xs text-[#94A3B8] mb-5">Query stored observations from the <span className="font-mono">indicator_observations</span> table.</p>

      <div className="grid gap-4 mb-5">
        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-1.5">
            <label className="text-xs text-[#94A3B8] font-mono block">From</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="px-3 py-2 text-xs font-mono rounded-lg border border-[#334155] bg-[#0F172A] text-[#F8FAFC] focus:outline-none focus:border-[#475569] min-w-[160px] [color-scheme:dark]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-[#94A3B8] font-mono block">To</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="px-3 py-2 text-xs font-mono rounded-lg border border-[#334155] bg-[#0F172A] text-[#F8FAFC] focus:outline-none focus:border-[#475569] min-w-[160px] [color-scheme:dark]"
            />
          </div>

          <button
            onClick={handleFetch}
            disabled={status.type === "loading"}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {status.type === "loading" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Fetch
          </button>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs text-[#94A3B8] font-mono block">
            Series ({selectedSeries.size === 0 ? "all" : `${selectedSeries.size} selected`})
          </label>
          <div className="flex flex-wrap gap-2">
            {ALL_SERIES.map((sid) => {
              const checked = selectedSeries.has(sid);
              return (
                <label
                  key={sid}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-mono cursor-pointer transition-colors ${
                    checked
                      ? "border-amber-500/40 bg-amber-500/10 text-amber-400"
                      : "border-[#334155] bg-[#0F172A] text-[#94A3B8] hover:border-[#475569]"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleSeries(sid)}
                    className="h-3 w-3 accent-amber-500"
                  />
                  {sid}
                </label>
              );
            })}
          </div>
        </div>
      </div>

      {status.type === "success" && (
        <span className="text-xs text-emerald-400 font-mono block mb-3">{status.message}</span>
      )}
      {status.type === "error" && (
        <span className="text-xs text-red-400 font-mono block mb-3">{status.message}</span>
      )}

      {rows.length > 0 && (
        <div className="border border-[#334155] rounded-lg overflow-hidden">
          <div className="max-h-[500px] overflow-y-auto">
            <table className="w-full text-xs font-mono">
              <thead className="bg-[#1E293B] sticky top-0">
                <tr>
                  <th className="text-left px-4 py-2 text-[#94A3B8] font-medium">id</th>
                  <th className="text-left px-4 py-2 text-[#94A3B8] font-medium">series_id</th>
                  <th className="text-left px-4 py-2 text-[#94A3B8] font-medium">observation_date</th>
                  <th className="text-right px-4 py-2 text-[#94A3B8] font-medium">value</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-[#334155]/50 hover:bg-[#1E293B]/50">
                    <td className="px-4 py-1.5 text-[#64748B]">{r.id}</td>
                    <td className="px-4 py-1.5 text-[#F8FAFC]">{r.seriesId}</td>
                    <td className="px-4 py-1.5 text-[#F8FAFC]">{r.observationDate}</td>
                    <td className="px-4 py-1.5 text-right text-amber-400">{r.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
