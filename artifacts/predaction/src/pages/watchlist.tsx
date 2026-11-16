import { Link } from "wouter";
import { X, ArrowUpRight } from "lucide-react";
import { useListSportsEvents, getListSportsEventsQueryKey } from "@workspace/api-client-react";
import { useWatchlist } from "@/hooks/use-watchlist";
import { EventCard, EventCardSkeleton } from "@/components/event-card";
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
      <div className="flex flex-wrap items-end justify-between gap-4 border-b-2 border-foreground pb-3">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-primary">Saved on this device</p>
          <h1 className="font-display text-6xl font-black uppercase leading-none">Watchlist</h1>
        </div>
        {items.length > 0 && (
          <button onClick={clear} data-testid="button-clear-watchlist" className="font-mono text-xs font-bold uppercase text-muted-foreground underline underline-offset-4 hover:text-destructive">
            Clear all ({items.length})
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="stripes mt-8 rounded-lg border-2 border-dashed border-foreground/40 p-14 text-center">
          <h2 className="font-display text-4xl font-black uppercase">Your bench is empty</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">Tap the bookmark on any event to track it here. Saved locally in your browser — no account needed.</p>
          <Link href="/" data-testid="link-browse" className="mt-6 inline-flex items-center gap-2 rounded-md border-2 border-foreground bg-primary px-4 py-2.5 text-sm font-bold uppercase text-primary-foreground transition-all hover:-translate-y-0.5 hover:shadow-[3px_3px_0_hsl(var(--foreground))]">
            Browse the board <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      ) : feed.isLoading ? (
        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{items.slice(0, 6).map((i) => <EventCardSkeleton key={i.ticker} />)}</div>
      ) : feed.isError ? (
        <div className="mt-8"><ErrorPanel onRetry={() => feed.refetch()} retrying={feed.isFetching} /></div>
      ) : (
        <>
          {live.length > 0 && (
            <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {live.map((e, i) => <EventCard key={e.ticker} event={e} index={i} />)}
            </div>
          )}
          {gone.length > 0 && (
            <div className="mt-10">
              <h2 className="font-display text-2xl font-black uppercase">Not in the live feed</h2>
              <p className="text-sm text-muted-foreground">These may have closed, settled, or fallen outside the indexed feed. Open one to check its status.</p>
              <ul className="mt-4 divide-y divide-border rounded-lg border-2 border-foreground bg-card">
                {gone.map((g) => (
                  <li key={g.ticker} className="flex items-center gap-3 p-4" data-testid={`row-saved-${g.ticker}`}>
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
