import type { Category } from "@/lib/portfolio-data";

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const usd0 = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
export const money = (value: number) => usd.format(value);
export const money0 = (value: number) => usd0.format(value);
export const signedMoney = (value: number, whole = false) => `${value >= 0 ? "+" : "−"}${(whole ? usd0 : usd).format(Math.abs(value))}`;
export const signedPct = (value: number) => `${value >= 0 ? "+" : "−"}${Math.abs(value).toFixed(1)}%`;
export const tone = (value: number) => value > 0 ? "text-emerald-300" : value < 0 ? "text-rose-300" : "text-muted-foreground";
export const shortDate = (date: Date) => date.toLocaleDateString("en-US", { month: "short", day: "numeric" });

// Category colors avoid green and red, which are reserved for gains and losses.
export const CATEGORY_COLOR: Record<Category, string> = {
  Sports: "hsl(262 70% 62%)", Politics: "hsl(202 72% 62%)", Economics: "hsl(37 88% 63%)",
  Crypto: "hsl(262 84% 84%)", Culture: "hsl(232 15% 52%)",
};
