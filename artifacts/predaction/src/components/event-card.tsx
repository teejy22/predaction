import { Link } from "wouter";
import { ArrowUpRight, Clock } from "lucide-react";
import type { PredictionEvent, PredictionMarket } from "@workspace/api-client-react";
import { Change, CategoryTag, WatchButton } from "@/components/bits";
import { closeLabel, fmtContracts } from "@/lib/format";

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
        return (
          <div
            key={event.ticker}
            data-testid={`card-event-${event.ticker}`}
            className="rise relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-3 border-b border-border/80 px-4 py-4 transition-colors last:border-b-0 hover:bg-white/[.025] sm:px-5 lg:grid-cols-[minmax(250px,1.7fr)_minmax(120px,1fr)_84px_100px_100px_84px_52px] lg:gap-4"
            style={{ animationDelay: `${Math.min(i, 12) * 35}ms` }}
          >
            <div className="relative col-span-2 min-w-0 pr-12 lg:col-span-1 lg:pr-0">
              <div className="mb-1.5"><CategoryTag category={event.category} sport={event.sport} league={event.league} /></div>
              <Link href={`/event/${encodeURIComponent(event.ticker)}`} data-testid={`link-event-${event.ticker}`} className="group inline-flex max-w-full items-center gap-1 font-semibold leading-snug text-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                <span className="line-clamp-2" data-testid={`text-event-title-${event.ticker}`}>{event.title}</span>
                <ArrowUpRight className="h-3.5 w-3.5 shrink-0 opacity-0 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:opacity-100" />
              </Link>
              {event.subtitle && <p className="mt-1 truncate text-xs text-muted-foreground" title={event.subtitle}>{event.subtitle}</p>}
              <p className="mt-1.5 flex items-center gap-1 font-mono text-[10px] text-muted-foreground lg:hidden"><Clock className="h-3 w-3" />{closeLabel(event.closeTime)}</p>
            </div>
            <div className="min-w-0 text-right lg:text-left">
              <span className="block truncate text-xs text-muted-foreground lg:text-sm lg:text-foreground">{market ? (market.subtitle || market.title) : "No open outcome"}</span>
              <span className="mt-1 block font-mono text-[10px] text-muted-foreground lg:hidden">{fmtContracts(event.volume)} contracts · {fmtContracts(event.volume24h)} today</span>
            </div>
            <div className="col-start-2 row-start-2 text-right lg:col-auto lg:row-auto">
              <span className="font-mono text-lg font-semibold tabular">{market ? `${Math.round(market.probability)}%` : "—"}</span>
            </div>
            <span className="hidden text-right font-mono text-xs tabular text-muted-foreground lg:block">{fmtContracts(event.volume)}</span>
            <span className="hidden text-right font-mono text-xs tabular text-muted-foreground lg:block">{fmtContracts(event.volume24h)}</span>
            <span className="hidden text-right lg:block">{market ? <Change value={market.change} /> : <span className="text-muted-foreground">—</span>}</span>
            <div className="absolute right-4 top-4 flex justify-end lg:static lg:col-auto lg:row-auto">
              <WatchButton event={{ ticker: event.ticker, title: event.title, category: event.category, sport: event.sport, league: event.league }} />
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
