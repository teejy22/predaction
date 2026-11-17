import { useRef } from "react";
import { ArrowDownRight, ArrowUpRight, ArrowUp, Clock3, RotateCw } from "lucide-react";
import { Link } from "wouter";
import { getListEventsQueryKey, useListEvents, type PredictionEvent, type PredictionMarket } from "@workspace/api-client-react";
import { CategoryTag, Change } from "@/components/bits";
import { closeLabel, fmtContracts, updatedLabel } from "@/lib/format";

type DiscoveryProps = {
  onBrowse: (category?: string) => void;
};

function marketOf(event: PredictionEvent): PredictionMarket | undefined {
  return [...event.markets].sort((a, b) => b.volume - a.volume)[0];
}

function EventLink({ event, children, className = "" }: { event: PredictionEvent; children: React.ReactNode; className?: string }) {
  return <Link href={`/event/${encodeURIComponent(event.ticker)}`} className={className}>{children}</Link>;
}

export function HomeDiscovery({ onBrowse }: DiscoveryProps) {
  const moversRef = useRef<HTMLDivElement>(null);
  const query = { sort: "volume" as const, offset: 0, limit: 100 };
  const feed = useListEvents(query, {
    query: { queryKey: getListEventsQueryKey(query), refetchInterval: 60000 },
  });
  const events = feed.data?.events ?? [];
  const featured = events[0];
  const activeMarkets = events.flatMap((event) => {
    const market = [...event.markets].sort((a, b) => Math.abs(b.change) - Math.abs(a.change))[0];
    return market ? [{ event, market }] : [];
  });
  const movers = [...activeMarkets].sort((a, b) => Math.abs(b.market.change) - Math.abs(a.market.change)).slice(0, 5);
  const topEvents = [...events].sort((a, b) => b.volume - a.volume).slice(0, 7);
  const sportsEvents = events.filter((event) => event.sport).slice(0, 4);
  const categoryNames = [...new Set(events.map((event) => event.category).filter(Boolean))]
    .filter((name) => name !== "Sports" || sportsEvents.length === 0).slice(0, 3);

  return (
    <div className="mx-auto max-w-7xl px-4 pt-7 md:px-6 md:pt-10">
      <section className="grid gap-6 border-b border-border pb-8 lg:grid-cols-[1.08fr_.92fr] lg:gap-8 lg:pb-10" aria-label="Featured market">
        <div className="rise flex flex-col justify-center py-2">
          <p className="flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[.19em] text-primary">
            <span className="live-dot h-1.5 w-1.5 rounded-full bg-primary" /> The market, in motion
            {feed.data?.updatedAt && <span className="font-normal tracking-normal text-muted-foreground">· updated {updatedLabel(feed.data.updatedAt)}</span>}
          </p>
          <h1 className="font-display mt-4 max-w-[660px] text-[2.6rem] font-bold leading-[.98] tracking-[-.055em] sm:text-6xl lg:text-[4.35rem]">
            See what moved.<br />Know <span className="font-editorial text-primary">why.</span> Follow <span className="font-editorial">what’s behind it.</span>
          </h1>
          <p className="mt-5 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
            Crowd prices across Kalshi’s open events—clear, current, and without a forecast of our own. Find the markets worth a closer look.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button onClick={() => moversRef.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" })} data-testid="button-hero-browse" className="rounded-md bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background">See market movers</button>
            <button onClick={() => onBrowse()} data-testid="button-hero-board" className="rounded-md border border-border px-4 py-2.5 text-xs font-semibold text-foreground transition-colors hover:border-primary/60 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">Browse all markets</button>
            <Link href="/watchlist" data-testid="link-hero-watchlist" className="ml-1 inline-flex items-center gap-1.5 px-2 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">Your watchlist <ArrowUpRight className="h-3.5 w-3.5" /></Link>
          </div>
        </div>
        <div className="min-w-0">
          {feed.isLoading ? <FeaturedSkeleton /> : feed.isError && !featured ? <PanelError onRetry={() => feed.refetch()} retrying={feed.isFetching} /> : featured ? <FeaturedEvent event={featured} /> : <div className="rounded-lg border border-dashed border-border p-7 text-sm text-muted-foreground">No featured open event is available in this sample right now.</div>}
        </div>
      </section>

      <section className="grid gap-5 py-8 lg:grid-cols-[1.55fr_.85fr]" aria-label="Market activity">
        <div ref={moversRef} className="min-w-0 scroll-mt-20">
          <SectionHeading eyebrow="From sampled active markets" title="Biggest movers" note="Change from the previous API price · percentage points" />
          {feed.isLoading ? <RowsSkeleton rows={4} /> : feed.isError && !feed.data ? <PanelError onRetry={() => feed.refetch()} retrying={feed.isFetching} /> : movers.length ? (
            <div className="mt-3 overflow-hidden rounded-lg border border-border bg-card/70">
              {movers.map(({ event, market }, i) => (
                <EventMarketRow key={market.ticker} event={event} market={market} index={i} />
              ))}
            </div>
          ) : <EmptyPanel label="No market changes in the current sample." />}
        </div>
        <aside className="flex min-w-0 flex-col rounded-lg border border-border bg-card/70 p-4 sm:p-5" aria-label="Live market pulse">
          <SectionHeading eyebrow="Live market pulse" title="What’s on the board" />
          {feed.data ? (
            <>
              <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-5">
                <PulseMetric label="Open events sampled" value={feed.data.events.length.toLocaleString()} />
                <PulseMetric label="Indexed events" value={feed.data.indexedEvents.toLocaleString()} />
                <PulseMetric label="Contracts in sample" value={fmtContracts(events.reduce((sum, event) => sum + event.volume, 0))} />
                <PulseMetric label="Categories in sample" value={new Set(events.map((event) => event.category).filter(Boolean)).size.toString()} />
              </div>
              <div className="mt-auto border-t border-border pt-4">
                <p className="text-xs leading-5 text-muted-foreground">A bounded active-market sample, not a complete catalog or a global ranking.</p>
                {feed.data.indexing && <p className="mt-2 text-xs text-primary">The open-event index is still building.</p>}
                {feed.data.partial && <p className="mt-2 text-xs text-amber-200">Some source data could not be loaded in this cycle.</p>}
              </div>
            </>
          ) : feed.isLoading ? <div className="mt-5 space-y-4"><div className="h-12 animate-pulse rounded bg-muted" /><div className="h-12 animate-pulse rounded bg-muted" /></div> : <p className="mt-5 text-sm text-muted-foreground">Pulse data is temporarily unavailable.</p>}
        </aside>
      </section>

      <section className="border-y border-border py-7" aria-label="Browse categories">
        <div className="mb-4 flex items-end justify-between gap-3">
          <SectionHeading eyebrow="Across the board" title="Explore by category" />
          <button onClick={() => onBrowse()} data-testid="button-category-all" className="shrink-0 text-xs font-semibold text-primary underline-offset-4 hover:underline">All markets <ArrowUpRight className="ml-1 inline h-3 w-3" /></button>
        </div>
        {feed.isLoading ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><div className="h-32 animate-pulse rounded-lg bg-muted" /><div className="h-32 animate-pulse rounded-lg bg-muted" /><div className="h-32 animate-pulse rounded-lg bg-muted" /></div> : feed.isError && !feed.data ? <PanelError onRetry={() => feed.refetch()} retrying={feed.isFetching} /> : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {categoryNames.map((name) => <CategoryPanel key={name} name={name} events={events.filter((event) => event.category === name).slice(0, 2)} onClick={() => onBrowse(name)} />)}
            {sportsEvents.length > 0 && <SportsPanel events={sportsEvents} onClick={() => onBrowse("Sports")} />}
            {!categoryNames.length && !sportsEvents.length && <EmptyPanel label="Category markets will appear as the sample fills." />}
          </div>
        )}
      </section>

      <section className="py-8" aria-label="Top markets">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <SectionHeading eyebrow="A closer look" title="Top markets" note="By event contract volume in the current sample" />
          <button onClick={() => onBrowse()} data-testid="button-top-markets-all" className="text-xs font-semibold text-primary underline-offset-4 hover:underline">Full market board <ArrowUpRight className="ml-1 inline h-3 w-3" /></button>
        </div>
        {feed.isLoading ? <RowsSkeleton rows={5} /> : feed.isError && !feed.data ? <PanelError onRetry={() => feed.refetch()} retrying={feed.isFetching} /> : topEvents.length ? (
          <div className="overflow-hidden rounded-lg border border-border bg-card/60">
            <div className="hidden grid-cols-[minmax(200px,1fr)_minmax(130px,.7fr)_90px_110px] gap-4 border-b border-border bg-muted/50 px-4 py-2.5 font-mono text-[9px] uppercase tracking-[.16em] text-muted-foreground sm:grid">
              <span>Event</span><span>Leading outcome</span><span className="text-right">Chance</span><span className="text-right">Contracts</span>
            </div>
            {topEvents.map((event) => {
              const market = marketOf(event);
              return <TopMarketRow key={event.ticker} event={event} market={market} />;
            })}
          </div>
        ) : <EmptyPanel label="No open markets are available in the active sample." />}
      </section>
      {feed.data?.warnings?.length ? <p className="mb-6 border-l-2 border-amber-300/60 pl-3 text-xs leading-5 text-muted-foreground">{feed.data.warnings[0]}</p> : null}
    </div>
  );
}

function FeaturedEvent({ event }: { event: PredictionEvent }) {
  const lead = marketOf(event);
  return (
    <article className="rise relative overflow-hidden rounded-lg border border-border bg-[linear-gradient(135deg,hsl(258_42%_13%),hsl(234_24%_9%)_68%)] p-5 sm:p-6">
      <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-14 h-48 w-48 rounded-full border border-primary/15" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-3 -top-7 h-32 w-32 rounded-full border border-primary/15" />
      <div className="relative">
        <div className="flex items-center justify-between gap-2">
          <CategoryTag category={event.category} sport={event.sport} league={event.league} />
          <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Featured event</span>
        </div>
        <EventLink event={event} className="group mt-4 block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
          <h2 className="font-display max-w-lg text-2xl font-bold leading-tight tracking-[-.04em] transition-colors group-hover:text-primary sm:text-[1.8rem]">{event.title}</h2>
          {event.subtitle && <p className="mt-1.5 text-xs text-muted-foreground">{event.subtitle}</p>}
        </EventLink>
        <div className="mt-5 border-y border-border/80 py-3">
          <p className="mb-2 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Most-traded outcome</p>
          {lead ? <div className="grid grid-cols-[1fr_auto] items-center gap-3">
            <div className="min-w-0"><p className="truncate text-sm font-semibold">{lead.subtitle || lead.title}</p><p className="mt-1 font-mono text-[10px] text-muted-foreground">{fmtContracts(lead.volume)} contracts</p></div>
            <div className="text-right"><p className="font-mono text-2xl font-semibold tabular">{Math.round(lead.probability)}<span className="text-sm text-muted-foreground">%</span></p><Change value={lead.change} /></div>
          </div> : <p className="text-sm text-muted-foreground">No open outcome available.</p>}
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground"><Clock3 className="h-3 w-3" /> {closeLabel(event.closeTime)}</span>
          <EventLink event={event} className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline">Explore event <ArrowUpRight className="h-3.5 w-3.5" /></EventLink>
        </div>
      </div>
    </article>
  );
}

function EventMarketRow({ event, market, index }: { event: PredictionEvent; market: PredictionMarket; index: number }) {
  const positive = market.change >= 0;
  const Arrow = positive ? ArrowUp : ArrowDownRight;
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 border-b border-border/80 px-3.5 py-3 transition-colors hover:bg-white/[.025] last:border-0 sm:grid-cols-[minmax(0,1fr)_90px_90px_92px] sm:px-4">
      <div className="min-w-0">
        <p className="mb-1 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">{event.category || event.sport || "Open market"} <span className="px-1 opacity-50">/</span> {market.subtitle || market.title}</p>
        <EventLink event={event} className="group block truncate text-xs font-semibold leading-5 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:text-sm">{event.title}</EventLink>
      </div>
      <span className="font-mono text-xs tabular text-muted-foreground">{Math.round(market.probability)}%</span>
      <span className="hidden font-mono text-[10px] text-muted-foreground sm:block" title="Contracts traded in the last 24 hours">{fmtContracts(market.volume24h)} / 24h</span>
      <EventLink event={event} className={`inline-flex items-center justify-end gap-1 font-mono text-xs font-semibold tabular ${positive ? "text-emerald-300" : "text-rose-300"}`} aria-label={`${market.change > 0 ? "Up" : "Down"} ${Math.abs(market.change).toFixed(1)} percentage points`}>
        <Arrow className="h-3 w-3" />{market.change > 0 ? "+" : ""}{market.change.toFixed(1)} pp
      </EventLink>
      <span className="sr-only">Sample mover {index + 1}</span>
    </div>
  );
}

function CategoryPanel({ name, events, onClick }: { name: string; events: PredictionEvent[]; onClick: () => void }) {
  return (
    <article className="rounded-lg border border-border bg-card/55 p-3.5 transition-colors hover:border-primary/40">
      <button onClick={onClick} data-testid={`button-discovery-category-${name.toLowerCase().replace(/\s+/g, "-")}`} className="flex w-full items-center justify-between text-left font-display text-base font-semibold tracking-tight hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
        {name}<ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
      </button>
      <div className="mt-2.5 space-y-2.5">
        {events.map((event) => <CompactEvent key={event.ticker} event={event} />)}
        {!events.length && <p className="text-xs text-muted-foreground">No sampled events yet.</p>}
      </div>
    </article>
  );
}

function SportsPanel({ events, onClick }: { events: PredictionEvent[]; onClick: () => void }) {
  return (
    <article className="rounded-lg border border-border bg-card/55 p-3.5 transition-colors hover:border-primary/40">
      <button onClick={onClick} data-testid="button-discovery-category-sports" className="flex w-full items-center justify-between text-left font-display text-base font-semibold tracking-tight hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
        Sports <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
      </button>
      <div className="mt-2.5 space-y-2.5">{events.slice(0, 2).map((event) => <CompactEvent key={event.ticker} event={event} />)}</div>
    </article>
  );
}

function CompactEvent({ event }: { event: PredictionEvent }) {
  const market = marketOf(event);
  return <EventLink event={event} className="group block border-t border-border/70 pt-2 first:border-0 first:pt-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
    <p className="line-clamp-2 text-xs font-medium leading-4 transition-colors group-hover:text-primary">{event.title}</p>
    <div className="mt-1.5 flex items-center justify-between gap-2 font-mono text-[9px] text-muted-foreground"><span>{market ? `${Math.round(market.probability)}%` : "—"} implied</span><span>{fmtContracts(event.volume)} contracts</span></div>
  </EventLink>;
}

function TopMarketRow({ event, market }: { event: PredictionEvent; market?: PredictionMarket }) {
  return <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 border-b border-border/80 px-3.5 py-3 last:border-0 sm:grid-cols-[minmax(200px,1fr)_minmax(130px,.7fr)_90px_110px] sm:gap-4 sm:px-4">
    <div className="min-w-0"><div className="mb-1"><CategoryTag category={event.category} sport={event.sport} league={event.league} /></div><EventLink event={event} className="block truncate text-xs font-semibold hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:text-sm">{event.title}</EventLink></div>
    <p className="hidden truncate text-xs text-muted-foreground sm:block">{market ? market.subtitle || market.title : "No open outcome"}</p>
    <span className="text-right font-mono text-sm font-semibold tabular">{market ? `${Math.round(market.probability)}%` : "—"}</span>
    <span className="col-span-2 font-mono text-[10px] text-muted-foreground sm:col-auto sm:text-right sm:text-xs">{fmtContracts(event.volume)} contracts <span className="sm:hidden">· {market ? market.subtitle || market.title : "No outcome"}</span></span>
  </div>;
}

function SectionHeading({ eyebrow, title, note }: { eyebrow: string; title: string; note?: string }) {
  return <div><p className="font-mono text-[9px] uppercase tracking-[.17em] text-primary">{eyebrow}</p><h2 className="font-display mt-1 text-xl font-bold tracking-[-.035em] sm:text-2xl">{title}</h2>{note && <p className="mt-1 text-[11px] text-muted-foreground">{note}</p>}</div>;
}

function PulseMetric({ label, value }: { label: string; value: string }) {
  return <div><p className="font-mono text-xl font-semibold tabular sm:text-2xl">{value}</p><p className="mt-1 text-[10px] leading-4 text-muted-foreground">{label}</p></div>;
}

function FeaturedSkeleton() {
  return <div className="space-y-4 rounded-lg border border-border bg-card p-6"><div className="h-3 w-28 animate-pulse rounded bg-muted" /><div className="h-10 w-4/5 animate-pulse rounded bg-muted" /><div className="h-3 w-2/5 animate-pulse rounded bg-muted" /><div className="h-20 animate-pulse rounded bg-muted" /></div>;
}

function RowsSkeleton({ rows }: { rows: number }) {
  return <div className="mt-3 overflow-hidden rounded-lg border border-border">{Array.from({ length: rows }).map((_, i) => <div key={i} className="flex h-[62px] items-center gap-4 border-b border-border px-4 last:border-0"><div className="h-8 flex-1 animate-pulse rounded bg-muted" /><div className="h-5 w-14 animate-pulse rounded bg-muted" /><div className="h-5 w-16 animate-pulse rounded bg-muted" /></div>)}</div>;
}

function PanelError({ onRetry, retrying }: { onRetry: () => void; retrying: boolean }) {
  return <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-card/70 p-4 text-xs text-muted-foreground"><span>Market sample didn’t load.</span><button onClick={onRetry} className="inline-flex items-center gap-1.5 rounded border border-border px-2.5 py-1.5 font-semibold text-foreground hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" data-testid="button-retry-discovery"><RotateCw className={`h-3 w-3 ${retrying ? "animate-spin" : ""}`} /> Retry</button></div>;
}

function EmptyPanel({ label }: { label: string }) {
  return <div className="rounded-lg border border-dashed border-border px-4 py-6 text-xs text-muted-foreground">{label}</div>;
}
