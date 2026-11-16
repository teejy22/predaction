import { Link } from "wouter";
import { Clock, ArrowUpRight } from "lucide-react";
import type { SportsEvent } from "@workspace/api-client-react";
import { ProbBar, SportTag, WatchButton, Change } from "@/components/bits";
import { closeLabel, fmtCents, fmtContracts, hoursUntil } from "@/lib/format";

export function EventCard({ event, index = 0, featured = false }: { event: SportsEvent; index?: number; featured?: boolean }) {
  const markets = [...event.markets].sort((a, b) => b.probability - a.probability);
  const shown = markets.slice(0, featured ? 4 : 3);
  const soon = hoursUntil(event.closeTime) < 24 && hoursUntil(event.closeTime) > 0;
  return (
    <Link
      href={`/event/${encodeURIComponent(event.ticker)}`}
      data-testid={`card-event-${event.ticker}`}
      style={{ animationDelay: `${Math.min(index, 12) * 40}ms` }}
      className={`rise group relative flex flex-col rounded-lg border-2 border-foreground bg-card p-5 transition-all duration-200 hover:-translate-x-0.5 hover:-translate-y-1 hover:shadow-[6px_6px_0_hsl(var(--foreground))] ${featured ? "md:col-span-2" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <SportTag sport={event.sport} league={event.league} />
          {soon && (
            <span className="inline-flex items-center gap-1 rounded-sm bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase text-primary">
              <span className="live-dot h-1.5 w-1.5 rounded-full bg-primary" /> Closing soon
            </span>
          )}
        </div>
        <WatchButton event={{ ticker: event.ticker, title: event.title, sport: event.sport, league: event.league }} />
      </div>

      <h3 className={`mt-3 font-display font-extrabold uppercase leading-[0.95] ${featured ? "text-3xl md:text-4xl" : "text-2xl"}`} data-testid={`text-event-title-${event.ticker}`}>
        {event.title}
      </h3>
      {event.subtitle && <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{event.subtitle}</p>}

      <div className="mt-4 flex-1 space-y-3">
        {shown.length === 0 && <p className="text-sm text-muted-foreground">No open markets listed.</p>}
        {shown.map((m) => (
          <div key={m.ticker}>
            <div className="mb-1 flex items-baseline justify-between gap-3">
              <span className="line-clamp-1 text-sm font-medium">{m.subtitle || m.title}</span>
              <span className="flex items-baseline gap-2">
                <Change value={m.change} />
                <span className="font-mono text-lg font-bold tabular">{fmtCents(m.probability)}</span>
              </span>
            </div>
            <ProbBar value={m.probability} />
          </div>
        ))}
        {markets.length > shown.length && (
          <p className="font-mono text-xs text-muted-foreground">+{markets.length - shown.length} more markets</p>
        )}
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-dashed border-border pt-3 font-mono text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {closeLabel(event.closeTime)}</span>
        <span className="flex items-center gap-1 tabular">
          {fmtContracts(event.volume)} vol
          <ArrowUpRight className="h-4 w-4 text-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}

export function EventCardSkeleton() {
  return (
    <div className="rounded-lg border-2 border-border bg-card p-5">
      <div className="h-4 w-20 animate-pulse rounded bg-muted" />
      <div className="mt-4 h-7 w-4/5 animate-pulse rounded bg-muted" />
      <div className="mt-2 h-4 w-1/2 animate-pulse rounded bg-muted" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="mt-4">
          <div className="mb-2 h-3 w-full animate-pulse rounded bg-muted" />
          <div className="h-2 w-full animate-pulse rounded-full bg-muted" />
        </div>
      ))}
    </div>
  );
}
