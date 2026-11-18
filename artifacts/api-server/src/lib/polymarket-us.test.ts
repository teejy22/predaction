import test from "node:test";
import assert from "node:assert/strict";
import type { SportsGame } from "@workspace/api-zod";
import { attachPolymarket, normalizePolymarketEvent, type PolymarketGame, type RawPolymarketEvent } from "./polymarket-us";

const quote = (value: number) => ({ value: value.toFixed(4) });
const rawTeam = (id: number, name: string, abbreviation: string, league: string) =>
  ({ id, name, abbreviation, league, colorPrimary: "#112233" });

function rawGame(overrides: Partial<RawPolymarketEvent> = {}): RawPolymarketEvent {
  const away = rawTeam(1, "New York Knicks", "ny", "nba");
  const home = rawTeam(2, "Toronto Raptors", "tor", "nba");
  return {
    slug: "nba-ny-tor-2026-11-17", startTime: "2026-11-18T00:30:00Z", live: false, teams: [away, home],
    markets: [{
      sportsMarketType: "basketball_team_full_game_winner", status: "MARKET_STATUS_OPEN",
      bestBidQuote: quote(0.48), bestAskQuote: quote(0.5),
      marketSides: [{ long: true, teamId: 1, team: away }, { long: false, teamId: 2, team: home }],
    }],
    ...overrides,
  };
}

function soccerRaw(): RawPolymarketEvent {
  const a = rawTeam(10, "Al Wasl FC", "alw", "uaepl");
  const b = rawTeam(11, "Hatta SC", "hat", "uaepl");
  const market = (bid: number, ask: number, teamId?: number, team?: typeof a) => ({
    sportsMarketType: "soccer_team_full_time_winner", status: "MARKET_STATUS_OPEN",
    bestBidQuote: quote(bid), bestAskQuote: quote(ask),
    marketSides: [{ long: true, teamId, team }, { long: false, teamId, team }],
  });
  return {
    slug: "uaepl-alw-hat-2026-11-19", startTime: "2026-11-19T12:45:00Z", teams: [a, b],
    markets: [market(0.82, 0.86, 10, a), market(0.08, 0.11), market(0.05, 0.08, 11, b)],
  };
}

function kalshiGame(series: string, date: string, sides: [string, string][], startTime?: string): SportsGame {
  const ticker = `${series}-X${date}`;
  return {
    key: `${series}${date}${sides.map(side => side[1]).join("")}${startTime ?? ""}`, title: "", subtitle: "",
    category: "Sports", categories: ["Sports"], sport: "", league: "", volume: 0, volume24h: 0, closeTime: "",
    url: "", eventCount: 1, marketCount: sides.length, gameDate: date, ...(startTime ? { startTime } : {}), teams: [],
    events: [{
      ticker, seriesTicker: series, title: "", subtitle: "", category: "Sports", categories: ["Sports"],
      sport: "", league: "", volume: 0, volume24h: 0, closeTime: "", url: "",
      markets: sides.map(([subtitle, code]) => ({ ticker: `${ticker}-${code}`, subtitle })),
    }],
  } as unknown as SportsGame;
}

const pm = (raw: RawPolymarketEvent) => normalizePolymarketEvent(raw, Date.parse("2026-11-17T23:00:00Z")) as PolymarketGame;
const chances = (game: SportsGame) => Object.fromEntries(
  (game.polymarket?.outcomes ?? []).map(outcome => [outcome.marketTicker.split("-").pop(), outcome.chance]));

test("normalizes a two-way winner market from the long side's bid and ask", () => {
  const game = pm(rawGame());
  assert.equal(game.league, "nba");
  assert.equal(game.gameDate, "2026-11-17");
  assert.deepEqual(game.outcomes.map(outcome => outcome.chance), [49, 51]);
  assert.equal(game.url, "https://polymarket.us/event/nba-ny-tor-2026-11-17");
});

test("omits prices with a missing side or a wide gap, and skips ended games", () => {
  const market = rawGame().markets![0]!;
  assert.equal(normalizePolymarketEvent(rawGame({ markets: [{ ...market, bestAskQuote: null }] }), 0), undefined);
  assert.equal(normalizePolymarketEvent(rawGame({ markets: [{ ...market, bestBidQuote: quote(0.2), bestAskQuote: quote(0.6) }] }), 0), undefined);
  assert.equal(normalizePolymarketEvent(rawGame({ ended: true }), 0), undefined);
  assert.equal(normalizePolymarketEvent(rawGame({ markets: [{ ...market, sportsMarketType: "basketball_team_spread" }] }), 0), undefined);
});

test("matches by team, not position, when home and away are listed the other way round", () => {
  const [game] = attachPolymarket(
    [kalshiGame("KXNBAGAME", "2026-11-17", [["Toronto", "TOR"], ["New York", "NYK"]])], [pm(rawGame())]);
  assert.deepEqual(chances(game!), { TOR: 51, NYK: 49 });
  assert.equal(game!.startTime, "2026-11-18T00:30:00.000Z");
  assert.equal(game!.polymarket?.live, false);
});

test("does not match the same teams on a different day or in a different league", () => {
  const source = [pm(rawGame())];
  const sides: [string, string][] = [["New York", "NYK"], ["Toronto", "TOR"]];
  const [otherDay, otherLeague, unknownSeries] = attachPolymarket([
    kalshiGame("KXNBAGAME", "2026-11-18", sides), kalshiGame("KXWNBAGAME", "2026-11-17", sides),
    kalshiGame("KXNBASPREAD", "2026-11-17", sides),
  ], source);
  assert.equal(otherDay!.polymarket, undefined);
  assert.equal(otherLeague!.polymarket, undefined);
  assert.equal(unknownSeries!.polymarket, undefined);
});

test("requires both teams to match", () => {
  const [game] = attachPolymarket(
    [kalshiGame("KXNBAGAME", "2026-11-17", [["New York", "NYK"], ["Boston", "BOS"]])], [pm(rawGame())]);
  assert.equal(game!.polymarket, undefined);
  assert.equal(game!.startTime, undefined);
});

test("doubleheaders match only when a Kalshi start time tells the games apart", () => {
  const early = pm(rawGame({ slug: "mlb-a", startTime: "2026-11-17T18:00:00Z" }));
  const late = pm(rawGame({ slug: "mlb-b", startTime: "2026-11-17T23:30:00Z" }));
  const sides: [string, string][] = [["New York", "NYK"], ["Toronto", "TOR"]];
  const [untimed] = attachPolymarket([kalshiGame("KXNBAGAME", "2026-11-17", sides)], [early, late]);
  assert.equal(untimed!.polymarket, undefined);
  const [timed] = attachPolymarket([kalshiGame("KXNBAGAME", "2026-11-17", sides, "2026-11-17T23:35:00.000Z")], [early, late]);
  assert.equal(timed!.polymarket?.url, "https://polymarket.us/event/mlb-b");
  // Two Kalshi games claiming one Polymarket game is ambiguous for both.
  const pair = attachPolymarket([kalshiGame("KXNBAGAME", "2026-11-17", sides), kalshiGame("KXNBAGAME", "2026-11-17", sides, "x")], [late]);
  assert.deepEqual(pair.map(game => game.polymarket), [undefined, undefined]);
});

test("soccer three-way maps each team and the draw to the right Kalshi market", () => {
  const [game] = attachPolymarket(
    [kalshiGame("KXUAEPLGAME", "2026-11-19", [["Hatta", "HAT"], ["Tie", "TIE"], ["Al Wasl", "WAS"]])], [pm(soccerRaw())]);
  assert.deepEqual(chances(game!), { HAT: 6.5, WAS: 84, TIE: 9.5 });
});

test("a side without a usable price is left out rather than shown as zero", () => {
  const raw = soccerRaw();
  raw.markets![1]!.bestAskQuote = null;
  const [game] = attachPolymarket(
    [kalshiGame("KXUAEPLGAME", "2026-11-19", [["Hatta", "HAT"], ["Tie", "TIE"], ["Al Wasl", "WAS"]])], [pm(raw)]);
  assert.deepEqual(chances(game!), { HAT: 6.5, WAS: 84 });
});

test("returns games untouched when the Polymarket feed has nothing", () => {
  const games = [kalshiGame("KXNBAGAME", "2026-11-17", [["New York", "NYK"], ["Toronto", "TOR"]])];
  assert.equal(attachPolymarket(games, []), games);
});
