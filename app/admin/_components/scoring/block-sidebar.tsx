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
    <nav className="flex flex-wrap gap-2">
      {blocks.map((block) => {
        const isActive = block.key === selectedBlockKey;
        const live = liveByKey.get(block.key);
        return (
          <button
            key={block.key}
            type="button"
            onClick={() => onSelectBlock(block.key)}
            className={`text-left px-3 py-2 rounded-md transition-colors border border-border-subtle ${
              isActive
                ? "bg-surface-overlay text-text-primary"
                : "text-text-secondary hover:text-text-primary hover:bg-surface-overlay/50"
            }`}
          >
            <div className="text-xs font-medium">{block.name}</div>
            <div className="text-[10px] text-text-muted font-mono mt-0.5">
              {block.scorers.length} indicator{block.scorers.length === 1 ? " " : "s"}
              {live ? ` · ${live.blockScore}/20` : ""}
            </div>
          </button>
        );
      })}

    </nav>
  );
}
