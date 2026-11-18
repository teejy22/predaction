import { Router, type IRouter, type Request, type Response } from "express";
import {
  ListEventsQueryParams, ListEventsResponse, GetEventParams, GetEventResponse, GetOverviewResponse,
  ListSportsGamesQueryParams, ListSportsGamesResponse, GetSportsGameParams, GetSportsGameResponse,
} from "@workspace/api-zod";
import {
  attachKalshiVisual, attachKalshiVisuals, getSnapshot, getEvent, KalshiError,
  newestFirst, categoryNames, eventCreatedAt, type PredictionEvent,
} from "../lib/kalshi";
import { attachEventTeamLogos, attachTeamLogos, getEspnTeams } from "../lib/espn";
import { attachPolymarket, attachPriceGap, getPolymarketGames } from "../lib/polymarket-us";
import { easternDate, gameKeyFor, groupSportsGames, selectMainMarketEvents, summarizeSportsGame } from "../lib/sports-games";

const router: IRouter = Router();

function matchesText(event: PredictionEvent, text: string) {
  return `${event.ticker} ${event.title} ${event.subtitle} ${event.categories.join(" ")} ${event.sport} ${event.league} ${event.markets.map(m => `${m.title} ${m.subtitle}`).join(" ")}`.toLowerCase().includes(text);
}

function sourceError(res: Response, req: Request, err: unknown, message: string) {
  req.log.warn({ err }, message);
  res.status(err instanceof KalshiError ? err.status : 502).json({ error: err instanceof Error ? err.message : "Live Kalshi data is temporarily unavailable." });
}

// Legacy API paths are retained alongside the category-neutral endpoints.
router.get(["/events", "/sports/events"], async (req, res): Promise<void> => {
  const parsed = ListEventsQueryParams.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: "Invalid market filters." }); return; }
  try {
    const [data, teams] = await Promise.all([getSnapshot(), getEspnTeams()]);
    const { category, sport, league, search, sort, offset = 0, limit = 50 } = parsed.data;
    const text = search?.trim().toLowerCase();
    const events = selectMainMarketEvents(data.events.filter(e =>
      (!category || category === "all" || e.categories.some(c => c.toLowerCase() === category.toLowerCase())) &&
      (!sport || sport === "all" || e.sport.toLowerCase() === sport.toLowerCase()) &&
      (!league || league === "all" || e.league.toLowerCase() === league.toLowerCase()) &&
      (!text || matchesText(e, text)),
    ));
    if (sort === "closing") events.sort((a, b) => (Date.parse(a.closeTime) || Infinity) - (Date.parse(b.closeTime) || Infinity) || a.ticker.localeCompare(b.ticker));
    else if (sort === "newest") events.sort((a, b) => newestFirst(a, b) || a.ticker.localeCompare(b.ticker));
    else events.sort((a, b) => b.volume24h - a.volume24h || a.ticker.localeCompare(b.ticker));
    const pageEvents = attachKalshiVisuals(
      events.slice(offset, offset + limit).map(event => attachEventTeamLogos(event, teams)),
      24,
    ).map(event => {
      const gameKey = gameKeyFor(event);
      return gameKey ? { ...event, gameKey } : event;
    });
    res.json(ListEventsResponse.parse({
      events: pageEvents, total: events.length,
      updatedAt: data.updatedAt, source: "Kalshi public API · regular open events (excludes multivariate combinations; football/basketball limited to full-game Winner, Spread, and Total) · Kalshi market images · ESPN team logos",
      partial: data.partial, indexing: data.indexing, warnings: data.warnings,
      indexedEvents: data.events.length, hasMore: offset + limit < events.length,
      nextOffset: Math.min(offset + limit, events.length),
    }));
  } catch (err) {
    sourceError(res, req, err, "Kalshi feed request failed");
  }
});

const MAJOR_LEAGUES = new Set(["NFL", "NBA", "NHL", "MLB", "WNBA", "NCAAF", "NCAAB"]);

router.get("/sports/games", async (req, res): Promise<void> => {
  const parsed = ListSportsGamesQueryParams.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: "Invalid sports game filters." }); return; }
  try {
    const [data, teams] = await Promise.all([getSnapshot(), getEspnTeams()]);
    const { sport, league, search, sort, offset = 0, limit = 50 } = parsed.data;
    // Read from the raw query: only the literal "true" turns the live filter on.
    const liveOnly = req.query.live === "true";
    const text = search?.trim().toLowerCase();
    const events = selectMainMarketEvents(data.events.filter(event =>
      event.categories.some(category => category.toLowerCase() === "sports") &&
      (!sport || sport === "all" || event.sport.toLowerCase() === sport.toLowerCase()) &&
      (!league || league === "all" || event.league.toLowerCase() === league.toLowerCase()) &&
      (!text || matchesText(event, text)),
    ));
    let games = attachPolymarket(groupSportsGames(events), getPolymarketGames()).map(attachPriceGap);
    // An esports match is listed only when its match-winner market is open; map, spread and total bets alone are not a match card.
    games = games.filter(game => game.sport !== "Esports" || game.events.some(event => /GAME$/.test(event.seriesTicker)));
    if (req.query.titled === "true") games = games.filter(game => game.league);
    if (liveOnly) games = games.filter(game => game.polymarket?.live);
    if (req.query.major === "true") games = games.filter(game => MAJOR_LEAGUES.has(game.league.toUpperCase()));
    if (req.query.notStarted === "true") {
      // A game counts as not started only when that is known: a start time still ahead, or a later game day.
      const now = Date.now();
      const today = easternDate();
      games = games.filter(game => {
        if (game.polymarket?.live) return false;
        const start = Date.parse(game.startTime ?? "");
        return Number.isFinite(start) ? start > now : !!game.gameDate && game.gameDate > today;
      });
    }
    if (sort === "upcoming") {
      // Only matchups with a published game day, soonest first, busiest first within a day.
      const today = easternDate();
      games = games.filter(game => game.gameDate && game.gameDate >= today)
        .sort((a, b) => a.gameDate!.localeCompare(b.gameDate!) || b.volume24h - a.volume24h || a.title.localeCompare(b.title));
    } else if (sort === "gap") {
      games = games.filter(game => game.priceGap)
        .sort((a, b) => b.priceGap!.points - a.priceGap!.points || b.volume24h - a.volume24h || a.title.localeCompare(b.title));
    } else if (sort === "closing") games.sort((a, b) => (Date.parse(a.closeTime) || Infinity) - (Date.parse(b.closeTime) || Infinity) || a.title.localeCompare(b.title));
    else if (sort === "newest") games.sort((a, b) =>
      Math.max(...b.events.map(eventCreatedAt)) - Math.max(...a.events.map(eventCreatedAt)) || a.title.localeCompare(b.title),
    );
    else games.sort((a, b) => b.volume24h - a.volume24h || a.title.localeCompare(b.title));
    res.json(ListSportsGamesResponse.parse({
      // Logos are matched only for the page being returned, not the whole index.
      games: games.slice(offset, offset + limit).map(game => summarizeSportsGame(attachTeamLogos(game, teams))), total: games.length,
      updatedAt: data.updatedAt, source: "Kalshi public API · grouped regular open sports events (excludes multivariate combinations; football/basketball limited to full-game Winner, Spread, and Total) · ESPN team logos · Polymarket US public API (winner prices on matched games)",
      partial: data.partial, indexing: data.indexing, warnings: data.warnings,
      indexedEvents: data.events.length, hasMore: offset + limit < games.length,
      nextOffset: Math.min(offset + limit, games.length),
    }));
  } catch (err) {
    sourceError(res, req, err, "Kalshi grouped sports request failed");
  }
});

router.get("/sports/games/:key", async (req, res): Promise<void> => {
  const parsed = GetSportsGameParams.safeParse(req.params);
  if (!parsed.success || !/^[A-Za-z0-9_-]{12,64}$/.test(parsed.data.key)) {
    res.status(400).json({ error: "Invalid sports game key." }); return;
  }
  try {
    const [data, teams] = await Promise.all([getSnapshot(), getEspnTeams()]);
    const games = attachPolymarket(groupSportsGames(selectMainMarketEvents(data.events
      .filter(event => event.categories.some(category => category.toLowerCase() === "sports")))), getPolymarketGames()).map(attachPriceGap);
    const game = games.find(item => item.key === parsed.data.key);
    if (!game) { res.status(404).json({ error: "Sports game not found in the open index." }); return; }
    res.json(GetSportsGameResponse.parse(attachTeamLogos(game, teams)));
  } catch (err) {
    sourceError(res, req, err, "Kalshi sports game request failed");
  }
});

router.get(["/events/:ticker", "/sports/events/:ticker"], async (req, res): Promise<void> => {
  const parsed = GetEventParams.safeParse(req.params);
  if (!parsed.success || !/^[A-Za-z0-9_.-]{1,150}$/.test(parsed.data.ticker)) {
    res.status(400).json({ error: "Invalid event ticker." }); return;
  }
  try {
    const [event, teams] = await Promise.all([getEvent(parsed.data.ticker), getEspnTeams()]);
    res.json(GetEventResponse.parse(attachKalshiVisual(attachEventTeamLogos(event, teams))));
  }
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
        const leagues = [...new Set(matching.map(e => e.league).filter(Boolean))].sort();
        return {
          name, count: matching.length, leagues,
          leagueCounts: leagues.map(league => ({ name: league, count: matching.filter(e => e.league === league).length })),
        };
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
