import { getGetSharpWalletQueryKey, useGetSharpWallet } from "@workspace/api-client-react";
import { fmtDollars } from "@/components/sharps";
import { updatedLabel } from "@/lib/format";

const cents = (value: number) => `${value < 10 ? value.toFixed(1).replace(/\.0$/, "") : value.toFixed(0)}¢`;
const signed = (value: number) => `${value >= 0 ? "+" : "−"}${fmtDollars(Math.abs(value))}`;

// A leaderboard wallet's five largest open NFL and college football positions on Polymarket, loaded when its row is opened.
export function SharpWalletPositions({ wallet, profile }: { wallet: string; profile?: string }) {
  const query = useGetSharpWallet(wallet, {
    query: {
      queryKey: getGetSharpWalletQueryKey(wallet), retry: 1, staleTime: 60_000,
      // Positions load in the background on the server; keep asking until they arrive.
      refetchInterval: (q) => q.state.data && !q.state.data.loaded ? 8_000 : false,
    },
  });
  const data = query.data;
  const note = "text-xs leading-5 text-muted-foreground";
  return (
    <div className="border-t border-border/60 px-3 pb-4 pt-3 sm:px-4 sm:pl-[4.5rem]" data-testid={`panel-wallet-positions-${wallet}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="text-xs font-semibold">Top open football positions{data?.name ? <span className="font-normal text-muted-foreground"> · {data.name}</span> : null}</p>
        {profile && <a href={profile} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">Polymarket profile</a>}
      </div>
      {query.isLoading ? <p className={`mt-2 ${note}`}>Loading positions…</p>
        : query.isError || !data ? <p className={`mt-2 ${note}`}>Positions for this wallet could not be loaded right now.</p>
        : !data.loaded ? <p className={`mt-2 ${note}`}>Still reading this wallet's positions. This fills in within a minute or two.</p>
        : !data.positions.length ? <p className={`mt-2 ${note}`}>No open NFL or college football positions right now.</p>
        : <>
          <ol className="mt-1 divide-y divide-border/60">
            {data.positions.map((position, index) => {
              const title = <span className="line-clamp-2 text-sm font-medium leading-5">{position.title}</span>;
              return (
                <li key={`${position.title}-${position.outcome}-${index}`} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 py-2.5" data-testid={`row-wallet-position-${index}`}>
                  <div className="min-w-0">
                    {position.url ? <a href={position.url} target="_blank" rel="noopener noreferrer" className="hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">{title}</a> : title}
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground">{position.outcome}</span> · bought at {cents(position.avgPrice)}{position.price !== undefined ? ` · now ${cents(position.price)}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm font-bold tabular">{fmtDollars(position.value)}</p>
                    {position.pnl !== undefined && <p className={`mt-0.5 font-mono text-xs tabular ${position.pnl >= 0 ? "text-emerald-200" : "text-rose-200"}`}>{signed(position.pnl)}</p>}
                  </div>
                </li>
              );
            })}
          </ol>
          <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">Largest open NFL and college football positions on Polymarket by current value, including season-long bets. The colored figure is unrealized profit or loss.{data.updatedAt ? ` Checked ${updatedLabel(data.updatedAt)}.` : ""}</p>
        </>}
    </div>
  );
}
