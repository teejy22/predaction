---
name: Sports game schedule
description: Where a game's day and start time come from, and why closeTime is not used for it
---
Kalshi's closeTime on sports events is not the game time; it runs roughly two days after the scheduled start. The game day (and, for some series, the start time) is only published inside the event ticker, in US Eastern time.

**Why:** An 'upcoming games' view sorted by closeTime showed games from earlier days and wrong times.

**How to apply:** Use the ticker-derived game day for anything about when a game is played; show a start time only when the ticker carries one, never one inferred from closeTime. Judge 'today' in US Eastern time on both server and client.
