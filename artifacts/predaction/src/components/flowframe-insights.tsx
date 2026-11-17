import { useState, type RefObject } from "react";
import { ArrowUpRight, TrendingUp } from "lucide-react";
import { Link } from "wouter";
import type { FlowframeFeed } from "@workspace/api-client-react";
import { useFlowframeData } from "@/components/flowframe-data";
import { FeedStatus, FlowframeAttribution } from "@/components/flowframe-feed-ui";
import { MoversList, PulseList, TradeList } from "@/components/flowframe-lists";

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

  return <div className="space-y-7">
    <section ref={moversRef} className="scroll-mt-20" aria-labelledby="flowframe-movers-title">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="font-mono text-[9px] uppercase tracking-[.17em] text-primary">Cross-venue price movement</p>
          <h2 id="flowframe-movers-title" className="font-display mt-1 text-xl font-bold tracking-[-.035em] sm:text-2xl">Market movers</h2>
          <p className="mt-1 text-[11px] text-muted-foreground">{venue === "kalshi" ? "Kalshi · since midnight UTC · percentage-point move" : "Polymarket · rolling 24 hours · percentage-point move"}</p>
        </div>
        <Link href={`/movers?venue=${venue}&direction=${direction}`} data-testid="link-movers-all" className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline">All movers <ArrowUpRight className="h-3 w-3" /></Link>
      </header>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex rounded-md border border-border bg-background/60 p-0.5" role="group" aria-label="Choose mover venue">
          {(["kalshi", "polymarket"] as const).map((option) => <button key={option} type="button" aria-pressed={venue === option} onClick={() => setVenue(option)} data-testid={`button-home-movers-${option}`} className={`rounded px-3 py-1.5 text-[10px] font-semibold capitalize ${venue === option ? "bg-primary/20 text-foreground" : "text-muted-foreground hover:text-foreground"}`}>{option}</button>)}
        </div>
        <div className="inline-flex rounded-md border border-border bg-background/60 p-0.5" role="group" aria-label="Filter movers by direction">
          {(["all", "up", "down"] as const).map((option) => <button key={option} type="button" aria-pressed={direction === option} onClick={() => setDirection(option)} data-testid={`button-home-movers-direction-${option}`} className={`rounded px-2.5 py-1.5 text-[10px] font-semibold capitalize ${direction === option ? "bg-primary/20 text-foreground" : "text-muted-foreground hover:text-foreground"}`}>{option}</button>)}
        </div>
      </div>
      <FeedStatus feed={source} loading={query.isLoading} error={query.isError && !data} retrying={query.isFetching} onRetry={retry}>
        {movers.length ? <MoversList items={movers} limit={6} /> : <div className="rounded-md border border-dashed border-border px-3 py-5 text-xs text-muted-foreground">No movers match this direction.</div>}
      </FeedStatus>
    </section>

    <div className="grid gap-5 lg:grid-cols-[.9fr_1.1fr]">
      <section className="min-w-0 rounded-lg border border-border bg-card/65 p-4 sm:p-5" aria-labelledby="flowframe-trending-title">
        <div className="flex items-start justify-between gap-3"><div><p className="font-mono text-[9px] uppercase tracking-[.17em] text-primary">Beyond the scoreboard</p><h2 id="flowframe-trending-title" className="font-display mt-1 text-xl font-bold tracking-[-.035em]">Trending markets</h2><p className="mt-1 text-[11px] text-muted-foreground">Ranked by 24-hour volume · excludes sports</p></div><TrendingUp className="mt-1 h-4 w-4 text-primary" /></div>
        <FeedStatus feed={data?.trending} loading={query.isLoading} error={query.isError && !data} retrying={query.isFetching} onRetry={retry}><MoversList items={data?.trending.items ?? []} limit={4} /></FeedStatus>
      </section>
      <section className="min-w-0 rounded-lg border border-border bg-card/65 p-4 sm:p-5" aria-labelledby="flowframe-pulse-title">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-mono text-[9px] uppercase tracking-[.17em] text-primary">Published intelligence</p><h2 id="flowframe-pulse-title" className="font-display mt-1 text-xl font-bold tracking-[-.035em]">Pulse updates</h2><p className="mt-1 text-[11px] text-muted-foreground">Editorial publications, not price timestamps</p></div><Link href="/pulse" data-testid="link-pulse-all" className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-primary hover:underline">View all <ArrowUpRight className="h-3 w-3" /></Link></div>
        <FeedStatus feed={data?.pulse} loading={query.isLoading} error={query.isError && !data} retrying={query.isFetching} onRetry={retry}><PulseList items={data?.pulse.items ?? []} limit={3} /></FeedStatus>
      </section>
    </div>

    <section className="rounded-lg border border-border bg-card/55 p-4 sm:p-5" aria-labelledby="home-trades-title">
      <div className="mb-1 flex flex-wrap items-end justify-between gap-3"><div><h2 id="home-trades-title" className="font-display text-xl font-bold tracking-[-.035em]">Recent trades</h2><p className="mt-1 text-xs text-muted-foreground">Polymarket trades of $1,000+ from wallets tracked by FlowFrame.</p></div><Link href="/traders" data-testid="link-traders-all" className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">View all trades <ArrowUpRight className="h-3 w-3" /></Link></div>
        <FeedStatus compact feed={data?.trades} loading={query.isLoading} error={query.isError && !data} retrying={query.isFetching} onRetry={retry}>
          {(data?.trades.items ?? []).some((item) => (item.usdcSize ?? 0) >= 1000)
            ? <TradeList items={(data?.trades.items ?? []).filter((item) => (item.usdcSize ?? 0) >= 1000)} limit={3} />
            : <div className="rounded-md border border-dashed border-border px-3 py-5 text-xs text-muted-foreground">No recent tracked-wallet trades at or above $1,000 USDC.</div>}
        </FeedStatus>
    </section>
    <FlowframeAttribution refreshMinutes={data?.refreshMinutes ?? 20} />
  </div>;
}
