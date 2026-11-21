import { useCallback, useEffect, useState } from "react";

export type PanelSize = "dense" | "regular" | "large";
export interface PanelFields { chart: boolean; score: boolean; position: boolean }
export interface SweatPrefs { order: string[]; hidden: string[]; pinned: string | null; size: PanelSize; fields: PanelFields }

const KEY = "sweat-station:prefs:v1";
const DEFAULTS: SweatPrefs = { order: [], hidden: [], pinned: null, size: "regular", fields: { chart: true, score: true, position: true } };

function load(): SweatPrefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    const p = JSON.parse(raw) as Partial<SweatPrefs>;
    return { ...DEFAULTS, ...p, fields: { ...DEFAULTS.fields, ...p.fields } };
  } catch { return DEFAULTS; }
}

export function useSweatPrefs(ids: string[]) {
  const [prefs, setPrefs] = useState<SweatPrefs>(load);
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch { /* storage unavailable */ } }, [prefs]);
  const idKey = ids.join("|");
  // Order always contains every known id: saved order first, new bets appended.
  const order = [...prefs.order.filter((id) => ids.includes(id)), ...ids.filter((id) => !prefs.order.includes(id))];
  const update = useCallback((fn: (p: SweatPrefs) => SweatPrefs) => setPrefs(fn), []);
  const move = useCallback((id: string, dir: -1 | 1) => setPrefs((p) => {
    const all = idKey.split("|");
    const o = [...p.order.filter((x) => all.includes(x)), ...all.filter((x) => !p.order.includes(x))];
    const i = o.indexOf(id), j = i + dir;
    if (i < 0 || j < 0 || j >= o.length) return p;
    [o[i], o[j]] = [o[j]!, o[i]!];
    return { ...p, order: o };
  }), [idKey]);
  const toggleHidden = useCallback((id: string) => setPrefs((p) => ({ ...p, hidden: p.hidden.includes(id) ? p.hidden.filter((x) => x !== id) : [...p.hidden, id] })), []);
  const togglePin = useCallback((id: string) => setPrefs((p) => ({ ...p, pinned: p.pinned === id ? null : id, hidden: p.hidden.filter((x) => x !== id) })), []);
  const reset = useCallback(() => setPrefs(DEFAULTS), []);
  return { prefs, order, update, move, toggleHidden, togglePin, reset };
}
