import { useMemo, useState } from "react";
import { Link, useParams } from "wouter";
import { ArrowLeft, ChevronDown, Clock } from "lucide-react";
import { getGetSportsGameQueryKey, useGetSportsGame, type PredictionEvent } from "@workspace/api-client-react";
import { CategoryTag, Change, ErrorPanel, KalshiCTA, ProbBar, WatchButton } from "@/components/bits";
import { eventLabel } from "@/components/sports-game-card";
import { closeLabel, fmtCents, fmtContracts, fullDate } from "@/lib/format";
import { usePageMeta } from "@/lib/meta";

function rank(e: PredictionEvent): number {
  const l = eventLabel(e).toLowerCase();
  if (/(1st|2nd|first|second|half|quarter|period|inning)/.test(l)) return 3;
  if (/(winner|moneyline)/.test(l) || (l === e.title.trim().toLowerCase() && /\bvs\.?\b/i.test(e.title))) return 0;
  if (/spread/.test(l)) return 1;
  if (/total/.test(l)) return 2;
  return 4;
}

export default function SportsGamePage() {
  const params = useParams<{ key: string }>();
  const key = decodeURIComponent(params.key ?? "");
  const q = useGetSportsGame(key, { query: { queryKey: getGetSportsGameQueryKey(key), enabled: !!key, refetchInterval: 60000, retry: 1 } });
  const g = q.data;
  usePageMeta(g ? `${g.title} | Prediction Pro` : "Game | Prediction Pro", g?.subtitle || "Every Kalshi event and market for this matchup.");
  const events = useMemo(() => g ? [...g.events].sort((a, b) => rank(a) - rank(b) || b.volume - a.volume) : [], [g]);
  const [active, setActive] = useState<string>("all");

  const back = <Link href="/sports" data-testid="link-back-sports" className="group inline-flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" /> Sports</Link>;

  if (q.isLoading) return (
    <div className="mx-auto max-w-6xl px-4 py-10 md:px-6">{back}
      <div className="mt-6 h-5 w-24 animate-pulse rounded bg-muted" /><div className="mt-4 h-14 w-2/3 animate-pulse rounded bg-muted" />
      <div className="mt-8 space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-40 animate-pulse rounded-lg bg-muted" />)}</div>
    </div>
  );
  if (!g) {
    const status = (q.error as { status?: number } | null)?.status;
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 md:px-6">{back}
        <div className="mt-8">{status === 404 ? (
          <div className="rounded-lg border border-dashed border-border bg-card/60 p-12 text-center">
            <h2 className="font-display text-3xl font-bold">Game not found in the open feed</h2>
            <p className="mt-2 text-sm text-muted-foreground">It may have closed or settled. Key: <span className="font-mono">{key}</span></p>
            <Link href="/sports" className="mt-5 inline-block rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Back to sports</Link>
          </div>
        ) : <ErrorPanel title="Couldn't load this game" onRetry={() => q.refetch()} retrying={q.isFetching} />}</div>
      </div>
    );
  }

  const visible = active === "all" ? events : events.filter((e) => e.ticker === active);

  return (
    <div>
      <section className="hero-field relative overflow-hidden border-b border-border">
        <div className="relative mx-auto max-w-6xl px-4 py-10 md:px-6">
          {back}
          <div className="rise mt-6"><CategoryTag category={g.category} sport={g.sport} league={g.league} /></div>
          <h1 className="font-display rise mt-3 max-w-4xl text-4xl font-bold leading-[1.02] sm:text-5xl" data-testid="text-game-title">{g.title}</h1>
          {g.subtitle && <p className="mt-3 text-base text-muted-foreground">{g.subtitle}</p>}
          <div className="mt-6"><KalshiCTA url={g.url} /></div>
          <dl className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border md:grid-cols-5">
            {[
              { l: "Events", v: g.eventCount.toLocaleString(), s: "grouped Kalshi events", id: "events" },
              { l: "Markets", v: g.marketCount.toLocaleString(), s: "open contracts", id: "markets" },
              { l: "Volume", v: fmtContracts(g.volume), s: "contracts", id: "volume" },
              { l: "24h volume", v: fmtContracts(g.volume24h), s: "contracts", id: "volume24h" },
              { l: "Close", v: closeLabel(g.closeTime), s: fullDate(g.closeTime), id: "close" },
            ].map((x) => (
              <div key={x.l} className="bg-card p-4" data-testid={`stat-game-${x.id}`}>
                <dt className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{x.l}</dt>
                <dd className="mt-1 truncate text-xl font-bold tracking-tight tabular">{x.v}</dd>
                <dd className="truncate text-xs text-muted-foreground">{x.s}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8 md:px-6">
        {q.isRefetchError && <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-xs">Latest refresh failed. Showing last loaded data. <button onClick={() => q.refetch()} className="font-semibold text-primary underline">Retry</button></div>}
        <nav className="flex gap-1.5 overflow-x-auto border-b border-border pb-3" aria-label="Filter events in this game">
          {[{ t: "all", label: "All events", n: g.marketCount }, ...events.map((e) => ({ t: e.ticker, label: eventLabel(e), n: e.markets.length }))].map((x) => (
            <button key={x.t} type="button" onClick={() => setActive(x.t)} aria-pressed={active === x.t} data-testid={`button-game-event-${x.t}`} className={`shrink-0 rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors ${active === x.t ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:text-foreground"}`}>
              {x.label} <span className="ml-1 font-mono text-[10px] opacity-70 tabular">{x.n}</span>
            </button>
          ))}
        </nav>
        <div className="mt-5 space-y-5">
          {visible.map((e) => <EventBlock key={e.ticker} e={e} />)}
          {!events.length && <p className="py-10 text-center text-sm text-muted-foreground">No events indexed for this game.</p>}
        </div>
        <p className="mt-8 text-xs text-muted-foreground">Prices are Kalshi implied chances; volume counted in contracts. Grouping and counts reflect indexed events and may be partial. Not financial advice.</p>
      </section>
    </div>
  );
}

function EventBlock({ e }: { e: PredictionEvent }) {
  const markets = [...e.markets].sort((a, b) => b.probability - a.probability);
  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card" data-testid={`section-game-event-${e.ticker}`}>
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/40 px-4 py-3">
        <div className="min-w-0">
          <h2 className="font-display text-lg font-bold">{eventLabel(e)}</h2>
          <p className="font-mono text-[10px] text-muted-foreground">{markets.length} markets · {fmtContracts(e.volume)} vol · {closeLabel(e.closeTime)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/event/${encodeURIComponent(e.ticker)}`} data-testid={`link-event-${e.ticker}`} className="text-[11px] font-semibold text-primary hover:underline">Event page</Link>
          <WatchButton event={{ ticker: e.ticker, title: e.title, category: e.category, sport: e.sport, league: e.league }} />
        </div>
      </header>
      {markets.length ? <div className="divide-y divide-border">{markets.map((m) => <MarketLine key={m.ticker} m={m} />)}</div> : <p className="px-4 py-4 text-xs text-muted-foreground">No open markets.</p>}
    </section>
  );
}

function MarketLine({ m }: { m: PredictionEvent["markets"][number] }) {
  const [open, setOpen] = useState(false);
  return (
    <div data-testid={`row-market-${m.ticker}`}>
      <div className="grid items-center gap-3 px-4 py-2.5 md:grid-cols-[minmax(0,1fr)_180px_auto]">
        <p className="min-w-0 truncate text-sm font-medium">{m.subtitle || m.title}</p>
        <div className="flex items-center gap-2"><ProbBar value={m.probability} /><span className="w-12 text-right font-mono text-sm font-bold tabular">{Math.round(m.probability)}%</span></div>
        <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
          <span className="rounded bg-[hsl(155_40%_15%)] px-2 py-1 text-[hsl(155_55%_67%)]">YES {fmtCents(m.yesAsk)}</span>
          <span className="rounded bg-destructive/10 px-2 py-1 text-destructive">NO {fmtCents(m.noAsk)}</span>
          <Change value={m.change} />
          <span className="text-muted-foreground">{fmtContracts(m.volume)} vol</span>
          <button onClick={() => setOpen((v) => !v)} aria-expanded={open} data-testid={`button-rules-${m.ticker}`} className="flex items-center gap-1 font-semibold text-foreground hover:text-primary">Rules <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} /></button>
        </div>
      </div>
      {open && <div className="border-t border-dashed border-border bg-muted/40 px-4 py-3">
        <p className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground"><Clock className="h-3 w-3" />Closes {fullDate(m.closeTime)} · {m.status}</p>
        <p className="mt-2 whitespace-pre-line text-sm leading-relaxed">{m.rules || "No rules text provided by the source."}</p>
        {m.url && <div className="mt-3"><KalshiCTA url={m.url} label="View market on Kalshi" testId={`button-trade-${m.ticker}`} /></div>}
      </div>}
    </div>
  );
}
