import { type ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { Bookmark, HelpCircle, ExternalLink, Menu, X } from "lucide-react";
import { useWatchlist } from "@/hooks/use-watchlist";
import { HowItWorksDialog } from "@/components/how-it-works";

export function Logo() {
  return (
    <span className="flex items-center gap-2">
        <span className="relative grid h-7 w-7 place-items-center rounded-md bg-primary text-primary-foreground">
         <span className="text-lg font-extrabold leading-none tracking-[-.08em]">P</span>
         <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-background bg-foreground" />
      </span>
       <span className="text-[1.2rem] font-extrabold tracking-[-.055em]">
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
              <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className="block py-2 text-lg font-semibold">
                {n.label} {n.count ? <span className="text-primary">({n.count})</span> : null}
              </Link>
            ))}
            <button onClick={() => { setHow(true); setOpen(false); }} className="py-2 text-lg font-semibold text-muted-foreground">
              How it works
            </button>
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="mt-16 border-t border-border bg-card/70">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 md:grid-cols-[1.4fr_1fr] md:px-6">
          <div>
            <span className="font-display text-4xl font-black uppercase">
              Pred<span className="text-primary">action</span>
            </span>
            <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">
              An independent discovery board for sports prediction markets. Predaction is not affiliated with, endorsed by, or operated by Kalshi. We read Kalshi's public market data; we do not take orders, hold funds, or give financial advice.
            </p>
          </div>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p className="font-mono text-[10px] uppercase tracking-widest text-primary">Data source</p>
            <p>Public Kalshi API. Prices shown in cents, volume in contracts. Refreshes every 60 seconds.</p>
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
