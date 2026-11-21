import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "framer-motion";
import { Maximize2, Minimize2, SlidersHorizontal } from "lucide-react";
import { IS_SAMPLE_DATA, useSweatBoard } from "@/lib/sweat-data";
import { useSweatPrefs } from "@/lib/sweat-prefs";
import { usePageMeta } from "@/lib/meta";
import { GamePanel } from "@/components/sweat-station/game-panel";
import { NightSummary } from "@/components/sweat-station/night-summary";
import { BoardSettings } from "@/components/sweat-station/board-settings";

const GRID = { dense: "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4", regular: "sm:grid-cols-2 lg:grid-cols-3", large: "lg:grid-cols-2" } as const;

export default function SweatStationPage() {
  usePageMeta("Sweat Station | Prediction Pro", "Watch the live odds on every bet you hold, several games at once.");
  const snap = useSweatBoard();
  const reduce = useReducedMotion();
  const ids = useMemo(() => snap.games.map((g) => g.id), [snap.games]);
  const byId = useMemo(() => new Map(snap.games.map((g) => [g.id, g])), [snap.games]);
  const { prefs, order, update, move, toggleHidden, togglePin, reset } = useSweatPrefs(ids);
  const [editing, setEditing] = useState(false);
  const [screen, setScreen] = useState(false);

  const enter = useCallback(() => {
    setScreen(true);
    document.documentElement.requestFullscreen?.().catch(() => { /* fallback: fixed overlay only */ });
  }, []);
  const exit = useCallback(() => {
    setScreen(false);
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => undefined);
  }, []);
  useEffect(() => {
    const onFs = () => { if (!document.fullscreenElement) setScreen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setScreen(false); };
    document.addEventListener("fullscreenchange", onFs);
    window.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("fullscreenchange", onFs); window.removeEventListener("keydown", onKey); };
  }, []);
  useEffect(() => {
    if (!screen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [screen]);

  const visible = order.filter((id) => !prefs.hidden.includes(id) && byId.has(id));
  const shown = prefs.pinned && visible.includes(prefs.pinned) ? [prefs.pinned, ...visible.filter((id) => id !== prefs.pinned)] : visible;
  const onBoard = shown.map((id) => byId.get(id)!);
  const spring = reduce ? { duration: 0 } : { type: "spring" as const, stiffness: 380, damping: 34 };

  const btn = "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";

  return (
    <motion.div
      key={screen ? "screen" : "page"}
      initial={reduce ? false : { opacity: 0, scale: 0.985 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
      className={screen ? "fixed inset-0 z-50 overflow-y-auto bg-background px-3 py-3 sm:px-5 sm:py-4" : "mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8"}
      data-testid="page-sweat-station"
    >
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <h1 className={`font-display font-bold tracking-tight ${screen ? "text-xl" : "text-3xl sm:text-4xl"}`}>Sweat Station</h1>
          {IS_SAMPLE_DATA && <span className="rounded bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground" data-testid="status-sample-data">Sample data</span>}
        </div>
        <div className="flex items-center gap-1.5">
          {!screen && <button type="button" onClick={() => setEditing((v) => !v)} aria-expanded={editing} className={`${btn} ${editing ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"}`} data-testid="button-customize"><SlidersHorizontal className="h-4 w-4" />Customize</button>}
          {screen
            ? <button type="button" onClick={exit} className={`${btn} text-muted-foreground hover:text-foreground`} data-testid="button-exit-second-screen"><Minimize2 className="h-4 w-4" />Exit</button>
            : <button type="button" onClick={enter} className={`${btn} bg-primary text-primary-foreground`} data-testid="button-second-screen"><Maximize2 className="h-4 w-4" />Second screen</button>}
        </div>
      </header>

      <div className={screen ? "mt-3" : "mt-6"}><NightSummary games={onBoard} /></div>

      {editing && !screen && (
        <div className="mt-6">
          <BoardSettings
            games={byId} order={order} prefs={prefs}
            setSize={(size) => update((p) => ({ ...p, size }))}
            setField={(k, v) => update((p) => ({ ...p, fields: { ...p.fields, [k]: v } }))}
            move={move} toggleHidden={toggleHidden} togglePin={togglePin} reset={reset}
          />
        </div>
      )}

      {onBoard.length ? (
        <LayoutGroup>
          <div className={`grid grid-cols-1 gap-3 sm:gap-4 ${screen ? "mt-4" : "mt-8"} ${GRID[prefs.size]}`}>
            <AnimatePresence initial={false}>
              {onBoard.map((g) => {
                const pinned = prefs.pinned === g.id;
                return (
                  <motion.div
                    key={g.id} layout={!reduce}
                    initial={reduce ? false : { opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={reduce ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, scale: 0.96 }}
                    transition={spring}
                    className={pinned ? "sm:col-span-2 lg:row-span-2" : ""}
                  >
                    <GamePanel g={g} fields={prefs.fields} pinned={pinned} big={pinned || prefs.size === "large"} now={snap.updatedAt} onPin={() => togglePin(g.id)} />
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </LayoutGroup>
      ) : (
        <div className="mt-10 rounded-xl bg-card px-6 py-14 text-center">
          <p className="font-display text-2xl font-bold">The board is empty</p>
          <button type="button" onClick={() => { setEditing(true); update((p) => ({ ...p, hidden: [] })); }} className={`${btn} mt-4 bg-primary text-primary-foreground`} data-testid="button-show-all">Put every bet back</button>
        </div>
      )}
    </motion.div>
  );
}
