import { useEffect, useMemo, useRef, useState } from "react";
import { useSearch } from "wouter";
import { AlertTriangle, ArrowDownWideNarrow, ChevronLeft, ChevronRight, Info, RotateCw, Search, X } from "lucide-react";
import { getGetOverviewQueryKey, getListSportsGamesQueryKey, useGetOverview, useListSportsGames, type ListSportsGamesParams } from "@workspace/api-client-react";
import { ErrorPanel } from "@/components/bits";
import { SportsGameCard } from "@/components/sports-game-card";
import { updatedLabel } from "@/lib/format";
import { usePageMeta } from "@/lib/meta";

type Sort = "volume" | "closing" | "newest";
type Filters = { sport: string; league: string; q: string; sort: Sort; page: number };
const PAGE_SIZE = 24;
const SORTS: { value: Sort; label: string }[] = [
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
    sort: rawSort === "closing" || rawSort === "newest" ? rawSort : "volume",
    page: Math.max(0, (Number.parseInt(params.get("page") || "1", 10) || 1) - 1),
  };
}

function filtersUrl(filters: Filters) {
  const params = new URLSearchParams();
  if (filters.sport) params.set("sport", filters.sport);
  if (filters.league) params.set("league", filters.league);
  if (filters.q) params.set("q", filters.q);
  if (filters.sort !== "volume") params.set("sort", filters.sort);
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
    const target = filtersUrl({ sport, league, q: search, sort, page });
    const current = `${window.location.pathname}${window.location.search}`;
    if (skipHistoryWrite.current) {
      skipHistoryWrite.current = false;
      if (target !== current) window.history.replaceState(null, "", target);
      return;
    }
    if (target !== current) window.history.pushState(null, "", target);
  }, [sport, league, search, sort, page]);

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
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  // Wouter can navigate between two /sports links without remounting this page.
  useEffect(() => {
    const next = readFilters();
    if (next.sport === sport && next.league === league && next.q === search && next.sort === sort && next.page === page) return;
    skipHistoryWrite.current = true;
    setSport(next.sport);
    setLeague(next.league);
    setQ(next.q);
    setSearch(next.q);
    setSort(next.sort);
    setPage(next.page);
  }, [urlSearch]);

  const overview = useGetOverview({ query: { queryKey: getGetOverviewQueryKey(), refetchInterval: 60000 } });
  const sports = overview.data?.sports ?? [];
  const activeSport = sports.find((item) => item.name === sport);
  const availableLeagues = useMemo(
    () => sport ? (activeSport?.leagues ?? []) : Array.from(new Set(sports.flatMap((item) => item.leagues))).filter(Boolean).sort(),
    [activeSport, sport, sports],
  );

  // Uncommitted search edits hold results on page one; no stale offset request is issued.
  const params: ListSportsGamesParams = {
    sort,
    offset: page * PAGE_SIZE,
    limit: PAGE_SIZE,
  };
  if (sport) params.sport = sport;
  if (league) params.league = league;
  if (search) params.search = search;
  const feed = useListSportsGames(params, {
    query: { queryKey: getListSportsGamesQueryKey(params), refetchInterval: 60000, placeholderData: (prev) => prev },
  });
  const data = feed.data;
  const games = data?.games ?? [];
  const pages = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE));
  const canGoPrev = page > 0;
  const canGoNext = !!data?.hasMore;
  const filtersActive = !!(sport || league || search);

  useEffect(() => {
    if (data && !feed.isPlaceholderData && page >= pages) setPage(Math.max(0, pages - 1));
  }, [data, feed.isPlaceholderData, page, pages]);

  const chooseSport = (next: string) => {
    setSport(sport === next ? "" : next);
    setLeague("");
    setPage(0);
  };
  const chooseLeague = (next: string) => {
    if (!sport && next) {
      const owner = sports.find((item) => item.leagues.includes(next));
      if (owner) setSport(owner.name);
    }
    setLeague(league === next ? "" : next);
    setPage(0);
  };
  const setSortFirst = (next: Sort) => {
    setSort(next);
    setPage(0);
  };
  const reset = () => {
    setSport("");
    setLeague("");
    setQ("");
    setSearch("");
    setSort("volume");
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
    <div className="mx-auto max-w-7xl px-4 pb-16 pt-8 md:px-6 md:pt-11">
      <header className="border-b border-border pb-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[.18em] text-primary">Kalshi · sports markets</p>
            <h1 className="font-display mt-2 text-3xl font-bold tracking-[-.045em] sm:text-4xl">Sports</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">Every open matchup, grouped. Winner and spread up front; open a game for totals, halves and props.</p>
          </div>
          <div className="text-left sm:text-right">
            <p className="font-mono text-xl font-semibold tabular">{indexedSports !== undefined ? indexedSports.toLocaleString() : "—"}</p>
            <p className="font-mono text-[9px] uppercase tracking-[.15em] text-muted-foreground">indexed sports events</p>
            {overview.data?.updatedAt && <p className="mt-1 text-[10px] text-muted-foreground">Updated {updatedLabel(overview.data.updatedAt)}</p>}
          </div>
        </div>
      </header>

      <section className="mt-6 grid gap-5 lg:grid-cols-[245px_minmax(0,1fr)]">
        <aside className="hidden space-y-4 lg:block" aria-label="Browse sports and leagues">
          <div className="rounded-lg border border-border bg-card/60 p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-mono text-[10px] font-semibold uppercase tracking-[.16em] text-muted-foreground">Sports</h2>
              <button type="button" onClick={() => chooseSport("")} data-testid="button-sports-all" className={`text-[10px] font-semibold ${!sport ? "text-primary" : "text-muted-foreground hover:text-foreground"}`} aria-pressed={!sport}>All sports</button>
            </div>
            {overview.isLoading ? <div className="mt-3 space-y-2" aria-label="Loading sports"><div className="h-8 animate-pulse rounded bg-muted" /><div className="h-8 animate-pulse rounded bg-muted" /><div className="h-8 animate-pulse rounded bg-muted" /></div> :
              overview.isError && !overview.data ? <div className="mt-3 text-xs text-muted-foreground"><p>Sports index unavailable.</p><button onClick={() => overview.refetch()} className="mt-2 text-primary underline">Retry</button></div> :
                sports.length ? <div className="mt-2 space-y-1">
                  {sports.map((item) => <button key={item.name} type="button" onClick={() => chooseSport(item.name)} aria-pressed={sport === item.name} data-testid={`button-sport-${item.name.toLowerCase().replace(/\s+/g, "-")}`} className={`flex w-full items-center justify-between rounded px-2.5 py-2 text-left text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${sport === item.name ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-background/70 hover:text-foreground"}`}>
                    <span>{item.name}</span><span className="font-mono text-[10px] tabular">{item.count.toLocaleString()}</span>
                  </button>)}
                </div> : <p className="mt-3 text-xs text-muted-foreground">No sport groups are indexed yet. All sports events remain available in the results.</p>}
          </div>

          <div className="rounded-lg border border-border bg-card/60 p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-mono text-[10px] font-semibold uppercase tracking-[.16em] text-muted-foreground">Leagues</h2>
              {sport && activeSport?.leagues.length === 0 && <span className="text-[9px] text-muted-foreground">No leagues for {sport}</span>}
            </div>
            <button type="button" onClick={() => chooseLeague("")} data-testid="button-leagues-all" aria-pressed={!league} className={`mt-2 flex w-full items-center justify-between rounded px-2.5 py-2 text-left text-xs ${!league ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-background/70 hover:text-foreground"}`}>All available leagues</button>
            <div className="panel-scroll mt-1 max-h-72 space-y-1 overflow-y-auto pr-1">
              {availableLeagues.map((name) => {
                const owner = sports.find((item) => item.leagues.includes(name))?.name;
                return <button key={`${owner}-${name}`} type="button" onClick={() => {
                  if (!sport && owner) setSport(owner);
                  chooseLeague(name);
                }} aria-pressed={league === name} data-testid={`button-league-${name.toLowerCase().replace(/\s+/g, "-")}`} className={`flex w-full items-center justify-between rounded px-2.5 py-2 text-left text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${league === name ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-background/70 hover:text-foreground"}`}>
                  <span>{name === "NCAAF" ? "College Football" : name}</span>{!sport && owner && <span className="text-[9px] text-muted-foreground">{owner}</span>}
                </button>;
              })}
              {!availableLeagues.length && <p className="px-2.5 py-2 text-[10px] leading-4 text-muted-foreground">{sport ? "This sport has no league metadata. Choose the sport to browse its events." : "No league metadata is available yet."}</p>}
            </div>
          </div>
        </aside>

        <div ref={pageRef} className="min-w-0 scroll-mt-20">
          <div className="mb-4 grid grid-cols-2 gap-3 lg:hidden">
            <label className="min-w-0 text-xs text-muted-foreground">Sport
              <select value={sport} onChange={(event) => chooseSport(event.target.value)} data-testid="select-sports-sport" className="mt-1.5 h-10 w-full rounded-md border border-border bg-card px-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                <option value="">All sports</option>
                {sports.map((item) => <option key={item.name} value={item.name}>{item.name} ({item.count.toLocaleString()})</option>)}
              </select>
            </label>
            <label className="min-w-0 text-xs text-muted-foreground">League
              <select value={league} onChange={(event) => chooseLeague(event.target.value)} data-testid="select-sports-league" className="mt-1.5 h-10 w-full rounded-md border border-border bg-card px-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                <option value="">{availableLeagues.length ? "All leagues" : "No league groups"}</option>
                {availableLeagues.map((name) => <option key={name} value={name}>{name === "NCAAF" ? "College Football" : name}</option>)}
              </select>
            </label>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="relative min-w-0 flex-1">
              <span className="sr-only">Search sports events</span>
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input ref={searchRef} type="search" value={q} onChange={(event) => { setQ(event.target.value); setPage(0); }} placeholder="Search sports events" data-testid="input-sports-search" className="h-10 w-full rounded-md border border-border bg-card pl-10 pr-10 text-sm outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20" />
              {q && <button type="button" onClick={() => { setQ(""); setSearch(""); setPage(0); }} aria-label="Clear sports search" data-testid="button-sports-clear-search" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>}
            </label>
            <div className="flex items-center gap-2">
              <span className="hidden items-center gap-1.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground sm:inline-flex"><ArrowDownWideNarrow className="h-3.5 w-3.5" /> Sort</span>
              <div className="flex rounded-md border border-border bg-card p-1" role="group" aria-label="Sort sports markets">
                {SORTS.map((item) => <button key={item.value} type="button" onClick={() => setSortFirst(item.value)} aria-pressed={sort === item.value} data-testid={`button-sports-sort-${item.value}`} className={`rounded px-2.5 py-1.5 text-[10px] font-semibold transition-colors sm:px-3 sm:text-xs ${sort === item.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>{item.label}</button>)}
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
            <h2 className="font-display text-xl font-bold tracking-[-.035em]">
              {league || sport || "All sports"}{search && <span className="font-sans text-sm font-normal text-muted-foreground"> · “{search}”</span>}
            </h2>
            <div className="flex items-center gap-3 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
              {indexing && <span className="inline-flex items-center gap-1.5" data-testid="status-sports-indexing"><span className="live-dot h-1.5 w-1.5 rounded-full bg-primary" /> updating index · counts may grow</span>}
              {!indexing && partial && <span className="text-[hsl(37_88%_63%)]" data-testid="status-sports-partial">partial index · indexed results only</span>}
              {feed.isFetching && !feed.isLoading && <span className="inline-flex items-center gap-1.5"><span className="live-dot h-1.5 w-1.5 rounded-full bg-primary" /> refreshing</span>}
              {data && <span data-testid="text-sports-result-count">{data.total.toLocaleString()} matching games</span>}
              {filtersActive && <button type="button" onClick={reset} className="text-foreground underline underline-offset-4" data-testid="button-sports-reset">Reset</button>}
            </div>
          </div>

          <div className="mt-3 space-y-2">
            {feed.isRefetchError && data && <Notice tone="warn">Latest refresh failed. Showing the last loaded results. <button type="button" onClick={() => feed.refetch()} className="ml-1 font-semibold text-primary underline">Retry</button></Notice>}
            {!indexing && partial && <Notice tone="warn">Partial index: some source data could not be loaded. Counts reflect indexed events, not an exact global market count.</Notice>}
            {warnings.map((warning) => <Notice key={warning} tone="warn">{warning}</Notice>)}
          </div>

          <div className="mt-4" aria-live="polite">
            {feed.isLoading ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-label="Loading sports markets">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-56 animate-pulse rounded-lg border border-border bg-card/70" />)}</div> :
              feed.isError && !data ? <ErrorPanel title="Couldn't load sports markets" onRetry={() => feed.refetch()} retrying={feed.isFetching} /> :
                games.length ? <div className={`grid gap-3 sm:grid-cols-2 xl:grid-cols-3 ${feed.isPlaceholderData ? "opacity-60" : ""}`}>
                  {games.map((game) => <SportsGameCard key={game.key} game={game} />)}
                </div> :
                  <div className="rounded-lg border border-dashed border-border bg-card/50 px-6 py-14 text-center">
                    <p className="font-mono text-[10px] uppercase tracking-[.17em] text-primary">No matching games</p>
                    <h3 className="font-display mt-2 text-2xl font-bold tracking-tight">Nothing in this view yet</h3>
                    <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">{filtersActive ? "Try a different sport or loosen your search." : data?.indexing ? "The sports index is still building; check back shortly." : "No open sports events are currently indexed."}</p>
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
            Prices and contract volumes are from Kalshi public event data. Volume is counted in contracts, not dollars. The indexed event count is not an exact count of all available markets.
          </p>
        </div>
      </section>
      {overview.data?.updatedAt && <p className="mt-8 flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground"><RotateCw className="h-3 w-3" /> Overview refreshed {updatedLabel(overview.data.updatedAt)} · 60-second page checks</p>}
    </div>
  );
}
