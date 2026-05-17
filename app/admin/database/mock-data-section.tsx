"use client";

import { useState } from "react";
import { Trash2, Loader2 } from "lucide-react";

export function MockDataSection() {
  const [status, setStatus] = useState<{ type: "idle" | "loading" | "success" | "error"; message?: string }>({ type: "idle" });

  async function handleClearData() {
    if (!confirm("This will permanently delete ALL mock data from every table. Continue?")) return;

    setStatus({ type: "loading" });
    try {
      const res = await fetch("/api/admin/clear", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setStatus({ type: "success", message: data.message });
    } catch (err: any) {
      setStatus({ type: "error", message: err.message || "Unknown error" });
    }
  }

  return (
    <section className="bg-[#111827] border border-[#334155] rounded-xl p-6">
      <h2 className="text-sm font-semibold uppercase tracking-wider mb-1">Mock Data</h2>
      <p className="text-xs text-[#94A3B8] mb-5">Manage mock snapshots, blocks, metrics, and trend data used for development.</p>

      <div className="flex items-center gap-4">
        <button
          onClick={handleClearData}
          disabled={status.type === "loading"}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {status.type === "loading" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
          Clear all mock data
        </button>

        {status.type === "success" && (
          <span className="text-xs text-emerald-400 font-mono">{status.message}</span>
        )}
        {status.type === "error" && (
          <span className="text-xs text-red-400 font-mono">{status.message}</span>
        )}
      </div>
    </section>
  );
}
