import "./_group.css";
import "./_compactrace.css";
import { useEffect, useState } from "react";
import { Maximize2, Minimize2, SlidersHorizontal, X } from "lucide-react";
import { useSweatBoard, IS_SAMPLE_DATA, heldTeam, contracts, valueOf, pnlOf, type LiveGame } from "./_data";
import { usd, signedUsd, tone } from "./_fmt";

const control = "inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";
const teamColors: Record<string, string> = {
  Celtics: "#74a77b", Bucks: "#6c9c7b", Suns: "#cf8b68", Nuggets: "#7291be",
  Knicks: "#7195c8", Heat: "#ba6472", Bills: "#6f8fbe", Chiefs: "#bc6870",
  Seahawks: "#739d8b", "49ers": "#bd8176", Canucks: "#6f9b96", Oilers: "#c98f68",
  Bruins: "#c4a85e", Rangers: "#7a8fbd", "North Carolina": "#789cc6", Duke: "#8795be",
  Alabama: "#ba6d79", Georgia: "#b87a83",
};

function initials(team: string) {
  const words = team.replace(/[^A-Za-z0-9 ]/g, "").split(/\s+/).filter(Boolean);
  return (words.length > 1 ? words.map(word => word[0]).join("") : words[0]?.slice(0, 3) ?? "—").toUpperCase();
}

function TeamMark({ team }: { team: string }) {
  const color = teamColors[team] ?? "#8c91a8";
  return <span className="race-team-mark" style={{ color, backgroundColor: `${color}22`, border: `1px solid ${color}44` }} aria-hidden="true">{initials(team)}</span>;
}

function RaceCard({ game, featured, onSelect }: { game: LiveGame; featured: boolean; onSelect: () => void }) {
  const held = game.bet.side === "home" ? game.home : game.away;
  const currentValue = valueOf(game);
  return (
    <article
      className={`race-tile rounded-xl p-4 ${featured ? "is-featured" : ""}`}
      aria-label={`${game.away} at ${game.home}, holding ${held}, ${game.price}% chance`}
      aria-current={featured ? "true" : undefined}
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect(); } }}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-2 text-[11px] font-medium text-muted-foreground">
          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${game.final ? "bg-muted-foreground" : "live-dot bg-[hsl(var(--primary-readable))]"}`} />
          <span>{game.league}</span><span className="text-foreground/25">/</span>
          <span className="font-mono tabular">{game.period}{game.clock ? ` · ${game.clock}` : ""}</span>
        </span>
        {featured && <span className="rounded-full border border-primary/35 px-2 py-1 text-[10px] text-primary-readable">In focus</span>}
      </div>

      <div className={`mt-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 ${featured ? "gap-y-3" : "gap-y-2"}`}>
        <div className="flex min-w-0 items-center gap-2.5">
          <TeamMark team={game.away} />
          <span className={`truncate ${game.bet.side === "away" ? "font-semibold text-foreground" : "text-muted-foreground"}`}>{game.away}</span>
          {game.bet.side === "away" && <span className="shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-primary-readable" style={{ backgroundColor: "hsl(var(--primary) / .15)" }}>Held</span>}
        </div>
        <span className={`font-mono tabular ${featured ? "text-xl" : "text-lg"} ${game.bet.side === "away" ? "font-semibold" : "text-muted-foreground"}`}>{game.awayScore}</span>
        <div className="flex min-w-0 items-center gap-2.5">
          <TeamMark team={game.home} />
          <span className={`truncate ${game.bet.side === "home" ? "font-semibold text-foreground" : "text-muted-foreground"}`}>{game.home}</span>
          {game.bet.side === "home" && <span className="shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-primary-readable" style={{ backgroundColor: "hsl(var(--primary) / .15)" }}>Held</span>}
        </div>
        <span className={`font-mono tabular ${featured ? "text-xl" : "text-lg"} ${game.bet.side === "home" ? "font-semibold" : "text-muted-foreground"}`}>{game.homeScore}</span>
      </div>

      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="text-[11px] text-muted-foreground">Chance to pay</span>
          <span className="rounded-full border border-border bg-background/60 px-2.5 py-1 font-mono text-xs font-semibold tabular">
            {game.price}<span className="ml-0.5 text-[10px] font-normal text-muted-foreground">%</span>
          </span>
        </div>
        <div className="race-meter relative h-[5px] rounded-full" role="meter" aria-label={`${held} chance to pay`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={game.price}>
          <div className="race-meter-fill absolute inset-0 rounded-full" style={{ backgroundColor: "hsl(var(--primary-readable))", transform: `scaleX(${game.price / 100})` }} />
          <span className="race-entry" style={{ left: `calc(${game.bet.entryCents}% - 1px)` }} title={`Entered at ${game.bet.entryCents} cents`} />
        </div>
        <div className="mt-1.5 flex justify-between text-[10px] text-muted-foreground">
          <span>0</span><span className="font-mono tabular">Entry {game.bet.entryCents}¢</span><span>100</span>
        </div>
      </div>

      <div className="mt-4 flex items-end justify-between gap-3 border-t border-border/70 pt-3">
        <div className="min-w-0">
          <p className="text-[10px] text-muted-foreground">Payout if won</p>
          <p className={`mt-0.5 font-mono font-semibold tabular ${featured ? "text-xl" : "text-lg"}`}>{usd(contracts(game.bet))}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-muted-foreground">Now {usd(currentValue)}</p>
          <p className={`mt-0.5 font-mono text-sm font-medium tabular ${tone(pnlOf(game))}`}>{signedUsd(pnlOf(game))} <span className="text-[10px] font-normal text-muted-foreground">P/L</span></p>
        </div>
      </div>
    </article>
  );
}

export function CompactRace() {
  const snap = useSweatBoard();
  const [editing, setEditing] = useState(false);
  const [screen, setScreen] = useState(false);
  const [hidden, setHidden] = useState<string[]>([]);
  const [sort, setSort] = useState("payout");
  const [priority, setPriority] = useState("");

  useEffect(() => {
    const fs = () => { if (!document.fullscreenElement) setScreen(false); };
    const key = (event: KeyboardEvent) => { if (event.key === "Escape") { setScreen(false); setEditing(false); } };
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

  const games = snap.games.filter(game => !hidden.includes(game.id)).sort((a, b) => {
    if (a.id === priority) return -1;
    if (b.id === priority) return 1;
    return sort === "chance" ? b.price - a.price : sort === "risk" ? b.bet.stake - a.bet.stake : contracts(b.bet) - contracts(a.bet);
  });
  const totalPayout = games.reduce((sum, game) => sum + contracts(game.bet), 0);
  const totalStake = games.reduce((sum, game) => sum + game.bet.stake, 0);

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
    <div className="ss-root ss-compact-race">
      <main className={screen ? "fixed inset-0 z-50 overflow-y-auto bg-background px-4 py-5 sm:px-8" : "mx-auto max-w-[1320px] px-4 py-5 sm:px-8 sm:py-7"}>
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h1 className="font-display text-2xl font-semibold sm:text-[27px]">Sweat Station<span className="ml-2 hidden font-normal text-muted-foreground sm:inline">/ Payout race</span></h1>
            {IS_SAMPLE_DATA && <span className="text-[11px] text-muted-foreground">Sample data</span>}
          </div>
          <div className="flex items-center gap-1.5">
            {!screen && <button className={`${control} text-muted-foreground hover:text-foreground`} onClick={() => setEditing(value => !value)} aria-expanded={editing}><SlidersHorizontal size={15} />Customize</button>}
            <button className={`${control} bg-primary text-primary-foreground`} onClick={toggleScreen}>{screen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}{screen ? "Exit second screen" : "Second screen"}</button>
          </div>
        </header>

        <section aria-label="Payout summary" className="mt-6 flex flex-wrap items-end justify-between gap-x-8 gap-y-3 border-b border-border/70 pb-5">
          <div className="flex items-baseline gap-3">
            <span className="text-sm text-muted-foreground">If all held sides win</span>
            <span className="font-mono text-2xl font-semibold tracking-tight tabular sm:text-3xl">{usd(totalPayout)}</span>
          </div>
          <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1 text-xs text-muted-foreground">
            <span>{games.length} {games.length === 1 ? "position" : "positions"}</span>
            <span>{usd(totalStake)} staked</span>
          </div>
        </section>

        {editing && <section aria-label="Customize board" className="race-tile my-5 rounded-xl p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between"><h2 className="font-display text-lg font-semibold">Board setup</h2><button className={`${control} px-2 text-muted-foreground`} onClick={() => setEditing(false)} aria-label="Close customization"><X size={17} /></button></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-xs text-muted-foreground">Sort positions
              <select value={sort} onChange={event => setSort(event.target.value)} className="mt-2 block w-full rounded-md border border-border bg-background p-2.5 text-sm text-foreground">
                <option value="payout">Payout size</option><option value="chance">Closest to paid</option><option value="risk">Stake size</option>
              </select>
            </label>
            <label className="text-xs text-muted-foreground">Keep in focus
              <select value={priority} onChange={event => setPriority(event.target.value)} className="mt-2 block w-full rounded-md border border-border bg-background p-2.5 text-sm text-foreground">
                <option value="">Follow sort order</option>{snap.games.map(game => <option key={game.id} value={game.id}>{heldTeam(game)} · {game.league}</option>)}
              </select>
            </label>
          </div>
          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-3">
            {snap.games.map(game => <label key={game.id} className="flex items-center gap-2 text-sm"><input className="accent-[hsl(var(--primary))]" type="checkbox" checked={!hidden.includes(game.id)} onChange={() => setHidden(old => old.includes(game.id) ? old.filter(id => id !== game.id) : [...old, game.id])} />{heldTeam(game)}</label>)}
          </div>
          <button className="mt-5 text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground" onClick={() => { setHidden([]); setPriority(""); setSort("payout"); }}>Reset board</button>
        </section>}

        <section aria-label="Live bet payout board" className="mt-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="font-display text-lg font-medium">Your games</h2>
            <span className="flex items-center gap-2 text-[10px] text-muted-foreground"><span className="inline-block h-3 w-[2px] rounded bg-foreground/80" />Entry point</span>
          </div>
          {games.length > 0 ? <>
            <div className="mb-3">
              <RaceCard game={games[0]} featured onSelect={() => setPriority(games[0].id === priority ? "" : games[0].id)} />
            </div>
            {games.length > 1 && <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {games.slice(1).map(game => <RaceCard key={game.id} game={game} featured={false} onSelect={() => setPriority(game.id === priority ? "" : game.id)} />)}
            </div>}
          </> : <div className="race-tile rounded-xl px-5 py-12 text-center">
            <h3 className="font-display text-xl font-semibold">No positions on the board</h3>
            <button className={`${control} mt-4 bg-primary text-primary-foreground`} onClick={() => setHidden([])}>Show every position</button>
          </div>}
        </section>
        <footer className="mt-5 flex flex-wrap justify-between gap-x-4 gap-y-2 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-primary-readable" />Live board · read only</span>
          <span>Payout includes stake. Each winning contract pays $1.</span>
        </footer>
      </main>
    </div>
  );
}
