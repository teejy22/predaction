export type JsonObject = Record<string, unknown>;

export function object(value: unknown): JsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid provider data");
  return value as JsonObject;
}
export function text(value: unknown): string { return typeof value === "string" ? value : ""; }
export function number(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error("Invalid provider number");
  return value;
}
export function price(value: unknown, scale = 1): number {
  const result = number(value) * scale;
  if (result < 0 || result > 100) throw new Error("Invalid provider price");
  return Math.round(result * 100) / 100;
}
export function timestamp(value: unknown): string {
  const s = text(value);
  if (!s || !Number.isFinite(Date.parse(s))) throw new Error("Invalid provider timestamp");
  return s;
}
export function safeUrl(value: unknown, host: string): string {
  const url = new URL(text(value));
  if (url.protocol !== "https:" || (url.hostname !== host && url.hostname !== `www.${host}`) || url.username || url.password) {
    throw new Error("Invalid provider link");
  }
  return url.toString();
}
export function nonnegative(value: unknown, integer = false): number {
  const n = number(value);
  if (n < 0 || (integer && !Number.isInteger(n))) throw new Error("Invalid provider count or size");
  return n;
}
