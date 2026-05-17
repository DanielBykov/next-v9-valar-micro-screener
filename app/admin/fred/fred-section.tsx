"use client";

import { useState } from "react";
import { CalendarIcon, Download, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "@/app/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/app/components/ui/popover";

type FredObservation = {
  date: string;
  value: string;
};

export function FredSection() {
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [fredStatus, setFredStatus] = useState<{ type: "idle" | "loading" | "success" | "error"; message?: string }>({ type: "idle" });
  const [observations, setObservations] = useState<FredObservation[]>([]);

  async function handleFetchFedFunds() {
    if (!startDate || !endDate) return;

    setFredStatus({ type: "loading" });
    setObservations([]);
    try {
      const start = format(startDate, "yyyy-MM-dd");
      const end = format(endDate, "yyyy-MM-dd");
      const res = await fetch(`/api/admin/fred?series=DFF&start=${start}&end=${end}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      const obs: FredObservation[] = (data.observations || []).filter(
        (o: FredObservation) => o.value !== "."
      );
      setObservations(obs);
      setFredStatus({ type: "success", message: `${obs.length} observations returned` });
    } catch (err: any) {
      setFredStatus({ type: "error", message: err.message || "Unknown error" });
    }
  }

  return (
    <section className="bg-[#111827] border border-[#334155] rounded-xl p-6">
      <h2 className="text-sm font-semibold uppercase tracking-wider mb-1">FRED API</h2>
      <p className="text-xs text-[#94A3B8] mb-5">Fetch Federal Reserve economic data. Series: DFF (Federal Funds Rate).</p>

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
          onClick={handleFetchFedFunds}
          disabled={!startDate || !endDate || fredStatus.type === "loading"}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {fredStatus.type === "loading" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          FRED API test — Fed Funds
        </button>
      </div>

      {fredStatus.type === "success" && (
        <span className="text-xs text-emerald-400 font-mono block mb-3">{fredStatus.message}</span>
      )}
      {fredStatus.type === "error" && (
        <span className="text-xs text-red-400 font-mono block mb-3">{fredStatus.message}</span>
      )}

      {observations.length > 0 && (
        <div className="border border-[#334155] rounded-lg overflow-hidden">
          <div className="max-h-[300%] overflow-y-auto">
            <table className="w-full text-xs font-mono">
              <thead className="bg-[#1E293B] sticky top-0">
                <tr>
                  <th className="text-left px-4 py-2 text-[#94A3B8] font-medium">#</th>
                  <th className="text-left px-4 py-2 text-[#94A3B8] font-medium">Date</th>
                  <th className="text-right px-4 py-2 text-[#94A3B8] font-medium">Rate (%)</th>
                </tr>
              </thead>
              <tbody>
                {observations.map((obs, i) => {
                  const changed = i > 0 && obs.value !== observations[i - 1].value;
                  return (
                    <tr key={obs.date} className="border-t border-[#334155]/50 hover:bg-[#1E293B]/50">
                      <td className={`px-4 py-1.5 ${changed ? "text-red-400" : "text-[#64748B]"}`}>{i + 1}</td>
                      <td className={`px-4 py-1.5 ${changed ? "text-red-400" : "text-[#F8FAFC]"}`}>{obs.date}</td>
                      <td className={`px-4 py-1.5 text-right ${changed ? "text-red-400" : "text-amber-400"}`}>{obs.value}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
