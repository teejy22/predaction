import { Link } from "wouter";

export type RailChip = { id: string; label: string; icon: string; active?: boolean; pick?: () => void; href?: string };

const slug = (value: string) => value.toLowerCase().replace(/\s+/g, "-");

// Swipeable row of round icon buttons used as the phone filter on browsing pages.
export function IconRail({ label, chips, testId, className = "" }: { label: string; chips: RailChip[]; testId: string; className?: string }) {
  return (
    <nav aria-label={label} className={`-mx-4 flex gap-1 overflow-x-auto px-3 pb-1 [scrollbar-width:none] md:-mx-6 md:px-5 [&::-webkit-scrollbar]:hidden ${className}`}>
      {chips.map((chip) => {
        const body = <>
          <span aria-hidden="true" className={`flex h-12 w-12 items-center justify-center rounded-full border text-2xl leading-none transition-colors ${chip.active ? "border-primary bg-primary/25" : "border-transparent bg-card group-hover:border-border"}`}>{chip.icon}</span>
          <span className={`max-w-full truncate text-[11px] ${chip.active ? "font-semibold text-foreground" : "text-muted-foreground"}`}>{chip.label}</span>
        </>;
        const cls = "group flex w-[4.25rem] shrink-0 flex-col items-center gap-1.5 rounded-lg py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";
        return chip.href
          ? <Link key={chip.id} href={chip.href} data-testid={`${testId}-${slug(chip.id)}`} className={cls}>{body}</Link>
          : <button key={chip.id} type="button" onClick={chip.pick} aria-pressed={!!chip.active} data-testid={`${testId}-${slug(chip.id)}`} className={cls}>{body}</button>;
      })}
    </nav>
  );
}
