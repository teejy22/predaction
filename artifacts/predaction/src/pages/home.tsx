import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X, Info, SlidersHorizontal, ArrowDownWideNarrow } from "lucide-react";
import {
  useListSportsEvents, getListSportsEventsQueryKey,
  useGetSportsOverview, getGetSportsOverviewQueryKey,
  type ListSportsEventsParams,
} from "@workspace/api-client-react";
import { EventsTable, EventCardSkeleton } from "@/components/event-card";
import { ErrorPanel } from "@/components/bits";
import { StepsGrid } from "@/components/how-it-works";
import { fmtContracts, updatedLabel } from "@/lib/format";

type Sort = "volume" | "closing" | "newest";
const SORTS: { v: Sort; l: string }[] = [
  { v: "volume", l: "Volume" },
  { v: "closing", l: "Closing soon" },
  { v: "newest", l: "Newest" },
];

function readQS() {
  const p = new URLSearchParams(window.location.search);
  return {
    sport: p.get("sport") || "",
    league: p.get("league") || "",
    q: p.get("q") || "",
    sort: (["volume", "closing", "newest"].includes(p.get("sort") || "") ? p.get("sort") : "volume") as Sort,
  };
}

export default function Home() {
  const init = useMemo(readQS, []);
  const [sport, setSport] = useState(init.sport);
  const [league, setLeague] = useState(init.league);
  const [q, setQ] = useState(init.q);
  const [dq, setDq] = useState(init.q);
  const [sort, setSort] = useState<Sort>(init.sort);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDq(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const p = new URLSearchParams();
    if (sport) p.set("sport", sport);
    if (league) p.set("league", league);
    if (dq) p.set("q", dq);
    if (sort !== "volume") p.set("sort", sort);
    const s = p.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${s ? `?${s}` : ""}`);
  }, [sport, league, dq, sort]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const params: ListSportsEventsParams = { sort };
  if (sport) params.sport = sport;
  if (league) params.league = league;
  if (dq) params.search = dq;

  const overview = useGetSportsOverview({ query: { queryKey: getGetSportsOverviewQueryKey(), refetchInterval: 60000 } });
  const feed = useListSportsEvents(params, {
    query: { queryKey: getListSportsEventsQueryKey(params), refetchInterval: 60000, placeholderData: (prev) => prev },
  });

  const sports = overview.data?.sports ?? [];
  const leagues = useMemo(() => {
    if (sport) return sports.find((s) => s.name === sport)?.leagues ?? [];
    return Array.from(new Set(sports.flatMap((s) => s.leagues)));
  }, [sports, sport]);
  const events = feed.data?.events ?? [];
  const filtersOn = !!(sport || league || dq);
  const reset = () => { setSport(""); setLeague(""); setQ(""); setDq(""); };

  return (
    <div>
      <section className="hero-field relative overflow-hidden border-b border-border">
        <div aria-hidden="true" className="price-texture select-none">
          <span>+142　29%　−180　08%</span><span>+310　51%　−105　66%</span><span>−26　37%　+118　12%</span><span>+405　12%　−330　85%</span>
        </div>
        <div className="relative mx-auto max-w-7xl px-4 pb-9 pt-10 sm:pb-11 md:px-6 md:pt-14">
          <div className="rise max-w-2xl">
            <p className="inline-flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[.18em] text-primary">
              <span className="live-dot h-1.5 w-1.5 rounded-full bg-primary" /> Live markets
              {feed.data?.updatedAt && <span className="text-muted-foreground">· updated {updatedLabel(feed.data.updatedAt)}</span>}
            </p>
            <h1 className="mt-4 max-w-[650px] text-[2.55rem] font-extrabold leading-[1.02] tracking-[-.055em] sm:text-5xl md:text-[3.45rem]">
              Smarter game-day reads start with the <span className="text-primary">crowd price.</span>
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
              A clear read on what fans and traders expect before kickoff. Browse live sports markets on Kalshi, compare prices, and keep the games you follow close.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              <span>{overview.data ? `${overview.data.totalEvents.toLocaleString()} events` : "Live event board"}</span>
              <span>{overview.data ? `${overview.data.totalMarkets.toLocaleString()} markets` : "Kalshi public data"}</span>
              <span>{overview.data ? `${fmtContracts(overview.data.volume24h)} contracts · 24h` : "Read-only discovery"}</span>
              {overview.isError && <button className="text-primary underline" onClick={() => overview.refetch()} data-testid="button-retry-overview">Retry stats</button>}
            </div>
          </div>
        </div>
      </section>

      <section className="sticky top-14 z-30 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <div className="flex gap-2 overflow-x-auto py-3 [scrollbar-width:none]">
            <SportChip active={!sport} onClick={() => { setSport(""); setLeague(""); }} label="All sports" count={overview.data?.totalEvents} />
            {sports.map((s) => <SportChip key={s.name} active={sport === s.name} onClick={() => { setSport(sport === s.name ? "" : s.name); setLeague(""); }} label={s.name} count={s.count} />)}
            {overview.isLoading && [0, 1, 2, 3, 4].map((i) => <div key={i} className="h-8 w-24 shrink-0 animate-pulse rounded bg-muted" />)}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-7 md:px-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search teams, players, matchups" data-testid="input-search" className="h-11 w-full rounded-md border border-border bg-card pl-10 pr-12 text-sm outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground focus:border-primary focus:shadow-[0_0_0_3px_hsl(var(--primary)/.14)]" />
            {q ? <button onClick={() => setQ("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" data-testid="button-clear-search" aria-label="Clear search"><X className="h-4 w-4" /></button> : <kbd className="absolute right-3 top-1/2 -translate-y-1/2 rounded border border-border px-1.5 font-mono text-[10px] text-muted-foreground">/</kbd>}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="hidden items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground sm:inline-flex"><ArrowDownWideNarrow className="h-3.5 w-3.5" /> Sort</span>
            <div className="flex rounded-md border border-border bg-card p-1">
              {SORTS.map((s) => <button key={s.v} onClick={() => setSort(s.v)} data-testid={`button-sort-${s.v}`} className={`rounded px-3 py-1.5 text-xs font-semibold transition-colors ${sort === s.v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>{s.l}</button>)}
            </div>
          </div>
        </div>

        {leagues.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground"><SlidersHorizontal className="h-3.5 w-3.5" /> League</span>
            {leagues.map((l) => <button key={l} onClick={() => setLeague(league === l ? "" : l)} data-testid={`button-league-${l}`} className={`rounded border px-2.5 py-1 font-mono text-[10px] font-semibold uppercase transition-colors ${league === l ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:border-primary/60 hover:text-foreground"}`}>{l}</button>)}
          </div>
        )}

        <div className="mt-7 flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
          <h2 className="text-xl font-bold tracking-tight sm:text-2xl">{league || sport || "Top markets"}{dq && <span className="font-normal text-muted-foreground"> · “{dq}”</span>}</h2>
          <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            {feed.isFetching && !feed.isLoading && <span className="flex items-center gap-1.5"><span className="live-dot h-1.5 w-1.5 rounded-full bg-primary" /> refreshing</span>}
            {feed.data && <span data-testid="text-result-count">{feed.data.total.toLocaleString()} events</span>}
            {filtersOn && <button onClick={reset} className="text-foreground underline underline-offset-4" data-testid="button-reset-filters">Reset</button>}
          </div>
        </div>

        {feed.data?.partial && <p className="mt-3 flex items-start gap-2 rounded-md border border-border bg-card px-3 py-2.5 text-xs leading-5 text-muted-foreground" data-testid="notice-partial"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />Selected-series coverage: some results may be capped or temporarily unavailable. Counts reflect Predaction's indexed feed, not all of Kalshi.</p>}

        <div className="mt-4">
          {feed.isLoading ? (
            <div className="overflow-hidden rounded-lg border border-border bg-card" aria-label="Loading markets">{Array.from({ length: 5 }).map((_, i) => <EventCardSkeleton key={i} />)}</div>
          ) : feed.isError && !feed.data ? <ErrorPanel onRetry={() => feed.refetch()} retrying={feed.isFetching} /> : events.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-card/60 px-6 py-14 text-center">
              <p className="font-mono text-[10px] uppercase tracking-[.18em] text-primary">No markets in this view</p>
              <h3 className="mt-2 text-2xl font-bold tracking-tight">Nothing on the board</h3>
              <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">{filtersOn ? "No open markets match those filters. Try another league or loosen the search." : "There are no open sports markets in the feed right now. Check back closer to game time."}</p>
              {filtersOn && <button onClick={reset} className="mt-5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90" data-testid="button-empty-reset">Clear filters</button>}
            </div>
          ) : <div className={`transition-opacity ${feed.isPlaceholderData ? "opacity-60" : ""}`}><EventsTable events={events} /></div>}
        </div>
      </section>

      <section className="mx-auto mt-20 max-w-7xl px-4 md:px-6">
        <div className="grid gap-7 border-t border-border pt-8 md:grid-cols-[.8fr_1.5fr]">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[.18em] text-primary">How to read the board</p>
            <h2 className="mt-2 max-w-md text-3xl font-bold leading-tight tracking-[-.04em] sm:text-4xl">A price is a forecast with money behind it.</h2>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">Predaction doesn't predict anything. We surface what traders on Kalshi are already pricing, so you can see the consensus before kickoff.</p>
          </div>
          <StepsGrid />
        </div>
      </section>
    </div>
  );
}

function SportChip({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count?: number }) {
  return <button onClick={onClick} data-testid={`button-sport-${label.toLowerCase().replace(/\s+/g, "-")}`} className={`flex shrink-0 items-center gap-2 rounded px-3 py-1.5 text-xs font-semibold transition-colors ${active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-card hover:text-foreground"}`}>{label}{count !== undefined && <span className="font-mono text-[10px] tabular opacity-70">{count}</span>}</button>;
}
