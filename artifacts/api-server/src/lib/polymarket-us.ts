import type { SportsGame } from "@workspace/api-zod";
import { normalizeTeamName } from "./espn";
import { logger } from "./logger";
import { easternDate } from "./sports-games";

// Polymarket US public gateway: keyless and read-only. Only full-game winner markets are used.
const GATEWAY = "https://gateway.polymarket.us";
const SITE = "https://polymarket.us";
const PAGE_SIZE = 500;
const MAX_PAGES = 16;
const PAGE_PAUSE = 250;
const HOT_TTL = 2 * 60_000;
const FULL_TTL = 15 * 60_000;
const FAR_TTL = 30 * 60_000;
// A record that has not been refreshed for this long is dropped rather than shown as current.
const STALE_AFTER = 75 * 60_000;
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
  slug?: string; startTime?: string; live?: boolean; ended?: boolean; closed?: boolean; period?: string; score?: string;
  teams?: RawTeam[]; markets?: RawMarket[];
};

export type PolymarketTeam = { id: number; names: string[]; abbreviation: string; color?: string; score?: string };
export type PolymarketOutcome = { team?: PolymarketTeam; chance?: number; ask?: number };
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
  KXATPDOUBLES: ["atpdb"], KXWTADOUBLES: ["wtadb"], KXATPCHALLENGERMATCH: ["atp"], KXATPCHALLENGERDOUBLES: ["atpdb"],
  KXITFDOUBLES: ["itfme", "atpdb"], KXITFWDOUBLES: ["itfwo", "wtadb"],
  KXWTACHALLENGERMATCH: ["wta"], KXDBBFGAME: ["denbl"], KXSUPERETTANGAME: ["swe2"],
  KXCS2GAME: ["cs2"], KXVALORANTGAME: ["valorant"], KXDOTA2GAME: ["dota2"], KXOWGAME: ["ow"],
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

// Tour-level tennis is scheduled days ahead and Kalshi's ticker date can be the day the draw was set.
const TENNIS_TOUR = new Set(["KXATPMATCH", "KXWTAMATCH", "KXATPDOUBLES", "KXWTADOUBLES"]);
const LOOSE_DAY = new Set(["KXATPMATCH", "KXWTAMATCH", "KXITFMATCH", "KXITFWMATCH", "KXATPDOUBLES", "KXWTADOUBLES",
  "KXATPCHALLENGERMATCH", "KXWTACHALLENGERMATCH", "KXATPCHALLENGERDOUBLES", "KXITFDOUBLES", "KXITFWDOUBLES", "KXUFCFIGHT", "KXBOXING", "KXDARTSMATCH",
  "KXCS2GAME", "KXVALORANTGAME", "KXDOTA2GAME", "KXOWGAME"]);

const WINNER_TYPE = /(full_game_winner|full_time_winner|match_winner|fight_winner)$/;

const price = (quote: RawQuote | undefined) => {
  const value = Number(quote?.value);
  return Number.isFinite(value) && value > 0 && value < 1 ? value : undefined;
};

const tenth = (value: number) => Math.round(value * 10) / 10;

// One order book prices the long side. The chance is shown only when a bid and an ask sit close together;
// the price to buy either side is kept whenever the book offers one.
function quoteOf(market: RawMarket) {
  const bid = price(market.bestBidQuote);
  const ask = price(market.bestAskQuote);
  const tight = bid !== undefined && ask !== undefined && ask >= bid && ask - bid <= MAX_SPREAD + 1e-9;
  return {
    chance: tight ? tenth(((bid + ask) / 2) * 100) : undefined,
    ask: ask === undefined ? undefined : tenth(ask * 100),
    otherAsk: bid === undefined ? undefined : tenth((1 - bid) * 100),
  };
}

const outcome = (chance: number | undefined, ask: number | undefined, item?: PolymarketTeam): PolymarketOutcome | undefined =>
  chance === undefined && ask === undefined ? undefined
    : { ...(item ? { team: item } : {}), ...(chance === undefined ? {} : { chance }), ...(ask === undefined ? {} : { ask }) };

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

// "29-36" is first team then second team. Tennis lists one pair per set and may append the current game after a colon.
export function parseScore(raw: string | undefined): [string, string] | undefined {
  const body = (raw ?? "").split(":")[0]!.trim();
  if (!/^\d{1,3}-\d{1,3}(,\s*\d{1,3}-\d{1,3})*$/.test(body)) return undefined;
  const sets = body.split(",").map(part => part.trim().split("-") as [string, string]);
  return [sets.map(set => set[0]).join(" "), sets.map(set => set[1]).join(" ")];
}

const PERIODS: Record<string, string> = { HT: "Halftime", SUS: "Suspended", "1H": "1st half", "2H": "2nd half", OT: "Overtime" };
function periodLabel(raw: string | undefined) {
  const value = (raw ?? "").trim();
  if (!value || value === "NS" || value === "FT" || value.length > 12) return undefined;
  const set = /^S(\d)$/.exec(value);
  return set ? `Set ${set[1]}` : PERIODS[value] ?? value;
}

export function normalizePolymarketEvent(event: RawPolymarketEvent, fetchedAt: number): PolymarketGame | undefined {
  const at = Date.parse(event.startTime ?? "");
  const teams = (event.teams ?? []).flatMap(item => team(item) ?? []);
  const league = event.teams?.[0]?.league?.toLowerCase();
  if (!event.slug || !/^[a-z0-9-]+$/i.test(event.slug) || !league || !Number.isFinite(at)) return undefined;
  if (event.ended || event.closed || teams.length !== 2 || teams[0]!.id === teams[1]!.id) return undefined;
  const live = event.live === true;
  const score = live ? parseScore(event.score) : undefined;
  if (score) teams.forEach((item, index) => { item.score = score[index]!; });

  const markets = (event.markets ?? []).filter(market =>
    WINNER_TYPE.test(market.sportsMarketType ?? "") && market.status === "MARKET_STATUS_OPEN" &&
    market.active !== false && market.closed !== true,
  );
  let outcomes: PolymarketOutcome[] = [];
  for (const market of markets) {
    const quote = quoteOf(market);
    const sides = market.marketSides ?? [];
    const long = sides.find(side => side.long === true);
    const short = sides.find(side => side.long === false);
    if (!long || !short) continue;
    const longTeam = teams.find(item => item.id === long.teamId);
    const shortTeam = teams.find(item => item.id === short.teamId);
    if (longTeam && shortTeam && longTeam.id !== shortTeam.id) {
      // Two-way market: one book prices both teams. Buying the other team costs 100 minus the best bid.
      const other = quote.chance === undefined ? undefined : tenth(100 - quote.chance);
      outcomes.push(...[outcome(quote.chance, quote.ask, longTeam), outcome(other, quote.otherAsk, shortTeam)].flatMap(item => item ?? []));
    } else if (longTeam && (!shortTeam || shortTeam.id === longTeam.id)) {
      outcomes.push(...[outcome(quote.chance, quote.ask, longTeam)].flatMap(item => item ?? []));
    } else if (!longTeam && long.teamId === undefined && short.teamId === undefined) {
      outcomes.push(...[outcome(quote.chance, quote.ask)].flatMap(item => item ?? []));
    }
  }
  // A repeated side means the event carries more than one winner market; show no price rather than pick one.
  const ids = outcomes.map(item => item.team?.id ?? -1);
  if (new Set(ids).size !== ids.length) outcomes = [];
  const period = live ? periodLabel(event.period) : undefined;
  return {
    slug: event.slug, league, startTime: new Date(at).toISOString(), gameDate: easternDate(at),
    live, ...(period ? { period } : {}),
    url: `${SITE}/event/${event.slug}`, teams, outcomes, fetchedAt,
  };
}

const FILLER = new Set(["fc", "sc", "cf", "ac", "afc", "fk", "bc", "bk", "kk", "hc", "club", "the", "de", "and", "w", "university"]);
// Words shared by many unrelated teams; never enough on their own to call two names the same team.
const GENERIC = new Set(["city", "united", "real", "state", "saint", "san", "new", "los", "las", "team", "gaming", "esports",
  "academy", "women", "sporting", "atletico", "athletic", "racing", "union", "olympique", "dynamo", "dinamo", "north", "south",
  "east", "west", "northern", "southern", "eastern", "western", "central", "international", "college", "tech", "basket", "hockey"]);
const tokens = (name: string) => name.split(" ").filter(token => token && !FILLER.has(token));

type KalshiSide = { ticker: string; name: string; abbreviation: string };

// "ga" for "georgia", "tenn" for "tennessee": same first letter, remaining letters in order.
function abbreviates(short: string, long: string) {
  if (short.length < 2 || short.length >= long.length || short[0] !== long[0]) return false;
  let at = 0;
  for (const letter of short) {
    at = long.indexOf(letter, at) + 1;
    if (!at) return false;
  }
  return true;
}

// How confidently one written name refers to the same team as another: 0 none, 0.5 a shared distinctive word, 1 the same words.
export function nameScore(sideName: string, teamName: string) {
  const a = tokens(sideName);
  const b = tokens(teamName);
  if (!a.length || !b.length) return 0;
  if (a.every(token => b.includes(token)) || b.every(token => a.includes(token))) return 1;
  // "Los Angeles L" for "Los Angeles Lakers": same leading words, last word abbreviated.
  if (a.length <= b.length && a.every((token, index) =>
    index === a.length - 1 ? b[index]!.startsWith(token) : b[index] === token)) return 1;
  // "Ga. Tech" for "Georgia Tech", "Tenn. State" for "Tennessee State": word for word, some words shortened.
  if (a.length === b.length && a.length > 1) {
    const exact = a.filter((token, index) => token === b[index]).length;
    const short = a.every((token, index) => token === b[index] || abbreviates(token, b[index]!) || abbreviates(b[index]!, token));
    if (short && exact >= 1) return 1;
  }
  const distinctive = (token: string) => token.length >= 4 && !GENERIC.has(token);
  const shared = a.some(token => distinctive(token) && b.some(other =>
    distinctive(other) && (token === other || token.startsWith(other) || other.startsWith(token))));
  return shared ? 0.5 : 0;
}

function sideScore(side: KalshiSide, candidate: PolymarketTeam) {
  if (candidate.names.includes(side.name)) return 3;
  const byName = Math.max(...candidate.names.map(name => nameScore(side.name, name)));
  const byCode = side.abbreviation.length >= 2 && side.abbreviation === candidate.abbreviation ? 2 : 0;
  return Math.max(byName, byCode);
}

const isDraw = (market: { ticker: string; subtitle: string; title: string }) =>
  /^(tie|draw)\b/i.test(market.subtitle || market.title) || /-TIE$/.test(market.ticker);

type Assignment = { game: PolymarketGame; rank: number; pairs: { ticker: string; team?: PolymarketTeam; outcome?: PolymarketOutcome }[] };

const dayOf = (date: string) => Date.parse(`${date}T12:00:00Z`) / (24 * HOUR);

function candidateMatch(game: SportsGame, source: PolymarketGame[]): Assignment | undefined {
  const event = game.events.find(item => LEAGUES_BY_SERIES[item.seriesTicker]);
  if (!event || !game.gameDate) return undefined;
  const leagues = LEAGUES_BY_SERIES[event.seriesTicker]!;
  // Kalshi dates tennis, fights and esports by local day, which can sit one day either side of the Eastern day.
  const slack = TENNIS_TOUR.has(event.seriesTicker) ? 3 : LOOSE_DAY.has(event.seriesTicker) ? 1 : 0;
  const draws = event.markets.filter(isDraw);
  const sides: KalshiSide[] = event.markets.filter(market => !isDraw(market)).map(market => ({
    ticker: market.ticker, name: normalizeTeamName(market.subtitle || market.title),
    abbreviation: (market.ticker.split("-").pop() ?? "").toLowerCase(),
  }));
  if (sides.length !== 2 || draws.length > 1 || !sides[0]!.name || !sides[1]!.name) return undefined;

  const found: Assignment[] = [];
  for (const candidate of source) {
    if (!leagues.includes(candidate.league)) continue;
    const apart = Math.abs(dayOf(candidate.gameDate) - dayOf(game.gameDate));
    if (apart > slack) continue;
    const [first, second] = candidate.teams as [PolymarketTeam, PolymarketTeam];
    const score = (a: PolymarketTeam, b: PolymarketTeam) => {
      const one = sideScore(sides[0]!, a);
      const two = sideScore(sides[1]!, b);
      return one > 0 && two > 0 ? one + two : 0;
    };
    const straight = score(first, second);
    const swapped = score(second, first);
    // Both teams must agree, and one way round must fit clearly better than the other.
    if (straight === swapped) continue;
    const order = straight > swapped ? [first, second] : [second, first];
    const pairs: Assignment["pairs"] = sides.map((side, index) => ({
      ticker: side.ticker, team: order[index]!, outcome: candidate.outcomes.find(item => item.team?.id === order[index]!.id),
    }));
    if (draws[0]) pairs.push({ ticker: draws[0].ticker, outcome: candidate.outcomes.find(item => !item.team) });
    found.push({ game: candidate, pairs, rank: Math.max(straight, swapped) - apart * 10 });
  }
  if (found.length <= 1) return found[0];
  // Several candidates: the nearest day and the closest names win, but only when one stands alone.
  const top = Math.max(...found.map(item => item.rank));
  const best = found.filter(item => item.rank === top);
  if (best.length === 1) return best[0];
  // Same teams twice in a day: only a published Kalshi start time can tell the games apart.
  const start = Date.parse(game.startTime ?? "");
  if (!Number.isFinite(start)) return undefined;
  const near = best.filter(item => Math.abs(Date.parse(item.game.startTime) - start) <= 1.5 * HOUR);
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
    // Every matched side is listed; a side without a usable price simply carries no chance.
    const outcomes = match.pairs.map(pair => ({
      marketTicker: pair.ticker,
      ...(pair.outcome?.chance === undefined ? {} : { chance: pair.outcome.chance }),
      ...(pair.outcome?.ask === undefined ? {} : { ask: pair.outcome.ask }),
      ...(pair.team?.score ? { score: pair.team.score } : {}),
      ...(pair.team?.color ? { color: pair.team.color } : {}),
    }));
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

// Kalshi chance from its own order book: the midpoint, only when buy and sell prices sit close together.
function kalshiMid(market: { yesAsk: number; noAsk: number }) {
  const bid = 100 - market.noAsk;
  if (!(market.yesAsk > 0 && market.yesAsk < 100 && bid > 0 && bid < 100)) return undefined;
  const spread = market.yesAsk - bid;
  return spread >= 0 && spread <= MAX_SPREAD * 100 + 1e-9 ? (market.yesAsk + bid) / 2 : undefined;
}

// How far apart the two exchanges are on a matched winner market. Both must have a reliable two-sided price.
export function attachPriceGap(game: SportsGame): SportsGame {
  if (!game.polymarket) return game;
  const markets = game.events.flatMap(event => event.markets);
  let best: NonNullable<SportsGame["priceGap"]> | undefined;
  for (const outcome of game.polymarket.outcomes) {
    const market = markets.find(item => item.ticker === outcome.marketTicker);
    const kalshi = market ? kalshiMid(market) : undefined;
    if (!market || kalshi === undefined || outcome.chance === undefined) continue;
    const diff = outcome.chance - kalshi;
    // Report the side Polymarket rates higher, so both numbers read the same way on every row.
    if (!best || Math.abs(diff) > best.points + 1e-9 || (Math.abs(Math.abs(diff) - best.points) < 1e-9 && diff > 0)) {
      best = { marketTicker: market.ticker, name: market.subtitle || market.title, kalshi: tenth(kalshi), polymarket: outcome.chance, points: tenth(Math.abs(diff)) };
    }
  }
  return best ? { ...game, priceGap: best } : game;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const records = new Map<string, PolymarketGame>();
const TIERS = [
  // Games in progress or about to start, the week ahead, and games listed further out.
  { name: "hot", from: -6, to: 3, ttl: HOT_TTL, at: 0 },
  { name: "week", from: -6, to: 7 * 24, ttl: FULL_TTL, at: 0 },
  { name: "far", from: 7 * 24, to: 45 * 24, ttl: FAR_TTL, at: 0 },
];
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

async function refresh(tier: typeof TIERS[number]) {
  const now = Date.now();
  const from = new Date(now + tier.from * HOUR).toISOString();
  const to = new Date(now + tier.to * HOUR).toISOString();
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
  // Games inside the refreshed window that were not returned have closed.
  for (const [slug, game] of records) {
    const start = Date.parse(game.startTime);
    if (start >= Date.parse(from) && start <= Date.parse(to)) records.delete(slug);
  }
  for (const [slug, game] of seen) records.set(slug, game);
  tier.at = now;
  // The week pass covers the hot window too.
  if (tier.name === "week") TIERS[0]!.at = now;
}

// Never blocks a request: returns what is cached and refreshes in the background when due.
export function getPolymarketGames(): PolymarketGame[] {
  const now = Date.now();
  const [hot, week, far] = TIERS as [typeof TIERS[number], typeof TIERS[number], typeof TIERS[number]];
  const due = [week, far, hot].find(tier => now - tier.at >= tier.ttl);
  if (!pending && due && now >= retryAfter) {
    retryAfter = now + 30_000;
    pending = refresh(due)
      .catch(err => { logger.warn({ err, tier: due.name }, "Polymarket US refresh failed; keeping the last prices"); })
      .finally(() => { pending = undefined; });
  }
  return [...records.values()].filter(game => now - game.fetchedAt < STALE_AFTER);
}
