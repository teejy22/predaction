import { useMemo, useState } from "react";
import { usePageMeta } from "@/lib/meta";
import { useFlowframeData } from "@/components/flowframe-data";
import { FeedStatus, FlowframeAttribution } from "@/components/flowframe-feed-ui";
import { TradeList } from "@/components/flowframe-lists";

type SideFilter = "all" | "BUY" | "SELL";

export default function TradersPage() {
  usePageMeta("Trader Activity | Prediction Pro", "Recent trades from FlowFrame-tracked top-trader Polymarket wallets, with local side and notional filters.");
  const [side, setSide] = useState<SideFilter>("all");
  const [minimum, setMinimum] = useState("1000");
  const [search, setSearch] = useState("");
  const query = useFlowframeData();
  const data = query.data;
  const minValue = Math.max(1000, Number(minimum) || 1000);
  const items = useMemo(() => (data?.trades.items ?? []).filter((item) =>
    (side === "all" || item.side === side) &&
    (item.usdcSize ?? 0) >= minValue &&
    (!search.trim() || `${item.title} ${item.outcome ?? ""} ${item.wallet ?? ""}`.toLowerCase().includes(search.trim().toLowerCase()))
  ), [data?.trades.items, minValue, search, side]);
  const retry = () => { void query.refetch(); };

  return <main className="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-12">
    <header className="mb-7 border-b border-border pb-6">
      <p className="font-mono text-[10px] uppercase tracking-[.18em] text-primary">Polymarket / sourced wallet activity</p>
      <h1 className="font-display mt-2 text-4xl font-bold tracking-[-.055em] sm:text-5xl">Trader activity</h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">Recent qualifying trades from FlowFrame-tracked top-trader wallets, not every Polymarket trade. Activity is descriptive, not a ranking or investment advice. Execution price is the traded outcome’s price, not necessarily YES.</p>
    </header>
    <section className="rounded-lg border border-border bg-card/50 p-4 sm:p-6" aria-label="Tracked wallet trades">
      <div className="mb-4 flex flex-col gap-3 border-b border-border pb-4 lg:flex-row lg:items-end">
        <label className="flex flex-col gap-1.5 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Trade side
          <select value={side} onChange={(e) => setSide(e.target.value as SideFilter)} data-testid="select-trader-side" className="h-10 min-w-36 rounded-md border border-border bg-background px-3 text-xs font-sans normal-case tracking-normal text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
            <option value="all">All sides</option><option value="BUY">Buy</option><option value="SELL">Sell</option>
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Minimum USDC notional
          <input type="number" min="1000" step="100" value={minimum} onChange={(e) => setMinimum(e.target.value)} data-testid="input-trader-minimum" className="h-10 w-48 rounded-md border border-border bg-background px-3 text-xs font-sans tracking-normal text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" />
        </label>
        <label className="flex flex-col gap-1.5 text-[10px] font-mono uppercase tracking-wider text-muted-foreground lg:flex-1">Search market, outcome or wallet
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search recent activity" data-testid="input-trader-search" className="h-10 w-full rounded-md border border-border bg-background px-3 text-xs font-sans tracking-normal text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" />
        </label>
      </div>
      <p className="mb-3 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">Showing up to 50 source trades · local filters only · minimum $1,000 USDC</p>
      <FeedStatus feed={data?.trades} loading={query.isLoading} error={query.isError && !data} retrying={query.isFetching} onRetry={retry}>
        {items.length ? <TradeList items={items} /> : <div className="rounded-md border border-dashed border-border px-4 py-8 text-sm text-muted-foreground">No returned trades meet these filters. The source feed contains only qualifying tracked-wallet activity.</div>}
      </FeedStatus>
    </section>
    <div className="mt-6"><FlowframeAttribution refreshMinutes={data?.refreshMinutes ?? 20} /></div>
  </main>;
}
