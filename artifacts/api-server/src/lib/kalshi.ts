import { GetEventResponse } from "@workspace/api-zod";
import { logger } from "./logger";

export type PredictionEvent = ReturnType<typeof GetEventResponse.parse>;
export type RawMarket = {
  ticker: string; title: string; yes_sub_title?: string; status: string;
  close_time?: string; created_time?: string;
  last_price_dollars?: string; previous_price_dollars?: string;
  yes_ask_dollars?: string; no_ask_dollars?: string;
  volume_fp?: string; volume_24h_fp?: string;
  last_price?: number; previous_price?: number; yes_ask?: number; no_ask?: number;
  volume?: number; volume_24h?: number; rules_primary?: string; rules_secondary?: string;
};
export type RawEvent = {
  event_ticker: string; series_ticker: string; title: string;
  sub_title?: string; category?: string; markets?: RawMarket[];
};
export type Series = { ticker: string; title?: string; category: string; categories?: string[]; tags?: string[] | null };
const API = "https://api.elections.kalshi.com/trade-api/v2";
const INDEX_TTL = 300_000;
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
type Snapshot = {
  events: PredictionEvent[]; updatedAt: string; partial: boolean;
  indexing: boolean; warnings: string[];
};
let snapshot: Snapshot | undefined;
let pending: Promise<void> | undefined;
let retryAfter = 0;
let lastError: unknown;
let metadata = new Map<string, Series>();
let metadataAt = 0;
let metadataPending: Promise<void> | undefined;
const createdTimes = new Map<string, number>();
const detailCache = new Map<string, { event: PredictionEvent; at: number }>();
const detailPending = new Map<string, Promise<PredictionEvent>>();

export type EventVisualMetadata = {
  image_url?: string;
  featured_image_url?: string;
  market_details?: { market_ticker?: string; image_url?: string; color_code?: string }[];
};
const VISUAL_TTL = 6 * 60 * 60 * 1000;
const VISUAL_MISS_TTL = 10 * 60 * 1000;
const visualCache = new Map<string, { metadata?: EventVisualMetadata; at: number }>();
const visualPending = new Map<string, Promise<EventVisualMetadata | undefined>>();

export class KalshiError extends Error {
  constructor(message: string, public status = 502) { super(message); }
}

// All discovery, metadata and detail requests share a four-request ceiling.
let active = 0;
const queue: (() => void)[] = [];
async function request<T>(path: string): Promise<T> {
  if (active >= 4) await new Promise<void>(resolve => queue.push(resolve));
  else active++;
  try {
    for (let attempt = 0; attempt < 3; attempt++) {
      const response = await fetch(`${API}${path}`, {
        headers: { Accept: "application/json" }, signal: AbortSignal.timeout(20_000),
      });
      if (response.ok) return await response.json() as T;
      if (response.status === 429) {
        if (attempt < 2) {
          const seconds = Number(response.headers.get("retry-after"));
          await sleep(Number.isFinite(seconds) && seconds > 0 ? Math.min(seconds * 1000, 10_000) : 1500 * (attempt + 1));
          continue;
        }
        throw new KalshiError("Kalshi rate limit reached. Indexed results may be incomplete or stale; retry shortly.", 429);
      }
      throw new KalshiError(response.status === 404 ? "Event not found on Kalshi." : "Kalshi data request failed. Indexed results may be incomplete or stale.", response.status === 404 ? 404 : 502);
    }
    throw new KalshiError("Kalshi data is unavailable.");
  } finally {
    active--;
    // Reserve the freed slot for the waiter before a new caller can take it.
    const next = queue.shift();
    if (next) { active++; next(); }
  }
}

async function loadMetadata() {
  if (metadataAt && Date.now() - metadataAt < 3_600_000) return;
  if (!metadataPending) metadataPending = request<{ series: Series[] }>("/series")
    .then(result => {
      metadata = new Map(result.series.map(s => [s.ticker, s]));
      metadataAt = Date.now();
    }).finally(() => { metadataPending = undefined; });
  await metadataPending;
}

function numeric(value: string | number | undefined): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}
function cents(dollars: string | undefined, legacy?: number): number {
  return Math.round(Math.min(100, Math.max(0, dollars != null ? numeric(dollars) * 100 : numeric(legacy))) * 100) / 100;
}

// Only exact authoritative tags are used; no inference from event tickers.
const sportTags = ["Football", "Basketball", "Baseball", "Hockey", "Soccer", "Tennis", "Golf", "MMA", "Motorsport", "Cricket", "Rugby", "Boxing", "Esports"];
const leagueSports: Record<string, string> = {
  NFL: "Football", NBA: "Basketball", WNBA: "Basketball", MLB: "Baseball",
  NHL: "Hockey", NCAAF: "Football", NCAAB: "Basketball", EPL: "Soccer",
  UCL: "Soccer", UFC: "MMA", ATP: "Tennis", WTA: "Tennis", PGA: "Golf", F1: "Motorsport",
};
const leagueTitleAliases: Record<string, string> = {
  "pro football": "NFL",
  "college football": "NCAAF",
  "college basketball": "NCAAB",
};
export function normalize(event: RawEvent, info?: Series, openOnly = true): PredictionEvent {
  const url = `https://kalshi.com/markets/${encodeURIComponent(event.series_ticker.toLowerCase())}/${encodeURIComponent(event.event_ticker.toLowerCase())}`;
  const category = event.category || info?.category || "Uncategorized";
  const categories = [...new Set([category, ...(info?.categories ?? [])])];
  const tags = category === "Sports" ? info?.tags ?? [] : [];
  const seriesTitle = (info?.title ?? "").toLowerCase();
  const titleAlias = Object.entries(leagueTitleAliases).find(([phrase]) => new RegExp(`\\b${phrase}\\b`).test(seriesTitle))?.[1] ?? "";
  const league = tags.find(t => leagueSports[t]) || titleAlias ||
    (category === "Sports" ? Object.keys(leagueSports).find(name => new RegExp(`\\b${name}\\b`).test(info?.title ?? "")) : "") || "";
  const sport = tags.find(t => sportTags.includes(t)) || leagueSports[league] || "";
  const markets = (event.markets ?? [])
    .filter(m => !openOnly || m.status === "active" || m.status === "open")
    .map(m => ({
      ticker: m.ticker, title: m.title, subtitle: m.yes_sub_title ?? "",
      probability: cents(m.last_price_dollars, m.last_price),
      yesAsk: cents(m.yes_ask_dollars, m.yes_ask), noAsk: cents(m.no_ask_dollars, m.no_ask),
      volume: numeric(m.volume_fp ?? m.volume), volume24h: numeric(m.volume_24h_fp ?? m.volume_24h),
      change: Math.round((cents(m.last_price_dollars, m.last_price) - cents(m.previous_price_dollars, m.previous_price)) * 100) / 100,
      status: m.status, closeTime: m.close_time ?? "",
      rules: [m.rules_primary, m.rules_secondary].filter(Boolean).join("\n\n"), url,
    })).sort((a, b) => b.probability - a.probability);
  const times = (event.markets ?? []).map(m => Date.parse(m.created_time ?? "")).filter(Number.isFinite);
  createdTimes.set(event.event_ticker, times.length ? Math.max(...times) : 0);
  return {
    ticker: event.event_ticker, seriesTicker: event.series_ticker,
    title: event.title, subtitle: event.sub_title ?? "", category, categories, sport, league,
    volume: markets.reduce((sum, m) => sum + m.volume, 0),
    volume24h: markets.reduce((sum, m) => sum + m.volume24h, 0),
    closeTime: markets.map(m => m.closeTime).filter(Boolean).sort()[0] ?? "", url, markets,
  };
}

function officialImage(value?: string) {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "assets.kalshi.com" ? value : undefined;
  } catch { return undefined; }
}

function officialColor(value?: string) {
  return value && /^#[0-9a-f]{6}$/i.test(value) ? value : undefined;
}

export function applyEventVisuals(event: PredictionEvent, metadata: EventVisualMetadata): PredictionEvent {
  const details = new Map((metadata.market_details ?? []).map(detail => [detail.market_ticker, detail]));
  const markets = event.markets.map(market => {
    const detail = details.get(market.ticker);
    const image = officialImage(detail?.image_url);
    const color = officialColor(detail?.color_code);
    if (!image && !color) return market;
    return { ...market, ...(image ? { image } : {}), ...(color ? { color } : {}) };
  });
  const image = officialImage(metadata.image_url);
  const featuredImage = officialImage(metadata.featured_image_url);
  const marketsChanged = markets.some((market, index) => market !== event.markets[index]);
  if (!image && !featuredImage && !marketsChanged) return event;
  return {
    ...event,
    ...(image ? { image } : {}),
    ...(featuredImage ? { featuredImage } : {}),
    markets,
  };
}

async function loadEventVisuals(ticker: string) {
  const cached = visualCache.get(ticker);
  if (cached && Date.now() - cached.at < (cached.metadata ? VISUAL_TTL : VISUAL_MISS_TTL)) return cached.metadata;
  const existing = visualPending.get(ticker);
  if (existing) return existing;
  const task = request<EventVisualMetadata>(`/events/${encodeURIComponent(ticker)}/metadata`)
    .then(metadata => {
      if (visualCache.size >= 1000) visualCache.delete(visualCache.keys().next().value!);
      visualCache.set(ticker, { metadata, at: Date.now() });
      return metadata;
    })
    .catch(err => {
      logger.warn({ err, ticker }, "Kalshi event visual metadata unavailable");
      if (visualCache.size >= 1000) visualCache.delete(visualCache.keys().next().value!);
      visualCache.set(ticker, { at: Date.now() });
      return undefined;
    })
    .finally(() => { visualPending.delete(ticker); });
  visualPending.set(ticker, task);
  return task;
}

export async function attachKalshiVisuals(events: PredictionEvent[], limit = 12) {
  return Promise.all(events.map(async (event, index) => {
    if (index >= limit) return event;
    const metadata = await loadEventVisuals(event.ticker);
    return metadata ? applyEventVisuals(event, metadata) : event;
  }));
}

export async function attachKalshiVisual(event: PredictionEvent) {
  return (await attachKalshiVisuals([event], 1))[0] ?? event;
}

async function refresh(): Promise<void> {
  const previous = snapshot;
  const events = new Map<string, PredictionEvent>();
  let cursor = "";
  const seen = new Set<string>();
  const warnings: string[] = [];
  try {
    try { await loadMetadata(); }
    catch (err) {
      logger.warn({ err }, "Series metadata unavailable");
      warnings.push(err instanceof Error ? `Series metadata unavailable: ${err.message}` : "Series metadata unavailable; sports drilldowns may be limited.");
    }
    do {
      const result = await request<{ events: RawEvent[]; cursor?: string }>(
        `/events?status=open&with_nested_markets=true&limit=200${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`,
      );
      for (const raw of result.events) {
        const event = normalize(raw, metadata.get(raw.series_ticker));
        if (event.markets.length) events.set(event.ticker, event);
      }
      cursor = result.cursor || "";
      if (cursor && seen.has(cursor)) throw new KalshiError("Kalshi repeated a pagination cursor; coverage is incomplete.");
      if (cursor) seen.add(cursor);
      // First boot is progressively browsable. Subsequent refreshes swap atomically.
      if (!previous) snapshot = {
        events: [...events.values()], updatedAt: new Date().toISOString(),
        partial: !!cursor || warnings.length > 0, indexing: !!cursor,
        warnings: [...warnings, ...(cursor ? ["Indexing open events across categories. Counts and search cover only the events indexed so far."] : [])],
      };
      if (cursor) await sleep(200);
    } while (cursor);
    snapshot = { events: [...events.values()], updatedAt: new Date().toISOString(), partial: warnings.length > 0, indexing: false, warnings };
    // Keep newest ordering metadata bounded to the current index and recent details.
    for (const ticker of createdTimes.keys()) if (!events.has(ticker) && !detailCache.has(ticker)) createdTimes.delete(ticker);
  } catch (err) {
    lastError = err;
    logger.warn({ err }, "Open-event index refresh failed");
    if (snapshot) snapshot = {
      ...snapshot, partial: true, indexing: false,
      warnings: [...warnings, err instanceof Error ? err.message : "Kalshi refresh failed; indexed results are incomplete or stale."],
    };
    retryAfter = Date.now() + 30_000;
  }
}

export async function getSnapshot(): Promise<Snapshot> {
  if (!pending && Date.now() >= retryAfter && (!snapshot || Date.now() - Date.parse(snapshot.updatedAt) >= INDEX_TTL || snapshot.partial)) {
    retryAfter = Date.now() + INDEX_TTL;
    pending = refresh().finally(() => { pending = undefined; });
  }
  while (!snapshot && pending) await Promise.race([pending, sleep(100)]);
  if (!snapshot) throw lastError ?? new KalshiError("Unable to load Kalshi events. Please retry shortly.");
  return snapshot;
}

export function newestFirst(a: PredictionEvent, b: PredictionEvent) {
  return (createdTimes.get(b.ticker) ?? 0) - (createdTimes.get(a.ticker) ?? 0);
}
export function eventCreatedAt(event: PredictionEvent) {
  return createdTimes.get(event.ticker) ?? 0;
}
export function categoryNames() {
  return [...new Set([...metadata.values()].flatMap(s => [s.category, ...(s.categories ?? [])]).filter(Boolean))].sort();
}

export async function getEvent(ticker: string): Promise<PredictionEvent> {
  const cached = detailCache.get(ticker);
  if (cached && Date.now() - cached.at < 60_000) return cached.event;
  const existing = detailPending.get(ticker);
  if (existing) return existing;
  const task = (async () => {
    const { event, markets } = await request<{ event: RawEvent; markets?: RawMarket[] }>(
      `/events/${encodeURIComponent(ticker)}?with_nested_markets=true`,
    );
    // Details remain available for saved tickers outside the index, including closed events.
    if (!metadata.has(event.series_ticker)) {
      try {
        const result = await request<{ series: Series }>(`/series/${encodeURIComponent(event.series_ticker)}`);
        metadata.set(result.series.ticker, result.series);
      } catch (err) { logger.warn({ err }, "Event series metadata unavailable"); }
    }
    const normalized = normalize({ ...event, markets: event.markets ?? markets ?? [] }, metadata.get(event.series_ticker), false);
    if (detailCache.size >= 500) detailCache.delete(detailCache.keys().next().value!);
    detailCache.set(ticker, { event: normalized, at: Date.now() });
    return normalized;
  })().finally(() => { detailPending.delete(ticker); });
  detailPending.set(ticker, task);
  return task;
}
