"use client";

import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/app/components/ui/collapsible";
import { Button } from "@/app/components/ui/button";
import { ChevronDown, ChevronUp, Info } from "lucide-react";
import type { DashboardData } from "./types";

export function MetricsTable({ metrics }: { metrics: DashboardData["metrics"] }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className="bg-surface-raised border border-border-subtle rounded-xl overflow-hidden"
    >
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className="w-full flex justify-between items-center px-6 py-5 h-auto hover:bg-surface-overlay rounded-none text-sm font-semibold text-text-primary uppercase tracking-wider"
          data-testid="button-toggle-metrics"
        >
          <span className="flex items-center gap-2">
            <Info className="h-4 w-4 text-accent-blue" />
            Expand Full 36-Metric Intelligence Panel
          </span>
          {isOpen ? <ChevronUp className="h-4 w-4 text-text-secondary" /> : <ChevronDown className="h-4 w-4 text-text-secondary" />}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="border-t border-border-subtle overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-[10px] text-text-secondary bg-surface-base border-b border-border-subtle uppercase tracking-wider font-mono">
              <tr>
                <th className="px-5 py-3">Domain</th>
                <th className="px-5 py-3">Metric</th>
                <th className="px-5 py-3 text-center text-nowrap">Score (0-5)</th>
                <th className="px-5 py-3">Interpretation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle/50">
              {metrics.map((metric) => (
                <tr key={metric.id} className="hover:bg-surface-overlay/50 transition-colors" data-testid={`row-metric-${metric.id}`}>
                  <td className="px-5 py-3 text-text-secondary text-xs whitespace-nowrap">{metric.domain}</td>
                  <td className="px-5 py-3 text-text-primary text-xs font-medium">{metric.name}</td>
                  <td className="px-5 py-3 text-center">
                    <span className={`inline-flex items-center justify-center h-6 w-6 rounded text-xs font-mono font-bold
                      ${metric.score >= 4 ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' :
                        metric.score === 3 ? 'bg-blue-500/15 text-blue-400 border border-blue-500/20' :
                        metric.score === 2 ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20' :
                        'bg-red-500/15 text-red-400 border border-red-500/20'}`}>
                      {metric.score}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-text-secondary text-xs">{metric.interpretation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
