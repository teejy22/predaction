import { ArrowDownRight, ArrowUpRight, ExternalLink } from "lucide-react";
import type { FlowframeItem } from "@workspace/api-client-react";
import { externalHref, formatSourceTime, shortWallet } from "@/components/flowframe-data";
import { SourceLink } from "@/components/flowframe-feed-ui";

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
      return <article key={item.id} data-testid={`row-flowframe-trade-${item.id}`} className="grid gap-3 px-3 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {item.wallet ? profile ? <a href={profile} target="_blank" rel="noopener noreferrer" title={item.wallet} className="font-mono text-[10px] font-semibold text-primary underline-offset-4 hover:underline">{shortWallet(item.wallet)}<ExternalLink className="ml-1 inline h-2.5 w-2.5" /></a> : <span title={item.wallet} className="font-mono text-[10px] font-semibold text-primary">{shortWallet(item.wallet)}</span> : <span className="font-mono text-[10px] text-muted-foreground">Wallet unavailable</span>}
            {item.side && <span className={`rounded px-1.5 py-0.5 font-mono text-[9px] font-bold ${item.side === "BUY" ? "bg-emerald-400/10 text-emerald-200" : "bg-rose-400/10 text-rose-200"}`}>{item.side}</span>}
            {item.publishedAt && <time dateTime={item.publishedAt} className="font-mono text-[9px] text-muted-foreground">{formatSourceTime(item.publishedAt)}</time>}
          </div>
          <SourceLink item={item} testId={`link-flowframe-trade-${item.id}`}><span className="mt-1 block line-clamp-2 text-xs font-semibold leading-5">{item.title}</span></SourceLink>
          {item.outcome && <p className="mt-1 text-[10px] text-muted-foreground">Outcome: <span className="text-foreground/80">{item.outcome}</span></p>}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-[10px] tabular text-muted-foreground sm:justify-end sm:text-right">
          {item.probability !== undefined && <span><b className="font-semibold text-foreground">{item.probability}%</b> traded outcome</span>}
          {item.shares !== undefined && <span><b className="font-semibold text-foreground">{formatNumber(item.shares)}</b> shares</span>}
          {item.usdcSize !== undefined && <span><b className="font-semibold text-foreground">${formatNumber(item.usdcSize)}</b> USDC</span>}
        </div>
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
