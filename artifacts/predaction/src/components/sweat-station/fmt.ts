export const usd = (n: number) => `$${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const signedUsd = (n: number) => `${n >= 0 ? "+" : "-"}${usd(n)}`;
export const tone = (n: number) => (n > 0.004 ? "text-[hsl(var(--chart-2))]" : n < -0.004 ? "text-destructive" : "text-muted-foreground");
