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
  // Esports side bets (map winner, spread, total maps) abbreviate the team names, so the match is told apart
  // by the shared date-and-teams part of the ticker instead of by the wording.
  const code = event.sport === "Esports" ? /^[A-Z0-9]+-(\d{2}[A-Z]{3}\d{2}[A-Z0-9]+)/.exec(event.ticker)?.[1] : undefined;
  if (code) return `esports\u001f${code.toLowerCase()}`;
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

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const EASTERN = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/New_York", hourCycle: "h23",
  year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
});

function easternParts(at: number) {
  const parts = Object.fromEntries(EASTERN.formatToParts(at).map(part => [part.type, part.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, minutes: Number(parts.hour) * 60 + Number(parts.minute) };
}

export function easternDate(at = Date.now()) {
  return easternParts(at).date;
}

// Kalshi game tickers carry the scheduled day, and sometimes the start time, in US Eastern time.
export function gameSchedule(ticker: string): { gameDate: string; startTime?: string } | undefined {
  const match = /-(\d{2})(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)(\d{2})(\d{4})?(?=[A-Z]|$)/.exec(ticker);
  if (!match) return undefined;
  const [, yy, mon, dd, hhmm] = match;
  const month = MONTHS.indexOf(mon!) + 1;
  const day = Number(dd);
  if (day < 1 || day > 31) return undefined;
  const gameDate = `20${yy}-${String(month).padStart(2, "0")}-${dd}`;
  if (!hhmm) return { gameDate };
  const wall = Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(2));
  if (Number(hhmm.slice(0, 2)) > 23 || Number(hhmm.slice(2)) > 59) return { gameDate };
  // Find the instant whose Eastern wall clock matches; two passes settle the UTC offset.
  let at = Date.parse(`${gameDate}T00:00:00Z`) + wall * 60_000;
  for (let pass = 0; pass < 2; pass++) {
    const seen = easternParts(at);
    const dayShift = Math.round((Date.parse(`${seen.date}T00:00:00Z`) - Date.parse(`${gameDate}T00:00:00Z`)) / 60_000);
    at -= (dayShift + seen.minutes - wall) * 60_000;
  }
  return { gameDate, startTime: new Date(at).toISOString() };
}

const keyOf = (id: string) => createHash("sha256").update(id).digest("base64url").slice(0, 24);

// Key of the game page a dated sports matchup belongs to; undefined for futures and non-sports events.
export function gameKeyFor(event: PredictionEvent) {
  if (!event.categories.some(category => category.toLowerCase() === "sports") || !gameSchedule(event.ticker)) return undefined;
  return keyOf(identity(event));
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
    const schedules = ordered.flatMap(event => gameSchedule(event.ticker) ?? []);
    const schedule = schedules.find(item => item.startTime) ?? schedules[0];
    return {
      key: keyOf(id),
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
      ...schedule,
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
