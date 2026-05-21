"use client";

import type { ApiBlock, ApiBlockResult } from "./types";

const PLANNED_BLOCKS = [
  "Labor Market",
  "Inflation & Prices",
  "Growth & Output",
  "Credit & Liquidity",
  "Sentiment & Surveys",
];

type Props = {
  blocks: ApiBlock[];
  selectedBlockKey: string | null;
  onSelectBlock: (key: string) => void;
  liveBlocks: ApiBlockResult[];
};

export function BlockSidebar({ blocks, selectedBlockKey, onSelectBlock, liveBlocks }: Props) {
  const liveByKey = new Map(liveBlocks.map((b) => [b.blockKey, b]));
  const implementedNames = new Set(blocks.map((b) => b.name));
  const planned = PLANNED_BLOCKS.filter((name) => !implementedNames.has(name));

  return (
    <nav className="flex flex-wrap gap-2">
      {blocks.map((block) => {
        const isActive = block.key === selectedBlockKey;
        const live = liveByKey.get(block.key);
        return (
          <button
            key={block.key}
            type="button"
            onClick={() => onSelectBlock(block.key)}
            className={`text-left px-3 py-2 rounded-md transition-colors ${
              isActive
                ? "bg-[#1E293B] text-[#F8FAFC]"
                : "text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1E293B]/50"
            }`}
          >
            <div className="text-xs font-medium">{block.name}</div>
            <div className="text-[10px] text-[#64748B] font-mono mt-0.5">
              {block.scorers.length} indicator{block.scorers.length === 1 ? "" : "s"}
              {live ? ` · ${live.blockScore}/20` : ""}
            </div>
          </button>
        );
      })}

      {planned.map((name) => (
        <div
          key={name}
          className="px-3 py-2 rounded-md border border-dashed border-[#334155] opacity-40 cursor-default"
        >
          <div className="text-xs font-medium text-[#64748B]">{name}</div>
          <div className="text-[10px] text-[#475569] font-mono mt-0.5">coming soon</div>
        </div>
      ))}
    </nav>
  );
}
