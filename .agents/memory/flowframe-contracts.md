---
name: FlowFrame live contract quirks
description: Differences between documented cohort schemas and actual Smart Money responses.
---

Treat cohort counts as optional even when dollar exposures are available.

**Why:** The live Smart Money response supplied dollar exposures for every cohort but omitted counts for some cohorts, despite the public API describing them through the same shared schema. Requiring every count rejected otherwise usable data.

**How to apply:** Validate counts when supplied, omit missing counts rather than substituting zero, and keep displaying valid exposures. Check actual response shapes before assuming all cohorts report the same measures.
