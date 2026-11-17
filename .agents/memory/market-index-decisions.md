---
name: Open-event indexing tradeoffs
description: Why broad discovery uses a shared cached index and honest coverage labels.
---

Use a shared, progressively available open-event index rather than a sports allowlist or a full catalog crawl per visitor. Discovery refreshes may be less frequent than individual event details.

**Why:** Live Kalshi discovery involved roughly one hundred cursor pages and over 160,000 nested markets. A crawl per visitor would create unnecessary load and rate-limit risk. Counts during the first pass must not imply complete coverage.

**How to apply:** Preserve explicit indexing, partial-response, and freshness disclosures when changing caching or pagination. Keep the source's regular-event versus multivariate-combination coverage distinction visible, and never infer absent sport metadata from ticker strings.

Group related sports events on the server using source matchup title and subtitle, then paginate the resulting games.

**Why:** Client-side grouping after pagination can split one game across pages, under-count it, or hide spread and prop events that did not match the current search. Kalshi tickers are not a safe source of grouping semantics.

**How to apply:** When extending sports browsing, apply filters first, group second, and paginate third. A grouped-game detail request should return the complete current matchup group even when the listing card came from a narrower search result.

Football and basketball user-facing feeds intentionally show only full-game Winner/Moneyline, one primary Spread, and one primary Total. Exclude futures, alternate lines, halves/quarters, team totals, and props; leave other sports unchanged.

**Why:** The user explicitly scoped football and basketball browsing to the main lines and does not want large alt-line/prop payloads.

**How to apply:** Canonicalize football/basketball events server-side before grouping or returning sports feeds, choose the highest-volume primary spread/total market, and treat no-colon futures as Winner only when the source title is an actual team matchup.

Kalshi league metadata can vary across events in the same game. Use exact source series-title phrases such as “Pro Football” → NFL, “College Football” → NCAAF, and “College Basketball” → NCAAB when tags only name the sport, and do not let a missing league split a matchup group.

**Why:** Kalshi tags professional/college football and college-basketball series only with the broad sport; their authoritative series titles carry the league wording. Treating league as part of the game identity splits spreads and totals away from the main event and hides most college games from league filters.

**How to apply:** Derive league only from source series metadata/titles, never ticker strings. Group by matchup title/subtitle and populate the group’s league from any related event that has reliable league metadata.

Keep third-party intelligence visibly separate from the direct Kalshi event index; do not silently replace unavailable provider rankings with a ranking from a sampled event page.

**Why:** The sources have different coverage, ranking definitions, and update windows. A visually identical fallback would suggest the same ranking had refreshed when it had not.

**How to apply:** Preserve source attribution, source-specific time windows and timestamps, and explicit stale/unavailable states when extending intelligence panels.
