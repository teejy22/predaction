import { useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Scale, Search, Wallet } from "lucide-react";
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
  const groups = Object.values(item.tiers ?? {});
  return groups.reduce((total, group) => ({
    yes: total.yes + (group.yesDollars ?? 0),
    no: total.no + (group.noDollars ?? 0),
  }), { yes: 0, no: 0 });
}

function gapLabel(gap: number) {
  const size = Math.abs(gap);
  if (size >= 10) return "Big difference";
  if (size >= 5) return "Clear difference";
  return "Small difference";
}

function SummaryCard({ label, value, note }: { label: string; value: string; note: string }) {
  return <div className="rounded-lg border border-border bg-card/55 p-4">
    <p className="font-mono text-[9px] uppercase tracking-[.16em] text-muted-foreground">{label}</p>
    <p className="font-display mt-2 text-3xl font-bold tracking-[-.04em]">{value}</p>
    <p className="mt-1 truncate text-xs text-muted-foreground" title={note}>{note}</p>
  </div>;
}

function DifferenceBars({ market, model }: { market?: number; model?: number }) {
  const rows = [
    { label: "Market says", value: market, className: "bg-foreground/80" },
    { label: "FlowFrame says", value: model, className: "bg-primary" },
  ];
  return <div className="space-y-2">
    {rows.map((row) => <div key={row.label}>
      <div className="mb-1 flex items-center justify-between gap-3 text-[11px]"><span className="text-muted-foreground">{row.label}</span><span className="font-mono font-semibold tabular">{percent(row.value)}</span></div>
      <div className="h-2 overflow-hidden rounded-full bg-muted"><div className={`h-full rounded-full ${row.className}`} style={{ width: `${Math.max(0, Math.min(100, row.value ?? 0))}%` }} /></div>
    </div>)}
  </div>;
}

function SmartMoneyCard({ item }: { item: FlowframeItem }) {
  const difference = differenceOf(item);
  const side = sideOf(item);
  const totals = walletTotals(item);
  const walletSide = totals.yes === totals.no ? "even" : totals.yes > totals.no ? "YES" : "NO";
  const positive = (difference ?? 0) > 0;
  return <article data-testid={`row-smart-money-${item.id}`} className="rounded-lg border border-border bg-card/55 p-4 transition-colors hover:border-primary/35 sm:p-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="rounded-sm border border-border bg-background/60 px-2 py-1 font-mono text-[9px] uppercase tracking-[.14em] text-muted-foreground">{item.category || "Market"}</span>
          {difference !== undefined && <span className={`inline-flex items-center gap-1 rounded-sm border px-2 py-1 font-mono text-[9px] font-semibold uppercase tracking-[.14em] ${positive ? "border-emerald-300/20 bg-emerald-300/[.07] text-emerald-200" : "border-rose-300/20 bg-rose-300/[.07] text-rose-200"}`}>
            {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />} {positive ? "YES side" : "NO side"}
          </span>}
        </div>
        <SourceLink item={item} testId={`link-smart-money-${item.id}`}><span className="text-base font-semibold leading-6">{item.title}</span></SourceLink>
      </div>
      {difference !== undefined && <div className="rounded-md border border-border bg-background/60 px-3 py-2 text-right">
        <p className="font-mono text-[9px] uppercase tracking-[.14em] text-muted-foreground">{gapLabel(difference)}</p>
        <p className={`font-display mt-1 text-2xl font-bold tracking-[-.04em] ${positive ? "text-emerald-200" : "text-rose-200"}`}>{positive ? "+" : "−"}{points(difference)}</p>
      </div>}
    </div>

    <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_240px]">
      <div className="rounded-md bg-background/55 p-3"><DifferenceBars market={item.probability} model={item.fairValue} /></div>
      <div className="rounded-md bg-background/55 p-3">
        <p className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[.14em] text-muted-foreground"><Wallet className="h-3 w-3" /> Tracked wallet money</p>
        <p className="mt-2 text-sm font-semibold">{money(totals.yes)} on YES · {money(totals.no)} on NO</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{walletSide === "even" ? "Tracked money is split evenly." : `More tracked money is on ${walletSide}.`}</p>
      </div>
    </div>

    {difference !== undefined && <p className="mt-3 border-t border-border/70 pt-3 text-xs leading-5 text-muted-foreground">
      The market prices YES at <span className="font-semibold text-foreground">{percent(item.probability)}</span>. FlowFrame estimates <span className="font-semibold text-foreground">{percent(item.fairValue)}</span> — {positive ? "higher" : "lower"} by <span className="font-semibold text-foreground">{points(difference)}</span>.
    </p>}
  </article>;
}

export default function SmartMoneyPage() {
  usePageMeta("Smart Money | Prediction Pro", "A plain-English view of where tracked wallets and FlowFrame estimates differ from current market prices.");
  const query = useFlowframeToolsData();
  const data = query.data;
  const [search, setSearch] = useState("");
  const [direction, setDirection] = useState<Direction>("all");
  const [minimumGap, setMinimumGap] = useState("0");
  const minimum = Math.max(0, Number(minimumGap) || 0);
  const sourceItems = data?.smartMoney.items ?? [];
  const compared = useMemo(() => sourceItems.filter((item) => differenceOf(item) !== undefined), [sourceItems]);
  const summary = useMemo(() => {
    const yes = compared.filter((item) => sideOf(item) === "yes");
    const no = compared.filter((item) => sideOf(item) === "no");
    const biggest = [...compared].sort((a, b) => Math.abs(differenceOf(b) ?? 0) - Math.abs(differenceOf(a) ?? 0))[0];
    return { yes: yes.length, no: no.length, biggest };
  }, [compared]);
  const items = useMemo(() => compared.filter((item) => {
    const difference = differenceOf(item) ?? 0;
    const directionMatch = direction === "all" || sideOf(item) === direction;
    const gapMatch = minimum === 0 || Math.abs(difference) >= minimum;
    const text = `${item.title} ${item.category}`.toLowerCase();
    return directionMatch && gapMatch && (!search.trim() || text.includes(search.trim().toLowerCase()));
  }).sort((a, b) => Math.abs(differenceOf(b) ?? 0) - Math.abs(differenceOf(a) ?? 0)), [compared, direction, minimum, search]);
  const retry = () => { void query.refetch(); };

  return <main className="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-12">
    <header className="mb-7 rounded-xl border border-primary/20 bg-card/70 px-5 py-6 sm:px-8 sm:py-8">
      <p className="font-mono text-[10px] uppercase tracking-[.18em] text-primary">Tools / Smart money</p>
      <h1 className="font-display mt-2 text-4xl font-bold tracking-[-.055em] sm:text-5xl">Where wallets disagree</h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">A simple side-by-side view: what the market says, what FlowFrame says, how far apart they are, and where tracked wallet money is going.</p>
      <div className="mt-5 grid gap-3 border-t border-border/70 pt-5 sm:grid-cols-3">
        <div className="flex gap-2 text-xs leading-5 text-muted-foreground"><span className="font-display text-lg font-bold text-foreground">1</span> Market price is the current YES price.</div>
        <div className="flex gap-2 text-xs leading-5 text-muted-foreground"><span className="font-display text-lg font-bold text-foreground">2</span> FlowFrame’s estimate is its own YES estimate.</div>
        <div className="flex gap-2 text-xs leading-5 text-muted-foreground"><span className="font-display text-lg font-bold text-foreground">3</span> The difference shows which side may be mispriced.</div>
      </div>
    </header>

    <section className="mb-5 grid gap-3 sm:grid-cols-3" aria-label="Smart money summary">
      <SummaryCard label="FlowFrame leans YES" value={String(summary.yes)} note="Markets priced below FlowFrame’s estimate" />
      <SummaryCard label="FlowFrame leans NO" value={String(summary.no)} note="Markets priced above FlowFrame’s estimate" />
      <SummaryCard label="Largest difference" value={summary.biggest ? points(differenceOf(summary.biggest) ?? 0) : "—"} note={summary.biggest?.title ?? "No compared markets"} />
    </section>

    <section className="rounded-lg border border-border bg-card/50 p-4 sm:p-6" aria-label="Smart money market list">
      <div className="mb-4 grid gap-3 border-b border-border pb-4 md:grid-cols-[minmax(0,1fr)_180px_190px]">
        <label className="flex flex-col gap-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Search
          <span className="relative"><Search className="absolute left-3 top-3 h-3.5 w-3.5" /><input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Market name or category" data-testid="input-smart-money-search" className="h-10 w-full rounded-md border border-border bg-background pl-9 pr-3 font-sans text-xs normal-case tracking-normal text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" /></span>
        </label>
        <label className="flex flex-col gap-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Show
          <select value={direction} onChange={(e) => setDirection(e.target.value as Direction)} data-testid="select-smart-money-direction" className="h-10 rounded-md border border-border bg-background px-3 font-sans text-xs normal-case tracking-normal text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><option value="all">Everything</option><option value="yes">YES side</option><option value="no">NO side</option></select>
        </label>
        <label className="flex flex-col gap-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Difference
          <select value={minimumGap} onChange={(e) => setMinimumGap(e.target.value)} data-testid="select-smart-money-min-gap" className="h-10 rounded-md border border-border bg-background px-3 font-sans text-xs normal-case tracking-normal text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><option value="0">Any size</option><option value="5">5+ points</option><option value="10">10+ points</option></select>
        </label>
      </div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground"><Scale className="h-3 w-3" /> {items.length} markets · biggest differences first</p>
        {query.isFetching && data && <span className="text-[10px] text-muted-foreground">Checking for updates</span>}
      </div>
      <FeedStatus feed={data?.smartMoney} loading={query.isLoading} error={query.isError && !data} retrying={query.isFetching} onRetry={retry}>
        {items.length ? <div className="grid gap-3">{items.map((item) => <SmartMoneyCard key={item.id} item={item} />)}</div> : <div className="rounded-md border border-dashed border-border px-4 py-8 text-sm text-muted-foreground">No markets match these filters.</div>}
      </FeedStatus>
    </section>
    <p className="mt-4 text-xs leading-5 text-muted-foreground">FlowFrame’s estimate is a source estimate, not a Prediction Pro forecast, realized return, or trading advice.</p>
    <div className="mt-4"><FlowframeAttribution refreshMinutes={data?.refreshMinutes ?? 60} /></div>
  </main>;
}
