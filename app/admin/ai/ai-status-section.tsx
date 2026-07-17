"use client";

import { useEffect, useState } from "react";
import { Sparkles, Loader2, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { useAdminAuth } from "../_components/admin-auth-context";

type ConfigStatus = { configured: boolean; model: string };
type TestResult =
  | { ok: true; model: string }
  | { ok: false; reason: "no_api_key" | "auth" | "rate_limit" | "api"; detail: string };

const REASON_LABEL: Record<string, string> = {
  no_api_key: "No API key configured",
  auth: "API key rejected",
  rate_limit: "Rate limited",
  api: "API error",
};

export function AiStatusSection() {
  const { isAuthed, promptLogin } = useAdminAuth();
  const [config, setConfig] = useState<ConfigStatus | null>(null);
  const [test, setTest] = useState<TestResult | null>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (!isAuthed) return;
    fetch("/api/admin/ai/status")
      .then((res) => (res.ok ? res.json() : null))
      .then((d: ConfigStatus | null) => setConfig(d))
      .catch(() => setConfig(null));
  }, [isAuthed]);

  async function handleTest() {
    setTesting(true);
    setTest(null);
    try {
      const res = await fetch("/api/admin/ai/test", { method: "POST" });
      setTest(await res.json());
    } catch {
      setTest({ ok: false, reason: "api", detail: "Request failed" });
    } finally {
      setTesting(false);
    }
  }

  return (
    <section className="bg-surface-raised border border-border-subtle rounded-xl p-6">
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="h-4 w-4 text-accent-blue" />
        <h2 className="text-sm font-semibold uppercase tracking-wider">AI Regime Narrative</h2>
      </div>
      <p className="text-xs text-text-secondary mb-5">
        Generates the dashboard&apos;s AI Analyst Note. Warmed automatically after an{" "}
        <span className="text-amber-400 font-medium">All FRED Series</span> fetch.
      </p>

      {!isAuthed ? (
        <p className="text-xs text-text-muted italic">
          <button type="button" onClick={promptLogin} className="underline hover:text-text-secondary transition-colors cursor-pointer">
            Login
          </button>
          {" "}required to view AI status.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <StatusBadge configured={config?.configured} />
            {config?.model && (
              <span className="text-[11px] font-mono text-text-secondary">
                model: <span className="text-text-primary">{config.model}</span>
              </span>
            )}
          </div>

          <button
            onClick={handleTest}
            disabled={testing}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-accent-blue/10 text-accent-blue border border-accent-blue/20 hover:bg-accent-blue/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Test AI connection
          </button>

          {test && <TestOutcome result={test} />}
        </>
      )}
    </section>
  );
}

function StatusBadge({ configured }: { configured?: boolean }) {
  if (configured === undefined) {
    return <span className="text-[11px] font-mono text-text-secondary">Checking…</span>;
  }
  if (configured) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-mono text-emerald-400 border border-emerald-500/20 bg-emerald-500/10 rounded px-2 py-1">
        <CheckCircle2 className="h-3.5 w-3.5" />
        API key configured
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-mono text-amber-400 border border-amber-500/20 bg-amber-500/10 rounded px-2 py-1">
      <AlertTriangle className="h-3.5 w-3.5" />
      No API key — AI disabled
    </span>
  );
}

function TestOutcome({ result }: { result: TestResult }) {
  if (result.ok) {
    return (
      <div className="mt-3 flex items-center gap-1.5 text-xs font-mono text-emerald-400">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Connection OK · {result.model}
      </div>
    );
  }
  return (
    <div className="mt-3 flex items-start gap-1.5 text-xs font-mono text-red-400">
      <XCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
      <span>
        {REASON_LABEL[result.reason] ?? "Failed"}
        {result.detail ? <span className="text-text-secondary"> — {result.detail}</span> : null}
      </span>
    </div>
  );
}
