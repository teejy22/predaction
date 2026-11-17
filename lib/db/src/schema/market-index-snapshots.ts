import { pgTable, text, timestamp, integer } from "drizzle-orm/pg-core";

// One row per provider index. The payload is a gzip-compressed, base64-encoded
// JSON copy of the last complete crawl, used to serve markets right after a restart.
export const marketIndexSnapshotsTable = pgTable("market_index_snapshots", {
  id: text("id").primaryKey(),
  payload: text("payload").notNull(),
  eventCount: integer("event_count").notNull(),
  indexedAt: timestamp("indexed_at", { withTimezone: true }).notNull(),
});

export type MarketIndexSnapshot = typeof marketIndexSnapshotsTable.$inferSelect;
