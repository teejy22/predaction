import { useState } from "react";
import { Bookmark, BookmarkCheck, ExternalLink, RotateCw, AlertTriangle } from "lucide-react";
import { useWatchlist } from "@/hooks/use-watchlist";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function ProbBar({ value, className = "", color }: { value: number; className?: string; color?: string }) {
  const v = Math.max(0, Math.min(100, value || 0));
  const barColor = color && /^#[0-9a-f]{6}$/i.test(color) ? color : undefined;
  return (
    <div className={`relative h-2 w-full overflow-hidden rounded-full bg-muted ${className}`}>
      <div
        className={`fillbar absolute inset-y-0 left-0 rounded-full ${barColor ? "" : "bg-primary"}`}
        style={{ width: `${v}%`, ...(barColor ? { backgroundColor: barColor } : {}) }}
      />
      <div className="absolute inset-y-0 left-1/2 w-px bg-foreground/30" />
    </div>
  );
}

export function Change({ value }: { value: number }) {
  if (!value) return <span className="font-mono text-xs text-muted-foreground tabular">0.0 pp</span>;
  const up = value > 0;
  return (
    <span className={`font-mono text-xs font-semibold tabular ${up ? "text-[hsl(155_55%_57%)]" : "text-destructive"}`}>
      {up ? "+" : ""}{value.toFixed(1)} pp
    </span>
  );
}

export function CategoryTag({ category, sport, league }: { category?: string; sport?: string; league?: string }) {
  const main = category || sport || "Uncategorized";
  const extra = [sport && sport !== main ? sport : "", league && league !== sport ? league : ""].filter(Boolean);
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-wider">
      <span className="rounded-sm bg-primary/20 px-1.5 py-0.5 text-[hsl(262_80%_80%)]">{main}</span>
      {extra.map((x) => <span key={x} className="text-muted-foreground">{x}</span>)}
    </span>
  );
}

export function WatchButton({
  event, variant = "icon",
}: { event: { ticker: string; title: string; category?: string; sport: string; league: string }; variant?: "icon" | "full" }) {
  const { has, toggle } = useWatchlist();
  const { toast } = useToast();
  const [pop, setPop] = useState(0);
  const on = has(event.ticker);
  const click = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const added = toggle(event);
    if (added === null) return;
    setPop((p) => p + 1);
    toast({ title: added ? "Added to watchlist" : "Removed from watchlist", description: event.title });
  };
  const Icon = on ? BookmarkCheck : Bookmark;
  if (variant === "full") {
    return (
      <button
        onClick={click}
        data-testid={`button-watch-${event.ticker}`}
        className={`inline-flex items-center gap-2 rounded-md border-2 border-foreground px-4 py-2.5 text-sm font-bold uppercase tracking-wide transition-all hover:-translate-y-0.5 hover:shadow-[3px_3px_0_hsl(var(--foreground))] active:translate-y-0 active:shadow-none ${on ? "bg-accent" : "bg-card"}`}
      >
        <Icon key={pop} className="h-4 w-4 animate-in zoom-in-50 duration-300" />
        {on ? "Watching" : "Watch"}
      </button>
    );
  }
  return (
    <button
      onClick={click}
      aria-label={on ? "Remove from watchlist" : "Add to watchlist"}
      data-testid={`button-watch-${event.ticker}`}
        className={`grid h-9 w-9 place-items-center rounded-md border transition-all hover:border-primary hover:text-primary active:scale-95 ${on ? "border-primary/50 bg-primary/15 text-primary" : "border-border bg-card text-muted-foreground"}`}
    >
      <Icon key={pop} className="h-4 w-4 animate-in zoom-in-50 duration-300" />
    </button>
  );
}

export function KalshiCTA({ url, label = "Trade on Kalshi", testId = "button-trade" }: { url: string; label?: string; testId?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        disabled={!url}
        data-testid={testId}
        className="group inline-flex items-center gap-2 rounded-md border border-primary bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 active:scale-[.98] disabled:opacity-50"
      >
        {label}
        <ExternalLink className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent className="border-border bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-bold tracking-tight">You're leaving Prediction Pro</AlertDialogTitle>
            <AlertDialogDescription>
              This opens the event on Kalshi in a new tab. Prediction Pro is an independent site, not affiliated with Kalshi, and doesn't handle accounts, money or orders. Trading involves risk of loss; check Kalshi's terms and eligibility in your region.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <p className="truncate rounded bg-muted px-3 py-2 font-mono text-xs">{url}</p>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-external">Stay here</AlertDialogCancel>
            <AlertDialogAction
              data-testid="button-confirm-external"
              onClick={() => window.open(url, "_blank", "noopener,noreferrer")}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Continue to Kalshi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function ErrorPanel({ title = "Couldn't load market data", onRetry, retrying }: { title?: string; onRetry: () => void; retrying?: boolean }) {
  return (
    <div className="rounded-lg border border-dashed border-destructive/50 bg-card/60 p-10 text-center">
      <AlertTriangle className="mx-auto h-8 w-8 text-destructive" />
      <h3 className="mt-3 text-2xl font-bold tracking-tight">{title}</h3>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">We couldn't reach the market data. This is usually brief — try again in a moment.</p>
      <button
        onClick={onRetry}
        data-testid="button-retry"
        className="mt-5 inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2 text-sm font-semibold transition-colors hover:border-primary hover:text-primary"
      >
        <RotateCw className={`h-4 w-4 ${retrying ? "animate-spin" : ""}`} /> Retry
      </button>
    </div>
  );
}
