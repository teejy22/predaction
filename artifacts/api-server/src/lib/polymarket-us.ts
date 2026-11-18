import type { SportsGame } from "@workspace/api-zod";
import { normalizeTeamName } from "./espn";
import { logger } from "./logger";
import { easternDate } from "./sports-games";

// Polymarket US public gateway: keyless and read-only. Only full-game winner markets are used.
const GATEWAY = "https://gateway.polymarket.us";
const SITE = "https://polymarket.us";
const PAGE_SIZE = 500;
const MAX_PAGES = 12;
const PAGE_PAUSE = 250;
const HOT_TTL = 2 * 60_000;
const FULL_TTL = 15 * 60_000;
// A record that has not been refreshed for this long is dropped rather than shown as current.
const STALE_AFTER = 30 * 60_000;
const MAX_SPREAD = 0.1;
const HOUR = 3_600_000;

type RawQuote = { value?: string } | null;
type RawTeam = { id?: number; name?: string; abbreviation?: string; alias?: string; safeName?: string; league?: string; colorPrimary?: string };
type RawSide = { long?: boolean; teamId?: number; team?: RawTeam | null };
type RawMarket = {
  slug?: string; sportsMarketType?: string; status?: string; active?: boolean; closed?: boolean;
  bestBidQuote?: RawQuote; bestAskQuote?: RawQuote; marketSides?: RawSide[];
};
export type RawPolymarketEvent = {
  slug?: string; startTime?: string; live?: boolean; ended?: boolean; closed?: boolean; period?: string;
  teams?: RawTeam[]; markets?: RawMarket[];
};

export type PolymarketTeam = { id: number; names: string[]; abbreviation: string; color?: string };
export type PolymarketOutcome = { team?: PolymarketTeam; chance: number; ask: number };
export type PolymarketGame = {
  slug: string; league: string; startTime: string; gameDate: string; live: boolean; period?: string;
  url: string; teams: PolymarketTeam[]; outcomes: PolymarketOutcome[]; fetchedAt: number;
};

// Kalshi game series mapped to the Polymarket US league slugs that list the same competition.
// A series that is not listed here is never matched, which keeps men's and women's leagues apart.
const LEAGUES_BY_SERIES: Record<string, string[]> = {
  KXNBAGAME: ["nba"], KXWNBAGAME: ["wnba"], KXNCAAMBGAME: ["cbb"], KXNCAAWBGAME: ["wcbb"],
  KXNFLGAME: ["nfl"], KXNCAAFGAME: ["cfb"], KXMLBGAME: ["mlb"], KXNHLGAME: ["nhl"],
  KXAHLGAME: ["ahl"], KXKHLGAME: ["khl"], KXSHLGAME: ["shl"], KXNLGAME: ["snhl"],
  KXEUROLEAGUEGAME: ["eurolg"], KXEUROCUPGAME: ["eurocup"], KXBBLGAME: ["bbl"], KXNBLGAME: ["nbl"],
  KXVTBGAME: ["vtb"], KXKBLGAME: ["kbl"], KXABAGAME: ["aba"], KXLNBPGAME: ["lnbp"], KXLKLGAME: ["lkl"],
  KXJBLEAGUEGAME: ["jpbl"], KXBLEAGUEONEGAME: ["jpbl2"], KXLNBELITEGAME: ["lnb"], KXLNBELITE2GAME: ["fra2"],
  KXFIBACHAMPGAME: ["bcl"], KXCZENBLGAME: ["cznbl"], KXSLBGAME: ["slb"], KXKORISLIIGAGAME: ["koris"],
  KXSKLGAME: ["slnbl"], KXSBLGAME: ["svkbl"],
  KXATPMATCH: ["atp"], KXWTAMATCH: ["wta"], KXITFMATCH: ["itfme"], KXITFWMATCH: ["itfwo"],
  KXATPDOUBLES: ["atpdb"], KXWTADOUBLES: ["wtadb"],
  KXUFCFIGHT: ["ufc"], KXBOXING: ["boxing"], KXDARTSMATCH: ["modus", "pdcdarts"],
  KXODIMATCH: ["odicr"], KXTESTMATCH: ["testcr"],
  KXEPLGAME: ["epl"], KXEFLCHAMPIONSHIPGAME: ["eflch"], KXEFLL1GAME: ["efl1"], KXEFLL2GAME: ["efl2"],
  KXENGNLGAME: ["engnl"], KXEWSLGAME: ["wsl"], KXUCLGAME: ["ucl"], KXUELGAME: ["uel"], KXUECLGAME: ["uecl"],
  KXUCLWGAME: ["uwcl"], KXLALIGAGAME: ["lal"], KXLALIGA2GAME: ["lal2"], KXLIGAFGAME: ["ligaf"],
  KXBUNDESLIGAGAME: ["bun"], KXBUNDESLIGA2GAME: ["bun2"], KXBUNDESLIGAWGAME: ["fbl"],
  KXSERIEAGAME: ["sea"], KXSERIEBGAME: ["srb"], KXSERIECGAME: ["serca", "sercb", "sercc"],
  KXLIGUE1GAME: ["lg1"], KXLIGUE2GAME: ["lig2"], KXMLSGAME: ["mls"], KXLIGAMXGAME: ["lmx"],
  KXBRASILEIROGAME: ["bra"], KXEREDIVISIEGAME: ["ere"], KXSUPERLIGGAME: ["tsl"], KXTFF1LIGGAME: ["tff1"],
  KXJLEAGUEGAME: ["j1"], KXJ2LEAGUEGAME: ["j2"], KXKLEAGUEGAME: ["kl1"], KXIDNSLGAME: ["idnsl"],
  KXEKSTRAKLASAGAME: ["ekst"], KXBELGIANPLGAME: ["bel1"], KXALLSVENSKANGAME: ["alsv"],
  KXSCOTTISHPREMGAME: ["scp"], KXAFCCLGAME: ["acle"], KXUAEPLGAME: ["uaepl"], KXSAUDIPLGAME: ["spl"],
  KXTHAIL1GAME: ["thai1"], KXMYSLGAME: ["mysl"], KXHNLGAME: ["hnl"], KXSVNPLGAME: ["svnp"],
  KXAUTBUNDESGAME: ["atbl"], KXSWISSLEAGUEGAME: ["swsl"], KXELITESERIENGAME: ["els"],
  KXDENSUPERLIGAGAME: ["sld"], KXSLGREECEGAME: ["grsl"], KXROML1GAME: ["slr"], KXBULFLGAME: ["pvl"],
  KXCZEFLGAME: ["flc"], KXCZEFNLGAME: ["fnl"], KXSVK1LGAME: ["nls"], KXURYPDGAME: ["uru1"],
  KXECULPGAME: ["ecu1"], KXAPFDDHGAME: ["par1"], KXPERLIGA1GAME: ["pl1"], KXBOLPDIVGAME: ["lpb"],
  KXDIMAYORGAME: ["lco"], KXCONCACAFNLGAME: ["cnl"], KXINTLFRIENDLYGAME: ["intf"],
};

const WINNER_TYPE = /(full_game_winner|full_time_winner|match_winner|fight_winner)$/;

const price = (quote: RawQuote | undefined) => {
  const value = Number(quote?.value);
  return Number.isFinite(value) && value > 0 && value < 1 ? value : undefined;
};

const tenth = (value: number) => Math.round(value * 10) / 10;

// A market is priced from its long side only when it has both a bid and an ask that sit close together.
function midpoint(market: RawMarket) {
  const bid = price(market.bestBidQuote);
  const ask = price(market.bestAskQuote);
  if (bid === undefined || ask === undefined || ask < bid || ask - bid > MAX_SPREAD) return undefined;
  return { chance: tenth(((bid + ask) / 2) * 100), ask: tenth(ask * 100), otherAsk: tenth((1 - bid) * 100) };
}

function team(raw: RawTeam | null | undefined): PolymarketTeam | undefined {
  if (!raw || typeof raw.id !== "number") return undefined;
  const names = [...new Set([raw.name, raw.alias, raw.safeName]
    .filter((value): value is string => !!value).map(normalizeTeamName).filter(Boolean))];
  if (!names.length) return undefined;
  return {
    id: raw.id, names, abbreviation: (raw.abbreviation ?? "").toLowerCase(),
    ...(raw.colorPrimary && /^#[0-9a-f]{6}$/i.test(raw.colorPrimary) ? { color: raw.colorPrimary } : {}),
  };
}

export function normalizePolymarketEvent(event: RawPolymarketEvent, fetchedAt: number): PolymarketGame | undefined {
  const at = Date.parse(event.startTime ?? "");
  const teams = (event.teams ?? []).flatMap(item => team(item) ?? []);
  const league = event.teams?.[0]?.league?.toLowerCase();
  if (!event.slug || !/^[a-z0-9-]+$/i.test(event.slug) || !league || !Number.isFinite(at)) return undefined;
  if (event.ended || event.closed || teams.length !== 2 || teams[0]!.id === teams[1]!.id) return undefined;

  const markets = (event.markets ?? []).filter(market =>
    WINNER_TYPE.test(market.sportsMarketType ?? "") && market.status === "MARKET_STATUS_OPEN" &&
    market.active !== false && market.closed !== true,
  );
  const outcomes: PolymarketOutcome[] = [];
  for (const market of markets) {
    const quote = midpoint(market);
    const sides = market.marketSides ?? [];
    const long = sides.find(side => side.long === true);
    const short = sides.find(side => side.long === false);
    if (!quote || !long || !short) continue;
    const { chance, ask } = quote;
    const longTeam = teams.find(item => item.id === long.teamId);
    const shortTeam = teams.find(item => item.id === short.teamId);
    if (longTeam && shortTeam && longTeam.id !== shortTeam.id) {
      // Two-way market: one book prices both teams. Buying the other team costs 100 minus the best bid.
      outcomes.push({ team: longTeam, chance, ask }, { team: shortTeam, chance: tenth(100 - chance), ask: quote.otherAsk });
    } else if (longTeam && (!shortTeam || shortTeam.id === longTeam.id)) {
      outcomes.push({ team: longTeam, chance, ask });
    } else if (!longTeam && long.teamId === undefined && short.teamId === undefined) {
      outcomes.push({ chance, ask });
    }
  }
  // A repeated side means the event carries more than one winner market; skip rather than pick one.
  const ids = outcomes.map(outcome => outcome.team?.id ?? -1);
  if (!outcomes.length || new Set(ids).size !== ids.length) return undefined;
  return {
    slug: event.slug, league, startTime: new Date(at).toISOString(), gameDate: easternDate(at),
    live: event.live === true, ...(event.live === true && event.period ? { period: event.period } : {}),
    url: `${SITE}/event/${event.slug}`, teams, outcomes, fetchedAt,
  };
}

const FILLER = new Set(["fc", "sc", "cf", "ac", "afc", "fk", "bc", "bk", "kk", "club", "the", "de", "and"]);
const tokens = (name: string) => name.split(" ").filter(token => token && !FILLER.has(token));

type KalshiSide = { ticker: string; name: string; abbreviation: string };

function nameMatches(sideName: string, teamName: string) {
  if (sideName === teamName) return true;
  const a = tokens(sideName);
  const b = tokens(teamName);
  if (!a.length || !b.length) return false;
  if (a.every(token => b.includes(token)) || b.every(token => a.includes(token))) return true;
  // "Los Angeles L" for "Los Angeles Lakers": same leading words, last word abbreviated.
  return a.length <= b.length && a.every((token, index) =>
    index === a.length - 1 ? b[index]!.startsWith(token) : b[index] === token);
}

function sideMatches(side: KalshiSide, candidate: PolymarketTeam) {
  if (side.abbreviation.length >= 2 && side.abbreviation === candidate.abbreviation) return true;
  return candidate.names.some(name => nameMatches(side.name, name));
}

const isDraw = (market: { ticker: string; subtitle: string; title: string }) =>
  /^(tie|draw)\b/i.test(market.subtitle || market.title) || /-TIE$/.test(market.ticker);

type Assignment = { game: PolymarketGame; pairs: { ticker: string; outcome?: PolymarketOutcome }[] };

function candidateMatch(game: SportsGame, source: PolymarketGame[]): Assignment | undefined {
  const event = game.events.find(item => LEAGUES_BY_SERIES[item.seriesTicker]);
  if (!event || !game.gameDate) return undefined;
  const leagues = LEAGUES_BY_SERIES[event.seriesTicker]!;
  const draws = event.markets.filter(isDraw);
  const sides: KalshiSide[] = event.markets.filter(market => !isDraw(market)).map(market => ({
    ticker: market.ticker, name: normalizeTeamName(market.subtitle || market.title),
    abbreviation: (market.ticker.split("-").pop() ?? "").toLowerCase(),
  }));
  if (sides.length !== 2 || draws.length > 1 || !sides[0]!.name || !sides[1]!.name) return undefined;

  const found: Assignment[] = [];
  for (const candidate of source) {
    if (candidate.gameDate !== game.gameDate || !leagues.includes(candidate.league)) continue;
    const [first, second] = candidate.teams as [PolymarketTeam, PolymarketTeam];
    const straight = sideMatches(sides[0]!, first) && sideMatches(sides[1]!, second);
    const swapped = sideMatches(sides[0]!, second) && sideMatches(sides[1]!, first);
    // Both teams must agree, and only one way round.
    if (straight === swapped) continue;
    const order = straight ? [first, second] : [second, first];
    const pairs = sides.map((side, index) => ({
      ticker: side.ticker, outcome: candidate.outcomes.find(outcome => outcome.team?.id === order[index]!.id),
    }));
    if (draws[0]) pairs.push({ ticker: draws[0].ticker, outcome: candidate.outcomes.find(outcome => !outcome.team) });
    found.push({ game: candidate, pairs });
  }
  if (found.length <= 1) return found[0];
  // Same teams twice in a day: only a published Kalshi start time can tell the games apart.
  const start = Date.parse(game.startTime ?? "");
  if (!Number.isFinite(start)) return undefined;
  const near = found.filter(item => Math.abs(Date.parse(item.game.startTime) - start) <= 1.5 * HOUR);
  return near.length === 1 ? near[0] : undefined;
}

// Attaches Polymarket US prices to Kalshi games that are clearly the same game. Unmatched games are returned untouched.
export function attachPolymarket(games: SportsGame[], source: PolymarketGame[]): SportsGame[] {
  if (!source.length) return games;
  const matches = games.map(game => candidateMatch(game, source));
  const claims = new Map<string, number>();
  for (const match of matches) if (match) claims.set(match.game.slug, (claims.get(match.game.slug) ?? 0) + 1);
  return games.map((game, index) => {
    const match = matches[index];
    // One Polymarket game claimed by two Kalshi games is ambiguous, so neither gets it.
    if (!match || claims.get(match.game.slug) !== 1) return game;
    const outcomes = match.pairs.flatMap(pair => pair.outcome ? [{
      marketTicker: pair.ticker, chance: pair.outcome.chance, ask: pair.outcome.ask,
      ...(pair.outcome.team?.color ? { color: pair.outcome.team.color } : {}),
    }] : []);
    if (!outcomes.length) return game;
    return {
      ...game,
      startTime: match.game.startTime,
      polymarket: {
        url: match.game.url, startTime: match.game.startTime, live: match.game.live,
        ...(match.game.period ? { period: match.game.period } : {}),
        updatedAt: new Date(match.game.fetchedAt).toISOString(), outcomes,
      },
    };
  });
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const records = new Map<string, PolymarketGame>();
let hotAt = 0;
let fullAt = 0;
let retryAfter = 0;
let pending: Promise<void> | undefined;

async function fetchPage(query: string, offset: number): Promise<RawPolymarketEvent[]> {
  const url = `${GATEWAY}/v1/events?limit=${PAGE_SIZE}&offset=${offset}&active=true&closed=false&tagSlug=sports&${query}`;
  for (let attempt = 0; ; attempt++) {
    try {
      const response = await fetch(url, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(20_000) });
      if (!response.ok) throw new Error(`Polymarket US returned ${response.status}`);
      const body = await response.json() as { events?: RawPolymarketEvent[] };
      return Array.isArray(body.events) ? body.events : [];
    } catch (err) {
      if (attempt >= 1) throw err;
      await sleep(1_000);
    }
  }
}

// Hot pass: games in progress or about to start. Full pass: the week ahead.
async function refresh(full: boolean) {
  const now = Date.now();
  const from = new Date(now - 6 * HOUR).toISOString();
  const to = new Date(now + (full ? 7 * 24 : 3) * HOUR).toISOString();
  const query = `startTimeMin=${encodeURIComponent(from)}&startTimeMax=${encodeURIComponent(to)}`;
  const seen = new Map<string, PolymarketGame>();
  for (let page = 0; page < MAX_PAGES; page++) {
    const events = await fetchPage(query, page * PAGE_SIZE);
    for (const event of events) {
      const game = normalizePolymarketEvent(event, now);
      if (game) seen.set(game.slug, game);
    }
    if (events.length < PAGE_SIZE) break;
    await sleep(PAGE_PAUSE);
  }
  // Games inside the refreshed window that were not returned have closed or lost their price.
  for (const [slug, game] of records) {
    const start = Date.parse(game.startTime);
    if (start >= Date.parse(from) && start <= Date.parse(to)) records.delete(slug);
  }
  for (const [slug, game] of seen) records.set(slug, game);
  hotAt = now;
  if (full) fullAt = now;
}

// Never blocks a request: returns what is cached and refreshes in the background when due.
export function getPolymarketGames(): PolymarketGame[] {
  const now = Date.now();
  const full = now - fullAt >= FULL_TTL;
  if (!pending && now >= retryAfter && (full || now - hotAt >= HOT_TTL)) {
    retryAfter = now + HOT_TTL;
    pending = refresh(full)
      .catch(err => { logger.warn({ err }, "Polymarket US refresh failed; keeping the last prices"); })
      .finally(() => { pending = undefined; });
  }
  return [...records.values()].filter(game => now - game.fetchedAt < STALE_AFTER);
}
