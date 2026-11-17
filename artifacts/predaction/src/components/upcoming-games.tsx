import { useRef } from "react";
import { Link } from "wouter";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getListSportsGamesQueryKey, useListSportsGames, type ListSportsGamesParams, type SportsGame } from "@workspace/api-client-react";
import { TeamLogos } from "@/components/team-logos";

const DAY = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" });
const TIME = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });
const SHORT_DATE = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", timeZone: "UTC" });

// Game days are published in US Eastern time, so "today" is judged there too.
function dayLabel(gameDate: string) {
  const now = Date.now();
  if (gameDate === DAY.format(now)) return "Today";
  if (gameDate === DAY.format(now + 86_400_000)) return "Tomorrow";
  return SHORT_DATE.format(new Date(`${gameDate}T12:00:00Z`));
}

function favorite(game: SportsGame) {
  const event = game.events.find((item) => item.markets.length);
  const market = event && [...event.markets].sort((a, b) => b.probability - a.probability)[0];
  return market ? { name: market.subtitle || market.title, probability: market.probability } : undefined;
}

export function UpcomingGames({ sport, league }: { sport?: string; league?: string }) {
  const railRef = useRef<HTMLDivElement>(null);
  const params: ListSportsGamesParams = { sort: "upcoming", offset: 0, limit: 12 };
  if (sport) params.sport = sport;
  if (league) params.league = league;
  const feed = useListSportsGames(params, {
    query: { queryKey: getListSportsGamesQueryKey(params), refetchInterval: 60000, placeholderData: (prev) => prev },
  });
  const games = feed.data?.games ?? [];
  // The strip is an extra; with nothing scheduled or on failure the page simply goes without it.
  if (!feed.isLoading && games.length === 0) return null;

  const scroll = (direction: 1 | -1) => {
    const rail = railRef.current;
    if (!rail) return;
    rail.scrollBy({
      left: direction * Math.max(200, rail.clientWidth * 0.8),
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  };

  return (
    <section className="mb-6" aria-label="Upcoming games" data-testid="section-upcoming-games">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-baseline gap-2.5">
          <h2 className="font-display text-xl font-bold tracking-[-.035em]">Upcoming</h2>
          <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">Most traded · soonest first</span>
        </div>
        <div className="flex gap-1.5">
          <button type="button" onClick={() => scroll(-1)} aria-label="Scroll upcoming games back" data-testid="button-upcoming-prev" className="rounded-full border border-border bg-card p-1.5 text-muted-foreground transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><ChevronLeft className="h-4 w-4" /></button>
          <button type="button" onClick={() => scroll(1)} aria-label="Scroll upcoming games forward" data-testid="button-upcoming-next" className="rounded-full border border-border bg-card p-1.5 text-muted-foreground transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>
      <div ref={railRef} className="flex snap-x gap-3 overflow-x-auto pb-1 [scrollbar-width:none]">
        {feed.isLoading
          ? Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-[132px] w-48 shrink-0 animate-pulse rounded-lg border border-border bg-card/70" />)
          : games.map((game) => <UpcomingCard key={game.key} game={game} />)}
      </div>
    </section>
  );
}

function UpcomingCard({ game }: { game: SportsGame }) {
  const lead = favorite(game);
  const start = game.startTime ? new Date(game.startTime) : undefined;
  const started = !!start && start.getTime() <= Date.now();
  return (
    <Link
      href={`/sports/game/${encodeURIComponent(game.key)}`}
      data-testid={`card-upcoming-${game.key}`}
      className="group flex h-[132px] w-48 shrink-0 snap-start flex-col rounded-lg border border-border bg-card/75 p-3 transition-colors hover:border-primary/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <div className="flex items-center justify-between gap-2">
        {game.teams.length ? <TeamLogos teams={game.teams} size="sm" /> : <span className="flex h-9 items-center font-mono text-[9px] font-semibold uppercase tracking-[.14em] text-primary">{game.league || game.sport || "Sports"}</span>}
        <span className="text-right font-mono text-[9px] uppercase leading-4 tracking-wider text-muted-foreground">
          {game.teams.length > 0 && (game.league || game.sport) ? <span className="block text-primary">{game.league || game.sport}</span> : null}
          <span className="block">{game.gameDate ? dayLabel(game.gameDate) : ""}{start ? ` · ${started ? "started " : ""}${TIME.format(start)}` : ""}</span>
        </span>
      </div>
      <h3 className="mt-2 line-clamp-2 flex-1 text-xs font-semibold leading-4 group-hover:text-primary">{game.title}</h3>
      {lead && (
        <div className="mt-2 flex items-center justify-between gap-2 border-t border-border/60 pt-2">
          <span className="min-w-0 truncate text-[10px] text-muted-foreground">{lead.name}</span>
          <span className="shrink-0 font-mono text-xs font-semibold tabular">{Math.round(lead.probability)}%</span>
        </div>
      )}
    </Link>
  );
}
