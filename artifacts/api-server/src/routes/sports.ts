import { Router, type IRouter } from "express";
import { ListEventsQueryParams, ListEventsResponse, GetEventParams, GetEventResponse, GetOverviewResponse } from "@workspace/api-zod";
import { getSnapshot, getEvent, KalshiError, newestFirst, categoryNames } from "../lib/kalshi";

const router: IRouter = Router();

// Legacy API paths are retained alongside the category-neutral endpoints.
router.get(["/events", "/sports/events"], async (req, res): Promise<void> => {
  const parsed = ListEventsQueryParams.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: "Invalid market filters." }); return; }
  try {
    const data = await getSnapshot();
    const { category, sport, league, search, sort, offset = 0, limit = 50 } = parsed.data;
    const text = search?.trim().toLowerCase();
    const events = data.events.filter(e =>
      (!category || category === "all" || e.categories.some(c => c.toLowerCase() === category.toLowerCase())) &&
      (!sport || sport === "all" || e.sport.toLowerCase() === sport.toLowerCase()) &&
      (!league || league === "all" || e.league.toLowerCase() === league.toLowerCase()) &&
      (!text || `${e.ticker} ${e.title} ${e.subtitle} ${e.categories.join(" ")} ${e.sport} ${e.league} ${e.markets.map(m => `${m.title} ${m.subtitle}`).join(" ")}`.toLowerCase().includes(text)),
    );
    if (sort === "closing") events.sort((a, b) => (Date.parse(a.closeTime) || Infinity) - (Date.parse(b.closeTime) || Infinity) || a.ticker.localeCompare(b.ticker));
    else if (sort === "newest") events.sort((a, b) => newestFirst(a, b) || a.ticker.localeCompare(b.ticker));
    else events.sort((a, b) => b.volume24h - a.volume24h || a.ticker.localeCompare(b.ticker));
    res.json(ListEventsResponse.parse({
      events: events.slice(offset, offset + limit), total: events.length,
      updatedAt: data.updatedAt, source: "Kalshi public API · regular open events (excludes multivariate combinations)",
      partial: data.partial, indexing: data.indexing, warnings: data.warnings,
      indexedEvents: data.events.length, hasMore: offset + limit < events.length,
      nextOffset: Math.min(offset + limit, events.length),
    }));
  } catch (err) {
    req.log.warn({ err }, "Kalshi feed request failed");
    res.status(err instanceof KalshiError ? err.status : 502).json({ error: err instanceof Error ? err.message : "Live Kalshi data is temporarily unavailable." });
  }
});

router.get(["/events/:ticker", "/sports/events/:ticker"], async (req, res): Promise<void> => {
  const parsed = GetEventParams.safeParse(req.params);
  if (!parsed.success || !/^[A-Za-z0-9_.-]{1,150}$/.test(parsed.data.ticker)) {
    res.status(400).json({ error: "Invalid event ticker." }); return;
  }
  try { res.json(GetEventResponse.parse(await getEvent(parsed.data.ticker))); }
  catch (err) {
    req.log.warn({ err }, "Kalshi event request failed");
    res.status(err instanceof KalshiError ? err.status : 502).json({ error: err instanceof Error ? err.message : "Unable to load this event from Kalshi." });
  }
});

router.get(["/overview", "/sports/overview"], async (req, res): Promise<void> => {
  try {
    const { events, updatedAt, partial, indexing, warnings } = await getSnapshot();
    const names = [...new Set(events.map(e => e.sport).filter(Boolean))].sort();
    const categories = [...new Set([...categoryNames(), ...events.flatMap(e => e.categories)])].sort();
    res.json(GetOverviewResponse.parse({
      categories: categories.map(name => ({ name, count: events.filter(e => e.categories.includes(name)).length })),
      sports: names.map(name => {
        const matching = events.filter(e => e.sport === name);
        return { name, count: matching.length, leagues: [...new Set(matching.map(e => e.league).filter(Boolean))].sort() };
      }),
      totalEvents: events.length, totalMarkets: events.reduce((n, e) => n + e.markets.length, 0),
      totalVolume: events.reduce((n, e) => n + e.volume, 0), volume24h: events.reduce((n, e) => n + e.volume24h, 0),
      updatedAt, partial, indexing, warnings,
    }));
  } catch (err) {
    req.log.warn({ err }, "Kalshi overview failed");
    res.status(err instanceof KalshiError ? err.status : 502).json({ error: err instanceof Error ? err.message : "Market statistics are temporarily unavailable." });
  }
});
export default router;
