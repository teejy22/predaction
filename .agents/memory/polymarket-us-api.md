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
- Kalshi tennis tickers can carry a different day than the Polymarket start time, so many tennis matches go unmatched under the strict same-day rule.

## Terms of use (read Nov 17, 2026; terms effective Oct 23, 2026)
The Polymarket US terms cover the app, websites and APIs. They license market data for "personal, non-commercial use in connection with your trading" and prohibit "redistribution, resale, scraping, bulk downloads, and commercialization of derived works" without an express license. The API docs do say the public gateway is for "building something that displays market information", but grant no redistribution license.

**Decision (Nov 17, 2026):** shown these terms, the user chose "Build it anyway" and accepted the risk; no written permission exists.
**How to apply:** keep the footprint small (windowed, shared, slow refresh; never per visitor), keep Polymarket prices separately labeled, and raise the terms again before expanding to more Polymarket US data.
