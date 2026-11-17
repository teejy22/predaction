import { useEffect } from "react";

export function usePageMeta(title: string, description?: string) {
  useEffect(() => {
    document.title = title;
    if (description) {
      for (const sel of ['meta[name="description"]', 'meta[property="og:description"]', 'meta[name="twitter:description"]']) {
        document.querySelector(sel)?.setAttribute("content", description);
      }
    }
    for (const sel of ['meta[property="og:title"]', 'meta[name="twitter:title"]']) {
      document.querySelector(sel)?.setAttribute("content", title);
    }
  }, [title, description]);
}
