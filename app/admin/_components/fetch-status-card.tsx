"use client";

import { useEffect, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useAdminAuth } from "./admin-auth-context";
import { SERIES_BY_BLOCK } from "@/lib/fred/series-catalog";

type SeriesFreshness = {
  seriesId: string;
  lastFetchedAt: string;
  earliestDate: string;
  latestDate: string;
  count: number;
};

function freshnessDot(lastFetchedAt: string | null) {
  if (!lastFetchedAt) return { color: "bg-red-400", label: "Never" };
  const ageMs = Date.now() - new Date(lastFetchedAt).getTime();
  const hours = ageMs / (1000 * 60 * 60);
  if (hours < 24) return { color: "bg-emerald-400", label: "Fresh" };
  if (hours < 24 * 7) return { color: "bg-amber-400", label: "Stale" };
  return { color: "bg-red-400", label: "Old" };
}

export function FetchStatusCard({ onFetchComplete }: { onFetchComplete?: () => void }) {
  const { isAuthed, promptLogin } = useAdminAuth();
  const [data, setData] = useState<SeriesFreshness[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [fetchStatus, setFetchStatus] = useState<{ type: "idle" | "loading" | "success" | "error"; message?: string }>({ type: "idle" });

  useEffect(() => {
    setLoading(true);
    fetch("/api/admin/indicators/freshness")
      .then((r) => r.json())
      .then((json) => setData(json.freshness ?? []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [refreshKey]);

  async function handleFetch() {
    setFetchStatus({ type: "loading" });
    try {
      const res = await fetch("/api/admin/fetch-indicators?block=rates", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Fetch failed");

      const ok = json.results.filter((r: any) => r.status === "ok").length;
      const fail = json.results.filter((r: any) => r.status === "error").length;
      setFetchStatus({
        type: "success",
        message: `${json.totalStored} observations stored · ${ok} series ok${fail ? ` · ${fail} failed` : ""}`,
      });
      setRefreshKey((k) => k + 1);
      onFetchComplete?.();
    } catch (err: any) {
      setFetchStatus({ type: "error", message: err.message || "Unknown error" });
    }
  }

  const bySeriesId = Object.fromEntries(data.map((d) => [d.seriesId, d]));
  const allSeries = SERIES_BY_BLOCK.rates;

  return (
    <section className="bg-[surface-raised] border border-[border-subtle] rounded-xl p-6">
      <h2 className="text-sm font-semibold uppercase tracking-wider mb-1">FRED Fetch Status</h2>
      <p className="text-xs text-[text-secondary] mb-5">Data freshness per series</p>

      {loading ? (
        <div className="flex items-center gap-2 text-xs text-[text-muted]">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : error ? (
        <span className="text-xs text-red-400 font-mono">{error}</span>
      ) : (
        <>
          <div className="border border-[border-subtle] rounded-lg overflow-hidden mb-5">
            <table className="w-full text-xs font-mono">
              <thead className="bg-[surface-overlay]">
                <tr>
                  <th className="text-left px-4 py-2 text-[text-secondary] font-medium">Series</th>
                  <th className="text-left px-4 py-2 text-[text-secondary] font-medium">Last Fetched</th>
                  <th className="text-center px-4 py-2 text-[text-secondary] font-medium">Freshness</th>
                </tr>
              </thead>
              <tbody>
                {allSeries.map((sid) => {
                  const entry = bySeriesId[sid];
                  const dot = freshnessDot(entry?.lastFetchedAt ?? null);
                  return (
                    <tr key={sid} className="border-t border-[border-subtle]/50 hover:bg-[surface-overlay]/50">
                      <td className="px-4 py-1.5 text-[text-primary]">{sid}</td>
                      <td className="px-4 py-1.5 text-[text-secondary]">
                        {entry?.lastFetchedAt
                          ? formatDistanceToNow(new Date(entry.lastFetchedAt), { addSuffix: true })
                          : "Never"}
                      </td>
                      <td className="px-4 py-1.5 text-center">
                        <span className="inline-flex items-center gap-1.5">
                          <span className={`inline-block h-2 w-2 rounded-full ${dot.color}`} />
                          <span className="text-[text-muted]">{dot.label}</span>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {isAuthed ? (
            <div>
              <button
                onClick={handleFetch}
                disabled={fetchStatus.type === "loading"}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {fetchStatus.type === "loading" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Fetch Now
              </button>
              {fetchStatus.type === "success" && (
                <span className="text-xs text-emerald-400 font-mono block mt-2">{fetchStatus.message}</span>
              )}
              {fetchStatus.type === "error" && (
                <span className="text-xs text-red-400 font-mono block mt-2">{fetchStatus.message}</span>
              )}
            </div>
          ) : (
            <p className="text-xs text-[text-muted] italic">
              <button type="button" onClick={promptLogin} className="underline hover:text-[text-secondary] transition-colors cursor-pointer">
                Login
              </button>{" "}
              required to fetch data.
            </p>
          )}
        </>
      )}
    </section>
  );
}
