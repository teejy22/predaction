import type { FlowframeFeed, FlowframeItem, FlowframeTiers } from "@workspace/api-zod";
import { object, text, number, nonnegative, price, timestamp, safeUrl } from "./flowframe-values";

export type ToolFeedName = "smartMoney" | "footballLeaderboard" | "footballTrades";

function walletProfile(wallet: string): string {
  if (!/^0x[0-9a-f]{40}$/i.test(wallet)) throw new Error("Invalid provider wallet");
  // These profile and market paths are explicitly documented by FlowFrame.
  return `https://polymarket.com/profile/${wallet}?r=flowframe`;
}

export function normalizeToolFeed(name: ToolFeedName, value: unknown, checkedAt: string): FlowframeFeed {
  const raw = object(value);
  const meta = object(raw.meta);
  if (!Array.isArray(raw.data)) throw new Error("Invalid provider tool items");
  let omitted = 0;
  const items = raw.data.flatMap((entry: unknown, index: number): FlowframeItem[] => {
    const item = object(entry);
    if (name === "smartMoney") {
      if (!text(item.conditionId) || !text(item.marketTitle)) { omitted++; return []; }
      const tiers: FlowframeTiers = {};
      const sourceTiers = item.tiers == null ? {} : object(item.tiers);
      for (const tier of ["sharp", "profitable", "recreational"] as const) {
        if (sourceTiers[tier] == null) continue;
        const t = object(sourceTiers[tier]);
        tiers[tier] = {
          yesDollars: nonnegative(t.yesDollars), noDollars: nonnegative(t.noDollars),
          ...(t.yesCount == null ? {} : { yesCount: nonnegative(t.yesCount, true) }),
          ...(t.noCount == null ? {} : { noCount: nonnegative(t.noCount, true) }),
          skew: number(t.skew),
        };
      }
      return [{
        id: text(item.conditionId), title: text(item.marketTitle), category: "Polymarket",
        url: item.polymarketUrl == null ? "" : safeUrl(item.polymarketUrl, "polymarket.com"),
        probability: price(item.marketPrice, 100), fairValue: price(item.impliedFairValue, 100),
        edge: number(item.edgePct), skewScore: number(item.compositeSkewScore), tiers,
      }];
    }
    const wallet = text(item.wallet);
    const profileUrl = walletProfile(wallet);
    if (name === "footballLeaderboard") {
      const rank = nonnegative(item.rank, true);
      if (rank < 1) throw new Error("Invalid provider rank");
      return [{
        id: wallet, title: wallet, category: "Football", url: profileUrl, wallet, profileUrl, rank,
        score: price(item.score), realizedPnl: number(item.realizedPnl), roi: number(item.roi) * 100,
        winRate: price(item.winRate, 100), realizedCount: nonnegative(item.realizedCount, true),
        nflCount: nonnegative(item.nflCount, true), cfbCount: nonnegative(item.cfbCount, true),
        medianStake: nonnegative(item.medianStake),
        ...(item.lastRealizedAt == null ? {} : { publishedAt: timestamp(item.lastRealizedAt) }),
      }];
    }
    if (!text(item.title) || !["BUY", "SELL"].includes(text(item.side)) || !["nfl", "cfb"].includes(text(item.league))) {
      throw new Error("Invalid provider football trade");
    }
    const slug = text(item.slug);
    // Avoid interpreting a source slug as another host, query, or path traversal.
    if (slug && !/^[a-z0-9][a-z0-9-]*$/i.test(slug)) throw new Error("Invalid provider market slug");
    if (typeof item.unusual !== "boolean") throw new Error("Invalid provider trade flag");
    return [{
      id: `${wallet}:${number(item.timestamp)}:${index}`, title: text(item.title), category: "Football",
      wallet, profileUrl, url: slug ? `https://polymarket.com/market/${slug}?r=flowframe` : "",
      side: text(item.side) as "BUY" | "SELL", outcome: text(item.outcome),
      probability: price(item.price, 100), usdcSize: nonnegative(item.usdSize),
      publishedAt: new Date(nonnegative(item.timestamp)).toISOString(),
      rank: nonnegative(item.walletRank, true), score: price(item.walletScore),
      league: text(item.league) as "nfl" | "cfb", unusual: item.unusual,
      ...(item.usualMultiple == null ? {} : { usualMultiple: nonnegative(item.usualMultiple) }),
    }];
  });
  const sourceTime = meta.refreshedAt ?? meta.lastUpdated;
  const sourceDate = sourceTime == null ? undefined : new Date(typeof sourceTime === "number" ? sourceTime : text(sourceTime));
  return {
    items, status: "ready", fetchedAt: timestamp(meta.fetchedAt), checkedAt,
    message: omitted ? `${omitted} source rows omitted because the market identity was missing.` : "",
    ...(typeof meta.backfillDone === "boolean" ? { backfillDone: meta.backfillDone } : {}),
    ...(sourceDate && Number.isFinite(sourceDate.getTime()) ? { sourceUpdatedAt: sourceDate.toISOString() } : {}),
    ...(typeof meta.clamped === "boolean" ? { clamped: meta.clamped } : {}),
    ...(typeof meta.effectiveLimit === "number" ? { effectiveLimit: nonnegative(meta.effectiveLimit, true) } : {}),
  };
}
