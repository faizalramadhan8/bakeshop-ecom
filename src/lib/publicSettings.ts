// publicSettings — cached fetch subset settings storefront untuk komponen
// customer-facing (FloatingWA, AnnouncementBar, checkout min-order guard).
// Sprint 4 Chunk 5 (31 Jul 2026).
//
// Cache 5min di sessionStorage — jarang berubah, tidak perlu real-time.

import { useEffect, useState } from "react";
import { request } from "./api";

export interface PublicSettings {
  min_order_amount: number;
  wa_contact_number: string;
  wa_pretext?: string;
  announcement_bar_enabled: boolean;
  announcement_bar_text?: string;
  announcement_bar_cta_label?: string;
  announcement_bar_cta_url?: string;
  store_name: string;
  payment_pg_enabled: boolean;
  payment_manual_enabled: boolean;
  // Sprint 5 Chunk 7 — Homepage CMS
  hero_kicker?: string;
  hero_title?: string;
  hero_subtitle?: string;
  hero_cta_label?: string;
  hero_cta_url?: string;
  pinned_product_ids?: string[];
  featured_category_ids?: string[];
}

const CACHE_KEY = "bakeshop-public-settings";
const CACHE_TTL_MS = 5 * 60 * 1000;

interface CacheEntry {
  data: PublicSettings;
  fetchedAt: number;
}

function readCache(): PublicSettings | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() - entry.fetchedAt > CACHE_TTL_MS) return null;
    return entry.data;
  } catch {
    return null;
  }
}

function writeCache(data: PublicSettings) {
  try {
    sessionStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ data, fetchedAt: Date.now() } as CacheEntry)
    );
  } catch {
    // sessionStorage quota / disabled — silent OK
  }
}

// Default fallback — dipakai kalau BE tidak reachable ATAU cache miss saat
// initial render. Cegah komponen breaking / flash of empty UI.
const DEFAULT_SETTINGS: PublicSettings = {
  min_order_amount: 0,
  wa_contact_number: "6281574273040",
  wa_pretext: "Halo Bu Santi, saya customer TBK Santi. Mau tanya...",
  announcement_bar_enabled: false,
  store_name: "Toko Bahan Kue Santi",
  payment_pg_enabled: true,
  payment_manual_enabled: true,
};

export function usePublicSettings(): PublicSettings {
  const [data, setData] = useState<PublicSettings>(() => readCache() || DEFAULT_SETTINGS);

  useEffect(() => {
    // Kalau sudah ada cache fresh, skip fetch.
    if (readCache()) return;
    let cancelled = false;
    request<PublicSettings>("GET", "/ecom/settings")
      .then((res) => {
        if (cancelled || !res) return;
        writeCache(res);
        setData(res);
      })
      .catch(() => {
        // silent — pakai default. Cegah console spam ke customer.
      });
    return () => { cancelled = true; };
  }, []);

  return data;
}
