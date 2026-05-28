"use client";

import dynamic from "next/dynamic";

const Dashboard = dynamic(() => import("@/app/components/dashboard"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-surface-base">
      <header className="border-b border-border-subtle bg-surface-raised">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-sm font-semibold tracking-wide text-text-primary">VALAR</span>
            <span className="text-xs text-text-secondary font-mono">Macro Pulse Intelligence</span>
          </div>
        </div>
      </header>
    </div>
  ),
});

export default function Page() {
  return <Dashboard />;
}
