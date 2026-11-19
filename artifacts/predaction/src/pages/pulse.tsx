import { usePageMeta } from "@/lib/meta";
import { useFlowframeData } from "@/components/flowframe-data";
import { FeedStatus, FlowframeAttribution } from "@/components/flowframe-feed-ui";
import { PulseList } from "@/components/flowframe-lists";

export default function PulsePage() {
  usePageMeta("Pulse | Prediction Pro", "Sourced FlowFrame publication updates with source dates and original links.");
  const query = useFlowframeData();
  const data = query.data;
  const retry = () => { void query.refetch(); };
  return <main className="mx-auto max-w-5xl px-4 py-8 md:px-6 md:py-12">
    <header className="mb-7 border-b border-border pb-6">
      <h1 className="font-display text-4xl font-bold tracking-[-.055em] sm:text-5xl">Pulse updates</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">Editorial publications and source dates, kept distinct from market-price timestamps.</p>
    </header>
    <section className="rounded-lg border border-border bg-card/50 p-4 sm:p-6" aria-label="Published intelligence updates">
      <FeedStatus feed={data?.pulse} loading={query.isLoading} error={query.isError && !data} retrying={query.isFetching} onRetry={retry}>
        <PulseList items={data?.pulse.items ?? []} />
      </FeedStatus>
    </section>
    <div className="mt-6"><FlowframeAttribution refreshMinutes={data?.refreshMinutes ?? 20} /></div>
  </main>;
}
