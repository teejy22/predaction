---
name: Open-event indexing tradeoffs
description: Why broad discovery uses a shared cached index and honest coverage labels.
---

Use a shared, progressively available open-event index rather than a sports allowlist or a full catalog crawl per visitor. Discovery refreshes may be less frequent than individual event details.

**Why:** Live Kalshi discovery involved roughly one hundred cursor pages and over 160,000 nested markets. A crawl per visitor would create unnecessary load and rate-limit risk. Counts during the first pass must not imply complete coverage.

**How to apply:** Preserve explicit indexing, partial-response, and freshness disclosures when changing caching or pagination. Keep the source's regular-event versus multivariate-combination coverage distinction visible, and never infer absent sport metadata from ticker strings.
