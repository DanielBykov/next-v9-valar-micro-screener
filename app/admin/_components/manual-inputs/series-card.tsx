"use client";

import { useEffect, useState } from "react";
import { Loader2, Save, Trash2 } from "lucide-react";
import { useAdminAuth } from "../admin-auth-context";

type ManualEntry = {
  id: number;
  seriesId: string;
  observationDate: string;
  value: string;
  note: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SeriesConsumer = {
  indicatorKey: string;
  indicatorName: string;
  blockKey: string;
  blockName: string;
};

export function SeriesCard({
  seriesId,
  consumers,
  initialEntries,
  onChange,
}: {
  seriesId: string;
  consumers: SeriesConsumer[];
  initialEntries: ManualEntry[];
  onChange?: () => void;
}) {
  const { isAuthed, promptLogin } = useAdminAuth();
  const [entries, setEntries] = useState<ManualEntry[]>(initialEntries);
  const [date, setDate] = useState("");
  const [value, setValue] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setEntries(initialEntries);
  }, [initialEntries]);

  async function refresh() {
    const res = await fetch(`/api/admin/manual-inputs?series=${encodeURIComponent(seriesId)}`);
    if (res.ok) {
      const data = await res.json();
      setEntries(data.entries ?? []);
    }
    onChange?.();
  }

  async function handleSave() {
    setError(null);
    if (!date) {
      setError("Date is required");
      return;
    }
    const num = Number(value);
    if (!Number.isFinite(num)) {
      setError("Value must be a number");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/admin/manual-inputs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          seriesId,
          observationDate: date,
          value: num,
          note: note.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.message ?? "Save failed");
      } else {
        setDate("");
        setValue("");
        setNote("");
        await refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(entry: ManualEntry) {
    if (!confirm(`Delete ${entry.seriesId} on ${entry.observationDate}?`)) return;
    setBusy(true);
    try {
      const res = await fetch(
        `/api/admin/manual-inputs?series=${encodeURIComponent(entry.seriesId)}&date=${encodeURIComponent(entry.observationDate)}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.message ?? "Delete failed");
      } else {
        await refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="bg-[#111827] border border-[#334155] rounded-xl p-6 space-y-4">
      <header className="space-y-1">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[#F8FAFC]">
            {seriesId}
          </h2>
          <span className="text-xs text-[#64748B] font-mono">{entries.length} entries</span>
        </div>
        {consumers.length > 0 && (
          <p className="text-xs text-[#94A3B8]">
            Consumed by{" "}
            {consumers.map((c, i) => (
              <span key={c.indicatorKey}>
                {i > 0 && ", "}
                <span className="text-amber-400 font-mono">{c.indicatorName}</span>
                <span className="text-[#64748B]"> ({c.blockName})</span>
              </span>
            ))}
          </p>
        )}
      </header>

      {isAuthed ? (
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <label className="text-xs text-[#94A3B8] font-mono">Observation date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="px-3 py-2 text-xs font-mono rounded-lg border border-[#334155] bg-[#0F172A] text-[#F8FAFC] hover:border-[#475569] focus:outline-none focus:border-[#475569] transition-colors [color-scheme:dark]"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-[#94A3B8] font-mono">Value</label>
            <input
              type="number"
              step="any"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-40 px-3 py-2 text-xs font-mono rounded-lg border border-[#334155] bg-[#0F172A] text-[#F8FAFC] hover:border-[#475569] focus:outline-none focus:border-[#475569] transition-colors"
            />
          </div>
          <div className="space-y-1.5 flex-1 min-w-[12rem]">
            <label className="text-xs text-[#94A3B8] font-mono">Note (optional)</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. April 2026 release"
              className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-[#334155] bg-[#0F172A] text-[#F8FAFC] hover:border-[#475569] focus:outline-none focus:border-[#475569] transition-colors"
            />
          </div>
          <button
            onClick={handleSave}
            disabled={busy}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save
          </button>
        </div>
      ) : (
        <p className="text-xs text-[#64748B] italic">
          <button
            type="button"
            onClick={promptLogin}
            className="underline hover:text-[#94A3B8] transition-colors cursor-pointer"
          >
            Login
          </button>{" "}
          required to enter manual values.
        </p>
      )}

      {error && (
        <p className="text-xs text-red-400 font-mono">{error}</p>
      )}

      <div className="border border-[#334155] rounded-lg overflow-hidden">
        <table className="w-full text-xs font-mono">
          <thead className="bg-[#1E293B]">
            <tr>
              <th className="text-left px-4 py-2 text-[#94A3B8] font-medium">Date</th>
              <th className="text-right px-4 py-2 text-[#94A3B8] font-medium">Value</th>
              <th className="text-left px-4 py-2 text-[#94A3B8] font-medium">Note</th>
              <th className="text-right px-4 py-2 text-[#94A3B8] font-medium">Updated</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-3 text-center text-[#64748B] italic">
                  No entries yet
                </td>
              </tr>
            ) : (
              entries.map((e) => (
                <tr key={e.id} className="border-t border-[#334155]/50 hover:bg-[#1E293B]/50">
                  <td className="px-4 py-1.5 text-[#F8FAFC]">{e.observationDate}</td>
                  <td className="px-4 py-1.5 text-right text-amber-400">
                    {Number(e.value).toLocaleString()}
                  </td>
                  <td className="px-4 py-1.5 text-[#94A3B8] truncate max-w-xs">
                    {e.note ?? ""}
                  </td>
                  <td className="px-4 py-1.5 text-right text-[#64748B]">
                    {new Date(e.updatedAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-1.5 text-right">
                    {isAuthed && (
                      <button
                        onClick={() => handleDelete(e)}
                        disabled={busy}
                        className="text-[#64748B] hover:text-red-400 transition-colors disabled:opacity-50 cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
