import { useState, type RefObject } from "react";
import { ArrowUpRight } from "lucide-react";
import { Link } from "wouter";
import type { FlowframeFeed } from "@workspace/api-client-react";
import { useFlowframeData } from "@/components/flowframe-data";
import { FeedStatus, FlowframeAttribution } from "@/components/flowframe-feed-ui";
import { MoversList, TradeList } from "@/components/flowframe-lists";

type Venue = "kalshi" | "polymarket";
type Direction = "all" | "up" | "down";

export function FlowframeInsights({ moversRef }: { moversRef?: RefObject<HTMLDivElement | null> }) {
  const [venue, setVenue] = useState<Venue>("kalshi");
  const [direction, setDirection] = useState<Direction>("all");
  const query = useFlowframeData();
  const data = query.data;
  const source: FlowframeFeed | undefined = venue === "kalshi" ? data?.movers : data?.polymarketMovers;
  const movers = (source?.items ?? []).filter((item) => direction === "all" || (direction === "up" ? (item.change ?? 0) > 0 : (item.change ?? 0) < 0));
  const retry = () => { void query.refetch(); };

  return <div className="space-y-4">
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <section ref={moversRef} className="min-w-0 scroll-mt-20 rounded-lg border border-border bg-card/55 p-4 sm:p-5" aria-labelledby="flowframe-movers-title">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div><p className="font-mono text-[9px] uppercase tracking-[.17em] text-primary">Source movement</p>
            <h2 id="flowframe-movers-title" className="font-display mt-1 text-xl font-bold tracking-[-.035em]">Market movers</h2>
            <p className="mt-1 text-[10px] text-muted-foreground">{venue === "kalshi" ? "Kalshi · since midnight UTC · percentage-point move" : "Polymarket · rolling 24 hours · percentage-point move"}</p>
          </div>
          <Link href={`/movers?venue=${venue}&direction=${direction}`} data-testid="link-movers-all" className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-primary hover:underline">All movers <ArrowUpRight className="h-3 w-3" /></Link>
        </header>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex rounded-md border border-border bg-background/60 p-0.5" role="group" aria-label="Choose mover venue">
            {(["kalshi", "polymarket"] as const).map((option) => <button key={option} type="button" aria-pressed={venue === option} onClick={() => setVenue(option)} data-testid={`button-home-movers-${option}`} className={`rounded px-3 py-1.5 text-[10px] font-semibold capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${venue === option ? "bg-primary/20 text-foreground" : "text-muted-foreground hover:text-foreground"}`}>{option}</button>)}
          </div>
          <div className="inline-flex rounded-md border border-border bg-background/60 p-0.5" role="group" aria-label="Filter movers by direction">
            {(["all", "up", "down"] as const).map((option) => <button key={option} type="button" aria-pressed={direction === option} onClick={() => setDirection(option)} data-testid={`button-home-movers-direction-${option}`} className={`rounded px-2.5 py-1.5 text-[10px] font-semibold capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${direction === option ? "bg-primary/20 text-foreground" : "text-muted-foreground hover:text-foreground"}`}>{option}</button>)}
          </div>
        </div>
        <FeedStatus feed={source} loading={query.isLoading} error={query.isError && !data} retrying={query.isFetching} onRetry={retry}>
          {movers.length ? <MoversList items={movers} limit={4} /> : <div className="rounded-md border border-dashed border-border px-3 py-5 text-xs text-muted-foreground">No movers match this direction.</div>}
        </FeedStatus>
      </section>

      <section className="min-w-0 rounded-lg border border-border bg-card/55 p-4 sm:p-5" aria-labelledby="home-trades-title">
        <div className="mb-1 flex flex-wrap items-end justify-between gap-3"><div><p className="font-mono text-[9px] uppercase tracking-[.17em] text-primary">Tracked-wallet activity</p><h2 id="home-trades-title" className="font-display mt-1 text-xl font-bold tracking-[-.035em]">Recent trades</h2><p className="mt-1 text-[10px] text-muted-foreground">Polymarket trades of $1,000+ from tracked wallets.</p></div><Link href="/traders" data-testid="link-traders-all" className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary hover:underline">All trades <ArrowUpRight className="h-3 w-3" /></Link></div>
        <FeedStatus compact feed={data?.trades} loading={query.isLoading} error={query.isError && !data} retrying={query.isFetching} onRetry={retry}>
          {(data?.trades.items ?? []).some((item) => (item.usdcSize ?? 0) >= 1000)
            ? <TradeList items={(data?.trades.items ?? []).filter((item) => (item.usdcSize ?? 0) >= 1000)} limit={3} />
            : <div className="rounded-md border border-dashed border-border px-3 py-5 text-xs text-muted-foreground">No recent tracked-wallet trades at or above $1,000 USDC.</div>}
        </FeedStatus>
      </section>
    </div>

    <FlowframeAttribution refreshMinutes={data?.refreshMinutes ?? 20} />
  </div>;
}
