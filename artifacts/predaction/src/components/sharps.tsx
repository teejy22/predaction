import type { SportsGame } from "@workspace/api-client-react";
import { updatedLabel } from "@/lib/format";

type Sharps = NonNullable<SportsGame["sharps"]>;

export function fmtDollars(value: number) {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 10_000) return `$${Math.round(value / 1_000)}K`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${Math.round(value)}`;
}

const count = (n: number) => `${n} sharp${n === 1 ? "" : "s"}`;

// One line for game cards: who the tracked football wallets are holding and how much.
export function SharpsLine({ sharps, gameKey }: { sharps: Sharps; gameKey: string }) {
  const top = sharps.bets[0];
  if (!top) return null;
  return (
    <p data-testid={`text-sharps-${gameKey}`} className="mt-3 flex items-baseline justify-between gap-2 border-t border-border/60 pt-2.5 text-xs sm:mt-2.5 sm:pt-2 sm:text-[10px]">
      <span className="min-w-0 truncate text-muted-foreground"><span className="font-semibold text-foreground">{count(sharps.wallets)}</span> · most on <span className="font-semibold text-foreground">{top.label}</span></span>
      <span className="shrink-0 font-mono tabular text-foreground/85">{fmtDollars(sharps.value)}</span>
    </p>
  );
}

// Full breakdown for the game page: one row per bet held.
export function SharpsPanel({ sharps }: { sharps: Sharps }) {
  return (
    <section className="rise mt-4 rounded-xl border border-border bg-card/70 p-5 sm:p-6" aria-label="Sharp positions" data-testid="panel-sharps">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="font-display text-lg font-bold tracking-tight">Sharp positions</h2>
        <p className="font-mono text-xs tabular text-muted-foreground">{count(sharps.wallets)} · {fmtDollars(sharps.value)} open</p>
      </div>
      <div className="mt-3 divide-y divide-border/60 border-t border-border/60">
        {sharps.bets.map((bet) => (
          <div key={`${bet.kind}-${bet.label}`} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-baseline gap-4 py-2.5" data-testid={`row-sharp-bet-${bet.kind}-${bet.label}`}>
            <p className="min-w-0 truncate text-sm font-semibold">{bet.label}</p>
            <p className="text-right text-xs text-muted-foreground">{count(bet.wallets)} · avg {bet.avgPrice.toFixed(0)}¢</p>
            <p className="w-14 text-right font-mono text-sm font-bold tabular">{fmtDollars(bet.value)}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
        Open Polymarket positions on this game held by the {sharps.tracked ? `${sharps.tracked} ` : ""}top-ranked wallets on FlowFrame's football leaderboard. Dollar amounts are what the positions are worth now; "avg" is the average price paid per $1 contract. Full-game winner, spread and total bets only.{sharps.updatedAt ? ` Checked ${updatedLabel(sharps.updatedAt)}.` : ""}
      </p>
    </section>
  );
}
