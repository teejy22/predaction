import { usePageMeta } from "@/lib/meta";

export default function ModelPage() {
  usePageMeta(
    "Prediction Pro | Geopolitics model trader view",
    "Explore the Geopolitics Model's mapped market anchors, model probabilities, and full trade analysis.",
  );
  return (
    <iframe
      src={`${import.meta.env.BASE_URL}model.html`}
      title="The Geopolitics Model trader view"
      className="block h-[calc(100dvh-3.5rem)] w-full border-0 bg-background"
    />
  );
}
