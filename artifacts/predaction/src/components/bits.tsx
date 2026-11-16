import { useState } from "react";
import { Bookmark, BookmarkCheck, ExternalLink, RotateCw, AlertTriangle } from "lucide-react";
import { useWatchlist } from "@/hooks/use-watchlist";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function ProbBar({ value, className = "" }: { value: number; className?: string }) {
  const v = Math.max(0, Math.min(100, value || 0));
  return (
    <div className={`relative h-2 w-full overflow-hidden rounded-full bg-muted ${className}`}>
      <div className="fillbar absolute inset-y-0 left-0 rounded-full bg-primary" style={{ width: `${v}%` }} />
      <div className="absolute inset-y-0 left-1/2 w-px bg-foreground/30" />
    </div>
  );
}

export function Change({ value }: { value: number }) {
  if (!value) return <span className="font-mono text-xs text-muted-foreground tabular">0</span>;
  const up = value > 0;
  return (
    <span className={`font-mono text-xs font-bold tabular ${up ? "text-[hsl(150_70%_32%)]" : "text-destructive"}`}>
      {up ? "+" : ""}{Math.round(value)}¢
    </span>
  );
}

export function SportTag({ sport, league }: { sport: string; league?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-wider">
      <span className="rounded-sm bg-foreground px-1.5 py-0.5 text-background">{league || sport}</span>
      {league && league !== sport && <span className="text-muted-foreground">{sport}</span>}
    </span>
  );
}

export function WatchButton({
  event, variant = "icon",
}: { event: { ticker: string; title: string; sport: string; league: string }; variant?: "icon" | "full" }) {
  const { has, toggle } = useWatchlist();
  const { toast } = useToast();
  const [pop, setPop] = useState(0);
  const on = has(event.ticker);
  const click = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const added = toggle(event);
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
      className={`grid h-9 w-9 place-items-center rounded-md border transition-all hover:scale-110 active:scale-90 ${on ? "border-foreground bg-accent text-foreground" : "border-border bg-card text-muted-foreground hover:text-foreground"}`}
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
        className="group inline-flex items-center gap-2 rounded-md border-2 border-foreground bg-primary px-4 py-2.5 text-sm font-bold uppercase tracking-wide text-primary-foreground transition-all hover:-translate-y-0.5 hover:shadow-[3px_3px_0_hsl(var(--foreground))] active:translate-y-0 active:shadow-none disabled:opacity-50"
      >
        {label}
        <ExternalLink className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent className="border-2 border-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-3xl font-black uppercase">You're leaving Predaction</AlertDialogTitle>
            <AlertDialogDescription>
              This opens the event on Kalshi in a new tab. Predaction is an independent site, not affiliated with Kalshi, and doesn't handle accounts, money or orders. Trading involves risk of loss; check Kalshi's terms and eligibility in your region.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <p className="truncate rounded bg-muted px-3 py-2 font-mono text-xs">{url}</p>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-external">Stay here</AlertDialogCancel>
            <AlertDialogAction
              data-testid="button-confirm-external"
              onClick={() => window.open(url, "_blank", "noopener,noreferrer")}
              className="bg-primary text-primary-foreground"
            >
              Continue to Kalshi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function ErrorPanel({ title = "The feed dropped the ball", onRetry, retrying }: { title?: string; onRetry: () => void; retrying?: boolean }) {
  return (
    <div className="stripes rounded-lg border-2 border-dashed border-destructive/60 p-10 text-center">
      <AlertTriangle className="mx-auto h-8 w-8 text-destructive" />
      <h3 className="mt-3 font-display text-3xl font-black uppercase">{title}</h3>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">We couldn't reach the market data. This is usually brief — try again in a moment.</p>
      <button
        onClick={onRetry}
        data-testid="button-retry"
        className="mt-5 inline-flex items-center gap-2 rounded-md border-2 border-foreground bg-card px-4 py-2 text-sm font-bold uppercase transition-all hover:-translate-y-0.5 hover:shadow-[3px_3px_0_hsl(var(--foreground))]"
      >
        <RotateCw className={`h-4 w-4 ${retrying ? "animate-spin" : ""}`} /> Retry
      </button>
    </div>
  );
}
