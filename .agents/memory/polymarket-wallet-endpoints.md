---
name: Polymarket wallet endpoints
description: Public endpoints for wallet profile names and current holdings used by wallet-detail views.
---

Use Polymarket's public wallet endpoints for click-through wallet details.

**Why:** Football Sharps and tracked-wallet feeds often provide only wallet addresses. Polymarket's current public APIs can resolve those addresses to public usernames and open positions without an API key; older unversioned Data API routes may return 410 Gone.

**How to apply:**
- Profile: `GET https://gamma-api.polymarket.com/public-profile?address=<0x wallet>`. Useful fields include `name`, `pseudonym`, `displayUsernamePublic`, `profileImage`, `verifiedBadge`, and `proxyWallet`.
- Current holdings: `GET https://data-api.polymarket.com/v2/positions?user=<0x wallet>&limit=<n>`. Useful fields include `title`, `outcome`, `current_size`, `avg_price`, `current_price`, `current_value`, `unrealized_pnl`, `total_pnl`, `status`, `slug`, and `name`.
- Validate wallet addresses server-side before proxying. Cache briefly and handle missing/private profiles as unavailable, not as empty holdings.

## Positions endpoint behavior (observed Nov 2026)
- `limit` up to 500; paging is cursor-only (`pagination.next_cursor`); `offset` is rejected with 400. The `status=OPEN` filter is ignored, so filter on `status === "OPEN"` yourself. Rows come largest current value first.
- Bursts are refused with 429 (no Retry-After). The throttle bucket appears keyed by User-Agent: the default Node agent stayed refused while an identifying app agent was served. Read wallets one at a time with a pause and send an honest identifying User-Agent; never run wallets in parallel.
- Game slugs: `nfl|cfb-<away>-<home>-<YYYY-MM-DD>` with a UTC date (evening games are one day after Kalshi's Eastern game day). Suffixes: none = winner, `-spread-home|away-6pt5`, `-total-54pt5`; `1h-`, `1q-`, team totals and props also exist. NFL outcomes are nicknames ("Bengals"), so link to Kalshi city names through ESPN full names; short codes mostly match Kalshi's but not always (jax vs JAC).
- Leaderboard wallets hold few open game positions early in the week; most money appears close to kickoff. Many leftover positions are worth about $1.
- User wants wallet position lists on Football Sharps limited to NFL and college football (not the wallet's other markets). Football event slugs start with `nfl-`, `cfb-`, `pro-football-` (season props, division and title futures) or `college-football-`; `nfl-team-to-make-postseason` is a futures slug, not a game.
