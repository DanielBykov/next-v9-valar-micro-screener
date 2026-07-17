import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { snapshotNarratives, type SnapshotNarrative } from "@/shared/schema";

export async function getCachedNarrative(
  snapshotDate: string,
  inputHash: string,
): Promise<SnapshotNarrative | null> {
  const rows = await db
    .select()
    .from(snapshotNarratives)
    .where(
      and(
        eq(snapshotNarratives.snapshotDate, snapshotDate),
        eq(snapshotNarratives.inputHash, inputHash),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function putNarrative(
  input: {
    snapshotDate: string;
    inputHash: string;
    headline: string;
    narrative: string;
    model: string;
  },
  opts: { overwrite?: boolean } = {},
): Promise<void> {
  const insert = db.insert(snapshotNarratives).values(input);
  if (opts.overwrite) {
    // Regenerate path: replace the note for this exact (date, hash).
    await insert.onConflictDoUpdate({
      target: [snapshotNarratives.snapshotDate, snapshotNarratives.inputHash],
      set: {
        headline: input.headline,
        narrative: input.narrative,
        model: input.model,
        generatedAt: new Date(),
      },
    });
    return;
  }
  // Default cache path: concurrent precompute + on-demand generation can race,
  // so ignore a duplicate (date, hash) instead of erroring.
  await insert.onConflictDoNothing({
    target: [snapshotNarratives.snapshotDate, snapshotNarratives.inputHash],
  });
}

export type NarrativeLedgerRow = {
  snapshotDate: string;
  inputHash: string;
  headline: string;
  narrative: string;
  model: string;
  generatedAt: string;
  versionCount: number;
};

/**
 * One row per date — the most recently generated note for that date — plus a
 * count of how many versions (distinct score configs) exist for it. DB-only:
 * never recomputes a snapshot, so it stays cheap regardless of coverage.
 */
export async function listNarrativesLatestPerDate(): Promise<NarrativeLedgerRow[]> {
  const rows = await db
    .select()
    .from(snapshotNarratives)
    .orderBy(desc(snapshotNarratives.snapshotDate), desc(snapshotNarratives.generatedAt));

  const byDate = new Map<string, NarrativeLedgerRow>();
  for (const r of rows) {
    const existing = byDate.get(r.snapshotDate);
    if (existing) {
      existing.versionCount += 1;
      continue;
    }
    byDate.set(r.snapshotDate, {
      snapshotDate: r.snapshotDate,
      inputHash: r.inputHash,
      headline: r.headline,
      narrative: r.narrative,
      model: r.model,
      generatedAt: r.generatedAt.toISOString(),
      versionCount: 1,
    });
  }
  return [...byDate.values()];
}

/**
 * Delete every note for a date except the one matching `keepHash` (the current
 * live score config). Returns the number of superseded rows removed.
 */
export async function deleteSupersededForDate(
  snapshotDate: string,
  keepHash: string,
): Promise<number> {
  const stale = await db
    .select({ id: snapshotNarratives.id, inputHash: snapshotNarratives.inputHash })
    .from(snapshotNarratives)
    .where(eq(snapshotNarratives.snapshotDate, snapshotDate))
    .orderBy(asc(snapshotNarratives.generatedAt));

  const toDelete = stale.filter((r) => r.inputHash !== keepHash);
  for (const r of toDelete) {
    await db.delete(snapshotNarratives).where(eq(snapshotNarratives.id, r.id));
  }
  return toDelete.length;
}
