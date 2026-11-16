import { useRef, useState } from "react";
import "./_group.css";
import "./_featured.css";

type League = "NFL" | "NBA";

type Game = {
  id: string;
  league: League;
  home: string;
  away: string;
  homePct: number;
  awayPct: number;
  ticker: string;
  volume: string;
};

const games: Game[] = [
  {
    id: "lac-bal",
    league: "NFL",
    home: "Baltimore",
    away: "Los Angeles C",
    homePct: 69,
    awayPct: 32,
    ticker: "KXNFLGAME-26NOV16LACBAL",
    volume: "7.17M",
  },
  {
    id: "phi-bkn",
    league: "NBA",
    home: "Philadelphia",
    away: "Brooklyn",
    homePct: 67,
    awayPct: 34,
    ticker: "KXNBAGAME-26NOV16PHIBKN",
    volume: "368.8K",
  },
  {
    id: "hou-mia",
    league: "NBA",
    home: "Houston",
    away: "Miami",
    homePct: 55,
    awayPct: 46,
    ticker: "KXNBAGAME-26NOV16HOUMIA",
    volume: "337.3K",
  },
];

function BookmarkMark({ saved }: { saved: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none">
      <path
        d="M5.25 3.5h9.5v13l-4.75-3.2-4.75 3.2v-13Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
        fill={saved ? "currentColor" : "none"}
      />
    </svg>
  );
}

function ArrowMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none">
      <path d="M3.5 10h12m-5-5 5 5-5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Featured() {
  const [selectedId, setSelectedId] = useState(games[0].id);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [league, setLeague] = useState<"ALL" | League>("ALL");
  const [previewOpen, setPreviewOpen] = useState(false);
  const filterRailRef = useRef<HTMLElement>(null);
  const selectedGame = games.find((game) => game.id === selectedId) ?? games[0];
  const visibleGames = games.filter((game) => league === "ALL" || game.league === league);
  const isSaved = savedIds.includes(selectedGame.id);

  function selectGame(game: Game) {
    setSelectedId(game.id);
    setPreviewOpen(false);
  }

  function toggleSaved(id: string) {
    setSavedIds((current) =>
      current.includes(id) ? current.filter((savedId) => savedId !== id) : [...current, id],
    );
  }

  function browseMarkets() {
    filterRailRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return (
    <div className="predaction-preview predaction-featured">
      <header className="pf-header">
        <a className="pf-wordmark" href="#featured-board" aria-label="Predaction home">
          <span className="pf-mark" aria-hidden="true">P</span>
          <span>predaction<span className="pf-wordmark-period">.</span></span>
        </a>
        <div className="pf-header-note"><span className="pf-header-signal" /> THE CROWD, IN PLAY</div>
        <button className="pf-nav-button" type="button" onClick={browseMarkets}>
          Browse markets <ArrowMark />
        </button>
      </header>

      <main id="featured-board" className="pf-main">
        <section className="pf-hero" aria-labelledby="pf-title">
          <div className="pf-intro">
            <div className="pf-eyebrow"><span>01</span> / GAME DAY READOUT</div>
            <h1 id="pf-title">A read on<br /><em>the matchup.</em></h1>
            <p className="pf-deck">See where fans are putting their conviction. No sportsbook account required.</p>
            <button className="pf-browse-link" type="button" onClick={browseMarkets}>
              Find your game <span><ArrowMark /></span>
            </button>
            <div className="pf-snapshot"><span className="pf-snapshot-dot" /> SAMPLE SNAPSHOT <i /> NOT LIVE</div>
          </div>

          <div className="pf-board" aria-live="polite">
            <div className="pf-board-head">
              <div>
                <p className="pf-board-kicker">FEATURED EVENT <span>/{selectedGame.league}</span></p>
                <p className="pf-event-ticker">{selectedGame.ticker}</p>
              </div>
              <button
                className={`pf-save-button${isSaved ? " is-saved" : ""}`}
                type="button"
                onClick={() => toggleSaved(selectedGame.id)}
                aria-pressed={isSaved}
                aria-label={isSaved ? "Remove featured game from saved" : "Save featured game"}
              >
                <BookmarkMark saved={isSaved} />
                <span>{isSaved ? "SAVED" : "SAVE"}</span>
              </button>
            </div>

            <div className="pf-matchup">
              <div className="pf-team pf-team-favored">
                <span className="pf-team-label">THE CROWD LEANS</span>
                <span className="pf-team-name">{selectedGame.home}</span>
              </div>
              <div className="pf-vs">VS</div>
              <div className="pf-team pf-team-away">
                <span className="pf-team-label">CHASING THE READ</span>
                <span className="pf-team-name">{selectedGame.away}</span>
              </div>
            </div>

            <div className="pf-probability">
              <div className="pf-probability-row">
                <span>WIN PROBABILITY <small>LAST TRADE</small></span>
                <span className="pf-volume">{selectedGame.volume} <small>CONTRACTS · 24H</small></span>
              </div>
              <div className="pf-values">
                <span>{selectedGame.homePct}<small>%</small></span>
                <span>{selectedGame.awayPct}<small>%</small></span>
              </div>
              <div className="pf-probability-track" aria-label={`${selectedGame.home} ${selectedGame.homePct} percent, ${selectedGame.away} ${selectedGame.awayPct} percent`}>
                <span className="pf-probability-fill" style={{ width: `${selectedGame.homePct}%` }} />
              </div>
              <div className="pf-team-legend"><span>{selectedGame.home}</span><span>{selectedGame.away}</span></div>
              <p className="pf-independent-note">Each percentage reflects its own last trade. They may not add up to 100%.</p>
            </div>

            <div className="pf-board-foot">
              <span><span className="pf-foot-mark" /> CROWD-SOURCED MARKET SIGNAL</span>
              <button className="pf-market-button" type="button" onClick={() => setPreviewOpen((open) => !open)}>
                {previewOpen ? "Close preview" : "Market preview"} <ArrowMark />
              </button>
            </div>
            {previewOpen && (
              <div className="pf-market-preview" role="status">
                <span>LOCAL PREVIEW</span>
                <p>{selectedGame.home} vs {selectedGame.away}</p>
                <small>{selectedGame.ticker} · Snapshot only, no live trading</small>
              </div>
            )}
          </div>
        </section>

        <section className="pf-discovery" aria-label="Featured games">
          <div className="pf-discovery-title">
            <div>
              <p className="pf-eyebrow"><span>02</span> / ON THE BOARD</p>
              <h2>Pick a game.</h2>
            </div>
            <p className="pf-discovery-hint">Select a matchup to make it the featured read.</p>
          </div>
          <div className="pf-game-list">
            {visibleGames.map((game, index) => {
              const active = selectedGame.id === game.id;
              const saved = savedIds.includes(game.id);
              return (
                <article className={`pf-game-card${active ? " is-active" : ""}`} key={game.id}>
                  <button
                    className="pf-game-select"
                    type="button"
                    onClick={() => selectGame(game)}
                    aria-pressed={active}
                    aria-label={`Feature ${game.home} versus ${game.away}`}
                  >
                    <span className="pf-game-index">0{index + 1}</span>
                    <span className="pf-game-info">
                      <span className="pf-game-league">{game.league} <i /> FEATURED MARKET</span>
                      <span className="pf-game-names">{game.home}<b> / </b>{game.away}</span>
                      <span className="pf-game-volume">{game.volume} contracts traded in 24h</span>
                    </span>
                    <span className="pf-game-odds">
                      <span>{game.homePct}%<small>{game.home}</small></span>
                      <span>{game.awayPct}%<small>{game.away}</small></span>
                    </span>
                    <span className="pf-card-arrow"><ArrowMark /></span>
                  </button>
                  <button
                    className={`pf-card-save${saved ? " is-saved" : ""}`}
                    type="button"
                    onClick={() => toggleSaved(game.id)}
                    aria-label={saved ? `Unsave ${game.home} versus ${game.away}` : `Save ${game.home} versus ${game.away}`}
                    aria-pressed={saved}
                  ><BookmarkMark saved={saved} /></button>
                </article>
              );
            })}
            {visibleGames.length === 0 && <p className="pf-empty">No featured matchups in this league.</p>}
          </div>
        </section>

        <section className="pf-filter-rail" ref={filterRailRef} aria-label="Filter featured markets">
          <div className="pf-filter-copy">
            <span className="pf-eyebrow"><span>03</span> / YOUR BOARD</span>
            <strong>Find a league.</strong>
          </div>
          <div className="pf-filter-buttons" role="group" aria-label="Filter by league">
            {(["ALL", "NFL", "NBA"] as const).map((option) => (
              <button
                type="button"
                className={league === option ? "is-selected" : ""}
                key={option}
                aria-pressed={league === option}
                onClick={() => setLeague(option)}
              >{option === "ALL" ? "All games" : option}</button>
            ))}
          </div>
          <p className="pf-filter-footnote">Snapshot data shown for illustration. Market percentages are independent last-trade prices.</p>
        </section>
      </main>
    </div>
  );
}
