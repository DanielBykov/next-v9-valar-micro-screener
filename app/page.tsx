"use client";

import dynamic from "next/dynamic";

const Dashboard = dynamic(() => import("@/app/components/dashboard"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-[#0F172A]">
      <header className="border-b border-[#334155] bg-[#111827]">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-sm font-semibold tracking-wide text-[#F8FAFC]">VALAR</span>
            <span className="text-xs text-[#94A3B8] font-mono">Macro Pulse Intelligence</span>
          </div>
        </div>
      </header>
    </div>
  ),
});

export default function Page() {
  return <Dashboard />;
}
