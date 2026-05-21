"use client";

import type { ApiBlock, ApiBlockResult } from "./types";

type Props = {
  blocks: ApiBlock[];
  selectedBlockKey: string | null;
  onSelectBlock: (key: string) => void;
  liveBlocks: ApiBlockResult[];
};

export function BlockSidebar({ blocks, selectedBlockKey, onSelectBlock, liveBlocks }: Props) {
  const liveByKey = new Map(liveBlocks.map((b) => [b.blockKey, b]));

  return (
    <aside className="w-56 shrink-0">
      <nav className="space-y-1">
        {blocks.map((block) => {
          const isActive = block.key === selectedBlockKey;
          const live = liveByKey.get(block.key);
          return (
            <button
              key={block.key}
              type="button"
              onClick={() => onSelectBlock(block.key)}
              className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
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
      </nav>
    </aside>
  );
}
