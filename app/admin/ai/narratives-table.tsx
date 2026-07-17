"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw, Sparkles, ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import { useAdminAuth } from "../_components/admin-auth-context";

type LedgerRow = {
  snapshotDate: string;
  inputHash: string;
  headline: string;
  narrative: string;
  model: string;
  generatedAt: string;
  versionCount: number;
};

type Outcome =
  | { status: "ok"; fromCache: boolean }
  | { status: "disabled"; reason: string }
  | { status: "error"; reason: string; detail: string };

const REASON_LABEL: Record<string, string> = {
  no_api_key: "No API key configured",
  auth: "API key rejected",
  rate_limit: "Rate limited",
  api: "API error",
  empty: "Model returned nothing",
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function NarrativesTable() {
  const { isAuthed, promptLogin } = useAdminAuth();
  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(todayIso());
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/ai/narratives");
      const data = await res.json();
      setRows(res.ok ? data.narratives ?? [] : []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthed) load();
  }, [isAuthed, load]);

  async function generate(targetDate: string, force: boolean) {
    setBusy(`${force ? "regen" : "gen"}:${targetDate}`);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/ai/narrative", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: targetDate, force }),
      });
      const data: { outcome: Outcome } = await res.json();
      const o = data.outcome;
      if (o.status === "ok") {
        setMessage({ tone: "ok", text: `${targetDate}: ${o.fromCache ? "loaded from cache" : "generated"}` });
      } else if (o.status === "disabled") {
        setMessage({ tone: "err", text: `${targetDate}: ${REASON_LABEL[o.reason] ?? o.reason}` });
      } else {
        setMessage({ tone: "err", text: `${targetDate}: ${REASON_LABEL[o.reason] ?? o.reason} — ${o.detail}` });
      }
      await load();
    } catch (err: any) {
      setMessage({ tone: "err", text: err?.message ?? "Request failed" });
    } finally {
      setBusy(null);
    }
  }

  async function cleanup(targetDate: string) {
    setBusy(`clean:${targetDate}`);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/ai/narratives?date=${targetDate}`, { method: "DELETE" });
      const data = await res.json();
      setMessage({ tone: "ok", text: `${targetDate}: removed ${data.removed ?? 0} superseded` });
      await load();
    } catch (err: any) {
      setMessage({ tone: "err", text: err?.message ?? "Request failed" });
    } finally {
      setBusy(null);
    }
  }

  if (!isAuthed) {
    return (
      <section className="bg-surface-raised border border-border-subtle rounded-xl p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider mb-1">Narrative Ledger</h2>
        <p className="text-xs text-text-muted italic mt-3">
          <button type="button" onClick={promptLogin} className="underline hover:text-text-secondary transition-colors cursor-pointer">
            Login
          </button>
          {" "}required to view narratives.
        </p>
      </section>
    );
  }

  return (
    <section className="bg-surface-raised border border-border-subtle rounded-xl p-6">
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="h-4 w-4 text-accent-blue" />
        <h2 className="text-sm font-semibold uppercase tracking-wider">Narrative Ledger</h2>
      </div>
      <p className="text-xs text-text-secondary mb-5">
        Latest AI note per date. Generate or regenerate for a specific date below.
      </p>

      <div className="flex flex-wrap items-end gap-4 mb-5">
        <div className="space-y-1.5">
          <label className="text-xs text-text-secondary font-mono">Date</label>
          <input
            type="date"
            value={date}
            max={todayIso()}
            onChange={(e) => setDate(e.target.value)}
            className="px-3 py-2 text-xs font-mono rounded-lg border border-border-subtle bg-surface-base text-text-primary hover:border-border-default focus:outline-none focus:border-border-default transition-colors [color-scheme:dark]"
          />
        </div>
        <button
          onClick={() => generate(date, false)}
          disabled={busy !== null}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-accent-blue/10 text-accent-blue border border-accent-blue/20 hover:bg-accent-blue/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {busy === `gen:${date}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Generate
        </button>
        <button
          onClick={() => generate(date, true)}
          disabled={busy !== null}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {busy === `regen:${date}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Regenerate
        </button>
      </div>

      {message && (
        <span className={`text-xs font-mono block mb-3 ${message.tone === "ok" ? "text-emerald-400" : "text-red-400"}`}>
          {message.text}
        </span>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-xs font-mono text-text-secondary py-4">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading ledger…
        </div>
      ) : rows.length === 0 ? (
        <p className="text-xs text-text-secondary py-4">No narratives generated yet.</p>
      ) : (
        <div className="border border-border-subtle rounded-lg overflow-hidden">
          <table className="w-full text-xs font-mono">
            <thead className="bg-surface-overlay">
              <tr>
                <th className="text-left px-4 py-2 text-text-secondary font-medium w-8" />
                <th className="text-left px-4 py-2 text-text-secondary font-medium">Date</th>
                <th className="text-left px-4 py-2 text-text-secondary font-medium">Headline</th>
                <th className="text-left px-4 py-2 text-text-secondary font-medium">Generated</th>
                <th className="text-right px-4 py-2 text-text-secondary font-medium">Versions</th>
                <th className="text-right px-4 py-2 text-text-secondary font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const isOpen = expanded === r.snapshotDate;
                return (
                  <Fragment key={r.snapshotDate}>
                    <tr
                      className="border-t border-border-subtle/50 hover:bg-surface-overlay/50 cursor-pointer"
                      onClick={() => setExpanded(isOpen ? null : r.snapshotDate)}
                    >
                      <td className="px-4 py-1.5 text-text-secondary">
                        {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                      </td>
                      <td className="px-4 py-1.5 text-text-primary">{r.snapshotDate}</td>
                      <td className="px-4 py-1.5 text-text-secondary max-w-md truncate">{r.headline}</td>
                      <td className="px-4 py-1.5 text-text-secondary">{r.generatedAt.slice(0, 16).replace("T", " ")}</td>
                      <td className="px-4 py-1.5 text-right text-amber-400">
                        {r.versionCount > 1 ? `${r.versionCount}` : "1"}
                      </td>
                      <td className="px-4 py-1.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => generate(r.snapshotDate, true)}
                          disabled={busy !== null}
                          title="Regenerate"
                          className="inline-flex items-center gap-1 text-amber-400 hover:text-amber-300 disabled:opacity-40 cursor-pointer"
                        >
                          {busy === `regen:${r.snapshotDate}` ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <RefreshCw className="h-3.5 w-3.5" />
                          )}
                        </button>
                        {r.versionCount > 1 && (
                          <button
                            onClick={() => cleanup(r.snapshotDate)}
                            disabled={busy !== null}
                            title="Remove superseded versions"
                            className="inline-flex items-center gap-1 ml-3 text-text-secondary hover:text-red-400 disabled:opacity-40 cursor-pointer"
                          >
                            {busy === `clean:${r.snapshotDate}` ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </button>
                        )}
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="border-t border-border-subtle/50 bg-surface-base/40">
                        <td />
                        <td colSpan={5} className="px-4 py-3">
                          <div className="space-y-2 max-w-3xl">
                            <p className="text-[13px] font-sans font-semibold text-text-primary">{r.headline}</p>
                            {r.narrative.split(/\n\s*\n/).filter((p) => p.trim()).map((p, i) => (
                              <p key={i} className="text-[13px] font-sans text-text-secondary leading-relaxed">
                                {p}
                              </p>
                            ))}
                            <p className="text-[11px] text-text-secondary pt-1">
                              {r.model} · hash {r.inputHash}
                            </p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
