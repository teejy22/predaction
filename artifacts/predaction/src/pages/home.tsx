import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X, Info, SlidersHorizontal, ArrowDownWideNarrow, ChevronLeft, ChevronRight, AlertTriangle, RotateCw } from "lucide-react";
import {
  useListEvents, getListEventsQueryKey,
  useGetOverview, getGetOverviewQueryKey,
  type ListEventsParams,
} from "@workspace/api-client-react";
import { EventsTable, EventCardSkeleton } from "@/components/event-card";
import { ErrorPanel } from "@/components/bits";
import { StepsGrid } from "@/components/how-it-works";
import { fmtContracts, updatedLabel } from "@/lib/format";
import { usePageMeta } from "@/lib/meta";

type Sort = "volume" | "closing" | "newest";
const SORTS: { v: Sort; l: string }[] = [
  { v: "volume", l: "Volume" },
  { v: "closing", l: "Closing soon" },
  { v: "newest", l: "Newest" },
];
const PAGE = 30;
const SPORTS = "Sports";

function readQS() {
  const p = new URLSearchParams(window.location.search);
  const sport = p.get("sport") || "";
  const league = p.get("league") || "";
  // Legacy links only carried sport/league: those always mean the Sports category.
  const category = p.get("category") || (sport || league ? SPORTS : "");
  const page = Math.max(0, (parseInt(p.get("page") || "1", 10) || 1) - 1);
  return {
    category, sport, league, page,
    q: p.get("q") || "",
    sort: (["volume", "closing", "newest"].includes(p.get("sort") || "") ? p.get("sort") : "volume") as Sort,
  };
}

export default function Home() {
  usePageMeta(
    "Prediction Pro | Browse open Kalshi events by category",
    "Browse open Kalshi events across politics, economics, sports, culture and more. Read crowd prices, close times and resolution rules.",
  );
  const init = useMemo(readQS, []);
  const [category, setCategory] = useState(init.category);
  const [sport, setSport] = useState(init.sport);
  const [league, setLeague] = useState(init.league);
  const [q, setQ] = useState(init.q);
  const [dq, setDq] = useState(init.q);
  const [sort, setSort] = useState<Sort>(init.sort);
  const [page, setPage] = useState(init.page);
  const inputRef = useRef<HTMLInputElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const isSports = category === SPORTS;

  useEffect(() => {
    const t = setTimeout(() => setDq(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  // Any filter change resets to the first page.
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) { firstRun.current = false; return; }
    setPage(0);
  }, [category, sport, league, dq, sort]);

  useEffect(() => {
    const p = new URLSearchParams();
    if (category) p.set("category", category);
    if (isSports && sport) p.set("sport", sport);
    if (isSports && league) p.set("league", league);
    if (dq) p.set("q", dq);
    if (sort !== "volume") p.set("sort", sort);
    if (page > 0) p.set("page", String(page + 1));
    const s = p.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${s ? `?${s}` : ""}`);
  }, [category, sport, league, dq, sort, page, isSports]);

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

  const params: ListEventsParams = { sort, offset: page * PAGE, limit: PAGE };
  if (category) params.category = category;
  if (isSports && sport) params.sport = sport;
  if (isSports && league) params.league = league;
  if (dq) params.search = dq;

  const overview = useGetOverview({ query: { queryKey: getGetOverviewQueryKey(), refetchInterval: 60000 } });
  const feed = useListEvents(params, {
    query: { queryKey: getListEventsQueryKey(params), refetchInterval: 60000, placeholderData: (prev) => prev },
  });

  const categories = useMemo(
    () => [...(overview.data?.categories ?? [])].sort((a, b) => b.count - a.count),
    [overview.data],
  );
  const sports = overview.data?.sports ?? [];
  const leagues = useMemo(() => {
    if (!isSports) return [];
    if (sport) return sports.find((s) => s.name === sport)?.leagues ?? [];
    return Array.from(new Set(sports.flatMap((s) => s.leagues))).filter(Boolean);
  }, [sports, sport, isSports]);

  const d = feed.data;
  const events = d?.events ?? [];
  const total = d?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE));
  useEffect(() => {
    if (d && !feed.isPlaceholderData && page >= pages) setPage(pages - 1);
  }, [d, feed.isPlaceholderData, page, pages]);
  const hasPrev = page > 0;
  const hasNext = !!d?.hasMore;
  const filtersOn = !!(category || sport || league || dq);
  const reset = () => { setCategory(""); setSport(""); setLeague(""); setQ(""); setDq(""); };
  const pickCategory = (c: string) => { setCategory(category === c ? "" : c); setSport(""); setLeague(""); };
  const go = (n: number) => {
    setPage(n);
    boardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const warnings = Array.from(new Set([...(d?.warnings ?? []), ...(overview.data?.warnings ?? [])]));
  const indexing = !!(d?.indexing || overview.data?.indexing);
  const partial = !!(d?.partial || overview.data?.partial);
  const heading = [league || sport, category].filter(Boolean)[0] || "All open events";

  return (
    <div>
      <section className="hero-field relative overflow-hidden border-b border-border">
        <div aria-hidden="true" className="price-texture select-none">
          <span>63%　18¢　−4.2　71%</span><span>29%　44¢　+2.8　08%</span><span>52%　91¢　−0.6　37%</span><span>12%　67¢　+9.1　85%</span>
        </div>
        <div className="relative mx-auto max-w-7xl px-4 pb-9 pt-10 sm:pb-11 md:px-6 md:pt-14">
          <div className="rise max-w-2xl">
            <p className="inline-flex flex-wrap items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[.18em] text-primary">
              <span className="live-dot h-1.5 w-1.5 rounded-full bg-primary" /> Open Kalshi events
              {d?.updatedAt && <span className="text-muted-foreground" data-testid="text-updated-at">· index updated {updatedLabel(d.updatedAt)}</span>}
            </p>
            <h1 className="mt-4 max-w-[680px] text-[2.4rem] font-extrabold leading-[1.04] tracking-[-.045em] sm:text-5xl md:text-[3.3rem]">
              What the crowd expects, <span className="text-primary">across every category.</span>
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
              Elections, rate decisions, weather, box office, championships. Browse open Kalshi events, compare crowd prices, read the rules, and keep the outcomes you follow close.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              <span data-testid="text-indexed-events">{overview.data ? `${overview.data.totalEvents.toLocaleString()} indexed events` : "Indexed event board"}</span>
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
            <Chip active={!category} onClick={() => pickCategory("")} label="All" count={overview.data?.totalEvents} />
            {categories.map((c) => <Chip key={c.name} active={category === c.name} onClick={() => pickCategory(c.name)} label={c.name} count={c.count} />)}
            {overview.isLoading && [0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="h-8 w-24 shrink-0 animate-pulse rounded bg-muted" />)}
          </div>
        </div>
      </section>

      <section ref={boardRef} className="mx-auto max-w-7xl scroll-mt-28 px-4 pt-7 md:px-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search events, people, places, topics" data-testid="input-search" className="h-11 w-full rounded-md border border-border bg-card pl-10 pr-12 text-sm outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground focus:border-primary focus:shadow-[0_0_0_3px_hsl(var(--primary)/.18)]" />
            {q ? <button onClick={() => setQ("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" data-testid="button-clear-search" aria-label="Clear search"><X className="h-4 w-4" /></button> : <kbd className="absolute right-3 top-1/2 -translate-y-1/2 rounded border border-border px-1.5 font-mono text-[10px] text-muted-foreground">/</kbd>}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="hidden items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground sm:inline-flex"><ArrowDownWideNarrow className="h-3.5 w-3.5" /> Sort</span>
            <div className="flex rounded-md border border-border bg-card p-1">
              {SORTS.map((s) => <button key={s.v} onClick={() => setSort(s.v)} data-testid={`button-sort-${s.v}`} className={`rounded px-3 py-1.5 text-xs font-semibold transition-colors ${sort === s.v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>{s.l}</button>)}
            </div>
          </div>
        </div>

        {isSports && sports.length > 0 && (
          <div className="mt-4 space-y-2.5 rounded-md border border-border bg-card/60 p-3" data-testid="panel-sports-filters">
            <div className="flex flex-wrap items-center gap-2">
              <span className="w-14 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Sport</span>
              {sports.map((s) => <Pill key={s.name} active={sport === s.name} onClick={() => { setSport(sport === s.name ? "" : s.name); setLeague(""); }} label={s.name} count={s.count} testId={`button-sport-${s.name}`} />)}
            </div>
            {leagues.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex w-14 items-center gap-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground"><SlidersHorizontal className="h-3 w-3" /> League</span>
                {leagues.map((l) => <Pill key={l} active={league === l} onClick={() => setLeague(league === l ? "" : l)} label={l} testId={`button-league-${l}`} />)}
              </div>
            )}
          </div>
        )}

        <div className="mt-7 flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
          <h2 className="text-xl font-bold tracking-tight sm:text-2xl">{heading}{dq && <span className="font-normal text-muted-foreground"> · “{dq}”</span>}</h2>
          <div className="flex flex-wrap items-center gap-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            {feed.isFetching && !feed.isLoading && <span className="flex items-center gap-1.5"><span className="live-dot h-1.5 w-1.5 rounded-full bg-primary" /> refreshing</span>}
            {d && <span data-testid="text-result-count">{total.toLocaleString()} matching · of {d.indexedEvents.toLocaleString()} indexed</span>}
            {filtersOn && <button onClick={reset} className="text-foreground underline underline-offset-4" data-testid="button-reset-filters">Reset</button>}
          </div>
        </div>

        <div className="mt-3 space-y-2">
          {feed.isRefetchError && d && (
            <Notice tone="error" testId="notice-refresh-failed">
              Latest refresh failed. Showing results loaded {feed.dataUpdatedAt ? new Date(feed.dataUpdatedAt).toLocaleTimeString() : "earlier"}.
              <button onClick={() => feed.refetch()} className="ml-2 inline-flex items-center gap-1 font-semibold text-primary underline underline-offset-4" data-testid="button-retry-feed"><RotateCw className="h-3 w-3" /> Retry</button>
            </Notice>
          )}
          {indexing && <Notice testId="notice-indexing"><span className="live-dot mr-2 inline-block h-1.5 w-1.5 rounded-full bg-primary align-middle" />Index is still building. Counts and results will grow as more events are loaded.</Notice>}
          {partial && !indexing && <Notice testId="notice-partial">Partial index: some source data could not be loaded this cycle. Counts reflect what Prediction Pro has indexed, not all of Kalshi.</Notice>}
          {warnings.map((w) => <Notice key={w} tone="warn" testId="notice-warning">{w}</Notice>)}
        </div>

        <div className="mt-4">
          {feed.isLoading ? (
            <div className="overflow-hidden rounded-lg border border-border bg-card" aria-label="Loading events">{Array.from({ length: 6 }).map((_, i) => <EventCardSkeleton key={i} />)}</div>
          ) : feed.isError && !d ? <ErrorPanel onRetry={() => feed.refetch()} retrying={feed.isFetching} /> : events.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-card/60 px-6 py-14 text-center">
              <p className="font-mono text-[10px] uppercase tracking-[.18em] text-primary">No events in this view</p>
              <h3 className="mt-2 text-2xl font-bold tracking-tight">Nothing matches yet</h3>
              <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">{filtersOn ? "No open events match those filters. Try another category or loosen the search." : indexing ? "The index is still loading. Results appear within a few minutes." : "There are no open events in the index right now."}</p>
              {filtersOn && <button onClick={reset} className="mt-5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90" data-testid="button-empty-reset">Clear filters</button>}
            </div>
          ) : <div className={`transition-opacity ${feed.isPlaceholderData ? "opacity-60" : ""}`}><EventsTable events={events} /></div>}
        </div>

        {d && (hasPrev || hasNext) && (
          <nav className="mt-5 flex items-center justify-between gap-3" aria-label="Pagination">
            <button onClick={() => go(page - 1)} disabled={!hasPrev || feed.isFetching} data-testid="button-page-prev" className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3.5 py-2 text-sm font-semibold transition-colors hover:border-primary hover:text-primary disabled:pointer-events-none disabled:opacity-40">
              <ChevronLeft className="h-4 w-4" /> Previous
            </button>
            <span className="font-mono text-[11px] text-muted-foreground tabular" data-testid="text-page">
              Page {page + 1} of {pages} · {(page * PAGE + 1).toLocaleString()}–{(page * PAGE + events.length).toLocaleString()}
            </span>
            <button onClick={() => go(d.nextOffset ? Math.floor(d.nextOffset / PAGE) : page + 1)} disabled={!hasNext || feed.isFetching} data-testid="button-page-next" className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3.5 py-2 text-sm font-semibold transition-colors hover:border-primary hover:text-primary disabled:pointer-events-none disabled:opacity-40">
              Next <ChevronRight className="h-4 w-4" />
            </button>
          </nav>
        )}

        <p className="mt-5 flex items-start gap-2 text-xs leading-5 text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
          Shows regular open events from Kalshi's public feed. Multivariate combo markets are excluded and this is not a historical archive. The shared index refreshes about every 5 minutes; this page checks every 60 seconds. Volume is counted in contracts, not dollars.
        </p>
      </section>

      <section className="mx-auto mt-20 max-w-7xl px-4 md:px-6">
        <div className="grid gap-7 border-t border-border pt-8 md:grid-cols-[.8fr_1.5fr]">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[.18em] text-primary">How to read the board</p>
            <h2 className="mt-2 max-w-md text-3xl font-bold leading-tight tracking-[-.035em] sm:text-4xl">A price is a forecast with money behind it.</h2>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">Prediction Pro doesn't forecast anything itself. We surface what traders on Kalshi are already pricing, so you can see the consensus on real-world events at a glance.</p>
          </div>
          <StepsGrid />
        </div>
      </section>
    </div>
  );
}

function Notice({ children, tone = "info", testId }: { children: React.ReactNode; tone?: "info" | "warn" | "error"; testId: string }) {
  const cls = tone === "error" ? "border-destructive/40 bg-destructive/10 text-foreground" : tone === "warn" ? "border-[hsl(37_88%_63%/.35)] bg-[hsl(37_88%_63%/.07)] text-foreground" : "border-border bg-card text-muted-foreground";
  return (
    <div className={`flex items-start gap-2 rounded-md border px-3 py-2.5 text-xs leading-5 ${cls}`} data-testid={testId}>
      {tone !== "info" && <AlertTriangle className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${tone === "error" ? "text-destructive" : "text-[hsl(37_88%_63%)]"}`} />}
      <div>{children}</div>
    </div>
  );
}

function Chip({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count?: number }) {
  return <button onClick={onClick} data-testid={`button-category-${label.toLowerCase().replace(/\s+/g, "-")}`} className={`flex shrink-0 items-center gap-2 rounded px-3 py-1.5 text-xs font-semibold transition-colors ${active ? "bg-primary/20 text-[hsl(262_80%_82%)]" : "text-muted-foreground hover:bg-card hover:text-foreground"}`}>{label}{count !== undefined && <span className="font-mono text-[10px] tabular opacity-70">{count.toLocaleString()}</span>}</button>;
}

function Pill({ active, onClick, label, count, testId }: { active: boolean; onClick: () => void; label: string; count?: number; testId: string }) {
  return <button onClick={onClick} data-testid={testId} className={`rounded border px-2.5 py-1 font-mono text-[10px] font-semibold uppercase transition-colors ${active ? "border-primary bg-primary/15 text-[hsl(262_80%_82%)]" : "border-border text-muted-foreground hover:border-primary/60 hover:text-foreground"}`}>{label}{count !== undefined && <span className="ml-1.5 opacity-60">{count}</span>}</button>;
}
