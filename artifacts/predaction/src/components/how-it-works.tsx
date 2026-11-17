import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export const STEPS = [
  { n: "01", t: "Price is probability", d: "Each market trades between 1 and 99 cents. A Yes contract at 63¢ means the crowd puts it around 63% likely. If it happens, Yes pays out $1." },
  { n: "02", t: "Volume is conviction", d: "Volume counts contracts traded, not dollars. Deep volume usually means a sharper, harder-to-move price." },
  { n: "03", t: "Rules decide everything", d: "Every market has written resolution rules. Official sources, deadlines, edge cases — read them before you trust a number." },
  { n: "04", t: "Trade on Kalshi, not here", d: "Prediction Pro is read-only and independent. When you want to act, we hand you off to the event on Kalshi." },
];

export function StepsGrid({ dark = false }: { dark?: boolean }) {
  return (
    <div className="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2">
      {STEPS.map((s) => (
        <div key={s.n} className={`group p-5 transition-colors ${dark ? "bg-secondary text-secondary-foreground" : "bg-card hover:bg-primary/[.06]"}`}>
          <span className="font-mono text-xs font-bold text-primary">{s.n}</span>
          <h3 className="mt-1 text-lg font-bold tracking-tight">{s.t}</h3>
          <p className={`mt-2 text-sm ${dark ? "text-background/70" : "text-muted-foreground"}`}>{s.d}</p>
        </div>
      ))}
    </div>
  );
}

export function HowItWorksDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl border-border bg-card">
        <DialogTitle className="text-3xl font-bold tracking-tight">
          Read the crowd <span className="text-primary">in 30 seconds</span>
        </DialogTitle>
        <DialogDescription>Prediction markets turn opinions into prices. Here's how to read them.</DialogDescription>
        <StepsGrid />
      </DialogContent>
    </Dialog>
  );
}
