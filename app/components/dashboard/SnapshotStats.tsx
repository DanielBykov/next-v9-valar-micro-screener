import { Activity } from "lucide-react";
import type { DashboardData } from "./types";

function fmt(value: number | null): string {
  return value === null ? "—" : String(value);
}

function fmtDelta(value: number | null): string {
  if (value === null) return "—";
  if (value === 0) return "0";
  return value > 0 ? `+${value}` : String(value);
}

export function SnapshotStats({ snapshot }: { snapshot: DashboardData["snapshot"] }) {
  const deltaYoY = snapshot.oneYearAgoScore ? snapshot.totalScore - snapshot.oneYearAgoScore : null;

  return (
    <div className="lg:col-span-7 bg-surface-raised border border-border-subtle rounded-xl overflow-hidden flex flex-col">
      <div className="px-6 py-4 border-b border-border-subtle flex items-center gap-2">
        <Activity className="h-4 w-4 text-accent-blue" />
        <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wider">Macro Risk Snapshot</h2>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-border-subtle">
          <div className="px-6 py-5 flex justify-between items-center">
            <span className="text-sm text-text-secondary">Daily Change</span>
            <span className="font-mono text-xl font-semibold text-text-primary" data-testid="text-vs-yesterday">{fmtDelta(snapshot.vsYesterday)}</span>
          </div>
          <div className="px-6 py-5 flex justify-between items-center">
            <span className="text-sm text-text-secondary">vs 3M Avg</span>
            <span className="font-mono text-xl font-semibold text-accent-amber" data-testid="text-vs-3m">{fmt(snapshot.vs3mAvg)}</span>
          </div>
        </div>
        <div className="border-t border-border-subtle grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-border-subtle">
          <div className="px-6 py-5 flex justify-between items-center">
            <span className="text-sm text-text-secondary">vs 1Y Avg</span>
            <span className="font-mono text-xl font-semibold text-accent-red" data-testid="text-vs-1y">{fmt(snapshot.vs1yAvg)}</span>
          </div>
          <div className="px-6 py-5 flex justify-between items-center">
            <div className="flex flex-col">
              <span className="text-sm text-text-secondary">1Y Ago</span>
              {deltaYoY !== null && <span className="text-xs text-text-secondary font-mono mt-0.5">{deltaYoY > 0 ? "+" : ""}{deltaYoY} YoY</span>}
            </div>
            <span className="font-mono text-xl font-semibold text-text-primary" data-testid="text-1y-ago">{fmt(snapshot.oneYearAgoScore)}</span>
          </div>
        </div>

        <div className="border-t border-border-subtle px-6 py-4 flex-1">
          <p className="text-[13px] text-text-secondary leading-relaxed">
            <span className="text-accent-blue font-mono text-xs uppercase tracking-wider">SYS&gt; </span>
            {snapshot.interpretation}
          </p>
        </div>
      </div>
    </div>
  );
}
