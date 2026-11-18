import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { getListSportsGamesQueryKey, useListSportsGames, type ListSportsGamesParams, type SportsGame } from "@workspace/api-client-react";
import { liveScore, logoFor } from "@/components/sports-matchup-card";

const LIMIT = 10;

// One in-progress game: period, both sides with score, and the Kalshi chance for each.
function LiveCard({ game }: { game: SportsGame }) {
  const shared = new Set(game.polymarket?.outcomes.map((outcome) => outcome.marketTicker));
  const event = game.events.find((item) => item.markets.some((market) => shared.has(market.ticker)));
  const rows = (event?.markets ?? []).filter((market) => liveScore(game, market.ticker) !== undefined).slice(0, 2);
  if (rows.length !== 2) return null;
  const top = Math.max(...rows.map((market) => market.probability));
  return (
    <Link
      href={`/sports/game/${encodeURIComponent(game.key)}`}
      data-testid={`card-live-${game.key}`}
      aria-label={`Open ${game.title}, live`}
      className="flex w-[15.5rem] shrink-0 snap-start flex-col gap-2.5 rounded-xl border border-border bg-card/80 p-3 transition-colors hover:border-primary/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:w-56"
    >
      <div className="flex items-center justify-between gap-2 text-[11px] font-semibold">
        <span className="flex min-w-0 items-center gap-1.5 truncate text-foreground"><span className="live-dot h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />{game.polymarket?.period || "Live"}</span>
        <span className="shrink-0 text-[10px] uppercase tracking-wider text-primary">{game.league || game.sport || "Sports"}</span>
      </div>
      {rows.map((market) => {
        const logo = logoFor(market, game.teams);
        const lead = market.probability === top;
        return (
          <div key={market.ticker} className="flex items-center gap-2">
            {logo ? (
              <span className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-background">
                <img src={logo.logo} alt="" loading="lazy" referrerPolicy="no-referrer" className="h-[76%] w-[76%] object-contain" />
              </span>
            ) : <span className={`h-6 w-1 shrink-0 rounded-full ${lead ? "bg-primary" : "bg-muted"}`} aria-hidden="true" />}
            <span className="min-w-0 flex-1 truncate text-sm font-medium">{market.subtitle || market.title}</span>
            <span className="shrink-0 whitespace-pre font-mono text-base font-bold tabular text-foreground" aria-label={`Score ${liveScore(game, market.ticker)}`}>{liveScore(game, market.ticker)}</span>
            <span className={`w-11 shrink-0 rounded-full py-1 text-center font-mono text-[11px] font-semibold tabular ${lead ? "bg-primary/20 text-[hsl(262_80%_84%)]" : "bg-muted/60 text-muted-foreground"}`} aria-label={`Kalshi ${Math.round(market.probability)}%`}>{Math.round(market.probability)}%</span>
          </div>
        );
      })}
    </Link>
  );
}

// Home page strip of games in progress, busiest first. Renders nothing when no game is live.
export function LiveStrip() {
  const params: ListSportsGamesParams = { live: true, sort: "volume", offset: 0, limit: 30 };
  const feed = useListSportsGames(params, {
    query: { queryKey: getListSportsGamesQueryKey(params), refetchInterval: 60000, placeholderData: (prev) => prev },
  });
  // Only games with a readable score for both sides belong here.
  const games = (feed.data?.games ?? []).filter((game) =>
    game.polymarket?.live && (game.polymarket.outcomes.filter((outcome) => outcome.score !== undefined).length === 2)).slice(0, LIMIT);
  if (!games.length) return null;
  const total = feed.data?.total ?? games.length;
  return (
    <section className="mx-auto max-w-7xl px-4 pt-5 md:px-6" aria-label="Live games" data-testid="section-live-strip">
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold tracking-[-.035em]"><span className="live-dot h-2 w-2 rounded-full bg-primary" aria-hidden="true" />Live now</h2>
        <Link href="/sports?live=1" data-testid="link-live-all" className="inline-flex items-center gap-1 rounded text-xs font-semibold text-muted-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">All {total} live <ArrowRight className="h-3.5 w-3.5" /></Link>
      </div>
      <div className="panel-scroll -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:scroll-px-0 md:px-0">
        {games.map((game) => <LiveCard key={game.key} game={game} />)}
        <Link href="/sports?live=1" data-testid="card-live-all" className="flex w-32 shrink-0 snap-start flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-border text-center text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/45 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
          <ArrowRight className="h-4 w-4" />See all live
        </Link>
      </div>
      <p className="mt-1.5 text-[10px] text-muted-foreground">Scores from Polymarket US, can trail the game by a couple of minutes. Percentages are Kalshi chances.</p>
    </section>
  );
}
