import { eventHref } from "@/lib/event-href";
import { Link } from "wouter";
import { ArrowUpRight } from "lucide-react";
import type { PredictionEvent, PredictionMarket } from "@workspace/api-client-react";
import { Change, CategoryTag, WatchButton } from "@/components/bits";
import { MarketVisual } from "@/components/market-visual";
import { fmtContracts } from "@/lib/format";

function leaderOf(event: PredictionEvent): PredictionMarket | undefined {
  return [...event.markets].sort((a, b) => b.probability - a.probability)[0];
}

export function EventsTable({ events, removable = false }: { events: PredictionEvent[]; removable?: boolean }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card shadow-[0_18px_60px_-42px_rgba(0,0,0,.9)]" data-testid="table-events">
      <div className="hidden grid-cols-[minmax(250px,1.7fr)_minmax(120px,1fr)_84px_100px_100px_84px_52px] gap-4 border-b border-border bg-muted/70 px-4 py-3 font-mono text-[10px] uppercase tracking-[.15em] text-muted-foreground lg:grid">
        <span>Event</span><span>Leading outcome</span><span className="text-right">Chance</span><span className="text-right">Volume</span><span className="text-right">24h vol</span><span className="text-right" title="Change from Kalshi's previous price">Change</span><span />
      </div>
      {events.map((event, i) => {
        const market = leaderOf(event);
        const watch = { ticker: event.ticker, title: event.title, category: event.category, sport: event.sport, league: event.league };
        return (
          <div key={event.ticker} data-testid={`card-event-${event.ticker}`} className="rise border-b border-border/80 transition-colors last:border-b-0 hover:bg-white/[.025]" style={{ animationDelay: `${Math.min(i, 12) * 35}ms` }}>
            {/* Phones and tablets: one compact line per event with the chance as a pill. */}
            <div className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-3 px-3.5 py-3 sm:px-5 lg:hidden">
              <MarketVisual event={event} market={market} size="md" />
              <Link href={eventHref(event)} data-testid={`link-event-compact-${event.ticker}`} className="min-w-0 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                <span className="line-clamp-2 text-sm font-semibold leading-snug">{event.title}</span>
                <span className="mt-1 block truncate text-[11px] text-muted-foreground">{market ? `${market.subtitle || market.title} · ` : ""}{fmtContracts(event.volume)} vol</span>
              </Link>
              <span className="w-14 rounded-full bg-primary/20 py-2 text-center text-sm font-semibold tabular text-[hsl(262_80%_84%)]">{market ? `${Math.round(market.probability)}%` : "—"}</span>
              <WatchButton event={watch} />
            </div>
            <div className="hidden grid-cols-[minmax(250px,1.7fr)_minmax(120px,1fr)_84px_100px_100px_84px_52px] items-center gap-4 px-5 py-4 lg:grid">
              <div className="flex min-w-0 items-start gap-3">
                <MarketVisual event={event} market={market} size="md" />
                <div className="min-w-0">
                  <div className="mb-1.5"><CategoryTag category={event.category} sport={event.sport} league={event.league} /></div>
                  <Link href={eventHref(event)} data-testid={`link-event-${event.ticker}`} className="group inline-flex max-w-full items-center gap-1 font-semibold leading-snug text-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                    <span className="line-clamp-2" data-testid={`text-event-title-${event.ticker}`}>{event.title}</span>
                    <ArrowUpRight className="h-3.5 w-3.5 shrink-0 opacity-0 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:opacity-100" />
                  </Link>
                  {event.subtitle && <p className="mt-1 truncate text-xs text-muted-foreground" title={event.subtitle}>{event.subtitle}</p>}
                </div>
              </div>
              <span className="block min-w-0 truncate text-sm">{market ? (market.subtitle || market.title) : "No open outcome"}</span>
              <span className="text-right font-mono text-lg font-semibold tabular">{market ? `${Math.round(market.probability)}%` : "—"}</span>
              <span className="text-right font-mono text-xs tabular text-muted-foreground">{fmtContracts(event.volume)}</span>
              <span className="text-right font-mono text-xs tabular text-muted-foreground">{fmtContracts(event.volume24h)}</span>
              <span className="text-right">{market ? <Change value={market.change} /> : <span className="text-muted-foreground">—</span>}</span>
              <div className="flex justify-end"><WatchButton event={watch} /></div>
            </div>
            {removable && <span className="sr-only">Use the bookmark control to remove this event from your watchlist.</span>}
          </div>
        );
      })}
    </div>
  );
}

export function EventCardSkeleton() {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_repeat(3,72px)] items-center gap-4 border-b border-border px-5 py-5">
      <div><div className="h-3 w-28 animate-pulse rounded bg-muted" /><div className="mt-3 h-4 w-3/4 animate-pulse rounded bg-muted" /><div className="mt-2 h-3 w-2/5 animate-pulse rounded bg-muted" /></div>
      {[0, 1, 2].map((i) => <div key={i} className="hidden h-4 animate-pulse rounded bg-muted lg:block" />)}
    </div>
  );
}
