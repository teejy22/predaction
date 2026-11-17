import { getGetFlowframeInsightsQueryKey, useGetFlowframeInsights } from "@workspace/api-client-react";
import { getGetFlowframeToolsQueryKey, useGetFlowframeTools } from "@workspace/api-client-react";

export function useFlowframeData() {
  return useGetFlowframeInsights({
    query: {
      queryKey: getGetFlowframeInsightsQueryKey(),
      refetchInterval: 60000,
      retry: false,
    },
  });
}

export function useFlowframeToolsData() {
  return useGetFlowframeTools({
    query: {
      queryKey: getGetFlowframeToolsQueryKey(),
      refetchInterval: 60000,
      retry: false,
    },
  });
}

export function externalHref(value?: string): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

export function formatSourceTime(value?: string): string {
  if (!value) return "Time unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short",
  }).format(date);
}

export function shortWallet(value: string): string {
  return value.length > 16 ? `${value.slice(0, 7)}…${value.slice(-5)}` : value;
}
