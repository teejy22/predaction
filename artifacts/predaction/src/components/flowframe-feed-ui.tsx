import { type ReactNode } from "react";
import { ExternalLink, RotateCw } from "lucide-react";
import type { FlowframeFeed, FlowframeItem } from "@workspace/api-client-react";
import { externalHref, formatSourceTime } from "@/components/flowframe-data";

export function FeedStatus({ feed, loading, error, retrying, onRetry, children }: {
  feed?: FlowframeFeed;
  loading: boolean;
  error: boolean;
  retrying: boolean;
  onRetry: () => void;
  children: ReactNode;
}) {
  if (loading) return <div className="mt-4 space-y-2" aria-busy="true" aria-label="Loading source feed">
    {[0, 1, 2].map((i) => <div key={i} className="h-[68px] animate-pulse rounded-md border border-border/70 bg-card/70" />)}
  </div>;
  if (error || !feed) return <FeedMessage title="Couldn’t load this feed" message="The FlowFrame response is temporarily unavailable." retrying={retrying} onRetry={onRetry} />;

  const unavailable = feed.status === "unavailable" || feed.status === "unconfigured";
  const label = feed.status === "ready" ? "Current source data" : feed.status === "stale" ? "Stale source data" : feed.status === "unconfigured" ? "Source not configured" : "Source unavailable";
  const timestamp = feed.fetchedAt || feed.checkedAt;
  return <div className="mt-4">
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <span className={`inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-wider ${feed.status === "ready" ? "text-emerald-200" : feed.status === "stale" ? "text-amber-200" : "text-muted-foreground"}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${feed.status === "ready" ? "bg-emerald-300" : feed.status === "stale" ? "bg-amber-300" : "bg-muted-foreground"}`} />{label}
      </span>
      <span className="font-mono text-[9px] text-muted-foreground">{timestamp ? `${feed.fetchedAt ? "Fetched" : "Checked"} ${formatSourceTime(timestamp)}` : "No source timestamp"}</span>
    </div>
    {feed.status === "stale" && feed.fetchedAt && <p className="mb-3 text-[10px] leading-4 text-amber-100/80">Showing the last successful source data from {formatSourceTime(feed.fetchedAt)}.</p>}
    {unavailable ? <FeedMessage title={feed.status === "unconfigured" ? "Not connected yet" : "Source is unavailable"} message={feed.message || "The source could not provide data."} retrying={retrying} onRetry={onRetry} compact /> :
      feed.items.length ? children : <div className="rounded-md border border-dashed border-border/80 px-3 py-5 text-xs text-muted-foreground">{feed.message || "No items are available in this feed yet."}</div>}
    {!unavailable && feed.message && feed.items.length > 0 && <p className="mt-2 text-[10px] leading-4 text-muted-foreground">{feed.message}</p>}
    <button type="button" onClick={onRetry} disabled={retrying} className="mt-3 inline-flex items-center gap-1.5 rounded border border-border px-2.5 py-1.5 text-[10px] font-semibold text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
      <RotateCw className={`h-3 w-3 ${retrying ? "animate-spin" : ""}`} /> Retry feed
    </button>
  </div>;
}

function FeedMessage({ title, message, retrying, onRetry, compact = false }: { title: string; message: string; retrying: boolean; onRetry: () => void; compact?: boolean }) {
  return <div className={`rounded-md border border-dashed border-border ${compact ? "px-3 py-3" : "px-4 py-5"}`}>
    <p className="text-xs font-semibold">{title}</p><p className="mt-1 text-[11px] leading-4 text-muted-foreground">{message}</p>
    {!compact && <button onClick={onRetry} disabled={retrying} className="mt-3 inline-flex items-center gap-1.5 rounded border border-border px-2.5 py-1.5 text-[10px] font-semibold hover:border-primary/60 disabled:opacity-60"><RotateCw className="h-3 w-3" />Try again</button>}
  </div>;
}

export function SourceLink({ item, testId, children }: { item: FlowframeItem; testId: string; children: ReactNode }) {
  const href = externalHref(item.url);
  return href
    ? <a href={href} target="_blank" rel="noopener noreferrer" data-testid={testId} className="group inline-flex max-w-full items-start gap-1.5 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">{children}<ExternalLink aria-hidden="true" className="mt-1 h-3 w-3 shrink-0 opacity-50" /></a>
    : <span data-testid={testId} className="inline-block">{children}<span className="mt-1 block text-[10px] font-medium text-muted-foreground">Source link unavailable</span></span>;
}

export function FlowframeAttribution({ refreshMinutes = 20 }: { refreshMinutes?: number }) {
  return <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-border/80 pt-3 text-[10px] text-muted-foreground">
    <a href="https://flowframe.xyz" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-foreground/80 underline decoration-primary/60 underline-offset-4 hover:text-primary" data-testid="link-flowframe-attribution">
      Powered by FlowFrame <ExternalLink className="h-3 w-3" />
    </a>
    <span>Source data is cached for up to {refreshMinutes} minutes; this page checks every 60 seconds.</span>
  </footer>;
}
