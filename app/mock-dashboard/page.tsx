"use client";

import dynamic from "next/dynamic";

const Dashboard = dynamic(() => import("@/app/components/mock-dashboard"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-[#0F172A] flex items-center justify-center">
      <div className="flex items-center gap-3 text-[#94A3B8]">
        <div className="h-5 w-5 animate-pulse rounded-full bg-[#94A3B8]" />
        <span className="font-mono text-sm">Loading macro intelligence...</span>
      </div>
    </div>
  ),
});

export default function Page() {
  return <Dashboard />;
}
