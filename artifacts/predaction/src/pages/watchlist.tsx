import { useState } from "react";
import { Link } from "wouter";
import { X, ArrowUpRight, RotateCw, AlertTriangle, Clock } from "lucide-react";
import { useGetEvent, getGetEventQueryKey } from "@workspace/api-client-react";
import { useWatchlist, type WatchItem } from "@/hooks/use-watchlist";
import { CategoryTag, Change } from "@/components/bits";
import { closeLabel, fmtContracts, updatedLabel } from "@/lib/format";
import { usePageMeta } from "@/lib/meta";

// Each saved row fetches its own event; showing a page at a time caps concurrent requests.
const BATCH = 12;

export default function Watchlist() {
  usePageMeta("Watchlist | Prediction Pro", "Events you saved on this device, refreshed directly from Kalshi's public data.");
  const { items, remove, clear } = useWatchlist();
  const [shown, setShown] = useState(BATCH);
  const visible = items.slice(0, shown);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[.18em] text-primary">Saved on this device</p>
          <h1 className="mt-1 text-4xl font-bold tracking-[-.04em] sm:text-5xl">Watchlist</h1>
        </div>
        {items.length > 0 && (
          <button onClick={clear} data-testid="button-clear-watchlist" className="font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground underline underline-offset-4 hover:text-destructive">
            Clear all ({items.length})
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="mt-8 rounded-lg border border-dashed border-border bg-card/60 p-12 text-center">
          <h2 className="text-2xl font-bold tracking-tight">No saved events yet</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">Tap the bookmark on any event to track it here. Saved locally in your browser, no account needed.</p>
          <Link href="/" data-testid="link-browse" className="mt-6 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90">
            Browse markets <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <>
          <p className="mt-4 text-xs text-muted-foreground">Each saved event is loaded directly by ticker and refreshed every 60 seconds.</p>
          <ul className="mt-4 divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
            {visible.map((item, i) => <SavedRow key={item.ticker} item={item} index={i} onRemove={() => remove(item.ticker)} />)}
          </ul>
          {items.length > shown && (
            <button onClick={() => setShown((s) => s + BATCH)} data-testid="button-show-more" className="mt-4 w-full rounded-md border border-border bg-card py-2.5 text-sm font-semibold transition-colors hover:border-primary hover:text-primary">
              Show {Math.min(BATCH, items.length - shown)} more of {items.length - shown} remaining
            </button>
          )}
        </>
      )}
    </div>
  );
}

function SavedRow({ item, index, onRemove }: { item: WatchItem; index: number; onRemove: () => void }) {
  const q = useGetEvent(item.ticker, {
    query: { queryKey: getGetEventQueryKey(item.ticker), refetchInterval: 60000, retry: 1 },
  });
  const e = q.data;
  const status = (q.error as { status?: number } | null)?.status;
  const leader = e ? [...e.markets].sort((a, b) => b.probability - a.probability)[0] : undefined;
  const href = `/event/${encodeURIComponent(item.ticker)}`;

  return (
    <li className="rise grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 p-4 sm:px-5" style={{ animationDelay: `${Math.min(index, 10) * 35}ms` }} data-testid={`row-saved-${item.ticker}`}>
      <div className="min-w-0">
        <CategoryTag category={e?.category || item.category} sport={e?.sport ?? item.sport} league={e?.league ?? item.league} />
        <Link href={href} data-testid={`link-saved-${item.ticker}`} className="mt-1.5 block truncate font-semibold hover:text-primary">{e?.title || item.title}</Link>
        {e?.subtitle && <p className="truncate text-xs text-muted-foreground">{e.subtitle}</p>}

        {q.isLoading ? (
          <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-muted" />
        ) : q.isError && !e ? (
          <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-destructive" data-testid={`status-saved-error-${item.ticker}`}>
            <AlertTriangle className="h-3.5 w-3.5" />
            {status === 404 ? "This ticker is no longer available from Kalshi." : "Couldn't load this event."}
            <button onClick={() => q.refetch()} data-testid={`button-retry-${item.ticker}`} className="inline-flex items-center gap-1 font-semibold text-foreground underline underline-offset-4 hover:text-primary">
              <RotateCw className={`h-3 w-3 ${q.isFetching ? "animate-spin" : ""}`} /> Retry
            </button>
          </p>
        ) : e ? (
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] text-muted-foreground">
            <span className="text-foreground">{leader ? `${leader.subtitle || leader.title} · ${Math.round(leader.probability)}%` : "No open outcome"}</span>
            {leader && <Change value={leader.change} />}
            <span>{fmtContracts(e.volume)} contracts</span>
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{closeLabel(e.closeTime)}</span>
            {q.isRefetchError && (
              <button onClick={() => q.refetch()} className="text-destructive underline underline-offset-4" data-testid={`button-retry-refresh-${item.ticker}`}>
                Refresh failed, loaded {updatedLabel(new Date(q.dataUpdatedAt).toISOString())}. Retry
              </button>
            )}
          </div>
        ) : null}
      </div>
      <div className="flex items-center gap-1.5">
        <Link href={href} data-testid={`button-open-${item.ticker}`} aria-label="Open event" className="grid h-9 w-9 place-items-center rounded-md border border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary">
          <ArrowUpRight className="h-4 w-4" />
        </Link>
        <button onClick={onRemove} aria-label="Remove from watchlist" data-testid={`button-remove-${item.ticker}`} className="grid h-9 w-9 place-items-center rounded-md border border-border text-muted-foreground transition-colors hover:border-destructive hover:text-destructive">
          <X className="h-4 w-4" />
        </button>
      </div>
    </li>
  );
}
