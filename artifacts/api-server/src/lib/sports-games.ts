import { createHash } from "node:crypto";
import type { PredictionEvent } from "./kalshi";
import type { SportsGame } from "@workspace/api-zod";

const clean = (value: string) => value.replace(/\s+/g, " ").trim();

export function matchupTitle(title: string) {
  const base = clean(title.split(":")[0] ?? title);
  return base || clean(title);
}

export function marketVariant(event: PredictionEvent) {
  const title = clean(event.title);
  const index = title.indexOf(":");
  return index >= 0 ? clean(title.slice(index + 1)) : "Winner";
}

function identity(event: PredictionEvent) {
  return [
    event.sport,
    event.league,
    matchupTitle(event.title),
    event.subtitle || event.closeTime.slice(0, 10),
  ].map(value => clean(value).toLowerCase()).join("\u001f");
}

function variantRank(event: PredictionEvent) {
  const variant = marketVariant(event).toLowerCase();
  if (variant === "winner") return 0;
  if (variant === "spread") return 1;
  if (variant === "total" || variant === "total points") return 2;
  return 3;
}

function representative(events: PredictionEvent[]) {
  return [...events].sort((a, b) =>
    variantRank(a) - variantRank(b) ||
    b.volume24h - a.volume24h ||
    a.title.localeCompare(b.title),
  )[0]!;
}

export function groupSportsGames(events: PredictionEvent[]): SportsGame[] {
  const buckets = new Map<string, PredictionEvent[]>();
  for (const event of events) {
    const key = identity(event);
    const bucket = buckets.get(key);
    if (bucket) bucket.push(event);
    else buckets.set(key, [event]);
  }

  return [...buckets.entries()].map(([id, grouped]) => {
    const ordered = [...grouped].sort((a, b) =>
      variantRank(a) - variantRank(b) ||
      marketVariant(a).localeCompare(marketVariant(b)) ||
      a.ticker.localeCompare(b.ticker),
    );
    const main = representative(grouped);
    const closeTimes = grouped.map(event => event.closeTime).filter(Boolean).sort();
    return {
      key: createHash("sha256").update(id).digest("base64url").slice(0, 24),
      title: matchupTitle(main.title),
      subtitle: main.subtitle,
      category: main.category,
      categories: [...new Set(grouped.flatMap(event => event.categories))].sort(),
      sport: main.sport,
      league: main.league,
      volume: grouped.reduce((sum, event) => sum + event.volume, 0),
      volume24h: grouped.reduce((sum, event) => sum + event.volume24h, 0),
      closeTime: closeTimes[0] ?? "",
      url: main.url,
      eventCount: grouped.length,
      marketCount: grouped.reduce((sum, event) => sum + event.markets.length, 0),
      events: ordered,
    };
  });
}
