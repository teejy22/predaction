import "./_group.css";
import { useRef, useState } from "react";
import { ArrowDownUp, ArrowRight, ArrowUpRight, Bitcoin, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Flame, Gamepad2, Landmark, LockKeyhole, Mic2, Search, ShieldCheck, Sparkles, Star, TrendingUp, Trophy, Users, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Market = { title: string; outcomes: [string, number][]; volume: string; icon: LucideIcon; tone?: string; category: string };
const marketSections: { title: string; subtitle: string; category: string; markets: Market[] }[] = [
  { title: "GTA VI", subtitle: "The release everyone is watching", category: "Entertainment", markets: [
    { title: "GTA 6 released on time?", outcomes: [["By Nov 19, 2026", 99]], volume: "862K", icon: Gamepad2, category: "Entertainment" },
    { title: "Grand Theft Auto VI: The Album, Features", outcomes: [["Dua Lipa", 99], ["Lana Del Rey", 99]], volume: "2.5M", icon: Mic2, category: "Entertainment" },
    { title: "GTA VI, Reported units sold before 2027", outcomes: [["At least 15 million", 66], ["At least 6 million", 65]], volume: "498K", icon: Gamepad2, category: "Entertainment" },
  ]},
  { title: "The road to 2028", subtitle: "Early names. Shifting chances.", category: "Elections", markets: [
    { title: "2028 Republican presidential nominee", outcomes: [["J.D. Vance", 33], ["Marco Rubio", 19], ["Ron DeSantis", 16]], volume: "1.7M", icon: Landmark, tone: "gold", category: "Elections" },
    { title: "2028 Democratic presidential nominee", outcomes: [["Jon Ossoff", 27], ["Alexandria Ocasio-Cortez", 15], ["Gavin Newsom", 11]], volume: "1.1M", icon: Landmark, tone: "teal", category: "Elections" },
    { title: "2028 U.S. Presidential Election winner?", outcomes: [["Jon Ossoff", 18], ["J.D. Vance", 13], ["Alexandria Ocasio-Cortez", 9]], volume: "771K", icon: Users, category: "Elections" },
  ]},
  { title: "Money & markets", subtitle: "What the crowd is pricing in", category: "Financials", markets: [
    { title: "Who will be the next CEO of NVIDIA?", outcomes: [["Rene Haas", 26], ["Ian Buck", 15], ["Jensen Huang", 11]], volume: "4.9M", icon: Sparkles, tone: "teal", category: "Financials" },
    { title: "Fed decision in Dec 2026?", outcomes: [["Hike 25bps", 92], ["Hike >25bps", 6], ["Maintains rate", 4]], volume: "1.5M", icon: Landmark, tone: "gold", category: "Economics" },
    { title: "Bitcoin price at the end of 2026", outcomes: [["60,000 to 64,999", 23], ["65,000 to 69,999", 18], ["55,000 to 59,999", 17]], volume: "382K", icon: Bitcoin, tone: "gold", category: "Crypto" },
  ]},
  { title: "In the conversation", subtitle: "Culture, politics, and what comes next", category: "Politics", markets: [
    { title: "Dancing with the Stars Season 35, Winner", outcomes: [["Ezra Frech", 57], ["Amber Glenn", 18], ["Connor Wood", 18]], volume: "422K", icon: Trophy, category: "Entertainment" },
    { title: "Next Senate Democratic Leader?", outcomes: [["Chuck Schumer", 93], ["Chris Van Hollen", 7]], volume: "843K", icon: Landmark, tone: "teal", category: "Politics" },
    { title: "Next French presidential election winner?", outcomes: [["Marine Le Pen", 52], ["David Lisnard", 14], ["Jean-Luc Melenchon", 12]], volume: "355K", icon: Landmark, category: "Politics" },
  ]},
  { title: "On the radar", subtitle: "A little further down the board", category: "Trending", markets: [
    { title: "BTC price on Nov 20, 2026 at 5pm EST?", outcomes: [["$56,500 or above", 96]], volume: "719K", icon: Bitcoin, tone: "gold", category: "Crypto" },
    { title: "Who will be Trump's next Press Secretary?", outcomes: [["Ben Ferguson", 15], ["Anna Kelly", 7]], volume: "404K", icon: Mic2, category: "Politics" },
    { title: "Kansas vs West Virginia", outcomes: [["West Virginia", 72], ["Kansas", 28]], volume: "186K", icon: Trophy, tone: "teal", category: "Sports" },
  ]},
];
const categories = ["Trending", "Sports", "Crypto", "Elections", "Politics", "Entertainment", "Mentions", "Commodities", "Economics", "Financials", "Climate and Weather", "Science and Technology", "Companies"];
const games = [
  { names: ["Philadelphia", "Orlando"], teams: ["PHI", "ORL"], codes: ["phi", "orl"], scores: [109, 107], time: "Q4 · 3:18", chance: [66, 35], poly: [65, 34] },
  { names: ["Memphis", "Cleveland"], teams: ["MEM", "CLE"], codes: ["mem", "cle"], scores: [120, 119], time: "Q4 · 0:45", chance: [76, 25], poly: [74, 26] },
  { names: ["Washington", "Toronto"], teams: ["WSH", "TOR"], codes: ["wsh", "tor"], scores: [78, 76], time: "Q3 · 4:28", chance: [44, 57], poly: [43, 57] },
];
const popular = [
  { codes: ["phi", "orl"], teams: ["PHI", "ORL"], scores: [109, 107], time: "Q4 3:18", index: 0 },
  { codes: ["mil", "mia"], teams: ["MIL", "MIA"], scores: [107, 112], time: "3rd", index: -1 },
  { codes: ["wsh", "tor"], teams: ["WSH", "TOR"], scores: [78, 76], time: "3rd", index: 2 },
  { codes: ["mem", "cle"], teams: ["MEM", "CLE"], scores: [120, 119], time: "4th", index: 1 },
  { codes: ["hou", "ind"], teams: ["HOU", "IND"], scores: [116, 103], time: "4th", index: -1 },
  { codes: ["det", "no"], teams: ["DET", "NOP"], scores: [67, 60], time: "2nd", index: -1 },
  { codes: ["chi", "bkn"], teams: ["CHI", "BKN"], scores: ["—", "—"], time: "3rd", index: -1 },
];
const topics = [["GTA VI", "3.9M"], ["NBA", "3.6M"], ["US Elections", "3.5M"], ["CEOs", "4.9M"], ["NVIDIA", "4.9M"], ["Fed", "1.5M"], ["Crypto", "1.1M"], ["Congress", "843K"], ["Music", "2.5M"], ["College football", "427K"], ["Esports", "316K"]];
const rankedTopics = [...topics].sort((a, b) => {
  const value = (n: string) => parseFloat(n) * (n.endsWith("M") ? 1000 : 1);
  return value(b[1]) - value(a[1]);
});
const marketUrl = (title: string) => `https://kalshi.com/markets?search=${encodeURIComponent(title)}`;
const logo = (code: string) => `https://a.espncdn.com/i/teamlogos/nba/500/${code}.png`;

function MarketCard({ market, saved, onStar }: { market: Market; saved: boolean; onStar: () => void }) {
  const Icon = market.icon;
  return <article className="pp-card">
    <div className="pp-card-header">
      <div className={`pp-market-icon ${market.tone || ""}`}><Icon size={15}/></div>
      <h3><a href={marketUrl(market.title)} target="_blank" rel="noreferrer">{market.title}</a></h3>
      <button className={`pp-star ${saved ? "saved" : ""}`} onClick={onStar} aria-label={saved ? `Remove ${market.title} from watchlist` : `Watch ${market.title}`}><Star size={12} fill={saved ? "currentColor" : "none"}/></button>
    </div>
    <div className="pp-outcomes">{market.outcomes.map(([name, chance]) => <div className="pp-outcome" key={name}><span>{name}</span><a href={marketUrl(market.title)} target="_blank" rel="noreferrer" aria-label={`${name}, ${chance}% chance. Open market`}>{chance}%</a></div>)}</div>
    <div className="pp-cardfooter"><span><span style={{color:"#aca1ba"}}>{market.volume}</span> contracts · 24h</span><a href={marketUrl(market.title)} target="_blank" rel="noreferrer">Kalshi <ArrowUpRight size={10} style={{display:"inline"}}/></a></div>
  </article>;
}

export function TrendingBoard() {
  const [featured, setFeatured] = useState(0);
  const [category, setCategory] = useState("Trending");
  const [search, setSearch] = useState("");
  const [saved, setSaved] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("pp-trending-watchlist") || '["GTA 6 released on time?","2028 Republican presidential nominee"]'); } catch { return []; }
  });
  const popularRef = useRef<HTMLDivElement>(null);
  const game = games[featured];
  const toggleSave = (title: string) => setSaved(previous => {
    const next = previous.includes(title) ? previous.filter(item => item !== title) : [...previous, title];
    try { localStorage.setItem("pp-trending-watchlist", JSON.stringify(next)); } catch { /* Browser storage may be unavailable. */ }
    return next;
  });
  const allMarkets = marketSections.flatMap(section => section.markets);
  const visibleSections = marketSections.map(section => ({ ...section, markets: section.markets.filter(market => (category === "Trending" || market.category === category || (category === "Companies" && market.title.includes("NVIDIA"))) && (!search || `${market.title} ${market.outcomes.map(o => o[0]).join(" ")}`.toLowerCase().includes(search.toLowerCase()))) })).filter(section => section.markets.length);
  return <div className="pp-board dark"><div className="pp-shell">
    <header className="pp-top">
      <a href="#" aria-label="Prediction Pro home" onClick={e => {e.preventDefault();setCategory("Trending");setSearch("");}}><img className="pp-logo" src="/__mockup/images/prediction-pro-logo.svg" alt="Prediction Pro"/></a>
      <nav className="pp-nav">{["Markets","Sports","Esports","Model","Tools","Articles"].map(item => <a className={item === "Markets" ? "selected" : ""} key={item} href={item === "Markets" || item === "Sports" ? "#markets" : `https://predictionpro.com/${item.toLowerCase()}`} onClick={item === "Markets" || item === "Sports" ? () => setCategory(item === "Sports" ? "Sports" : "Trending") : undefined}>{item}</a>)}</nav>
      <label className="pp-search"><Search size={15}/><input aria-label="Search markets" placeholder="Search markets" value={search} onChange={e => setSearch(e.target.value)}/>{search ? <button className="pp-star" aria-label="Clear search" onClick={()=>setSearch("")}><X size={12}/></button> : <span className="pp-key">/</span>}</label>
    </header>
    <nav className="pp-tabs" aria-label="Market categories">{categories.map(item => <button className={category === item ? "active" : ""} key={item} onClick={() => setCategory(item)}>{item === "Trending" && <Flame size={13}/>} {item}</button>)}</nav>
    <div className="pp-datebar"><span>THE MARKET, RIGHT NOW <span style={{color:"#4c435b",margin:"0 10px"}}>/</span> NOV 18, 2026</span><span className="pp-status"><span className="pp-dot" style={{background:"#88bca5"}}/> MARKET SNAPSHOT <span style={{color:"#585061"}}>· 9:42 PM ET</span></span></div>
    <div className="pp-layout">
      <main className="pp-main">
        <section className="pp-feature pp-entrance" aria-label="Featured live game">
          <div className="pp-featurehead"><div><div className="pp-eyebrow"><span className="pp-dot"/> LIVE ON THE COURT <span style={{color:"#51475f",margin:"0 3px"}}>/</span> NBA</div><h1 className="font-display">{game.names[0]} vs {game.names[1]}</h1></div><div className="pp-controls"><button className="pp-arrow" aria-label="Previous featured game" onClick={()=>setFeatured((featured+2)%3)}><ChevronLeft size={14}/></button><button className="pp-arrow" aria-label="Next featured game" onClick={()=>setFeatured((featured+1)%3)}><ChevronRight size={14}/></button></div></div>
          <div className="pp-featurebody">
            <div className="pp-scoreboard">
              <div className="pp-scores"><div className="pp-team"><img src={logo(game.codes[0])} referrerPolicy="no-referrer" alt={game.names[0]}/><div><strong>{game.scores[0]}</strong><small>{game.teams[0]}</small></div></div><span className="pp-live"><span className="pp-dot"/>{game.time}</span><div className="pp-team"><div style={{textAlign:"right"}}><strong>{game.scores[1]}</strong><small>{game.teams[1]}</small></div><img src={logo(game.codes[1])} referrerPolicy="no-referrer" alt={game.names[1]}/></div></div>
              <div className="pp-exchange"><span style={{fontWeight:600,color:"#b4a5c3"}}>Kalshi <ArrowUpRight size={9} style={{display:"inline"}}/></span>{game.chance.map((chance,i)=><a className={`pp-chance ${i ? "alt" : ""}`} key={i} href={marketUrl(game.names.join(" vs "))} target="_blank" rel="noreferrer"><span>{game.teams[i]}</span><b>{chance}%</b></a>)}</div>
              <div className="pp-exchange"><span style={{fontSize:9}}>Polymarket US</span>{game.poly.map((chance,i)=><a className={`pp-chance muted ${i ? "alt" : ""}`} key={i} href="https://polymarket.us" target="_blank" rel="noreferrer">{chance}%</a>)}</div>
            </div>
            <div className="pp-chart"><div className="pp-chart-top"><span>WIN CHANCE</span><span style={{color:"#b49bcf"}}>LIVE <span style={{color:"#71667f"}}>⌄</span></span></div>
              <svg viewBox="0 0 400 140" role="img" aria-label={`${game.teams[0]} and ${game.teams[1]} win chances over the game`}>
                <defs><linearGradient id="pp-area" x1="0" x2="0" y1="0" y2="1"><stop stopColor="#ac77e8" stopOpacity=".13"/><stop offset="1" stopColor="#ac77e8" stopOpacity="0"/></linearGradient></defs>
                {[25,65,105].map(y=><g key={y}><line x1="0" y1={y} x2="353" y2={y} stroke="#30263b" strokeDasharray="2 5"/><text x="366" y={y+3} fill="#62566f" fontSize="8" fontFamily="monospace">{y===25?"75":y===65?"50":"25"}%</text></g>)}
                <path d="M0 64 L8 66 L16 61 L23 64 L32 48 L42 40 L50 44 L56 32 L65 38 L74 59 L81 70 L91 65 L100 72 L111 58 L119 64 L126 44 L134 63 L143 56 L152 66 L159 79 L166 61 L175 55 L184 59 L193 46 L201 49 L210 40 L219 48 L229 37 L238 43 L249 34 L257 40 L268 35 L277 37 L286 69 L294 85 L304 78 L310 94 L319 79 L327 73 L333 64 L340 52 L352 45 L352 140 L0 140Z" fill="url(#pp-area)"/>
                <path d="M0 64 L8 66 L16 61 L23 64 L32 48 L42 40 L50 44 L56 32 L65 38 L74 59 L81 70 L91 65 L100 72 L111 58 L119 64 L126 44 L134 63 L143 56 L152 66 L159 79 L166 61 L175 55 L184 59 L193 46 L201 49 L210 40 L219 48 L229 37 L238 43 L249 34 L257 40 L268 35 L277 37 L286 69 L294 85 L304 78 L310 94 L319 79 L327 73 L333 64 L340 52 L352 45" fill="none" stroke="#b17bea" strokeWidth="2"/>
                <path d="M0 83 L8 81 L16 86 L23 84 L32 100 L42 108 L50 104 L56 116 L65 110 L74 90 L81 78 L91 85 L100 77 L111 91 L119 85 L126 104 L134 85 L143 94 L152 82 L159 70 L166 88 L175 96 L184 91 L193 103 L201 99 L210 108 L219 101 L229 111 L238 105 L249 116 L257 109 L268 115 L277 111 L286 81 L294 64 L304 72 L310 56 L319 71 L327 76 L333 86 L340 96 L352 103" fill="none" stroke="#6facae" strokeWidth="1.8"/>
                <circle cx="352" cy="45" r="3.5" fill="#c39aef"/><circle cx="352" cy="103" r="3" fill="#79b8b7"/>
              </svg><div className="pp-chart-legend"><span>7:30 PM</span><span>8:15 PM</span><span>9:00 PM</span><span>NOW</span></div>
            </div>
          </div>
          <div className="pp-featurefoot"><span>Two exchanges. One game. <span style={{color:"#a295af"}}>Compare the crowd's chances.</span></span><a href={marketUrl(game.names.join(" vs "))} target="_blank" rel="noreferrer">Trade on Kalshi <ArrowUpRight size={11}/></a></div>
        </section>
        <div className="pp-dots">{games.map((_,i)=><button key={i} className={featured===i?"active":""} onClick={()=>setFeatured(i)} aria-label={`Show featured game ${i+1}`}/>)}</div>
        <section className="pp-entrance" style={{animationDelay:".06s"}}><div className="pp-section-title" style={{marginTop:18}}><h2>Popular live <span className="pp-section-sub">7 games in play</span></h2><div className="pp-controls"><button className="pp-arrow" aria-label="Scroll games left" onClick={()=>popularRef.current?.scrollBy({left:-290,behavior:"smooth"})}><ChevronLeft size={13}/></button><button className="pp-arrow" aria-label="Scroll games right" onClick={()=>popularRef.current?.scrollBy({left:290,behavior:"smooth"})}><ChevronRight size={13}/></button></div></div>
          <div className="pp-popular" ref={popularRef}>{popular.map((g,i)=><a key={i} className={`pp-game ${g.index===featured?"active":""}`} href={g.index>=0?"#":marketUrl(g.teams.join(" vs "))} target={g.index>=0?undefined:"_blank"} rel="noreferrer" onClick={g.index>=0?e=>{e.preventDefault();setFeatured(g.index);}:undefined}><div className="pp-game-top"><span style={{color:"#c87e94"}}>● {g.time}</span><span>NBA</span></div>{g.teams.map((team,j)=><div className="pp-game-team" key={team}><img src={logo(g.codes[j])} referrerPolicy="no-referrer" alt=""/><span>{team}</span><b className={Number(g.scores[j])<Number(g.scores[1-j])?"dim":""}>{g.scores[j]}</b></div>)}</a>)}</div>
        </section>
        <div id="markets">{visibleSections.length ? visibleSections.map((section,i)=><section key={section.title} className="pp-entrance" style={{animationDelay:`${.1+i*.06}s`}}><div className="pp-section-title"><h2>{section.title}<span className="pp-section-sub">{section.subtitle}</span></h2><a href={`https://kalshi.com/markets?search=${encodeURIComponent(section.title)}`} target="_blank" rel="noreferrer">View all <ChevronRight size={12}/></a></div><div className="pp-cards">{section.markets.map(m=><MarketCard key={m.title} market={m} saved={saved.includes(m.title)} onStar={()=>toggleSave(m.title)}/>)}</div></section>):<div className="pp-no-results"><Search size={24} style={{margin:"0 auto 12px"}}/><h2 className="font-display">No markets in this snapshot.</h2><p>Try another category or a different search.</p><button className="pp-chance" style={{margin:"15px auto 0"}} onClick={()=>{setSearch("");setCategory("Trending");}}>Show trending markets <ArrowRight size={13}/></button></div>}</div>
        <footer className="pp-footer"><span>Chances, not certainties. Markets can change quickly.</span><span>Market data: Kalshi · Polymarket US</span></footer>
      </main>
      <aside className="pp-side">
        <section><div className="pp-side-title"><h2><Star size={14} style={{color:"#bd96eb"}}/> Your watchlist</h2><span>{String(saved.length).padStart(2,"0")}</span></div><div className="pp-watchlist">{saved.length?saved.slice(0,4).map(title=>{const market=allMarkets.find(m=>m.title===title);return market&&<div className="pp-watch" key={title}><small style={{display:"flex",justifyContent:"space-between"}}>{market.title}<button className="pp-star saved" aria-label={`Unwatch ${title}`} onClick={()=>toggleSave(title)}><Star size={11} fill="currentColor"/></button></small><a href={marketUrl(title)} target="_blank" rel="noreferrer"><span>{market.outcomes[0][0]}</span><strong>{market.outcomes[0][1]}<span style={{fontSize:10}}>%</span></strong></a></div>;}):<div className="pp-empty"><Star size={22} style={{margin:"0 auto 8px"}}/>Keep an eye on what matters.<br/>Star any market to save it here.</div>}</div><p className="pp-browser-note"><LockKeyhole size={10}/> Saved in this browser. No account needed.</p>
          <div className="pp-side-title"><h2><TrendingUp size={14} style={{color:"#9b79bc"}}/> Trending topics</h2><span>24H VOL <ChevronDown size={9} style={{display:"inline"}}/></span></div>
          <div className="pp-topics">{rankedTopics.map(([name,vol],i)=><a key={name} className="pp-topic" href="#markets" onClick={()=>{setCategory("Trending");setSearch(name==="GTA VI"?"GTA":name==="NVIDIA"||name==="CEOs"?"NVIDIA":name==="US Elections"?"2028":name==="Fed"?"Fed":name==="Congress"?"Senate":name==="Music"?"Album":name==="Crypto"?"Bitcoin":name);}}><span className="pp-topic-rank">{String(i+1).padStart(2,"0")}</span><span className="pp-topic-name">{name}</span><span className="pp-topic-volume">{vol}</span><ChevronRight size={11} style={{color:"#61526f"}}/></a>)}</div>
        </section>
        <section className="pp-side-block"><div className="pp-side-title"><h2><ArrowDownUp size={14} style={{color:"#b28cd2"}}/> Price gaps</h2><span>SPORTS</span></div><p style={{fontSize:10,lineHeight:1.6,color:"#796d87",margin:"-3px 0 2px"}}>Same outcome. Different crowd.</p>{[["LEGION to win","11","8","3.0"],["Memphis to win","76","74","2.0"],["Philadelphia to win","66","65","1.0"]].map(([name,k,p,gap])=><div className="pp-gap" key={name}><div className="pp-gap-title"><span>{name}</span><b>{gap} pts</b></div><div className="pp-gap-prices"><span>Kalshi<strong>{k}%</strong></span><span>Polymarket US<strong>{p}%</strong></span></div></div>)}<p style={{fontSize:9,color:"#62566e",lineHeight:1.7}}>Prices may reflect different fees, liquidity, or contract rules. Compare before trading.</p>
          <div className="pp-info"><ShieldCheck size={21} style={{color:"#a87bd0"}}/><h3>The odds. Not the noise.</h3><p>Prediction Pro helps you read the market. We don't take bets or hold funds. Explore the chances here. Trade on the exchange.</p><a href="https://kalshi.com" target="_blank" rel="noreferrer">Explore Kalshi <ArrowUpRight size={12}/></a></div>
          <div style={{display:"flex",gap:14,color:"#73617f",fontSize:9,marginTop:23}}><a href="https://kalshi.com/learn" target="_blank" rel="noreferrer" style={{display:"flex",alignItems:"center",gap:4}}><CircleHelp size={11}/> How markets work</a><span>18+ · Trade responsibly</span></div>
        </section>
      </aside>
    </div>
  </div></div>;
}
