import { GetSportsEventResponse } from "@workspace/api-zod";

type SportsEvent = ReturnType<typeof GetSportsEventResponse.parse>;
type RawMarket = {
  ticker: string; title: string; yes_sub_title?: string; status: string;
  close_time?: string; created_time?: string;
  last_price_dollars?: string; previous_price_dollars?: string;
  yes_ask_dollars?: string; no_ask_dollars?: string;
  volume_fp?: string; volume_24h_fp?: string;
  last_price?: number; previous_price?: number; yes_ask?: number; no_ask?: number;
  volume?: number; volume_24h?: number; rules_primary?: string; rules_secondary?: string;
};
type RawEvent = {
  event_ticker: string; series_ticker: string; title: string;
  sub_title?: string; category?: string; markets?: RawMarket[];
};
type Series = { ticker: string; sport: string; league: string };

// Major game-winner and championship series. A bounded index avoids crawling
// thousands of prop and combination series on every visitor's request.
const series: Series[] = [
  { ticker: "KXNFLGAME", sport: "Football", league: "NFL" },
  { ticker: "KXNBAGAME", sport: "Basketball", league: "NBA" },
  { ticker: "KXNHLGAME", sport: "Hockey", league: "NHL" },
  { ticker: "KXMLBGAME", sport: "Baseball", league: "MLB" },
  { ticker: "KXNCAAFGAME", sport: "Football", league: "NCAAF" },
  { ticker: "KXNCAAMBGAME", sport: "Basketball", league: "NCAAB" },
  { ticker: "KXEPLGAME", sport: "Soccer", league: "EPL" },
  { ticker: "KXUCLGAME", sport: "Soccer", league: "UCL" },
  { ticker: "KXATPGAME", sport: "Tennis", league: "Tennis" },
  { ticker: "KXWTAGAME", sport: "Tennis", league: "Tennis" },
  { ticker: "KXUFCFIGHT", sport: "MMA", league: "UFC" },
  { ticker: "KXF1RACE", sport: "Motorsport", league: "F1" },
  { ticker: "KXPGAWINNER", sport: "Golf", league: "PGA" },
  { ticker: "KXSB", sport: "Football", league: "NFL" },
  { ticker: "KXNBA", sport: "Basketball", league: "NBA" },
  { ticker: "KXMLB", sport: "Baseball", league: "MLB" },
  { ticker: "KXNHL", sport: "Hockey", league: "NHL" },
];

const API = "https://api.elections.kalshi.com/trade-api/v2";
const TTL = 60_000;
const createdTimes = new Map<string, number>();
type Snapshot = { events: SportsEvent[]; updatedAt: string; partial: boolean };
let snapshot: Snapshot | undefined;
let pending: Promise<Snapshot> | undefined;

export class KalshiError extends Error {
  constructor(message: string, public status = 502) { super(message); }
}

async function request<T>(path: string): Promise<T> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await fetch(`${API}${path}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(15_000),
    });
    if (response.ok) return response.json() as Promise<T>;
    if (response.status === 429 && attempt === 0) {
      await new Promise(resolve => setTimeout(resolve, 1200));
      continue;
    }
    throw new KalshiError(
      response.status === 404 ? "Event not found on Kalshi." : "Kalshi market data is temporarily unavailable. Please try again.",
      response.status === 404 ? 404 : 502,
    );
  }
  throw new KalshiError("Kalshi is rate limiting requests. Please try again shortly.");
}

function numeric(value: string | number | undefined): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function cents(dollars: string | undefined, legacy?: number): number {
  return Math.round(Math.min(100, Math.max(0, dollars != null ? numeric(dollars) * 100 : numeric(legacy))) * 100) / 100;
}

function eventUrl(event: RawEvent) {
  return `https://kalshi.com/markets/${encodeURIComponent(event.series_ticker.toLowerCase())}/${encodeURIComponent(event.event_ticker.toLowerCase())}`;
}

function normalize(event: RawEvent, info: Series): SportsEvent {
  const url = eventUrl(event);
  const markets = (event.markets ?? [])
    .filter(m => m.status === "active" || m.status === "open" || m.status === "initialized")
    .map(m => ({
      ticker: m.ticker,
      title: m.title,
      subtitle: m.yes_sub_title || m.title,
      probability: cents(m.last_price_dollars, m.last_price),
      yesAsk: cents(m.yes_ask_dollars, m.yes_ask),
      noAsk: cents(m.no_ask_dollars, m.no_ask),
      volume: numeric(m.volume_fp ?? m.volume),
      volume24h: numeric(m.volume_24h_fp ?? m.volume_24h),
      change: Math.round((cents(m.last_price_dollars, m.last_price) - cents(m.previous_price_dollars, m.previous_price)) * 100) / 100,
      status: m.status,
      closeTime: m.close_time || "",
      rules: [m.rules_primary, m.rules_secondary].filter(Boolean).join("\n\n"),
      url,
    }))
    .sort((a, b) => b.probability - a.probability);
  const times = (event.markets ?? []).map(m => Date.parse(m.created_time || "")).filter(Number.isFinite);
  createdTimes.set(event.event_ticker, times.length ? Math.max(...times) : 0);
  return {
    ticker: event.event_ticker,
    seriesTicker: event.series_ticker,
    title: event.title,
    subtitle: event.sub_title || "",
    sport: info.sport,
    league: info.league,
    volume: markets.reduce((sum, m) => sum + m.volume, 0),
    volume24h: markets.reduce((sum, m) => sum + m.volume24h, 0),
    closeTime: markets.map(m => m.closeTime).filter(Boolean).sort()[0] || "",
    url,
    markets,
  };
}

async function refresh(): Promise<Snapshot> {
  const events: SportsEvent[] = [];
  let failures = 0;
  let truncated = false;
  // Four workers keep bursts below Kalshi's public endpoint limits.
  let index = 0;
  async function worker() {
    while (index < series.length) {
      const info = series[index++];
      if (!info) break;
      try {
        const result = await request<{ events: RawEvent[]; cursor?: string }>(
          `/events?series_ticker=${info.ticker}&status=open&with_nested_markets=true&limit=100`,
        );
        if (result.cursor) truncated = true;
        for (const raw of result.events) {
          if (raw.category !== "Sports") continue;
          const event = normalize(raw, info);
          if (event.markets.length) events.push(event);
        }
      } catch {
        failures++;
      }
    }
  }
  await Promise.all(Array.from({ length: 4 }, worker));
  if (failures === series.length || (failures > 0 && !events.length)) {
    throw new KalshiError("Unable to load live Kalshi sports markets. Please try again shortly.");
  }
  const unique = [...new Map(events.map(e => [e.ticker, e])).values()];
  return {
    events: unique.sort((a, b) => b.volume24h - a.volume24h),
    updatedAt: new Date().toISOString(),
    partial: failures > 0 || truncated,
  };
}

export async function getSnapshot(): Promise<Snapshot> {
  if (snapshot && Date.now() - Date.parse(snapshot.updatedAt) < TTL) return snapshot;
  if (!pending) {
    pending = refresh().then(result => { snapshot = result; return result; }).finally(() => { pending = undefined; });
  }
  return pending;
}

export function newestFirst(a: SportsEvent, b: SportsEvent) {
  return (createdTimes.get(b.ticker) ?? 0) - (createdTimes.get(a.ticker) ?? 0);
}

export async function getEvent(ticker: string): Promise<SportsEvent> {
  const cached = snapshot?.events.find(e => e.ticker === ticker);
  if (cached && snapshot && Date.now() - Date.parse(snapshot.updatedAt) < TTL) return cached;
  const { event, markets } = await request<{ event: RawEvent; markets?: RawMarket[] }>(
    `/events/${encodeURIComponent(ticker)}?with_nested_markets=true`,
  );
  const info = series.find(s => s.ticker === event.series_ticker);
  if (event.category !== "Sports" || !info) throw new KalshiError("Sports event not found in Predaction's coverage.", 404);
  return normalize({ ...event, markets: event.markets ?? markets ?? [] }, info);
}
