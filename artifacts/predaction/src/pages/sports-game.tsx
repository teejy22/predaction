import { useMemo, useState } from "react";
import { Link, useParams } from "wouter";
import { ArrowLeft, ArrowUpRight, ChevronDown } from "lucide-react";
import { getGetSportsGameQueryKey, useGetSportsGame, type PredictionEvent, type PredictionMarket, type SportsGame, type TeamLogo } from "@workspace/api-client-react";
import { ErrorPanel, KalshiCTA, WatchButton } from "@/components/bits";
import { eventLabel } from "@/components/sports-game-card";
import { logoFor, polymarketChance } from "@/components/sports-matchup-card";
import { leagueName } from "@/components/sports-sidebar";
import { TeamLogos } from "@/components/team-logos";
import { dayHeading, formatStartTime } from "@/components/upcoming-games";
import { fmtCents, fmtContracts } from "@/lib/format";
import { usePageMeta } from "@/lib/meta";

const ROW_LIMIT = 6;
const watchTarget = (e: PredictionEvent) => ({ ticker: e.ticker, title: e.title, category: e.category, sport: e.sport, league: e.league });
const byChance = (e: PredictionEvent) => [...e.markets].sort((a, b) => b.probability - a.probability);

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
    <div className="mx-auto max-w-4xl px-4 py-10 md:px-6">{back}
      <div className="mt-6 h-5 w-24 animate-pulse rounded bg-muted" /><div className="mt-4 h-14 w-2/3 animate-pulse rounded bg-muted" />
      <div className="mt-8 space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-40 animate-pulse rounded-lg bg-muted" />)}</div>
    </div>
  );
  if (!g) {
    const status = (q.error as { status?: number } | null)?.status;
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 md:px-6">{back}
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

  // The winner market leads the page as a head-to-head panel; everything else is a plain list.
  const main = events[0] && rank(events[0]) === 0 && events[0].markets.length >= 2 && events[0].markets.length <= 3 ? events[0] : undefined;
  const rest = main ? events.slice(1) : events;
  const visible = active === "all" ? rest : rest.filter((e) => e.ticker === active);
  const when = [g.gameDate ? dayHeading(g.gameDate) : "", g.startTime ? formatStartTime(g.startTime) : ""].filter(Boolean).join(" · ");
  const meta = [leagueName(g.league) || g.sport, g.polymarket?.live ? `Live${g.polymarket.period ? ` · ${g.polymarket.period}` : ""}` : when, `${fmtContracts(g.volume)} contracts traded`].filter(Boolean);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-6 md:py-10">
      {back}
      <header className="rise mt-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <TeamLogos teams={g.teams} size="lg" />
          <div className="min-w-0">
            <h1 className="font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl" data-testid="text-game-title">{g.title}</h1>
            <p className="mt-1.5 text-sm text-muted-foreground" data-testid="text-game-meta">{meta.join(" · ")}</p>
          </div>
        </div>
        <KalshiCTA url={g.url} />
      </header>

      {q.isRefetchError && <div className="mt-6 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-xs">Latest refresh failed. Showing last loaded data. <button onClick={() => q.refetch()} className="font-semibold text-primary underline">Retry</button></div>}

      {main && <WinnerPanel e={main} teams={g.teams} game={g} />}

      {rest.length > 4 && <nav className="mt-8 flex gap-1.5 overflow-x-auto pb-1" aria-label="Filter markets in this game">
        {[{ t: "all", label: "All" }, ...rest.map((e) => ({ t: e.ticker, label: eventLabel(e) }))].map((x) => (
          <button key={x.t} type="button" onClick={() => setActive(x.t)} aria-pressed={active === x.t} data-testid={`button-game-event-${x.t}`} className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${active === x.t ? "border-primary bg-primary/20 text-foreground" : "border-border text-muted-foreground hover:text-foreground"}`}>{x.label}</button>
        ))}
      </nav>}

      <div className="mt-8 space-y-8">
        {visible.map((e) => <EventBlock key={e.ticker} e={e} />)}
        {!events.length && <p className="py-10 text-center text-sm text-muted-foreground">No events indexed for this game.</p>}
      </div>
      <p className="mt-10 text-xs text-muted-foreground">Percentages are Kalshi implied chances unless labeled Polymarket US{g.polymarket ? ", which shows the midpoint of that exchange's best bid and ask" : ""}. Yes and No are the current prices to buy each side. Not financial advice.</p>
    </div>
  );
}

function WinnerPanel({ e, teams, game }: { e: PredictionEvent; teams: TeamLogo[]; game: SportsGame }) {
  const poly = game.polymarket;
  const dual = !!poly && e.markets.some((m) => polymarketChance(game, m.ticker) !== undefined);
  const [open, setOpen] = useState(false);
  const markets = byChance(e);
  const total = markets.reduce((sum, m) => sum + m.probability, 0) || 1;
  return (
    <section className="rise mt-8 rounded-xl border border-border bg-card/70 p-5 sm:p-6" aria-label="Who wins" data-testid={`section-game-event-${e.ticker}`}>
      <div className={`grid gap-4 ${markets.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
        {markets.map((m, i) => {
          const logo = logoFor(m, teams);
          return (
            <div key={m.ticker} className="min-w-0" data-testid={`row-market-${m.ticker}`}>
              <div className="flex items-center gap-2.5">
                {logo && <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-background"><img src={logo.logo} alt="" loading="lazy" referrerPolicy="no-referrer" className="h-[76%] w-[76%] object-contain" /></span>}
                <p className="truncate text-sm font-semibold sm:text-base">{m.subtitle || m.title}</p>
              </div>
              {dual && <p className="mt-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Kalshi</p>}
              <p className={`${dual ? "mt-0.5" : "mt-3"} font-display text-4xl font-bold tracking-tight tabular sm:text-5xl ${i === 0 ? "text-foreground" : "text-muted-foreground"}`}>{Math.round(m.probability)}%</p>
              <p className="mt-1 font-mono text-[11px] text-muted-foreground">Yes {fmtCents(m.yesAsk)}</p>
              {dual && (() => {
                const chance = polymarketChance(game, m.ticker);
                return (
                  <div className="mt-3 border-t border-border/70 pt-3" data-testid={`text-polymarket-${m.ticker}`}>
                    <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Polymarket US</p>
                    <p className="mt-0.5 font-display text-2xl font-bold tracking-tight tabular text-foreground/90 sm:text-3xl">{chance === undefined ? <span className="text-muted-foreground" aria-label="No price available">–</span> : `${Math.round(chance)}%`}</p>
                  </div>
                );
              })()}
            </div>
          );
        })}
      </div>
      <div className="mt-5 flex h-1.5 gap-0.5 overflow-hidden rounded-full" aria-hidden="true">
        {markets.map((m, i) => <span key={m.ticker} className={i === 0 ? "bg-primary" : i === 1 ? "bg-muted-foreground/40" : "bg-muted"} style={{ width: `${(m.probability / total) * 100}%` }} />)}
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>{fmtContracts(e.volume)} contracts traded{dual ? " on Kalshi" : ""}</span>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} data-testid={`button-rules-${markets[0]!.ticker}`} className="inline-flex items-center gap-1 rounded font-semibold hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">Rules <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} /></button>
          <WatchButton event={watchTarget(e)} />
        </div>
      </div>
      {dual && poly && <a href={poly.url} target="_blank" rel="noopener noreferrer" data-testid="link-polymarket-game" className="mt-3 inline-flex items-center gap-1 rounded text-xs font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">View this game on Polymarket US <ArrowUpRight className="h-3.5 w-3.5" /></a>}
      {open && <p className="mt-4 whitespace-pre-line border-t border-border pt-4 text-sm leading-relaxed text-muted-foreground">{markets[0]!.rules || "No rules text provided by the source."}</p>}
    </section>
  );
}

function EventBlock({ e }: { e: PredictionEvent }) {
  const [all, setAll] = useState(false);
  const markets = byChance(e);
  const shown = all ? markets : markets.slice(0, ROW_LIMIT);
  return (
    <section data-testid={`section-game-event-${e.ticker}`}>
      <header className="mb-2 flex items-center justify-between gap-3">
        <h2 className="font-display text-lg font-bold tracking-tight"><Link href={`/event/${encodeURIComponent(e.ticker)}`} data-testid={`link-event-${e.ticker}`} className="hover:text-primary">{eventLabel(e)}</Link></h2>
        <WatchButton event={watchTarget(e)} />
      </header>
      {markets.length ? <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card/70">{shown.map((m) => <MarketLine key={m.ticker} m={m} />)}</div> : <p className="text-xs text-muted-foreground">No open markets.</p>}
      {markets.length > ROW_LIMIT && <button type="button" onClick={() => setAll((v) => !v)} data-testid={`button-game-more-${e.ticker}`} className="mt-2 rounded text-xs font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">{all ? "Show fewer" : `Show all ${markets.length}`}</button>}
    </section>
  );
}

function MarketLine({ m }: { m: PredictionMarket }) {
  const [open, setOpen] = useState(false);
  return (
    <div data-testid={`row-market-${m.ticker}`}>
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} data-testid={`button-rules-${m.ticker}`} className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary sm:grid-cols-[minmax(0,1fr)_auto_auto_auto]">
        <span className="min-w-0 truncate text-sm font-medium">{m.subtitle || m.title}</span>
        <span className="w-12 text-right font-mono text-sm font-bold tabular">{Math.round(m.probability)}%</span>
        <span className="hidden gap-1.5 font-mono text-[11px] sm:flex">
          <span className="w-[4.5rem] rounded bg-[hsl(155_40%_15%)] px-2 py-1 text-center text-[hsl(155_55%_67%)]">Yes {fmtCents(m.yesAsk)}</span>
          <span className="w-[4.5rem] rounded bg-destructive/10 px-2 py-1 text-center text-destructive">No {fmtCents(m.noAsk)}</span>
        </span>
        <ChevronDown className={`hidden h-3.5 w-3.5 text-muted-foreground transition-transform sm:block ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>
      {open && <div className="border-t border-dashed border-border bg-muted/30 px-4 py-3">
        <p className="font-mono text-[11px] text-muted-foreground sm:hidden">Yes {fmtCents(m.yesAsk)} · No {fmtCents(m.noAsk)}</p>
        <p className="mt-1 font-mono text-[10px] text-muted-foreground">{fmtContracts(m.volume)} contracts traded</p>
        <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{m.rules || "No rules text provided by the source."}</p>
        {m.url && <div className="mt-3"><KalshiCTA url={m.url} label="View market on Kalshi" testId={`button-trade-${m.ticker}`} /></div>}
      </div>}
    </div>
  );
}
