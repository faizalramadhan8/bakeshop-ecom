import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Heart, ArrowLeft, Package } from "lucide-react";
import { useWishlistIds } from "@/lib/wishlist";
import { publicApi, type EcomProductListItem } from "@/lib/api";
import { ProductCard } from "@/components/ProductCard";
import { useSEO } from "@/lib/seo";

export function Wishlist() {
  useSEO({ title: "Wishlist Saya", noIndex: true });
  const ids = useWishlistIds();
  const [products, setProducts] = useState<EcomProductListItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Load produk info untuk each id. Kalau ada id yang produk-nya sudah tidak
  // tayang (unpublish / stok 0), skip dari list. Wishlist tetap simpan id di
  // localStorage — kalau nanti produk tersedia lagi, otomatis muncul.
  useEffect(() => {
    if (ids.length === 0) {
      setProducts([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    // Fetch parallel — asumsi maks 30-50 produk di wishlist realistis.
    Promise.allSettled(ids.map((id) => publicApi.getProduct(id)))
      .then((results) => {
        if (cancelled) return;
        const out: EcomProductListItem[] = [];
        for (const r of results) {
          if (r.status === "fulfilled") out.push(r.value);
        }
        setProducts(out);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [ids.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="max-w-6xl mx-auto p-4 pb-8">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-sm text-ink-700 hover:text-ink-900 mb-4"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Kembali
      </Link>

      <div className="flex items-center gap-2 mb-4">
        <Heart size={20} className="text-cherry-500" aria-hidden="true" />
        <h1 className="text-2xl font-black text-ink-900">Wishlist Saya</h1>
        {ids.length > 0 && (
          <span className="ml-1 text-sm text-ink-500 font-semibold">({ids.length})</span>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="aspect-[3/4] bg-cherry-50 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="py-14 text-center bg-white rounded-2xl border border-cherry-200">
          <div className="w-20 h-20 rounded-full bg-cherry-50 mx-auto mb-4 flex items-center justify-center">
            <Heart size={40} className="text-cherry-300" aria-hidden="true" />
          </div>
          <p className="text-base font-black text-ink-900 mb-1">Wishlist masih kosong</p>
          <p className="text-sm text-ink-500 max-w-xs mx-auto leading-relaxed">
            Simpan produk favoritmu dengan tap ikon <Heart size={12} className="inline text-cherry-500" aria-hidden="true" /> di kartu produk.
          </p>
          <Link
            to="/kategori"
            className="inline-flex items-center gap-2 mt-5 px-6 py-3 rounded-xl text-white text-sm font-black bg-gradient-to-r from-cherry-500 to-cherry-600 shadow-md active:scale-[0.98]"
          >
            <Package size={14} aria-hidden="true" />
            Jelajahi Produk
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {products.map((p) => (
            <ProductCard key={p.id} p={p} />
          ))}
        </div>
      )}
    </div>
  );
}
