import { type ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { Bookmark, HelpCircle, ExternalLink, Menu, X } from "lucide-react";
import { useWatchlist } from "@/hooks/use-watchlist";
import { HowItWorksDialog } from "@/components/how-it-works";

export function Logo({ className = "h-[22px] w-auto" }: { className?: string }) {
  return <img src={`${import.meta.env.BASE_URL}prediction-pro-logo.svg`} alt="Prediction Pro" width={599} height={94} className={className} />;
}

export function Shell({ children }: { children: ReactNode }) {
  const [loc] = useLocation();
  const { items } = useWatchlist();
  const [how, setHow] = useState(false);
  const [open, setOpen] = useState(false);

  const nav = [
    { href: "/", label: "Markets" },
    { href: "/watchlist", label: "Watchlist", count: items.length },
  ];

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-7 px-4 md:px-6">
          <Link href="/" data-testid="link-home" className="transition-transform active:scale-95">
            <Logo />
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {nav.map((n) => {
              const active = n.href === "/" ? loc === "/" : loc.startsWith(n.href);
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  data-testid={`link-nav-${n.label.toLowerCase()}`}
                  className={`group relative flex items-center gap-2 rounded-md px-3 py-2 text-xs font-semibold transition-colors ${active ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {n.label === "Watchlist" && <Bookmark className="h-4 w-4" />}
                  {n.label}
                  {n.count ? (
                    <span className="rounded-sm bg-primary px-1.5 font-mono text-[11px] text-primary-foreground tabular">{n.count}</span>
                  ) : null}
                  <span className={`absolute inset-x-3 -bottom-[13px] h-[2px] origin-left bg-primary transition-transform duration-300 ${active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"}`} />
                </Link>
              );
            })}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setHow(true)}
              data-testid="button-how-it-works"
              className="hidden items-center gap-2 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground sm:flex"
            >
              <HelpCircle className="h-4 w-4" /> How it works
            </button>
            <button className="rounded-md p-2 md:hidden" onClick={() => setOpen((v) => !v)} data-testid="button-menu" aria-label="Menu">
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
        {open && (
        <div className="border-t border-border bg-card px-4 py-3 md:hidden">
            {nav.map((n) => (
              <Link key={n.href} href={n.href} onClick={() => setOpen(false)} data-testid={`link-mobile-${n.label.toLowerCase()}`} className="block py-2 text-lg font-semibold">
                {n.label} {n.count ? <span className="text-primary">({n.count})</span> : null}
              </Link>
            ))}
            <button onClick={() => { setHow(true); setOpen(false); }} data-testid="button-how-it-works-mobile" className="block py-2 text-lg font-semibold text-muted-foreground">
              How it works
            </button>
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="mt-16 border-t border-border bg-card/70">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 md:grid-cols-[1.4fr_1fr] md:px-6">
          <div>
            <Logo className="h-7 w-auto" />
            <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">
              A fast, clear discovery board for open Kalshi events across politics, economics, climate, culture, sports and more. Prediction Pro is not affiliated with, endorsed by, or operated by Kalshi. We read Kalshi's public market data; we do not take orders, hold funds, or give financial advice.
            </p>
          </div>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p className="font-mono text-[10px] uppercase tracking-widest text-primary">Data source</p>
            <p>Public Kalshi API, regular open events only (multivariate combos excluded, no historical archive). Prices in cents, volume in contracts. Index rebuilt every 5 minutes; this page checks every 60 seconds.</p>
            <a href="https://kalshi.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-foreground underline-offset-4 hover:text-primary hover:underline" data-testid="link-kalshi-footer">
              kalshi.com <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </footer>
      <HowItWorksDialog open={how} onOpenChange={setHow} />
    </div>
  );
}
