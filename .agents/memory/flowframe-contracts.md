---
name: FlowFrame live contract quirks
description: Differences between documented cohort schemas and actual Smart Money responses.
---

Treat cohort counts as optional even when dollar exposures are available.

**Why:** The live Smart Money response supplied dollar exposures for every cohort but omitted counts for some cohorts, despite the public API describing them through the same shared schema. Requiring every count rejected otherwise usable data.

**How to apply:** Validate counts when supplied, omit missing counts rather than substituting zero, and keep displaying valid exposures. Check actual response shapes before assuming all cohorts report the same measures.

## Mover feeds (checked 2026-11-17 against Kalshi and Polymarket directly)

Polymarket movers: the signed delta field does not reliably match the direction of the move; the start and end prices of the window do. Derive direction from those prices.

Kalshi movers: prices are the best bid now versus the bid at midnight UTC, not traded prices. The largest 'moves' are often markets with no trades and a very wide spread where a resting bid was withdrawn, and the 'current price' can be far from the last trade.

**Why:** The home page showed a market that fell 85 points as up 85, and listed untraded markets as the day's biggest movers.

**How to apply:** Do not present Kalshi mover prices as probabilities or real moves without a volume check; the source rows carry 24h volume and open interest. The app's own Kalshi index has last and previous traded prices if a trade-based mover list is needed.
