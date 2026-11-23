// Sample portfolio for the Portfolio page. Nothing here comes from a real account: account linking is not built yet.
// Dates are stored as day offsets so the sample always looks current.
export const IS_SAMPLE_PORTFOLIO = true;

export type Exchange = "kalshi" | "polymarket";
export type Category = "Sports" | "Politics" | "Economics" | "Crypto" | "Culture";
export const CATEGORIES: Category[] = ["Sports", "Politics", "Economics", "Crypto", "Culture"];
export const EXCHANGE_NAME: Record<Exchange, string> = { kalshi: "Kalshi", polymarket: "Polymarket" };
// Money put into each account at the start of the sample period.
export const DEPOSITS: Record<Exchange, number> = { kalshi: 3000, polymarket: 2500 };
export const HISTORY_DAYS = 180;

export type Bet = {
  id: string; exchange: Exchange; category: Category; market: string; side: string;
  shares: number;
  // Prices are cents per $1 contract. `price` is the current price for an open bet, or the price it ended at.
  avg: number; price: number;
  status: "open" | "won" | "lost" | "sold";
  openedDaysAgo: number;
  // Open bets: days until the market closes. Settled bets: days since it ended.
  endDays: number;
};

type Row = [Exchange, Category, string, string, number, number, number | "W" | "L", number, number];
const K = "kalshi", P = "polymarket";

const OPEN: Row[] = [
  [K, "Sports", "Chiefs at Bills", "Bills to win", 300, 54, 58, 2, 3],
  [P, "Sports", "Super Bowl LXI champion", "Lions", 400, 11, 14, 61, 76],
  [K, "Sports", "Ohio State at Michigan", "Ohio State -6.5", 200, 52, 49, 3, 5],
  [P, "Sports", "2027 NBA champion", "Thunder", 250, 24, 27, 34, 205],
  [K, "Sports", "Lakers at Nuggets", "Over 224.5", 150, 50, 53, 1, 1],
  [P, "Politics", "2028 Democratic nominee", "Newsom", 500, 22, 19, 88, 640],
  [K, "Politics", "Government shutdown before February", "No", 300, 71, 76, 12, 69],
  [K, "Economics", "Fed decision in December", "Cut 25 bps", 400, 62, 68, 9, 16],
  [K, "Economics", "November CPI, year over year", "Above 3.0%", 200, 41, 37, 6, 17],
  [P, "Crypto", "Bitcoin above $150K on Dec 31", "No", 350, 66, 72, 20, 38],
  [P, "Crypto", "Ethereum above $6K on Dec 31", "Yes", 300, 18, 12, 27, 38],
  [K, "Culture", "TIME Person of the Year", "Artificial intelligence", 200, 28, 33, 15, 17],
];

const SETTLED: Row[] = [
  [K, "Sports", "Eagles at Cowboys", "Eagles to win", 250, 58, "W", 3, 1],
  [K, "Sports", "Ravens at Steelers", "Under 43.5", 200, 51, "L", 4, 2],
  [P, "Sports", "Alabama at Auburn", "Alabama -9.5", 180, 50, "W", 10, 8],
  [K, "Economics", "October CPI, year over year", "Above 2.9%", 300, 46, "W", 22, 11],
  [P, "Crypto", "Bitcoin above $120K on Nov 15", "Yes", 250, 63, "W", 30, 8],
  [K, "Sports", "Celtics at Knicks", "Knicks to win", 220, 47, "L", 13, 12],
  [P, "Politics", "House control after the midterms", "Democrats", 400, 61, "W", 75, 19],
  [K, "Politics", "Senate control after the midterms", "Democrats", 300, 33, "L", 60, 19],
  [K, "Sports", "World Series champion", "Dodgers", 300, 31, 55, 70, 30],
  [P, "Sports", "Packers at Vikings", "Packers +3.5", 200, 52, "W", 24, 22],
  [K, "Sports", "Georgia at Texas", "Over 51.5", 160, 49, "L", 31, 29],
  [K, "Economics", "Fed decision in October", "Hold", 500, 74, "W", 48, 27],
  [P, "Culture", "Top film at the Thanksgiving box office", "Wicked: Part Three", 150, 44, 61, 18, 4],
  [P, "Crypto", "Solana above $300 on Oct 31", "Yes", 300, 35, "L", 50, 23],
  [K, "Sports", "49ers at Seahawks", "49ers to win", 240, 56, "W", 38, 36],
  [K, "Sports", "Lions at Bears", "Lions -4.5", 200, 53, "L", 45, 43],
  [P, "Sports", "US Open men's champion", "Alcaraz", 200, 38, "W", 95, 77],
  [K, "Politics", "Supreme Court vacancy before October", "No", 400, 82, "W", 110, 54],
  [K, "Economics", "September jobs report", "Above 150K", 250, 44, "L", 58, 51],
  [P, "Sports", "Bills at Dolphins", "Bills to win", 300, 64, "W", 59, 57],
  [K, "Sports", "Notre Dame at USC", "USC +7.5", 180, 51, "W", 66, 64],
  [P, "Culture", "Emmys: Outstanding Drama Series", "Severance", 200, 41, "L", 100, 70],
  [K, "Sports", "Chiefs at Chargers", "Under 47.5", 220, 50, "L", 73, 71],
  [P, "Crypto", "Bitcoin above $130K on Sep 30", "No", 300, 58, "W", 90, 54],
  [K, "Economics", "Fed decision in September", "Cut 25 bps", 400, 67, "W", 99, 68],
  [K, "Sports", "Yankees at Red Sox", "Yankees to win", 200, 55, "L", 86, 85],
  [P, "Sports", "Cowboys at Giants", "Over 44.5", 180, 52, "W", 80, 78],
  [K, "Politics", "Debt ceiling raised before September", "Yes", 300, 59, 78, 130, 96],
  [P, "Sports", "WNBA champion", "Liberty", 250, 29, "L", 120, 45],
  [K, "Sports", "Open Championship winner", "Scheffler", 150, 21, "W", 140, 127],
  [K, "Economics", "July CPI, year over year", "Below 3.0%", 300, 52, "L", 118, 103],
  [P, "Politics", "New York City mayoral primary winner", "Mamdani", 350, 48, "W", 170, 152],
  [P, "Crypto", "Ethereum above $4K on Jul 31", "Yes", 250, 55, "W", 160, 115],
  [K, "Sports", "NBA Finals MVP", "Gilgeous-Alexander", 200, 43, "W", 175, 158],
];

function build(rows: Row[], open: boolean): Bet[] {
  return rows.map(([exchange, category, market, side, shares, avg, end, openedDaysAgo, endDays], index) => ({
    id: `${open ? "o" : "s"}${index}`, exchange, category, market, side, shares, avg,
    price: end === "W" ? 100 : end === "L" ? 0 : end,
    status: open ? "open" : end === "W" ? "won" : end === "L" ? "lost" : "sold",
    openedDaysAgo, endDays,
  }));
}

export const BETS: Bet[] = [...build(OPEN, true), ...build(SETTLED, false)];

export const cost = (bet: Bet) => (bet.shares * bet.avg) / 100;
export const worth = (bet: Bet) => (bet.shares * bet.price) / 100;
export const profit = (bet: Bet) => worth(bet) - cost(bet);

export type Summary = {
  total: number; cash: number; openValue: number; openCost: number; unrealized: number; realized: number;
  deposits: number; wins: number; losses: number; staked: number; avgStake: number;
};

export function summarize(bets: Bet[], exchanges: Exchange[]): Summary {
  const open = bets.filter((bet) => bet.status === "open"), done = bets.filter((bet) => bet.status !== "open");
  const sum = (list: Bet[], of: (bet: Bet) => number) => list.reduce((total, bet) => total + of(bet), 0);
  const deposits = exchanges.reduce((total, exchange) => total + DEPOSITS[exchange], 0);
  const realized = sum(done, profit), openCost = sum(open, cost), openValue = sum(open, worth);
  const cash = deposits + realized - openCost;
  return {
    total: cash + openValue, cash, openValue, openCost, unrealized: openValue - openCost, realized, deposits,
    wins: done.filter((bet) => profit(bet) > 0).length, losses: done.filter((bet) => profit(bet) <= 0).length,
    staked: sum(done, cost), avgStake: bets.length ? sum(bets, cost) / bets.length : 0,
  };
}

// Account value at the end of each day, oldest first. Settled bets count from the day they ended; an open bet's
// gain or loss is spread evenly over the days it has been held.
export function equityCurve(bets: Bet[], exchanges: Exchange[]): { daysAgo: number; value: number }[] {
  const deposits = exchanges.reduce((total, exchange) => total + DEPOSITS[exchange], 0);
  const points = [];
  for (let daysAgo = HISTORY_DAYS; daysAgo >= 0; daysAgo--) {
    let value = deposits;
    for (const bet of bets) {
      if (bet.status !== "open") { if (bet.endDays >= daysAgo) value += profit(bet); }
      else if (bet.openedDaysAgo > daysAgo) value += profit(bet) * (1 - daysAgo / bet.openedDaysAgo);
    }
    points.push({ daysAgo, value: Math.round(value * 100) / 100 });
  }
  return points;
}

export const dayFromOffset = (daysFromNow: number) => new Date(Date.now() + daysFromNow * 86_400_000);
