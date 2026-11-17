import { ArrowDownRight, ArrowUpRight, ExternalLink } from "lucide-react";
import type { FlowframeItem } from "@workspace/api-client-react";
import { externalHref, formatSourceTime, shortWallet } from "@/components/flowframe-data";
import { SourceLink } from "@/components/flowframe-feed-ui";
import { formatDistanceToNowStrict } from "date-fns";

export function MoversList({ items, limit }: { items: FlowframeItem[]; limit?: number }) {
  return <div className="overflow-hidden rounded-md border border-border/80 bg-background/35">
    {items.slice(0, limit).map((item) => {
      const change = item.change ?? 0;
      return <article key={item.id} data-testid={`row-flowframe-mover-${item.id}`} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border/70 px-3 py-3 last:border-0 sm:px-4">
        <div className="min-w-0"><p className="mb-1 truncate font-mono text-[9px] uppercase tracking-wider text-muted-foreground">{item.category}</p>
          <SourceLink item={item} testId={`link-flowframe-mover-${item.id}`}><span className="line-clamp-2 text-xs font-semibold leading-5 sm:text-sm">{item.title}</span></SourceLink>
        </div>
        <div className="text-right">
          {item.probability !== undefined && <p className="font-mono text-sm font-semibold tabular">{item.probability}%</p>}
          {item.change !== undefined && <p className={`mt-1 inline-flex items-center justify-end gap-0.5 font-mono text-[10px] font-semibold tabular ${change >= 0 ? "text-emerald-200" : "text-rose-200"}`}>
            {change >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}{change > 0 ? "+" : ""}{change.toFixed(1)} pp
          </p>}
        </div>
      </article>;
    })}
  </div>;
}

export function TradeList({ items, limit }: { items: FlowframeItem[]; limit?: number }) {
  return <div className="divide-y divide-border/70 overflow-hidden rounded-md border border-border/80 bg-background/35">
    {items.slice(0, limit).map((item) => {
      const profile = externalHref(item.profileUrl);
      const time = item.publishedAt ? new Date(item.publishedAt) : undefined;
      const validTime = time && Number.isFinite(time.getTime());
      const action = item.side === "BUY" ? "Bought" : item.side === "SELL" ? "Sold" : "Traded";
      return <article key={item.id} data-testid={`row-flowframe-trade-${item.id}`} className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4 gap-y-2 px-4 py-4 sm:px-5">
        <div className="min-w-0">
          <SourceLink item={item} testId={`link-flowframe-trade-${item.id}`}><span className="line-clamp-2 text-sm font-semibold leading-5">{item.title}</span></SourceLink>
          <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
            <span className={item.side === "BUY" ? "font-medium text-emerald-200" : item.side === "SELL" ? "font-medium text-rose-200" : ""}>{action}</span>{" "}
            <span className="font-medium text-foreground">{item.outcome || "an outcome"}</span>
            {item.probability !== undefined && <> at <span className="text-foreground">{formatNumber(item.probability)}¢</span></>}
          </p>
        </div>
        <div className="text-right">
          {item.usdcSize !== undefined && <><p className="text-sm font-semibold tabular sm:text-base">${formatNumber(item.usdcSize)}</p><p className="mt-1 text-[10px] text-muted-foreground">USDC value</p></>}
          {validTime && <time dateTime={item.publishedAt} title={formatSourceTime(item.publishedAt)} className="mt-1 block text-[10px] text-muted-foreground">{formatDistanceToNowStrict(time, { addSuffix: true })}</time>}
        </div>
        <details className="col-span-2 text-[11px] text-muted-foreground">
          <summary className="w-fit cursor-pointer rounded text-muted-foreground/80 underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">Trade details</summary>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-md bg-white/[.025] px-3 py-2.5">
            {item.wallet ? profile ? <a href={profile} target="_blank" rel="noopener noreferrer" title={item.wallet} className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline">Wallet {shortWallet(item.wallet)}<ExternalLink className="h-3 w-3" /></a> : <span title={item.wallet}>Wallet {shortWallet(item.wallet)}</span> : <span>Wallet unavailable</span>}
            {item.shares !== undefined && <span>{formatNumber(item.shares)} shares</span>}
            {item.publishedAt && <span>{formatSourceTime(item.publishedAt)}</span>}
          </div>
        </details>
      </article>;
    })}
  </div>;
}

export function PulseList({ items, limit }: { items: FlowframeItem[]; limit?: number }) {
  return <div className="divide-y divide-border/70 rounded-md border border-border/80 bg-background/35 px-3.5">
    {items.slice(0, limit).map((item) => <article key={item.id} data-testid={`row-flowframe-pulse-${item.id}`} className="py-3.5">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[9px] uppercase tracking-wider text-muted-foreground"><span>{item.category}</span>{item.publishedAt && <><span aria-hidden="true">/</span><time dateTime={item.publishedAt}>{formatSourceTime(item.publishedAt)}</time></>}</div>
      <SourceLink item={item} testId={`link-flowframe-pulse-${item.id}`}><span className="mt-1.5 text-sm font-semibold leading-5">{item.title}</span></SourceLink>
    </article>)}
  </div>;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value);
}
