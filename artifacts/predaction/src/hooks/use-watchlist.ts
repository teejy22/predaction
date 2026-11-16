import { useCallback, useEffect, useState } from "react";

const KEY = "predaction.watchlist.v1";
const EVT = "predaction-watchlist";

export type WatchItem = { ticker: string; title: string; sport: string; league: string; addedAt: string };

function read(): WatchItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    const v = raw ? JSON.parse(raw) : [];
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export function useWatchlist() {
  const [items, setItems] = useState<WatchItem[]>(() => read());

  useEffect(() => {
    const sync = () => setItems(read());
    window.addEventListener(EVT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const write = useCallback((next: WatchItem[]) => {
    localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(EVT));
  }, []);

  const has = useCallback((t: string) => items.some((i) => i.ticker === t), [items]);

  const toggle = useCallback(
    (e: Omit<WatchItem, "addedAt">) => {
      const cur = read();
      if (cur.some((i) => i.ticker === e.ticker)) {
        write(cur.filter((i) => i.ticker !== e.ticker));
        return false;
      }
      write([{ ...e, addedAt: new Date().toISOString() }, ...cur]);
      return true;
    },
    [write],
  );

  const remove = useCallback((t: string) => write(read().filter((i) => i.ticker !== t)), [write]);
  const clear = useCallback(() => write([]), [write]);

  return { items, has, toggle, remove, clear };
}
