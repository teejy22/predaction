import { test } from "node:test";
import assert from "node:assert/strict";
import type { PredictionEvent } from "./kalshi";
import { groupSportsGames, marketVariant, matchupTitle } from "./sports-games";

const event = (ticker: string, title: string, volume24h = 0): PredictionEvent => ({
  ticker,
  seriesTicker: ticker.split("-")[0] ?? ticker,
  title,
  subtitle: "NYK vs TOR (Nov 17)",
  category: "Sports",
  categories: ["Sports"],
  sport: "Basketball",
  league: "NBA",
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

test("uses source matchup copy and keeps differently dated repeat matchups separate", () => {
  assert.equal(matchupTitle("Eastern Michigan vs Western Michigan: 1st Half Spread"), "Eastern Michigan vs Western Michigan");
  const first = event("GAME-1", "A vs B");
  const second = { ...event("GAME-2", "A vs B"), subtitle: "A vs B (Nov 18)" };
  assert.equal(groupSportsGames([first, second]).length, 2);
});
