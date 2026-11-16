import { Router, type IRouter } from "express";
import {
  ListSportsEventsQueryParams,
  ListSportsEventsResponse,
  GetSportsEventParams,
  GetSportsEventResponse,
  GetSportsOverviewResponse,
} from "@workspace/api-zod";
import { getSnapshot, getEvent, KalshiError, newestFirst } from "../lib/kalshi";

const router: IRouter = Router();

router.get("/sports/events", async (req, res): Promise<void> => {
  const parsed = ListSportsEventsQueryParams.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: "Invalid market filters." }); return; }
  try {
    const data = await getSnapshot();
    const { sport, league, search, sort } = parsed.data;
    const text = search?.trim().toLowerCase();
    const events = data.events.filter(e =>
      (!sport || sport === "all" || e.sport.toLowerCase() === sport.toLowerCase()) &&
      (!league || league === "all" || e.league.toLowerCase() === league.toLowerCase()) &&
      (!text || `${e.title} ${e.subtitle} ${e.league} ${e.markets.map(m => m.subtitle).join(" ")}`.toLowerCase().includes(text)),
    );
    if (sort === "closing") events.sort((a, b) => (Date.parse(a.closeTime) || Infinity) - (Date.parse(b.closeTime) || Infinity));
    else if (sort === "newest") events.sort(newestFirst);
    else events.sort((a, b) => b.volume24h - a.volume24h);
    res.json(ListSportsEventsResponse.parse({
      events, total: events.length, updatedAt: data.updatedAt,
      source: "Kalshi public API · selected major sports series", partial: data.partial,
    }));
  } catch (err) {
    req.log.warn({ err }, "Kalshi feed request failed");
    res.status(502).json({ error: "Live Kalshi data is temporarily unavailable. Please retry." });
  }
});

router.get("/sports/events/:ticker", async (req, res): Promise<void> => {
  const parsed = GetSportsEventParams.safeParse(req.params);
  if (!parsed.success || !/^[A-Za-z0-9-]{1,150}$/.test(parsed.data.ticker)) {
    res.status(400).json({ error: "Invalid event ticker." }); return;
  }
  try {
    res.json(GetSportsEventResponse.parse(await getEvent(parsed.data.ticker)));
  } catch (err) {
    req.log.warn({ err }, "Kalshi event request failed");
    res.status(err instanceof KalshiError ? err.status : 502).json({
      error: err instanceof KalshiError ? err.message : "Unable to load this event from Kalshi.",
    });
  }
});

router.get("/sports/overview", async (req, res): Promise<void> => {
  try {
    const { events, updatedAt } = await getSnapshot();
    const names = ["Football", "Basketball", "Baseball", "Hockey", "Soccer", "Tennis", "Golf", "MMA", "Motorsport"];
    res.json(GetSportsOverviewResponse.parse({
      sports: names.map(name => {
        const matching = events.filter(e => e.sport === name);
        return { name, count: matching.length, leagues: [...new Set(matching.map(e => e.league))] };
      }),
      totalEvents: events.length,
      totalMarkets: events.reduce((n, e) => n + e.markets.length, 0),
      totalVolume: events.reduce((n, e) => n + e.volume, 0),
      volume24h: events.reduce((n, e) => n + e.volume24h, 0),
      updatedAt,
    }));
  } catch (err) {
    req.log.warn({ err }, "Kalshi overview failed");
    res.status(502).json({ error: "Live sports statistics are temporarily unavailable." });
  }
});

export default router;
