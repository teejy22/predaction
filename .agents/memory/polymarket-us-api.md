---
name: Polymarket US public API
description: What the keyless polymarket.us gateway offers for market discovery and where it falls short (integrated Nov 2026 for sports winner prices).
---

`https://gateway.polymarket.us` is a keyless, read-only API (events, markets, series, sports, search, order book/BBO, price history). It is separate from the international Polymarket APIs (gamma/data-api) and from the key-gated `api.polymarket.us` trading API.

- `GET /v1/events?limit=500&offset=N&active=true&closed=false` pages cleanly; ~5,650 open events fit in about 12 calls. Events embed their markets, teams (logo, colorPrimary), `startTime`, `live`, `period`.
- Prices come back in the listing (`outcomePrices`, `marketSides[].price`, sometimes `bestBidQuote`/`bestAskQuote`).
- Volume and open interest are NOT in the listing; they only appear per market at `/v1/markets/{slug}/bbo` (`sharesTraded`, `openInterest`). A volume sort would need per-market calls or a WebSocket, which needs an identity-verified API key.
- Documented limit: 25 requests/s per IP.

- A two-team winner market is ONE order book on the first ("long") team. `outcomePrices` and `marketSides[].price` are that book's bid and ask, not one price per team. Long team chance = bid/ask midpoint; the other team = 100 minus that. Soccer uses three separate Yes/No markets (team, draw, team).
- `tagSlug=sports` plus `startTimeMin`/`startTimeMax` filter reliably and cut a full crawl from ~120 MB to a few MB per page. `orderBy=startTime` did not sort; do not rely on ordering.
- Team naming differs from Kalshi (NHL lists nicknames only, NBA city codes differ), so matching uses league + Eastern game day + both teams by name or ticker code, and drops anything ambiguous.
- Kalshi tennis/esports/fight tickers can carry a different day than the Polymarket start time: allow ±1 day for individual sports and esports, ±3 for tour-level ATP/WTA (ticker date can be the draw day), nearest day wins. Team sports stay same-day.
- Matching is independent of price: about a third of matched games have no tight two-sided quote at any moment, and dropping them (the first version did) hid most coverage.
- `score` is "A-B" in `teams[]` order (not home/away, not Kalshi order); tennis is "4-6, 6-4, 1-3:30-30" (sets, then current game). Cricket and other formats differ; show only recognised formats and only while `live`. `period` values seen: NS, FT, Q2, "End Q1", H1, HT, P2, S1, "Map 2", SUS.
- Polymarket lists games late: NHL only ~4 days ahead, EPL/top soccer ~5 days, while Kalshi lists weeks ahead. Those Kalshi games cannot match until Polymarket lists them; this is not a matching bug. Fetch out to 45 days anyway for NFL/UCL/CFB.
- Not on Polymarket US at all (Nov 2026): cricket T20, Russian Liga Pro table tennis, eSoccer/eBasketball (their "ebattles" are different fixtures), most minor European hockey/basketball leagues. Kalshi "advance", map, spread and total series are different bets and must never be matched to a winner market.
- User expectation (Nov 17, 2026): "very little or no games that are on Kalshi but not Polymarket". Measured after the work: ~1,790 of ~2,950 Kalshi games matched; the rest are not listed by Polymarket (yet).

## Terms of use (read Nov 17, 2026; terms effective Oct 23, 2026)
The Polymarket US terms cover the app, websites and APIs. They license market data for "personal, non-commercial use in connection with your trading" and prohibit "redistribution, resale, scraping, bulk downloads, and commercialization of derived works" without an express license. The API docs do say the public gateway is for "building something that displays market information", but grant no redistribution license.

**Decision (Nov 17, 2026):** shown these terms, the user chose "Build it anyway" and accepted the risk; no written permission exists.
**How to apply:** keep the footprint small (windowed, shared, slow refresh; never per visitor), keep Polymarket prices separately labeled, and raise the terms again before expanding to more Polymarket US data.
