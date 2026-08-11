// useUrlQueryState — Sprint 6 Chunk 12 (4 Aug 2026).
// Sync state ke URL query string supaya:
//   1. Filter admin persist across page refresh (Bu Santi tidak perlu re-pilih)
//   2. Bookmark-able / share-able link ke filter tertentu
//      (mis. /admin/pesanan?status=paid&search=dara → langsung buka view itu)
//   3. Browser back/forward preserve state
//
// API mimic useState-style:
//   const [status, setStatus] = useUrlQueryState("status", "paid");
//   const [search, setSearch] = useUrlQueryState("search", "");
//
// Pattern: state → URL one-way (replaceState). Reload URL → re-read
// initial value dari URL. Cegah bug back-button ke filter lama tidak sync.

import { useCallback, useEffect, useState } from "react";

export function useUrlQueryState(
  key: string,
  defaultValue: string,
): [string, (v: string) => void] {
  // Init dari URL kalau ada, else default.
  const [value, setLocal] = useState<string>(() => {
    if (typeof window === "undefined") return defaultValue;
    const params = new URLSearchParams(window.location.search);
    return params.get(key) ?? defaultValue;
  });

  // Setter — update local + URL query (replace, cegah spam history).
  const set = useCallback((v: string) => {
    setLocal(v);
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (v === "" || v === defaultValue) {
      url.searchParams.delete(key);
    } else {
      url.searchParams.set(key, v);
    }
    window.history.replaceState(null, "", url.toString());
  }, [key, defaultValue]);

  // Sync balik kalau URL berubah dari luar (mis. back button, direct edit).
  useEffect(() => {
    const onPop = () => {
      const params = new URLSearchParams(window.location.search);
      const next = params.get(key) ?? defaultValue;
      setLocal(next);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [key, defaultValue]);

  return [value, set];
}

// clearAll — hapus SEMUA query params. Untuk tombol "Reset Filter".
export function clearAllUrlQueryState(): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.search = "";
  window.history.replaceState(null, "", url.toString());
  // Trigger popstate manually supaya semua hook re-read.
  window.dispatchEvent(new PopStateEvent("popstate"));
}
