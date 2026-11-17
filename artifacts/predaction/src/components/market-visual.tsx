import type { ComponentType } from "react";
import {
  Bitcoin, Briefcase, Clapperboard, CloudSun, Cpu, FlaskConical, Globe,
  Landmark, Newspaper, Scale, Trophy, Vote,
} from "lucide-react";
import type { PredictionEvent, PredictionMarket } from "@workspace/api-client-react";

const CATEGORY_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  Crypto: Bitcoin,
  Culture: Clapperboard,
  Climate: CloudSun,
  Economics: Briefcase,
  Elections: Vote,
  Financials: Landmark,
  Politics: Landmark,
  Science: FlaskConical,
  Sports: Trophy,
  Technology: Cpu,
  World: Globe,
  News: Newspaper,
  Legal: Scale,
};

const SIZES = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-12 w-12",
} as const;

export function MarketVisual({
  event, market, size = "md",
}: { event: PredictionEvent; market?: PredictionMarket; size?: keyof typeof SIZES }) {
  const src = market?.image || event.image || event.featuredImage;
  const Icon = CATEGORY_ICONS[event.category] ?? (event.sport ? Trophy : Briefcase);
  const box = `relative flex ${SIZES[size]} shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-background shadow-sm`;

  if (src) {
    return (
      <span className={box} data-testid={`market-visual-${market?.ticker ?? event.ticker}`}>
        <img
          src={src}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          className={market?.image ? "h-full w-full object-cover" : "h-[76%] w-[76%] object-contain"}
        />
      </span>
    );
  }

  return (
    <span className={`${box} bg-primary/[.08] text-primary`} data-testid={`market-visual-${market?.ticker ?? event.ticker}`}>
      <Icon className="h-4 w-4" />
    </span>
  );
}
