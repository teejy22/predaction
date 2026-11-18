import type { SportsGame, TeamLogo } from "@workspace/api-zod";
import { normalizeTeamName } from "./espn";
import { logger } from "./logger";

// OpenDota: free, keyless Dota 2 team directory (logo and all-time record). Limit is 3,000 calls a day; this uses about 10.
const API = "https://api.opendota.com/api/teams";
const PAGES = 5;
const TTL = 12 * 60 * 60 * 1000;
const RETRY = 10 * 60 * 1000;
// A team that has not played for this long may share its name with a newer, unrelated team.
const ACTIVE_WITHIN = 180 * 24 * 60 * 60;

type RawTeam = { name?: string; tag?: string; wins?: number; losses?: number; last_match_time?: number; logo_url?: string | null };
type DotaTeam = { tag: string; logo: string; wins: number; losses: number };

let teams = new Map<string, DotaTeam>();
let fetchedAt = 0;
let retryAfter = 0;
let pending: Promise<void> | undefined;

async function refresh() {
  const found = new Map<string, DotaTeam | null>();
  const cutoff = Date.now() / 1000 - ACTIVE_WITHIN;
  for (let page = 0; page < PAGES; page++) {
    const response = await fetch(`${API}?page=${page}`, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(20_000) });
    if (!response.ok) throw new Error(`OpenDota returned ${response.status}`);
    const rows = await response.json() as RawTeam[];
    if (!Array.isArray(rows)) throw new Error("OpenDota returned an unexpected response");
    for (const row of rows) {
      const name = normalizeTeamName(row.name ?? "");
      if (!name || !row.logo_url || !/^https:\/\//.test(row.logo_url) || (row.last_match_time ?? 0) < cutoff) continue;
      // Two active teams with the same name cannot be told apart, so neither is used.
      found.set(name, found.has(name) ? null : { tag: row.tag ?? "", logo: row.logo_url, wins: row.wins ?? 0, losses: row.losses ?? 0 });
    }
    if (rows.length < 1000) break;
    await new Promise(resolve => setTimeout(resolve, 1_500));
  }
  teams = new Map([...found].flatMap(([name, team]) => team ? [[name, team] as [string, DotaTeam]] : []));
  fetchedAt = Date.now();
}

// Never blocks a request: uses what is cached and refreshes in the background when due.
function directory() {
  const now = Date.now();
  if (!pending && now - fetchedAt >= TTL && now >= retryAfter) {
    retryAfter = now + RETRY;
    pending = refresh()
      .catch(err => { logger.warn({ err }, "OpenDota team refresh failed; keeping the last directory"); })
      .finally(() => { pending = undefined; });
  }
  return teams;
}

// Adds logo and record for Dota 2 teams whose name matches exactly. Unknown teams are simply left without one.
export function attachDotaTeams(game: SportsGame): SportsGame {
  if (game.league !== "Dota 2" || game.teams.length) return game;
  const known = directory();
  const winner = game.events.find(event => event.seriesTicker === "KXDOTA2GAME");
  if (!known.size || !winner) return game;
  const matched: TeamLogo[] = winner.markets.flatMap(market => {
    const team = known.get(normalizeTeamName(market.subtitle));
    return team ? [{ name: market.subtitle, abbreviation: team.tag, logo: team.logo, wins: team.wins, losses: team.losses }] : [];
  });
  return matched.length ? { ...game, teams: matched } : game;
}
