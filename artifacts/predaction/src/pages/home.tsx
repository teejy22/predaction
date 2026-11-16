import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X, Info, SlidersHorizontal } from "lucide-react";
import {
  useListSportsEvents, getListSportsEventsQueryKey,
  useGetSportsOverview, getGetSportsOverviewQueryKey,
  type ListSportsEventsParams,
} from "@workspace/api-client-react";
import { EventCard, EventCardSkeleton } from "@/components/event-card";
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

  const stats = overview.data
    ? [
        { l: "Events indexed", v: overview.data.totalEvents.toLocaleString() },
        { l: "Markets", v: overview.data.totalMarkets.toLocaleString() },
        { l: "Contracts traded", v: fmtContracts(overview.data.totalVolume) },
        { l: "Last 24h", v: fmtContracts(overview.data.volume24h) },
      ]
    : null;

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b-2 border-foreground">
        <div className="stripes absolute inset-0 opacity-60" />
        <div className="relative mx-auto grid max-w-7xl gap-8 px-4 py-12 md:grid-cols-[1.3fr_1fr] md:px-6 md:py-16">
          <div className="rise">
            <p className="inline-flex items-center gap-2 rounded-sm bg-foreground px-2 py-1 font-mono text-[11px] font-bold uppercase tracking-widest text-background">
              <span className="live-dot h-1.5 w-1.5 rounded-full bg-accent" /> Live board
              {feed.data?.updatedAt && <span className="text-background/60">· updated {updatedLabel(feed.data.updatedAt)}</span>}
            </p>
            <h1 className="mt-5 font-display text-6xl font-black uppercase leading-[0.85] md:text-8xl">
              Skip the hot takes.<br />
              <span className="text-primary">Read the price.</span>
            </h1>
            <p className="mt-5 max-w-lg text-base text-muted-foreground md:text-lg">
              Major sports markets on Kalshi, boiled down to what the crowd actually thinks. Filter by league, find the games closing soon, and save the ones you care about.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-px self-end overflow-hidden rounded-lg border-2 border-foreground bg-foreground">
            {stats
              ? stats.map((s, i) => (
                  <div key={s.l} className="rise bg-card p-4" style={{ animationDelay: `${120 + i * 60}ms` }}>
                    <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{s.l}</p>
                    <p className="mt-1 font-display text-4xl font-black tabular" data-testid={`stat-${i}`}>{s.v}</p>
                  </div>
                ))
              : [0, 1, 2, 3].map((i) => (
                  <div key={i} className="bg-card p-4">
                    <div className="h-3 w-20 animate-pulse rounded bg-muted" />
                    <div className="mt-3 h-8 w-16 animate-pulse rounded bg-muted" />
                  </div>
                ))}
            {overview.isError && (
              <div className="col-span-2 bg-card p-3 text-xs text-muted-foreground">
                Stats unavailable. <button className="font-bold underline" onClick={() => overview.refetch()} data-testid="button-retry-overview">Retry</button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Sport rail */}
      <section className="sticky top-16 z-30 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <div className="flex gap-2 overflow-x-auto py-3 [scrollbar-width:none]">
            <SportChip active={!sport} onClick={() => { setSport(""); setLeague(""); }} label="All sports" count={overview.data?.totalEvents} />
            {sports.map((s) => (
              <SportChip key={s.name} active={sport === s.name} onClick={() => { setSport(sport === s.name ? "" : s.name); setLeague(""); }} label={s.name} count={s.count} />
            ))}
            {overview.isLoading && [0, 1, 2, 3, 4].map((i) => <div key={i} className="h-9 w-24 shrink-0 animate-pulse rounded-md bg-muted" />)}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-8 md:px-6">
        {/* Controls */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search teams, players, matchups"
              data-testid="input-search"
              className="h-11 w-full rounded-md border-2 border-foreground bg-card pl-10 pr-16 text-sm outline-none transition-shadow focus:shadow-[3px_3px_0_hsl(var(--primary))]"
            />
            {q ? (
              <button onClick={() => setQ("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" data-testid="button-clear-search" aria-label="Clear search">
                <X className="h-4 w-4" />
              </button>
            ) : (
              <kbd className="absolute right-3 top-1/2 -translate-y-1/2 rounded border border-border px-1.5 font-mono text-[10px] text-muted-foreground">/</kbd>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex rounded-md border-2 border-foreground bg-card p-0.5">
              {SORTS.map((s) => (
                <button
                  key={s.v}
                  onClick={() => setSort(s.v)}
                  data-testid={`button-sort-${s.v}`}
                  className={`rounded px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors ${sort === s.v ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {s.l}
                </button>
              ))}
            </div>
          </div>
        </div>

        {leagues.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1 font-mono text-[11px] uppercase tracking-widest text-muted-foreground"><SlidersHorizontal className="h-3.5 w-3.5" /> League</span>
            {leagues.map((l) => (
              <button
                key={l}
                onClick={() => setLeague(league === l ? "" : l)}
                data-testid={`button-league-${l}`}
                className={`rounded-sm border px-2 py-1 font-mono text-xs font-bold uppercase transition-all active:scale-95 ${league === l ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-foreground"}`}
              >
                {l}
              </button>
            ))}
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-b-2 border-foreground pb-2">
          <h2 className="font-display text-3xl font-black uppercase">
            {league || sport || "All sports"}
            {dq && <span className="text-muted-foreground"> / "{dq}"</span>}
          </h2>
          <div className="flex items-center gap-3 font-mono text-xs text-muted-foreground">
            {feed.isFetching && !feed.isLoading && <span className="flex items-center gap-1"><span className="live-dot h-1.5 w-1.5 rounded-full bg-primary" /> refreshing</span>}
            {feed.data && <span data-testid="text-result-count">{feed.data.total.toLocaleString()} events</span>}
            {filtersOn && <button onClick={reset} className="font-bold text-foreground underline underline-offset-4" data-testid="button-reset-filters">Reset</button>}
          </div>
        </div>

        {feed.data?.partial && (
          <p className="mt-3 flex items-start gap-2 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground" data-testid="notice-partial">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Selected-series coverage: some results may be capped or temporarily unavailable. Counts reflect Predaction's indexed feed, not all of Kalshi.
          </p>
        )}

        <div className="mt-6">
          {feed.isLoading ? (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => <EventCardSkeleton key={i} />)}
            </div>
          ) : feed.isError && !feed.data ? (
            <ErrorPanel onRetry={() => feed.refetch()} retrying={feed.isFetching} />
          ) : events.length === 0 ? (
            <div className="stripes rounded-lg border-2 border-dashed border-foreground/40 p-12 text-center">
              <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">No whistle yet</p>
              <h3 className="mt-2 font-display text-4xl font-black uppercase">Nothing on the board</h3>
              <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
                {filtersOn ? "No open markets match those filters. Try another league or loosen the search." : "There are no open sports markets in the feed right now. Check back closer to game time."}
              </p>
              {filtersOn && (
                <button onClick={reset} className="mt-5 rounded-md border-2 border-foreground bg-accent px-4 py-2 text-sm font-bold uppercase transition-transform hover:-translate-y-0.5" data-testid="button-empty-reset">
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <div className={`grid gap-5 transition-opacity md:grid-cols-2 xl:grid-cols-3 ${feed.isPlaceholderData ? "opacity-60" : ""}`}>
              {events.map((e, i) => (
                <EventCard key={e.ticker} event={e} index={i} featured={i === 0 && sort === "volume" && !filtersOn} />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto mt-20 max-w-7xl px-4 md:px-6">
        <div className="grid gap-8 md:grid-cols-[1fr_1.6fr]">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-primary">How it works</p>
            <h2 className="mt-2 font-display text-5xl font-black uppercase leading-[0.9]">A price is a forecast with money behind it</h2>
            <p className="mt-4 text-sm text-muted-foreground">Predaction doesn't predict anything. We surface what traders on Kalshi are already pricing, so you can see the consensus before kickoff.</p>
          </div>
          <StepsGrid />
        </div>
      </section>
    </div>
  );
}

function SportChip({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count?: number }) {
  return (
    <button
      onClick={onClick}
      data-testid={`button-sport-${label.toLowerCase().replace(/\s+/g, "-")}`}
      className={`flex shrink-0 items-center gap-2 rounded-md border-2 px-3 py-1.5 text-sm font-bold uppercase tracking-wide transition-all active:scale-95 ${active ? "border-foreground bg-foreground text-background" : "border-transparent bg-card hover:border-foreground"}`}
    >
      {label}
      {count !== undefined && <span className={`font-mono text-[11px] tabular ${active ? "text-accent" : "text-muted-foreground"}`}>{count}</span>}
    </button>
  );
}
