import { type Bet, EXCHANGE_NAME, cost, dayFromOffset, profit, worth } from "@/lib/portfolio-data";
import { CATEGORY_COLOR, money, shortDate, signedMoney, signedPct, tone } from "./fmt";

const RESULT = { won: "Won", lost: "Lost", sold: "Sold early" } as const;

function closes(days: number) {
  if (days <= 0) return "Closes today";
  if (days === 1) return "Closes tomorrow";
  if (days < 14) return `Closes in ${days} days`;
  return `Closes ${shortDate(dayFromOffset(days))}`;
}

export function BetRow({ bet }: { bet: Bet }) {
  const open = bet.status === "open";
  const gain = profit(bet), paid = cost(bet);
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1 py-3.5" data-testid={`row-bet-${bet.id}`}>
      <div className="min-w-0">
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full" style={{ background: CATEGORY_COLOR[bet.category] }} />
          <span className="truncate">{bet.category} · {EXCHANGE_NAME[bet.exchange]}</span>
        </p>
        <p className="mt-1 text-[15px] font-semibold leading-snug">{bet.side}</p>
        <p className="mt-0.5 truncate text-sm text-muted-foreground">{bet.market}</p>
      </div>
      <div className="text-right">
        <p className="font-mono text-[15px] font-bold tabular">{money(worth(bet))}</p>
        <p className={`mt-0.5 font-mono text-xs tabular ${tone(gain)}`}>{signedMoney(gain)} · {signedPct(paid ? (gain / paid) * 100 : 0)}</p>
      </div>
      <p className="col-span-2 flex flex-wrap gap-x-3 font-mono text-[11px] text-muted-foreground">
        <span>{bet.shares} × {bet.avg}¢</span>
        {open ? <><span>now {bet.price}¢</span><span>{closes(bet.endDays)}</span></>
          : <><span>{RESULT[bet.status as keyof typeof RESULT]}{bet.status === "sold" ? ` at ${bet.price}¢` : ""}</span><span>{shortDate(dayFromOffset(-bet.endDays))}</span></>}
      </p>
    </li>
  );
}
