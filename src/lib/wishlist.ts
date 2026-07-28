import { useSyncExternalStore } from "react";

// Wishlist — MVP client-side pakai localStorage. Sederhana + zero BE overhead.
// Trade-off: kalau ganti device / clear browser data → wishlist hilang.
// Kalau nanti butuh cross-device, migrate ke BE endpoint dengan schema mirip
// EcomCartItem (ecom_wishlist_items).
//
// Format storage: JSON array of product IDs.
//   localStorage["bakeshop-wishlist"] = '["id1","id2","id3"]'

const KEY = "bakeshop-wishlist";
type Listener = () => void;
const listeners = new Set<Listener>();

// In-memory cache untuk cegah JSON parse setiap read.
let cache: Set<string> | null = null;

function load(): Set<string> {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    const arr = raw ? (JSON.parse(raw) as string[]) : [];
    cache = new Set(arr.filter((x) => typeof x === "string"));
  } catch {
    cache = new Set();
  }
  return cache;
}

function persist() {
  if (!cache) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(Array.from(cache)));
  } catch {
    // Quota exceeded / private mode — silent, wishlist reset di reload.
  }
  listeners.forEach((l) => l());
}

// Cross-tab sync — listen storage event, invalidate cache.
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === KEY) {
      cache = null; // force re-parse next load()
      listeners.forEach((l) => l());
    }
  });
}

export function isInWishlist(productId: string): boolean {
  return load().has(productId);
}

export function toggleWishlist(productId: string): boolean {
  const set = load();
  let nowIn = false;
  if (set.has(productId)) {
    set.delete(productId);
  } else {
    set.add(productId);
    nowIn = true;
  }
  persist();
  return nowIn;
}

export function removeFromWishlist(productId: string) {
  const set = load();
  set.delete(productId);
  persist();
}

export function getWishlistIds(): string[] {
  return Array.from(load());
}

// React hook — subscribe changes supaya button "heart" re-render.
// useSyncExternalStore = React 18+ pattern untuk external store.
function subscribe(cb: Listener) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useWishlistIds(): string[] {
  return useSyncExternalStore(subscribe, () => getWishlistIds().join(","), () => "")
    .split(",")
    .filter(Boolean);
}

// Convenience hook — cek single ID + toggle in 1 call.
export function useWishlistState(productId: string): { inWishlist: boolean; toggle: () => void } {
  const inWishlist = useSyncExternalStore(
    subscribe,
    () => (isInWishlist(productId) ? "1" : "0"),
    () => "0"
  ) === "1";
  return {
    inWishlist,
    toggle: () => toggleWishlist(productId),
  };
}
