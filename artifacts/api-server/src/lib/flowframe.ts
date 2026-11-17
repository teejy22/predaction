import type { FlowframeFeed, FlowframeInsights, FlowframeItem } from "@workspace/api-zod";
import { logger } from "./logger";

type FeedName = "movers" | "polymarketMovers" | "trades" | "trending" | "pulse";
type JsonObject = Record<string, unknown>;
// Five feeds, three refreshes per hour = 15 provider calls per server process.
const TTL = 20 * 60_000;
const HOUR = 60 * 60_000;
const PATHS: Record<FeedName, string> = {
  movers: "/movers/kalshi?direction=both&limit=25",
  trending: "/markets/kalshi/trending?limit=25",
  pulse: "/pulse?limit=8",
  polymarketMovers: "/movers/polymarket?window=24h&direction=both&limit=25",
  trades: "/trades/recent?minSize=1000&limit=50",
};

function object(value: unknown): JsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid provider data");
  return value as JsonObject;
}
function text(value: unknown): string { return typeof value === "string" ? value : ""; }
function number(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error("Invalid provider number");
  return value;
}
function price(value: unknown, scale = 1): number {
  const result = number(value) * scale;
  if (result < 0 || result > 100) throw new Error("Invalid provider price");
  return Math.round(result * 100) / 100;
}
function timestamp(value: unknown): string {
  const s = text(value);
  if (!s || !Number.isFinite(Date.parse(s))) throw new Error("Invalid provider timestamp");
  return s;
}
function safeUrl(value: unknown, host: string): string {
  const url = new URL(text(value));
  if (url.protocol !== "https:" || (url.hostname !== host && url.hostname !== `www.${host}`) || url.username || url.password) {
    throw new Error("Invalid provider link");
  }
  return url.toString();
}

export function normalizeFlowframe(name: FeedName, value: unknown, checkedAt: string): FlowframeFeed {
  const raw = object(value);
  const meta = object(raw.meta);
  if (!Array.isArray(raw.data)) throw new Error("Invalid provider items");
  let omitted = 0;
  const items: FlowframeItem[] = raw.data.flatMap((entry: unknown, index: number): FlowframeItem[] => {
    const item = object(entry);
    if (name === "polymarketMovers") {
      // The public contract explicitly permits null titles and condition IDs.
      if (!text(item.conditionId) || !text(item.marketTitle)) { omitted++; return []; }
      return [{
        id: text(item.conditionId), title: text(item.marketTitle), category: text(item.category),
        url: item.polymarketUrl == null ? "" : safeUrl(item.polymarketUrl, "polymarket.com"),
        probability: price(item.currentPrice, 100), change: number(item.deltaPct),
      }];
    }
    if (name === "trades") {
      const wallet = text(item.wallet);
      const title = text(item.marketTitle);
      const condition = text(item.conditionId);
      if (!wallet || !title || !condition || !["BUY", "SELL"].includes(text(item.side))) throw new Error("Invalid provider trade");
      const shares = number(item.size);
      const usdcSize = number(item.usdcSize);
      if (shares < 0 || usdcSize < 0) throw new Error("Invalid trade size");
      return [{
        id: `${text(item.transactionHash)}:${condition}:${wallet}:${index}`,
        title, category: "Polymarket",
        url: item.polymarketMarketUrl == null ? "" : safeUrl(item.polymarketMarketUrl, "polymarket.com"),
        ...(item.polymarketProfileUrl ? { profileUrl: safeUrl(item.polymarketProfileUrl, "polymarket.com") } : {}),
        wallet, side: text(item.side) as "BUY" | "SELL", outcome: text(item.outcome),
        shares, usdcSize, probability: price(item.price, 100), publishedAt: timestamp(item.timestamp),
      }];
    }
    const title = text(name === "pulse" ? item.subject : item.title);
    const id = text(name === "pulse" ? item.id : item.ticker);
    if (!title || !id) throw new Error("Invalid provider item");
    const common = { id, title, category: text(item.category) };
    if (name === "pulse") return [{
      ...common,
      url: safeUrl(item.permalink, "flowframe.xyz"),
      publishedAt: timestamp(item.publishedAt),
    }];
    return [{
      ...common,
      url: safeUrl(item.kalshiUrl, "kalshi.com"),
      ...(text(item.eventTicker) ? { eventTicker: text(item.eventTicker) } : {}),
      probability: name === "movers" ? price(item.currentPrice) : price(item.yesPrice, 100),
      ...(name === "movers" ? { change: number(item.priceChange) } : {}),
    }];
  });
  return {
    items, status: "ready", fetchedAt: timestamp(meta.fetchedAt), checkedAt,
    message: omitted ? `${omitted} source rows omitted because the market identity was missing.` : "",
  };
}

type Options = {
  fetchImpl?: typeof fetch;
  now?: () => number;
  getKey?: () => string | undefined;
};

export function createFlowframeClient(options: Options = {}) {
  const fetchImpl = options.fetchImpl ?? fetch;
  const now = options.now ?? Date.now;
  const getKey = options.getKey ?? (() => process.env.FLOWFRAME_API_KEY);
  const cache = new Map<FeedName, { feed: FlowframeFeed; nextCheck: number }>();
  const pending = new Map<FeedName, Promise<FlowframeFeed>>();
  const calls: number[] = [];
  let blockedUntil = 0;

  function failed(name: FeedName, message: string, state: "unavailable" | "unconfigured", nextCheck: number): FlowframeFeed {
    const old = cache.get(name)?.feed;
    const feed: FlowframeFeed = old?.items.length
      ? { ...old, status: "stale", checkedAt: new Date(now()).toISOString(), message }
      : { items: [], fetchedAt: "", checkedAt: new Date(now()).toISOString(), status: state, message };
    cache.set(name, { feed, nextCheck });
    return feed;
  }

  async function load(name: FeedName): Promise<FlowframeFeed> {
    const cached = cache.get(name);
    if (cached && now() < cached.nextCheck) return cached.feed;
    const key = getKey();
    if (!key) return failed(name, "Flowframe is not configured on the server.", "unconfigured", now() + TTL);
    while (calls.length && calls[0]! <= now() - HOUR) calls.shift();
    if (blockedUntil > now() || calls.length >= 18) {
      return failed(name, "Flowframe request budget is paused; cached data will retry automatically.", "unavailable",
        Math.max(now() + TTL, blockedUntil, calls.length >= 18 ? calls[0]! + HOUR : 0));
    }
    calls.push(now());
    try {
      const response = await fetchImpl(`https://flowframe.xyz/v1${PATHS[name]}`, {
        headers: { Accept: "application/json", Authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(15_000),
      });
      if (!response.ok) {
        let message = "Flowframe is temporarily unavailable.";
        if (response.status === 401) message = "Flowframe rejected the server API key. Update the project secret.";
        else if (response.status === 403) message = "This Flowframe feed is not available to the configured account.";
        else if (response.status === 429) {
          const retry = response.headers.get("Retry-After");
          const seconds = Number(retry);
          const retryAt = retry && Number.isFinite(seconds) ? now() + seconds * 1000 : Date.parse(retry || "");
          blockedUntil = Math.max(now() + TTL, Number.isFinite(retryAt) ? retryAt : now() + HOUR);
          message = "Flowframe's rate limit was reached; retrying after the provider cooldown.";
        }
        // Never log upstream bodies, URLs with credentials, or request headers.
        return failed(name, message, "unavailable", Math.max(now() + TTL, blockedUntil));
      }
      const raw: unknown = await response.json();
      let feed: FlowframeFeed;
      try {
        feed = normalizeFlowframe(name, raw, new Date(now()).toISOString());
      } catch {
        const envelope = object(raw);
        const rows = Array.isArray(envelope.data) ? envelope.data : [];
        const first = rows.find((item: unknown) => !!item && typeof item === "object") as JsonObject | undefined;
        // Schema diagnostics only: never record bodies, field values, credentials or headers.
        logger.warn({
          feed: name, count: rows.length,
          fields: first ? Object.fromEntries(Object.entries(first).map(([key, value]) => [key, value === null ? "null" : typeof value])) : {},
        }, "Flowframe response did not match the expected schema");
        throw new Error("Unexpected Flowframe schema");
      }
      cache.set(name, { feed, nextCheck: now() + TTL });
      return feed;
    } catch {
      return failed(name, "Flowframe could not be reached or returned an unexpected response.", "unavailable", now() + TTL);
    }
  }

  function get(name: FeedName): Promise<FlowframeFeed> {
    const running = pending.get(name);
    if (running) return running;
    const request = load(name).finally(() => pending.delete(name));
    pending.set(name, request);
    return request;
  }

  return {
    async insights(): Promise<FlowframeInsights> {
      const [movers, trending, pulse, polymarketMovers, trades] = await Promise.all([
        get("movers"), get("trending"), get("pulse"), get("polymarketMovers"), get("trades"),
      ]);
      return { movers, trending, pulse, polymarketMovers, trades, refreshMinutes: 20, attribution: "Powered by FlowFrame" };
    },
  };
}

export const flowframe = createFlowframeClient();
