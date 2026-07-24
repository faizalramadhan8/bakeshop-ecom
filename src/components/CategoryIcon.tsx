import {
  Wheat, Cookie, Milk, Package, Egg, Coffee, Cake, Candy,
  Utensils, ChefHat, Sparkles, IceCream, Popcorn, Apple, Croissant,
  Beef, Nut, Wine, Salad, Sandwich, type LucideIcon,
} from "lucide-react";

// Curated icon set — cocok untuk bahan kue / kategori toko Bu Santi.
// Admin pilih dari daftar ini di AdminKategori. Storefront render pakai
// mapping ini. Tambah entry di sini kalau butuh icon baru — jangan biarkan
// admin input string bebas (cegah typo + JS import invalid).
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Wheat, Cookie, Milk, Package, Egg, Coffee, Cake, Candy,
  Utensils, ChefHat, Sparkles, IceCream, Popcorn, Apple, Croissant,
  Beef, Nut, Wine, Salad, Sandwich,
};

// Untuk picker UI + docs.
export const CATEGORY_ICON_NAMES = Object.keys(CATEGORY_ICONS);

// Heuristic auto-pick berdasar nama kategori (dipakai kalau admin belum
// pilih icon manual). Match keyword paling spesifik dulu, else Package.
const NAME_KEYWORD_MAP: Array<[string, string]> = [
  ["tepung", "Wheat"],
  ["cokelat", "Cookie"],
  ["butter", "Croissant"],
  ["margarin", "Croissant"],
  ["cream", "Milk"],
  ["susu", "Milk"],
  ["gula", "Candy"],
  ["perisa", "Sparkles"],
  ["telur", "Egg"],
  ["kopi", "Coffee"],
  ["cake", "Cake"],
  ["kue", "Cake"],
  ["es krim", "IceCream"],
  ["kacang", "Nut"],
  ["daging", "Beef"],
  ["buah", "Apple"],
  ["sayur", "Salad"],
  ["roti", "Sandwich"],
];

export function pickIconName(nameId: string, iconName?: string): string {
  if (iconName && CATEGORY_ICONS[iconName]) return iconName;
  const lower = (nameId || "").toLowerCase();
  for (const [kw, icon] of NAME_KEYWORD_MAP) {
    if (lower.includes(kw)) return icon;
  }
  return "Package";
}

// Render component with proper accessibility (aria-hidden karena label
// selalu accompanies icon).
export function CategoryIcon({
  nameId,
  iconName,
  size = 22,
  className = "",
}: {
  nameId: string;
  iconName?: string;
  size?: number;
  className?: string;
}) {
  const picked = pickIconName(nameId, iconName);
  const Icon = CATEGORY_ICONS[picked] || Package;
  return <Icon size={size} className={className} aria-hidden="true" />;
}
