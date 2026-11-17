import type { SportsGame, TeamLogo } from "@workspace/api-zod";
import { logger } from "./logger";

const ESPN_API = "https://site.api.espn.com/apis/site/v2/sports";
const TEAM_TTL = 6 * 60 * 60 * 1000;

type Endpoint = { sport: string; league: string; path: string };
const ENDPOINTS: Endpoint[] = [
  { sport: "Football", league: "NFL", path: "football/nfl" },
  { sport: "Football", league: "NCAAF", path: "football/college-football" },
  { sport: "Basketball", league: "NBA", path: "basketball/nba" },
  { sport: "Basketball", league: "WNBA", path: "basketball/wnba" },
  { sport: "Basketball", league: "NCAAB", path: "basketball/mens-college-basketball" },
  { sport: "Basketball", league: "NCAAB", path: "basketball/womens-college-basketball" },
  { sport: "Baseball", league: "MLB", path: "baseball/mlb" },
  { sport: "Hockey", league: "NHL", path: "hockey/nhl" },
  { sport: "Soccer", league: "EPL", path: "soccer/eng.1" },
  { sport: "Soccer", league: "UCL", path: "soccer/uefa.champions" },
  { sport: "Soccer", league: "MLS", path: "soccer/usa.1" },
  { sport: "Soccer", league: "La Liga", path: "soccer/esp.1" },
  { sport: "Soccer", league: "Bundesliga", path: "soccer/ger.1" },
  { sport: "Soccer", league: "Serie A", path: "soccer/ita.1" },
  { sport: "Soccer", league: "Ligue 1", path: "soccer/fra.1" },
];

type EspnLogo = { href?: string };
type EspnTeamPayload = {
  id?: string | number; displayName?: string; name?: string; nickname?: string;
  location?: string; shortDisplayName?: string; abbreviation?: string; logos?: EspnLogo[];
};
type EspnResponse = { sports?: { leagues?: { teams?: { team?: EspnTeamPayload }[] }[] }[] };
export type EspnTeam = TeamLogo & { id: string; sport: string; league: string; aliases: string[] };

let cached: { at: number; teams: EspnTeam[] } | undefined;
let pending: Promise<EspnTeam[]> | undefined;

export function normalizeTeamName(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ")
    .replace(/\bst\b/g, "state").replace(/\s+/g, " ").trim();
}

export function teamNameAliases(value: string) {
  const alias = normalizeTeamName(value);
  const expansions: Record<string, string> = {
    la: "los angeles",
    ny: "new york",
    sf: "san francisco",
    lv: "las vegas",
  };
  const [city = "", ...rest] = alias.split(" ");
  const expanded = expansions[city] && rest.length ? `${expansions[city]} ${rest.join(" ")}` : "";
  return [...new Set([alias, expanded].filter(Boolean))];
}

function parseTeams(endpoint: Endpoint, payload: EspnResponse): EspnTeam[] {
  const teams = payload.sports?.flatMap(sport => sport.leagues ?? [])?.flatMap(league => league.teams ?? []) ?? [];
  return teams.flatMap(item => {
    const team = item.team;
    const logo = team?.logos?.find(image => image.href)?.href;
    const name = team?.displayName || team?.name || team?.shortDisplayName || team?.abbreviation;
    if (!team || !logo || !name) return [];
    const aliases = [...new Set([
      team.displayName, team.name, team.nickname, team.location, team.shortDisplayName, team.abbreviation,
    ].filter((value): value is string => !!value).flatMap(teamNameAliases).filter(value => value.length >= 2))];
    return [{
      id: String(team.id ?? `${endpoint.league}-${name}`), name,
      abbreviation: team.abbreviation || team.shortDisplayName || name,
      logo, sport: endpoint.sport, league: endpoint.league, aliases,
    }];
  });
}

async function fetchEndpoint(endpoint: Endpoint): Promise<EspnTeam[]> {
  try {
    const response = await fetch(`${ESPN_API}/${endpoint.path}/teams?limit=1000`, {
      headers: { Accept: "application/json" }, signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new Error(`ESPN returned ${response.status}`);
    return parseTeams(endpoint, await response.json() as EspnResponse);
  } catch (err) {
    logger.warn({ err, sport: endpoint.sport, league: endpoint.league }, "ESPN team directory request failed");
    return [];
  }
}

export function dedupeEspnTeams(teams: EspnTeam[]) {
  const bySchool = new Map<string, EspnTeam>();
  for (const team of teams) {
    const key = `${team.sport}:${team.league}:${normalizeTeamName(team.abbreviation || team.name)}`;
    if (!bySchool.has(key)) bySchool.set(key, team);
  }
  return [...bySchool.values()];
}

export async function getEspnTeams() {
  if (cached && Date.now() - cached.at < TEAM_TTL) return cached.teams;
  if (!pending) pending = Promise.all(ENDPOINTS.map(fetchEndpoint)).then(groups => {
    const teams = dedupeEspnTeams(groups.flat());
    if (teams.length) cached = { at: Date.now(), teams };
    return cached?.teams ?? [];
  }).finally(() => { pending = undefined; });
  return pending;
}

function candidateTeams(game: Pick<SportsGame, "sport" | "league">, teams: EspnTeam[]) {
  const scoped = teams.filter(team =>
    (!game.sport || team.sport === game.sport) && (!game.league || team.league === game.league),
  );
  return dedupeEspnTeams(scoped);
}

function scoreTeam(side: string, team: EspnTeam) {
  let score = 0;
  const sideTokens = new Set(side.split(" ").filter(Boolean));
  for (const alias of team.aliases) {
    if (alias === side) score = Math.max(score, 1_000 + side.length);
    else if (alias.startsWith(side)) score = Math.max(score, 800 + side.length * 2 - alias.length);
    else if (side.startsWith(alias)) score = Math.max(score, 700 + alias.length);
    else {
      const aliasTokens = new Set(alias.split(" ").filter(Boolean));
      if (sideTokens.size && [...sideTokens].every(token => aliasTokens.has(token))) score = Math.max(score, 600 + sideTokens.size * 10);
      else if (aliasTokens.size && [...aliasTokens].every(token => sideTokens.has(token))) score = Math.max(score, 500 + aliasTokens.size * 10);
    }
  }
  return score;
}

function bestMatch(sideText: string, teams: EspnTeam[]) {
  const side = normalizeTeamName(sideText);
  const scored = teams.map(team => ({ team, score: scoreTeam(side, team) }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score || a.team.name.localeCompare(b.team.name));
  if (!scored[0] || scored[1]?.score === scored[0].score) return undefined;
  return scored[0].team;
}

export function matchGameTeams(title: string, teams: EspnTeam[]): TeamLogo[] {
  const sides = title.split(/\s+vs\.?\s+/i).map(value => value.trim()).filter(Boolean);
  if (sides.length !== 2) return [];
  const matched = sides.map(side => bestMatch(side, teams));
  return matched.filter((team, index): team is EspnTeam =>
    !!team && matched.findIndex(other => other?.id === team.id) === index,
  ).map(({ name, abbreviation, logo }) => ({ name, abbreviation, logo }));
}

export function attachTeamLogos(game: SportsGame, teams: EspnTeam[]): SportsGame {
  return { ...game, teams: matchGameTeams(game.title, candidateTeams(game, teams)) };
}
