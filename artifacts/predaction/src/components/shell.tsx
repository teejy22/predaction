import { type ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { Bookmark, ExternalLink, Menu, X, Activity, TrendingUp, ChevronDown, Radio, ChartNoAxesCombined, Trophy, Globe, Gamepad2, MonitorPlay, Wallet } from "lucide-react";
import { useWatchlist } from "@/hooks/use-watchlist";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export function Logo({ className = "h-[22px] w-auto" }: { className?: string }) {
  return <img src={`${import.meta.env.BASE_URL}prediction-pro-logo.svg`} alt="Prediction Pro" width={599} height={94} className={className} />;
}

export function Shell({ children }: { children: ReactNode }) {
  const [loc] = useLocation();
  const { items } = useWatchlist();
  const [open, setOpen] = useState(false);

  const marketLinks = [
    { href: "/markets", label: "All markets", icon: TrendingUp },
    { href: "/markets?category=Politics", label: "Politics", icon: TrendingUp },
    { href: "/markets?category=Elections", label: "Elections", icon: TrendingUp },
    { href: "/markets?category=Economics", label: "Economics", icon: TrendingUp },
    { href: "/sports", label: "Sports", icon: Trophy },
    { href: "/esports", label: "Esports", icon: Gamepad2, MonitorPlay },
    { href: "/movers", label: "Market movers", icon: TrendingUp },
    { href: "/watchlist", label: "Watchlist", icon: Bookmark },
  ];
  const toolLinks = [
    { href: "/tools/smart-money", label: "Smart Money", icon: ChartNoAxesCombined },
    { href: "/tools/football-sharps", label: "Football Sharps", icon: Trophy },
    { href: "/traders", label: "Trader Activity", icon: Activity },
  ];
  const toolsActive = loc.startsWith("/tools") || loc.startsWith("/traders");
  const marketActive = loc === "/" || loc.startsWith("/markets") || loc.startsWith("/sports") || loc.startsWith("/esports") || loc.startsWith("/movers") || loc.startsWith("/watchlist");
  const activeLink = (href: string) => href === "/" ? loc === "/" : loc === href || loc.startsWith(`${href}/`);
  const navClass = (active: boolean) => `group relative inline-flex items-center gap-1.5 rounded-md px-2.5 py-2 text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${active ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`;
  const dropItem = "flex cursor-pointer items-center gap-2 rounded px-2.5 py-2 text-xs text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus:bg-accent focus:text-foreground";

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <header className="sticky top-0 z-40 border-b border-border bg-background">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-7 px-4 md:px-6">
          <Link href="/" data-testid="link-home" className="transition-transform active:scale-95">
            <Logo />
          </Link>
          <nav className="hidden items-center gap-0.5 lg:flex">
            <DropdownMenu>
              <DropdownMenuTrigger className={`${navClass(marketActive)} data-[state=open]:text-foreground`} data-testid="button-nav-markets">Markets <ChevronDown className="h-3 w-3 opacity-60" /></DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48 border-border bg-popover p-1.5">
                {marketLinks.map((n) => <DropdownMenuItem key={n.href} asChild className={dropItem}>
                  <Link href={n.href} data-testid={`link-nav-${n.label.toLowerCase().replace(/\s+/g, "-")}`} aria-current={activeLink(n.href) ? "page" : undefined}>
                    <n.icon className="h-3.5 w-3.5" />{n.label}{n.href === "/watchlist" && items.length > 0 && <span className="ml-auto rounded-sm bg-primary px-1.5 font-mono text-[10px] text-primary-foreground">{items.length}</span>}
                  </Link>
                </DropdownMenuItem>)}
              </DropdownMenuContent>
            </DropdownMenu>
            <Link href="/sports" data-testid="link-nav-sports" aria-current={loc.startsWith("/sports") ? "page" : undefined} className={navClass(loc.startsWith("/sports"))}>Sports</Link>
            <Link href="/esports" data-testid="link-nav-esports-top" aria-current={activeLink("/esports") ? "page" : undefined} className={navClass(activeLink("/esports"))}>Esports</Link>
            <Link href="/model" data-testid="link-nav-model" aria-current={activeLink("/model") ? "page" : undefined} className={navClass(activeLink("/model"))}>Model</Link>
            <Link href="/sweat-station" data-testid="link-nav-sweat-station" aria-current={activeLink("/sweat-station") ? "page" : undefined} className={navClass(activeLink("/sweat-station"))}>Sweat Station</Link>
            <Link href="/portfolio" data-testid="link-nav-portfolio" aria-current={activeLink("/portfolio") ? "page" : undefined} className={navClass(activeLink("/portfolio"))}>Portfolio</Link>
            <DropdownMenu>
              <DropdownMenuTrigger className={`${navClass(toolsActive)} data-[state=open]:text-foreground`} data-testid="button-nav-tools">Tools <ChevronDown className="h-3 w-3 opacity-60" /></DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-52 border-border bg-popover p-1.5">
                {toolLinks.map((n) => <DropdownMenuItem key={n.href} asChild className={dropItem}>
                  <Link href={n.href} data-testid={`link-nav-${n.href.split("/").filter(Boolean).join("-")}`} aria-current={activeLink(n.href) ? "page" : undefined}><n.icon className="h-3.5 w-3.5" />{n.label}</Link>
                </DropdownMenuItem>)}
              </DropdownMenuContent>
            </DropdownMenu>
            <Link href="/pulse" data-testid="link-nav-articles" aria-current={activeLink("/pulse") ? "page" : undefined} className={navClass(activeLink("/pulse"))}>Articles</Link>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <button className="rounded-md p-2 lg:hidden" onClick={() => setOpen((v) => !v)} data-testid="button-menu" aria-label={open ? "Close navigation menu" : "Open navigation menu"} aria-expanded={open} aria-controls="mobile-navigation">
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
        {open && (
        <nav id="mobile-navigation" aria-label="Mobile navigation" className="border-t border-border bg-card px-4 py-3 lg:hidden">
            <p className="pb-1 pt-2 font-mono text-[9px] uppercase tracking-[.17em] text-muted-foreground">Markets</p>
            {marketLinks.map((n) => <Link key={n.href} href={n.href} aria-current={activeLink(n.href) ? "page" : undefined} onClick={() => setOpen(false)} data-testid={`link-mobile-${n.label.toLowerCase().replace(/\s+/g, "-")}`} className={`flex items-center gap-2 py-2 text-sm font-semibold ${activeLink(n.href) ? "text-primary" : "text-foreground"}`}><n.icon className="h-4 w-4" />{n.label}{n.href === "/watchlist" && items.length > 0 && <span className="text-primary">({items.length})</span>}</Link>)}
            <Link href="/model" aria-current={activeLink("/model") ? "page" : undefined} onClick={() => setOpen(false)} data-testid="link-mobile-model" className={`flex items-center gap-2 py-2 text-sm font-semibold ${activeLink("/model") ? "text-primary" : "text-foreground"}`}><Globe className="h-4 w-4" />Model</Link>
            <Link href="/sweat-station" aria-current={activeLink("/sweat-station") ? "page" : undefined} onClick={() => setOpen(false)} data-testid="link-mobile-sweat-station" className={`flex items-center gap-2 py-2 text-sm font-semibold ${activeLink("/sweat-station") ? "text-primary" : "text-foreground"}`}><MonitorPlay className="h-4 w-4" />Sweat Station</Link>
            <Link href="/portfolio" aria-current={activeLink("/portfolio") ? "page" : undefined} onClick={() => setOpen(false)} data-testid="link-mobile-portfolio" className={`flex items-center gap-2 py-2 text-sm font-semibold ${activeLink("/portfolio") ? "text-primary" : "text-foreground"}`}><Wallet className="h-4 w-4" />Portfolio</Link>
            <p className="pb-1 pt-4 font-mono text-[9px] uppercase tracking-[.17em] text-muted-foreground">Tools</p>
            {toolLinks.map((n) => <Link key={n.href} href={n.href} aria-current={activeLink(n.href) ? "page" : undefined} onClick={() => setOpen(false)} data-testid={`link-mobile-${n.href.split("/").filter(Boolean).join("-")}`} className={`flex items-center gap-2 py-2 text-sm font-semibold ${activeLink(n.href) ? "text-primary" : "text-foreground"}`}><n.icon className="h-4 w-4" />{n.label}</Link>)}
            <Link href="/pulse" aria-current={activeLink("/pulse") ? "page" : undefined} onClick={() => setOpen(false)} data-testid="link-mobile-articles" className={`flex items-center gap-2 py-2.5 text-sm font-semibold ${activeLink("/pulse") ? "text-primary" : "text-foreground"}`}><Radio className="h-4 w-4" />Articles</Link>
        </nav>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="mt-16 border-t border-border bg-card/70">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 md:grid-cols-[1.4fr_1fr] md:px-6">
          <div>
            <Logo className="h-7 w-auto" />
            <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">
              Independent market tracker. Not affiliated with Kalshi or Polymarket. Not financial advice.
            </p>
          </div>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p className="font-mono text-[10px] uppercase tracking-widest text-primary">Data sources</p>
            <p>Open Kalshi events and FlowFrame intelligence, refreshed every minute.</p>
            <a href="https://kalshi.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-foreground underline-offset-4 hover:text-primary hover:underline" data-testid="link-kalshi-footer">
              kalshi.com <ExternalLink className="h-3 w-3" />
            </a>
            <a href="https://flowframe.xyz" target="_blank" rel="noopener noreferrer" className="ml-4 inline-flex items-center gap-1 text-foreground underline-offset-4 hover:text-primary hover:underline" data-testid="link-flowframe-footer">
              FlowFrame <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
