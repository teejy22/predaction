import { createHash } from "node:crypto";
import type { PredictionEvent } from "./kalshi";
import type { PredictionMarket, SportsGame } from "@workspace/api-zod";

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

const MAIN_LINE_SPORTS = new Set(["football", "basketball"]);
const MAIN_LINE_LEAGUES = new Set(["NFL", "NCAAF", "NBA", "WNBA", "NCAAB"]);
type MainKind = "winner" | "spread" | "total";

function isMainLineSport(event: PredictionEvent) {
  return MAIN_LINE_SPORTS.has(event.sport.toLowerCase()) || MAIN_LINE_LEAGUES.has(event.league.toUpperCase());
}

function mainKind(event: PredictionEvent): MainKind | null {
  const variant = marketVariant(event).toLowerCase();
  if (variant === "winner" || variant === "moneyline") {
    return /\bvs\.?\b/i.test(matchupTitle(event.title)) ? "winner" : null;
  }
  if (variant === "spread") return "spread";
  if (variant === "total" || variant === "total points" || variant === "point total") return "total";
  return null;
}

export function isMainMarketEvent(event: PredictionEvent) {
  return !isMainLineSport(event) || mainKind(event) !== null;
}

function primaryMarketEvent(event: PredictionEvent, kind: MainKind): PredictionEvent {
  if (kind === "winner") return event;
  const market = [...event.markets].sort((a, b) =>
    b.volume24h - a.volume24h || b.volume - a.volume ||
    Math.abs(a.probability - 50) - Math.abs(b.probability - 50) || a.ticker.localeCompare(b.ticker),
  )[0];
  return {
    ...event,
    markets: market ? [market] : [],
    volume: market?.volume ?? 0,
    volume24h: market?.volume24h ?? 0,
  };
}

export function selectMainMarketEvents(events: PredictionEvent[]) {
  const passthrough: PredictionEvent[] = [];
  const selected = new Map<string, PredictionEvent>();
  for (const event of events) {
    if (!isMainLineSport(event)) {
      passthrough.push(event);
      continue;
    }
    const kind = mainKind(event);
    if (!kind) continue;
    const candidate = primaryMarketEvent(event, kind);
    const key = `${identity(event)}\u001f${kind}`;
    const current = selected.get(key);
    if (!current || candidate.volume24h > current.volume24h ||
      (candidate.volume24h === current.volume24h && candidate.volume > current.volume)) {
      selected.set(key, candidate);
    }
  }
  return [...passthrough, ...selected.values()];
}

function identity(event: PredictionEvent) {
  return [
    event.sport,
    matchupTitle(event.title),
    event.subtitle || event.closeTime.slice(0, 10),
  ].map(value => clean(value).toLowerCase()).join("\u001f");
}

function variantRank(event: PredictionEvent) {
  const variant = marketVariant(event).toLowerCase();
  if (variant === "winner") return 0;
  if (variant === "spread") return 1;
  if (variant === "total" || variant === "total points" || variant === "point total") return 2;
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
      sport: grouped.find(event => event.sport)?.sport ?? main.sport,
      league: grouped.find(event => event.league)?.league ?? "",
      volume: grouped.reduce((sum, event) => sum + event.volume, 0),
      volume24h: grouped.reduce((sum, event) => sum + event.volume24h, 0),
      closeTime: closeTimes[0] ?? "",
      url: main.url,
      eventCount: grouped.length,
      marketCount: grouped.reduce((sum, event) => sum + event.markets.length, 0),
      teams: [],
      events: ordered,
    };
  });
}

const LIST_EVENT_KINDS: MainKind[] = ["winner", "spread", "total"];

function listEvent(event: SportsGame["events"][number]): SportsGame["events"][number] {
  const markets: PredictionMarket[] = [...event.markets]
    .sort((a, b) => b.probability - a.probability || b.volume - a.volume || a.ticker.localeCompare(b.ticker))
    .slice(0, 3)
    .map(market => ({ ...market, rules: "" }));
  return {
    ticker: event.ticker,
    seriesTicker: event.seriesTicker,
    title: event.title,
    subtitle: event.subtitle,
    category: event.category,
    categories: event.categories,
    sport: event.sport,
    league: event.league,
    volume: event.volume,
    volume24h: event.volume24h,
    closeTime: event.closeTime,
    url: event.url,
    markets,
  };
}

// List cards render at most three event groups and three outcomes per group.
// Full nested events remain available from the game-detail endpoint.
export function summarizeSportsGame(game: SportsGame): SportsGame {
  const selected = LIST_EVENT_KINDS.flatMap(kind => {
    const event = game.events.find(item => mainKind(item) === kind && item.markets.length);
    return event ? [event] : [];
  });
  const fallback = selected.length ? [] : [...game.events]
    .sort((a, b) => b.volume - a.volume || a.title.localeCompare(b.title))
    .slice(0, 1);
  return { ...game, events: [...selected, ...fallback].map(listEvent) };
}
