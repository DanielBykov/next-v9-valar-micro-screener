"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Trash2, Loader2 } from "lucide-react";

export default function AdminPage() {
  const [status, setStatus] = useState<{ type: "idle" | "loading" | "success" | "error"; message?: string }>({ type: "idle" });

  async function handleClearData() {
    if (!confirm("This will permanently delete ALL data from every table. Continue?")) return;

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
    <div className="min-h-screen bg-[#0F172A] text-[#F8FAFC] font-sans">
      <header className="border-b border-[#334155] bg-[#111827]">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center gap-4">
          <Link href="/" className="text-[#94A3B8] hover:text-[#F8FAFC] transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <span className="text-sm font-semibold tracking-wide">VALAR</span>
          <span className="text-xs text-[#94A3B8] font-mono">Admin</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10 space-y-8">
        <section className="bg-[#111827] border border-[#334155] rounded-xl p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider mb-1">Database</h2>
          <p className="text-xs text-[#94A3B8] mb-5">Manage stored snapshots, blocks, metrics, and trend data.</p>

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
              Clear all data
            </button>

            {status.type === "success" && (
              <span className="text-xs text-emerald-400 font-mono">{status.message}</span>
            )}
            {status.type === "error" && (
              <span className="text-xs text-red-400 font-mono">{status.message}</span>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
