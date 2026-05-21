"use client";

type Props = {
  formulaPretty: string;
  trace: string | null;
};

export function FormulaBlock({ formulaPretty, trace }: Props) {
  return (
    <div className="space-y-1">
      <div className="text-[10px] uppercase tracking-wider text-[#64748B]">Formula</div>
      <pre className="bg-[#0F172A] border border-[#334155] rounded-md px-3 py-2 text-xs font-mono text-[#cbd5e1] whitespace-pre-wrap">
        {formulaPretty}
      </pre>
      {trace && (
        <pre className="bg-[#0F172A] border border-[#334155] rounded-md px-3 py-2 text-xs font-mono text-[#94A3B8] whitespace-pre-wrap">
          live · {trace}
        </pre>
      )}
    </div>
  );
}
