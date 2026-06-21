import { Activity, ArrowDown, ArrowUp, Minus } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/app/components/ui/tooltip";
import { getBlockSignal } from "./utils";
import type { DashboardData } from "./types";

function fmtDelta(value: number | null): string {
  if (value === null) return "—";
  if (value === 0) return "0";
  return value > 0 ? `+${value}` : String(value);
}

function deltaColor(value: number | null): string {
  if (value === null || value === 0) return "text-text-primary";
  return value > 0 ? "text-emerald-400" : "text-red-400";
}

function DeltaIcon({ value }: { value: number | null }) {
  if (value === null || value === 0) return <Minus className="h-3.5 w-3.5 text-text-secondary" />;
  return value > 0 ? (
    <ArrowUp className="h-3.5 w-3.5 text-emerald-400" />
  ) : (
    <ArrowDown className="h-3.5 w-3.5 text-red-400" />
  );
}

function StatTile({
  label,
  value,
  sublabel,
  testId,
}: {
  label: string;
  value: number | null;
  sublabel?: string;
  testId: string;
}) {
  return (
    <div className="px-6 py-5 flex justify-between items-center">
      <div className="flex flex-col">
        <span className="text-sm text-text-secondary">{label}</span>
        {sublabel && <span className="text-xs text-text-secondary font-mono mt-0.5">{sublabel}</span>}
      </div>
      <div className="flex items-center gap-1.5">
        <DeltaIcon value={value} />
        <span className={`font-mono text-xl font-semibold ${deltaColor(value)}`} data-testid={testId}>
          {fmtDelta(value)}
        </span>
      </div>
    </div>
  );
}

function BlockComposition({ blocks }: { blocks: DashboardData["blocks"] }) {
  const total = blocks.reduce((sum, b) => sum + b.score, 0);
  if (total <= 0) return null;

  return (
    <div className="px-6 py-5">
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-xs font-mono text-text-secondary uppercase tracking-wider">Block Composition</span>
        <span className="text-xs font-mono text-text-secondary">{total} / 120</span>
      </div>
      <div className="flex w-full h-2.5 gap-1">
        {blocks.map((block) => {
          const pct = (block.score / total) * 100;
          if (pct <= 0) return null;
          const { color, label } = getBlockSignal(block.score);
          return (
            <Tooltip key={block.id}>
              <TooltipTrigger asChild>
                <div
                  style={{ width: `${pct}%`, backgroundColor: color, minWidth: "8px" }}
                  className="h-full rounded-full transition-all duration-700 ease-out cursor-default"
                />
              </TooltipTrigger>
              <TooltipContent className="bg-surface-overlay border border-border-subtle text-text-primary">
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium">{block.name}</span>
                  <span className="font-mono text-text-secondary">
                    {block.score} / {block.maxScore} · {label}
                  </span>
                </div>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3">
        {blocks.map((block) => {
          const { color } = getBlockSignal(block.score);
          return (
            <div key={block.id} className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-[11px] text-text-secondary">{block.name}</span>
              <span className="text-[11px] font-mono text-text-primary">{block.score}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function SnapshotStats({
  snapshot,
  blocks,
}: {
  snapshot: DashboardData["snapshot"];
  blocks: DashboardData["blocks"];
}) {
  const deltaYoY = snapshot.oneYearAgoScore ? snapshot.totalScore - snapshot.oneYearAgoScore : null;

  return (
    <div className="lg:col-span-7 bg-surface-raised border border-border-subtle rounded-xl overflow-hidden flex flex-col">
      <div className="px-6 py-4 border-b border-border-subtle flex items-center gap-2">
        <Activity className="h-4 w-4 text-accent-blue" />
        <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wider">Macro Risk Snapshot</h2>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-border-subtle">
          <StatTile label="Daily Change" value={snapshot.vsYesterday} testId="text-vs-yesterday" />
          <StatTile label="vs 3M Avg" value={snapshot.vs3mAvg} testId="text-vs-3m" />
        </div>
        <div className="border-t border-border-subtle grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-border-subtle">
          <StatTile label="vs 1Y Avg" value={snapshot.vs1yAvg} testId="text-vs-1y" />
          <StatTile
            label="1Y Ago"
            value={deltaYoY}
            sublabel={snapshot.oneYearAgoScore !== null ? `from ${snapshot.oneYearAgoScore}` : undefined}
            testId="text-1y-ago"
          />
        </div>

        <div className="border-t border-border-subtle">
          <BlockComposition blocks={blocks} />
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
