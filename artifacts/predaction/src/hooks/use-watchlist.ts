import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";

// Storage key kept from the original release so saved events survive the rebrand.
const KEY = "predaction.watchlist.v1";
const EVT = "predaction-watchlist";

export type WatchItem = {
  ticker: string;
  title: string;
  category?: string;
  sport: string;
  league: string;
  addedAt: string;
};

function normalize(v: unknown): WatchItem | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  if (typeof o.ticker !== "string" || !o.ticker) return null;
  const sport = typeof o.sport === "string" ? o.sport : "";
  return {
    ticker: o.ticker,
    title: typeof o.title === "string" && o.title ? o.title : o.ticker,
    // Legacy items predate categories; they were all sports events.
    category: typeof o.category === "string" && o.category ? o.category : sport ? "Sports" : undefined,
    sport,
    league: typeof o.league === "string" ? o.league : "",
    addedAt: typeof o.addedAt === "string" ? o.addedAt : new Date(0).toISOString(),
  };
}

function read(): WatchItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    const v = raw ? JSON.parse(raw) : [];
    return Array.isArray(v) ? v.map(normalize).filter((x): x is WatchItem => !!x) : [];
  } catch {
    return [];
  }
}

export function useWatchlist() {
  const { toast } = useToast();
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
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      toast({
        title: "Watchlist wasn't saved",
        description: "Browser storage is unavailable or full. Your previous saved events were not changed.",
        variant: "destructive",
      });
      return false;
    }
    window.dispatchEvent(new Event(EVT));
    return true;
  }, [toast]);

  const has = useCallback((t: string) => items.some((i) => i.ticker === t), [items]);

  const toggle = useCallback(
    (e: Omit<WatchItem, "addedAt">) => {
      const cur = read();
      if (cur.some((i) => i.ticker === e.ticker)) {
        return write(cur.filter((i) => i.ticker !== e.ticker)) ? false : null;
      }
      return write([{ ...e, addedAt: new Date().toISOString() }, ...cur]) ? true : null;
    },
    [write],
  );

  const remove = useCallback((t: string) => write(read().filter((i) => i.ticker !== t)), [write]);
  const clear = useCallback(() => write([]), [write]);

  return { items, has, toggle, remove, clear };
}
