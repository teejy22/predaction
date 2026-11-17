import { test } from "node:test";
import assert from "node:assert/strict";
import { applyEventVisuals, getEvent, getSnapshot, normalize, type RawEvent } from "./kalshi";

const raw = (ticker = "ECON-26", category = "Economics"): RawEvent => ({
  event_ticker: ticker, series_ticker: "SERIES", title: "Original API title?",
  sub_title: "Game date stays verbatim — Nov 17", category,
  markets: [{
    ticker: `${ticker}-YES`, title: "Original outcome title", yes_sub_title: "Yes outcome",
    status: "active", last_price_dollars: "0.6350", previous_price_dollars: "0.6100",
    yes_ask_dollars: "0.6500", no_ask_dollars: "0.3700",
    volume_fp: "123.50", volume_24h_fp: "12.25",
    close_time: "2026-12-01T00:00:00Z", created_time: "2026-10-01T00:00:00Z",
    rules_primary: "Official rules",
  }],
});

test("normalization preserves source copy, contract units, close time and reliable classifications", () => {
  const e = normalize(raw(), { ticker: "SERIES", category: "Economics", tags: ["Football", "NFL"] });
  assert.equal(e.title, raw().title);
  assert.equal(e.subtitle, raw().sub_title);
  assert.equal(e.sport, "");
  assert.equal(e.league, "");
  assert.equal(e.markets[0]?.probability, 63.5);
  assert.equal(e.markets[0]?.change, 2.5);
  assert.equal(e.volume, 123.5);
  assert.equal(e.volume24h, 12.25);
  assert.equal(e.closeTime, "2026-12-01T00:00:00Z");
  const sport = normalize(raw("SPORT", "Sports"), { ticker: "SERIES", title: "NFL game winner", category: "Sports", tags: ["Football"] });
  assert.equal(sport.sport, "Football");
  assert.equal(sport.league, "NFL");
  const proSpread = normalize(raw("SPREAD", "Sports"), { ticker: "SPREADSERIES", title: "Pro Football Spread", category: "Sports", tags: ["Football"] });
  assert.equal(proSpread.league, "NFL");
  const collegeSpread = normalize(raw("CFBSPREAD", "Sports"), { ticker: "CFBSPREADSERIES", title: "College Football Spread", category: "Sports", tags: ["Football"] });
  assert.equal(collegeSpread.league, "NCAAF");
  const collegeBasketball = normalize(raw("CBBSPREAD", "Sports"), { ticker: "CBBSPREADSERIES", title: "Men's College Basketball Spread", category: "Sports", tags: ["Basketball"] });
  assert.equal(collegeBasketball.league, "NCAAB");
  const unknown = normalize(raw("SPORT", "Sports"));
  assert.equal(unknown.sport, "");
  assert.equal(unknown.league, "");
  const initialized = raw();
  initialized.markets![0]!.status = "initialized";
  assert.equal(normalize(initialized).markets.length, 0);
  assert.equal(normalize(initialized, undefined, false).markets[0]?.status, "initialized");
});

test("Kalshi metadata attaches official event and market visuals safely", () => {
  const event = normalize(raw());
  const enriched = applyEventVisuals(event, {
    image_url: "https://assets.kalshi.com/series-images-webp/SERIES.webp",
    featured_image_url: "https://assets.kalshi.com/market-images/FEATURED.webp",
    market_details: [{
      market_ticker: "ECON-26-YES",
      image_url: "https://assets.kalshi.com/market-images/ECON-26-YES.png",
      color_code: "#AA00FF",
    }],
  });
  assert.equal(enriched.image, "https://assets.kalshi.com/series-images-webp/SERIES.webp");
  assert.equal(enriched.featuredImage, "https://assets.kalshi.com/market-images/FEATURED.webp");
  assert.equal(enriched.markets[0]?.image, "https://assets.kalshi.com/market-images/ECON-26-YES.png");
  assert.equal(enriched.markets[0]?.color, "#AA00FF");
  const unsafe = applyEventVisuals(event, { image_url: "https://example.com/image.png" });
  assert.equal(unsafe.image, undefined);
});

test("shared index follows cursors, deduplicates, retains saved details and exposes rate-limit failures", async () => {
  const originalFetch = globalThis.fetch;
  const originalNow = Date.now;
  let inFlight = 0;
  let maxInFlight = 0;
  let pages = 0;
  let rateLimit = false;
  globalThis.fetch = async input => {
    inFlight++;
    maxInFlight = Math.max(maxInFlight, inFlight);
    try {
      await new Promise(resolve => setTimeout(resolve, 10));
      const url = new URL(String(input));
      if (url.pathname.endsWith("/series")) return Response.json({ series: [{ ticker: "SERIES", category: "Economics", tags: [] }] });
      if (url.pathname.endsWith("/events")) {
        pages++;
        if (rateLimit) return new Response("", { status: 429, headers: { "retry-after": "0.001" } });
        if (!url.searchParams.has("cursor")) return Response.json({ events: [raw()], cursor: "page-two" });
        assert.equal(url.searchParams.get("cursor"), "page-two");
        return Response.json({ events: [raw(), raw("SPORT-26", "Sports")], cursor: "" });
      }
      const ticker = decodeURIComponent(url.pathname.split("/").at(-1)!);
      const event = raw(ticker);
      event.markets![0]!.status = "settled";
      return Response.json({ event });
    } finally { inFlight--; }
  };
  try {
    const first = await getSnapshot();
    assert.equal(first.indexing, true);
    assert.equal(first.partial, true);
    let complete = first;
    for (let i = 0; i < 30 && complete.indexing; i++) {
      await new Promise(resolve => setTimeout(resolve, 30));
      complete = await getSnapshot();
    }
    assert.equal(complete.partial, false);
    assert.equal(complete.events.length, 2);
    assert.equal(pages, 2);
    await Promise.all(Array.from({ length: 12 }, (_, i) => getEvent(`SAVED-${i}`)));
    assert.ok(maxInFlight <= 4, `request concurrency was ${maxInFlight}`);
    assert.equal((await getEvent("SAVED-0")).markets[0]?.status, "settled");
    rateLimit = true;
    Date.now = () => originalNow() + 301_000;
    const oldTimestamp = complete.updatedAt;
    await getSnapshot();
    for (let i = 0; i < 30; i++) {
      await new Promise(resolve => setTimeout(resolve, 15));
      complete = await getSnapshot();
      if (complete.partial) break;
    }
    assert.equal(complete.partial, true);
    assert.equal(complete.updatedAt, oldTimestamp);
    assert.ok(complete.warnings.some(w => w.includes("rate limit")));
  } finally {
    globalThis.fetch = originalFetch;
    Date.now = originalNow;
  }
});
