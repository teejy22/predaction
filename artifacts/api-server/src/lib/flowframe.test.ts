import assert from "node:assert/strict";
import { test } from "node:test";
import { createFlowframeClient, normalizeFlowframe } from "./flowframe";

const checked = "2026-11-17T18:00:00Z";
const meta = { fetchedAt: checked };
const mover = {
  ticker: "TEST-YES", eventTicker: "TEST", title: "Test event?", category: "Politics",
  currentPrice: 67, priceChange: 26, kalshiUrl: "https://kalshi.com/events/TEST",
};
const wallet = `0x${"a".repeat(40)}`;
function toolData(url: string) {
  return { data: url.includes("/smart-money/") ? [{
    conditionId: "smart-condition", marketTitle: "Smart money market?", marketPrice: 0.7,
    impliedFairValue: 0.61, edgePct: -9, compositeSkewScore: -23, polymarketUrl: null,
    tiers: {
      sharp: { yesDollars: 200, noDollars: 800, yesCount: 2, noCount: 8, skew: -0.6 },
      profitable: { yesDollars: 400, noDollars: 900, skew: -0.4 },
    },
  }] : url.includes("/leaderboard") ? [{
    rank: 7, wallet, score: 81, realizedPnl: -240, roi: -0.12, winRate: 0.6, realizedCount: 10,
    nflCount: 6, cfbCount: 4, medianStake: 200, lastRealizedAt: null,
  }] : [{
    wallet, walletRank: 7, walletScore: 81, side: "SELL", outcome: "No", title: "Football test?",
    slug: "football-test", eventSlug: "football-event", league: "nfl", price: 0.13, usdSize: 900,
    timestamp: Date.parse(checked), unusual: true, usualMultiple: 4.5,
  }], meta: { ...meta, backfillDone: false, refreshedAt: Date.parse(checked), clamped: true, effectiveLimit: 5 } };
}
function data(url: string) {
  return { data: url.includes("/movers/polymarket") ? [
    { conditionId: "condition-1", marketTitle: "Polymarket test?", currentPrice: 0.62, deltaPct: -17, polymarketUrl: "https://polymarket.com/event/test" },
  ] : url.includes("/trades/") ? [
    { wallet: "0x123", conditionId: "condition-1", marketTitle: "Trade test?", side: "BUY", outcome: "No", price: 0.32, size: 10000, usdcSize: 3200, timestamp: checked, transactionHash: "0xabc", polymarketProfileUrl: "https://polymarket.com/profile/0x123", polymarketMarketUrl: null },
  ] : url.includes("/movers/") ? [mover] : url.includes("/trending") ? [
    { ticker: "TREND-YES", title: "Trending?", yesPrice: 0.18, category: "Economics", kalshiUrl: "https://kalshi.com/events/TREND" },
  ] : [
    { id: "pulse-id", subject: "Published update", publishedAt: checked, permalink: "https://flowframe.xyz/pulse/published" },
  ], meta };
}

test("normalizes cents versus fractions and preserves publication date", () => {
  assert.equal(normalizeFlowframe("movers", data("/movers/"), checked).items[0]?.probability, 67);
  assert.equal(normalizeFlowframe("movers", data("/movers/"), checked).items[0]?.change, 26);
  assert.equal(normalizeFlowframe("trending", data("/trending"), checked).items[0]?.probability, 18);
  assert.equal(normalizeFlowframe("pulse", data("/pulse"), checked).items[0]?.publishedAt, checked);
});

test("rejects malformed response, invalid price and unsafe links", () => {
  assert.throws(() => normalizeFlowframe("movers", { data: {}, meta }, checked));
  assert.throws(() => normalizeFlowframe("movers", { data: [{ ...mover, currentPrice: 160 }], meta }, checked));
  assert.throws(() => normalizeFlowframe("movers", { data: [{ ...mover, kalshiUrl: "javascript:alert(1)" }], meta }, checked));
});

test("deduplicates visitors, caches successes, and retries transient failures quickly", async () => {
  let time = Date.parse(checked);
  let calls = 0;
  let down = false;
  const client = createFlowframeClient({
    now: () => time, getKey: () => "test-credential",
    fetchImpl: (async (input: Parameters<typeof fetch>[0]) => {
      calls++;
      return down ? new Response("", { status: 503 }) : Response.json(data(String(input)));
    }) as typeof fetch,
  });
  await Promise.all(Array.from({ length: 10 }, () => client.insights()));
  assert.equal(calls, 5);
  await client.insights();
  assert.equal(calls, 5);
  time += 1_200_001;
  down = true;
  const stale = await client.insights();
  assert.equal(calls, 10);
  assert.equal(stale.movers.status, "stale");
  assert.equal(stale.movers.items.length, 1);
  assert.equal(stale.movers.fetchedAt, checked);
  await client.insights();
  assert.equal(calls, 10);
  time += 60_001;
  down = false;
  const recovered = await client.insights();
  assert.equal(calls, 15);
  assert.equal(recovered.movers.status, "ready");
});

test("missing configuration makes no provider calls", async () => {
  const client = createFlowframeClient({
    getKey: () => undefined,
    fetchImpl: (async () => { throw new Error("Must not call"); }) as typeof fetch,
  });
  const result = await client.insights();
  assert.equal(result.movers.status, "unconfigured");
  assert.equal(result.trending.status, "unconfigured");
  assert.equal(result.pulse.status, "unconfigured");
  assert.equal(result.polymarketMovers.status, "unconfigured");
  assert.equal(result.trades.status, "unconfigured");
});

test("rate limits stop refetches until provider cooldown expires", async () => {
  let time = Date.parse(checked);
  let calls = 0;
  const client = createFlowframeClient({
    now: () => time, getKey: () => "test-credential",
    fetchImpl: (async () => {
      calls++;
      return new Response("", { status: 429, headers: { "Retry-After": "3600" } });
    }) as typeof fetch,
  });
  const limited = await client.insights();
  assert.equal(limited.movers.status, "unavailable");
  assert.equal(calls, 5);
  time += 11 * 60_000;
  await client.insights();
  assert.equal(calls, 5);
});

test("successful and failed calls share a bounded hourly provider budget", async () => {
  let time = Date.parse(checked);
  let calls = 0;
  const client = createFlowframeClient({
    now: () => time, getKey: () => "test-credential",
    fetchImpl: (async (input: Parameters<typeof fetch>[0]) => {
      calls++;
      return Response.json(data(String(input)));
    }) as typeof fetch,
  });
  for (let i = 0; i < 4; i++) {
    await client.insights();
    time += 1_200_001;
  }
  // Four checks span the next rolling hour; five feeds consume 15 calls/hour.
  assert.equal(calls, 20);
});

test("Polymarket normalization preserves rolling-window points and trade execution units", () => {
  const poly = normalizeFlowframe("polymarketMovers", data("/movers/polymarket"), checked);
  assert.equal(poly.items[0]?.probability, 62);
  assert.equal(poly.items[0]?.change, -17);
  const trade = normalizeFlowframe("trades", data("/trades/"), checked).items[0]!;
  assert.equal(trade.probability, 32);
  assert.equal(trade.outcome, "No");
  assert.equal(trade.shares, 10000);
  assert.equal(trade.usdcSize, 3200);
  assert.equal(trade.url, "");
  assert.equal(trade.side, "BUY");
});

test("nullable source identities are explicit and do not invent Polymarket links", () => {
  const feed = normalizeFlowframe("polymarketMovers", { data: [
    { conditionId: null, marketTitle: null },
    { conditionId: "condition", marketTitle: "Identified?", currentPrice: 0.3, deltaPct: 2, polymarketUrl: null },
  ], meta }, checked);
  assert.equal(feed.items.length, 1);
  assert.equal(feed.items[0]?.url, "");
  assert.match(feed.message, /1 source rows omitted/);
});

test("one provider feed can fail without hiding other successful feeds", async () => {
  const client = createFlowframeClient({
    getKey: () => "test-credential",
    fetchImpl: (async (input: Parameters<typeof fetch>[0]) => String(input).includes("/trades/")
      ? new Response("", { status: 403 }) : Response.json(data(String(input)))) as typeof fetch,
  });
  const result = await client.insights();
  assert.equal(result.trades.status, "unavailable");
  assert.equal(result.polymarketMovers.status, "ready");
  assert.equal(result.movers.status, "ready");
  assert.match(result.trades.message, /configured account/);
});

test("smart-money estimates, signed edge and cohort exposures retain distinct units", () => {
  const feed = normalizeFlowframe("smartMoney", toolData("/smart-money/"), checked);
  const row = feed.items[0]!;
  assert.equal(row.probability, 70);
  assert.equal(row.fairValue, 61);
  assert.equal(row.edge, -9);
  assert.equal(row.change, undefined);
  assert.equal(row.skewScore, -23);
  assert.equal(row.tiers?.sharp?.noDollars, 800);
  assert.equal(row.tiers?.sharp?.noCount, 8);
  assert.equal(row.tiers?.profitable?.yesCount, undefined);
  assert.equal(row.tiers?.profitable?.noDollars, 900);
  assert.equal(row.url, "");
  assert.equal(feed.clamped, true);
  assert.equal(feed.effectiveLimit, 5);
});

test("football ranks and realized results preserve losses and partial source metadata", () => {
  const feed = normalizeFlowframe("footballLeaderboard", toolData("/leaderboard"), checked);
  const row = feed.items[0]!;
  assert.equal(row.rank, 7);
  assert.equal(row.realizedPnl, -240);
  assert.equal(row.roi, -12);
  assert.equal(row.winRate, 60);
  assert.equal(row.realizedCount, 10);
  assert.equal(row.publishedAt, undefined);
  assert.equal(row.url, `https://polymarket.com/profile/${wallet}?r=flowframe`);
  assert.equal(feed.backfillDone, false);
  assert.equal(feed.sourceUpdatedAt, new Date(checked).toISOString());
});

test("football trades use Unix milliseconds, execution price and source unusual flags", () => {
  const row = normalizeFlowframe("footballTrades", toolData("/feed"), checked).items[0]!;
  assert.equal(row.publishedAt, new Date(checked).toISOString());
  assert.equal(row.side, "SELL");
  assert.equal(row.probability, 13);
  assert.equal(row.usdcSize, 900);
  assert.equal(row.shares, undefined);
  assert.equal(row.unusual, true);
  assert.equal(row.usualMultiple, 4.5);
  assert.equal(row.rank, 7);
  assert.equal(row.league, "nfl");
  assert.equal(row.url, "https://polymarket.com/market/football-test?r=flowframe");
  const raw = toolData("/feed");
  Object.assign(raw.data[0]!, { unusual: false, usualMultiple: null, slug: "" });
  const noLink = normalizeFlowframe("footballTrades", raw, checked).items[0]!;
  assert.equal(noLink.unusual, false);
  assert.equal(noLink.usualMultiple, undefined);
  assert.equal(noLink.url, "");
});

test("tool links, ranks and counts reject invalid source values", () => {
  for (const invalid of [{ slug: "../login" }, { wallet: "not-a-wallet" }, { walletRank: -1 }, { usdSize: -100 }]) {
    const raw = toolData("/feed");
    Object.assign(raw.data[0]!, invalid);
    assert.throws(() => normalizeFlowframe("footballTrades", raw, checked));
  }
  const raw = toolData("/smart-money/");
  Object.assign(raw.data[0]!, { polymarketUrl: "https://polymarket.com.attacker.test/fake" });
  assert.throws(() => normalizeFlowframe("smartMoney", raw, checked));
});

test("on-demand tools share the global budget but retain hourly cache and independent access errors", async () => {
  let time = Date.parse(checked);
  let calls = 0;
  let deny = false;
  const client = createFlowframeClient({
    now: () => time, getKey: () => "test-credential",
    fetchImpl: (async (input: Parameters<typeof fetch>[0]) => {
      calls++;
      const url = String(input);
      if (deny && url.includes("/smart-money/")) return new Response("", { status: 403 });
      return Response.json(url.includes("/smart-money/") || url.includes("/football-sharps/") ? toolData(url) : data(url));
    }) as typeof fetch,
  });
  await client.insights();
  assert.equal(calls, 5); // Tools aren't fetched by homepage visits.
  const concurrent = await Promise.all(Array.from({ length: 8 }, () => client.tools()));
  assert.equal(calls, 8);
  assert.equal(concurrent[0]?.smartMoney.status, "ready");
  assert.equal(concurrent[0]?.refreshMinutes, 60);
  for (let i = 0; i < 2; i++) {
    time += 1_200_001;
    await Promise.all([client.insights(), client.tools()]);
  }
  assert.equal(calls, 18); // Fifteen discovery calls + three tools in the first hour.
  time += 1_200_001;
  deny = true;
  const result = await client.tools();
  assert.equal(calls, 21);
  assert.equal(result.smartMoney.status, "stale");
  assert.match(result.smartMoney.message, /configured account/);
  assert.equal(result.footballLeaderboard.status, "ready");
  assert.equal(result.footballTrades.status, "ready");
  await client.tools();
  assert.equal(calls, 21);
});

test("Polymarket mover direction comes from the start and end prices, not the provider's signed delta", () => {
  const feed = normalizeFlowframe("polymarketMovers", { data: [
    { conditionId: "fell", marketTitle: "Fell?", currentPrice: 0.118, priceFrom: 0.964, priceTo: 0.118, deltaPct: 84.6, polymarketUrl: null },
    { conditionId: "rose", marketTitle: "Rose?", currentPrice: 0.735, priceFrom: 0.66, priceTo: 0.735, deltaPct: -7.5, polymarketUrl: null },
  ], meta }, checked);
  assert.deepEqual(feed.items.map(item => item.change), [-84.6, 7.5]);
});
