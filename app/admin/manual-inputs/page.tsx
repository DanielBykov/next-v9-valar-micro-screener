"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { SeriesCard, type SeriesConsumer } from "../_components/manual-inputs/series-card";

type CatalogEntry = {
  seriesId: string;
  consumers: SeriesConsumer[];
};

type ManualEntry = {
  id: number;
  seriesId: string;
  observationDate: string;
  value: string;
  note: string | null;
  createdAt: string;
  updatedAt: string;
};

type Payload = {
  catalog: CatalogEntry[];
  recent: ManualEntry[];
};

export default function ManualInputsPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/manual-inputs");
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message ?? `HTTP ${res.status}`);
      }
      const payload: Payload = await res.json();
      setData(payload);
    } catch (err: any) {
      setError(err?.message ?? "Failed to load manual inputs");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-text-secondary font-mono">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading manual inputs…
      </div>
    );
  }

  if (error) {
    return <p className="text-xs text-red-400 font-mono">{error}</p>;
  }

  if (!data || data.catalog.length === 0) {
    return (
      <section className="bg-surface-raised border border-border-subtle rounded-xl p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider mb-1">Manual Inputs</h2>
        <p className="text-xs text-text-secondary">
          No scorers currently declare a manual input. When a scorer marks an input as{" "}
          <code className="text-amber-400">source: "manual"</code>, it appears here for entry.
        </p>
      </section>
    );
  }

  // Group recent entries by series for quick lookup into each card's initial list.
  const entriesBySeries = new Map<string, ManualEntry[]>();
  for (const entry of data.recent) {
    const list = entriesBySeries.get(entry.seriesId) ?? [];
    list.push(entry);
    entriesBySeries.set(entry.seriesId, list);
  }

  return (
    <div className="space-y-6">
      <section className="bg-surface-raised border border-border-subtle rounded-xl p-6">
        <h1 className="text-sm font-semibold uppercase tracking-wider mb-1">Manual Inputs</h1>
        <p className="text-xs text-text-secondary">
          Enter analyst-curated values for series with no automated free source (e.g. NFP
          consensus, Forward Guidance Tone). Each entry upserts on (series, date).
        </p>
      </section>

      {data.catalog.map((entry) => (
        <SeriesCard
          key={entry.seriesId}
          seriesId={entry.seriesId}
          consumers={entry.consumers}
          initialEntries={entriesBySeries.get(entry.seriesId) ?? []}
          onChange={load}
        />
      ))}
    </div>
  );
}
