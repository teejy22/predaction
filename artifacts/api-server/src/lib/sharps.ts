import type { SportsGame } from "@workspace/api-zod";
import { normalizeTeamName } from "./espn";
import { flowframe } from "./flowframe";
import { logger } from "./logger";
import { nameScore } from "./polymarket-us";

// Open positions of the wallets on FlowFrame's football sharps leaderboard, read from Polymarket's public
// positions API (keyless). Loaded on a slow shared schedule, never per visitor.
const API = "https://data-api.polymarket.com/v2/positions";
const PAGE_SIZE = 500;
const MAX_PAGES = 3;
const REFRESH = 20 * 60_000;
const RETRY = 2 * 60_000;
// A wallet whose positions have not been reloaded for this long is left out rather than shown as current.
const STALE_AFTER = 60 * 60_000;
// The positions API rejects bursts, so wallets are read one at a time with a pause between requests.
const PAUSE = 700;
// Leftover dust positions are not a bet worth reporting.
const MIN_VALUE = 5;
// Requests name this site so the provider can tell who is reading and apply its own limits to it.
const HEADERS = { Accept: "application/json", "User-Agent": "PredictionPro/1.0 (+https://predactionpro.com)" };
const LEAGUE_BY_SERIES: Record<string, string> = { KXNFLGAME: "nfl", KXNCAAFGAME: "cfb" };

export type RawPosition = {
  status?: string; redeemable?: boolean; slug?: string; event_slug?: string; title?: string;
  outcome?: string; opposite_outcome?: string; current_size?: number; avg_price?: number; current_value?: number;
};
export type SharpBet = {
  wallet: string; rank: number; league: string; date: string; codes: [string, string];
  kind: "winner" | "spread" | "total"; label: string;
  // Normalized team names in slug order (away, home) when the position names them.
  teams?: [string, string];
  // Normalized name of the team this bet backs; absent for totals.
  backs?: string;
  size: number; avgPrice: number; value: number;
};

const EVENT = /^(nfl|cfb)-([a-z0-9]+)-([a-z0-9]+)-(\d{4}-\d{2}-\d{2})$/;
const lineOf = (text: string) => {
  const match = /^(\d{1,3})(?:pt(\d))?$/.exec(text);
  return match ? Number(`${match[1]}.${match[2] ?? "0"}`) : undefined;
};
const finite = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? value : undefined;
const clean = (value: string | undefined) => (value ?? "").replace(/[^\p{L}\p{N} .&'()-]/gu, "").trim().slice(0, 40);

// One open full-game position (winner, spread or total) on an NFL or college football game. Anything else is ignored.
export function normalizePosition(raw: RawPosition, wallet: string, rank: number): SharpBet | undefined {
  const event = EVENT.exec(raw.event_slug ?? "");
  const size = finite(raw.current_size), avg = finite(raw.avg_price), value = finite(raw.current_value);
  if (!event || raw.status !== "OPEN" || raw.redeemable === true) return undefined;
  if (size === undefined || avg === undefined || value === undefined || size <= 0 || value < MIN_VALUE || avg <= 0 || avg >= 1) return undefined;
  const slug = raw.slug ?? "";
  if (!slug.startsWith(event[0]!)) return undefined;
  const rest = slug.slice(event[0]!.length);
  const outcome = clean(raw.outcome), other = clean(raw.opposite_outcome);
  if (!outcome || !other) return undefined;
  const base = {
    wallet, rank, league: event[1]!, date: event[4]!, codes: [event[2]!, event[3]!] as [string, string],
    size, avgPrice: avg, value,
  };
  const titled = /^(.+?) vs\.? (.+?)(?::|$)/.exec(raw.title ?? "");
  const pair = titled ? [normalizeTeamName(titled[1]!), normalizeTeamName(titled[2]!)] as [string, string] : undefined;
  if (rest === "") {
    if (!pair || !pair.includes(normalizeTeamName(outcome))) return undefined;
    return { ...base, kind: "winner", label: `${outcome} to win`, teams: pair, backs: normalizeTeamName(outcome) };
  }
  const total = /^-total-(.+)$/.exec(rest);
  if (total) {
    const line = lineOf(total[1]!);
    if (line === undefined || !/^(over|under)$/i.test(outcome)) return undefined;
    return { ...base, kind: "total", label: `${outcome[0]!.toUpperCase()}${outcome.slice(1).toLowerCase()} ${line}`, ...(pair ? { teams: pair } : {}) };
  }
  const spread = /^-spread-(home|away)-(.+)$/.exec(rest);
  if (spread) {
    const line = lineOf(spread[2]!);
    const favorite = /^Spread: (.+?) \(-[\d.]+\)$/.exec(raw.title ?? "")?.[1];
    if (line === undefined || !favorite) return undefined;
    const fav = normalizeTeamName(favorite), mine = normalizeTeamName(outcome), theirs = normalizeTeamName(other);
    if (fav !== mine && fav !== theirs) return undefined;
    const dog = fav === mine ? theirs : mine;
    // The slug names which side is favored; slug order is away then home.
    const teams = (spread[1] === "home" ? [dog, fav] : [fav, dog]) as [string, string];
    return { ...base, kind: "spread", label: `${outcome} ${fav === mine ? "-" : "+"}${line}`, teams, backs: mine };
  }
  return undefined;
}

type Side = { ticker: string; name: string; code: string; full?: string };

function sidesOf(game: SportsGame): { league: string; sides: [Side, Side] } | undefined {
  const event = game.events.find(item => LEAGUE_BY_SERIES[item.seriesTicker]);
  if (!event || !game.gameDate || event.markets.length !== 2) return undefined;
  const sides = event.markets.map(market => ({
    ticker: market.ticker, name: normalizeTeamName(market.subtitle || market.title),
    code: (market.ticker.split("-").pop() ?? "").toLowerCase(),
  })) as [Side, Side];
  if (!sides[0].name || !sides[1].name) return undefined;
  // ESPN's full names ("Cincinnati Bengals") link Kalshi's city names to Polymarket's nicknames.
  const full = game.teams.map(team => normalizeTeamName(team.name));
  if (full.length === 2) {
    const fits = (side: Side, name: string) => name === side.name || name.startsWith(`${side.name} `) || name.startsWith(side.name);
    const straight = fits(sides[0], full[0]!) && fits(sides[1], full[1]!);
    const swapped = fits(sides[0], full[1]!) && fits(sides[1], full[0]!);
    if (straight !== swapped) {
      sides[0].full = straight ? full[0]! : full[1]!;
      sides[1].full = straight ? full[1]! : full[0]!;
    }
  }
  return { league: LEAGUE_BY_SERIES[event.seriesTicker]!, sides };
}

function teamScore(side: Side, name: string | undefined, code: string) {
  let score = side.code.length >= 2 && side.code === code ? 2 : 0;
  if (name) {
    if (name === side.name) score = Math.max(score, 3);
    else if (nameScore(side.name, name) === 1) score = Math.max(score, 2.5);
    else if (side.full && ` ${side.full} `.includes(` ${name} `)) score = Math.max(score, 1);
  }
  return score;
}

const nextDay = (date: string) => new Date(Date.parse(`${date}T12:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
const round = (value: number, digits = 0) => Math.round(value * 10 ** digits) / 10 ** digits;

// Attaches leaderboard positions to the Kalshi game they are clearly on. Games without a confident match are untouched.
export function attachSharps(game: SportsGame, bets: SharpBet[], meta: { tracked: number; updatedAt: string }): SportsGame {
  const kalshi = sidesOf(game);
  if (!kalshi || !bets.length) return game;
  // Polymarket dates games in UTC, so an evening game carries the following day.
  const days = [game.gameDate!, nextDay(game.gameDate!)];
  const groups = new Map<string, SharpBet[]>();
  for (const bet of bets) {
    if (bet.league !== kalshi.league || !days.includes(bet.date)) continue;
    const key = `${bet.codes.join("-")}-${bet.date}`;
    groups.set(key, [...(groups.get(key) ?? []), bet]);
  }
  const found: { order: [Side, Side]; bets: SharpBet[] }[] = [];
  for (const group of groups.values()) {
    const names = group.find(bet => bet.teams)?.teams;
    const [codeA, codeB] = group[0]!.codes;
    const score = (a: Side, b: Side) => {
      const one = teamScore(a, names?.[0], codeA), two = teamScore(b, names?.[1], codeB);
      return one > 0 && two > 0 ? one + two : 0;
    };
    const straight = score(kalshi.sides[0], kalshi.sides[1]);
    const swapped = score(kalshi.sides[1], kalshi.sides[0]);
    if (straight === swapped) continue;
    found.push({ order: straight > swapped ? kalshi.sides : [kalshi.sides[1], kalshi.sides[0]], bets: group });
  }
  // Two candidate games for one Kalshi game is ambiguous; show nothing.
  if (found.length !== 1) return game;
  const { order, bets: matched } = found[0]!;
  const names = matched.find(bet => bet.teams)?.teams;
  const merged = new Map<string, { kind: SharpBet["kind"]; label: string; marketTicker?: string; holders: Set<string>; value: number; size: number; cost: number; topRank: number }>();
  for (const bet of matched) {
    const index = bet.backs && names ? names.indexOf(bet.backs) : -1;
    if (bet.kind !== "total" && index < 0) continue;
    const key = `${bet.kind}:${bet.label}`;
    const entry = merged.get(key) ?? {
      kind: bet.kind, label: bet.label, ...(index >= 0 ? { marketTicker: order[index]!.ticker } : {}),
      holders: new Set<string>(), value: 0, size: 0, cost: 0, topRank: bet.rank,
    };
    entry.holders.add(bet.wallet);
    entry.value += bet.value; entry.size += bet.size; entry.cost += bet.size * bet.avgPrice;
    entry.topRank = Math.min(entry.topRank, bet.rank);
    merged.set(key, entry);
  }
  if (!merged.size) return game;
  const list = [...merged.values()].sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
  const holders = new Set(list.flatMap(item => [...item.holders]));
  return {
    ...game,
    sharps: {
      wallets: holders.size, value: round(list.reduce((sum, item) => sum + item.value, 0), 2),
      tracked: meta.tracked, updatedAt: meta.updatedAt,
      bets: list.slice(0, 12).map(item => ({
        kind: item.kind, label: item.label, ...(item.marketTicker ? { marketTicker: item.marketTicker } : {}),
        wallets: item.holders.size, value: round(item.value, 2), avgPrice: round((item.cost / item.size) * 100, 1), topRank: item.topRank,
      })),
    },
  };
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const byWallet = new Map<string, { bets: SharpBet[]; at: number }>();
let nextRefresh = 0;
let pending: Promise<void> | undefined;

async function fetchWallet(wallet: string, rank: number): Promise<SharpBet[]> {
  const bets: SharpBet[] = [];
  let cursor = "";
  for (let page = 0; page < MAX_PAGES; page++) {
    const url = `${API}?user=${wallet}&limit=${PAGE_SIZE}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`;
    let response = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(20_000) });
    if (response.status === 429) {
      const wait = Number(response.headers.get("Retry-After"));
      await sleep(Math.min(30_000, Number.isFinite(wait) && wait > 0 ? wait * 1000 : 5_000));
      response = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(20_000) });
    }
    if (!response.ok) throw new Error(`Polymarket positions returned ${response.status}`);
    const body = await response.json() as { data?: RawPosition[]; pagination?: { has_more?: boolean; next_cursor?: string | null } };
    if (!Array.isArray(body.data)) throw new Error("Unexpected Polymarket positions response");
    for (const raw of body.data) {
      const bet = normalizePosition(raw, wallet, rank);
      if (bet) bets.push(bet);
    }
    // Positions arrive largest current value first, so a page ending in worthless ones has no open bets after it.
    const last = body.data[body.data.length - 1];
    if (!body.pagination?.has_more || !body.pagination.next_cursor || !last || !((last.current_value ?? 0) > 0)) break;
    cursor = body.pagination.next_cursor;
    await sleep(PAUSE);
  }
  return bets;
}

async function refresh() {
  const board = (await flowframe.tools()).footballLeaderboard;
  const wallets = board.items.flatMap(item =>
    item.wallet && /^0x[0-9a-f]{40}$/i.test(item.wallet) && item.rank ? [{ wallet: item.wallet.toLowerCase(), rank: item.rank }] : []);
  if (!wallets.length) throw new Error("Football leaderboard is unavailable");
  const listed = new Set(wallets.map(item => item.wallet));
  for (const wallet of byWallet.keys()) if (!listed.has(wallet)) byWallet.delete(wallet);
  let failed = 0;
  let reason = "";
  let streak = 0;
  for (const item of wallets) {
    // Several refusals in a row mean the provider is turning requests away; stop and try again later.
    if (streak >= 3) { failed++; continue; }
    // A wallet read recently, such as before a failed pass, is not read again.
    const have = byWallet.get(item.wallet);
    if (have && Date.now() - have.at < REFRESH / 2) continue;
    try {
      byWallet.set(item.wallet, { bets: await fetchWallet(item.wallet, item.rank), at: Date.now() });
      streak = 0;
    } catch (err) {
      streak++;
      // The wallet keeps its last loaded positions until they go stale.
      failed++;
      reason ||= err instanceof Error ? err.message : "unknown";
    }
    await sleep(PAUSE);
  }
  if (failed) logger.warn({ failed, wallets: wallets.length, reason }, "Some sharp wallet positions could not be loaded");
  logger.info({ wallets: wallets.length, failed, bets: [...byWallet.values()].reduce((sum, entry) => sum + entry.bets.length, 0) }, "Sharp positions loaded");
  if (streak >= 3) throw new Error("Polymarket positions are being refused; retrying later");
}

// Never blocks a request: returns what is loaded and refreshes in the background when due.
export function getSharpBets(): { bets: SharpBet[]; tracked: number; updatedAt: string } {
  const now = Date.now();
  if (!pending && now >= nextRefresh) {
    nextRefresh = now + REFRESH;
    pending = refresh()
      .catch(err => { nextRefresh = Date.now() + RETRY; logger.warn({ err }, "Sharp positions refresh failed; keeping the last loaded positions"); })
      .finally(() => { pending = undefined; });
  }
  const fresh = [...byWallet.values()].filter(entry => now - entry.at < STALE_AFTER);
  return {
    bets: fresh.flatMap(entry => entry.bets), tracked: fresh.length,
    updatedAt: fresh.length ? new Date(Math.min(...fresh.map(entry => entry.at))).toISOString() : "",
  };
}
