import { and, eq } from "drizzle-orm";
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

export async function putNarrative(input: {
  snapshotDate: string;
  inputHash: string;
  headline: string;
  narrative: string;
  model: string;
}): Promise<void> {
  // Idempotent: concurrent precompute + on-demand generation can race, so
  // ignore a duplicate (date, hash) instead of erroring.
  await db.insert(snapshotNarratives).values(input).onConflictDoNothing({
    target: [snapshotNarratives.snapshotDate, snapshotNarratives.inputHash],
  });
}
