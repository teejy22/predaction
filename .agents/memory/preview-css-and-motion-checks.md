---
name: Preview CSS and motion checks
description: Stale stylesheet in the web dev server after editing index.css, and how to verify animations
---
After adding plain CSS rules to the web app's main stylesheet, the running dev server kept serving the old stylesheet until the web workflow was restarted; the class names were in the page but the rules were not.

**Why:** A scrolling list shipped to the preview without moving, and a still screenshot could not show it.

**How to apply:** Restart the web workflow after editing the main stylesheet. To verify motion, capture the page twice with the system `chromium --headless --virtual-time-budget=<ms> --screenshot` at different budgets and compare.

## Checking UI that only appears after a click
The preview screenshot cannot click. Start `chromium --headless=new --no-sandbox --remote-debugging-port=<port>`, connect Node's built-in `WebSocket` to the page's `webSocketDebuggerUrl` from `http://127.0.0.1:<port>/json`, then use `Page.navigate`, `Runtime.evaluate` (click by `data-testid`) and `Page.captureScreenshot`. No extra packages needed; takes about 15 seconds.
