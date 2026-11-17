import { ArrowUpRight } from "lucide-react";

export function PromoBars() {
  return (
    <section aria-label="Trading offers" className="mb-5 grid gap-2 md:grid-cols-2">
      <a
        href="https://kalshi.com/"
        target="_blank"
        rel="noreferrer"
        data-testid="link-promo-kalshi"
        className="group flex min-h-[54px] items-center justify-between gap-3 overflow-hidden rounded-lg border border-emerald-400/25 bg-emerald-400/[.06] px-3 py-2 transition-colors hover:border-emerald-300/50 hover:bg-emerald-400/[.1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
      >
        <span className="min-w-0">
          <span className="flex items-center gap-2">
            <span className="font-display text-sm font-bold tracking-[-.02em] text-emerald-300">Kalshi</span>
            <span className="font-mono text-[8px] font-semibold uppercase tracking-[.14em] text-emerald-200/80">$55 bonus</span>
          </span>
          <span className="mt-1 block truncate text-[10px] font-medium text-muted-foreground">
            Trade $25, Get $55 · CFTC-approved event contracts
          </span>
        </span>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-emerald-400 px-2.5 py-1.5 text-[10px] font-bold text-emerald-950 transition-colors group-hover:bg-emerald-300">
          Sign up <ArrowUpRight className="h-3 w-3" />
        </span>
      </a>

      <a
        href="https://polymarket.com/"
        target="_blank"
        rel="noreferrer"
        data-testid="link-promo-polymarket"
        className="group flex min-h-[54px] items-center justify-between gap-3 overflow-hidden rounded-lg border border-violet-400/25 bg-gradient-to-r from-indigo-500/15 to-fuchsia-500/10 px-3 py-2 transition-colors hover:border-violet-300/50 hover:from-indigo-500/20 hover:to-fuchsia-500/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300"
      >
        <span className="min-w-0">
          <span className="flex items-center gap-2">
            <span className="font-display text-sm font-bold tracking-[-.02em] text-violet-200">Polymarket</span>
            <span className="font-mono text-[8px] font-semibold uppercase tracking-[.14em] text-violet-100/75">Promo PREDICTPRO</span>
          </span>
          <span className="mt-1 block truncate text-[10px] font-medium text-muted-foreground">
            Get $25 · New users deposit $10 · 18+ · 41 states + DC
          </span>
        </span>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-violet-200/40 px-2.5 py-1.5 text-[10px] font-bold text-violet-100 transition-colors group-hover:bg-violet-300/10">
          Claim $25 <ArrowUpRight className="h-3 w-3" />
        </span>
      </a>
    </section>
  );
}
