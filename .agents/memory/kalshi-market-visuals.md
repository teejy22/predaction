---
name: Kalshi market visuals
description: How official Kalshi event and outcome images and colors are fetched safely.
---

Official Kalshi event/outcome images and colors come from `GET /events/{ticker}/metadata`, not the main event or series payloads.

**Why:** Discovery and detail event responses omit visual fields, and fetching metadata for every indexed event would waste limited Kalshi requests.

**How to apply:** Enrich only visible events with a small cap, cache successful metadata for hours and misses briefly, accept only official `https://assets.kalshi.com` image URLs, and keep visuals optional so metadata failures never block market data.
