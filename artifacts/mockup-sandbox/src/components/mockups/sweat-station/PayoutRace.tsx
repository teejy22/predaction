import "./_group.css";
import { useEffect, useState } from "react";
import { Flag, Maximize2, Minimize2, SlidersHorizontal, X } from "lucide-react";
import { useSweatBoard, IS_SAMPLE_DATA, heldTeam, contracts, valueOf, pnlOf, type LiveGame } from "./_data";
import { usd, signedUsd, tone } from "./_fmt";

const control = "inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";

function Lane({ game: g, now, featured, momentum }: { game: LiveGame; now: number; featured: boolean; momentum: boolean }) {
  const change = g.price - g.history[Math.max(0, g.history.length - 75)];
  const sharp = now - g.swingAt < 6500;
  const lead = now - g.leadChangeAt < 6500;
  return (
    <article className={`grid grid-cols-[1fr_auto] items-center gap-x-5 gap-y-4 rounded-lg px-4 py-4 sm:px-5 lg:grid-cols-[240px_minmax(180px,1fr)_145px_120px] lg:gap-x-7 ${featured ? "bg-card lg:py-3" : "lg:py-1"}`} aria-label={`${heldTeam(g)} to win`}>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h3 className={`truncate font-display font-semibold ${featured ? "text-2xl" : "text-xl"}`}>{heldTeam(g)}</h3>
          {featured && <Flag className="h-3.5 w-3.5 shrink-0 text-primary" aria-label="Priority bet" />}
          {lead && <span className="text-xs text-primary">Lead change</span>}
          <span className="ml-auto hidden shrink-0 font-mono text-[10px] tabular text-muted-foreground lg:inline">{g.league} {g.period} {g.clock}</span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground lg:hidden">
          <span>{g.league}</span><span className="font-mono tabular">{g.period} {g.clock}</span>
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          <span className={g.bet.side === "away" ? "text-foreground" : ""}>{g.away} <b className="font-mono tabular">{g.awayScore}</b></span>
          <span className="mx-1.5">–</span>
          <span className={g.bet.side === "home" ? "text-foreground" : ""}>{g.home} <b className="font-mono tabular">{g.homeScore}</b></span>
        </div>
      </div>
      <div className="col-span-2 row-start-2 lg:col-span-1 lg:row-start-auto">
        <div className="mb-1 flex items-baseline justify-between gap-2">
          <span className={`font-mono font-semibold tabular ${featured ? "text-2xl" : "text-lg"}`}>{g.price}<span className="ml-1 text-xs font-normal text-muted-foreground">¢ · {g.price}% chance</span></span>
          {momentum && <span className={`font-mono text-[11px] tabular ${tone(sharp ? g.swingSize : change)}`}>{sharp ? `${g.swingSize > 0 ? "+" : ""}${g.swingSize}¢ surge` : change > 1 ? `+${change}¢ climbing` : change < -1 ? `${change}¢ sliding` : "Holding steady"}</span>}
        </div>
        <div className="relative h-2 rounded-sm bg-muted" role="meter" aria-label={`${heldTeam(g)} chance of payout`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={g.price}>
          <div className="absolute inset-0 origin-left rounded-sm bg-primary transition-transform duration-700 motion-reduce:transition-none" style={{ transform: `scaleX(${g.price / 100})` }} />
          <span className="absolute -top-1 h-4 w-0.5 bg-foreground/80" style={{ left: `${g.bet.entryCents}%` }} aria-label={`Entry ${g.bet.entryCents} cents`} />
          <span className="absolute -top-0.5 h-3 w-1 rounded-sm bg-[hsl(var(--primary-readable))]" style={{ left: `calc(${g.price}% - 2px)` }} />
        </div>
        <div className="relative mt-1 flex justify-between font-mono text-[10px] tabular text-muted-foreground"><span>0</span><span className="absolute -translate-x-1/2" style={{ left: `${g.bet.entryCents}%` }}>Entry {g.bet.entryCents}¢</span><span>100</span></div>
      </div>
      <div className="col-start-2 row-start-1 text-right lg:col-start-auto lg:row-start-auto">
        <p className={`font-mono font-semibold leading-none tracking-tighter tabular ${featured ? "text-3xl sm:text-4xl" : "text-2xl"}`}>{usd(contracts(g.bet))}</p>
        <p className="mt-1.5 text-xs text-muted-foreground lg:hidden">if it hits</p>
        {featured && <p className="mt-1.5 hidden text-xs text-primary lg:block">Payout in focus</p>}
      </div>
      <div className="col-span-2 flex items-baseline justify-between gap-2 text-right lg:col-span-1 lg:block">
        <p className={`font-mono text-sm font-semibold tabular ${tone(pnlOf(g))}`}>{signedUsd(pnlOf(g))}<span className="ml-1.5 text-[10px] font-normal text-muted-foreground lg:hidden">P/L</span></p>
        <p className="mt-1 font-mono text-[11px] tabular text-muted-foreground">{usd(valueOf(g))} now</p>
      </div>
    </article>
  );
}

export function PayoutRace() {
  const snap = useSweatBoard();
  const [editing, setEditing] = useState(false);
  const [screen, setScreen] = useState(false);
  const [hidden, setHidden] = useState<string[]>([]);
  const [sort, setSort] = useState("payout");
  const [momentum, setMomentum] = useState(true);
  const [priority, setPriority] = useState("");
  useEffect(() => {
    const fs = () => { if (!document.fullscreenElement) setScreen(false); };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") { setScreen(false); setEditing(false); } };
    document.addEventListener("fullscreenchange", fs);
    window.addEventListener("keydown", key);
    return () => { document.removeEventListener("fullscreenchange", fs); window.removeEventListener("keydown", key); };
  }, []);
  useEffect(() => {
    if (!screen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [screen]);
  const games = snap.games.filter(g => !hidden.includes(g.id)).sort((a, b) => {
    if (a.id === priority) return -1;
    if (b.id === priority) return 1;
    return sort === "chance" ? b.price - a.price : sort === "risk" ? b.bet.stake - a.bet.stake : contracts(b.bet) - contracts(a.bet);
  });
  const payout = games.reduce((sum, g) => sum + contracts(g.bet), 0);
  const value = games.reduce((sum, g) => sum + valueOf(g), 0);
  const stake = games.reduce((sum, g) => sum + g.bet.stake, 0);
  const toggleScreen = () => {
    if (screen) {
      setScreen(false);
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => undefined);
    } else {
      setEditing(false);
      setScreen(true);
      document.documentElement.requestFullscreen?.().catch(() => undefined);
    }
  };
  return (
    <div className="ss-root">
      <main className={screen ? "fixed inset-0 z-50 overflow-y-auto bg-background p-4 sm:px-8" : "mx-auto max-w-[1440px] px-4 py-5 sm:px-8 sm:py-6"}>
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-baseline gap-3">
            <h1 className="font-display text-2xl font-semibold sm:text-3xl">Sweat Station<span className="ml-3 hidden font-normal text-muted-foreground sm:inline">/ Payout race</span></h1>
            {IS_SAMPLE_DATA && <span className="text-xs text-muted-foreground">Sample data</span>}
          </div>
          <div className="flex items-center gap-1">
            {!screen && <button className={`${control} text-muted-foreground hover:text-foreground`} onClick={() => setEditing(!editing)} aria-expanded={editing}><SlidersHorizontal size={15} />Customize</button>}
            <button className={`${control} bg-primary text-primary-foreground`} onClick={toggleScreen}>{screen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}{screen ? "Exit second screen" : "Second screen"}</button>
          </div>
        </header>

        <section aria-label="Night summary" className="mb-5 mt-7 grid grid-cols-2 items-end gap-x-6 gap-y-5 sm:mb-4 sm:mt-6 lg:grid-cols-[1.3fr_1fr_0.7fr_0.7fr]">
          <div><p className="mb-2 text-sm text-muted-foreground">If everything hits</p><p className="font-mono text-4xl font-semibold tracking-tighter tabular sm:text-5xl">{usd(payout)}</p></div>
          <div><p className="mb-2 text-sm text-muted-foreground">Worth right now</p><p className="font-mono text-3xl tracking-tighter tabular sm:text-4xl">{usd(value)}</p></div>
          <div><p className="mb-2 text-sm text-muted-foreground">Tonight’s P/L</p><p className={`font-mono text-2xl tabular ${tone(value - stake)}`}>{signedUsd(value - stake)}</p></div>
          <div className="lg:text-right"><p className="mb-2 text-sm text-muted-foreground">{games.length} bets in the race</p><p className="font-mono text-sm tabular text-muted-foreground">{usd(stake)} staked</p></div>
        </section>

        {editing && <section aria-label="Customize board" className="mb-6 rounded-lg bg-card p-5">
          <div className="mb-4 flex items-center justify-between"><h2 className="font-display text-xl font-semibold">Your race</h2><button className={control} onClick={() => setEditing(false)} aria-label="Close customization"><X size={18} /></button></div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <label className="text-sm">Order lanes<select value={sort} onChange={e => setSort(e.target.value)} className="mt-2 block w-full rounded border border-border bg-background p-2"><option value="payout">Biggest payout first</option><option value="chance">Closest to paid first</option><option value="risk">Largest stake first</option></select></label>
            <label className="text-sm">Priority bet<select value={priority} onChange={e => setPriority(e.target.value)} className="mt-2 block w-full rounded border border-border bg-background p-2"><option value="">Follow lane order</option>{snap.games.map(g => <option key={g.id} value={g.id}>{heldTeam(g)}</option>)}</select></label>
            <label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={momentum} onChange={e => setMomentum(e.target.checked)} className="accent-[hsl(var(--primary))]" />Show recent momentum</label>
          </div>
          <div className="mt-5 flex flex-wrap gap-x-6 gap-y-3">{snap.games.map(g => <label key={g.id} className="flex items-center gap-2 text-sm"><input className="accent-[hsl(var(--primary))]" type="checkbox" checked={!hidden.includes(g.id)} onChange={() => setHidden(old => old.includes(g.id) ? old.filter(id => id !== g.id) : [...old, g.id])} />{heldTeam(g)}</label>)}</div>
          <button className="mt-5 text-sm text-muted-foreground underline underline-offset-4" onClick={() => { setHidden([]); setPriority(""); setSort("payout"); setMomentum(true); }}>Reset board</button>
        </section>}

        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg font-medium">The race to paid</h2>
          <div className="flex items-center gap-4 text-[11px] text-muted-foreground"><span className="flex items-center gap-1.5"><span className="h-3 w-0.5 bg-foreground/80" />Your entry</span><span>Momentum ≈ last 2 min</span></div>
        </div>
        <div className="mb-2 hidden grid-cols-[240px_minmax(180px,1fr)_145px_120px] gap-x-7 px-5 text-xs text-muted-foreground lg:grid"><span>Held side · live score</span><span className="flex justify-between"><span>Losing · 0%</span><span>Paid · 100%</span></span><span className="text-right">Payout if it hits</span><span className="text-right">Profit / loss</span></div>
        <section aria-label="Bet payout tracks" className="space-y-1">
          {games.map((g, i) => <Lane key={g.id} game={g} now={snap.updatedAt} featured={i === 0} momentum={momentum} />)}
          {!games.length && <div className="rounded-lg bg-card py-16 text-center"><h3 className="font-display text-2xl">No bets on the track</h3><button className={`${control} mt-4 bg-primary text-primary-foreground`} onClick={() => setHidden([])}>Show every bet</button></div>}
        </section>
        <footer className="mt-5 flex flex-wrap justify-between gap-2 text-[11px] text-muted-foreground"><span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-primary" />Live board · read only</span><span>Payout includes stake. Each winning contract pays $1.</span></footer>
      </main>
    </div>
  );
}
