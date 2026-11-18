import type { SportCategory } from "@workspace/api-client-react";

const ICONS: Record<string, string> = {
  Football: "🏈", NFL: "🏈", NCAAF: "🏈", Basketball: "🏀", NBA: "🏀", NCAAB: "🏀", WNBA: "🏀",
  Baseball: "⚾", MLB: "⚾", Hockey: "🏒", NHL: "🏒", Soccer: "⚽", Tennis: "🎾", ATP: "🎾", WTA: "🎾",
  Golf: "⛳", MMA: "🥊", Boxing: "🥊", Cricket: "🏏", Esports: "🎮", Motorsport: "🏎️", Rugby: "🏉",
};
const SHORT: Record<string, string> = { NCAAF: "CFB", NCAAB: "CBB" };

type Props = {
  sports: SportCategory[];
  sport: string;
  league: string;
  onAll: () => void;
  onSport: (sport: string) => void;
  onLeague: (sport: string, league: string) => void;
};

// Phone and tablet filter: one swipeable row of the busiest leagues, then every sport.
export function SportsRail({ sports, sport, league, onAll, onSport, onLeague }: Props) {
  const leagues = sports
    .flatMap((item) => (item.leagueCounts ?? []).map((entry) => ({ ...entry, sport: item.name })))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, 5);
  const chips = [
    { id: "all", label: "Popular", icon: "🔥", active: !sport && !league, pick: onAll },
    ...leagues.map((item) => ({ id: `league-${item.name}`, label: SHORT[item.name] ?? item.name, icon: ICONS[item.name] ?? ICONS[item.sport] ?? "🏆", active: league === item.name, pick: () => onLeague(item.sport, item.name) })),
    ...sports.map((item) => ({ id: `sport-${item.name}`, label: item.name, icon: ICONS[item.name] ?? "🏆", active: sport === item.name && !league, pick: () => onSport(item.name) })),
  ];
  return (
    <nav aria-label="Browse sports and leagues" className="-mx-4 mb-4 flex gap-1 overflow-x-auto px-3 pb-1 [scrollbar-width:none] md:-mx-6 md:px-5 lg:hidden [&::-webkit-scrollbar]:hidden">
      {chips.map((chip) => (
        <button key={chip.id} type="button" onClick={chip.pick} aria-pressed={chip.active} data-testid={`button-sports-rail-${chip.id.toLowerCase().replace(/\s+/g, "-")}`} className="group flex w-[4.25rem] shrink-0 flex-col items-center gap-1.5 rounded-lg py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
          <span aria-hidden="true" className={`flex h-12 w-12 items-center justify-center rounded-full border text-2xl leading-none transition-colors ${chip.active ? "border-primary bg-primary/25" : "border-transparent bg-card group-hover:border-border"}`}>{chip.icon}</span>
          <span className={`max-w-full truncate text-[11px] ${chip.active ? "font-semibold text-foreground" : "text-muted-foreground"}`}>{chip.label}</span>
        </button>
      ))}
    </nav>
  );
}
