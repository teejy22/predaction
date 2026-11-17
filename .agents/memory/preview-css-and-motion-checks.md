---
name: Preview CSS and motion checks
description: Stale stylesheet in the web dev server after editing index.css, and how to verify animations
---
After adding plain CSS rules to the web app's main stylesheet, the running dev server kept serving the old stylesheet until the web workflow was restarted; the class names were in the page but the rules were not.

**Why:** A scrolling list shipped to the preview without moving, and a still screenshot could not show it.

**How to apply:** Restart the web workflow after editing the main stylesheet. To verify motion, capture the page twice with the system `chromium --headless --virtual-time-budget=<ms> --screenshot` at different budgets and compare.
