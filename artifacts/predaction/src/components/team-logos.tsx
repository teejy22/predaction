import type { TeamLogo } from "@workspace/api-client-react";

const SIZES = {
  sm: "h-9 w-9",
  md: "h-11 w-11",
  lg: "h-14 w-14 sm:h-16 sm:w-16",
} as const;

export function TeamLogos({ teams, size = "md" }: { teams: TeamLogo[]; size?: keyof typeof SIZES }) {
  const shown = teams.slice(0, 2);
  if (!shown.length) return null;

  return (
    <div className="flex shrink-0 -space-x-2" aria-label={`${shown.map(team => team.name).join(" versus ")} logos`} data-testid="team-logos">
      {shown.map((team, index) => (
        <span
          key={`${team.name}-${team.logo}`}
          className={`relative flex ${SIZES[size]} items-center justify-center overflow-hidden rounded-full border border-border bg-background shadow-sm ${index ? "ring-2 ring-card" : ""}`}
        >
          <img
            src={team.logo}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
            className="h-[76%] w-[76%] object-contain"
          />
        </span>
      ))}
    </div>
  );
}
