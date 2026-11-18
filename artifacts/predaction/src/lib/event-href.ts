// A dated sports matchup opens its game page (every market for the game); everything else opens the event page.
export function eventHref(event: { ticker: string; gameKey?: string }) {
  return event.gameKey ? `/sports/game/${encodeURIComponent(event.gameKey)}` : `/event/${encodeURIComponent(event.ticker)}`;
}
