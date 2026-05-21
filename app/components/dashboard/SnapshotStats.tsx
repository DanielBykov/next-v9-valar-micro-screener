import { Activity } from "lucide-react";
import type { DashboardData } from "./types";

export function SnapshotStats({ snapshot }: { snapshot: DashboardData["snapshot"] }) {
  const deltaYoY = snapshot.oneYearAgoScore ? snapshot.totalScore - snapshot.oneYearAgoScore : null;

  return (
    <div className="lg:col-span-7 bg-[#111827] border border-[#334155] rounded-xl overflow-hidden flex flex-col">
      <div className="px-6 py-4 border-b border-[#334155] flex items-center gap-2">
        <Activity className="h-4 w-4 text-[#3B82F6]" />
        <h2 className="text-sm font-semibold text-[#F8FAFC] uppercase tracking-wider">Macro Risk Snapshot</h2>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-[#334155]">
          <div className="px-6 py-5 flex justify-between items-center">
            <span className="text-sm text-[#94A3B8]">Daily Change</span>
            <span className="font-mono text-xl font-semibold text-[#F8FAFC]" data-testid="text-vs-yesterday">{snapshot.vsYesterday}</span>
          </div>
          <div className="px-6 py-5 flex justify-between items-center">
            <span className="text-sm text-[#94A3B8]">vs 3M Avg</span>
            <span className="font-mono text-xl font-semibold text-[#F59E0B]" data-testid="text-vs-3m">{snapshot.vs3mAvg}</span>
          </div>
        </div>
        <div className="border-t border-[#334155] grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-[#334155]">
          <div className="px-6 py-5 flex justify-between items-center">
            <span className="text-sm text-[#94A3B8]">vs 1Y Avg</span>
            <span className="font-mono text-xl font-semibold text-[#EF4444]" data-testid="text-vs-1y">{snapshot.vs1yAvg}</span>
          </div>
          <div className="px-6 py-5 flex justify-between items-center">
            <div className="flex flex-col">
              <span className="text-sm text-[#94A3B8]">1Y Ago</span>
              {deltaYoY !== null && <span className="text-xs text-[#94A3B8] font-mono mt-0.5">{deltaYoY > 0 ? "+" : ""}{deltaYoY} YoY</span>}
            </div>
            <span className="font-mono text-xl font-semibold text-[#F8FAFC]" data-testid="text-1y-ago">{snapshot.oneYearAgoScore}</span>
          </div>
        </div>

        <div className="border-t border-[#334155] px-6 py-4 flex-1">
          <p className="text-[13px] text-[#94A3B8] leading-relaxed">
            <span className="text-[#3B82F6] font-mono text-xs uppercase tracking-wider">SYS&gt; </span>
            {snapshot.interpretation}
          </p>
        </div>
      </div>
    </div>
  );
}
