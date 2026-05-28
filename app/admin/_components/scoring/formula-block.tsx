"use client";

type Props = {
  formulaPretty: string;
  trace: string | null;
};

export function FormulaBlock({ formulaPretty, trace }: Props) {
  return (
    <div className="space-y-1">
      <div className="text-[10px] uppercase tracking-wider text-text-muted">Formula</div>
      <pre className="bg-surface-base border border-border-subtle rounded-md px-3 py-2 text-xs font-mono text-text-faint whitespace-pre-wrap">
        {formulaPretty}
      </pre>
      {trace && (
        <pre className="bg-surface-base border border-border-subtle rounded-md px-3 py-2 text-xs font-mono text-text-secondary whitespace-pre-wrap">
          live · {trace}
        </pre>
      )}
    </div>
  );
}
