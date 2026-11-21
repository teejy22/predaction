import { ChevronDown, ChevronUp, Eye, EyeOff, Pin } from "lucide-react";
import { heldTeam, type LiveGame } from "./_data";
import type { PanelFields, PanelSize, SweatPrefs } from "./_prefs";

type Props = {
  games: Map<string, LiveGame>; order: string[]; prefs: SweatPrefs;
  setSize: (s: PanelSize) => void; setField: (k: keyof PanelFields, v: boolean) => void;
  move: (id: string, d: -1 | 1) => void; toggleHidden: (id: string) => void; togglePin: (id: string) => void; reset: () => void;
};

const chip = (on: boolean) => `rounded-md px-3 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${on ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`;
const icon = "rounded p-2 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";

export function BoardSettings({ games, order, prefs, setSize, setField, move, toggleHidden, togglePin, reset }: Props) {
  return (
    <section aria-label="Board settings" className="rise grid gap-6 rounded-xl bg-card p-4 sm:p-5 lg:grid-cols-[1fr_1.4fr]" data-testid="panel-settings">
      <div className="space-y-5">
        <div>
          <h3 className="text-sm font-semibold">Panel size</h3>
          <div className="mt-2 flex gap-1.5">
            {(["dense", "regular", "large"] as PanelSize[]).map((s) => <button key={s} type="button" onClick={() => setSize(s)} aria-pressed={prefs.size === s} className={chip(prefs.size === s)} data-testid={`button-size-${s}`}>{s === "dense" ? "Dense" : s === "regular" ? "Regular" : "Large"}</button>)}
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold">Each panel shows</h3>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {([["chart", "Price chart"], ["score", "Score"], ["position", "My position"]] as [keyof PanelFields, string][]).map(([k, l]) => <button key={k} type="button" onClick={() => setField(k, !prefs.fields[k])} aria-pressed={prefs.fields[k]} className={chip(prefs.fields[k])} data-testid={`button-field-${k}`}>{l}</button>)}
          </div>
        </div>
        <button type="button" onClick={reset} className="text-xs font-semibold text-muted-foreground underline underline-offset-4 hover:text-foreground" data-testid="button-reset-board">Reset board</button>
      </div>
      <div>
        <h3 className="text-sm font-semibold">Games on the board</h3>
        <ol className="mt-2 space-y-0.5">
          {order.map((id, i) => {
            const g = games.get(id);
            if (!g) return null;
            const hidden = prefs.hidden.includes(id);
            return (
              <li key={id} className={`flex items-center gap-1 rounded-md px-2 py-1 ${hidden ? "opacity-45" : ""}`} data-testid={`row-setting-${id}`}>
                <span className="w-5 font-mono text-[11px] tabular text-muted-foreground">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate text-sm"><span className="font-semibold">{heldTeam(g)}</span><span className="text-muted-foreground"> · {g.away} at {g.home}</span></span>
                <button type="button" className={icon} onClick={() => move(id, -1)} disabled={i === 0} aria-label="Move up" data-testid={`button-up-${id}`}><ChevronUp className="h-4 w-4" /></button>
                <button type="button" className={icon} onClick={() => move(id, 1)} disabled={i === order.length - 1} aria-label="Move down" data-testid={`button-down-${id}`}><ChevronDown className="h-4 w-4" /></button>
                <button type="button" className={`${icon} ${prefs.pinned === id ? "text-primary" : ""}`} onClick={() => togglePin(id)} aria-pressed={prefs.pinned === id} aria-label="Spotlight" data-testid={`button-spotlight-${id}`}><Pin className="h-4 w-4" /></button>
                <button type="button" className={icon} onClick={() => toggleHidden(id)} aria-label={hidden ? "Show on board" : "Hide from board"} data-testid={`button-visibility-${id}`}>{hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
