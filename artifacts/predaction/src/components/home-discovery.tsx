import { useRef, type ReactNode } from "react";
import { ArrowRight, ArrowUpRight, Clock3, RotateCw } from "lucide-react";
import { Link } from "wouter";
import { getListEventsQueryKey, useListEvents, type PredictionEvent, type PredictionMarket } from "@workspace/api-client-react";
import { CategoryTag, Change } from "@/components/bits";
import { FlowframeInsights } from "@/components/flowframe-insights";
import { closeLabel, fmtContracts, updatedLabel } from "@/lib/format";

type DiscoveryProps = { onBrowse: (category?: string) => void };

function marketOf(event: PredictionEvent): PredictionMarket | undefined {
  return [...event.markets].sort((a, b) => b.volume - a.volume)[0];
}

function EventLink({ event, children, className = "" }: { event: PredictionEvent; children: ReactNode; className?: string }) {
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
  const sampledTop = [...events].sort((a, b) => b.volume - a.volume).slice(1, 4);
  const sports = events.filter((event) => event.sport).slice(0, 3);
  const categories = [...new Set(events.map((event) => event.category).filter((name) => name && (name !== "Sports" || sports.length === 0)))].slice(0, 5);
  const rankedEvents = [...events].sort((a, b) => b.volume - a.volume);
  const cardEvents = rankedEvents.filter((event, index) => rankedEvents.findIndex((candidate) => candidate.category === event.category) === index).slice(0, 3);
  const scrollToMovers = () => moversRef.current?.scrollIntoView({
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    block: "start",
  });

  return <div className="mx-auto max-w-7xl px-4 pt-5 md:px-6 md:pt-7">
    <nav aria-label="Quick access" className="mb-5 flex flex-wrap items-center gap-x-1 gap-y-1 rounded-lg border border-border bg-card/65 p-1.5">
      <span className="px-3 py-2 font-mono text-[9px] uppercase tracking-[.16em] text-muted-foreground">Quick access</span>
      <QuickLink href="/movers" label="Market movers" />
      <QuickLink href="/traders" label="Tracked wallets" />
      <QuickLink href="/pulse" label="Pulse updates" />
      <QuickLink href="/watchlist" label="Watchlist" />
      <button onClick={() => onBrowse()} data-testid="button-quick-all-markets" className="ml-auto inline-flex items-center gap-1 rounded-md bg-primary/15 px-3 py-2 text-[11px] font-semibold text-primary transition-colors hover:bg-primary/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">All markets <ArrowUpRight className="h-3 w-3" /></button>
    </nav>

    <section aria-label="Featured market discovery" className="grid gap-3 lg:grid-cols-[minmax(0,1.75fr)_minmax(260px,.8fr)]">
      <div className="flex min-h-[250px] flex-col justify-between rounded-lg border border-border bg-card/75 p-5 sm:p-6">
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-2 font-mono text-[9px] font-semibold uppercase tracking-[.18em] text-primary"><span className="live-dot h-1.5 w-1.5 rounded-full bg-primary" /> Open markets · Kalshi</p>
            {feed.data?.updatedAt && <span className="font-mono text-[9px] text-muted-foreground">Sample updated {updatedLabel(feed.data.updatedAt)}</span>}
          </div>
          <h1 className="font-display mt-3 text-2xl font-bold leading-tight tracking-[-.045em] sm:text-3xl">Find the market. Read the outcome.</h1>
          <p className="mt-2 max-w-2xl text-xs leading-5 text-muted-foreground sm:text-sm">A practical desk for current event prices and sourced wallet activity. Kalshi event volume is shown in contracts.</p>
        </div>
        <div className="mt-5">
          {feed.isLoading ? <FeaturedSkeleton /> : feed.isError && !featured ? <PanelError onRetry={() => feed.refetch()} retrying={feed.isFetching} /> : featured ? <FeaturedEvent event={featured} /> : <EmptyPanel label="No open event is available in the current sample." />}
        </div>
      </div>
      <aside className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1" aria-label="More sampled markets">
        {feed.isLoading ? [0, 1].map((i) => <div key={i} className="min-h-28 animate-pulse rounded-lg border border-border bg-card/65" />) :
          feed.isError && !feed.data ? <PanelError onRetry={() => feed.refetch()} retrying={feed.isFetching} /> :
            sampledTop.slice(0, 2).map((event, i) => <CompactFeature key={event.ticker} event={event} index={i + 1} />)}
        <div className="flex items-center justify-between rounded-lg border border-primary/25 bg-primary/[.07] px-4 py-3">
          <div><p className="font-mono text-[9px] uppercase tracking-[.15em] text-primary">Follow the tape</p><p className="mt-1 text-xs text-muted-foreground">Sourced movement across venues</p></div>
          <button type="button" onClick={scrollToMovers} aria-label="Jump to market movers" className="rounded-md p-2 text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><ArrowRight className="h-4 w-4" /></button>
        </div>
      </aside>
    </section>

    <div className="mt-5">
      <FlowframeInsights moversRef={moversRef} />
    </div>

    <section className="mt-8 border-y border-border py-6" aria-label="Sampled market categories">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <SectionHeading eyebrow="From the current sample" title="Browse the board" note="Event cards show current outcomes, not historical price charts." />
        <button onClick={() => onBrowse()} data-testid="button-category-all" className="shrink-0 text-xs font-semibold text-primary underline-offset-4 hover:underline">Open full board <ArrowUpRight className="ml-1 inline h-3 w-3" /></button>
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        {categories.map((category) => <button key={category} onClick={() => onBrowse(category)} data-testid={`button-discovery-category-${category.toLowerCase().replace(/\s+/g, "-")}`} className="rounded-full border border-border px-3 py-1.5 text-[10px] font-semibold text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">{category}<ArrowUpRight className="ml-1 inline h-3 w-3" /></button>)}
        {sports.length > 0 && <button onClick={() => onBrowse("Sports")} data-testid="button-discovery-category-sports" className="rounded-full border border-border px-3 py-1.5 text-[10px] font-semibold text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">Sports<ArrowUpRight className="ml-1 inline h-3 w-3" /></button>}
      </div>
      {feed.isLoading ? <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3"><RowsSkeleton rows={3} /></div> :
        feed.isError && !feed.data ? <PanelError onRetry={() => feed.refetch()} retrying={feed.isFetching} /> :
          events.length ? <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {cardEvents.map((event) => <MarketEventCard key={event.ticker} event={event} />)}
          </div> : <EmptyPanel label="Market cards will appear when the current sample has open events." />}
    </section>
    {feed.data?.warnings?.length ? <p className="mt-4 border-l-2 border-amber-300/60 pl-3 text-xs leading-5 text-muted-foreground">{feed.data.warnings[0]}</p> : null}
  </div>;
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return <Link href={href} className="rounded-md px-3 py-2 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-background/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">{label}</Link>;
}

function FeaturedEvent({ event }: { event: PredictionEvent }) {
  const lead = marketOf(event);
  const outcomes = [...event.markets].sort((a, b) => b.volume - a.volume).slice(0, 3);
  return <article className="rounded-md border border-border/80 bg-background/45 p-4 sm:p-5">
    <div className="flex flex-wrap items-center justify-between gap-2"><CategoryTag category={event.category} sport={event.sport} league={event.league} /><span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Featured · current sample</span></div>
    <EventLink event={event} className="group mt-3 block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
      <h2 className="font-display text-lg font-bold leading-snug tracking-[-.035em] transition-colors group-hover:text-primary sm:text-xl">{event.title}</h2>
      {event.subtitle && <p className="mt-1 text-[11px] text-muted-foreground">{event.subtitle}</p>}
    </EventLink>
    {outcomes.length > 0 ? <div className="mt-4 divide-y divide-border/70 border-y border-border/70">
      {outcomes.map((market) => <OutcomeLine key={market.ticker} market={market} />)}
    </div> : <p className="mt-4 border-y border-border/70 py-3 text-xs text-muted-foreground">No open outcomes available for this event.</p>}
    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
      <span className="inline-flex items-center gap-1.5 font-mono text-[9px] text-muted-foreground"><Clock3 className="h-3 w-3" /> Event · {closeLabel(event.closeTime)}</span>
      <span className="font-mono text-[9px] text-muted-foreground">{fmtContracts(lead?.volume ?? event.volume)} contracts · {lead ? "most-traded outcome" : "event"}</span>
      <EventLink event={event} className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline">Event details <ArrowUpRight className="h-3 w-3" /></EventLink>
    </div>
  </article>;
}

function OutcomeLine({ market }: { market: PredictionMarket }) {
  return <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-2.5">
    <div className="min-w-0"><p className="truncate text-xs font-semibold">{market.subtitle || market.title}</p><p className="mt-0.5 text-[9px] text-muted-foreground">Market · {closeLabel(market.closeTime)} · {fmtContracts(market.volume)} contracts</p></div>
    <div className="text-right"><p className="font-mono text-sm font-semibold tabular">{Math.round(market.probability)}<span className="text-[10px] text-muted-foreground">%</span></p><Change value={market.change} /></div>
  </div>;
}

function CompactFeature({ event, index }: { event: PredictionEvent; index: number }) {
  const lead = marketOf(event);
  return <article className="flex min-h-[112px] flex-col justify-between rounded-lg border border-border bg-card/65 p-4 transition-colors hover:border-primary/35">
    <div className="flex items-center justify-between gap-2"><CategoryTag category={event.category} sport={event.sport} league={event.league} /><span className="font-mono text-[9px] text-muted-foreground">Sample {String(index).padStart(2, "0")}</span></div>
    <EventLink event={event} className="group mt-2 block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
      <p className="line-clamp-2 text-xs font-semibold leading-4 group-hover:text-primary">{event.title}</p>
      {event.subtitle && <p className="mt-1 truncate text-[10px] text-muted-foreground">{event.subtitle}</p>}
    </EventLink>
    <div className="mt-2 flex items-end justify-between gap-2"><span className="text-[9px] text-muted-foreground">{lead ? `${lead.subtitle || lead.title} · ${fmtContracts(lead.volume)} contracts` : `${fmtContracts(event.volume)} contracts`}</span><span className="shrink-0 font-mono text-sm font-semibold tabular">{lead ? `${Math.round(lead.probability)}%` : "—"}</span></div>
  </article>;
}

function MarketEventCard({ event }: { event: PredictionEvent }) {
  const markets = [...event.markets].sort((a, b) => b.volume - a.volume).slice(0, 3);
  return <article className="rounded-lg border border-border bg-card/60 p-4 transition-colors hover:border-primary/35">
    <div className="flex items-center justify-between gap-2"><CategoryTag category={event.category} sport={event.sport} league={event.league} /><span className="font-mono text-[9px] text-muted-foreground">{fmtContracts(event.volume)} contracts</span></div>
    <EventLink event={event} className="group mt-3 block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><h3 className="line-clamp-2 min-h-10 text-sm font-semibold leading-5 group-hover:text-primary">{event.title}</h3>{event.subtitle && <p className="mt-1 truncate text-[10px] text-muted-foreground">{event.subtitle}</p>}</EventLink>
    <div className="mt-3 divide-y divide-border/70 border-y border-border/70">
      {markets.length ? markets.map((market) => <div key={market.ticker} className="flex items-center justify-between gap-2 py-2">
        <div className="min-w-0"><p className="truncate text-[10px] font-medium">{market.subtitle || market.title}</p><p className="text-[9px] text-muted-foreground">{fmtContracts(market.volume)} contracts</p></div>
        <span className="font-mono text-xs font-semibold tabular">{Math.round(market.probability)}%</span>
      </div>) : <p className="py-2 text-[10px] text-muted-foreground">No open outcomes available.</p>}
    </div>
    <div className="mt-3 flex items-center justify-between gap-2 text-[9px] text-muted-foreground"><span>Event · {closeLabel(event.closeTime)}</span><EventLink event={event} className="font-semibold text-primary hover:underline">Details <ArrowUpRight className="inline h-3 w-3" /></EventLink></div>
  </article>;
}

function SectionHeading({ eyebrow, title, note }: { eyebrow: string; title: string; note?: string }) {
  return <div><p className="font-mono text-[9px] uppercase tracking-[.17em] text-primary">{eyebrow}</p><h2 className="font-display mt-1 text-xl font-bold tracking-[-.035em] sm:text-2xl">{title}</h2>{note && <p className="mt-1 text-[11px] text-muted-foreground">{note}</p>}</div>;
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
