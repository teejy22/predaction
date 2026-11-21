import { useSyncExternalStore } from "react";

// Plain typed objects the UI consumes. A real source only needs to implement BoardSource.
export type League = "NBA" | "NFL" | "NHL" | "NCAAB" | "NCAAF";
export interface Bet { id: string; side: "home" | "away"; stake: number; entryCents: number }
export interface LiveGame {
  id: string; league: League; home: string; away: string;
  homeScore: number; awayScore: number; period: string; clock: string; final: boolean;
  bet: Bet;
  price: number; // current cents for the held side
  history: number[];
  move: number; // last tick change in cents
  swingAt: number; // timestamp of last sharp move, 0 if none
  swingSize: number;
  leadChangeAt: number;
}
export interface BoardSnapshot { games: LiveGame[]; updatedAt: number }
export interface BoardSource { subscribe(cb: () => void): () => void; getSnapshot(): BoardSnapshot }

export const contracts = (b: Bet) => b.stake / (b.entryCents / 100);
export const valueOf = (g: LiveGame) => contracts(g.bet) * (g.price / 100);
export const pnlOf = (g: LiveGame) => valueOf(g) - g.bet.stake;
export const heldTeam = (g: LiveGame) => (g.bet.side === "home" ? g.home : g.away);

type Seed = Omit<LiveGame, "history" | "move" | "swingAt" | "swingSize" | "leadChangeAt" | "clock" | "period" | "final"> & { secs: number; per: number };
const SEEDS: Seed[] = [
  { id: "nba-bos-mil", league: "NBA", home: "Celtics", away: "Bucks", homeScore: 58, awayScore: 61, secs: 412, per: 3, price: 54, bet: { id: "b1", side: "home", stake: 120, entryCents: 61 } },
  { id: "nba-den-phx", league: "NBA", home: "Suns", away: "Nuggets", homeScore: 44, awayScore: 39, secs: 205, per: 2, price: 41, bet: { id: "b2", side: "away", stake: 75, entryCents: 47 } },
  { id: "nba-nyk-mia", league: "NBA", home: "Knicks", away: "Heat", homeScore: 88, awayScore: 84, secs: 318, per: 4, price: 71, bet: { id: "b3", side: "home", stake: 200, entryCents: 58 } },
  { id: "nfl-kc-buf", league: "NFL", home: "Bills", away: "Chiefs", homeScore: 17, awayScore: 20, secs: 640, per: 3, price: 39, bet: { id: "b4", side: "home", stake: 250, entryCents: 44 } },
  { id: "nfl-sf-sea", league: "NFL", home: "Seahawks", away: "49ers", homeScore: 10, awayScore: 13, secs: 122, per: 2, price: 63, bet: { id: "b5", side: "away", stake: 90, entryCents: 66 } },
  { id: "nhl-edm-van", league: "NHL", home: "Canucks", away: "Oilers", homeScore: 2, awayScore: 2, secs: 734, per: 2, price: 52, bet: { id: "b6", side: "away", stake: 60, entryCents: 49 } },
  { id: "nhl-nyr-bos", league: "NHL", home: "Bruins", away: "Rangers", homeScore: 1, awayScore: 0, secs: 980, per: 1, price: 57, bet: { id: "b7", side: "home", stake: 45, entryCents: 53 } },
  { id: "ncaab-duke-unc", league: "NCAAB", home: "North Carolina", away: "Duke", homeScore: 31, awayScore: 35, secs: 95, per: 1, price: 58, bet: { id: "b8", side: "away", stake: 110, entryCents: 52 } },
  { id: "ncaaf-uga-bama", league: "NCAAF", home: "Alabama", away: "Georgia", homeScore: 21, awayScore: 24, secs: 401, per: 4, price: 68, bet: { id: "b9", side: "away", stake: 150, entryCents: 57 } },
];

const PER_LEN: Record<League, number> = { NBA: 720, NFL: 900, NHL: 1200, NCAAB: 1200, NCAAF: 900 };
const PER_MAX: Record<League, number> = { NBA: 4, NFL: 4, NHL: 3, NCAAB: 2, NCAAF: 4 };
const perLabel = (l: League, p: number) => (l === "NHL" ? `P${p}` : l === "NCAAB" ? `H${p}` : `Q${p}`);
const fmtClock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
const clamp = (n: number) => Math.max(1, Math.min(99, n));
const HISTORY = 90;

type Sim = { secs: number; per: number };
const sims = new Map<string, Sim>();

function init(): BoardSnapshot {
  const games = SEEDS.map(({ secs, per, ...s }) => {
    sims.set(s.id, { secs, per });
    const history: number[] = [];
    let p = s.bet.entryCents;
    for (let i = 0; i < HISTORY - 1; i++) { p = clamp(p + (s.price - p) * 0.06 + (Math.random() - 0.5) * 3); history.push(Math.round(p)); }
    history.push(s.price);
    return { ...s, history, move: 0, swingAt: 0, swingSize: 0, leadChangeAt: 0, period: perLabel(s.league, per), clock: fmtClock(secs), final: false };
  });
  return { games, updatedAt: Date.now() };
}

function step(g: LiveGame, now: number): LiveGame {
  if (g.final) return g;
  const sim = sims.get(g.id)!;
  sim.secs -= 6 + Math.floor(Math.random() * 14);
  let per = sim.per, final = false;
  if (sim.secs <= 0) {
    if (per >= PER_MAX[g.league] && g.homeScore !== g.awayScore) { final = true; sim.secs = 0; }
    else { per += 1; sim.secs = PER_LEN[g.league]; }
  }
  sim.per = per;
  const pts = g.league === "NBA" || g.league === "NCAAB" ? [2, 2, 3, 1] : g.league === "NHL" ? [1] : [3, 7, 7];
  const odds = g.league === "NHL" ? 0.02 : g.league === "NFL" || g.league === "NCAAF" ? 0.04 : 0.35;
  let { homeScore, awayScore } = g;
  const leadBefore = Math.sign(homeScore - awayScore);
  let scoreDelta = 0;
  if (!final && Math.random() < odds) {
    const p = pts[Math.floor(Math.random() * pts.length)]!;
    if (Math.random() < 0.5) { homeScore += p; scoreDelta = p; } else { awayScore += p; scoreDelta = -p; }
  }
  const leadAfter = Math.sign(homeScore - awayScore);
  const mine = g.bet.side === "home" ? 1 : -1;
  let delta = (Math.random() - 0.5) * 2.4 + scoreDelta * mine * (g.league === "NHL" ? 9 : g.league.startsWith("N") && pts[0] === 3 ? 2.2 : 0.9);
  if (Math.random() < 0.025) delta += (Math.random() < 0.5 ? -1 : 1) * (8 + Math.random() * 9);
  let price = Math.round(clamp(g.price + delta));
  if (final) price = (homeScore - awayScore) * mine > 0 ? 99 : 1;
  const history = [...g.history.slice(-(HISTORY - 1)), price];
  const ref = history[Math.max(0, history.length - 6)]!;
  const sharp = Math.abs(price - ref) >= 8 && Math.abs(price - g.price) >= 4;
  return {
    ...g, homeScore, awayScore, price, history, move: price - g.price, final,
    period: final ? "Final" : perLabel(g.league, per), clock: final ? "" : fmtClock(Math.max(0, sim.secs)),
    swingAt: sharp ? now : g.swingAt, swingSize: sharp ? price - ref : g.swingSize,
    leadChangeAt: leadBefore !== 0 && leadAfter !== 0 && leadBefore !== leadAfter ? now : g.leadChangeAt,
  };
}

function createSimulator(intervalMs = 1600): BoardSource {
  let snap = init();
  const subs = new Set<() => void>();
  let timer: ReturnType<typeof setInterval> | undefined;
  const tick = () => {
    const now = Date.now();
    snap = { games: snap.games.map((g) => (Math.random() < 0.7 ? step(g, now) : { ...g, move: 0 })), updatedAt: now };
    subs.forEach((cb) => cb());
  };
  return {
    subscribe(cb) {
      subs.add(cb);
      if (!timer) timer = setInterval(tick, intervalMs);
      return () => { subs.delete(cb); if (!subs.size && timer) { clearInterval(timer); timer = undefined; } };
    },
    getSnapshot: () => snap,
  };
}

// Swap this for a real feed later; the UI only touches useSweatBoard.
export const boardSource: BoardSource = createSimulator();
export const IS_SAMPLE_DATA = true;

export function useSweatBoard(source: BoardSource = boardSource) {
  return useSyncExternalStore(source.subscribe, source.getSnapshot);
}
