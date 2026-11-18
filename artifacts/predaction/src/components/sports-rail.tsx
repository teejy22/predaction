import type { SportCategory } from "@workspace/api-client-react";
import { IconRail } from "@/components/icon-rail";

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
  return <IconRail label="Browse sports and leagues" chips={chips} testId="button-sports-rail" className="mb-4 lg:hidden" />;
}
