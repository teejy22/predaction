import "./_group.css";
import "./_tape.css";
import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Maximize2, Minimize2, SlidersHorizontal, X } from "lucide-react";
import { useSweatBoard, IS_SAMPLE_DATA, heldTeam, contracts, valueOf, pnlOf, type LiveGame } from "./_data";
import { usd, signedUsd, tone } from "./_fmt";

type Rank = "action" | "exposure" | "pnl" | "closing";
const rankLabels: Record<Rank, string> = { action: "Live action", exposure: "Money at risk", pnl: "Profit / loss", closing: "Closest to final" };
const recent = (at: number, now: number) => at > 0 && now - at < 10000;
function action(g: LiveGame, now: number) {
  return (recent(g.swingAt, now) ? 100 + Math.abs(g.swingSize) : 0) + (recent(g.leadChangeAt, now) ? 75 : 0) + Math.abs(g.move) * 5;
}
function Trace({ g }: { g: LiveGame }) {
  const min = Math.min(...g.history, g.bet.entryCents) - 3;
  const max = Math.max(...g.history, g.bet.entryCents) + 3;
  const y = (n: number) => 30 - (n - min) / (max - min) * 26;
  const path = g.history.map((p, i) => `${i / (g.history.length - 1) * 120},${y(p)}`).join(" ");
  return <svg viewBox="0 0 124 34" className="w-full" role="img" aria-label={`${heldTeam(g)} price history; entry ${g.bet.entryCents} cents`}>
    <line x1="0" x2="120" y1={y(g.bet.entryCents)} y2={y(g.bet.entryCents)} stroke="hsl(var(--muted-foreground))" strokeDasharray="2 4" opacity=".4" />
    <polyline points={path} fill="none" stroke="currentColor" strokeWidth="1.8" className={tone(g.price - g.bet.entryCents)} />
    <circle cx="120" cy={y(g.price)} r="2" fill="currentColor" className={tone(g.price - g.bet.entryCents)} />
  </svg>;
}

export function Tape() {
  const snap = useSweatBoard();
  const reduce = useReducedMotion();
  const [rank, setRank] = useState<Rank>("action");
  const [hidden, setHidden] = useState<string[]>([]);
  const [editing, setEditing] = useState(false);
  const [screen, setScreen] = useState(false);
  const [emphasis, setEmphasis] = useState<"price" | "pnl">("price");
  const [traces, setTraces] = useState(true);
  const visible = snap.games.filter(g => !hidden.includes(g.id)).sort((a, b) => {
    if (rank === "exposure") return b.bet.stake - a.bet.stake;
    if (rank === "pnl") return pnlOf(b) - pnlOf(a);
    if (rank === "closing") {
      const remaining = (g: LiveGame) => g.final ? 99999 : ((g.league === "NHL" ? 3 : g.league === "NCAAB" ? 2 : 4) - Number(g.period.slice(1))) * 1200 + Number(g.clock.split(":")[0]) * 60 + Number(g.clock.split(":")[1]);
      return remaining(a) - remaining(b);
    }
    return action(b, snap.updatedAt) - action(a, snap.updatedAt) || b.bet.stake - a.bet.stake;
  });
  const risk = visible.reduce((sum, g) => sum + g.bet.stake, 0);
  const worth = visible.reduce((sum, g) => sum + valueOf(g), 0);
  const active = visible.filter(g => recent(g.swingAt, snap.updatedAt) || recent(g.leadChangeAt, snap.updatedAt)).length;
  useEffect(() => {
    const change = () => { if (!document.fullscreenElement) setScreen(false); };
    const key = (event: KeyboardEvent) => { if (event.key === "Escape") { setScreen(false); setEditing(false); } };
    document.addEventListener("fullscreenchange", change);
    window.addEventListener("keydown", key);
    return () => { document.removeEventListener("fullscreenchange", change); window.removeEventListener("keydown", key); };
  }, []);
  const toggleScreen = () => {
    if (screen) { setScreen(false); if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined); }
    else { setScreen(true); setEditing(false); void document.documentElement.requestFullscreen?.().catch(() => undefined); }
  };
  return <div className="ss-root tape-root">
    <main className={screen ? "fixed inset-0 z-50 overflow-auto bg-background px-3 py-5 sm:px-7" : "mx-auto max-w-[1500px] px-3 pb-8 pt-6 sm:px-7 sm:pt-8"}>
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-baseline gap-4"><h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Sweat Station</h1>{IS_SAMPLE_DATA && <span className="text-xs text-muted-foreground">Sample data</span>}</div>
        <div className="flex gap-2">
          <button onClick={() => setEditing(!editing)} aria-expanded={editing} className="tape-button text-muted-foreground hover:bg-card hover:text-foreground"><SlidersHorizontal size={15} />Customize</button>
          <button onClick={toggleScreen} className="tape-button bg-primary text-primary-foreground">{screen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}{screen ? "Exit second screen" : "Second screen"}</button>
        </div>
      </header>

      <section aria-label="Night summary" className="mb-8 mt-9 grid grid-cols-2 items-end gap-x-8 gap-y-5 sm:flex sm:gap-12 lg:gap-16">
        <div className="col-span-2 sm:mr-auto"><p className="mb-1 text-sm text-muted-foreground">Tonight's profit / loss</p><p className={`font-mono text-4xl font-semibold tracking-tighter tabular sm:text-5xl ${tone(worth-risk)}`}>{signedUsd(worth-risk)}</p></div>
        <div><p className="mb-2 text-xs text-muted-foreground">At risk</p><p className="font-mono text-xl tabular">{usd(risk)}</p></div>
        <div><p className="mb-2 text-xs text-muted-foreground">Worth now</p><p className="font-mono text-xl tabular">{usd(worth)}</p></div>
        <div><p className="mb-2 text-xs text-muted-foreground">In profit</p><p className="font-mono text-xl tabular">{visible.filter(g => pnlOf(g) > 0).length}<span className="text-sm text-muted-foreground"> / {visible.length}</span></p></div>
      </section>

      {editing && <section aria-label="Customize board" className="mb-6 bg-card p-5">
        <div className="flex items-center justify-between"><h2 className="font-display text-xl font-semibold">Customize the tape</h2><button aria-label="Close customization" onClick={() => setEditing(false)} className="tape-button"><X size={18} /></button></div>
        <div className="mt-4 flex flex-wrap items-center gap-5 text-sm"><label className="flex items-center gap-3">Emphasize<select className="tape-select" value={emphasis} onChange={e => setEmphasis(e.target.value as "price" | "pnl")}><option value="price">Current price</option><option value="pnl">Profit / loss</option></select></label><label className="flex items-center gap-2"><input type="checkbox" checked={traces} onChange={e => setTraces(e.target.checked)} className="accent-primary" />Price traces</label><button onClick={() => {setHidden([]); setRank("action"); setEmphasis("price"); setTraces(true);}} className="text-muted-foreground underline underline-offset-4">Reset board</button></div>
        <div className="mt-5 flex flex-wrap gap-x-6 gap-y-3">{snap.games.map(g => <label key={g.id} className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-primary" checked={!hidden.includes(g.id)} onChange={() => setHidden(h => h.includes(g.id) ? h.filter(id => id !== g.id) : [...h, g.id])} />{heldTeam(g)}</label>)}</div>
      </section>}

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-sm"><span className="h-2 w-2 rounded-full bg-primary" /><span className="font-semibold">{visible.filter(g => !g.final).length} live positions</span>{active > 0 && <span className="text-primary">{active} moving sharply</span>}</div>
        <label className="flex items-center gap-3 text-xs text-muted-foreground">Rank by<select aria-label="Rank tape by" className="tape-select text-foreground" value={rank} onChange={e => setRank(e.target.value as Rank)}>{Object.entries(rankLabels).map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></label>
      </div>
      <div className="tape-row tape-row-header text-xs text-muted-foreground">
        <span>#</span><span>Game / your side</span><span>Game clock</span><span className="text-right">Price</span><span>Price / entry</span><span className="text-right">Tick</span><span className="text-right">Profit / loss</span><span className="tape-position text-right">Position</span>
      </div>
      <section aria-label="Live positions">
        {visible.map((g, i) => {
          const swing = recent(g.swingAt, snap.updatedAt);
          const lead = recent(g.leadChangeAt, snap.updatedAt);
          const pnl = pnlOf(g);
          return <motion.article layout={reduce ? false : "position"} transition={{duration:.45, ease:[.22,1,.36,1]}} key={g.id} className={`tape-row ${swing || lead ? "tape-event" : ""}`} aria-label={`${heldTeam(g)} position`}>
            <span className={`self-start pt-1 font-mono text-xs tabular md:self-auto md:pt-0 ${swing || lead ? "text-primary" : "text-muted-foreground"}`}>{String(i+1).padStart(2,"0")}</span>
            <div className="tape-market">
              <div className="tape-game text-sm font-semibold sm:text-base"><span className={`tape-game-name ${g.bet.side === "away" ? "" : "text-muted-foreground"}`}>{g.away}</span><span className="font-mono tabular">{g.awayScore}<span className="px-1 text-muted-foreground">:</span>{g.homeScore}</span><span className={`tape-game-name ${g.bet.side === "home" ? "" : "text-muted-foreground"}`}>{g.home}</span></div>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 text-[11px]"><span className="text-primary">{heldTeam(g)} to win</span><span className="tape-mobile-clock font-mono tabular text-muted-foreground">{g.period} {g.clock}</span>{(lead || swing) && <span className={lead ? "font-semibold text-primary" : `font-mono font-semibold ${tone(g.swingSize)}`}>{lead ? "Lead change" : `${g.swingSize > 0 ? "+" : ""}${g.swingSize}¢ swing`}</span>}</div>
            </div>
            <div className="tape-clock"><p className="font-mono text-sm tabular">{g.period} {g.clock}</p><p className="mt-1 text-[10px] text-muted-foreground">{g.league}</p></div>
            <div className="tape-price"><span className={`font-mono font-semibold tracking-tight tabular ${emphasis === "price" ? "text-2xl sm:text-3xl" : "text-xl"}`}>{g.price}<span className="text-base text-muted-foreground">¢</span></span></div>
            <div className="tape-trace">{traces && <Trace g={g} />}</div>
            <div className={`tape-tick text-right font-mono text-sm tabular ${tone(g.move)}`}>{g.move === 0 ? "—" : `${g.move > 0 ? "+" : ""}${g.move}¢`}</div>
            <div className="tape-pnl"><p className={`font-mono font-semibold tabular ${tone(pnl)} ${emphasis === "pnl" ? "text-xl sm:text-2xl" : "text-sm sm:text-lg"}`}>{signedUsd(pnl)}</p><p className={`mt-1 font-mono text-[10px] tabular ${tone(pnl)}`}>{pnl >= 0 ? "+" : ""}{(pnl / g.bet.stake * 100).toFixed(1)}%</p></div>
            <div className="tape-position text-right font-mono text-xs tabular"><p>{usd(g.bet.stake)}</p><p className="mt-1 text-[10px] text-muted-foreground">{Math.round(contracts(g.bet))} @ {g.bet.entryCents}¢</p></div>
          </motion.article>;
        })}
        {!visible.length && <div className="bg-card py-14 text-center"><h2 className="font-display text-2xl">Nothing on your tape</h2><button onClick={() => setHidden([])} className="tape-button mt-4 bg-primary text-primary-foreground">Show all positions</button></div>}
      </section>
      <footer className="mt-5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground"><span>Ranked by {rankLabels[rank].toLowerCase()} · Updates automatically</span><span className="font-mono tabular">1¢ = 1% chance · Winning contracts pay $1</span></footer>
    </main>
  </div>;
}
