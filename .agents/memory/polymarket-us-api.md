---
name: Polymarket US public API
description: What the keyless polymarket.us gateway offers for market discovery and where it falls short (researched Nov 2026, not integrated).
---

`https://gateway.polymarket.us` is a keyless, read-only API (events, markets, series, sports, search, order book/BBO, price history). It is separate from the international Polymarket APIs (gamma/data-api) and from the key-gated `api.polymarket.us` trading API.

- `GET /v1/events?limit=500&offset=N&active=true&closed=false` pages cleanly; ~5,650 open events fit in about 12 calls. Events embed their markets, teams (logo, colorPrimary), `startTime`, `live`, `period`.
- Prices come back in the listing (`outcomePrices`, `marketSides[].price`, sometimes `bestBidQuote`/`bestAskQuote`).
- Volume and open interest are NOT in the listing; they only appear per market at `/v1/markets/{slug}/bbo` (`sharesTraded`, `openInterest`). A volume sort would need per-market calls or a WebSocket, which needs an identity-verified API key.
- Documented limit: 25 requests/s per IP.

**Why:** the user asked whether Polymarket US markets could be added next to Kalshi; research only, no decision yet.
**How to apply:** if integrated, index from `/v1/events` on a slow cadence like the Kalshi index and fetch BBO only for visible events. Terms of use for redisplaying the data were not reviewed.
