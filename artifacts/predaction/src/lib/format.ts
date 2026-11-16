import { formatDistanceToNowStrict, format, isPast } from "date-fns";

export function fmtContracts(n: number): string {
  if (!Number.isFinite(n)) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 1 : 2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 100_000 ? 0 : 1)}K`;
  return Math.round(n).toLocaleString();
}

export function fmtCents(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "--";
  return `${Math.round(n)}¢`;
}

export function closeLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Close time TBD";
  if (isPast(d)) return `Closed ${formatDistanceToNowStrict(d)} ago`;
  return `Closes in ${formatDistanceToNowStrict(d)}`;
}

export function fullDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "TBD";
  return format(d, "EEE MMM d, h:mm a");
}

export function updatedLabel(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${formatDistanceToNowStrict(d)} ago`;
}

export function hoursUntil(iso: string): number {
  return (new Date(iso).getTime() - Date.now()) / 36e5;
}
