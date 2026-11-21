const UP = "hsl(var(--chart-2))";
const DOWN = "hsl(var(--destructive))";

export function PriceLine({ history, entry, height = 72 }: { history: number[]; entry: number; height?: number }) {
  const lo = Math.max(0, Math.min(entry, ...history) - 4);
  const hi = Math.min(100, Math.max(entry, ...history) + 4);
  const span = hi - lo || 1;
  const w = 300;
  const y = (v: number) => ((hi - v) / span) * height;
  const step = w / Math.max(1, history.length - 1);
  const d = history.map((v, i) => `${i ? "L" : "M"}${(i * step).toFixed(1)},${y(v).toFixed(1)}`).join("");
  const last = history[history.length - 1] ?? entry;
  const color = last >= entry ? UP : DOWN;
  return (
    <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" className="block w-full" style={{ height }} role="img" aria-label={`Price history, now ${last} cents, entry ${entry} cents`}>
      <line x1={0} x2={w} y1={y(entry)} y2={y(entry)} stroke="hsl(var(--muted-foreground))" strokeOpacity={0.5} strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />
      <path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" vectorEffect="non-scaling-stroke" style={{ transition: "stroke .4s" }} />
      <circle cx={w} cy={y(last)} r={3} fill={color} />
    </svg>
  );
}
