import { useRef } from "react";
import { Link } from "wouter";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getListSportsGamesQueryKey, useListSportsGames, type ListSportsGamesParams, type SportsGame } from "@workspace/api-client-react";
import { TeamLogos } from "@/components/team-logos";

const DAY = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" });
const TIME = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });
const SHORT_DATE = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", timeZone: "UTC" });

// Game days are published in US Eastern time, so "today" is judged there too.
const WEEKDAY_DATE = new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });

export function formatStartTime(iso: string) {
  return TIME.format(new Date(iso));
}

// Section heading for a game day: Today, Tomorrow, then "Thu, Nov 19".
export function dayHeading(gameDate: string) {
  const label = dayLabel(gameDate);
  return label === "Today" || label === "Tomorrow" ? label : WEEKDAY_DATE.format(new Date(`${gameDate}T12:00:00Z`));
}

export function dayLabel(gameDate: string) {
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
  const params: ListSportsGamesParams = { sort: "upcoming", notStarted: true, offset: 0, limit: 12 };
  if (sport) params.sport = sport;
  if (league) params.league = league;
  // With no sport or league picked, the row sticks to the major American leagues.
  if (!sport && !league) params.major = true;
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
        <h2 className="font-display text-xl font-bold tracking-[-.035em]">Upcoming</h2>
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

// Home-page rail: the same upcoming games, drifting upward in a loop. Hover or keyboard focus pauses it.
export function UpcomingTicker() {
  const params: ListSportsGamesParams = { sort: "upcoming", notStarted: true, major: true, offset: 0, limit: 12 };
  const feed = useListSportsGames(params, {
    query: { queryKey: getListSportsGamesQueryKey(params), refetchInterval: 60000, placeholderData: (prev) => prev },
  });
  const games = feed.data?.games ?? [];
  const loop = games.length > 4;

  return (
    <section className="flex min-h-[360px] flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card/65" aria-label="Upcoming sports events" data-testid="panel-upcoming-ticker">
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <h2 className="font-display text-sm font-bold tracking-[-.02em]">Upcoming games</h2>
        <Link href="/sports" data-testid="link-upcoming-all-sports" className="inline-flex items-center gap-1 text-[10px] font-semibold text-muted-foreground transition-colors hover:text-primary">All sports</Link>
      </div>
      {feed.isLoading ? (
        <div className="space-y-2 p-3" aria-busy="true">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-14 animate-pulse rounded-md bg-muted/60" />)}</div>
      ) : games.length === 0 ? (
        <p className="px-4 py-6 text-xs leading-5 text-muted-foreground">{feed.isError ? "Upcoming games didn't load." : feed.data?.indexing ? "Upcoming games appear here as the sports index loads." : "No upcoming games are scheduled right now."}</p>
      ) : (
        <div className="ticker-viewport relative flex-1 overflow-hidden">
          <div className={`absolute inset-x-0 top-0 ${loop ? "ticker-track" : ""}`} style={loop ? { animationDuration: `${games.length * 4}s` } : undefined}>
            {games.map((game) => <TickerRow key={game.key} game={game} />)}
            {loop && games.map((game) => <TickerRow key={`repeat-${game.key}`} game={game} repeat />)}
          </div>
        </div>
      )}
    </section>
  );
}

function TickerRow({ game, repeat = false }: { game: SportsGame; repeat?: boolean }) {
  const lead = favorite(game);
  const start = game.startTime ? new Date(game.startTime) : undefined;
  const started = !!start && start.getTime() <= Date.now();
  const when = `${game.gameDate ? dayLabel(game.gameDate) : ""}${start ? ` · ${started ? "started " : ""}${TIME.format(start)}` : ""}`;
  return (
    <Link
      href={`/sports/game/${encodeURIComponent(game.key)}`}
      aria-hidden={repeat || undefined}
      tabIndex={repeat ? -1 : undefined}
      data-testid={repeat ? undefined : `row-upcoming-${game.key}`}
      className="group flex h-[68px] items-center gap-3 border-b border-border/60 px-4 transition-colors hover:bg-primary/[.06] focus-visible:bg-primary/[.06] focus-visible:outline-none"
    >
      {game.teams.length ? <TeamLogos teams={game.teams} size="sm" /> : <span className="flex h-9 w-[60px] shrink-0 items-center justify-center rounded-md border border-border/70 px-1 text-center font-mono text-[8px] font-semibold uppercase leading-3 tracking-wider text-primary">{game.league || game.sport || "Sports"}</span>}
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold group-hover:text-primary">{game.title}</p>
        <p className="mt-1 truncate font-mono text-[9px] uppercase tracking-wider text-muted-foreground">{[game.teams.length ? game.league || game.sport : "", when].filter(Boolean).join(" · ")}</p>
      </div>
      {lead && <div className="shrink-0 text-right">
        <p className="font-mono text-sm font-semibold tabular">{Math.round(lead.probability)}%</p>
        <p className="mt-0.5 max-w-[84px] truncate text-[9px] text-muted-foreground">{lead.name}</p>
      </div>}
    </Link>
  );
}
