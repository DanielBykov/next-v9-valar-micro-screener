"use client";

import { useState } from "react";
import { CalendarIcon, Download, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "@/app/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/app/components/ui/popover";

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

export function FredSection({ onFetchComplete }: { onFetchComplete?: () => void }) {
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [status, setStatus] = useState<{ type: "idle" | "loading" | "success" | "error"; message?: string }>({ type: "idle" });
  const [result, setResult] = useState<FetchResult | null>(null);

  async function handleFetchIndicators() {
    setStatus({ type: "loading" });
    setResult(null);
    try {
      const params = new URLSearchParams({ block: "rates" });
      if (startDate) params.set("start", format(startDate, "yyyy-MM-dd"));
      if (endDate) params.set("end", format(endDate, "yyyy-MM-dd"));

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
    <section className="bg-[#111827] border border-[#334155] rounded-xl p-6">
      <h2 className="text-sm font-semibold uppercase tracking-wider mb-1">Fetch Indicators</h2>
      <p className="text-xs text-[#94A3B8] mb-5">
        Fetch FRED series for the <span className="text-amber-400 font-medium">rates</span> block
        (DFF, T10Y2Y, WALCL, DGS10, T10YIE, DFEDTARU) and save to database.
        Dates are optional — defaults to last 90 days.
      </p>

      <div className="flex flex-wrap items-end gap-4 mb-5">
        <div className="space-y-1.5">
          <label className="text-xs text-[#94A3B8] font-mono">Start date</label>
          <DatePicker date={startDate} onSelect={setStartDate} placeholder="Pick start" />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs text-[#94A3B8] font-mono">End date</label>
          <DatePicker date={endDate} onSelect={setEndDate} placeholder="Pick end" />
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
          Fetch &amp; Store Rates
        </button>
      </div>

      {status.type === "success" && (
        <span className="text-xs text-emerald-400 font-mono block mb-3">{status.message}</span>
      )}
      {status.type === "error" && (
        <span className="text-xs text-red-400 font-mono block mb-3">{status.message}</span>
      )}

      {result && (
        <div className="border border-[#334155] rounded-lg overflow-hidden">
          <table className="w-full text-xs font-mono">
            <thead className="bg-[#1E293B]">
              <tr>
                <th className="text-left px-4 py-2 text-[#94A3B8] font-medium">Series</th>
                <th className="text-left px-4 py-2 text-[#94A3B8] font-medium">Status</th>
                <th className="text-right px-4 py-2 text-[#94A3B8] font-medium">Rows stored</th>
              </tr>
            </thead>
            <tbody>
              {result.results.map((r) => (
                <tr key={r.seriesId} className="border-t border-[#334155]/50 hover:bg-[#1E293B]/50">
                  <td className="px-4 py-1.5 text-[#F8FAFC]">{r.seriesId}</td>
                  <td className={`px-4 py-1.5 ${r.status === "ok" ? "text-emerald-400" : "text-red-400"}`}>
                    {r.status === "ok" ? "ok" : r.error ?? "error"}
                  </td>
                  <td className="px-4 py-1.5 text-right text-amber-400">{r.count}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-[#1E293B]">
              <tr>
                <td className="px-4 py-2 text-[#94A3B8] font-medium" colSpan={2}>
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

function DatePicker({ date, onSelect, placeholder }: { date?: Date; onSelect: (d: Date | undefined) => void; placeholder: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-2 px-3 py-2 text-xs font-mono rounded-lg border border-[#334155] bg-[#0F172A] hover:border-[#475569] transition-colors min-w-[160px] text-left">
          <CalendarIcon className="h-3.5 w-3.5 text-[#64748B]" />
          {date ? (
            <span className="text-[#F8FAFC]">{format(date, "yyyy-MM-dd")}</span>
          ) : (
            <span className="text-[#64748B]">{placeholder}</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 bg-[#111827] border-[#334155]" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={onSelect}
          defaultMonth={date || new Date()}
        />
      </PopoverContent>
    </Popover>
  );
}
