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
        <div className="py-16 text-center bg-white rounded-2xl border border-cherry-200">
          <Package size={40} className="mx-auto text-ink-500 opacity-40 mb-2" aria-hidden="true" />
          <p className="text-sm font-bold text-ink-900">Wishlist masih kosong</p>
          <p className="text-xs text-ink-500 mt-1">
            Tap ikon <Heart size={12} className="inline text-cherry-500" aria-hidden="true" /> di produk
            untuk simpan buat nanti.
          </p>
          <Link
            to="/kategori"
            className="inline-block mt-4 px-5 py-2.5 rounded-xl text-white text-sm font-bold bg-gradient-to-r from-cherry-400 to-cherry-500"
          >
            Jelajah Produk
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
