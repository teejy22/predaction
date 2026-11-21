import { motion, useReducedMotion } from "framer-motion";
import { Pin } from "lucide-react";
import { contracts, heldTeam, pnlOf, valueOf, type LiveGame } from "./_data";
import type { PanelFields } from "./_prefs";
import { PriceLine } from "./_price-line";
import { signedUsd, tone, usd } from "./_fmt";

const FRESH_MS = 6000;

export function GamePanel({ g, fields, pinned, big, now, onPin }: { g: LiveGame; fields: PanelFields; pinned: boolean; big: boolean; now: number; onPin: () => void }) {
  const reduce = useReducedMotion();
  const pnl = pnlOf(g);
  const swing = now - g.swingAt < FRESH_MS;
  const lead = now - g.leadChangeAt < FRESH_MS;
  const mineHome = g.bet.side === "home";
  const border = swing ? (g.swingSize > 0 ? "border-[hsl(var(--chart-2))]" : "border-destructive") : lead ? "border-primary" : "border-transparent";
  const priceSize = big ? "text-6xl sm:text-7xl" : "text-5xl";
  const row = (team: string, score: number, held: boolean) => (
    <div className="flex items-baseline justify-between gap-3">
      <span className={`truncate ${big ? "text-lg" : "text-sm"} font-semibold ${held ? "text-foreground" : "text-muted-foreground"}`}>{team}{held && <span className="ml-1.5 inline-block h-1.5 w-1.5 -translate-y-0.5 rounded-full bg-primary align-middle" aria-label="your side" />}</span>
      {fields.score && <span className={`font-mono font-bold tabular ${big ? "text-2xl" : "text-lg"} ${held ? "text-foreground" : "text-muted-foreground"}`}>{score}</span>}
    </div>
  );
  return (
    <article data-testid={`panel-game-${g.id}`} className={`flex h-full flex-col rounded-xl border-2 bg-card p-4 transition-colors duration-500 sm:p-5 ${border}`}>
      <header className="flex items-center justify-between gap-2 text-xs">
        <span className="flex items-center gap-2 font-semibold">
          <span className="text-primary">{g.league}</span>
          {g.final ? <span className="text-muted-foreground">Final</span> : <span className="flex items-center gap-1.5 font-mono tabular text-foreground/85"><span className="live-dot h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />{g.period} {g.clock}</span>}
        </span>
        <span className="flex items-center gap-2">
          {lead && <span className="rounded bg-primary px-1.5 py-0.5 text-[11px] font-bold text-primary-foreground" data-testid={`status-lead-${g.id}`}>Lead change</span>}
          {swing && <span className={`rounded px-1.5 py-0.5 font-mono text-[11px] font-bold ${g.swingSize > 0 ? "bg-[hsl(var(--chart-2)/.15)] text-[hsl(var(--chart-2))]" : "bg-destructive/15 text-destructive"}`} data-testid={`status-swing-${g.id}`}>{g.swingSize > 0 ? "+" : ""}{g.swingSize}¢ swing</span>}
          <button type="button" onClick={onPin} aria-pressed={pinned} aria-label={pinned ? "Unpin game" : "Spotlight this game"} data-testid={`button-pin-${g.id}`} className={`rounded p-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${pinned ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}><Pin className="h-3.5 w-3.5" /></button>
        </span>
      </header>

      <div className="mt-3 space-y-1">
        {row(g.away, g.awayScore, !mineHome)}
        {row(g.home, g.homeScore, mineHome)}
      </div>

      <div className="mt-4 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs text-muted-foreground">{heldTeam(g)} to win</p>
          <div className="flex items-baseline gap-2">
            <motion.span
              key={g.price}
              initial={reduce || g.move === 0 ? false : { opacity: 0.35, y: g.move > 0 ? 10 : -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
              className={`inline-block font-display font-bold leading-none tabular ${priceSize}`}
              data-testid={`text-price-${g.id}`}
            >{g.price}¢</motion.span>
            {g.move !== 0 && <span className={`font-mono text-sm font-bold tabular ${tone(g.move)}`}>{g.move > 0 ? "+" : ""}{g.move}</span>}
          </div>
        </div>
        {fields.position && (
          <div className="text-right">
            <p className={`font-display font-bold leading-none tabular ${big ? "text-4xl" : "text-2xl"} ${tone(pnl)}`} data-testid={`text-pnl-${g.id}`}>{signedUsd(pnl)}</p>
            <p className="mt-1 font-mono text-xs tabular text-muted-foreground">worth {usd(valueOf(g))}</p>
          </div>
        )}
      </div>

      {fields.chart && <div className="mt-4 flex-1"><PriceLine history={g.history} entry={g.bet.entryCents} height={big ? 160 : 64} /></div>}

      {fields.position && (
        <dl className="mt-3 grid grid-cols-3 gap-2 font-mono text-[11px] tabular text-muted-foreground">
          <div><dt>Stake</dt><dd className="text-sm text-foreground">{usd(g.bet.stake)}</dd></div>
          <div><dt>Entry</dt><dd className="text-sm text-foreground">{g.bet.entryCents}¢</dd></div>
          <div className="text-right"><dt>Contracts</dt><dd className="text-sm text-foreground">{Math.round(contracts(g.bet))}</dd></div>
        </dl>
      )}
    </article>
  );
}
