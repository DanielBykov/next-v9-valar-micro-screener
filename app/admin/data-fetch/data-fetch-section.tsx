"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { useAdminAuth } from "../_components/admin-auth-context";

type SeriesResult = {
  seriesId: string;
  status: "ok" | "error";
  count: number;
  error?: string;
};

type FetchResult = {
  block: string;
  start: string;
  end: string;
  totalStored: number;
  results: SeriesResult[];
};

const BLOCK_OPTIONS: { key: string; label: string; seriesPreview: string }[] = [
  {
    key: "all",
    label: "All FRED Series",
    seriesPreview: "All blocks below combined",
  },
  {
    key: "rates",
    label: "Rates & CB Policy",
    seriesPreview: "DFF, T10Y2Y, WALCL, DGS10, T10YIE, DFEDTARU",
  },
  {
    key: "inflation_labor",
    label: "Inflation & Labor",
    seriesPreview: "CPIAUCSL, CPILFESL, UNRATE, PAYEMS, CES0500000003, CIVPART",
  },
  {
    key: "sentiment_risk",
    label: "Sentiment & Risk",
    seriesPreview: "VIXCLS",
  },
  {
    key: "commodities_global",
    label: "Commodities & Global Flow",
    seriesPreview: "DCOILWTICO, DTWEXBGS, PCOPPUSDM, SOFR, IORB",
  },
  {
    key: "business_cycle",
    label: "Business Cycle & Rotation",
    seriesPreview: "BAMLH0A0HYM2",
  },
];

export function DataFetchSection({ onFetchComplete }: { onFetchComplete?: () => void }) {
  const { isAuthed, promptLogin } = useAdminAuth();
  const [block, setBlock] = useState<string>(BLOCK_OPTIONS[0].key);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState<{ type: "idle" | "loading" | "success" | "error"; message?: string }>({ type: "idle" });
  const [result, setResult] = useState<FetchResult | null>(null);

  const selected = BLOCK_OPTIONS.find((b) => b.key === block) ?? BLOCK_OPTIONS[0];

  async function handleFetchIndicators() {
    setStatus({ type: "loading" });
    setResult(null);
    try {
      const params = new URLSearchParams({ block });
      if (startDate) params.set("start", startDate);
      if (endDate) params.set("end", endDate);

      const res = await fetch(`/api/admin/fetch-indicators?${params}`, { method: "POST" });
      const data: FetchResult = await res.json();
      if (!res.ok) throw new Error((data as any).message || "Fetch failed");

      setResult(data);
      const ok = data.results.filter((r) => r.status === "ok").length;
      const fail = data.results.filter((r) => r.status === "error").length;
      setStatus({
        type: "success",
        message: `${data.totalStored} observations stored · ${ok} series ok${fail ? ` · ${fail} failed` : ""}`,
      });
      onFetchComplete?.();
    } catch (err: any) {
      setStatus({ type: "error", message: err.message || "Unknown error" });
    }
  }

  return (
    <section className="bg-surface-raised border border-border-subtle rounded-xl p-6">
      <h2 className="text-sm font-semibold uppercase tracking-wider mb-1">Fetch Indicators</h2>
      <p className="text-xs text-text-secondary mb-5">
        Fetch FRED series for the <span className="text-amber-400 font-medium">{selected.key}</span> block
        ({selected.seriesPreview}) and save to database.
        Dates are optional — defaults to last 90 days.
      </p>

      {isAuthed ? (
        <>
          <div className="flex flex-wrap items-end gap-4 mb-5">
            <div className="space-y-1.5">
              <label className="text-xs text-text-secondary font-mono">Block</label>
              <select
                value={block}
                onChange={(e) => setBlock(e.target.value)}
                className="px-3 py-2 text-xs font-mono rounded-lg border border-border-subtle bg-surface-base text-text-primary hover:border-border-default focus:outline-none focus:border-border-default transition-colors [color-scheme:dark]"
              >
                {BLOCK_OPTIONS.map((opt) => (
                  <option key={opt.key} value={opt.key}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-text-secondary font-mono">Start date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-2 text-xs font-mono rounded-lg border border-border-subtle bg-surface-base text-text-primary hover:border-border-default focus:outline-none focus:border-border-default transition-colors [color-scheme:dark]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-text-secondary font-mono">End date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-2 text-xs font-mono rounded-lg border border-border-subtle bg-surface-base text-text-primary hover:border-border-default focus:outline-none focus:border-border-default transition-colors [color-scheme:dark]"
              />
            </div>

            <button
              onClick={handleFetchIndicators}
              disabled={status.type === "loading"}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {status.type === "loading" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Fetch &amp; Store {selected.label}
            </button>
          </div>

          {status.type === "success" && (
            <span className="text-xs text-emerald-400 font-mono block mb-3">{status.message}</span>
          )}
          {status.type === "error" && (
            <span className="text-xs text-red-400 font-mono block mb-3">{status.message}</span>
          )}
        </>
      ) : (
        <p className="text-xs text-text-muted italic mb-5">
          <button type="button" onClick={promptLogin} className="underline hover:text-text-secondary transition-colors cursor-pointer">
            Login
          </button>
          {" "}required to fetch indicators.
        </p>
      )}

      {result && (
        <div className="border border-border-subtle rounded-lg overflow-hidden">
          <table className="w-full text-xs font-mono">
            <thead className="bg-surface-overlay">
              <tr>
                <th className="text-left px-4 py-2 text-text-secondary font-medium">Series</th>
                <th className="text-left px-4 py-2 text-text-secondary font-medium">Status</th>
                <th className="text-right px-4 py-2 text-text-secondary font-medium">Rows stored</th>
              </tr>
            </thead>
            <tbody>
              {result.results.map((r) => (
                <tr key={r.seriesId} className="border-t border-border-subtle/50 hover:bg-surface-overlay/50">
                  <td className="px-4 py-1.5 text-text-primary">{r.seriesId}</td>
                  <td className={`px-4 py-1.5 ${r.status === "ok" ? "text-emerald-400" : "text-red-400"}`}>
                    {r.status === "ok" ? "ok" : r.error ?? "error"}
                  </td>
                  <td className="px-4 py-1.5 text-right text-amber-400">{r.count}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-surface-overlay">
              <tr>
                <td className="px-4 py-2 text-text-secondary font-medium" colSpan={2}>
                  {result.start} → {result.end}
                </td>
                <td className="px-4 py-2 text-right text-amber-400 font-medium">{result.totalStored} total</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </section>
  );
}
