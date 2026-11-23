import { useEffect, useMemo, useRef, useState } from "react";
import { useSearch } from "wouter";
import { AlertTriangle, ArrowDownWideNarrow, ChevronLeft, ChevronRight, Info, RotateCw, Search, X } from "lucide-react";
import { getGetOverviewQueryKey, getListSportsGamesQueryKey, useGetOverview, useListSportsGames, type ListSportsGamesParams } from "@workspace/api-client-react";
import { ErrorPanel } from "@/components/bits";
import { SportsGameCard } from "@/components/sports-game-card";
import { SportsMatchupCard } from "@/components/sports-matchup-card";
import { SportsRail } from "@/components/sports-rail";
import { leagueName, SportsSidebar } from "@/components/sports-sidebar";
import { dayHeading, UpcomingGames } from "@/components/upcoming-games";
import { updatedLabel } from "@/lib/format";
import { usePageMeta } from "@/lib/meta";

type Sort = "date" | "volume" | "closing" | "newest";
type Filters = { sport: string; league: string; q: string; sort: Sort; page: number; live: boolean };
const SORTS: { value: Sort; label: string }[] = [
  { value: "date", label: "By date" },
  { value: "volume", label: "Volume" },
  { value: "closing", label: "Closing soon" },
  { value: "newest", label: "Newest" },
];

function readFilters(): Filters {
  const params = new URLSearchParams(window.location.search);
  const rawSort = params.get("sort");
  return {
    sport: params.get("sport") ?? "",
    league: params.get("league") ?? "",
    q: params.get("q") ?? "",
    sort: rawSort === "volume" || rawSort === "closing" || rawSort === "newest" ? rawSort : "date",
    page: Math.max(0, (Number.parseInt(params.get("page") || "1", 10) || 1) - 1),
    live: params.get("live") === "1",
  };
}

function filtersUrl(filters: Filters) {
  const params = new URLSearchParams();
  if (filters.sport) params.set("sport", filters.sport);
  if (filters.league) params.set("league", filters.league);
  if (filters.q) params.set("q", filters.q);
  if (filters.sort !== "date") params.set("sort", filters.sort);
  if (filters.live) params.set("live", "1");
  if (filters.page > 0) params.set("page", String(filters.page + 1));
  const query = params.toString();
  return `${window.location.pathname}${query ? `?${query}` : ""}`;
}

function Notice({ children, tone = "info" }: { children: React.ReactNode; tone?: "info" | "warn" }) {
  return (
    <div className={`flex items-start gap-2 rounded-md border px-3 py-2.5 text-xs leading-5 ${tone === "warn" ? "border-[hsl(37_88%_63%/.35)] bg-[hsl(37_88%_63%/.07)] text-foreground" : "border-border bg-card text-muted-foreground"}`}>
      {tone === "warn" && <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[hsl(37_88%_63%)]" />}
      <div>{children}</div>
    </div>
  );
}

export default function SportsPage() {
  usePageMeta("Sports markets | Prediction Pro", "Browse indexed open sports events and leagues, with current Kalshi outcomes and contract volume.");
  const urlSearch = useSearch();
  const initial = useMemo(readFilters, []);
  const [sport, setSport] = useState(initial.sport);
  const [league, setLeague] = useState(initial.league);
  const [q, setQ] = useState(initial.q);
  const [search, setSearch] = useState(initial.q);
  const [sort, setSort] = useState<Sort>(initial.sort);
  const [page, setPage] = useState(initial.page);
  const [live, setLive] = useState(initial.live);
  const skipHistoryWrite = useRef(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const next = q.trim();
      if (next !== search) {
        setSearch(next);
        setPage(0);
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [q, search]);

  useEffect(() => {
    const target = filtersUrl({ sport, league, q: search, sort, page, live });
    const current = `${window.location.pathname}${window.location.search}`;
    if (skipHistoryWrite.current) {
      skipHistoryWrite.current = false;
      if (target !== current) window.history.replaceState(null, "", target);
      return;
    }
    if (target !== current) window.history.pushState(null, "", target);
  }, [sport, league, search, sort, page, live]);

  useEffect(() => {
    const onPopState = () => {
      skipHistoryWrite.current = true;
      const filters = readFilters();
      setSport(filters.sport);
      setLeague(filters.league);
      setQ(filters.q);
      setSearch(filters.q);
      setSort(filters.sort);
      setPage(filters.page);
      setLive(filters.live);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  // Wouter can navigate between two /sports links without remounting this page.
  useEffect(() => {
    const next = readFilters();
    if (next.sport === sport && next.league === league && next.q === search && next.sort === sort && next.page === page && next.live === live) return;
    skipHistoryWrite.current = true;
    setSport(next.sport);
    setLeague(next.league);
    setQ(next.q);
    setSearch(next.q);
    setSort(next.sort);
    setPage(next.page);
    setLive(next.live);
  }, [urlSearch]);

  const overview = useGetOverview({ query: { queryKey: getGetOverviewQueryKey(), refetchInterval: 60000 } });
  const sports = overview.data?.sports ?? [];
  // Uncommitted search edits hold results on page one; no stale offset request is issued.
  // The schedule view uses compact cards, so a page holds more games.
  // Live games are shown as one list, busiest first, rather than grouped by day.
  const byDate = sort === "date" && !live;
  const compact = byDate || live;
  const PAGE_SIZE = byDate ? 30 : 24;
  const params: ListSportsGamesParams = {
    sort: byDate ? "upcoming" : sort === "date" ? "volume" : sort,
    offset: page * PAGE_SIZE,
    limit: PAGE_SIZE,
  };
  if (sport) params.sport = sport;
  if (league) params.league = league;
  if (search) params.search = search;
  if (live) params.live = true;
  const feed = useListSportsGames(params, {
    query: { queryKey: getListSportsGamesQueryKey(params), refetchInterval: 60000, placeholderData: (prev) => prev },
  });
  const data = feed.data;
  const games = data?.games ?? [];
  const pages = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE));
  const canGoPrev = page > 0;
  const canGoNext = !!data?.hasMore;
  const filtersActive = !!(sport || league || search || live);

  useEffect(() => {
    if (data && !feed.isPlaceholderData && page >= pages) setPage(Math.max(0, pages - 1));
  }, [data, feed.isPlaceholderData, page, pages]);

  const chooseSport = (next: string) => {
    setSport(sport === next ? "" : next);
    setLeague("");
    setPage(0);
  };
  const pickLeague = (owner: string, next: string) => {
    if (league === next && sport === owner) setLeague("");
    else { setSport(owner); setLeague(next); }
    setPage(0);
  };
  // Consecutive games share a day because the schedule view is ordered by game day.
  const days: { date: string; games: typeof games }[] = [];
  if (byDate) for (const game of games) {
    const date = game.gameDate ?? "";
    const last = days[days.length - 1];
    if (last && last.date === date) last.games.push(game);
    else days.push({ date, games: [game] });
  }
  const setSortFirst = (next: Sort) => {
    setSort(next);
    setPage(0);
  };
  const reset = () => {
    setSport("");
    setLeague("");
    setQ("");
    setSearch("");
    setSort("date");
    setLive(false);
    setPage(0);
  };
  const goToPage = (next: number) => {
    setPage(next);
    pageRef.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  };
  const indexing = !!(data?.indexing || overview.data?.indexing);
  const partial = !!(data?.partial || overview.data?.partial);
  const warnings = Array.from(new Set([...(data?.warnings ?? []), ...(overview.data?.warnings ?? [])]))
    .filter((warning) => !warning.startsWith("Indexing open events across categories"));
  const indexedSports = overview.data?.categories.find((item) => item.name === "Sports")?.count ?? (!sport && !league && !search ? data?.total : undefined);

  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 pt-5 md:px-6 md:pt-6">
      <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h1 className="font-display text-2xl font-bold tracking-[-.04em] sm:text-3xl">Sports</h1>
        <p className="hidden font-mono text-[10px] uppercase tracking-wider text-muted-foreground sm:block">
          {indexedSports !== undefined ? `${indexedSports.toLocaleString()} sports events` : ""}{overview.data?.updatedAt ? ` · updated ${updatedLabel(overview.data.updatedAt)}` : ""}
        </p>
      </header>

      <section className="mt-3 grid gap-5 sm:mt-4 lg:grid-cols-[245px_minmax(0,1fr)]">
        <SportsSidebar
          sports={sports} sport={sport} league={league}
          loading={overview.isLoading} failed={overview.isError && !overview.data}
          onRetry={() => { void overview.refetch(); }}
          onSport={chooseSport} onLeague={pickLeague}
        />

        <div ref={pageRef} className="min-w-0 scroll-mt-20">
          <SportsRail sports={sports} sport={sport} league={league} onAll={() => { setSport(""); setLeague(""); setPage(0); }} onSport={chooseSport} onLeague={pickLeague} />
          {!compact && !search && page === 0 && <UpcomingGames sport={sport} league={league} />}
          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="relative min-w-0 flex-1">
              <span className="sr-only">Search sports events</span>
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input ref={searchRef} type="search" value={q} onChange={(event) => { setQ(event.target.value); setPage(0); }} placeholder="Search sports events" data-testid="input-sports-search" className="h-10 w-full rounded-md border border-border bg-card pl-10 pr-10 text-sm outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20" />
              {q && <button type="button" onClick={() => { setQ(""); setSearch(""); setPage(0); }} aria-label="Clear sports search" data-testid="button-sports-clear-search" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>}
            </label>
            <div className="flex items-center gap-2">
              <span className="hidden items-center gap-1.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground sm:inline-flex"><ArrowDownWideNarrow className="h-3.5 w-3.5" /> Sort</span>
              <div className="flex w-full rounded-md border border-border bg-card p-1 sm:w-auto" role="group" aria-label="Sort sports markets">
                {SORTS.map((item) => <button key={item.value} type="button" onClick={() => setSortFirst(item.value)} aria-pressed={sort === item.value} data-testid={`button-sports-sort-${item.value}`} className={`flex-1 whitespace-nowrap rounded px-1.5 py-2 text-[11px] font-semibold transition-colors sm:flex-none sm:px-3 sm:py-1.5 sm:text-xs ${sort === item.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>{item.label}</button>)}
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
            <h2 className="flex flex-wrap items-center gap-2.5 font-display text-xl font-bold tracking-[-.035em]">
              <button type="button" onClick={() => { setLive(!live); setPage(0); }} aria-pressed={live} data-testid="button-sports-live" className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-sans text-xs font-semibold tracking-normal transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${live ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:text-foreground"}`}><span className={`live-dot h-1.5 w-1.5 rounded-full ${live ? "bg-primary-foreground" : "bg-primary"}`} aria-hidden="true" />Live now</button>
              {(league && leagueName(league)) || sport || "All sports"}{search && <span className="font-sans text-sm font-normal text-muted-foreground"> · “{search}”</span>}
            </h2>
            <div className="flex items-center gap-3 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
              {indexing && <span className="inline-flex items-center gap-1.5" data-testid="status-sports-indexing"><span className="live-dot h-1.5 w-1.5 rounded-full bg-primary" /> updating index · counts may grow</span>}
              {feed.isFetching && !feed.isLoading && <span className="inline-flex items-center gap-1.5"><span className="live-dot h-1.5 w-1.5 rounded-full bg-primary" /> refreshing</span>}
              {data && <span data-testid="text-sports-result-count">{data.total.toLocaleString()} matching games</span>}
              {filtersActive && <button type="button" onClick={reset} className="text-foreground underline underline-offset-4" data-testid="button-sports-reset">Reset</button>}
            </div>
          </div>

          <div className="mt-3 space-y-2">
            {feed.isRefetchError && data && <Notice tone="warn">Latest refresh failed. Showing the last loaded results. <button type="button" onClick={() => feed.refetch()} className="ml-1 font-semibold text-primary underline">Retry</button></Notice>}
            {!indexing && (partial || warnings.length > 0) && <Notice tone="warn">{warnings[0] ?? "Some Kalshi data could not be loaded. Showing indexed results only."}</Notice>}
          </div>

          <div className="mt-4" aria-live="polite">
            {feed.isLoading ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-label="Loading sports markets">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-56 animate-pulse rounded-lg border border-border bg-card/70" />)}</div> :
              feed.isError && !data ? <ErrorPanel title="Couldn't load sports markets" onRetry={() => feed.refetch()} retrying={feed.isFetching} /> :
                games.length && byDate ? <div className={`space-y-6 ${feed.isPlaceholderData ? "opacity-60" : ""}`}>
                  {days.map((day) => <section key={day.date} aria-label={day.date ? dayHeading(day.date) : "Scheduled games"} data-testid={`section-day-${day.date}`}>
                    <h3 className="mb-3 text-lg font-bold tracking-tight sm:mb-2.5 sm:text-sm">{day.date ? dayHeading(day.date) : "Scheduled"}</h3>
                    <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
                      {day.games.map((game) => <SportsMatchupCard key={game.key} game={game} />)}
                    </div>
                  </section>)}
                </div> :
                games.length && live ? <div className={`grid grid-cols-1 items-start gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 ${feed.isPlaceholderData ? "opacity-60" : ""}`}>
                  {games.map((game) => <SportsMatchupCard key={game.key} game={game} />)}
                </div> :
                games.length ? <div className={`grid gap-3 sm:grid-cols-2 xl:grid-cols-3 ${feed.isPlaceholderData ? "opacity-60" : ""}`}>
                  {games.map((game) => <SportsGameCard key={game.key} game={game} />)}
                </div> :
                  <div className="rounded-lg border border-dashed border-border bg-card/50 px-6 py-14 text-center">
                    <h3 className="font-display text-2xl font-bold tracking-tight">Nothing in this view yet</h3>
                    <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">{byDate && !data?.indexing ? "No games with a scheduled day match this view. Futures and season-long markets are listed under Volume." : filtersActive ? "Try a different sport or loosen your search." : data?.indexing ? "The sports index is still building; check back shortly." : "No open sports events are currently indexed."}</p>
                    {byDate && <button type="button" onClick={() => setSortFirst("volume")} className="mr-2 mt-5 rounded-md border border-border px-4 py-2 text-sm font-semibold hover:border-primary hover:text-primary" data-testid="button-sports-empty-volume">Sort by volume</button>}
                    {filtersActive && <button type="button" onClick={reset} className="mt-5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground" data-testid="button-sports-empty-reset">Clear filters</button>}
                  </div>}
          </div>

          {data && (canGoPrev || canGoNext) && <nav className="mt-5 flex items-center justify-between gap-3" aria-label="Sports game pagination">
            <button type="button" onClick={() => goToPage(page - 1)} disabled={!canGoPrev || feed.isFetching} data-testid="button-sports-page-prev" className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-xs font-semibold transition-colors hover:border-primary hover:text-primary disabled:pointer-events-none disabled:opacity-40"><ChevronLeft className="h-4 w-4" /> Previous</button>
            <span className="font-mono text-[10px] text-muted-foreground tabular" data-testid="text-sports-page">Page {page + 1} of {pages} · {(page * PAGE_SIZE + 1).toLocaleString()}–{(page * PAGE_SIZE + games.length).toLocaleString()}</span>
            <button type="button" onClick={() => goToPage(page + 1)} disabled={!canGoNext || feed.isFetching || feed.isPlaceholderData} data-testid="button-sports-page-next" className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-xs font-semibold transition-colors hover:border-primary hover:text-primary disabled:pointer-events-none disabled:opacity-40">Next <ChevronRight className="h-4 w-4" /></button>
          </nav>}

          <p className="mt-5 flex items-start gap-2 text-[11px] leading-5 text-muted-foreground">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            Prices and contract volumes are from Kalshi public event data. Where a game is also listed on Polymarket US, its price is shown in a separate, labeled column. "Sharps" on football games counts open Polymarket positions held by the top wallets on FlowFrame's football leaderboard. Volume is counted in contracts, not dollars. The indexed event count is not an exact count of all available markets.
          </p>
        </div>
      </section>
      {overview.data?.updatedAt && <p className="mt-8 flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground"><RotateCw className="h-3 w-3" /> Overview refreshed {updatedLabel(overview.data.updatedAt)} · 60-second page checks</p>}
    </div>
  );
}
