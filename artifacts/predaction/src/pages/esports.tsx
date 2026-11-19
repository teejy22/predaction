import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Info } from "lucide-react";
import { getGetOverviewQueryKey, getListSportsGamesQueryKey, useGetOverview, useListSportsGames, type ListSportsGamesParams, type SportsGame } from "@workspace/api-client-react";
import { ErrorPanel } from "@/components/bits";
import { IconRail } from "@/components/icon-rail";
import { SportsMatchupCard } from "@/components/sports-matchup-card";
import { dayHeading, dayLabel, formatStartTime } from "@/components/upcoming-games";
import { usePageMeta } from "@/lib/meta";

// Video games in the order they are offered; only those with open matches are shown.
const TITLES: { name: string; label: string; icon: string }[] = [
  { name: "Counter-Strike", label: "CS2", icon: "🔫" },
  { name: "League of Legends", label: "LoL", icon: "🐉" },
  { name: "Dota 2", label: "Dota 2", icon: "🛡️" },
  { name: "Valorant", label: "Valorant", icon: "🎯" },
  { name: "Overwatch", label: "Overwatch", icon: "🦾" },
];
const PAGE = 48;
const pct = (value: number) => `${Math.round(value)}%`;

function useGames(params: ListSportsGamesParams) {
  return useListSportsGames(params, { query: { queryKey: getListSportsGamesQueryKey(params), refetchInterval: 60000, placeholderData: (prev) => prev } });
}

// One match where the two exchanges disagree, with both chances for the same team side by side.
function GapRow({ game }: { game: SportsGame }) {
  const gap = game.priceGap!;
  const live = game.polymarket?.live;
  const when = [game.gameDate ? dayLabel(game.gameDate) : "", game.startTime ? formatStartTime(game.startTime) : ""].filter(Boolean).join(" @ ");
  return (
    <Link
      href={`/sports/game/${encodeURIComponent(game.key)}`}
      data-testid={`row-gap-${game.key}`}
      className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary sm:px-4 sm:py-2.5"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold sm:text-[13px]">{game.title}</p>
        <p className="mt-0.5 flex items-center gap-1.5 truncate text-[11px] text-muted-foreground">
          {live ? <span className="flex items-center gap-1 font-semibold text-foreground"><span className="live-dot h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />Live</span> : null}
          <span className="truncate">{[game.league, live ? game.polymarket?.period : when].filter(Boolean).join(" · ")}</span>
        </p>
        <p className="mt-1.5 text-xs leading-5 text-foreground/85 sm:truncate">
          <span className="font-semibold">{gap.name}</span> to win: Kalshi <span className="font-mono font-semibold tabular">{pct(gap.kalshi)}</span> · Polymarket <span className="font-mono font-semibold tabular">{pct(gap.polymarket)}</span>
        </p>
      </div>
      <span className="shrink-0 rounded-full bg-primary/20 px-2.5 py-1.5 text-center font-mono text-sm font-bold tabular text-[hsl(262_80%_84%)]" aria-label={`Gap of ${gap.points} points`}>
        {gap.points.toFixed(gap.points < 10 ? 1 : 0)}<span className="ml-0.5 text-[10px] font-semibold">pts</span>
      </span>
    </Link>
  );
}

function SectionTitle({ children, note }: { children: React.ReactNode; note?: string }) {
  return (
    <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
      <h2 className="font-display text-lg font-bold tracking-[-.02em]">{children}</h2>
      {note ? <p className="text-[11px] text-muted-foreground">{note}</p> : null}
    </div>
  );
}

export default function EsportsPage() {
  usePageMeta("Esports match center | Prediction Pro", "Counter-Strike, Dota 2, Valorant and League of Legends matches with live series scores and win chances from Kalshi and Polymarket US, plus the matches where the two disagree most.");
  const [title, setTitle] = useState(() => {
    const value = new URLSearchParams(window.location.search).get("game") ?? "";
    return TITLES.some((item) => item.name === value) ? value : "";
  });
  const [limit, setLimit] = useState(PAGE);
  useEffect(() => {
    const target = `${window.location.pathname}${title ? `?game=${encodeURIComponent(title)}` : ""}`;
    if (target !== `${window.location.pathname}${window.location.search}`) window.history.replaceState(null, "", target);
  }, [title]);
  const pick = (next: string) => { setTitle(next); setLimit(PAGE); };

  const overview = useGetOverview({ query: { queryKey: getGetOverviewQueryKey(), refetchInterval: 60000 } });
  const open = new Set(overview.data?.sports.find((item) => item.name === "Esports")?.leagues ?? []);
  const titles = TITLES.filter((item) => open.has(item.name) || item.name === title);

  const base: ListSportsGamesParams = { sport: "Esports", titled: true, ...(title ? { league: title } : {}) };
  const gaps = useGames({ ...base, sort: "gap", limit: 8 });
  const live = useGames({ ...base, live: true, sort: "volume", limit: 24 });
  const schedule = useGames({ ...base, sort: "upcoming", limit });

  const liveGames = live.data?.games ?? [];
  const liveKeys = new Set(liveGames.map((game) => game.key));
  const days: { date: string; games: SportsGame[] }[] = [];
  for (const game of schedule.data?.games ?? []) {
    if (liveKeys.has(game.key)) continue;
    const date = game.gameDate ?? "";
    const last = days[days.length - 1];
    if (last && last.date === date) last.games.push(game);
    else days.push({ date, games: [game] });
  }
  // Within a day, earliest start first; matches without a published start time go last.
  const startOf = (game: SportsGame) => Date.parse(game.startTime ?? "") || Infinity;
  for (const day of days) day.games.sort((a, b) => startOf(a) - startOf(b));
  const gapGames = (gaps.data?.games ?? []).filter((game) => game.priceGap && game.priceGap.points >= 1);
  const loading = schedule.isLoading || live.isLoading;
  const indexing = !!schedule.data?.indexing;
  const grid = "grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";

  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 pt-5 md:px-6 md:pt-6">
      <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h1 className="font-display text-2xl font-bold tracking-[-.04em] sm:text-3xl">Esports</h1>
        <p className="text-xs text-muted-foreground">Live series scores and win chances from Kalshi and Polymarket US</p>
      </header>

      <IconRail
        label="Pick a video game"
        testId="button-esports-title"
        className="mt-4"
        chips={[
          { id: "all", label: "All", icon: "🎮", active: !title, pick: () => pick("") },
          ...titles.map((item) => ({ id: item.name, label: item.label, icon: item.icon, active: title === item.name, pick: () => pick(title === item.name ? "" : item.name) })),
        ]}
      />

      {schedule.isError && !schedule.data ? <div className="mt-6"><ErrorPanel onRetry={() => { schedule.refetch(); live.refetch(); gaps.refetch(); }} /></div> : null}

      <section className="mt-6" aria-labelledby="gaps-heading">
        <SectionTitle note="Same team, same match, two different prices"><span id="gaps-heading">Biggest price gaps</span></SectionTitle>
        <div className="overflow-hidden rounded-2xl border border-border bg-card/75 sm:rounded-lg">
          {gapGames.length ? (
            <div className="divide-y divide-border lg:grid lg:grid-cols-2 lg:divide-y-0 lg:[&>*:nth-child(odd)]:border-r lg:[&>*:nth-child(odd)]:border-border lg:[&>*:nth-child(n+3)]:border-t lg:[&>*:nth-child(n+3)]:border-border">
              {gapGames.map((game) => <GapRow key={game.key} game={game} />)}
            </div>
          ) : (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground" data-testid="text-gaps-empty">
              {gaps.isLoading ? "Comparing prices…" : indexing ? "Still loading matches. Check back in a minute." : "The two exchanges agree on every match they both list right now."}
            </p>
          )}
          <p className="flex items-start gap-2 border-t border-border px-4 py-2.5 text-[11px] leading-4 text-muted-foreground">
            <Info className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            A gap is not guaranteed profit. Fees, thin trading and prices that move during live play can erase it. Each chance is the midpoint of that exchange's own buy and sell prices.
          </p>
        </div>
      </section>

      {liveGames.length ? (
        <section className="mt-8" aria-labelledby="live-heading">
          <SectionTitle note="Scores from Polymarket US, may lag by a minute or two"><span id="live-heading" className="inline-flex items-center gap-2"><span className="live-dot h-2 w-2 rounded-full bg-primary" aria-hidden="true" />Live now</span></SectionTitle>
          <div className={grid}>{liveGames.map((game) => <SportsMatchupCard key={game.key} game={game} />)}</div>
        </section>
      ) : null}

      <section className="mt-8" aria-labelledby="schedule-heading">
        <SectionTitle note={schedule.data ? `${schedule.data.total} matches` : undefined}><span id="schedule-heading">Matches</span></SectionTitle>
        {days.length ? days.map((day) => (
          <div key={day.date} className="mb-6">
            <h3 className="mb-2 font-mono text-[10px] uppercase tracking-[.17em] text-muted-foreground">{day.date ? dayHeading(day.date) : "Date to be announced"}</h3>
            <div className={grid}>{day.games.map((game) => <SportsMatchupCard key={game.key} game={game} />)}</div>
          </div>
        )) : (
          <p className="rounded-lg border border-border bg-card/75 px-4 py-8 text-center text-sm text-muted-foreground" data-testid="text-esports-empty">
            {loading ? "Loading matches…" : indexing ? "Still loading matches. Check back in a minute." : liveGames.length ? "No other matches are scheduled yet." : "No open matches for this game right now."}
          </p>
        )}
        {schedule.data?.hasMore && limit < 100 ? (
          <div className="mt-2 flex justify-center">
            <button type="button" onClick={() => setLimit(100)} data-testid="button-esports-more" className="rounded-full border border-border bg-card px-5 py-2.5 text-sm font-semibold transition-colors hover:border-primary/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:text-xs">Show more matches</button>
          </div>
        ) : null}
      </section>
    </div>
  );
}
