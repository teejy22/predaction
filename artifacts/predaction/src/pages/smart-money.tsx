import { useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Search, SlidersHorizontal } from "lucide-react";
import { usePageMeta } from "@/lib/meta";
import { useFlowframeToolsData } from "@/components/flowframe-data";
import { FeedStatus, FlowframeAttribution, SourceLink } from "@/components/flowframe-feed-ui";
import type { FlowframeItem, FlowframeTier } from "@workspace/api-client-react";

type Direction = "all" | "yes" | "no";
const money = (n?: number) => n === undefined ? "—" : new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
const percent = (n?: number) => n === undefined ? "—" : `${n.toFixed(1)}%`;
const signed = (n?: number, digits = 1) => n === undefined ? "—" : `${n > 0 ? "+" : ""}${n.toFixed(digits)}`;

function TierLine({ name, tier }: { name: string; tier: FlowframeTier }) {
  return <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4 gap-y-1 border-t border-border/70 py-2 text-[11px] first:border-0">
    <span className="font-medium capitalize text-foreground">{name}</span><span className="text-right text-muted-foreground">YES {money(tier.yesDollars)}{tier.yesCount !== undefined && <span className="text-foreground/60"> · count {tier.yesCount}</span>}</span><span className="text-right text-muted-foreground">NO {money(tier.noDollars)}{tier.noCount !== undefined && <span className="text-foreground/60"> · count {tier.noCount}</span>}</span>
  </div>;
}

function SmartMoneyRow({ item }: { item: FlowframeItem }) {
  const positive = item.skewScore !== undefined && item.skewScore >= 0;
  return <article data-testid={`row-smart-money-${item.id}`} className="border-b border-border/70 px-4 py-4 last:border-0 sm:px-5">
    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
      <div className="min-w-0">
        <div className="mb-1.5 flex flex-wrap items-center gap-2 font-mono text-[9px] uppercase tracking-wider text-muted-foreground"><span>{item.category}</span><span className="text-border">/</span><span className="text-primary">FlowFrame signal</span></div>
        <SourceLink item={item} testId={`link-smart-money-${item.id}`}><span className="text-sm font-semibold leading-5">{item.title}</span></SourceLink>
      </div>
      <div className={`inline-flex items-center gap-1 self-start rounded border px-2 py-1 font-mono text-xs font-semibold tabular ${item.skewScore === undefined ? "border-border text-muted-foreground" : positive ? "border-emerald-300/20 bg-emerald-300/[.06] text-emerald-200" : "border-rose-300/20 bg-rose-300/[.06] text-rose-200"}`}>
        {item.skewScore === undefined ? "—" : positive ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
        {item.skewScore === undefined ? "Score unavailable" : `${signed(item.skewScore, 3)} composite`}
      </div>
    </div>
    <div className="mt-4 grid grid-cols-3 gap-2 rounded-md bg-background/60 px-3 py-3">
      <div><p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">Market YES</p><p className="mt-1 font-mono text-sm font-semibold tabular">{percent(item.probability)}</p></div>
      <div><p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">FlowFrame fair YES</p><p className="mt-1 font-mono text-sm font-semibold tabular">{percent(item.fairValue)}</p></div>
      <div><p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">Fair − market</p><p className={`mt-1 font-mono text-sm font-semibold tabular ${item.edge === undefined ? "text-muted-foreground" : item.edge >= 0 ? "text-emerald-200" : "text-rose-200"}`}>{item.edge === undefined ? "—" : `${signed(item.edge)} pp`}</p></div>
    </div>
    {item.tiers && <details className="mt-3 text-[11px]">
      <summary className="w-fit cursor-pointer rounded text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">Cohort exposure details</summary>
      <div className="mt-2 rounded-md border border-border/70 bg-background/40 px-3 py-2">
        {(["sharp", "profitable", "recreational"] as const).map((name) => item.tiers?.[name] && <TierLine key={name} name={name} tier={item.tiers[name]!} />)}
      </div>
    </details>}
  </article>;
}

export default function SmartMoneyPage() {
  usePageMeta("Smart Money | Prediction Pro", "FlowFrame's cohort-based Smart Money view: market prices, estimated fair values and source model scores.");
  const query = useFlowframeToolsData();
  const data = query.data;
  const [search, setSearch] = useState("");
  const [direction, setDirection] = useState<Direction>("all");
  const [minimumScore, setMinimumScore] = useState("0");
  const minScore = Math.max(0, Number(minimumScore) || 0);
  const items = useMemo(() => (data?.smartMoney.items ?? []).filter((item) => {
    const score = item.skewScore;
    const directionMatch = direction === "all" || (score !== undefined && (direction === "yes" ? score > 0 : score < 0));
    const scoreMatch = minScore === 0 || (score !== undefined && Math.abs(score) >= minScore);
    return directionMatch && scoreMatch && (!search.trim() || `${item.title} ${item.category}`.toLowerCase().includes(search.trim().toLowerCase()));
  }), [data?.smartMoney.items, direction, minScore, search]);
  const retry = () => { void query.refetch(); };

  return <main className="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-12">
    <header className="relative mb-7 overflow-hidden rounded-xl border border-primary/20 bg-card/70 px-5 py-6 sm:px-8 sm:py-8">
      <div aria-hidden="true" className="pointer-events-none absolute -right-8 -top-10 h-48 w-48 rounded-full border border-primary/15" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-1 top-0 h-36 w-36 rounded-full border border-primary/10" />
      <p className="font-mono text-[10px] uppercase tracking-[.18em] text-primary">Tools / FlowFrame model</p>
      <h1 className="font-display mt-2 text-4xl font-bold tracking-[-.055em] sm:text-5xl">Smart money</h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">A sourced view of cohort positioning and estimated fair value. Compare FlowFrame’s fair YES estimate with the current market YES price; the signed gap is a model comparison, not realized return or a Prediction Pro forecast.</p>
      <div className="mt-5 inline-flex items-center gap-2 border-t border-border/70 pt-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground"><span className="h-1.5 w-1.5 rounded-full bg-primary" /> Cohort concentration · ranked by absolute composite score</div>
    </header>
    <section className="rounded-lg border border-border bg-card/50 p-4 sm:p-6" aria-label="Smart Money market signals">
      <div className="mb-4 grid gap-3 border-b border-border pb-4 sm:grid-cols-3">
        <label className="flex flex-col gap-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Search markets
          <span className="relative"><Search className="absolute left-3 top-3 h-3.5 w-3.5" /><input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name or category" data-testid="input-smart-money-search" className="h-10 w-full rounded-md border border-border bg-background pl-9 pr-3 font-sans text-xs normal-case tracking-normal text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" /></span>
        </label>
        <label className="flex flex-col gap-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground"><span className="inline-flex items-center gap-1.5"><SlidersHorizontal className="h-3 w-3" /> Cohort direction</span>
          <select value={direction} onChange={(e) => setDirection(e.target.value as Direction)} data-testid="select-smart-money-direction" className="h-10 rounded-md border border-border bg-background px-3 font-sans text-xs normal-case tracking-normal text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><option value="all">Any direction</option><option value="yes">Positive score · YES leaning</option><option value="no">Negative score · NO leaning</option></select>
        </label>
        <label className="flex flex-col gap-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Minimum absolute score
          <input type="number" min="0" step="0.05" value={minimumScore} onChange={(e) => setMinimumScore(e.target.value)} data-testid="input-smart-money-min-score" className="h-10 rounded-md border border-border bg-background px-3 font-sans text-xs normal-case tracking-normal text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" />
        </label>
      </div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">{data ? `${data.smartMoney.items.length} source-ranked markets` : "Source-ranked markets"} · local filters · score is a signed source composite</p>
        {query.isFetching && data && <span className="text-[10px] text-muted-foreground">Checking for updates</span>}
      </div>
      <FeedStatus feed={data?.smartMoney} loading={query.isLoading} error={query.isError && !data} retrying={query.isFetching} onRetry={retry}>
        {items.length ? <div className="overflow-hidden rounded-md border border-border/80 bg-background/35">{items.map((item) => <SmartMoneyRow key={item.id} item={item} />)}</div> : <div className="rounded-md border border-dashed border-border px-4 py-8 text-sm text-muted-foreground">No returned markets match these local filters.</div>}
      </FeedStatus>
    </section>
    <div className="mt-6"><FlowframeAttribution refreshMinutes={data?.refreshMinutes ?? 60} /></div>
  </main>;
}
