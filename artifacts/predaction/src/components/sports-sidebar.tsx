import { ChevronDown } from "lucide-react";
import type { SportCategory } from "@workspace/api-client-react";

export function leagueName(name: string) {
  return name === "NCAAF" ? "College Football" : name === "NCAAB" ? "College Basketball" : name;
}

type Props = {
  sports: SportCategory[];
  sport: string;
  league: string;
  loading: boolean;
  failed: boolean;
  onRetry: () => void;
  onSport: (sport: string) => void;
  onLeague: (sport: string, league: string) => void;
};

const row = (active: boolean) =>
  `flex w-full items-center justify-between gap-2 rounded px-2.5 py-2 text-left text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-background/70 hover:text-foreground"}`;
const slug = (value: string) => value.toLowerCase().replace(/\s+/g, "-");

// One list: the busiest leagues first, then every sport with its leagues nested underneath.
export function SportsSidebar({ sports, sport, league, loading, failed, onRetry, onSport, onLeague }: Props) {
  const popular = sports
    .flatMap((item) => (item.leagueCounts ?? []).map((entry) => ({ ...entry, sport: item.name })))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, 5);

  return (
    <aside className="hidden lg:block" aria-label="Browse sports and leagues">
      <div className="rounded-lg border border-border bg-card/60 p-3">
        {loading ? <div className="space-y-2" aria-label="Loading sports">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-8 animate-pulse rounded bg-muted" />)}</div> :
          failed ? <div className="p-1 text-xs text-muted-foreground"><p>Sports index unavailable.</p><button type="button" onClick={onRetry} className="mt-2 text-primary underline">Retry</button></div> :
            !sports.length ? <p className="p-1 text-xs text-muted-foreground">No sport groups are indexed yet. All sports events remain available in the results.</p> : <>
              {popular.length > 0 && <>
                <h2 className="px-2.5 pb-1 pt-1 font-mono text-[10px] font-semibold uppercase tracking-[.16em] text-muted-foreground">Popular</h2>
                <div className="space-y-0.5">
                  {popular.map((item) => <button key={`${item.sport}-${item.name}`} type="button" onClick={() => onLeague(item.sport, item.name)} aria-pressed={league === item.name} data-testid={`button-popular-league-${slug(item.name)}`} className={row(league === item.name)}>
                    <span className="truncate">{leagueName(item.name)}</span><span className="font-mono text-[10px] tabular">{item.count.toLocaleString()}</span>
                  </button>)}
                </div>
                <div className="my-3 border-t border-border" />
              </>}
              <h2 className="px-2.5 pb-1 font-mono text-[10px] font-semibold uppercase tracking-[.16em] text-muted-foreground">All sports</h2>
              <div className="space-y-0.5">
                <button type="button" onClick={() => onSport("")} aria-pressed={!sport} data-testid="button-sports-all" className={row(!sport)}>
                  <span>All sports</span><span className="font-mono text-[10px] tabular">{sports.reduce((sum, item) => sum + item.count, 0).toLocaleString()}</span>
                </button>
                {sports.map((item) => {
                  const open = sport === item.name;
                  const leagues = item.leagueCounts ?? item.leagues.map((name) => ({ name, count: undefined }));
                  return <div key={item.name}>
                    <button type="button" onClick={() => onSport(item.name)} aria-pressed={open && !league} aria-expanded={leagues.length ? open : undefined} data-testid={`button-sport-${slug(item.name)}`} className={row(open && !league)}>
                      <span className={open ? "font-semibold text-foreground" : ""}>{item.name}</span>
                      <span className="flex items-center gap-1.5 font-mono text-[10px] tabular">{item.count.toLocaleString()}{leagues.length > 0 && <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />}</span>
                    </button>
                    {open && leagues.length > 0 && <div className="mb-1 ml-2.5 space-y-0.5 border-l border-border pl-2">
                      {leagues.map((entry) => <button key={entry.name} type="button" onClick={() => onLeague(item.name, entry.name)} aria-pressed={league === entry.name} data-testid={`button-league-${slug(entry.name)}`} className={row(league === entry.name)}>
                        <span className="truncate">{leagueName(entry.name)}</span>{entry.count !== undefined && <span className="font-mono text-[10px] tabular">{entry.count.toLocaleString()}</span>}
                      </button>)}
                    </div>}
                  </div>;
                })}
              </div>
            </>}
      </div>
    </aside>
  );
}
