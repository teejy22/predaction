import assert from "node:assert/strict";
import { test } from "node:test";
import { createFlowframeClient, normalizeFlowframe } from "./flowframe";

const checked = "2026-11-17T18:00:00Z";
const meta = { fetchedAt: checked };
const mover = {
  ticker: "TEST-YES", eventTicker: "TEST", title: "Test event?", category: "Politics",
  currentPrice: 67, priceChange: 26, kalshiUrl: "https://kalshi.com/events/TEST",
};
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

test("deduplicates visitors, caches twenty minutes, and retains stale results on failure", async () => {
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
