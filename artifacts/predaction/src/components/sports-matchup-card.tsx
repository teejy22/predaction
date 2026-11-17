import { Link } from "wouter";
import { ChevronRight } from "lucide-react";
import type { PredictionMarket, SportsGame, TeamLogo } from "@workspace/api-client-react";
import { dayLabel, formatStartTime } from "@/components/upcoming-games";
import { fmtContracts } from "@/lib/format";

const norm = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

// A logo is shown only when the outcome's name clearly refers to that team.
export function logoFor(market: PredictionMarket, teams: TeamLogo[]) {
  const name = norm(market.subtitle || market.title);
  if (!name) return undefined;
  return teams.find((team) => {
    const full = norm(team.name);
    return full === name || full.startsWith(`${name} `) || name.startsWith(`${full} `) || norm(team.abbreviation) === name;
  });
}

// Compact schedule card: one row per side of the main market.
export function SportsMatchupCard({ game }: { game: SportsGame }) {
  const event = game.events.find((item) => item.markets.length);
  const rows = event ? [...event.markets].sort((a, b) => b.probability - a.probability).slice(0, 3) : [];
  const favorite = rows[0];
  const when = [game.gameDate ? dayLabel(game.gameDate) : "", game.startTime ? formatStartTime(game.startTime) : ""].filter(Boolean).join(" · ");

  return (
    <Link
      href={`/sports/game/${encodeURIComponent(game.key)}`}
      data-testid={`card-matchup-${game.key}`}
      aria-label={`Open all markets for ${game.title}`}
      className="group flex flex-col rounded-lg border border-border bg-card/75 p-3 transition-colors hover:border-primary/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <div className="flex items-center justify-between gap-2 font-mono text-[9px] uppercase tracking-wider">
        <span className="truncate text-muted-foreground">{when || "Scheduled"}</span>
        <span className="shrink-0 font-semibold text-primary">{game.league || game.sport || "Sports"}</span>
      </div>
      {rows.length > 2 || !rows.length ? <p className="mt-2 truncate text-[11px] font-semibold text-foreground/90">{game.title}</p> : null}
      <div className="mt-2 flex-1 space-y-2">
        {rows.length ? rows.map((market) => {
          const logo = logoFor(market, game.teams);
          const lead = market === favorite;
          return (
            <div key={market.ticker} className="flex items-center gap-2.5">
              {logo ? (
                <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-background">
                  <img src={logo.logo} alt="" loading="lazy" referrerPolicy="no-referrer" className="h-[76%] w-[76%] object-contain" />
                </span>
              ) : game.teams.length ? (
                <span className="flex h-7 w-7 shrink-0 items-center justify-center" aria-hidden="true"><span className={`h-5 w-1 rounded-full ${lead ? "bg-primary" : "bg-muted"}`} /></span>
              ) : <span className={`h-7 w-1 shrink-0 rounded-full ${lead ? "bg-primary" : "bg-muted"}`} aria-hidden="true" />}
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold">{market.subtitle || market.title}</p>
                <span className="mt-1 block h-0.5 overflow-hidden rounded-full bg-muted/60" aria-hidden="true">
                  <span className={`block h-full rounded-full ${lead ? "bg-primary" : "bg-muted-foreground/50"}`} style={{ width: `${Math.max(2, Math.min(100, market.probability))}%` }} />
                </span>
              </div>
              <span className={`w-12 shrink-0 rounded-full px-2 py-1 text-center font-mono text-[11px] font-semibold tabular ${lead ? "bg-primary/20 text-[hsl(262_80%_84%)]" : "bg-muted/60 text-muted-foreground"}`}>{Math.round(market.probability)}%</span>
            </div>
          );
        }) : <p className="py-2 text-[10px] text-muted-foreground">No open outcomes available.</p>}
      </div>
      <div className="mt-3 flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
        <span className="font-mono tabular">{fmtContracts(game.volume)} vol</span>
        <span className="inline-flex items-center gap-0.5 font-semibold transition-colors group-hover:text-primary">
          {game.marketCount > rows.length ? `${game.marketCount} markets` : "View details"} <ChevronRight className="h-3 w-3" />
        </span>
      </div>
    </Link>
  );
}
