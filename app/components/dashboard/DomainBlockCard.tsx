import { Tooltip, TooltipContent, TooltipTrigger } from "@/app/components/ui/tooltip";
import { formatRawValue, getBlockSignal, getMetricDot } from "./utils";
import type { DashboardData } from "./types";

type Block = DashboardData["blocks"][number];

export function DomainBlockCard({ block, index }: { block: Block; index: number }) {
  const signal = getBlockSignal(block.score);

  if (block.isPlanned) {
    return (
      <div
        className="bg-[#1E293B]/40 border border-dashed border-[#334155] rounded-xl overflow-hidden opacity-70"
        data-testid={`card-block-${index}`}
      >
        <div className="px-5 py-4 border-b border-[#334155]/50 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#94A3B8]">{block.name}</h3>
          <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full border border-[#475569] text-[#94A3B8] bg-[#0F172A]/60">
            Planned
          </span>
        </div>
        <div className="px-5 py-10 flex items-center justify-center">
          <p className="text-xs text-[#94A3B8] italic">{block.summary}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`bg-[#1E293B] border ${signal.borderColor} rounded-xl ${signal.glowClass} overflow-hidden`}
      data-testid={`card-block-${index}`}
    >
      <div className="px-5 py-4 border-b border-[#334155]/50 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#F8FAFC]">{block.name}</h3>
        <div className="flex items-center gap-3">
          <span
            className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full border"
            style={{ color: signal.color, borderColor: signal.color + '33', backgroundColor: signal.color + '15' }}
          >
            {signal.label}
          </span>
          <span className="text-lg font-bold font-mono text-[#F8FAFC]">
            {block.score}<span className="text-xs text-[#94A3B8] font-normal ml-0.5">/{block.maxScore}</span>
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
                  <div className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${getMetricDot(metric.score)}`} />
                  <span className="text-xs text-[#94A3B8] flex-1 truncate group-hover:text-[#F8FAFC] transition-colors">
                    {metric.name}
                    {hasRaw && (
                      <span className="ml-1 font-mono text-[#64748B]">
                        ({formatRawValue(metric.rawValue, metric.unit)})
                      </span>
                    )}
                  </span>
                  <span className="text-xs font-mono text-[#F8FAFC] w-8 text-right">{metric.score}/5</span>
                  <div className="w-16 h-1.5 bg-[#334155] rounded-full overflow-hidden flex-shrink-0">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${(metric.score / 5) * 100}%`, backgroundColor: signal.color }}
                    />
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="bg-[#1E293B] border-[#334155] text-[#F8FAFC] text-xs max-w-xs">
                <p className="font-medium mb-1">{metric.name}</p>
                <p className="text-[#94A3B8]">{metric.interpretation}</p>
              </TooltipContent>
            </Tooltip>
            );
          })}
        </div>
      </div>

      <div className="px-5 py-3 border-t border-[#334155]/50">
        {block.drivers.length > 0 && (
          <div className="flex gap-3 mb-2">
            <span className="text-[10px] font-mono text-[#94A3B8] uppercase tracking-wider flex-shrink-0 pt-0.5">Drivers</span>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {block.drivers.map((d, j) => (
                <span key={j} className="text-xs text-[#94A3B8]">
                  {d.name}: <span className="font-mono text-[#F8FAFC]">{d.score}/5</span>
                </span>
              ))}
            </div>
          </div>
        )}
        <p className="text-[11px] text-[#94A3B8]/80 italic leading-relaxed">&quot;{block.summary}&quot;</p>
      </div>
    </div>
  );
}
