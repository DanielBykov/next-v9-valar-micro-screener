import { Tooltip, TooltipContent, TooltipTrigger } from "@/app/components/ui/tooltip";
import { formatRawValue, getBlockSignal, getMetricDot } from "./utils";
import type { DashboardData } from "./types";

type Block = DashboardData["blocks"][number];

export function DomainBlockCard({ block, index }: { block: Block; index: number }) {
  const signal = getBlockSignal(block.score);

  if (block.isPlanned) {
    return (
      <div
        className="bg-surface-overlay/40 border border-dashed border-border-subtle rounded-xl overflow-hidden opacity-70"
        data-testid={`card-block-${index}`}
      >
        <div className="px-5 py-4 border-b border-border-subtle/50 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-text-secondary">{block.name}</h3>
          <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full border border-border-default text-text-secondary bg-surface-base/60">
            Planned
          </span>
        </div>
        <div className="px-5 py-10 flex items-center justify-center">
          <p className="text-xs text-text-secondary italic">{block.summary}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`bg-surface-overlay border ${signal.borderColor} rounded-xl ${signal.glowClass} overflow-hidden`}
      data-testid={`card-block-${index}`}
    >
      <div className="px-5 py-4 border-b border-border-subtle/50 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-primary">{block.name}</h3>
        <div className="flex items-center gap-3">
          <span
            className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full border"
            style={{ color: signal.color, borderColor: signal.color + '33', backgroundColor: signal.color + '15' }}
          >
            {signal.label}
          </span>
          <span className="text-lg font-bold font-mono text-text-primary">
            {block.score}<span className="text-xs text-text-secondary font-normal ml-0.5">/{block.maxScore}</span>
          </span>
        </div>
      </div>

      <div className="px-5 py-3">
        <div className="space-y-2">
          {block.metrics.map((metric) => {
            const hasRaw = "rawValue" in metric;
            return (
            <Tooltip key={metric.id}>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-3 group cursor-default">
                  <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${getMetricDot(metric.score)}`} />
                  <span className="text-xs text-text-secondary flex-1 truncate group-hover:text-text-primary transition-colors">
                    {metric.name}
                  </span>
                  {hasRaw && (
                      <span className="text-xs ml-1 font-mono text-text-muted">
                        ({formatRawValue(metric.rawValue, metric.unit)})
                      </span>
                  )}
                  <span className="text-xs font-mono text-text-primary w-8 text-right">{metric.score}/5</span>
                  <div className="w-16 h-1.5 bg-border-subtle rounded-full overflow-hidden flex-shrink-0">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${(metric.score / 5) * 100}%`, backgroundColor: signal.color }}
                    />
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="bg-surface-overlay border-border-subtle text-text-primary text-xs max-w-xs">
                <p className="font-medium mb-1">{metric.name}</p>
                <p className="text-text-secondary">{metric.interpretation}</p>
              </TooltipContent>
            </Tooltip>
            );
          })}
        </div>
      </div>

      <div className="px-5 py-3 border-t border-border-subtle/50">
        {block.drivers.length > 0 && (
          <div className="flex gap-3 mb-2">
            <span className="text-[10px] font-mono text-text-secondary uppercase tracking-wider shrink-0 pt-0.5">Drivers</span>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {block.drivers.map((d, j) => (
                <span key={j} className="text-xs text-text-secondary">
                  {d.name}: <span className="font-mono text-text-primary">{d.score}/5</span>
                </span>
              ))}
            </div>
          </div>
        )}
        <p className="text-[11px] text-text-secondary/80 italic leading-relaxed">&quot;{block.summary}&quot;</p>
      </div>
    </div>
  );
}
