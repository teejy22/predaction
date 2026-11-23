import { useMemo, useState } from "react";
import { Link2 } from "lucide-react";
import { usePageMeta } from "@/lib/meta";
import {
  BETS, CATEGORIES, DEPOSITS, EXCHANGE_NAME, IS_SAMPLE_PORTFOLIO, type Bet, type Category, type Exchange,
  cost, equityCurve, profit, summarize, worth,
} from "@/lib/portfolio-data";
import { EquityChart } from "@/components/portfolio/equity-chart";
import { BetRow } from "@/components/portfolio/bet-row";
import { CATEGORY_COLOR, money, money0, signedMoney, signedPct, tone } from "@/components/portfolio/fmt";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const RANGES = [{ key: "1W", days: 7, label: "past week" }, { key: "1M", days: 30, label: "past month" }, { key: "3M", days: 90, label: "past 3 months" }, { key: "All", days: 180, label: "since you started" }] as const;
type RangeKey = typeof RANGES[number]["key"];
type Account = "all" | Exchange;
type Sort = "value" | "gain" | "date";
const EXCHANGES: Exchange[] = ["kalshi", "polymarket"];

const card = "rounded-xl border border-border bg-card/70 p-5 sm:p-6";
const seg = (active: boolean) => `rounded-md px-3 py-1.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`;

function Stat({ label, value, accent, testId }: { label: string; value: string; accent?: string; testId: string }) {
  return <div><p className="text-xs text-muted-foreground">{label}</p><p className={`mt-1 font-mono text-lg font-semibold tabular ${accent ?? ""}`} data-testid={testId}>{value}</p></div>;
}

export default function PortfolioPage() {
  usePageMeta("Portfolio | Prediction Pro", "Every Kalshi and Polymarket bet in one place: open positions, results and performance by category.");
  const [account, setAccount] = useState<Account>("all");
  const [range, setRange] = useState<RangeKey>("1M");
  const [category, setCategory] = useState<Category | "all">("all");
  const [tab, setTab] = useState<"open" | "settled">("open");
  const [sort, setSort] = useState<Sort>("value");
  const [shown, setShown] = useState(10);

  const exchanges = useMemo(() => account === "all" ? EXCHANGES : [account], [account]);
  const bets = useMemo(() => BETS.filter((bet) => exchanges.includes(bet.exchange)), [exchanges]);
  const total = useMemo(() => summarize(bets, exchanges), [bets, exchanges]);
  const curve = useMemo(() => equityCurve(bets, exchanges), [bets, exchanges]);
  const picked = RANGES.find((item) => item.key === range)!;
  const points = curve.slice(-(picked.days + 1));
  const start = points[0]?.value ?? total.total;
  const change = total.total - start;

  const byCategory = useMemo(() => CATEGORIES.map((name) => {
    const list = bets.filter((bet) => bet.category === name);
    const open = list.filter((bet) => bet.status === "open"), done = list.filter((bet) => bet.status !== "open");
    return {
      name, open: open.length, exposure: open.reduce((sum, bet) => sum + worth(bet), 0),
      gain: list.reduce((sum, bet) => sum + profit(bet), 0),
      wins: done.filter((bet) => profit(bet) > 0).length, losses: done.filter((bet) => profit(bet) <= 0).length,
    };
  }).filter((row) => row.open || row.wins || row.losses), [bets]);
  const exposure = byCategory.reduce((sum, row) => sum + row.exposure, 0);

  const settled = bets.filter((bet) => bet.status !== "open");
  const best = settled.reduce<Bet | undefined>((top, bet) => !top || profit(bet) > profit(top) ? bet : top, undefined);
  const worst = settled.reduce<Bet | undefined>((low, bet) => !low || profit(bet) < profit(low) ? bet : low, undefined);
  const recent = [...settled].sort((a, b) => a.endDays - b.endDays);
  const streakWon = recent[0] ? profit(recent[0]) > 0 : true;
  const streak = recent.findIndex((bet) => (profit(bet) > 0) !== streakWon);
  const streakLength = streak < 0 ? recent.length : streak;

  const list = useMemo(() => {
    const rows = bets.filter((bet) => (tab === "open") === (bet.status === "open") && (category === "all" || bet.category === category));
    if (sort === "gain") rows.sort((a, b) => profit(b) - profit(a));
    else if (sort === "date") rows.sort((a, b) => a.endDays - b.endDays);
    else rows.sort((a, b) => (tab === "open" ? worth(b) - worth(a) : cost(b) - cost(a)));
    return rows;
  }, [bets, tab, category, sort]);
  const pick = (next: Category | "all") => { setCategory(next); setShown(10); };

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-6 md:py-10" data-testid="page-portfolio">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Portfolio</h1>
          {IS_SAMPLE_PORTFOLIO && <span className="rounded bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground" data-testid="status-sample-portfolio">Sample data</span>}
        </div>
        <Dialog>
          <DialogTrigger className="inline-flex items-center gap-2 rounded-md bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background" data-testid="button-connect-accounts"><Link2 className="h-4 w-4" />Connect accounts</DialogTrigger>
          <DialogContent className="border-border bg-popover sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display text-xl">Connect accounts</DialogTitle>
              <DialogDescription>Account linking is not available yet. This page shows a sample portfolio so you can see how it will work.</DialogDescription>
            </DialogHeader>
            <ul className="divide-y divide-border/60 border-t border-border/60">
              {EXCHANGES.map((exchange) => (
                <li key={exchange} className="flex items-center justify-between gap-4 py-3.5">
                  <div><p className="text-sm font-semibold">{EXCHANGE_NAME[exchange]}</p><p className="mt-0.5 text-xs text-muted-foreground">Read-only: bets, balance and history</p></div>
                  <button type="button" disabled className="rounded-md border border-border px-3 py-1.5 text-sm font-semibold text-muted-foreground" data-testid={`button-connect-${exchange}`}>Coming soon</button>
                </li>
              ))}
            </ul>
          </DialogContent>
        </Dialog>
      </header>

      <div className="mt-5 inline-flex gap-1 rounded-lg border border-border bg-card p-1" role="group" aria-label="Account">
        {(["all", ...EXCHANGES] as Account[]).map((value) => <button key={value} type="button" onClick={() => setAccount(value)} aria-pressed={account === value} className={seg(account === value)} data-testid={`button-account-${value}`}>{value === "all" ? "All accounts" : EXCHANGE_NAME[value]}</button>)}
      </div>

      <section className={`${card} mt-4`} aria-label="Account value">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
          <div>
            <p className="font-display text-4xl font-bold tracking-tight tabular sm:text-5xl" data-testid="text-portfolio-total">{money(total.total)}</p>
            <p className="mt-2 text-sm text-muted-foreground"><span className={`font-mono font-semibold tabular ${tone(change)}`} data-testid="text-portfolio-change">{signedMoney(change)} ({signedPct(start ? (change / start) * 100 : 0)})</span> {picked.label}</p>
          </div>
          <div className="inline-flex gap-1" role="group" aria-label="Time range">
            {RANGES.map((item) => <button key={item.key} type="button" onClick={() => setRange(item.key)} aria-pressed={range === item.key} className={`rounded-md px-2.5 py-1.5 font-mono text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${range === item.key ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"}`} data-testid={`button-range-${item.key}`}>{item.key}</button>)}
          </div>
        </div>
        <div className="mt-5"><EquityChart points={points} /></div>
        <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-border/60 pt-5 sm:grid-cols-3 lg:grid-cols-6">
          <Stat label="In open bets" value={money0(total.openValue)} testId="stat-open-value" />
          <Stat label="Cash" value={money0(total.cash)} testId="stat-cash" />
          <Stat label="All-time profit" value={signedMoney(total.total - total.deposits, true)} accent={tone(total.total - total.deposits)} testId="stat-profit" />
          <Stat label="Return on settled bets" value={signedPct(total.staked ? (total.realized / total.staked) * 100 : 0)} accent={tone(total.realized)} testId="stat-roi" />
          <Stat label="Record" value={`${total.wins}–${total.losses}`} testId="stat-record" />
          <Stat label="Win rate" value={`${total.wins + total.losses ? Math.round((total.wins / (total.wins + total.losses)) * 100) : 0}%`} testId="stat-win-rate" />
        </div>
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <section className={card} aria-labelledby="portfolio-categories">
          <h2 id="portfolio-categories" className="font-display text-lg font-bold tracking-tight">By category</h2>
          {exposure > 0 && <div className="mt-4 flex h-2.5 gap-0.5 overflow-hidden rounded-full" aria-hidden="true">
            {byCategory.filter((row) => row.exposure > 0).map((row) => <div key={row.name} className="h-full transition-[width,opacity] duration-500" style={{ width: `${(row.exposure / exposure) * 100}%`, background: CATEGORY_COLOR[row.name], opacity: category === "all" || category === row.name ? 1 : 0.3 }} />)}
          </div>}
          <ul className="mt-3 divide-y divide-border/60">
            {byCategory.map((row) => {
              const active = category === row.name;
              return (
                <li key={row.name}>
                  <button type="button" onClick={() => pick(active ? "all" : row.name)} aria-pressed={active} className={`-mx-2 grid w-[calc(100%+1rem)] grid-cols-[minmax(0,1fr)_auto_4.5rem] items-center gap-3 rounded-md px-2 py-3 text-left transition-colors hover:bg-foreground/[.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary ${active ? "bg-foreground/[.06]" : ""}`} data-testid={`button-category-${row.name.toLowerCase()}`}>
                    <span className="min-w-0">
                      <span className="flex items-center gap-2 text-sm font-semibold"><span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: CATEGORY_COLOR[row.name] }} />{row.name}</span>
                      <span className="mt-0.5 block pl-[1.125rem] text-xs text-muted-foreground">{row.open} open · {row.wins}–{row.losses} settled</span>
                    </span>
                    <span className="text-right font-mono text-sm tabular text-foreground/85">{money0(row.exposure)}{exposure > 0 && <span className="ml-1.5 text-xs text-muted-foreground">{Math.round((row.exposure / exposure) * 100)}%</span>}</span>
                    <span className={`text-right font-mono text-sm font-semibold tabular ${tone(row.gain)}`}>{signedMoney(row.gain, true)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">Dollar figure is what your open bets are worth now. The colored figure is profit or loss, open and settled. Tap a category to filter your bets.</p>
        </section>

        <section className={card} aria-labelledby="portfolio-highlights">
          <h2 id="portfolio-highlights" className="font-display text-lg font-bold tracking-tight">Highlights</h2>
          <dl className="mt-2 divide-y divide-border/60">
            {best && <div className="py-3"><dt className="text-xs text-muted-foreground">Best result</dt><dd className="mt-1 flex items-baseline justify-between gap-3"><span className="min-w-0 truncate text-sm font-semibold">{best.side}</span><span className={`shrink-0 font-mono text-sm font-semibold tabular ${tone(profit(best))}`}>{signedMoney(profit(best))}</span></dd><dd className="truncate text-xs text-muted-foreground">{best.market}</dd></div>}
            {worst && <div className="py-3"><dt className="text-xs text-muted-foreground">Worst result</dt><dd className="mt-1 flex items-baseline justify-between gap-3"><span className="min-w-0 truncate text-sm font-semibold">{worst.side}</span><span className={`shrink-0 font-mono text-sm font-semibold tabular ${tone(profit(worst))}`}>{signedMoney(profit(worst))}</span></dd><dd className="truncate text-xs text-muted-foreground">{worst.market}</dd></div>}
            {recent.length > 0 && <div className="py-3"><dt className="text-xs text-muted-foreground">Current streak</dt><dd className="mt-1 text-sm font-semibold">{streakLength} {streakWon ? (streakLength === 1 ? "win" : "wins") : (streakLength === 1 ? "loss" : "losses")} in a row</dd></div>}
            <div className="py-3"><dt className="text-xs text-muted-foreground">Average stake</dt><dd className="mt-1 font-mono text-sm font-semibold tabular">{money(total.avgStake)}</dd></div>
            {account === "all" && <div className="py-3"><dt className="text-xs text-muted-foreground">Deposited</dt><dd className="mt-1 text-sm"><span className="font-mono font-semibold tabular">{money0(total.deposits)}</span> <span className="text-xs text-muted-foreground">{EXCHANGES.map((exchange) => `${EXCHANGE_NAME[exchange]} ${money0(DEPOSITS[exchange])}`).join(" · ")}</span></dd></div>}
          </dl>
        </section>
      </div>

      <section className={`${card} mt-4`} aria-label="Your bets">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex gap-1 rounded-lg border border-border bg-background/50 p-1" role="tablist" aria-label="Bets">
            {(["open", "settled"] as const).map((value) => {
              const count = bets.filter((bet) => (value === "open") === (bet.status === "open")).length;
              return <button key={value} type="button" role="tab" aria-selected={tab === value} onClick={() => { setTab(value); setShown(10); setSort(value === "open" ? "value" : "date"); }} className={seg(tab === value)} data-testid={`tab-bets-${value}`}>{value === "open" ? "Open" : "Settled"} <span className="font-mono text-xs opacity-80">{count}</span></button>;
            })}
          </div>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">Sort
            <select value={sort} onChange={(event) => setSort(event.target.value as Sort)} className="h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" data-testid="select-bet-sort">
              <option value="value">{tab === "open" ? "Largest value" : "Largest stake"}</option>
              <option value="gain">Best profit</option>
              <option value="date">{tab === "open" ? "Closing soonest" : "Most recent"}</option>
            </select>
          </label>
        </div>
        <div className="-mx-1 mt-3 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="group" aria-label="Category">
          {(["all", ...byCategory.map((row) => row.name)] as (Category | "all")[]).map((value) => <button key={value} type="button" onClick={() => pick(value)} aria-pressed={category === value} className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${category === value ? "border-primary bg-primary/15 text-foreground" : "border-border text-muted-foreground hover:text-foreground"}`} data-testid={`chip-category-${value.toLowerCase()}`}>{value === "all" ? "All" : value}</button>)}
        </div>
        {list.length ? <>
          <ul className="mt-2 divide-y divide-border/60">{list.slice(0, shown).map((bet) => <BetRow key={bet.id} bet={bet} />)}</ul>
          {list.length > shown && <button type="button" onClick={() => setShown((count) => count + 10)} className="mt-2 w-full rounded-md border border-border py-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" data-testid="button-more-bets">Show more ({list.length - shown} left)</button>}
        </> : <p className="mt-4 py-8 text-center text-sm text-muted-foreground">No {tab} bets{category === "all" ? "" : ` in ${category}`}{account === "all" ? "" : ` on ${EXCHANGE_NAME[account]}`}.</p>}
      </section>

      {IS_SAMPLE_PORTFOLIO && <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">Every number, bet and result on this page is made-up sample data. No Kalshi or Polymarket account is connected.</p>}
    </div>
  );
}
