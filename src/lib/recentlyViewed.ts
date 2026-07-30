// Recently Viewed — localStorage LRU, max 12 entry. Sprint 3 #15 (30 Jul 2026).
// Simpan cuma ID + minimal metadata supaya load cepat + tetap fresh saat
// harga/stok berubah (FE re-fetch dari BE untuk display final).
//
// Dipanggil di Produk.tsx onMount (push current) + di Home.tsx untuk render
// section "Baru dilihat".

const KEY = "bakeshop-recently-viewed";
const MAX = 12;

export interface RecentEntry {
  id: string;
  viewed_at: number; // ms epoch
}

export function loadRecent(): RecentEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as RecentEntry[]) : [];
  } catch {
    return [];
  }
}

// pushRecent — tambah/update entry. Kalau sudah ada, pindahkan ke atas (LRU).
export function pushRecent(id: string): void {
  if (!id) return;
  const arr = loadRecent().filter((x) => x.id !== id);
  arr.unshift({ id, viewed_at: Date.now() });
  const trimmed = arr.slice(0, MAX);
  try {
    localStorage.setItem(KEY, JSON.stringify(trimmed));
  } catch {
    /* localStorage full — ignore */
  }
}

export function clearRecent(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
