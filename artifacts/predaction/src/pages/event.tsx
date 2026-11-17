import { useState } from "react";
import { Link, useParams } from "wouter";
import { ArrowLeft, Clock, ChevronDown, Share2 } from "lucide-react";
import { useGetSportsEvent, getGetSportsEventQueryKey, type SportsMarket } from "@workspace/api-client-react";
import { ProbBar, SportTag, WatchButton, KalshiCTA, ErrorPanel, Change } from "@/components/bits";
import { closeLabel, fmtCents, fmtContracts, fullDate } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";

export default function EventPage() {
  const params = useParams<{ ticker: string }>();
  const ticker = decodeURIComponent(params.ticker ?? "");
  const { toast } = useToast();
  const q = useGetSportsEvent(ticker, {
    query: { queryKey: getGetSportsEventQueryKey(ticker), enabled: !!ticker, refetchInterval: 60000, retry: 1 },
  });

  const back = (
    <Link href="/" data-testid="link-back" className="group inline-flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground">
      <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" /> Board
    </Link>
  );

  if (q.isLoading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 md:px-6">
        {back}
        <div className="mt-6 h-5 w-24 animate-pulse rounded bg-muted" />
        <div className="mt-4 h-16 w-3/4 animate-pulse rounded bg-muted" />
        <div className="mt-8 space-y-3">{[0, 1, 2, 3].map((i) => <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />)}</div>
      </div>
    );
  }

  if (q.isError || !q.data) {
    const status = (q.error as { status?: number } | null)?.status;
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 md:px-6">
        {back}
        <div className="mt-8">
          {status === 404 ? (
            <div className="rounded-lg border border-dashed border-border bg-card/60 p-12 text-center">
              <h2 className="text-3xl font-bold tracking-tight">Event not on the board</h2>
              <p className="mt-2 text-sm text-muted-foreground">It may have closed or settled. Ticker: <span className="font-mono">{ticker}</span></p>
              <Link href="/" className="mt-5 inline-block rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90">Back to board</Link>
            </div>
          ) : (
            <ErrorPanel onRetry={() => q.refetch()} retrying={q.isFetching} />
          )}
        </div>
      </div>
    );
  }

  const e = q.data;
  const markets = [...e.markets].sort((a, b) => b.probability - a.probability);
  const leader = markets[0];
  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast({ title: "Link copied" });
    } catch {
      toast({ title: "Couldn't copy link" });
    }
  };

  return (
    <div>
      <section className="hero-field relative overflow-hidden border-b border-border">
        <div className="price-texture pointer-events-none select-none"><span>+142　29%　−180</span><span>+310　51%　−105</span><span>−26　37%　+118</span></div>
        <div className="relative mx-auto max-w-5xl px-4 py-10 md:px-6">
          {back}
          <div className="rise mt-6"><SportTag sport={e.sport} league={e.league} /></div>
          <h1 className="rise mt-3 max-w-4xl text-4xl font-extrabold leading-[1.02] tracking-[-.05em] sm:text-5xl md:text-6xl" data-testid="text-event-title">{e.title}</h1>
          {e.subtitle && <p className="mt-3 text-base text-muted-foreground">{e.subtitle}</p>}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <KalshiCTA url={e.url} />
            <WatchButton variant="full" event={{ ticker: e.ticker, title: e.title, sport: e.sport, league: e.league }} />
            <button onClick={share} data-testid="button-share" className="inline-flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-bold uppercase text-muted-foreground transition-colors hover:text-foreground">
              <Share2 className="h-4 w-4" /> Share
            </button>
          </div>
          <dl className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border md:grid-cols-4">
            {[
              { l: "Favorite", v: leader ? `${fmtCents(leader.probability)}` : "--", s: leader ? leader.subtitle || leader.title : "" },
              { l: "Volume", v: fmtContracts(e.volume), s: "contracts" },
              { l: "24h volume", v: fmtContracts(e.volume24h), s: "contracts" },
              { l: "Closes", v: closeLabel(e.closeTime).replace(/^Closes in /, ""), s: fullDate(e.closeTime) },
            ].map((x) => (
              <div key={x.l} className="bg-card p-4">
                <dt className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{x.l}</dt>
                <dd className="mt-1 text-2xl font-bold tracking-tight tabular">{x.v}</dd>
                <dd className="truncate text-xs text-muted-foreground">{x.s}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-10 md:px-6">
        <div className="flex items-baseline justify-between border-b border-border pb-3">
          <h2 className="text-2xl font-bold tracking-tight">Markets</h2>
          <span className="font-mono text-xs text-muted-foreground">{markets.length} · price = implied chance</span>
        </div>
        {markets.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">No markets listed for this event.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {markets.map((m, i) => <MarketRow key={m.ticker} m={m} rank={i} />)}
          </div>
        )}
        <p className="mt-8 text-xs text-muted-foreground">
          Data from the public Kalshi API, refreshed every 60 seconds. Predaction is independent and not affiliated with Kalshi. Nothing here is financial advice.
        </p>
      </section>
    </div>
  );
}

function MarketRow({ m, rank }: { m: SportsMarket; rank: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rise overflow-hidden rounded-lg border border-border bg-card" style={{ animationDelay: `${rank * 40}ms` }} data-testid={`row-market-${m.ticker}`}>
      <div className="grid items-center gap-4 p-4 md:grid-cols-[1fr_auto]">
        <div>
          <div className="flex items-center gap-2">
            {rank === 0 && <span className="rounded-sm bg-primary/15 px-1.5 font-mono text-[10px] font-bold uppercase text-primary">Favorite</span>}
            <h3 className="text-xl font-bold leading-tight tracking-tight">{m.subtitle || m.title}</h3>
          </div>
          {m.subtitle && m.title !== m.subtitle && <p className="mt-1 text-xs text-muted-foreground">{m.title}</p>}
          <div className="mt-3 flex items-center gap-3">
            <ProbBar value={m.probability} className="h-3" />
            <span className="w-14 text-right font-mono text-2xl font-bold tabular">{fmtCents(m.probability)}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 md:justify-end">
          <span className="rounded-md bg-[hsl(155_40%_15%)] px-3 py-2 font-mono text-xs font-semibold text-[hsl(155_55%_67%)]">YES {fmtCents(m.yesAsk)}</span>
          <span className="rounded-md bg-destructive/10 px-3 py-2 font-mono text-xs font-semibold text-destructive">NO {fmtCents(m.noAsk)}</span>
          <span className="px-1 text-xs">24h <Change value={m.change} /></span>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-dashed border-border px-4 py-2 font-mono text-[11px] text-muted-foreground">
        <span>{fmtContracts(m.volume)} vol</span>
        <span>{fmtContracts(m.volume24h)} 24h</span>
        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{fullDate(m.closeTime)}</span>
        <span className="uppercase">{m.status}</span>
        <button onClick={() => setOpen((v) => !v)} data-testid={`button-rules-${m.ticker}`} className="ml-auto flex items-center gap-1 font-semibold text-foreground transition-colors hover:text-primary">
          Rules <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
        </button>
      </div>
      {open && (
        <div className="animate-in fade-in slide-in-from-top-1 border-t border-border bg-muted/50 px-4 py-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-primary">Resolution rules</p>
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed">{m.rules || "No rules text provided by the source. Check the market on Kalshi."}</p>
          {m.url && <div className="mt-3"><KalshiCTA url={m.url} label="View market on Kalshi" testId={`button-trade-${m.ticker}`} /></div>}
        </div>
      )}
    </div>
  );
}
