// adminTheme — Sprint 6 Chunk 13 (4 Aug 2026).
// Dark mode toggle scoped ke admin panel only (storefront customer tetap
// light — konsisten brand + expectation). Persist di localStorage.
//
// Pattern: apply `data-admin-theme="dark"` ke <html> saat active.
// CSS override di index.css hijack Tailwind atomic class supaya tidak perlu
// refactor tiap komponen ke dark: variant.

import { useEffect, useState } from "react";

const STORAGE_KEY = "bakeshop-admin-theme";
type AdminTheme = "light" | "dark";

function readStored(): AdminTheme {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

function apply(theme: AdminTheme) {
  const root = document.documentElement;
  if (theme === "dark") root.setAttribute("data-admin-theme", "dark");
  else root.removeAttribute("data-admin-theme");
}

// Hook — dipakai di AdminShell + halaman admin lain kalau perlu.
export function useAdminTheme(): [AdminTheme, (t: AdminTheme) => void, () => void] {
  const [theme, setTheme] = useState<AdminTheme>(() => readStored());

  useEffect(() => {
    apply(theme);
  }, [theme]);

  const set = (t: AdminTheme) => {
    setTheme(t);
    try { localStorage.setItem(STORAGE_KEY, t); } catch {}
  };
  const toggle = () => set(theme === "dark" ? "light" : "dark");

  return [theme, set, toggle];
}

// Apply immediately saat AdminShell mount (cegah flash of light theme kalau
// user set dark). Tidak butuh state — cukup baca localStorage + apply.
export function initAdminTheme() {
  apply(readStored());
}

// Clear saat leave admin route — cegah dark bleed ke storefront customer.
export function clearAdminTheme() {
  document.documentElement.removeAttribute("data-admin-theme");
}
