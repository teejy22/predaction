import { Link } from "wouter";
import { X, ArrowUpRight } from "lucide-react";
import { useListSportsEvents, getListSportsEventsQueryKey } from "@workspace/api-client-react";
import { useWatchlist } from "@/hooks/use-watchlist";
import { EventsTable, EventCardSkeleton } from "@/components/event-card";
import { ErrorPanel, SportTag } from "@/components/bits";

export default function Watchlist() {
  const { items, remove, clear } = useWatchlist();
  const params = { sort: "closing" as const };
  const feed = useListSportsEvents(params, { query: { queryKey: getListSportsEventsQueryKey(params), refetchInterval: 60000 } });
  const byTicker = new Map((feed.data?.events ?? []).map((e) => [e.ticker, e]));
  const live = items.map((i) => byTicker.get(i.ticker)).filter((e): e is NonNullable<typeof e> => !!e);
  const gone = items.filter((i) => !byTicker.has(i.ticker));

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[.18em] text-primary">Saved on this device</p>
          <h1 className="mt-1 text-4xl font-bold tracking-[-.045em] sm:text-5xl">Watchlist</h1>
        </div>
        {items.length > 0 && (
          <button onClick={clear} data-testid="button-clear-watchlist" className="font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground underline underline-offset-4 hover:text-destructive">
            Clear all ({items.length})
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="mt-8 rounded-lg border border-dashed border-border bg-card/60 p-12 text-center">
          <h2 className="text-2xl font-bold tracking-tight">No saved games yet</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">Tap the bookmark on any event to track it here. Saved locally in your browser — no account needed.</p>
          <Link href="/" data-testid="link-browse" className="mt-6 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90">
            Browse the board <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      ) : feed.isLoading ? (
        <div className="mt-8 overflow-hidden rounded-lg border border-border bg-card">{items.slice(0, 6).map((i) => <EventCardSkeleton key={i.ticker} />)}</div>
      ) : feed.isError ? (
        <div className="mt-8"><ErrorPanel onRetry={() => feed.refetch()} retrying={feed.isFetching} /></div>
      ) : (
        <>
          {live.length > 0 && (
            <div className="mt-6"><EventsTable events={live} removable /></div>
          )}
          {gone.length > 0 && (
            <div className="mt-10">
              <h2 className="text-xl font-bold tracking-tight">Not in the live feed</h2>
              <p className="text-sm text-muted-foreground">These may have closed, settled, or fallen outside the indexed feed. Open one to check its status.</p>
              <ul className="mt-4 divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
                {gone.map((g) => (
                  <li key={g.ticker} className="flex items-center gap-3 p-4 transition-colors hover:bg-white/[.025]" data-testid={`row-saved-${g.ticker}`}>
                    <SportTag sport={g.sport} league={g.league} />
                    <Link href={`/event/${encodeURIComponent(g.ticker)}`} className="flex-1 truncate font-medium hover:underline">{g.title}</Link>
                    <button onClick={() => remove(g.ticker)} aria-label="Remove" data-testid={`button-remove-${g.ticker}`} className="rounded p-1 text-muted-foreground transition-colors hover:text-destructive">
                      <X className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
