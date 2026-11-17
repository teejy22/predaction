---
name: ESPN team logos
description: How team logos are sourced, cached, and matched for grouped sports games and homepage event cards.
---

Use ESPN's public team-directory API as the logo provider and cache the directories server-side. Match teams from Kalshi's source matchup title using source/ESPN name aliases; never infer logos from Kalshi tickers.

**Why:** ESPN provides stable logo URLs without credentials, but Kalshi and ESPN use different team labels (for example “Los Angeles C” versus “LA Clippers” and “Ball St.” versus “Ball State”). ESPN availability or incomplete college coverage must not break Kalshi market browsing.

**How to apply:** Keep logo enrichment separate from event grouping, retain stale ESPN data when refreshes fail, and return games with an empty or partial `teams` array when no reliable match exists. Expand city/school aliases from source names, deduplicate men's and women's school entries by ESPN abbreviation, keep ambiguous teams unmatched rather than guessing, and attribute grouped-game responses as Kalshi markets plus ESPN logos.

Logo enrichment should include national soccer teams, not only club teams, because Kalshi soccer includes country matchups.

**Why:** The user expects homepage sports cards to show logos for both club/league games and international games such as Denmark vs Norway.

**How to apply:** Keep ESPN's international soccer team directory in the cached team list and reuse the same safe, enrichment-only matching for individual event cards as grouped game cards.

Apply team matching after filtering, sorting, and pagination, not to the full open-event index.

**Why:** Matching logos for every indexed event delayed `/api/events` by more than ten seconds; matching only the visible page keeps market browsing fast.

**How to apply:** Slice the requested page first, then attach ESPN teams and cached Kalshi visuals to those rows only.
