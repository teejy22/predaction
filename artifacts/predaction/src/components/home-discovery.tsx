import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowRight, ArrowUpRight, ChevronLeft, ChevronRight, Clock3, RotateCw } from "lucide-react";
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
  return <Link href={`/event/${encodeURIComponent(event.ticker)}`} className={className}>{children}</Link>;
}

export function HomeDiscovery({ category, onBrowse }: DiscoveryProps) {
  const moversRef = useRef<HTMLDivElement>(null);
  const query = { sort: "volume" as const, offset: 0, limit: 100 };
  const feed = useListEvents(query, {
    query: { queryKey: getListEventsQueryKey(query), refetchInterval: 60000 },
  });
  const sportsQuery = { category: "Sports", sort: "volume" as const, offset: 0, limit: 6 };
  const sportsFeed = useListEvents(sportsQuery, {
    query: { queryKey: getListEventsQueryKey(sportsQuery), refetchInterval: 60000 },
  });
  const overview = useGetOverview({ query: { queryKey: getGetOverviewQueryKey(), refetchInterval: 60000 } });
  const quickSports = [...(overview.data?.sports ?? [])].sort((a, b) => b.count - a.count).slice(0, 6);
  const quickLeagues = Array.from(new Set((overview.data?.sports ?? []).flatMap((item) => item.leagues)))
    .sort((a, b) => {
      const aCount = overview.data?.sports.find((item) => item.leagues.includes(a))?.count ?? 0;
      const bCount = overview.data?.sports.find((item) => item.leagues.includes(b))?.count ?? 0;
      return bCount - aCount || a.localeCompare(b);
    }).slice(0, 7);
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
  const scrollToMovers = () => moversRef.current?.scrollIntoView({
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    block: "start",
  });

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
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-2 font-mono text-[9px] font-semibold uppercase tracking-[.18em] text-primary"><span className="live-dot h-1.5 w-1.5 rounded-full bg-primary" /> Open markets · Kalshi</p>
            {feed.data?.updatedAt && <span className="font-mono text-[9px] text-muted-foreground">Sample updated {updatedLabel(feed.data.updatedAt)}</span>}
          </div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <h1 className="font-display text-xl font-bold leading-tight tracking-[-.035em]">Featured markets</h1>
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
        <div className="flex items-center justify-between rounded-lg border border-primary/25 bg-primary/[.07] px-4 py-3">
          <div><p className="font-mono text-[9px] uppercase tracking-[.15em] text-primary">Follow the tape</p><p className="mt-1 text-xs text-muted-foreground">Sourced movement across venues</p></div>
          <button type="button" onClick={scrollToMovers} aria-label="Jump to market movers" className="rounded-md p-2 text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><ArrowRight className="h-4 w-4" /></button>
        </div>
      </aside>
    </section>

    <UpcomingSwipe />

    <section className="mt-7 hidden border-y border-border py-6 sm:block" aria-label="Sports markets preview">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[9px] uppercase tracking-[.17em] text-primary">Kalshi · current outcomes</p>
          <h2 className="font-display mt-1 text-xl font-bold tracking-[-.035em] sm:text-2xl">Sports markets</h2>
          <p className="mt-1 text-[11px] text-muted-foreground">A quick read of indexed open sports events. Prices and volume are sourced from Kalshi.</p>
        </div>
        <Link href="/sports" data-testid="link-home-see-all-sports" className="inline-flex items-center gap-1.5 rounded-md border border-primary/35 bg-primary/[.07] px-3 py-2 text-[11px] font-semibold text-primary transition-colors hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
          See all {overview.data?.categories.find((item) => item.name === "Sports")?.count.toLocaleString() ?? sportsFeed.data?.total.toLocaleString() ?? "sports"} indexed events <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>
      {quickSports.length ? <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="mr-1 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">Browse</span>
        {quickSports.map((item) => <Link key={item.name} href={`/sports?sport=${encodeURIComponent(item.name)}`} data-testid={`link-home-sport-${item.name.toLowerCase().replace(/\s+/g, "-")}`} className="rounded-full border border-border px-3 py-1.5 text-[10px] font-semibold text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground">{item.name}</Link>)}
        {quickLeagues.map((league) => {
          const owner = overview.data?.sports.find((item) => item.leagues.includes(league))?.name;
          return <Link key={league} href={`/sports?sport=${encodeURIComponent(owner ?? "")}&league=${encodeURIComponent(league)}`} data-testid={`link-home-league-${league.toLowerCase().replace(/\s+/g, "-")}`} className="rounded-full border border-border/70 bg-card/40 px-3 py-1.5 text-[10px] text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground">{league === "NCAAF" ? "College Football" : league}</Link>;
        })}
      </div> : overview.isLoading ? <div className="mb-4 h-7 w-72 animate-pulse rounded bg-muted" aria-label="Loading sports shortcuts" /> : null}
      {sportsFeed.isLoading ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-56 animate-pulse rounded-lg border border-border bg-card/65" />)}</div> :
        sportsFeed.isError && !sportsFeed.data ? <PanelError onRetry={() => sportsFeed.refetch()} retrying={sportsFeed.isFetching} /> :
          sportsFeed.data?.events.length ? <div className={`grid gap-3 sm:grid-cols-2 lg:grid-cols-3 ${sportsFeed.isPlaceholderData ? "opacity-60" : ""}`}>
            {sportsFeed.data.events.map((event) => <SportsEventCard key={event.ticker} event={event} />)}
          </div> :
            <div className="rounded-lg border border-dashed border-border bg-card/40 px-4 py-6 text-xs text-muted-foreground">
              {sportsFeed.data?.indexing ? "The sports index is building; indexed events will appear as they load." : "No open sports events are currently indexed."}
              {sportsFeed.data?.partial && <span className="ml-1">Results may be partial.</span>}
            </div>}
      {(sportsFeed.data?.indexing || overview.data?.indexing) && <p className="mt-3 text-[10px] text-muted-foreground">The sports index is still building; counts and results may grow.</p>}
      {(sportsFeed.data?.partial || overview.data?.partial) && <p className="mt-2 text-[10px] text-muted-foreground">Partial Kalshi index; indexed counts are not a global market total.</p>}
      {[...(sportsFeed.data?.warnings ?? []), ...(overview.data?.warnings ?? [])].slice(0, 1).map((warning) => <p key={warning} className="mt-2 text-[10px] leading-4 text-muted-foreground">{warning}</p>)}
    </section>

    <div className="mt-5">
      <FlowframeInsights moversRef={moversRef} />
    </div>

    <section className="mt-8 border-border py-0 sm:border-y sm:py-6" aria-label="Sampled market categories">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <SectionHeading eyebrow="From the current sample" title="Most traded" note="Event cards show current outcomes, not historical price charts." />
        <button onClick={() => onBrowse()} data-testid="button-category-all" className="shrink-0 text-xs font-semibold text-primary underline-offset-4 hover:underline">Open full board <ArrowUpRight className="ml-1 inline h-3 w-3" /></button>
      </div>
      <div className="mb-4 hidden flex-wrap gap-2 sm:flex">
        {categories.map((category) => <button key={category} onClick={() => onBrowse(category)} data-testid={`button-discovery-category-${category.toLowerCase().replace(/\s+/g, "-")}`} className="rounded-full border border-border px-3 py-1.5 text-[10px] font-semibold text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">{category}<ArrowUpRight className="ml-1 inline h-3 w-3" /></button>)}
        {sports.length > 0 && <button onClick={() => onBrowse("Sports")} data-testid="button-discovery-category-sports" className="rounded-full border border-border px-3 py-1.5 text-[10px] font-semibold text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">Sports<ArrowUpRight className="ml-1 inline h-3 w-3" /></button>}
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
  return <article className="flex min-h-[388px] animate-in flex-col rounded-md border border-border/80 bg-background/45 p-4 fade-in duration-300 sm:p-5">
    <div className="flex flex-wrap items-center justify-between gap-2"><CategoryTag category={event.category} sport={event.sport} league={event.league} /><span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Most traded</span></div>
    <EventLink event={event} className="group mt-3 block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
      <div className="flex items-start gap-3">
        <MarketVisual event={event} size="lg" />
        <div className="min-w-0">
          <h2 className="font-display text-lg font-bold leading-snug tracking-[-.035em] transition-colors group-hover:text-primary sm:text-xl">{event.title}</h2>
          {event.subtitle && <p className="mt-1 text-[11px] text-muted-foreground">{event.subtitle}</p>}
        </div>
      </div>
    </EventLink>
    {outcomes.length > 0 ? <div className="mt-4 divide-y divide-border/70 border-y border-border/70">
      {outcomes.map((market) => <OutcomeLine key={market.ticker} event={event} market={market} />)}
    </div> : <p className="mt-4 border-y border-border/70 py-3 text-xs text-muted-foreground">No open outcomes available for this event.</p>}
    <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-3">
      <span className="inline-flex items-center gap-1.5 font-mono text-[9px] text-muted-foreground"><Clock3 className="h-3 w-3" /> Event · {closeLabel(event.closeTime)}</span>
      <span className="font-mono text-[9px] text-muted-foreground">{fmtContracts(lead?.volume ?? event.volume)} contracts · {lead ? "most-traded outcome" : "event"}</span>
      <EventLink event={event} className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline">Event details <ArrowUpRight className="h-3 w-3" /></EventLink>
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
      <p className="mt-1 text-[9px] text-muted-foreground">Market · {closeLabel(market.closeTime)}</p>
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
    <div className="mt-3 divide-y divide-border/70 border-y border-border/70">
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
    <div className="mt-3 flex items-center justify-between gap-2 text-[9px] text-muted-foreground"><span>Event · {closeLabel(event.closeTime)}</span><EventLink event={event} className="font-semibold text-primary hover:underline">Details <ArrowUpRight className="inline h-3 w-3" /></EventLink></div>
  </article>;
}

function SectionHeading({ eyebrow, title, note }: { eyebrow: string; title: string; note?: string }) {
  return <div><p className="hidden font-mono text-[9px] uppercase tracking-[.17em] text-primary sm:block">{eyebrow}</p><h2 className="font-display mt-1 text-xl font-bold tracking-[-.035em] sm:text-2xl">{title}</h2>{note && <p className="mt-1 hidden text-[11px] text-muted-foreground sm:block">{note}</p>}</div>;
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
