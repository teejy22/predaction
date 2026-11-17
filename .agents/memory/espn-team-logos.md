---
name: ESPN team logos
description: How team logos are sourced, cached, and matched for grouped sports games.
---

Use ESPN's public team-directory API as the logo provider and cache the directories server-side. Match teams from Kalshi's source matchup title using source/ESPN name aliases; never infer logos from Kalshi tickers.

**Why:** ESPN provides stable logo URLs without credentials, but Kalshi and ESPN use different team labels (for example “Los Angeles C” versus “LA Clippers” and “Ball St.” versus “Ball State”). ESPN availability or incomplete college coverage must not break Kalshi market browsing.

**How to apply:** Keep logo enrichment separate from event grouping, retain stale ESPN data when refreshes fail, and return games with an empty or partial `teams` array when no reliable match exists. Expand city/school aliases from source names, deduplicate men's and women's school entries by ESPN abbreviation, keep ambiguous teams unmatched rather than guessing, and attribute grouped-game responses as Kalshi markets plus ESPN logos.
