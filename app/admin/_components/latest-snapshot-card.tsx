"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

type SnapshotSummary = {
  snapshot: {
    snapshotDate: string;
    totalScore: number;
    regime: string;
    regimeSubtitle: string | null;
    vsYesterday: number | null;
    vs3mAvg: number | null;
    vs1yAvg: number | null;
  };
  blocks: { name: string; score: number; maxScore: number }[];
};

function regimeColor(regime: string) {
  const r = regime.toLowerCase();
  if (r.includes("risk-on") || r.includes("constructive"))
    return { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20" };
  if (r.includes("neutral") || r.includes("balanced"))
    return { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/20" };
  if (r.includes("fragile"))
    return { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20" };
  return { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/20" };
}

function deltaLabel(value: number | null) {
  if (value == null) return <span className="text-[border-subtle]">—</span>;
  const sign = value > 0 ? "+" : "";
  const color = value > 0 ? "text-emerald-400" : value < 0 ? "text-red-400" : "text-[text-secondary]";
  return <span className={color}>{sign}{value}</span>;
}

export function LatestSnapshotCard() {
  const [data, setData] = useState<SnapshotSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/mock-dashboard")
      .then((r) => {
        if (!r.ok) throw new Error("No snapshot data");
        return r.json();
      })
      .then((json) => setData(json))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="bg-[surface-raised] border border-[border-subtle] rounded-xl p-6">
      <div className="flex items-center gap-3 mb-1">
        <h2 className="text-sm font-semibold uppercase tracking-wider">Latest Snapshot</h2>
        <span className="text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
          Mock data
        </span>
      </div>
      <p className="text-xs text-[text-secondary] mb-5">Current dashboard regime and score</p>

      {loading ? (
        <div className="flex items-center gap-2 text-xs text-[text-muted]">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : error ? (
        <span className="text-xs text-red-400 font-mono">{error}</span>
      ) : data ? (
        <>
          {/* Regime + score row */}
          <div className="flex flex-wrap items-center gap-4 mb-5">
            {(() => {
              const rc = regimeColor(data.snapshot.regime);
              return (
                <span className={`px-3 py-1 rounded-lg text-sm font-semibold ${rc.bg} ${rc.text} border ${rc.border}`}>
                  {data.snapshot.regime}
                </span>
              );
            })()}
            <div className="text-xs font-mono">
              <span className="text-[text-secondary]">Score </span>
              <span className="text-[text-primary] text-lg font-semibold">{data.snapshot.totalScore}</span>
              <span className="text-[text-muted]">/100</span>
            </div>
            <div className="text-xs font-mono text-[text-secondary]">
              {data.snapshot.snapshotDate}
            </div>
          </div>

          {/* Comparatives */}
          <div className="flex flex-wrap gap-x-6 gap-y-1 mb-5 text-xs font-mono">
            <div>
              <span className="text-[text-muted]">vs yesterday </span>
              {deltaLabel(data.snapshot.vsYesterday)}
            </div>
            <div>
              <span className="text-[text-muted]">vs 3m avg </span>
              {deltaLabel(data.snapshot.vs3mAvg)}
            </div>
            <div>
              <span className="text-[text-muted]">vs 1y avg </span>
              {deltaLabel(data.snapshot.vs1yAvg)}
            </div>
          </div>

          {/* Block scores */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {data.blocks.map((b) => (
              <div key={b.name} className="bg-[surface-base] border border-[border-subtle] rounded-lg px-3 py-2">
                <div className="text-xs text-[text-secondary] font-mono">{b.name}</div>
                <div className="text-[text-primary] font-semibold">
                  {b.score}<span className="text-[text-muted] text-xs font-normal">/{b.maxScore}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}
