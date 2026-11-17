import { test } from "node:test";
import assert from "node:assert/strict";
import type { PredictionEvent } from "./kalshi";
import { gameSchedule, groupSportsGames, marketVariant, matchupTitle, selectMainMarketEvents, summarizeSportsGame } from "./sports-games";

const event = (ticker: string, title: string, volume24h = 0, league = "NBA"): PredictionEvent => ({
  ticker,
  seriesTicker: ticker.split("-")[0] ?? ticker,
  title,
  subtitle: "NYK vs TOR (Nov 17)",
  category: "Sports",
  categories: ["Sports"],
  sport: "Basketball",
  league,
  volume: volume24h * 2,
  volume24h,
  closeTime: "2026-11-20T00:30:00Z",
  url: `https://kalshi.com/markets/example/${ticker.toLowerCase()}`,
  markets: [{
    ticker: `${ticker}-YES`,
    title: `${title} outcome`,
    subtitle: "Outcome",
    probability: 50,
    yesAsk: 51,
    noAsk: 49,
    volume: 10,
    volume24h: 5,
    change: 0,
    status: "active",
    closeTime: "2026-11-20T00:30:00Z",
    rules: "",
    url: `https://kalshi.com/markets/example/${ticker.toLowerCase()}`,
  }],
});

test("limits football and basketball feeds to one primary winner, spread, and total", () => {
  const spreadBase = event("KXNBASPREAD-1", "New York vs Toronto: Spread", 7);
  const spread = {
    ...spreadBase,
    markets: [
      { ...spreadBase.markets[0]!, ticker: "ALT-SPREAD", title: "New York wins by over 2.5 points", volume: 20, volume24h: 10 },
      { ...spreadBase.markets[0]!, ticker: "MAIN-SPREAD", title: "New York wins by over 3.5 points", volume: 100, volume24h: 50 },
    ],
    volume: 120,
    volume24h: 60,
  };
  const preciseBase = event("KXNBATOTALPRECISE-1", "New York vs Toronto: Total Points", 1);
  const preciseTotal = {
    ...preciseBase,
    markets: [{ ...preciseBase.markets[0]!, ticker: "PRECISE-TOTAL", volume: 1, volume24h: 1 }],
    volume: 1,
    volume24h: 1,
  };
  const events = [
    event("KXNBAGAME-1", "New York vs Toronto", 10),
    spread,
    event("KXNBATOTAL-1", "New York vs Toronto: Point Total", 4),
    preciseTotal,
    event("KXNBA1HSPREAD-1", "New York vs Toronto: 1st Half Spread", 2),
    event("KXNBAPROP-1", "New York vs Toronto: Threes", 1),
    event("KXNBAFUTURE-1", "NBA Championship Winner", 100),
    { ...event("KXNBASPREAD-BLANK", "Boston vs Miami: Spread", 6, "NBA"), sport: "" },
    { ...event("KXNHLPROP-1", "Toronto vs Boston: Shots", 8, "NHL"), sport: "Hockey" },
  ];
  const selected = selectMainMarketEvents(events);
  assert.deepEqual(selected.filter(item => item.sport === "Basketball").map(item => item.ticker), [
    "KXNBAGAME-1", "KXNBASPREAD-1", "KXNBATOTAL-1",
  ]);
  assert.equal(selected.find(item => item.ticker === "KXNBASPREAD-BLANK")?.league, "NBA");
  assert.equal(selected.some(item => item.ticker === "KXNBAFUTURE-1"), false);
  assert.equal(selected.find(item => item.ticker === "KXNBASPREAD-1")?.markets[0]?.ticker, "MAIN-SPREAD");
  const game = groupSportsGames(selected).find(item => item.title === "New York vs Toronto");
  assert.equal(game?.eventCount, 3);
  assert.equal(game?.marketCount, 3);
  assert.deepEqual(game?.events.map(item => marketVariant(item)), ["Winner", "Spread", "Point Total"]);
});

test("groups related winner, spread, total and prop events by matchup", () => {
  const games = groupSportsGames([
    event("KXNBA1HSPREAD-1", "New York vs Toronto: 1st Half Spread", 2),
    event("KXNBAGAME-1", "New York vs Toronto", 10),
    event("KXNBASPREAD-1", "New York vs Toronto: Spread", 7),
    event("KXNBATOTAL-1", "New York vs Toronto: Total Points", 4),
    event("KXNBAPROP-1", "New York vs Toronto: Threes", 1),
    event("KXNBAGAME-2", "Boston vs Miami", 20),
  ]);

  assert.equal(games.length, 2);
  const game = games.find(item => item.title === "New York vs Toronto");
  assert.ok(game);
  assert.equal(game.eventCount, 5);
  assert.equal(game.marketCount, 5);
  assert.equal(game.volume24h, 24);
  assert.deepEqual(game.events.slice(0, 3).map(item => marketVariant(item)), ["Winner", "Spread", "Total Points"]);
  assert.equal(game.events[0]?.ticker, "KXNBAGAME-1");
});

test("keeps a matchup together when one source event lacks league metadata", () => {
  const winner = event("KXNBAGAME-1", "New York vs Toronto", 10, "NBA");
  const spread = event("KXNBASPREAD-1", "New York vs Toronto: Spread", 7, "");
  const games = groupSportsGames([spread, winner]);
  assert.equal(games.length, 1);
  assert.equal(games[0]?.league, "NBA");
  assert.equal(games[0]?.eventCount, 2);
});

test("uses source matchup copy and keeps differently dated repeat matchups separate", () => {
  assert.equal(matchupTitle("Eastern Michigan vs Western Michigan: 1st Half Spread"), "Eastern Michigan vs Western Michigan");
  const first = event("GAME-1", "A vs B");
  const second = { ...event("GAME-2", "A vs B"), subtitle: "A vs B (Nov 18)" };
  assert.equal(groupSportsGames([first, second]).length, 2);
});

test("summarizes list games without changing grouped source counts", () => {
  const winner = event("KXNBAGAME-1", "New York vs Toronto", 10);
  const spread = event("KXNBASPREAD-1", "New York vs Toronto: Spread", 7);
  const total = event("KXNBATOTAL-1", "New York vs Toronto: Total Points", 4);
  const prop = event("KXNBA1HSPREAD-1", "New York vs Toronto: 1st Half Spread", 2);
  const game = groupSportsGames([prop, winner, spread, total])[0]!;
  const expanded = {
    ...game,
    events: game.events.map((item) => ({
      ...item,
      teams: [{ name: "New York", abbreviation: "NYK", logo: "https://example.com/nyk.png" }],
      markets: Array.from({ length: 5 }, (_, index) => ({
        ...item.markets[0]!,
        ticker: `${item.ticker}-${index}`,
        probability: index * 10,
        rules: `Detailed settlement rules ${index}. `.repeat(20),
      })),
    })),
  };
  const summarized = summarizeSportsGame(expanded);
  assert.equal(summarized.eventCount, game.eventCount);
  assert.equal(summarized.marketCount, game.marketCount);
  assert.deepEqual(summarized.events.map(item => marketVariant(item)), ["Winner", "Spread", "Total Points"]);
  assert.equal(summarized.events.length, 3);
  assert.equal(summarized.events[0]?.markets.length, 3);
  assert.equal(summarized.events[0]?.markets[0]?.ticker, "KXNBAGAME-1-4");
  assert.equal(summarized.events[0]?.markets[0]?.rules, "");
  assert.equal(summarized.events.some(item => item.ticker === "KXNBA1HSPREAD-1"), false);
  assert.equal(summarized.events.some(item => item.teams), false);
});

test("reads the scheduled game day and Eastern start time from Kalshi tickers", () => {
  assert.deepEqual(gameSchedule("KXNCAAMBGAME-26NOV17FLAND"), { gameDate: "2026-11-17" });
  assert.deepEqual(gameSchedule("KXNBBGAME-26NOV171730BOTUNIF"), { gameDate: "2026-11-17", startTime: "2026-11-17T22:30:00.000Z" });
  // Daylight time: 7:05 PM Eastern in July is 23:05 UTC.
  assert.deepEqual(gameSchedule("KXMLBGAME-26JUL041905NYYBOS"), { gameDate: "2026-07-04", startTime: "2026-07-04T23:05:00.000Z" });
  assert.equal(gameSchedule("KXNBA-27"), undefined);
  const [game] = groupSportsGames([event("KXNBAGAME-26NOV17NYKTOR", "New York vs Toronto")]);
  assert.equal(game?.gameDate, "2026-11-17");
});
