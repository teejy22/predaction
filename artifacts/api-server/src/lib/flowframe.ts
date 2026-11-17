import type { FlowframeFeed, FlowframeInsights, FlowframeItem, FlowframeTools } from "@workspace/api-zod";
import { logger } from "./logger";
import { object, text, number, price, timestamp, safeUrl, type JsonObject } from "./flowframe-values";
import { normalizeToolFeed, type ToolFeedName } from "./flowframe-tool-feeds";

type FeedName = "movers" | "polymarketMovers" | "trades" | "trending" | "pulse" | ToolFeedName;
// Existing feeds: 15 calls/hour. Three on-demand tools: 3 calls/hour.
const TTL = 20 * 60_000;
const TRANSIENT_RETRY = 60_000;
const ACCESS_RETRY = 10 * 60_000;
const PROVIDER_TIMEOUT = 20_000;
const HOUR = 60 * 60_000;
const PATHS: Record<FeedName, string> = {
  movers: "/movers/kalshi?direction=both&limit=25",
  trending: "/markets/kalshi/trending?limit=25",
  pulse: "/pulse?limit=8",
  polymarketMovers: "/movers/polymarket?window=24h&direction=both&limit=25",
  trades: "/trades/recent?minSize=1000&limit=50",
  smartMoney: "/smart-money/skew?limit=50",
  footballLeaderboard: "/football-sharps/leaderboard?window=season&league=all&includeFutures=false&includeMm=false&limit=50",
  footballTrades: "/football-sharps/feed?minUsd=100",
};

export function normalizeFlowframe(name: FeedName, value: unknown, checkedAt: string): FlowframeFeed {
  if (name === "smartMoney" || name === "footballLeaderboard" || name === "footballTrades") {
    return normalizeToolFeed(name, value, checkedAt);
  }
  const raw = object(value);
  const meta = object(raw.meta);
  if (!Array.isArray(raw.data)) throw new Error("Invalid provider items");
  let omitted = 0;
  const items: FlowframeItem[] = raw.data.flatMap((entry: unknown, index: number): FlowframeItem[] => {
    const item = object(entry);
    if (name === "polymarketMovers") {
      // The public contract explicitly permits null titles and condition IDs.
      if (!text(item.conditionId) || !text(item.marketTitle)) { omitted++; return []; }
      // The provider's deltaPct sign does not reliably match the direction of the move,
      // so the change is taken from the window's start and end prices when both are supplied.
      const from = item.priceFrom, to = item.priceTo;
      const change = typeof from === "number" && typeof to === "number" && Number.isFinite(from) && Number.isFinite(to)
        ? Math.round((to - from) * 10_000) / 100
        : number(item.deltaPct);
      return [{
        id: text(item.conditionId), title: text(item.marketTitle), category: text(item.category),
        url: item.polymarketUrl == null ? "" : safeUrl(item.polymarketUrl, "polymarket.com"),
        probability: price(item.currentPrice, 100), change,
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
    const ttl = name === "smartMoney" || name === "footballLeaderboard" || name === "footballTrades" ? HOUR : TTL;
    const cached = cache.get(name);
    if (cached && now() < cached.nextCheck) return cached.feed;
    const key = getKey();
    if (!key) return failed(name, "Flowframe is not configured on the server.", "unconfigured", now() + ttl);
    while (calls.length && calls[0]! <= now() - HOUR) calls.shift();
    if (blockedUntil > now() || calls.length >= 18) {
      return failed(name, "Flowframe request budget is paused; cached data will retry automatically.", "unavailable",
        Math.max(now() + ttl, blockedUntil, calls.length >= 18 ? calls[0]! + HOUR : 0));
    }
    calls.push(now());
    try {
      const response = await fetchImpl(`https://flowframe.xyz/v1${PATHS[name]}`, {
        headers: { Accept: "application/json", Authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(PROVIDER_TIMEOUT),
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
        const retryAt = response.status === 429 ? now() + ttl :
          response.status === 401 || response.status === 403 ? now() + ACCESS_RETRY : now() + TRANSIENT_RETRY;
        return failed(name, message, "unavailable", Math.max(retryAt, blockedUntil));
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
      cache.set(name, { feed, nextCheck: now() + ttl });
      return feed;
    } catch {
      return failed(name, "Flowframe could not be reached or returned an unexpected response.", "unavailable", now() + TRANSIENT_RETRY);
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
    async tools(): Promise<FlowframeTools> {
      const [smartMoney, footballLeaderboard, footballTrades] = await Promise.all([
        get("smartMoney"), get("footballLeaderboard"), get("footballTrades"),
      ]);
      return { smartMoney, footballLeaderboard, footballTrades, refreshMinutes: 60, attribution: "Powered by FlowFrame" };
    },
    async insights(): Promise<FlowframeInsights> {
      const [movers, trending, pulse, polymarketMovers, trades] = await Promise.all([
        get("movers"), get("trending"), get("pulse"), get("polymarketMovers"), get("trades"),
      ]);
      return { movers, trending, pulse, polymarketMovers, trades, refreshMinutes: 20, attribution: "Powered by FlowFrame" };
    },
  };
}

export const flowframe = createFlowframeClient();
