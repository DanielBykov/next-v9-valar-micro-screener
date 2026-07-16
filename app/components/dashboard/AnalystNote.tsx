"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { toNYDateString } from "./utils";

type Narrative = {
  headline: string;
  narrative: string;
  model: string;
  generatedAt: string;
};

/**
 * AI Analyst Note. Loads independently of the main dashboard payload from
 * /api/dashboard/narrative so the gauge and blocks render immediately and the
 * note streams in when ready. Renders nothing if generation is unavailable.
 */
export function AnalystNote({ date }: { date: Date }) {
  const [note, setNote] = useState<Narrative | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    fetch(`/api/dashboard/narrative?date=${toNYDateString(date)}`)
      .then((res) => (res.ok ? res.json() : { narrative: null }))
      .then((d: { narrative: Narrative | null }) => {
        if (cancelled) return;
        setNote(d.narrative);
        setIsLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setNote(null);
        setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [date]);

  if (isLoading) return <AnalystNoteSkeleton />;
  if (!note) return null;

  const paragraphs = note.narrative.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
  const generatedLabel = note.generatedAt.slice(0, 10);

  return (
    <div className="bg-surface-raised border border-border-subtle rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-border-subtle flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-accent-blue" />
          <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wider">AI Analyst Note</h2>
        </div>
        <span className="text-[10px] font-mono text-text-secondary uppercase tracking-wider border border-border-subtle rounded px-1.5 py-0.5">
          AI Generated
        </span>
      </div>

      <div className="px-6 py-5 space-y-4">
        <p className="text-[15px] font-semibold text-text-primary leading-snug">{note.headline}</p>
        <div className="space-y-3">
          {paragraphs.map((p, i) => (
            <p key={i} className="text-[13px] text-text-secondary leading-relaxed">
              {p}
            </p>
          ))}
        </div>
      </div>

      <div className="px-6 py-3 border-t border-border-subtle flex items-center gap-2">
        <span className="text-[11px] font-mono text-text-secondary">
          {note.model} · {generatedLabel}
        </span>
      </div>
    </div>
  );
}

function AnalystNoteSkeleton() {
  return (
    <div className="bg-surface-raised border border-border-subtle rounded-xl overflow-hidden animate-pulse">
      <div className="px-6 py-4 border-b border-border-subtle flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-text-secondary" />
        <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">AI Analyst Note</h2>
      </div>
      <div className="px-6 py-5 space-y-3">
        <div className="h-4 w-2/3 rounded bg-surface-overlay" />
        <div className="h-3 w-full rounded bg-surface-overlay" />
        <div className="h-3 w-full rounded bg-surface-overlay" />
        <div className="h-3 w-4/5 rounded bg-surface-overlay" />
      </div>
    </div>
  );
}
