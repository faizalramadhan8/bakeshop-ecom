// publicSettings — cached fetch subset settings storefront untuk komponen
// customer-facing (FloatingWA, AnnouncementBar, checkout min-order guard).
// Sprint 4 Chunk 5 (31 Jul 2026).
//
// Cache 5min di sessionStorage — jarang berubah, tidak perlu real-time.

import { useEffect, useState } from "react";
import { pasangBrand } from "./brandTheme";
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
  /** Tempat yang pengaturannya dikembalikan: "home" | "store". */
  location?: string;
  /** Alamat & kontak jemput — ditampilkan di halaman toko supaya customer
   *  tahu barangnya dikirim dari mana. */
  store_pickup_address?: string | null;
  store_pickup_phone?: string | null;
  payment_pg_enabled: boolean;
  payment_manual_enabled: boolean;
  /** Rekening tujuan transfer manual, dari Pengaturan POS. Kosong = Bu Santi
   *  belum mengisi rekening — customer tidak punya cara membayar, jadi
   *  halaman pesanan harus menyuruhnya menghubungi admin. */
  bank_accounts?: { bank_name: string; account_number: string; account_holder: string }[];
  /** URL logo toko. Kosong = pakai logo bawaan yang digambar di kode. */
  store_logo?: string | null;
  /** Nama palet warna merek. Kosong = merah muda bawaan. */
  brand_color?: string | null;
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

/**
 * usePublicSettings — pengaturan storefront, di-cache 5 menit.
 *
 * @param wajibAdaRekening Paksa tarik ulang kalau daftar rekening kosong,
 * mengabaikan cache. Dipakai HANYA di layar pembayaran.
 *
 * Alasannya: cache 5 menit sangat pas untuk teks banner atau nomor WA, tapi
 * nomor rekening adalah data saat orang hendak membayar. Kalau halaman
 * terbuka sebelum Bu Santi mengisi rekeningnya, customer melihat "Rekening
 * tujuan belum tersedia" selama lima menit penuh — tanpa cara memaksa muat
 * ulang, karena refresh pun membaca cache yang sama. Daftar rekening kosong
 * juga bukan keadaan wajar untuk toko yang menerima transfer, jadi menariknya
 * ulang tidak membebani apa pun dalam keadaan normal.
 */
export function usePublicSettings(wajibAdaRekening = false): PublicSettings {
  const [data, setData] = useState<PublicSettings>(() => readCache() || DEFAULT_SETTINGS);

  useEffect(() => {
    const cached = readCache();
    const rekeningKosong = !cached?.bank_accounts || cached.bank_accounts.length === 0;
    // Cache segar DAN tidak sedang dibutuhkan untuk membayar → tidak usah ambil.
    if (cached && !(wajibAdaRekening && rekeningKosong)) return;
    let cancelled = false;
    request<PublicSettings>("GET", "/ecom/settings")
      .then((res) => {
        if (cancelled || !res) return;
        writeCache(res);
        setData(res);
        // Warnanya ikut diperbarui di sini, bukan cuma saat halaman dimuat —
        // kalau Bu Santi menggantinya, pengunjung yang sedang membuka toko
        // melihatnya berubah begitu cache lima menitnya habis.
        pasangBrand(res.brand_color);
      })
      .catch(() => {
        // silent — pakai default. Cegah console spam ke customer.
      });
    return () => { cancelled = true; };
  }, [wajibAdaRekening]);

  return data;
}


// ─── Pengaturan per toko ──────────────────────────────────────────────
//
// Terpisah dari usePublicSettings. Yang itu adalah identitas STOREFRONT
// (logo, warna merek, nomor WA) dan harus tetap sama ke mana pun customer
// berpindah — kalau ikut berganti saat membuka produk toko lain, halamannya
// terlihat seperti pindah situs.
//
// Yang ini identitas SATU TOKO: namanya, alamat jemputnya, kontaknya. Dipakai
// baris "Dikirim dari …" di halaman produk dan di halaman toko.

const TOKO_CACHE_PREFIX = "bakeshop-store-settings:";

function bacaCacheToko(loc: string): PublicSettings | null {
  try {
    const raw = sessionStorage.getItem(TOKO_CACHE_PREFIX + loc);
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() - entry.fetchedAt > CACHE_TTL_MS) return null;
    return entry.data;
  } catch {
    return null;
  }
}

export function useStoreSettings(location?: string | null): PublicSettings | null {
  const loc = (location || "").trim();
  const [data, setData] = useState<PublicSettings | null>(() => (loc ? bacaCacheToko(loc) : null));

  useEffect(() => {
    if (!loc) {
      setData(null);
      return;
    }
    const cached = bacaCacheToko(loc);
    if (cached) {
      setData(cached);
      return;
    }
    let cancelled = false;
    request<PublicSettings>("GET", `/ecom/settings?location=${encodeURIComponent(loc)}`)
      .then((res) => {
        if (cancelled || !res) return;
        try {
          sessionStorage.setItem(TOKO_CACHE_PREFIX + loc,
            JSON.stringify({ data: res, fetchedAt: Date.now() } as CacheEntry));
        } catch {
          // sessionStorage penuh/diblokir — tidak apa-apa, cuma tanpa cache.
        }
        setData(res);
      })
      .catch(() => {
        // Diam saja. Nama toko sudah dikirim bersama produknya, jadi
        // kegagalan di sini hanya menghilangkan alamat jemput — bukan
        // alasan untuk menampilkan pesan error ke customer.
      });
    return () => { cancelled = true; };
  }, [loc]);

  return data;
}
