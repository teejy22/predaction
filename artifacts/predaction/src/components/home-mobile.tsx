import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { getListSportsGamesQueryKey, useListSportsGames, type ListSportsGamesParams } from "@workspace/api-client-react";
import { IconRail } from "@/components/icon-rail";
import { SportsMatchupCard } from "@/components/sports-matchup-card";

const ICONS: Record<string, string> = {
  Elections: "🗳️", Sports: "🏈", Financials: "📈", Politics: "🏛️", Entertainment: "🎬", Economics: "💵",
  "Climate and Weather": "🌦️", "Science and Technology": "🔬", Commodities: "🛢️", Crypto: "🪙", Mentions: "💬",
  Companies: "🏢", Health: "🩺", Social: "👥", AI: "🤖", World: "🌍", Business: "💼", Culture: "🎭",
  Education: "🎓", Transportation: "✈️",
};
const SHORT: Record<string, string> = { "Climate and Weather": "Weather", "Science and Technology": "Science", Entertainment: "Culture" };

// Shared phone layout: full-bleed swipe row on phones, regular grid from the sm breakpoint up.
export const SWIPE_ROW = "-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:grid sm:snap-none sm:overflow-visible sm:px-0 sm:pb-0";
export const SWIPE_ITEM = "w-[84%] shrink-0 snap-start sm:w-auto";

// Phone-only category shortcuts. Sports opens the dedicated schedule page; the rest filter the board.
export function CategoryRail({ categories, active, onBrowse }: { categories: { name: string; count: number }[]; active: string; onBrowse: (category?: string) => void }) {
  const chips = [
    { id: "all", label: "All", icon: "🔥", active: !active, pick: () => onBrowse("") },
    ...[...categories].filter((item) => item.count > 0).sort((a, b) => (a.name === "Sports" ? -1 : b.name === "Sports" ? 1 : b.count - a.count)).map((item) => ({
      id: item.name, label: SHORT[item.name] ?? item.name, icon: ICONS[item.name] ?? "📊",
      ...(item.name === "Sports" ? { href: "/sports" } : { active: active === item.name, pick: () => onBrowse(item.name) }),
    })),
  ];
  if (chips.length < 2) return null;
  return <IconRail label="Browse categories" chips={chips} testId="button-home-rail" className="mb-5 sm:hidden" />;
}

// Phone-only replacement for the scrolling upcoming-games panel: swipe through the next games.
export function UpcomingSwipe() {
  const params: ListSportsGamesParams = { sort: "upcoming", offset: 0, limit: 12 };
  const feed = useListSportsGames(params, {
    query: { queryKey: getListSportsGamesQueryKey(params), refetchInterval: 60000, placeholderData: (prev) => prev },
  });
  const games = feed.data?.games ?? [];
  if (!feed.isLoading && !games.length) return null;
  return (
    <section className="mt-7 sm:hidden" aria-label="Upcoming games" data-testid="section-home-upcoming-swipe">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="font-display text-xl font-bold tracking-[-.035em]">Upcoming games</h2>
        <Link href="/sports" data-testid="link-home-upcoming-all" aria-label="All sports" className="rounded-full p-2 text-muted-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><ArrowRight className="h-5 w-5" /></Link>
      </div>
      <div className={`${SWIPE_ROW} items-start`}>
        {feed.isLoading
          ? [0, 1].map((i) => <div key={i} className={`${SWIPE_ITEM} h-44 animate-pulse rounded-2xl border border-border bg-card/65`} />)
          : games.map((game) => <div key={game.key} className={`${SWIPE_ITEM} grid`}><SportsMatchupCard game={game} /></div>)}
      </div>
    </section>
  );
}
