import "./_group.css";
import { useEffect, useRef, useState } from "react";
import { Check, LockKeyhole, Maximize2, Minimize2, Radio, Settings2, X } from "lucide-react";
import { useSweatBoard, IS_SAMPLE_DATA, heldTeam, contracts, valueOf, pnlOf, type LiveGame } from "./_data";
import { signedUsd, tone, usd } from "./_fmt";

const control = "inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";

function StoryChart({ game }: { game: LiveGame }) {
  const values = [...game.history, game.bet.entryCents];
  const low = Math.max(0, Math.min(...values) - 7);
  const high = Math.min(100, Math.max(...values) + 7);
  const y = (value: number) => 160 - ((value - low) / (high - low)) * 138;
  const points = game.history.map((value, i) => `${12 + i / Math.max(1, game.history.length - 1) * 636},${y(value)}`).join(" ");
  return (
    <div className="mt-4">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Held-side price</span><span className="font-mono tabular">{Math.round(high)}¢</span>
      </div>
      <svg viewBox="0 0 700 185" className="mt-1 h-[138px] w-full" role="img" aria-label={`${heldTeam(game)} price history. Entered at ${game.bet.entryCents} cents, now ${game.price} cents.`}>
        <line x1="12" x2="650" y1={y(game.bet.entryCents)} y2={y(game.bet.entryCents)} stroke="hsl(var(--muted-foreground))" strokeOpacity=".5" strokeDasharray="4 6" />
        <polyline points={points} fill="none" stroke="hsl(var(--primary-readable))" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
        <circle cx="648" cy={y(game.price)} r="5" fill="hsl(var(--primary-readable))" />
        <text x="696" y={y(game.bet.entryCents) + 4} textAnchor="end" fill="hsl(var(--muted-foreground))" fontSize="12" className="font-mono">{game.bet.entryCents}¢</text>
        <text x="12" y="183" fill="hsl(var(--muted-foreground))" fontSize="12">Earlier</text>
        <text x="648" y="183" textAnchor="end" fill="hsl(var(--muted-foreground))" fontSize="12">Now</text>
      </svg>
      <p className="text-xs text-muted-foreground">Dashed line: your entry at <span className="font-mono tabular">{game.bet.entryCents}¢</span></p>
    </div>
  );
}

function GameCue({ g, now }: { g: LiveGame; now: number }) {
  if (g.swingAt && now - g.swingAt < 10000) return <span className={`font-mono tabular ${tone(g.swingSize)}`}>{g.swingSize > 0 ? "+" : ""}{g.swingSize}¢ swing</span>;
  if (g.leadChangeAt && now - g.leadChangeAt < 10000) return <span className="text-[hsl(var(--primary-readable))]">Lead change</span>;
  return null;
}

export function MainEvent() {
  const { games, updatedAt } = useSweatBoard();
  const [hidden, setHidden] = useState<string[]>([]);
  const [locked, setLocked] = useState<string | null>(null);
  const [mode, setMode] = useState<"stake" | "movement">("stake");
  const [emphasis, setEmphasis] = useState<"price" | "pnl">("price");
  const [settings, setSettings] = useState(false);
  const [screen, setScreen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const visible = games.filter(g => !hidden.includes(g.id));
  const movement = (g: LiveGame) => Math.abs(g.price - (g.history[Math.max(0, g.history.length - 7)] ?? g.price));
  const ranked = [...visible].sort((a, b) => mode === "stake" ? b.bet.stake - a.bet.stake : movement(b) - movement(a) || b.bet.stake - a.bet.stake);
  const main = visible.find(g => g.id === locked) ?? ranked[0];
  const rail = visible.filter(g => g.id !== main?.id);
  const risk = visible.reduce((total, g) => total + g.bet.stake, 0);
  const value = visible.reduce((total, g) => total + valueOf(g), 0);
  const pnl = value - risk;

  useEffect(() => {
    const key = (event: KeyboardEvent) => { if (event.key === "Escape") { setSettings(false); setScreen(false); } };
    const fullscreen = () => { if (!document.fullscreenElement) setScreen(false); };
    window.addEventListener("keydown", key);
    document.addEventListener("fullscreenchange", fullscreen);
    return () => { window.removeEventListener("keydown", key); document.removeEventListener("fullscreenchange", fullscreen); };
  }, []);

  const toggleScreen = () => {
    if (screen) {
      setScreen(false);
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    } else {
      setSettings(false);
      setScreen(true);
      void root.current?.requestFullscreen?.().catch(() => undefined);
    }
  };

  return (
    <div className="ss-root" ref={root}>
      <div className={screen ? "fixed inset-0 z-40 overflow-y-auto bg-background p-4 sm:p-6" : "mx-auto max-w-[1600px] px-4 py-5 sm:px-8 sm:py-7"}>
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-baseline gap-4">
            <h1 className="font-display text-3xl font-bold tracking-tight">Sweat Station<span className="text-primary">.</span></h1>
            {IS_SAMPLE_DATA && <span className="text-xs text-muted-foreground">Sample data</span>}
          </div>
          <div className="flex gap-2">
            {!screen && <button className={`${control} text-muted-foreground hover:bg-muted hover:text-foreground`} onClick={() => setSettings(true)}><Settings2 size={16} />Customize</button>}
            <button className={`${control} bg-primary text-primary-foreground`} onClick={toggleScreen}>{screen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}{screen ? "Exit second screen" : "Second screen"}</button>
          </div>
        </header>

        <section aria-label="Night summary" className="my-6 flex flex-wrap items-center justify-between gap-x-8 gap-y-4 sm:my-7">
          <div className="flex items-baseline gap-3"><span className="text-sm text-muted-foreground">Tonight</span><span className={`font-mono text-3xl font-semibold tabular sm:text-4xl ${tone(pnl)}`}>{signedUsd(pnl)}</span></div>
          <div className="flex flex-wrap gap-x-8 gap-y-3 text-sm">
            <div><span className="text-muted-foreground">At risk </span><span className="ml-2 font-mono tabular">{usd(risk)}</span></div>
            <div><span className="text-muted-foreground">Worth now </span><span className="ml-2 font-mono tabular">{usd(value)}</span></div>
            <div><span className="font-mono tabular">{visible.filter(g => pnlOf(g) > 0).length}/{visible.length}</span><span className="ml-2 text-muted-foreground">in profit</span></div>
          </div>
        </section>

        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h2 className="font-display text-xl font-semibold">Main event</h2>
            {locked && main ? <button className={`${control} bg-muted text-[hsl(var(--primary-readable))]`} onClick={() => setLocked(null)}><LockKeyhole size={13} />Locked · resume auto</button> :
              <label className="flex items-center gap-2 text-sm text-muted-foreground"><Radio size={14} className="text-primary" /><span>Auto</span><select aria-label="Choose main event automatically by" className="max-w-[170px] rounded bg-background py-1 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary" value={mode} onChange={e => setMode(e.target.value as "stake" | "movement")}><option value="stake">Highest stake</option><option value="movement">Biggest recent move</option></select></label>}
          </div>
          <span className="hidden text-xs text-muted-foreground sm:block">Live prices · updating every 1.6s</span>
        </div>

        {main ? <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_356px]">
          <article className="min-w-0 rounded-lg bg-card px-5 py-5 sm:px-8 sm:py-6">
            <div className="flex items-center justify-between gap-2 text-sm">
              <div className="flex items-center gap-3"><span className="font-medium text-[hsl(var(--primary-readable))]">{main.league}</span><span className="font-mono tabular">{main.period} {main.clock}</span></div>
              <span className="text-xs"><GameCue g={main} now={updatedAt} /></span>
              <button onClick={() => setLocked(locked === main.id ? null : main.id)} aria-pressed={locked === main.id} aria-label={locked === main.id ? "Unlock main event" : "Lock main event"} className="rounded p-2 text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary"><LockKeyhole size={16} /></button>
            </div>

            <div className="mt-4 space-y-1">
              {([{ team: main.away, score: main.awayScore, held: main.bet.side === "away" }, { team: main.home, score: main.homeScore, held: main.bet.side === "home" }]).map(team => <div key={team.team} className={`flex items-center justify-between gap-3 ${team.held ? "text-foreground" : "text-muted-foreground"}`}><div className="flex min-w-0 items-center gap-3"><span className="truncate font-display text-3xl font-semibold sm:text-[44px] sm:leading-[1.22]">{team.team}</span>{team.held && <span className="rounded bg-primary px-2 py-1 text-[11px] font-medium text-primary-foreground">Your side</span>}</div><span className="font-mono text-4xl font-medium tabular sm:text-5xl">{team.score}</span></div>)}
            </div>

            <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">{heldTeam(main)} to win</p>
                <div className="flex items-baseline gap-3">
                  <span className={`font-mono font-medium leading-[1.1] tracking-[-.08em] tabular ${emphasis === "price" ? "text-[96px] sm:text-[128px]" : "text-6xl sm:text-7xl"}`}>{main.price}<span className="text-[.55em]">¢</span></span>
                  {main.move !== 0 && <span className={`font-mono text-lg tabular ${tone(main.move)}`}>{main.move > 0 ? "+" : ""}{main.move}¢</span>}
                </div>
                <p className="mt-1 text-sm text-muted-foreground"><span className="font-mono tabular">{main.price}%</span> implied chance</p>
              </div>
              <div className="pb-1 text-right">
                <p className="mb-2 text-sm text-muted-foreground">Your profit / loss</p>
                <p className={`font-mono font-medium tracking-tight tabular ${tone(pnlOf(main))} ${emphasis === "pnl" ? "text-4xl sm:text-5xl" : "text-3xl sm:text-4xl"}`}>{signedUsd(pnlOf(main))}</p>
                <p className="mt-2 text-sm text-muted-foreground">Worth <span className="font-mono tabular text-foreground">{usd(valueOf(main))}</span></p>
              </div>
            </div>

            <StoryChart game={main} />
            <dl className="mt-4 grid grid-cols-2 gap-y-4 sm:grid-cols-4">
              {([["Stake", usd(main.bet.stake)], ["Entry price", `${main.bet.entryCents}¢`], ["Contracts", contracts(main.bet).toFixed(1)], ["If you win", usd(contracts(main.bet))]]).map(([label, val]) => <div key={label}><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 font-mono text-lg tabular">{val}</dd></div>)}
            </dl>
          </article>

          <aside aria-label="Other bets" className="min-w-0">
            <div className="mb-3 flex items-center justify-between px-1"><h2 className="font-display text-lg font-semibold">Also on your board</h2><span className="font-mono text-sm tabular text-muted-foreground">{rail.length}</span></div>
            <div className="space-y-1.5">
              {rail.map(g => <button key={g.id} onClick={() => setLocked(g.id)} aria-label={`Make ${g.away} at ${g.home} the main event`} className="group block w-full rounded-md bg-card px-4 py-1.5 text-left hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                <div className="mb-1 flex items-center justify-between gap-2 text-[10px] text-muted-foreground"><span>{g.league}<span className="ml-2 font-mono tabular">{g.period} {g.clock}</span></span><GameCue g={g} now={updatedAt} /></div>
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                  <div className="min-w-0 space-y-0.5">
                    {([{ name: g.away, score: g.awayScore, held: g.bet.side === "away" }, { name: g.home, score: g.homeScore, held: g.bet.side === "home" }]).map(t => <div key={t.name} className={`flex items-center justify-between gap-2 text-sm ${t.held ? "font-semibold text-foreground" : "text-muted-foreground"}`}><span className="truncate">{t.held && <span className="mr-1.5 text-[hsl(var(--primary-readable))]" aria-label="Held side">●</span>}{t.name}</span><span className="font-mono tabular">{t.score}</span></div>)}
                  </div>
                  <div className="w-[92px] text-right"><p className="font-mono text-2xl font-medium leading-none tabular">{g.price}¢</p><p className={`mt-1 font-mono text-xs tabular ${tone(pnlOf(g))}`}>{signedUsd(pnlOf(g))}</p></div>
                </div>
              </button>)}
            </div>
            <p className="mt-4 px-1 text-xs text-muted-foreground">Select any game to make it the main event.</p>
          </aside>
        </div> : <section className="rounded-lg bg-card px-8 py-20 text-center"><h2 className="font-display text-3xl">Nothing on the board</h2><button className={`${control} mt-5 bg-primary text-primary-foreground`} onClick={() => setHidden([])}>Show all bets</button></section>}

        {settings && <div className="fixed inset-0 z-50 flex justify-end bg-background/90" onClick={() => setSettings(false)}>
          <section role="dialog" aria-modal="true" aria-labelledby="main-event-settings" className="h-full w-full max-w-md overflow-y-auto border-l border-border bg-card p-6" onClick={e => e.stopPropagation()}>
            <header className="flex items-center justify-between"><h2 id="main-event-settings" className="font-display text-2xl font-semibold">Your board</h2><button autoFocus aria-label="Close customization" onClick={() => setSettings(false)} className={control}><X size={20} /></button></header>
            <h3 className="mb-3 mt-8 font-medium">Let the main event follow</h3>
            <div className="flex gap-2">{(["stake", "movement"] as const).map(m => <button key={m} aria-pressed={mode === m && !locked} onClick={() => { setMode(m); setLocked(null); }} className={`${control} ${mode === m && !locked ? "bg-primary text-primary-foreground" : "bg-muted"}`}>{m === "stake" ? "Highest stake" : "Biggest move"}</button>)}</div>
            <h3 className="mb-3 mt-7 font-medium">Make this the big number</h3>
            <div className="flex gap-2">{(["price", "pnl"] as const).map(e => <button key={e} aria-pressed={emphasis === e} onClick={() => setEmphasis(e)} className={`${control} ${emphasis === e ? "bg-primary text-primary-foreground" : "bg-muted"}`}>{e === "price" ? "Market price" : "Profit / loss"}</button>)}</div>
            <h3 className="mb-4 mt-8 font-medium">Bets on the board</h3>
            <div className="space-y-4">{games.map(g => <label key={g.id} className="flex cursor-pointer items-center justify-between gap-3 text-sm"><span><span className="block font-medium">{heldTeam(g)} to win</span><span className="text-xs text-muted-foreground">{g.away} at {g.home}</span></span><input type="checkbox" className="h-4 w-4 accent-[hsl(var(--primary))]" checked={!hidden.includes(g.id)} onChange={() => { setHidden(ids => ids.includes(g.id) ? ids.filter(id => id !== g.id) : [...ids, g.id]); if (locked === g.id) setLocked(null); }} /></label>)}</div>
            <button className={`${control} mt-8 w-full bg-primary text-primary-foreground`} onClick={() => setSettings(false)}><Check size={16} />Done</button>
            <button className={`${control} mt-2 w-full text-muted-foreground`} onClick={() => { setHidden([]); setLocked(null); setMode("stake"); setEmphasis("price"); }}>Reset board</button>
          </section>
        </div>}
      </div>
    </div>
  );
}
