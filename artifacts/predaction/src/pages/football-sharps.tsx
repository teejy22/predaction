import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Search, Trophy } from "lucide-react";
import type { FlowframeItem } from "@workspace/api-client-react";
import { usePageMeta } from "@/lib/meta";
import { useFlowframeToolsData } from "@/components/flowframe-data";
import { FeedStatus, FlowframeAttribution, SourceLink } from "@/components/flowframe-feed-ui";
import { TradeList } from "@/components/flowframe-lists";
import { externalHref, shortWallet } from "@/components/flowframe-data";

type League = "all" | "nfl" | "cfb";
type Side = "all" | "BUY" | "SELL";
const currency = (n?: number) => n === undefined ? "—" : new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
const pct = (n?: number) => n === undefined ? "—" : `${n.toFixed(1)}%`;
const number = (n?: number) => n === undefined ? "—" : new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n);

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return <div><p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">{label}</p><p className={`mt-1 font-mono text-sm font-semibold tabular ${accent ?? ""}`}>{value}</p></div>;
}

function RankingRow({ item }: { item: FlowframeItem }) {
  const pnlTone = item.realizedPnl === undefined ? "text-muted-foreground" : item.realizedPnl >= 0 ? "text-emerald-200" : "text-rose-200";
  const profile = externalHref(item.profileUrl);
  const walletName = item.wallet ? shortWallet(item.wallet) : item.title;
  return <article data-testid={`row-football-rank-${item.id}`} className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-3 border-b border-border/70 px-3 py-4 last:border-0 sm:grid-cols-[3rem_minmax(0,1.7fr)_repeat(4,minmax(4.5rem,.7fr))] sm:items-center sm:px-4">
    <div className="font-mono text-lg font-semibold text-primary tabular">{item.rank === undefined ? "—" : `#${item.rank}`}</div>
    <div className="min-w-0">
      {profile ? <a href={profile} target="_blank" rel="noopener noreferrer" title={item.wallet} className="inline-flex max-w-full items-center gap-1 truncate text-sm font-semibold hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">{walletName}<ExternalLink aria-hidden="true" className="h-3 w-3 shrink-0 text-muted-foreground" /></a> : <p className="truncate text-sm font-semibold" title={item.wallet}>{walletName}</p>}
      <p className="mt-1 text-[10px] text-muted-foreground">{item.realizedCount === undefined ? "—" : `${number(item.realizedCount)} realized`} · NFL {number(item.nflCount)} · CFB {number(item.cfbCount)}</p>
      <div className="mt-3 grid grid-cols-3 gap-2 sm:hidden">
        <Stat label="Realized P&L" value={currency(item.realizedPnl)} accent={pnlTone} /><Stat label="ROI" value={pct(item.roi)} accent={pnlTone} /><Stat label="Win rate" value={pct(item.winRate)} />
      </div>
    </div>
    <div className="hidden sm:block"><Stat label="Realized P&L" value={currency(item.realizedPnl)} accent={pnlTone} /></div>
    <div className="hidden sm:block"><Stat label="ROI" value={pct(item.roi)} accent={pnlTone} /></div>
    <div className="hidden sm:block"><Stat label="Win rate" value={pct(item.winRate)} /></div>
    <div className="hidden sm:block"><Stat label="Median stake" value={currency(item.medianStake)} /></div>
  </article>;
}

export default function FootballSharpsPage() {
  usePageMeta("Football Sharps | Prediction Pro", "FlowFrame's season-to-date football leaderboard and qualifying recent trades across NFL and college football.");
  const query = useFlowframeToolsData();
  const data = query.data;
  const [view, setView] = useState<"rankings" | "trades">(() => window.location.hash === "#trades" ? "trades" : "rankings");
  useEffect(() => {
    const syncView = () => setView(window.location.hash === "#trades" ? "trades" : "rankings");
    window.addEventListener("hashchange", syncView);
    return () => window.removeEventListener("hashchange", syncView);
  }, []);
  const [search, setSearch] = useState("");
  const [league, setLeague] = useState<League>("all");
  const [side, setSide] = useState<Side>("all");
  const ranked = useMemo(() => (data?.footballLeaderboard.items ?? []).filter((item) => !search.trim() || `${item.wallet ?? ""} ${item.title}`.toLowerCase().includes(search.trim().toLowerCase())), [data?.footballLeaderboard.items, search]);
  const trades = useMemo(() => (data?.footballTrades.items ?? []).filter((item) =>
    (league === "all" || item.league === league) &&
    (side === "all" || item.side === side) &&
    (!search.trim() || `${item.title} ${item.wallet ?? ""} ${item.outcome ?? ""}`.toLowerCase().includes(search.trim().toLowerCase()))
  ), [data?.footballTrades.items, league, search, side]);
  const retry = () => { void query.refetch(); };

  return <main className="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-12">
    <header className="mb-7 grid gap-5 overflow-hidden rounded-xl border border-primary/20 bg-card/70 px-5 py-6 sm:grid-cols-[1fr_auto] sm:items-end sm:px-8 sm:py-8">
      <div><h1 className="font-display text-4xl font-bold tracking-[-.055em] sm:text-5xl">Football sharps</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">A single NFL + college football season leaderboard, alongside qualifying recent wallet activity. Rankings prioritize realized ROI; these are past outcomes, not a forecast.</p>
      </div>
      <div className="flex items-center gap-3 rounded-md border border-border bg-background/50 px-4 py-3"><Trophy className="h-5 w-5 text-primary" /><div><p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">Ranking scope</p><p className="text-xs font-semibold">NFL + CFB · realized positions</p></div></div>
    </header>
    <nav aria-label="Football Sharps views" className="mb-5 inline-flex gap-1 rounded-lg border border-border bg-card p-1">
      {(["rankings", "trades"] as const).map((value) => <a key={value} href={`#${value}`} onClick={() => setView(value)} aria-current={view === value ? "location" : undefined} data-testid={`button-football-view-${value}`} className={`rounded-md px-4 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${view === value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>{value === "rankings" ? "Ranked wallets" : "Recent trades"}</a>)}
    </nav>
    {view === "rankings" && (
    <section className="mb-6 rounded-lg border border-border bg-card/50 p-4 sm:p-6" aria-labelledby="football-rankings-title">
      <div className="mb-4 flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div><h2 id="football-rankings-title" className="font-display text-2xl font-bold tracking-[-.04em]">Leaderboard</h2><p className="mt-1 max-w-xl text-[11px] leading-5 text-muted-foreground">Fully exited and resolved positions; futures and likely market-makers excluded. Ranking prioritizes ROI, then profit, consistency and activity.</p></div>
        <label className="flex flex-col gap-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground sm:w-64">Find wallet
          <span className="relative"><Search className="absolute left-3 top-3 h-3.5 w-3.5" /><input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Wallet address" data-testid="input-football-search" className="h-10 w-full rounded-md border border-border bg-background pl-9 pr-3 font-sans text-xs normal-case tracking-normal text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" /></span>
        </label>
      </div>
      {data?.footballLeaderboard && <p className="mb-3 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">Showing {ranked.length} of {data.footballLeaderboard.items.length} source-ranked wallets · source rank retained</p>}
      <div className="hidden grid-cols-[3rem_minmax(0,1.7fr)_repeat(4,minmax(4.5rem,.7fr))] gap-3 border-b border-border px-4 pb-2 font-mono text-[9px] uppercase tracking-wider text-muted-foreground sm:grid">
        <span>Rank</span><span>Wallet / realized count</span><span>Realized P&L</span><span>ROI</span><span>Win rate</span><span>Median stake</span>
      </div>
      <FeedStatus feed={data?.footballLeaderboard} loading={query.isLoading} error={query.isError && !data} retrying={query.isFetching} onRetry={retry}>
        {ranked.length ? <div className="overflow-hidden rounded-md border border-border/80 bg-background/35">{ranked.map((item) => <RankingRow key={item.id} item={item} />)}</div> : <div className="rounded-md border border-dashed border-border px-4 py-8 text-sm text-muted-foreground">No source-ranked wallets match that search.</div>}
      </FeedStatus>
    </section>
    )}
    {view === "trades" && (
    <section className="rounded-lg border border-border bg-card/50 p-4 sm:p-6" aria-labelledby="football-trades-title">
      <div className="mb-4 flex flex-col gap-3 border-b border-border pb-4">
        <div><h2 id="football-trades-title" className="font-display text-2xl font-bold tracking-[-.04em]">Recent trades</h2><p className="mt-1 max-w-3xl text-[11px] leading-5 text-muted-foreground">Source window: 72 hours · $100 minimum · FlowFrame’s top 40 football wallets.</p></div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">League
            <select value={league} onChange={(e) => setLeague(e.target.value as League)} data-testid="select-football-league" className="h-10 rounded-md border border-border bg-background px-3 font-sans text-xs normal-case tracking-normal text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><option value="all">All supplied leagues</option><option value="nfl">NFL</option><option value="cfb">College football</option></select>
          </label>
          <label className="flex flex-col gap-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Trade side
            <select value={side} onChange={(e) => setSide(e.target.value as Side)} data-testid="select-football-side" className="h-10 rounded-md border border-border bg-background px-3 font-sans text-xs normal-case tracking-normal text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><option value="all">All sides</option><option value="BUY">Buy</option><option value="SELL">Sell</option></select>
          </label>
        </div>
      </div>
      <p className="mb-3 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">{data ? `${data.footballTrades.items.length} source trades · ${trades.length} match local filters` : "Source trades · local filters"}</p>
      <FeedStatus feed={data?.footballTrades} loading={query.isLoading} error={query.isError && !data} retrying={query.isFetching} onRetry={retry}>
        {trades.length ? <div className="space-y-2">
          <div className="space-y-2">{trades.map((item) => <div key={item.id} className="overflow-hidden rounded-md border border-border/80 bg-background/35">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 px-4 py-2 text-[10px]">
              <span className="inline-flex items-center gap-2 font-mono uppercase tracking-wider text-muted-foreground">{item.league ? <span className="rounded bg-primary/15 px-1.5 py-0.5 text-primary">{item.league === "nfl" ? "NFL" : "CFB"}</span> : <span>League unavailable</span>}
                {item.rank !== undefined && <span>Source rank #{item.rank}</span>}
                {item.unusual && <span className="rounded border border-amber-300/25 bg-amber-300/[.06] px-1.5 py-0.5 text-amber-100">Unusual size{item.usualMultiple !== undefined ? ` · ${item.usualMultiple.toFixed(1)}× wallet median` : ""}</span>}
              </span>
              {item.score !== undefined && <span className="font-mono text-muted-foreground">Source score {item.score}</span>}
            </div>
            <TradeList items={[item]} />
          </div>)}</div>
        </div> : <div className="rounded-md border border-dashed border-border px-4 py-8 text-sm text-muted-foreground">No returned trades match these filters.</div>}
      </FeedStatus>
    </section>
    )}
    <div className="mt-6"><FlowframeAttribution refreshMinutes={data?.refreshMinutes ?? 60} /></div>
  </main>;
}
