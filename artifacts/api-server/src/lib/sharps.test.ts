import test from "node:test";
import assert from "node:assert/strict";
import type { SportsGame } from "@workspace/api-zod";
import { attachSharps, normalizePosition, type RawPosition, type SharpBet } from "./sharps";

const W1 = "0x" + "a".repeat(40), W2 = "0x" + "b".repeat(40);
const raw = (over: Partial<RawPosition>): RawPosition => ({
  status: "OPEN", redeemable: false, event_slug: "nfl-cin-was-2026-11-24", slug: "nfl-cin-was-2026-11-24",
  title: "Bengals vs. Commanders", outcome: "Bengals", opposite_outcome: "Commanders",
  current_size: 1000, avg_price: 0.7, current_value: 720, ...over,
});
const market = (ticker: string, subtitle: string) => ({ ticker, title: `${subtitle} wins`, subtitle, probability: 50, yesAsk: 50, noAsk: 51, volume: 0, rules: "", url: "" });
const game = (over: Partial<SportsGame> = {}): SportsGame => ({
  key: "k".repeat(16), title: "Cincinnati vs Washington", subtitle: "", category: "Sports", categories: ["Sports"],
  sport: "Football", league: "NFL", volume: 0, volume24h: 0, closeTime: "", url: "", gameDate: "2026-11-23",
  eventCount: 1, marketCount: 2,
  teams: [{ name: "Cincinnati Bengals", abbreviation: "CIN", logo: "https://a.espncdn.com/c.png" }, { name: "Washington Commanders", abbreviation: "WSH", logo: "https://a.espncdn.com/w.png" }],
  events: [{
    ticker: "KXNFLGAME-26NOV23CINWAS", seriesTicker: "KXNFLGAME", title: "Cincinnati vs Washington", subtitle: "", category: "Sports",
    categories: ["Sports"], sport: "Football", league: "NFL", volume: 0, volume24h: 0, closeTime: "", url: "",
    markets: [market("KXNFLGAME-26NOV23CINWAS-CIN", "Cincinnati"), market("KXNFLGAME-26NOV23CINWAS-WAS", "Washington")],
  }],
  ...over,
} as SportsGame);
const meta = { tracked: 50, updatedAt: "2026-11-23T18:00:00.000Z" };
const bets = (...items: [RawPosition, string, number][]) => items.flatMap(([r, w, n]) => normalizePosition(r, w, n) ?? []) as SharpBet[];

test("reads winner, spread and total positions", () => {
  assert.equal(normalizePosition(raw({}), W1, 1)?.label, "Bengals to win");
  const dog = normalizePosition(raw({ slug: "nfl-cin-was-2026-11-24-spread-away-6pt5", title: "Spread: Bengals (-6.5)", outcome: "Commanders", opposite_outcome: "Bengals" }), W1, 1);
  assert.equal(dog?.label, "Commanders +6.5");
  assert.deepEqual(dog?.teams, ["bengals", "commanders"]);
  assert.equal(normalizePosition(raw({ slug: "nfl-cin-was-2026-11-24-total-54pt5", title: "Bengals vs. Commanders: O/U 54.5", outcome: "Under", opposite_outcome: "Over" }), W1, 1)?.label, "Under 54.5");
});

test("ignores settled, dust, partial-game and non-game positions", () => {
  assert.equal(normalizePosition(raw({ status: "REDEEMABLE", redeemable: true }), W1, 1), undefined);
  assert.equal(normalizePosition(raw({ current_value: 1 }), W1, 1), undefined);
  assert.equal(normalizePosition(raw({ slug: "nfl-cin-was-2026-11-24-1h-moneyline" }), W1, 1), undefined);
  assert.equal(normalizePosition(raw({ event_slug: "nfl-team-to-make-postseason", slug: "will-x" }), W1, 1), undefined);
});

test("attaches positions to the same game and totals them per bet", () => {
  const spread = { slug: "nfl-cin-was-2026-11-24-spread-away-6pt5", title: "Spread: Bengals (-6.5)" };
  const out = attachSharps(game(), bets([raw({}), W1, 3], [raw({ current_value: 280, avg_price: 0.5 }), W2, 9], [raw({ ...spread, outcome: "Commanders", opposite_outcome: "Bengals", current_value: 100 }), W2, 9]), meta);
  assert.equal(out.sharps?.wallets, 2);
  assert.equal(out.sharps?.value, 1100);
  assert.deepEqual(out.sharps?.bets.map(b => [b.label, b.wallets, b.value, b.marketTicker, b.topRank]), [
    ["Bengals to win", 2, 1000, "KXNFLGAME-26NOV23CINWAS-CIN", 3],
    ["Commanders +6.5", 1, 100, "KXNFLGAME-26NOV23CINWAS-WAS", 9],
  ]);
  assert.equal(out.sharps?.bets[0]!.avgPrice, 60);
});

test("leaves other days, other leagues and other teams alone", () => {
  assert.equal(attachSharps(game({ gameDate: "2026-11-30" }), bets([raw({}), W1, 1]), meta).sharps, undefined);
  assert.equal(attachSharps(game(), bets([raw({ event_slug: "cfb-cin-was-2026-11-24", slug: "cfb-cin-was-2026-11-24" }), W1, 1]), meta).sharps, undefined);
  const other = raw({ event_slug: "nfl-gb-lar-2026-11-24", slug: "nfl-gb-lar-2026-11-24", title: "Packers vs. Rams", outcome: "Packers", opposite_outcome: "Rams" });
  assert.equal(attachSharps(game(), bets([other, W1, 1]), meta).sharps, undefined);
  assert.equal(attachSharps(game(), [], meta).sharps, undefined);
});

test("matches by team nickname when the short codes differ", () => {
  const jax = raw({ event_slug: "nfl-jax-was-2026-11-23", slug: "nfl-jax-was-2026-11-23", title: "Jaguars vs. Commanders", outcome: "Jaguars", opposite_outcome: "Commanders" });
  const g = game({
    teams: [{ name: "Jacksonville Jaguars", abbreviation: "JAX", logo: "https://a.espncdn.com/j.png" }, { name: "Washington Commanders", abbreviation: "WSH", logo: "https://a.espncdn.com/w.png" }],
    events: [{ ...game().events[0]!, markets: [market("KXNFLGAME-26NOV23JACWAS-JAC", "Jacksonville"), market("KXNFLGAME-26NOV23JACWAS-WAS", "Washington")] }],
  } as Partial<SportsGame>);
  assert.equal(attachSharps(g, bets([jax, W1, 1]), meta).sharps?.bets[0]!.marketTicker, "KXNFLGAME-26NOV23JACWAS-JAC");
});
