import { Link } from "react-router-dom";
import { type EcomProductListItem, formatRp } from "@/lib/api";
import { Package } from "lucide-react";

export function ProductCard({ p }: { p: EcomProductListItem }) {
  return (
    <Link
      to={`/produk/${p.id}`}
      className="group flex flex-col bg-white rounded-2xl border border-cherry-100 overflow-hidden hover:border-cherry-300 hover:shadow-md transition-all"
    >
      {/* Image / placeholder */}
      <div className="aspect-square bg-cherry-50 relative flex items-center justify-center overflow-hidden">
        {p.image ? (
          // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
          <img
            src={p.image}
            alt={p.name_id}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <Package size={40} className="text-cherry-200" />
        )}

        {/* Stock urgency badge */}
        {p.is_low_stock && p.stock > 0 && (
          <span className="absolute top-2 right-2 text-xs font-bold px-2 py-0.5 rounded-md bg-cherry-500 text-white">
            Sisa {p.stock}
          </span>
        )}

        {/* Weight badge */}
        {p.weight_grams && (
          <span className="absolute top-2 left-2 text-xs font-bold px-2 py-0.5 rounded-md bg-white/90 text-ink-900">
            {formatWeight(p.weight_grams)}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="p-3 flex flex-col gap-1">
        {p.category_name && (
          <p className="text-xs text-ink-500 truncate">{p.category_name}</p>
        )}
        <p className="text-sm font-bold text-ink-900 leading-snug line-clamp-2 min-h-[2.6em]">
          {p.name_id || p.name}
        </p>
        <div className="mt-1">
          <p className="text-base font-black text-cherry-500 tracking-tight">
            {formatRp(p.price)}
          </p>
          {p.member_price && p.member_price < p.price && (
            <p className="text-xs text-amber-600 font-bold">
              Member: {formatRp(p.member_price)}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}

function formatWeight(grams: number): string {
  if (grams >= 1000) return `${(grams / 1000).toFixed(grams % 1000 === 0 ? 0 : 1)} kg`;
  return `${grams} g`;
}
