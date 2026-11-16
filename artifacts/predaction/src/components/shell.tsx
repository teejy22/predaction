import { type ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { Bookmark, HelpCircle, ExternalLink, Menu, X } from "lucide-react";
import { useWatchlist } from "@/hooks/use-watchlist";
import { HowItWorksDialog } from "@/components/how-it-works";

export function Logo() {
  return (
    <span className="flex items-center gap-2">
      <span className="relative grid h-8 w-8 place-items-center rounded-md bg-foreground text-background">
        <span className="font-display text-xl font-black leading-none">P</span>
        <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-background bg-primary" />
      </span>
      <span className="font-display text-2xl font-black uppercase tracking-tight">
        Pred<span className="text-primary">action</span>
      </span>
    </span>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const [loc] = useLocation();
  const { items } = useWatchlist();
  const [how, setHow] = useState(false);
  const [open, setOpen] = useState(false);

  const nav = [
    { href: "/", label: "Board" },
    { href: "/watchlist", label: "Watchlist", count: items.length },
  ];

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <header className="sticky top-0 z-40 border-b-2 border-foreground bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 md:px-6">
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
                  className={`group relative flex items-center gap-2 rounded-md px-3 py-2 text-sm font-bold uppercase tracking-wide transition-colors ${active ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {n.label === "Watchlist" && <Bookmark className="h-4 w-4" />}
                  {n.label}
                  {n.count ? (
                    <span className="rounded-sm bg-primary px-1.5 font-mono text-[11px] text-primary-foreground tabular">{n.count}</span>
                  ) : null}
                  <span className={`absolute inset-x-3 -bottom-[13px] h-[3px] origin-left bg-primary transition-transform duration-300 ${active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"}`} />
                </Link>
              );
            })}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setHow(true)}
              data-testid="button-how-it-works"
              className="hidden items-center gap-2 rounded-md border-2 border-foreground px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition-all hover:-translate-y-0.5 hover:shadow-[3px_3px_0_hsl(var(--foreground))] active:translate-y-0 active:shadow-none sm:flex"
            >
              <HelpCircle className="h-4 w-4" /> How it works
            </button>
            <button className="rounded-md p-2 md:hidden" onClick={() => setOpen((v) => !v)} data-testid="button-menu" aria-label="Menu">
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
        {open && (
          <div className="border-t border-border px-4 py-3 md:hidden">
            {nav.map((n) => (
              <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className="block py-2 font-display text-2xl font-extrabold uppercase">
                {n.label} {n.count ? <span className="text-primary">({n.count})</span> : null}
              </Link>
            ))}
            <button onClick={() => { setHow(true); setOpen(false); }} className="py-2 font-display text-2xl font-extrabold uppercase text-muted-foreground">
              How it works
            </button>
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="mt-16 bg-foreground text-background">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 md:grid-cols-[1.4fr_1fr] md:px-6">
          <div>
            <span className="font-display text-4xl font-black uppercase">
              Pred<span className="text-primary">action</span>
            </span>
            <p className="mt-3 max-w-md text-sm text-background/70">
              An independent discovery board for sports prediction markets. Predaction is not affiliated with, endorsed by, or operated by Kalshi. We read Kalshi's public market data; we do not take orders, hold funds, or give financial advice.
            </p>
          </div>
          <div className="space-y-2 text-sm text-background/70">
            <p className="font-mono text-xs uppercase tracking-widest text-accent">Data source</p>
            <p>Public Kalshi API. Prices shown in cents, volume in contracts. Refreshes every 60 seconds.</p>
            <a href="https://kalshi.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-background underline-offset-4 hover:underline" data-testid="link-kalshi-footer">
              kalshi.com <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </footer>
      <HowItWorksDialog open={how} onOpenChange={setHow} />
    </div>
  );
}
