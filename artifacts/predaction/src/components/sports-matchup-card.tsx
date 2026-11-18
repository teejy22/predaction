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

// Polymarket US chance for one Kalshi winner market; undefined when that side has no usable price.
export function polymarketChance(game: Pick<SportsGame, "polymarket">, marketTicker: string) {
  return game.polymarket?.outcomes.find((outcome) => outcome.marketTicker === marketTicker)?.chance;
}

// Live score for one side, from Polymarket US; only present while the game is in progress.
export function liveScore(game: Pick<SportsGame, "polymarket">, marketTicker: string) {
  return game.polymarket?.live ? game.polymarket.outcomes.find((outcome) => outcome.marketTicker === marketTicker)?.score : undefined;
}

// Compact schedule card: one row per side of the main market.
export function SportsMatchupCard({ game }: { game: SportsGame }) {
  // Prefer the market Polymarket US also lists, so the live score and second price line up with the rows shown.
  const shared = new Set(game.polymarket?.outcomes.map((outcome) => outcome.marketTicker));
  const event = game.events.find((item) => item.markets.some((market) => shared.has(market.ticker))) ?? game.events.find((item) => item.markets.length);
  const rows = event ? [...event.markets].sort((a, b) => b.probability - a.probability).slice(0, 3) : [];
  const favorite = rows[0];
  const poly = game.polymarket;
  const dual = !!poly && rows.some((market) => polymarketChance(game, market.ticker) !== undefined);
  const pill = dual ? "w-14 sm:w-10" : "w-[4.5rem] sm:w-12";
  const when = [game.gameDate ? dayLabel(game.gameDate) : "", game.startTime ? formatStartTime(game.startTime) : ""].filter(Boolean).join(" @ ");

  return (
    <Link
      href={`/sports/game/${encodeURIComponent(game.key)}`}
      data-testid={`card-matchup-${game.key}`}
      aria-label={`Open all markets for ${game.title}`}
      className="group flex min-w-0 flex-col rounded-2xl border border-border bg-card/75 p-4 transition-colors sm:rounded-lg sm:p-3 hover:border-primary/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <div className="flex items-center justify-between gap-2 text-xs font-semibold sm:font-mono sm:text-[9px] sm:font-normal sm:uppercase sm:tracking-wider">
        {poly?.live ? (
          <span className="flex min-w-0 items-center gap-1.5 truncate text-foreground" data-testid={`status-live-${game.key}`}><span className="live-dot h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />Live{poly.period ? ` · ${poly.period}` : ""}</span>
        ) : <span className="truncate text-muted-foreground">{when || "Scheduled"}</span>}
        <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-primary sm:text-[9px]">{game.league || game.sport || "Sports"}</span>
      </div>
      {rows.length > 2 || !rows.length ? <p className="mt-2 truncate text-xs font-semibold text-foreground/90 sm:text-[11px]">{game.title}</p> : null}
      {dual ? (
        <div className="mt-3 flex justify-end gap-1.5 text-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:mt-2 sm:font-mono sm:text-[8px] sm:font-normal sm:tracking-normal" aria-hidden="true">
          <span className={`${pill} flex justify-center whitespace-nowrap`}>Kalshi</span>
          <span className={`${pill} flex justify-center whitespace-nowrap`}>Polymarket</span>
        </div>
      ) : null}
      <div className={`flex-1 space-y-3.5 sm:space-y-2 ${dual ? "mt-1.5 sm:mt-1" : "mt-3 sm:mt-2"}`}>
        {rows.length ? rows.map((market) => {
          const logo = logoFor(market, game.teams);
          const lead = market === favorite;
          const polyChance = polymarketChance(game, market.ticker);
          const score = liveScore(game, market.ticker);
          return (
            <div key={market.ticker} className={`flex items-center gap-3 ${dual ? "sm:gap-2" : "sm:gap-2.5"}`}>
              {logo ? (
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-background ${dual ? "sm:h-6 sm:w-6" : "sm:h-7 sm:w-7"}`}>
                  <img src={logo.logo} alt="" loading="lazy" referrerPolicy="no-referrer" className="h-[76%] w-[76%] object-contain" />
                </span>
              ) : game.teams.length ? (
                <span className="flex h-9 w-9 shrink-0 items-center justify-center sm:h-7 sm:w-7" aria-hidden="true"><span className={`h-5 w-1 rounded-full ${lead ? "bg-primary" : "bg-muted"}`} /></span>
              ) : <span className={`h-9 w-1 shrink-0 rounded-full sm:h-7 ${lead ? "bg-primary" : "bg-muted"}`} aria-hidden="true" />}
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-medium sm:text-xs sm:font-semibold">{market.subtitle || market.title}</p>
                <span className="mt-1.5 block h-1 overflow-hidden sm:mt-1 sm:h-0.5 rounded-full bg-muted/60" aria-hidden="true">
                  <span className={`block h-full rounded-full ${lead ? "bg-primary" : "bg-muted-foreground/50"}`} style={{ width: `${Math.max(2, Math.min(100, market.probability))}%` }} />
                </span>
              </div>
              {score !== undefined ? <span data-testid={`text-score-${market.ticker}`} aria-label={`Score ${score}`} className="shrink-0 whitespace-pre font-mono text-lg font-bold tabular text-foreground sm:text-sm">{score}</span> : null}
              <span aria-label={dual ? `Kalshi ${Math.round(market.probability)}%` : undefined} className={`${pill} shrink-0 rounded-full px-2 py-2.5 text-center text-base font-semibold tabular sm:px-0.5 sm:py-1 sm:font-mono sm:text-[11px] ${lead ? "bg-primary text-primary-foreground sm:bg-primary/20 sm:text-[hsl(262_80%_84%)]" : "bg-muted text-foreground/80 sm:bg-muted/60 sm:text-muted-foreground"}`}>{Math.round(market.probability)}%</span>
              {dual ? (
                <span data-testid={`text-polymarket-${market.ticker}`} aria-label={polyChance === undefined ? "No Polymarket US price" : `Polymarket US ${Math.round(polyChance)}%`} className={`${pill} -ml-1.5 shrink-0 rounded-full border border-border px-2 py-[9px] text-center text-base font-semibold tabular text-foreground/85 sm:-ml-0.5 sm:px-0.5 sm:py-[3px] sm:font-mono sm:text-[11px] sm:text-muted-foreground`}>{polyChance === undefined ? "–" : `${Math.round(polyChance)}%`}</span>
              ) : null}
            </div>
          );
        }) : <p className="py-2 text-[10px] text-muted-foreground">No open outcomes available.</p>}
      </div>
      <div className="mt-4 flex items-center justify-between gap-2 text-xs text-muted-foreground sm:mt-3 sm:text-[10px]">
        <span className="font-mono tabular">{fmtContracts(game.volume)} vol</span>
        <span className="inline-flex items-center gap-0.5 font-semibold transition-colors group-hover:text-primary">
          {game.marketCount > rows.length ? `${game.marketCount} markets` : "View details"} <ChevronRight className="h-3 w-3" />
        </span>
      </div>
    </Link>
  );
}
