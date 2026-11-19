import { useEffect, useState } from "react";
import { usePageMeta } from "@/lib/meta";
import { useFlowframeData } from "@/components/flowframe-data";
import { FeedStatus, FlowframeAttribution } from "@/components/flowframe-feed-ui";
import { MoversList } from "@/components/flowframe-lists";

type Venue = "kalshi" | "polymarket";
type Direction = "all" | "up" | "down";

export default function MoversPage() {
  usePageMeta("Market Movers | Prediction Pro", "Browse Kalshi moves since midnight UTC and Polymarket's rolling 24-hour movers, sourced by FlowFrame.");
  const [venue, setVenue] = useState<Venue>(() => new URLSearchParams(window.location.search).get("venue") === "polymarket" ? "polymarket" : "kalshi");
  const [direction, setDirection] = useState<Direction>(() => {
    const value = new URLSearchParams(window.location.search).get("direction");
    return value === "up" || value === "down" ? value : "all";
  });
  useEffect(() => {
    const params = new URLSearchParams({ venue });
    if (direction !== "all") params.set("direction", direction);
    window.history.replaceState(null, "", `${window.location.pathname}?${params}`);
  }, [venue, direction]);
  const query = useFlowframeData();
  const data = query.data;
  const feed = venue === "kalshi" ? data?.movers : data?.polymarketMovers;
  const items = (feed?.items ?? []).filter((item) => direction === "all" || (direction === "up" ? (item.change ?? 0) > 0 : (item.change ?? 0) < 0));
  const retry = () => { void query.refetch(); };
  const venueButton = "rounded px-3.5 py-2 text-xs font-semibold capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";

  return <main className="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-12">
    <header className="mb-7 border-b border-border pb-6">
      <h1 className="font-display text-4xl font-bold tracking-[-.055em] sm:text-5xl">Market movers</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">A sourced view of markets with the largest reported price movement. Values are already normalized to probability percentages; changes are percentage points.</p>
    </header>
    <section className="rounded-lg border border-border bg-card/50 p-4 sm:p-6" aria-label={`${venue} movers`}>
      <div className="flex flex-col gap-4 border-b border-border pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="font-mono text-[9px] uppercase tracking-[.16em] text-muted-foreground">Choose venue</p>
          <div className="mt-2 inline-flex rounded-md border border-border bg-background/70 p-1">
            {(["kalshi", "polymarket"] as const).map((v) => <button key={v} onClick={() => setVenue(v)} aria-pressed={venue === v} data-testid={`button-movers-${v}`} className={`${venueButton} ${venue === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>{v}</button>)}
          </div>
        </div>
        <p className="max-w-md text-xs leading-5 text-muted-foreground">{venue === "kalshi" ? "Kalshi window: since midnight UTC today. This is not a rolling 24-hour period." : "Polymarket window: rolling 24 hours. This window differs from Kalshi’s daily reset."}</p>
        <div className="inline-flex self-start rounded-md border border-border bg-background/70 p-1 sm:self-auto" role="group" aria-label="Filter movers by direction">
          {(["all", "up", "down"] as const).map((d) => <button key={d} onClick={() => setDirection(d)} aria-pressed={direction === d} data-testid={`button-movers-direction-${d}`} className={`${venueButton} px-2.5 ${direction === d ? "bg-primary/20 text-foreground" : "text-muted-foreground hover:text-foreground"}`}>{d}</button>)}
        </div>
      </div>
      <FeedStatus feed={feed} loading={query.isLoading} error={query.isError && !data} retrying={query.isFetching} onRetry={retry}>
        {items.length ? <MoversList items={items} /> : <div className="rounded-md border border-dashed border-border px-4 py-8 text-sm text-muted-foreground">No movers match this direction in the returned source data.</div>}
      </FeedStatus>
      <p className="mt-4 text-[10px] leading-5 text-muted-foreground">Showing every returned mover (up to 25). Source updates are cached for up to {data?.refreshMinutes ?? 20} minutes; the browser checks for updates every 60 seconds.</p>
    </section>
    <div className="mt-6"><FlowframeAttribution refreshMinutes={data?.refreshMinutes ?? 20} /></div>
  </main>;
}
