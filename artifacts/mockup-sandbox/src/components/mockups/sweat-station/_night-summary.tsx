import { pnlOf, valueOf, type LiveGame } from "./_data";
import { signedUsd, tone, usd } from "./_fmt";

export function NightSummary({ games }: { games: LiveGame[] }) {
  const risk = games.reduce((s, g) => s + g.bet.stake, 0);
  const value = games.reduce((s, g) => s + valueOf(g), 0);
  const swing = value - risk;
  const up = games.filter((g) => pnlOf(g) > 0).length;
  const stat = (label: string, v: string, cls = "text-foreground", id = "") => (
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`font-display text-2xl font-bold leading-tight tabular sm:text-3xl ${cls}`} data-testid={`text-summary-${id}`}>{v}</p>
    </div>
  );
  return (
    <section aria-label="Night summary" className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
      {stat("At risk", usd(risk), undefined, "risk")}
      {stat("Worth now", usd(value), undefined, "value")}
      {stat("Swing", signedUsd(swing), tone(swing), "swing")}
      {stat("Winning", `${up} of ${games.length}`, undefined, "winning")}
    </section>
  );
}
