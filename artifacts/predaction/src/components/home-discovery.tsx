import { eventHref } from "@/lib/event-href";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, RotateCw } from "lucide-react";
import { Link } from "wouter";
import { getGetOverviewQueryKey, getListEventsQueryKey, useGetOverview, useListEvents, type PredictionEvent, type PredictionMarket } from "@workspace/api-client-react";
import { CategoryTag, Change, ProbBar } from "@/components/bits";
import { CategoryRail, SWIPE_ITEM, SWIPE_ROW, UpcomingSwipe } from "@/components/home-mobile";
import { FlowframeInsights } from "@/components/flowframe-insights";
import { MarketVisual } from "@/components/market-visual";
import { PromoBars } from "@/components/promo-bars";
import { UpcomingTicker } from "@/components/upcoming-games";
import { SportsEventCard } from "@/components/sports-event-card";
import { closeLabel, fmtContracts, updatedLabel } from "@/lib/format";

type DiscoveryProps = { category: string; onBrowse: (category?: string) => void };

function marketOf(event: PredictionEvent): PredictionMarket | undefined {
  return [...event.markets].sort((a, b) => b.volume - a.volume)[0];
}

function EventLink({ event, children, className = "" }: { event: PredictionEvent; children: ReactNode; className?: string }) {
  return <Link href={eventHref(event)} className={className}>{children}</Link>;
}

export function HomeDiscovery({ category, onBrowse }: DiscoveryProps) {
  const moversRef = useRef<HTMLDivElement>(null);
  const query = { sort: "volume" as const, offset: 0, limit: 100 };
  const feed = useListEvents(query, {
    query: { queryKey: getListEventsQueryKey(query), refetchInterval: 60000 },
  });
  const politicsQuery = { category: "Politics", sort: "volume" as const, offset: 0, limit: 6 };
  const politicsFeed = useListEvents(politicsQuery, {
    query: { queryKey: getListEventsQueryKey(politicsQuery), refetchInterval: 60000 },
  });
  const overview = useGetOverview({ query: { queryKey: getGetOverviewQueryKey(), refetchInterval: 60000 } });
  const politicsCount = overview.data?.categories.find((item) => item.name === "Politics")?.count;
  const events = feed.data?.events ?? [];
  // The featured set is the most traded events, at most two per category so it stays varied.
  const featuredSet = pickFeatured(events);
  const [slide, setSlide] = useState(0);
  const [autoplay, setAutoplay] = useState(true);
  const hovering = useRef(false);
  const slides = featuredSet.length;
  const current = slides ? slide % slides : 0;
  const featured = featuredSet[current];
  const step = (direction: 1 | -1) => {
    setAutoplay(false);
    setSlide((value) => (value % slides + direction + slides) % slides);
  };
  useEffect(() => {
    if (!autoplay || slides < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => {
      if (!hovering.current && !document.hidden) setSlide((value) => (value + 1) % slides);
    }, 8000);
    return () => window.clearInterval(timer);
  }, [autoplay, slides]);
  const sports = events.filter((event) => event.sport).slice(0, 3);
  const categories = [...new Set(events.map((event) => event.category).filter((name) => name && (name !== "Sports" || sports.length === 0)))].slice(0, 5);
  const rankedEvents = [...events].sort((a, b) => b.volume - a.volume);
  const cardEvents = rankedEvents.filter((event, index) => rankedEvents.findIndex((candidate) => candidate.category === event.category) === index).slice(0, 3);

  return <div className="mx-auto max-w-7xl px-4 pt-5 md:px-6 md:pt-7">
    <PromoBars />
    <CategoryRail categories={overview.data?.categories ?? []} active={category} onBrowse={onBrowse} />

    <section aria-label="Featured market discovery" className="grid gap-3 lg:grid-cols-[minmax(0,1.75fr)_minmax(260px,.8fr)]">
      <div
        className="flex min-h-[250px] flex-col justify-between rounded-lg border border-border bg-card/75 p-5 sm:p-6"
        onMouseEnter={() => { hovering.current = true; }}
        onMouseLeave={() => { hovering.current = false; }}
        onFocusCapture={() => setAutoplay(false)}
      >
        <div>
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
              <h1 className="font-display text-xl font-bold leading-tight tracking-[-.035em]">Featured markets</h1>
              {feed.data?.updatedAt && <span className="font-mono text-[9px] text-muted-foreground">Kalshi · updated {updatedLabel(feed.data.updatedAt)}</span>}
            </div>
            {slides > 1 && <div className="flex items-center gap-2" role="group" aria-label="Featured markets">
              <button type="button" onClick={() => step(-1)} aria-label="Previous featured market" data-testid="button-featured-prev" className="rounded-full border border-border bg-background/50 p-1.5 text-muted-foreground transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><ChevronLeft className="h-4 w-4" /></button>
              <span className="min-w-[3.25rem] text-center font-mono text-[10px] text-muted-foreground tabular" aria-live="polite" data-testid="text-featured-position">{current + 1} of {slides}</span>
              <button type="button" onClick={() => step(1)} aria-label="Next featured market" data-testid="button-featured-next" className="rounded-full border border-border bg-background/50 p-1.5 text-muted-foreground transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><ChevronRight className="h-4 w-4" /></button>
            </div>}
          </div>
        </div>
        <div className="mt-5">
          {feed.isLoading ? <FeaturedSkeleton /> : feed.isError && !featured ? <PanelError onRetry={() => feed.refetch()} retrying={feed.isFetching} /> : featured ? <FeaturedEvent key={featured.ticker} event={featured} /> : <EmptyPanel label="No open event is available in the current sample." />}
        </div>
      </div>
      <aside className="hidden flex-col gap-3 sm:flex" aria-label="Upcoming sports events">
        <UpcomingTicker />
      </aside>
    </section>

    <UpcomingSwipe />

    <section className="mt-7 hidden border-y border-border py-6 sm:block" aria-label="Politics markets preview" data-testid="section-home-politics">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold tracking-[-.035em] sm:text-2xl">Politics markets</h2>
          <p className="mt-1 text-[11px] text-muted-foreground">Most traded open events. Prices and volume from Kalshi.</p>
        </div>
        <button type="button" onClick={() => onBrowse("Politics")} data-testid="button-home-see-all-politics" className="inline-flex items-center gap-1.5 rounded-md border border-primary/35 bg-primary/[.07] px-3 py-2 text-[11px] font-semibold text-primary transition-colors hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
          See all {politicsCount?.toLocaleString() ?? politicsFeed.data?.total.toLocaleString() ?? "politics"} politics events
        </button>
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {["Politics", "Elections", "Economics", "World"].filter((name) => (overview.data?.categories.find((item) => item.name === name)?.count ?? 0) > 0).map((name) => (
          <button key={name} type="button" onClick={() => onBrowse(name)} data-testid={`button-home-politics-${name.toLowerCase()}`} className="rounded-full border border-border px-3 py-1.5 text-[10px] font-semibold text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">{name}</button>
        ))}
      </div>
      {politicsFeed.isLoading ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-56 animate-pulse rounded-lg border border-border bg-card/65" />)}</div> :
        politicsFeed.isError && !politicsFeed.data ? <PanelError onRetry={() => politicsFeed.refetch()} retrying={politicsFeed.isFetching} /> :
          politicsFeed.data?.events.length ? <div className={`grid gap-3 sm:grid-cols-2 lg:grid-cols-3 ${politicsFeed.isPlaceholderData ? "opacity-60" : ""}`}>
            {politicsFeed.data.events.map((event) => <SportsEventCard key={event.ticker} event={event} showCategory={false} />)}
          </div> :
            <div className="rounded-lg border border-dashed border-border bg-card/40 px-4 py-6 text-xs text-muted-foreground">
              {politicsFeed.data?.indexing ? "The index is building; politics events will appear as they load." : "No open politics events are currently indexed."}
              {politicsFeed.data?.partial && <span className="ml-1">Results may be partial.</span>}
            </div>}
      {(politicsFeed.data?.partial || overview.data?.partial) && <p className="mt-2 text-[10px] text-muted-foreground">Partial Kalshi index; indexed counts are not a global market total.</p>}
      {[...(politicsFeed.data?.warnings ?? []), ...(overview.data?.warnings ?? [])].slice(0, 1).map((warning) => <p key={warning} className="mt-2 text-[10px] leading-4 text-muted-foreground">{warning}</p>)}
    </section>

    <div className="mt-5">
      <FlowframeInsights moversRef={moversRef} />
    </div>

    <section className="mt-8 border-border py-0 sm:border-y sm:py-6" aria-label="Sampled market categories">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <h2 className="font-display text-xl font-bold tracking-[-.035em] sm:text-2xl">Most traded</h2>
        <button onClick={() => onBrowse()} data-testid="button-category-all" className="shrink-0 text-xs font-semibold text-primary underline-offset-4 hover:underline">Open full board</button>
      </div>
      <div className="mb-4 hidden flex-wrap gap-2 sm:flex">
        {categories.map((category) => <button key={category} onClick={() => onBrowse(category)} data-testid={`button-discovery-category-${category.toLowerCase().replace(/\s+/g, "-")}`} className="rounded-full border border-border px-3 py-1.5 text-[10px] font-semibold text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">{category}</button>)}
        {sports.length > 0 && <button onClick={() => onBrowse("Sports")} data-testid="button-discovery-category-sports" className="rounded-full border border-border px-3 py-1.5 text-[10px] font-semibold text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">Sports</button>}
      </div>
      {feed.isLoading ? <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3"><RowsSkeleton rows={3} /></div> :
        feed.isError && !feed.data ? <PanelError onRetry={() => feed.refetch()} retrying={feed.isFetching} /> :
          events.length ? <div className={`${SWIPE_ROW} md:grid-cols-2 lg:grid-cols-3`}>
            {cardEvents.map((event) => <div key={event.ticker} className={SWIPE_ITEM}><MarketEventCard event={event} /></div>)}
          </div> : <EmptyPanel label="Market cards will appear when the current sample has open events." />}
    </section>
    {feed.data?.warnings?.length ? <p className="mt-4 border-l-2 border-amber-300/60 pl-3 text-xs leading-5 text-muted-foreground">{feed.data.warnings[0]}</p> : null}
  </div>;
}

function pickFeatured(events: PredictionEvent[]) {
  const perCategory = new Map<string, number>();
  const picked: PredictionEvent[] = [];
  // Feed order is kept: it is the most-traded ranking, and its first events carry official images.
  for (const event of events) {
    const used = perCategory.get(event.category) ?? 0;
    if (used >= 2) continue;
    perCategory.set(event.category, used + 1);
    picked.push(event);
    if (picked.length === 7) break;
  }
  return picked;
}

function FeaturedEvent({ event }: { event: PredictionEvent }) {
  const lead = marketOf(event);
  const outcomes = [...event.markets].sort((a, b) => b.volume - a.volume).slice(0, 3);
  return <article className="flex min-h-[388px] animate-in flex-col fade-in duration-300">
    <CategoryTag category={event.category} sport={event.sport} league={event.league} />
    <EventLink event={event} className="group mt-3 block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
      <div className="flex items-start gap-3">
        <MarketVisual event={event} size="lg" />
        <div className="min-w-0">
          <h2 className="font-display text-lg font-bold leading-snug tracking-[-.035em] transition-colors group-hover:text-primary sm:text-xl">{event.title}</h2>
          {event.subtitle && <p className="mt-1 text-[11px] text-muted-foreground">{event.subtitle}</p>}
        </div>
      </div>
    </EventLink>
    {outcomes.length > 0 ? <div className="mt-4 divide-y divide-border/70 border-t border-border/70">
      {outcomes.map((market) => <OutcomeLine key={market.ticker} event={event} market={market} />)}
    </div> : <p className="mt-4 border-y border-border/70 py-3 text-xs text-muted-foreground">No open outcomes available for this event.</p>}
    <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-3">
      <span className="font-mono text-[9px] text-muted-foreground">{closeLabel(event.closeTime)}</span>
      <span className="font-mono text-[9px] text-muted-foreground">{fmtContracts(lead?.volume ?? event.volume)} contracts · {lead ? "most-traded outcome" : "event"}</span>
      <EventLink event={event} className="text-[11px] font-semibold text-primary hover:underline">Event details</EventLink>
    </div>
  </article>;
}

function OutcomeLine({ event, market }: { event: PredictionEvent; market: PredictionMarket }) {
  return <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 py-3">
    <MarketVisual event={event} market={market} size="sm" />
    <div className="min-w-0">
      <div className="flex items-center justify-between gap-3">
        <p className="truncate text-xs font-semibold">{market.subtitle || market.title}</p>
        <span className="shrink-0 font-mono text-[9px] text-muted-foreground">{fmtContracts(market.volume)} contracts</span>
      </div>
      <ProbBar className="mt-2 h-1.5" value={market.probability} color={market.color} />
      {market.closeTime !== event.closeTime && <p className="mt-1 text-[9px] text-muted-foreground">{closeLabel(market.closeTime)}</p>}
    </div>
    <div className="text-right">
      <p className="font-mono text-sm font-semibold tabular">{Math.round(market.probability)}<span className="text-[10px] text-muted-foreground">%</span></p>
      <Change value={market.change} />
    </div>
  </div>;
}

function MarketEventCard({ event }: { event: PredictionEvent }) {
  const markets = [...event.markets].sort((a, b) => b.volume - a.volume).slice(0, 3);
  return <article className="h-full rounded-2xl border border-border bg-card/60 p-4 transition-colors hover:border-primary/35 sm:rounded-lg">
    <div className="flex items-center justify-between gap-2"><CategoryTag category={event.category} sport={event.sport} league={event.league} /><span className="font-mono text-[9px] text-muted-foreground">{fmtContracts(event.volume)} contracts</span></div>
    <EventLink event={event} className="group mt-3 block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
      <div className="flex items-start gap-3">
        <MarketVisual event={event} size="md" />
        <div className="min-w-0">
          <h3 className="line-clamp-2 min-h-10 text-sm font-semibold leading-5 group-hover:text-primary">{event.title}</h3>
          {event.subtitle && <p className="mt-1 truncate text-[10px] text-muted-foreground">{event.subtitle}</p>}
        </div>
      </div>
    </EventLink>
    <div className="mt-3 divide-y divide-border/70 border-t border-border/70">
      {markets.length ? markets.map((market) => <div key={market.ticker} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 py-2">
        <MarketVisual event={event} market={market} size="sm" />
        <div className="min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-[10px] font-medium">{market.subtitle || market.title}</p>
            <span className="font-mono text-xs font-semibold tabular">{Math.round(market.probability)}%</span>
          </div>
          <ProbBar className="mt-1 h-1" value={market.probability} color={market.color} />
          <p className="mt-1 text-[9px] text-muted-foreground">{fmtContracts(market.volume)} contracts</p>
        </div>
        <Change value={market.change} />
      </div>) : <p className="py-2 text-[10px] text-muted-foreground">No open outcomes available.</p>}
    </div>
    <div className="mt-3 flex items-center justify-between gap-2 text-[9px] text-muted-foreground"><span>{closeLabel(event.closeTime)}</span><EventLink event={event} className="font-semibold text-primary hover:underline">Details</EventLink></div>
  </article>;
}

function FeaturedSkeleton() {
  return <div className="space-y-3 rounded-md border border-border p-4" aria-busy="true"><div className="h-3 w-24 animate-pulse rounded bg-muted" /><div className="h-7 w-4/5 animate-pulse rounded bg-muted" /><div className="h-16 animate-pulse rounded bg-muted" /></div>;
}

function RowsSkeleton({ rows }: { rows: number }) {
  return <div className="space-y-2">{Array.from({ length: rows }).map((_, i) => <div key={i} className="h-24 animate-pulse rounded-lg border border-border bg-card/60" />)}</div>;
}

function PanelError({ onRetry, retrying }: { onRetry: () => void; retrying: boolean }) {
  return <div className="flex items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-card/70 p-4 text-xs text-muted-foreground"><span>Market sample didn’t load.</span><button onClick={onRetry} className="inline-flex items-center gap-1.5 rounded border border-border px-2.5 py-1.5 font-semibold text-foreground hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" data-testid="button-retry-discovery"><RotateCw className={`h-3 w-3 ${retrying ? "animate-spin" : ""}`} /> Retry</button></div>;
}

function EmptyPanel({ label }: { label: string }) {
  return <div className="rounded-lg border border-dashed border-border px-4 py-6 text-xs text-muted-foreground">{label}</div>;
}
