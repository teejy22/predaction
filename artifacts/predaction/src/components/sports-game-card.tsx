import { Link } from "wouter";
import { ArrowUpRight, Clock3, Layers } from "lucide-react";
import type { PredictionEvent, PredictionMarket, SportsGame } from "@workspace/api-client-react";
import { closeLabel, fmtContracts } from "@/lib/format";

export function eventLabel(event: PredictionEvent): string {
  const t = event.title || "";
  const i = t.indexOf(":");
  return (i >= 0 ? t.slice(i + 1) : t).trim() || t || event.ticker;
}

type Kind = "winner" | "spread" | "total";
function kindOf(event: PredictionEvent): Kind | null {
  const label = eventLabel(event).toLowerCase();
  const full = `${event.title} ${event.subtitle}`.toLowerCase();
  if (/(1st|2nd|first|second|half|quarter|period|inning|\bq[1-4]\b|\bh[12]\b)/.test(label)) return null;
  if (/spread/.test(label)) return "spread";
  if (/total/.test(label)) return "total";
  if (/(winner|moneyline|to win|wins?\b)/.test(label) || (!/(spread|total|prop|player|points|yards)/.test(full) && label === (event.title || "").toLowerCase())) return "winner";
  return null;
}

const ORDER: Kind[] = ["winner", "spread", "total"];
const NAMES: Record<Kind, string> = { winner: "Winner", spread: "Spread", total: "Total" };

function topMarkets(event: PredictionEvent, n: number): PredictionMarket[] {
  return [...event.markets].sort((a, b) => b.probability - a.probability || b.volume - a.volume).slice(0, n);
}

export function SportsGameCard({ game }: { game: SportsGame }) {
  const href = `/sports/game/${encodeURIComponent(game.key)}`;
  const picked: { kind: Kind | null; event: PredictionEvent }[] = [];
  for (const k of ORDER) {
    const ev = game.events.find((e) => kindOf(e) === k && e.markets.length);
    if (ev) picked.push({ kind: k, event: ev });
  }
  if (!picked.length && game.events[0]) picked.push({ kind: null, event: [...game.events].sort((a, b) => b.volume - a.volume)[0] });
  const shown = picked.slice(0, 3);
  const rowsPer = shown.length === 1 ? 3 : 2;
  const shownCount = shown.reduce((s, p) => s + Math.min(rowsPer, p.event.markets.length), 0);
  const more = Math.max(0, game.marketCount - shownCount);

  return (
    <article data-testid={`card-sports-game-${game.key}`} className="group relative flex min-h-[224px] flex-col rounded-lg border border-border bg-card/75 p-4 transition-colors hover:border-primary/40 focus-within:border-primary/60">
      <div className="flex items-start justify-between gap-3">
        <p className="font-mono text-[9px] font-semibold uppercase tracking-[.16em] text-primary">
          {game.league || game.sport || "Sports"} <span className="text-muted-foreground">· Kalshi</span>
        </p>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-sm border border-border px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground tabular" title="Grouped Kalshi events">
          <Layers className="h-3 w-3" />{game.eventCount} ev · {game.marketCount} mkt
        </span>
      </div>
      <Link href={href} data-testid={`link-sports-game-${game.key}`} aria-label={`Open all markets for ${game.title}`} className="mt-2 block after:absolute after:inset-0 after:rounded-lg focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-primary">
        <h3 className="line-clamp-2 text-sm font-semibold leading-5 group-hover:text-primary">{game.title}</h3>
        {game.subtitle && <p className="mt-1 line-clamp-1 text-[10px] text-muted-foreground">{game.subtitle}</p>}
      </Link>

      <div className="mt-3 flex-1 space-y-2.5">
        {shown.length ? shown.map(({ kind, event }) => (
          <div key={event.ticker}>
            <p className="flex items-center justify-between font-mono text-[9px] uppercase tracking-[.14em] text-muted-foreground">
              <span className={kind ? "text-foreground/80" : ""}>{kind ? NAMES[kind] : eventLabel(event)}</span>
              <span className="tabular">{fmtContracts(event.volume)} vol</span>
            </p>
            <div className="mt-1 divide-y divide-border/60 border-y border-border/60">
              {topMarkets(event, rowsPer).map((m) => (
                <div key={m.ticker} className="flex items-center justify-between gap-3 py-1.5">
                  <span className="min-w-0 truncate text-[11px] font-medium">{m.subtitle || m.title}</span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="relative hidden h-1 w-10 overflow-hidden rounded-full bg-muted sm:block"><span className="absolute inset-y-0 left-0 bg-primary" style={{ width: `${Math.max(0, Math.min(100, m.probability))}%` }} /></span>
                    <span className="w-9 text-right font-mono text-sm font-semibold tabular">{Math.round(m.probability)}%</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )) : <p className="py-3 text-[10px] text-muted-foreground">No open outcomes available.</p>}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 font-mono text-[9px] text-muted-foreground"><Clock3 className="h-3 w-3" /> {closeLabel(game.closeTime)}</span>
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary" data-testid={`text-more-markets-${game.key}`}>
          {more > 0 ? `+${more} markets` : "Game details"} <ArrowUpRight className="h-3 w-3" />
        </span>
      </div>
    </article>
  );
}
