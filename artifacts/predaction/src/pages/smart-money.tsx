import { useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Search, Wallet } from "lucide-react";
import { usePageMeta } from "@/lib/meta";
import { useFlowframeToolsData } from "@/components/flowframe-data";
import { FeedStatus, FlowframeAttribution, SourceLink } from "@/components/flowframe-feed-ui";
import type { FlowframeItem } from "@workspace/api-client-react";

type Direction = "all" | "yes" | "no";
const percent = (n?: number) => n === undefined ? "—" : `${n.toFixed(1)}%`;
const points = (n: number) => `${Math.abs(n).toFixed(1)} pts`;
const money = (n: number) => new Intl.NumberFormat(undefined, {
  style: "currency", currency: "USD", notation: n >= 10000 ? "compact" : "standard", maximumFractionDigits: n >= 10000 ? 1 : 0,
}).format(n);

function differenceOf(item: FlowframeItem) {
  if (item.edge !== undefined) return item.edge;
  if (item.fairValue === undefined || item.probability === undefined) return undefined;
  return item.fairValue - item.probability;
}

function sideOf(item: FlowframeItem): Direction {
  const difference = differenceOf(item);
  if (difference === undefined || difference === 0) return "all";
  return difference > 0 ? "yes" : "no";
}

function walletTotals(item: FlowframeItem) {
  return Object.values(item.tiers ?? {}).reduce((total, group) => ({
    yes: total.yes + (group.yesDollars ?? 0),
    no: total.no + (group.noDollars ?? 0),
  }), { yes: 0, no: 0 });
}

function DifferenceBars({ market, model }: { market?: number; model?: number }) {
  const rows = [
    { label: "Market says", value: market, className: "bg-foreground/75" },
    { label: "PredictionPro says", value: model, className: "bg-primary" },
  ];
  return <div className="space-y-2.5">
    {rows.map((row) => <div key={row.label}>
      <div className="mb-1 flex items-center justify-between gap-3 text-[11px]"><span className="text-muted-foreground">{row.label}</span><span className="font-mono font-semibold tabular">{percent(row.value)}</span></div>
      <div className="h-2 overflow-hidden rounded-full bg-muted"><div className={`h-full rounded-full ${row.className}`} style={{ width: `${Math.max(0, Math.min(100, row.value ?? 0))}%` }} /></div>
    </div>)}
  </div>;
}

function SmartMoneyCard({ item }: { item: FlowframeItem }) {
  const difference = differenceOf(item) ?? 0;
  const positive = difference > 0;
  const neutral = difference === 0;
  const totals = walletTotals(item);
  const walletSide = totals.yes === totals.no ? "Even" : totals.yes > totals.no ? "More on YES" : "More on NO";
  return <article data-testid={`row-smart-money-${item.id}`} className="rounded-lg border border-border bg-card/55 p-4 sm:px-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <SourceLink item={item} testId={`link-smart-money-${item.id}`}><span className="text-base font-semibold leading-6">{item.title}</span></SourceLink>
      <span className={`inline-flex shrink-0 items-center gap-1 rounded-sm border px-2 py-1 font-mono text-[10px] font-semibold ${neutral ? "border-border text-muted-foreground" : positive ? "border-emerald-300/20 bg-emerald-300/[.06] text-emerald-200" : "border-rose-300/20 bg-rose-300/[.06] text-rose-200"}`}>
        {neutral ? "Even" : positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
        {neutral ? "No difference" : `${positive ? "YES" : "NO"} · ${points(difference)}`}
      </span>
    </div>
    <div className="mt-4"><DifferenceBars market={item.probability} model={item.fairValue} /></div>
    <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-border/70 pt-3 text-xs text-muted-foreground">
      <Wallet className="h-3.5 w-3.5" /> Wallets: <span className="font-semibold text-foreground">{money(totals.yes)} YES</span> · <span className="font-semibold text-foreground">{money(totals.no)} NO</span> · {walletSide}
    </p>
  </article>;
}

export default function SmartMoneyPage() {
  usePageMeta("Smart Money | Prediction Pro", "Compare market prices with PredictionPro estimates and see where tracked wallet money is going.");
  const query = useFlowframeToolsData();
  const data = query.data;
  const [search, setSearch] = useState("");
  const [direction, setDirection] = useState<Direction>("all");
  const sourceItems = data?.smartMoney.items ?? [];
  const compared = useMemo(() => sourceItems.filter((item) => differenceOf(item) !== undefined), [sourceItems]);
  const yesCount = compared.filter((item) => sideOf(item) === "yes").length;
  const noCount = compared.filter((item) => sideOf(item) === "no").length;
  const items = useMemo(() => compared.filter((item) => {
    const directionMatch = direction === "all" || sideOf(item) === direction;
    const text = `${item.title} ${item.category}`.toLowerCase();
    return directionMatch && (!search.trim() || text.includes(search.trim().toLowerCase()));
  }).sort((a, b) => Math.abs(differenceOf(b) ?? 0) - Math.abs(differenceOf(a) ?? 0)), [compared, direction, search]);
  const retry = () => { void query.refetch(); };

  return <main className="mx-auto max-w-5xl px-4 py-8 md:px-6 md:py-12">
    <header className="mb-6">
      <h1 className="font-display text-4xl font-bold tracking-[-.055em] sm:text-5xl">Market vs. PredictionPro</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">See where PredictionPro’s estimate differs from the market price, plus where tracked wallet money is going.</p>
      <p className="mt-4 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{compared.length} markets · {yesCount} lean YES · {noCount} lean NO · biggest differences first</p>
    </header>

    <section aria-label="Smart money market list">
      <div className="mb-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_170px]">
        <label className="relative block"><span className="sr-only">Search markets</span><Search className="absolute left-3 top-3 h-3.5 w-3.5 text-muted-foreground" /><input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search markets" data-testid="input-smart-money-search" className="h-10 w-full rounded-md border border-border bg-card/60 pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" /></label>
        <label><span className="sr-only">Choose side</span><select value={direction} onChange={(e) => setDirection(e.target.value as Direction)} data-testid="select-smart-money-direction" className="h-10 w-full rounded-md border border-border bg-card/60 px-3 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><option value="all">All markets</option><option value="yes">YES side</option><option value="no">NO side</option></select></label>
      </div>
      <FeedStatus compact feed={data?.smartMoney} loading={query.isLoading} error={query.isError && !data} retrying={query.isFetching} onRetry={retry}>
        {items.length ? <div className="grid gap-3">{items.map((item) => <SmartMoneyCard key={item.id} item={item} />)}</div> : <div className="rounded-md border border-dashed border-border px-4 py-8 text-sm text-muted-foreground">No markets match these filters.</div>}
      </FeedStatus>
    </section>
    <p className="mt-4 text-xs leading-5 text-muted-foreground">PredictionPro estimates use FlowFrame source data. They are not realized returns or trading advice.</p>
    <div className="mt-4"><FlowframeAttribution refreshMinutes={data?.refreshMinutes ?? 60} /></div>
  </main>;
}
