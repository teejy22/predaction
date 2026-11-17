import { ArrowUpRight } from "lucide-react";

const card = "group flex min-h-16 items-center justify-between gap-3 overflow-hidden rounded-lg border px-3 py-2.5 transition-colors focus-visible:outline-none focus-visible:ring-2";
const badge = "inline-flex h-5 items-center rounded-sm border px-1.5 font-mono text-[8px] font-semibold uppercase tracking-[.13em]";
const offer = "mt-1 block truncate text-[10px] font-medium leading-4 text-muted-foreground";
const cta = "inline-flex h-8 w-24 shrink-0 items-center justify-center gap-1 rounded-md text-[10px] font-bold transition-colors";

export function PromoBars() {
  return (
    <section aria-label="Trading offers" className="mb-5 grid gap-2 md:grid-cols-2">
      <a
        href="https://kalshi.com/"
        target="_blank"
        rel="noreferrer"
        data-testid="link-promo-kalshi"
        className={`${card} border-emerald-400/20 bg-emerald-400/[.045] hover:border-emerald-300/40 hover:bg-emerald-400/[.07] focus-visible:ring-emerald-300`}
      >
        <span className="min-w-0">
          <span className="flex h-5 items-center gap-2">
            <span className="font-display text-sm font-bold leading-5 tracking-[-.02em] text-emerald-300">Kalshi</span>
            <span className={`${badge} border-emerald-300/20 bg-emerald-300/[.06] text-emerald-200/90`}>$55 bonus</span>
          </span>
          <span className={offer}>Trade $25, get $55 · CFTC-approved event contracts</span>
        </span>
        <span className={`${cta} bg-emerald-400 text-emerald-950 group-hover:bg-emerald-300`}>
          Sign up <ArrowUpRight className="h-3 w-3" />
        </span>
      </a>

      <a
        href="https://polymarket.com/"
        target="_blank"
        rel="noreferrer"
        data-testid="link-promo-polymarket"
        className={`${card} border-[#313449] bg-[#171923] hover:border-[#007FFF]/50 hover:bg-[#1A1D29] focus-visible:ring-[#007FFF]`}
      >
        <span className="min-w-0">
          <span className="flex h-5 items-center gap-2">
            <img src={`${import.meta.env.BASE_URL}polymarket-logo.png`} alt="Polymarket" width="190" height="42" className="h-5 w-auto shrink-0" />
            <span className={`${badge} border-[#007FFF]/25 bg-[#007FFF]/[.08] text-[#7FBDFF]`}>$25 bonus</span>
          </span>
          <span className={offer}>Deposit $10, get $25 · Code PREDICTPRO</span>
        </span>
        <span className={`${cta} bg-[#007FFF] text-white group-hover:bg-[#2492FF]`}>
          Sign up <ArrowUpRight className="h-3 w-3" />
        </span>
      </a>
    </section>
  );
}
