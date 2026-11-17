import { Link } from "wouter";
import { ArrowUpRight, Clock3 } from "lucide-react";
import type { PredictionEvent, PredictionMarket } from "@workspace/api-client-react";
import { WatchButton } from "@/components/bits";
import { TeamLogos } from "@/components/team-logos";
import { closeLabel, fmtContracts } from "@/lib/format";

function topOutcomes(event: PredictionEvent): PredictionMarket[] {
  return [...event.markets].sort((a, b) => b.volume - a.volume).slice(0, 3);
}

export function SportsEventCard({ event }: { event: PredictionEvent }) {
  const outcomes = topOutcomes(event);

  return (
    <article className="flex min-h-[224px] flex-col rounded-lg border border-border bg-card/75 p-4 transition-colors hover:border-primary/40">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[9px] font-semibold uppercase tracking-[.16em] text-primary">
            {event.league || event.sport || "Sports"} <span className="text-muted-foreground">· Kalshi</span>
          </p>
          <Link
            href={`/event/${encodeURIComponent(event.ticker)}`}
            data-testid={`link-sports-event-${event.ticker}`}
            className="group mt-2 flex items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <TeamLogos teams={event.teams ?? []} size="sm" />
            <span className="min-w-0">
              <h3 className="line-clamp-2 text-sm font-semibold leading-5 group-hover:text-primary">{event.title}</h3>
              {event.subtitle && <p className="mt-1 line-clamp-1 text-[10px] text-muted-foreground">{event.subtitle}</p>}
            </span>
          </Link>
        </div>
        <WatchButton event={{ ticker: event.ticker, title: event.title, category: event.category, sport: event.sport, league: event.league }} />
      </div>

      <div className="mt-4 flex-1 divide-y divide-border/70 border-y border-border/70">
        {outcomes.length ? outcomes.map((market) => (
          <div key={market.ticker} className="flex items-center justify-between gap-3 py-2">
            <div className="min-w-0">
              <p className="truncate text-[11px] font-medium">{market.subtitle || market.title}</p>
              <p className="mt-0.5 font-mono text-[9px] text-muted-foreground">{fmtContracts(market.volume)} contracts</p>
            </div>
            <span className="shrink-0 font-mono text-sm font-semibold tabular">{Math.round(market.probability)}%</span>
          </div>
        )) : <p className="py-3 text-[10px] text-muted-foreground">No open outcomes available.</p>}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 font-mono text-[9px] text-muted-foreground">
          <Clock3 className="h-3 w-3" /> {closeLabel(event.closeTime)}
        </span>
        <Link href={`/event/${encodeURIComponent(event.ticker)}`} className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary hover:underline">
          Event details <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>
    </article>
  );
}
