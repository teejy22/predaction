import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { ChevronLeft, ChevronRight, Info, Search, X } from "lucide-react";
import {
  getGetOverviewQueryKey, getListEventsQueryKey, useGetOverview, useListEvents,
  type ListEventsParams,
} from "@workspace/api-client-react";
import { ErrorPanel } from "@/components/bits";
import { SportsEventCard } from "@/components/sports-event-card";
import { updatedLabel } from "@/lib/format";
import { usePageMeta } from "@/lib/meta";

type Sort = "volume" | "closing" | "newest";
const SORTS: { value: Sort; label: string }[] = [
  { value: "volume", label: "Most traded" },
  { value: "closing", label: "Closing soon" },
  { value: "newest", label: "Newest" },
];
const PAGE_SIZE = 24;
const SPORTS = "Sports";

type Filters = { category: string; q: string; sort: Sort; page: number };

function parse(search: string): Filters {
  const params = new URLSearchParams(search);
  const sort = params.get("sort");
  return {
    category: params.get("category") ?? "",
    q: params.get("q") ?? "",
    sort: sort === "closing" || sort === "newest" ? sort : "volume",
    page: Math.max(0, (Number.parseInt(params.get("page") || "1", 10) || 1) - 1),
  };
}

function marketsUrl(filters: Filters) {
  const params = new URLSearchParams();
  if (filters.category) params.set("category", filters.category);
  if (filters.q) params.set("q", filters.q);
  if (filters.sort !== "volume") params.set("sort", filters.sort);
  if (filters.page > 0) params.set("page", String(filters.page + 1));
  const query = params.toString();
  return `/markets${query ? `?${query}` : ""}`;
}

const chipClass = (active: boolean) =>
  `flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${active ? "border-primary bg-primary/20 text-[hsl(262_80%_84%)]" : "border-border bg-card/60 text-muted-foreground hover:border-primary/50 hover:text-foreground"}`;

// The full board: every open event as a card, one topic at a time. The URL holds the view so it can be shared.
export default function MarketsPage() {
  const search = useSearch();
  const [, navigate] = useLocation();
  const filters = useMemo(() => parse(search), [search]);
  const { category, sort, page } = filters;
  usePageMeta(
    `${category || "All"} markets | Prediction Pro`,
    "Browse every open Kalshi event by topic: politics, elections, economics, entertainment and more, with current chances and contract volume.",
  );
  const go = (next: Partial<Filters>, replace = false) => navigate(marketsUrl({ ...filters, page: 0, ...next }), { replace });

  const [text, setText] = useState(filters.q);
  const inputRef = useRef<HTMLInputElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  // Typing updates the URL after a short pause; a URL change from elsewhere refills the box.
  useEffect(() => { setText(filters.q); }, [filters.q]);
  useEffect(() => {
    const next = text.trim();
    if (next === filters.q) return;
    const timer = window.setTimeout(() => go({ q: next }, true), 300);
    return () => window.clearTimeout(timer);
  }, [text]);

  const params: ListEventsParams = { sort, offset: page * PAGE_SIZE, limit: PAGE_SIZE };
  if (category) params.category = category;
  if (filters.q) params.search = filters.q;
  const overview = useGetOverview({ query: { queryKey: getGetOverviewQueryKey(), refetchInterval: 60000 } });
  const feed = useListEvents(params, {
    query: {
      queryKey: getListEventsQueryKey(params), placeholderData: (prev) => prev,
      // Pictures load in the background on the server, so a fresh view is checked again shortly, twice at most.
      refetchInterval: (query) => {
        const missing = query.state.data?.events.some((event) => !event.image && !event.teams?.length);
        return missing && query.state.dataUpdateCount < 3 ? 4000 : 60000;
      },
    },
  });
  const topics = useMemo(
    () => [...(overview.data?.categories ?? [])].filter((item) => item.count > 0 && item.name !== SPORTS).sort((a, b) => b.count - a.count),
    [overview.data],
  );
  const data = feed.data;
  const events = data?.events ?? [];
  const total = data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  useEffect(() => {
    if (data && !feed.isPlaceholderData && page >= pages) go({ page: pages - 1 }, true);
  }, [data, feed.isPlaceholderData, page, pages]);
  const toPage = (next: number) => {
    go({ page: next });
    topRef.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  };
  const filtersOn = !!(category || filters.q);
  const indexing = !!(data?.indexing || overview.data?.indexing);

  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 pt-6 md:px-6 md:pt-9">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="hidden font-mono text-[10px] uppercase tracking-[.18em] text-primary sm:block">Kalshi · open events</p>
          <h1 className="font-display text-3xl font-bold tracking-[-.045em] sm:mt-2 sm:text-4xl" data-testid="text-markets-heading">{category || "All markets"}</h1>
        </div>
        <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground" data-testid="text-markets-count">
          {data ? `${total.toLocaleString()} ${total === 1 ? "event" : "events"}` : "Loading"}{indexing ? " · still loading more" : ""}
          {overview.data?.updatedAt ? ` · updated ${updatedLabel(overview.data.updatedAt)}` : ""}
        </p>
      </header>

      <div ref={topRef} className="sticky top-14 z-30 -mx-4 mt-4 scroll-mt-14 border-b border-border bg-background/95 px-4 backdrop-blur md:-mx-6 md:px-6">
        <nav aria-label="Topics" className="flex gap-2 overflow-x-auto py-3 [scrollbar-width:none] sm:flex-wrap sm:overflow-visible">
          <button type="button" onClick={() => go({ category: "" })} aria-pressed={!category} data-testid="button-topic-all" className={chipClass(!category)}>All</button>
          <Link href="/sports" data-testid="link-topic-sports" className={chipClass(false)}>Sports</Link>
          {topics.map((item) => (
            <button key={item.name} type="button" onClick={() => go({ category: item.name })} aria-pressed={category === item.name} data-testid={`button-topic-${item.name.toLowerCase().replace(/\s+/g, "-")}`} className={chipClass(category === item.name)}>
              {item.name}<span className="font-mono text-[10px] font-normal tabular opacity-70">{item.count.toLocaleString()}</span>
            </button>
          ))}
          {overview.isLoading && Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-9 w-24 shrink-0 animate-pulse rounded-full bg-muted" />)}
        </nav>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Search markets</span>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input ref={inputRef} type="search" value={text} onChange={(event) => setText(event.target.value)} placeholder={category ? `Search ${category.toLowerCase()} markets` : "Search markets, people, topics"} data-testid="input-markets-search" className="h-11 w-full rounded-md border border-border bg-card pl-10 pr-10 text-sm outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20" />
          {text && <button type="button" onClick={() => setText("")} aria-label="Clear search" data-testid="button-markets-clear-search" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>}
        </label>
        <div className="flex rounded-md border border-border bg-card p-1" role="group" aria-label="Sort markets">
          {SORTS.map((item) => <button key={item.value} type="button" onClick={() => go({ sort: item.value })} aria-pressed={sort === item.value} data-testid={`button-markets-sort-${item.value}`} className={`flex-1 whitespace-nowrap rounded px-3 py-2 text-xs font-semibold transition-colors sm:flex-none sm:py-1.5 ${sort === item.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>{item.label}</button>)}
        </div>
      </div>

      {feed.isRefetchError && data && <p className="mt-3 rounded-md border border-[hsl(37_88%_63%/.35)] bg-[hsl(37_88%_63%/.07)] px-3 py-2.5 text-xs">Latest refresh failed. Showing the last loaded results. <button type="button" onClick={() => feed.refetch()} className="ml-1 font-semibold text-primary underline">Retry</button></p>}

      <div className="mt-5" aria-live="polite">
        {feed.isLoading ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label="Loading markets">{Array.from({ length: 9 }).map((_, i) => <div key={i} className="h-56 animate-pulse rounded-lg border border-border bg-card/65" />)}</div> :
          feed.isError && !data ? <ErrorPanel onRetry={() => feed.refetch()} retrying={feed.isFetching} /> :
            events.length ? <div className={`grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 ${feed.isPlaceholderData ? "opacity-60" : ""}`} data-testid="grid-markets">
              {events.map((event) => <SportsEventCard key={event.ticker} event={event} />)}
            </div> :
              <div className="rounded-lg border border-dashed border-border bg-card/50 px-6 py-14 text-center">
                <h2 className="font-display text-2xl font-bold tracking-tight">Nothing matches yet</h2>
                <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">{filtersOn ? "No open events match this view. Try another topic or a shorter search." : indexing ? "Markets are still loading. Check back in a few minutes." : "There are no open events right now."}</p>
                {filtersOn && <button type="button" onClick={() => { setText(""); navigate("/markets"); }} data-testid="button-markets-reset" className="mt-5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Show all markets</button>}
              </div>}
      </div>

      {data && (page > 0 || data.hasMore) && <nav className="mt-6 flex items-center justify-between gap-3" aria-label="Pagination">
        <button type="button" onClick={() => toPage(page - 1)} disabled={page === 0 || feed.isFetching} data-testid="button-markets-page-prev" className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3.5 py-2 text-sm font-semibold transition-colors hover:border-primary hover:text-primary disabled:pointer-events-none disabled:opacity-40"><ChevronLeft className="h-4 w-4" /> Previous</button>
        <span className="font-mono text-[11px] text-muted-foreground tabular" data-testid="text-markets-page">Page {page + 1} of {pages}</span>
        <button type="button" onClick={() => toPage(page + 1)} disabled={!data.hasMore || feed.isFetching || feed.isPlaceholderData} data-testid="button-markets-page-next" className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3.5 py-2 text-sm font-semibold transition-colors hover:border-primary hover:text-primary disabled:pointer-events-none disabled:opacity-40">Next <ChevronRight className="h-4 w-4" /></button>
      </nav>}

      <p className="mt-6 flex items-start gap-2 text-xs leading-5 text-muted-foreground">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
        Chances and contract volumes are from Kalshi's public feed, refreshed about every 5 minutes. Each card shows its three most traded outcomes. Combo markets are not included. Volume is counted in contracts, not dollars.
      </p>
    </div>
  );
}
