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
