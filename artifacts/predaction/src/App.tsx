import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import Home from '@/pages/home';
import EventPage from '@/pages/event';
import Watchlist from '@/pages/watchlist';
import MoversPage from '@/pages/movers';
import TradersPage from '@/pages/traders';
import PulsePage from '@/pages/pulse';
import SmartMoneyPage from '@/pages/smart-money';
import FootballSharpsPage from '@/pages/football-sharps';
import SportsPage from '@/pages/sports';
import SportsGamePage from '@/pages/sports-game';
import ModelPage from '@/pages/model';
import { Shell } from '@/components/shell';
import {
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30000, refetchOnWindowFocus: false } } });

function Router() {
  return (
    // Keep a shared shell (sidebar, navbar) outside the boundary so it
    // survives a page crash.
    <Shell>
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/sports" component={SportsPage} />
        <Route path="/model" component={ModelPage} />
        <Route path="/sports/game/:key" component={SportsGamePage} />
        <Route path="/event/:ticker" component={EventPage} />
        <Route path="/watchlist" component={Watchlist} />
        <Route path="/movers" component={MoversPage} />
        <Route path="/traders" component={TradersPage} />
        <Route path="/pulse" component={PulsePage} />
        <Route path="/tools/smart-money" component={SmartMoneyPage} />
        <Route path="/tools/football-sharps" component={FootballSharpsPage} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
    </Shell>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
