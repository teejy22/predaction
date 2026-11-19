import { useEffect } from "react";
import { useLocation } from "wouter";
import { useGetOverview, getGetOverviewQueryKey } from "@workspace/api-client-react";
import { StepsGrid } from "@/components/how-it-works";
import { HomeDiscovery } from "@/components/home-discovery";
import { LiveStrip } from "@/components/live-strip";
import { fmtContracts, updatedLabel } from "@/lib/format";
import { usePageMeta } from "@/lib/meta";

export default function Home() {
  usePageMeta(
    "Prediction Pro | Browse open Kalshi events by category",
    "Browse open Kalshi events across politics, economics, sports, culture and more. Read crowd prices, close times and resolution rules.",
  );
  const [, navigate] = useLocation();
  // The full board used to live on this page; old filtered links still land in the right place.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const category = params.get("category") ?? "";
    if (params.get("sport") || params.get("league") || category === "Sports") {
      params.delete("category");
      navigate(`/sports?${params}`, { replace: true });
    } else if (category || params.get("q")) navigate(`/markets?${params}`, { replace: true });
  }, []);
  const overview = useGetOverview({ query: { queryKey: getGetOverviewQueryKey(), refetchInterval: 60000 } });

  return (
    <div>
      <div className="border-b border-border">
        <LiveStrip />
        <HomeDiscovery category="" onBrowse={(topic) => {
          navigate(topic === "Sports" ? "/sports" : topic ? `/markets?category=${encodeURIComponent(topic)}` : "/markets");
        }} />
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-5 gap-y-2 px-4 pb-4 font-mono text-[9px] uppercase tracking-wider text-muted-foreground md:px-6">
          <span data-testid="text-indexed-events">{overview.data ? `${overview.data.totalEvents.toLocaleString()} indexed events` : "Indexed event board"}</span>
          <span>{overview.data ? `${overview.data.totalMarkets.toLocaleString()} markets` : "Kalshi public data"}</span>
          <span>{overview.data ? `${fmtContracts(overview.data.volume24h)} contracts · 24h` : "Read-only discovery"}</span>
          {overview.data?.updatedAt && <span data-testid="text-updated-at">Index updated {updatedLabel(overview.data.updatedAt)}</span>}
          {overview.isError && <button className="text-primary underline" onClick={() => overview.refetch()} data-testid="button-retry-overview">Retry stats</button>}
        </div>
      </div>

      <section className="mx-auto mt-12 max-w-7xl px-4 md:px-6">
        <div className="grid gap-7 md:grid-cols-[.8fr_1.5fr]">
          <div>
            <h2 className="max-w-md text-3xl font-bold leading-tight tracking-[-.035em] sm:text-4xl">A price is a forecast with money behind it.</h2>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">Prediction Pro doesn't forecast anything itself. We surface what traders on Kalshi are already pricing, so you can see the consensus on real-world events at a glance.</p>
          </div>
          <StepsGrid />
        </div>
      </section>
    </div>
  );
}
