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
        className="group flex min-h-[72px] items-center justify-between gap-3 overflow-hidden rounded-lg border border-[#313449] bg-[#1C1E29] px-3 py-3 transition-colors hover:border-[#007FFF]/60 hover:bg-[#202331] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007FFF]"
      >
        <span className="min-w-0">
          <span className="flex items-center gap-3">
            <img src={`${import.meta.env.BASE_URL}polymarket-logo.png`} alt="Polymarket" width="220" height="52" className="h-7 w-auto shrink-0" />
            <span className="font-mono text-[8px] font-semibold uppercase tracking-[.14em] text-[#878A9C]"><span className="text-sm font-bold tracking-normal text-[#E7EAF1]">$25</span> bonus</span>
          </span>
          <span className="mt-1.5 block truncate text-[10px] font-medium text-[#B7C5CC]">
            Deposit $10, get a $25 trading bonus · Code PREDICTPRO
          </span>
        </span>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-[#007FFF] px-3 py-2 text-[10px] font-bold text-white transition-colors group-hover:bg-[#2492ff]">
          Sign up to trade <ArrowUpRight className="h-3 w-3" />
        </span>
      </a>
    </section>
  );
}
