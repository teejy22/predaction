import "./_group.css";

// Extracted verbatim from the homepage's hero; only its API values are
// replaced with a fixed snapshot so the baseline remains comparable.
export function Current() {
  const stats = [
    { l: "Events indexed", v: "345" },
    { l: "Markets", v: "864" },
    { l: "Contracts traded", v: "338.5M" },
    { l: "Last 24h", v: "17.5M" },
  ];
  return (
    <div className="predaction-preview min-h-screen">
      <section className="relative overflow-hidden border-b-2 border-foreground">
        <div className="stripes absolute inset-0 opacity-60" />
        <div className="relative mx-auto grid max-w-7xl gap-8 px-4 py-12 md:grid-cols-[1.3fr_1fr] md:px-6 md:py-16">
          <div className="rise">
            <p className="inline-flex items-center gap-2 rounded-sm bg-foreground px-2 py-1 font-mono text-[11px] font-bold uppercase tracking-widest text-background">
              <span className="live-dot h-1.5 w-1.5 rounded-full bg-accent" /> Live board
              <span className="text-background/60">· updated 7 seconds ago</span>
            </p>
            <h1 className="mt-5 font-display text-6xl font-black uppercase leading-[0.85] md:text-8xl">
              Skip the hot takes.<br />
              <span className="text-primary">Read the price.</span>
            </h1>
            <p className="mt-5 max-w-lg text-base text-muted-foreground md:text-lg">
              Major sports markets on Kalshi, boiled down to what the crowd actually thinks. Filter by league, find the games closing soon, and save the ones you care about.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-px self-end overflow-hidden rounded-lg border-2 border-foreground bg-foreground">
            {stats.map((s, i) => (
              <div key={s.l} className="rise bg-card p-4" style={{ animationDelay: `${120 + i * 60}ms` }}>
                <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{s.l}</p>
                <p className="mt-1 font-display text-4xl font-black tabular">{s.v}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <p className="px-6 py-4 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Current design · static snapshot for comparison</p>
    </div>
  );
}
