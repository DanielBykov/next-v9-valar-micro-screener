"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { SERIES_BY_BLOCK } from "@/lib/fred/series-catalog";

type SeriesFreshness = {
  seriesId: string;
  lastFetchedAt: string;
  earliestDate: string;
  latestDate: string;
  count: number;
};

export function DataCoverageCard() {
  const [data, setData] = useState<SeriesFreshness[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/indicators/freshness")
      .then((r) => r.json())
      .then((json) => setData(json.freshness ?? []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const bySeriesId = Object.fromEntries(data.map((d) => [d.seriesId, d]));
  const allSeries = SERIES_BY_BLOCK.rates;
  const totalObs = data.reduce((sum, d) => sum + d.count, 0);
  const earliest = data.length ? data.reduce((min, d) => (d.earliestDate < min ? d.earliestDate : min), data[0].earliestDate) : null;
  const latest = data.length ? data.reduce((max, d) => (d.latestDate > max ? d.latestDate : max), data[0].latestDate) : null;

  return (
    <section className="bg-[surface-raised] border border-[border-subtle] rounded-xl p-6">
      <h2 className="text-sm font-semibold uppercase tracking-wider mb-1">Data Coverage</h2>
      <p className="text-xs text-[text-secondary] mb-5">Observation counts across all FRED series</p>

      {loading ? (
        <div className="flex items-center gap-2 text-xs text-[text-muted]">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : error ? (
        <span className="text-xs text-red-400 font-mono">{error}</span>
      ) : data.length === 0 ? (
        <p className="text-xs text-[text-muted] italic">No observation data yet.</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-x-8 gap-y-1 mb-5 text-xs font-mono">
            <div>
              <span className="text-[text-secondary]">Total observations </span>
              <span className="text-[text-primary] font-semibold">{totalObs.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-[text-secondary]">Range </span>
              <span className="text-[text-primary] font-semibold">{earliest} → {latest}</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {allSeries.map((sid) => {
              const entry = bySeriesId[sid];
              const count = entry?.count ?? 0;
              return (
                <div key={sid} className="bg-[surface-base] border border-[border-subtle] rounded-lg px-3 py-2">
                  <div className="text-xs text-[text-secondary] font-mono">{sid}</div>
                  <div className={`text-lg font-semibold ${count > 0 ? "text-[text-primary]" : "text-[border-subtle]"}`}>
                    {count.toLocaleString()}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
