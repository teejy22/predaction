import { promisify } from "node:util";
import { gunzip, gzip } from "node:zlib";
import { eq } from "drizzle-orm";
import { db, marketIndexSnapshotsTable } from "@workspace/db";

const zip = promisify(gzip);
const unzip = promisify(gunzip);

export type StoredIndex<T> = { data: T; indexedAt: string };

// Persists the last complete crawl so a restarted server can serve it immediately.
export async function saveIndex(id: string, data: unknown, eventCount: number, indexedAt: string): Promise<void> {
  const payload = (await zip(Buffer.from(JSON.stringify(data)))).toString("base64");
  const values = { id, payload, eventCount, indexedAt: new Date(indexedAt) };
  await db.insert(marketIndexSnapshotsTable).values(values)
    .onConflictDoUpdate({ target: marketIndexSnapshotsTable.id, set: { payload, eventCount, indexedAt: values.indexedAt } });
}

export async function loadIndex<T>(id: string): Promise<StoredIndex<T> | undefined> {
  const [row] = await db.select().from(marketIndexSnapshotsTable).where(eq(marketIndexSnapshotsTable.id, id)).limit(1);
  if (!row) return undefined;
  const data = JSON.parse((await unzip(Buffer.from(row.payload, "base64"))).toString("utf8")) as T;
  return { data, indexedAt: row.indexedAt.toISOString() };
}
