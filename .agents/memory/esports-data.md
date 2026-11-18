---
name: Esports data and price gaps
description: How esports matches are labeled and compared across Kalshi and Polymarket US, and what outside esports data sources allow (researched Nov 18, 2026).
---

- Kalshi tags every esports series only as "Esports"; the video game is known only from the series ticker, so the game title is used as the "league". eSoccer/eBasketball are simulated sports and never appear on Polymarket US. No League of Legends matches were open on Kalshi on Nov 18, 2026, and its Polymarket league slug is unconfirmed, so LoL is not matched yet.
- Kalshi's esports side bets (map winner, spread, total maps) abbreviate team names in their titles, so they only join their match when grouped by the date-and-teams part of the ticker. A match card needs an open match-winner market; side bets alone are not shown as matches. The Esports page leaves out simulated eSoccer/eBasketball (user asked for a cleaner page, Nov 18, 2026).
- Price gaps compare order-book midpoints on both exchanges, never Kalshi's last traded price. **Why:** the last trade is often stale (two sides summing to 111, a 22-point "gap" that was really 3-5 points). Typical real gaps measured: 3-5 points; about 37 of ~350 esports matches had a reliable price on both sides.
- No esports team logos exist in current sources (ESPN has no esports).

## Outside sources (terms read Nov 18, 2026)
- PandaScore: free "Fixtures" plan (schedules, teams, players, tournaments for CS, LoL, Dota 2, Valorant; 1,000 requests/hour; needs a key from a free sign-up). Paid stats plans are "only available to customers with non betting-related usage"; they sell a separate product for prediction users via sales. Terms bar passing raw data to third parties. Not approved by the user yet.
- OpenDota: free, no key, 3,000 calls/day; Dota 2 only; team list includes logos, ratings, win/loss.
- Liquipedia data API: free plan only for non-commercial, open-source projects; otherwise paid. Wiki API is for editors only.
- Riot/Steam/Faceit official APIs do not offer pro match schedules.
