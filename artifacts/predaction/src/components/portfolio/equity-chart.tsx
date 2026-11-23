import { Area, AreaChart, ResponsiveContainer, Tooltip, YAxis } from "recharts";
import { dayFromOffset } from "@/lib/portfolio-data";
import { money, shortDate } from "./fmt";

type Point = { daysAgo: number; value: number };

function Tip({ active, payload }: { active?: boolean; payload?: { payload: Point }[] }) {
  const point = active ? payload?.[0]?.payload : undefined;
  if (!point) return null;
  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2">
      <p className="font-mono text-sm font-semibold tabular">{money(point.value)}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{point.daysAgo === 0 ? "Today" : shortDate(dayFromOffset(-point.daysAgo))}</p>
    </div>
  );
}

export function EquityChart({ points }: { points: Point[] }) {
  const values = points.map((point) => point.value);
  const low = Math.min(...values), high = Math.max(...values), pad = Math.max(20, (high - low) * 0.15);
  const first = points[0], last = points[points.length - 1];
  return (
    <div data-testid="chart-portfolio-value">
      <div className="h-48 sm:h-64" role="img" aria-label={`Account value from ${money(first?.value ?? 0)} to ${money(last?.value ?? 0)}`}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={points} margin={{ top: 6, right: 0, bottom: 0, left: 0 }}>
            <YAxis hide domain={[low - pad, high + pad]} />
            <Tooltip content={<Tip />} cursor={{ stroke: "hsl(var(--border))", strokeWidth: 1 }} />
            <Area type="monotone" dataKey="value" stroke="hsl(var(--primary-readable))" strokeWidth={2} fill="hsl(var(--primary))" fillOpacity={0.14} dot={false} activeDot={{ r: 4, strokeWidth: 0, fill: "hsl(var(--primary-readable))" }} animationDuration={500} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex justify-between font-mono text-[11px] text-muted-foreground">
        <span>{first ? shortDate(dayFromOffset(-first.daysAgo)) : ""}</span><span>Today</span>
      </div>
    </div>
  );
}
