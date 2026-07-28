import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { Truck, ShieldCheck, Package as PackageIcon, ArrowRight } from "lucide-react";
import { publicApi, type EcomCategory, type EcomProductListItem } from "@/lib/api";
import { ProductCard } from "@/components/ProductCard";
import { BakeryLogo } from "@/components/BakeryLogo";
import { CategoryIcon } from "@/components/CategoryIcon";
import { useSEO } from "@/lib/seo";

export function Home() {
  useSEO({}); // default title/desc dari template
  const [categories, setCategories] = useState<EcomCategory[]>([]);
  const [featured, setFeatured] = useState<EcomProductListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      publicApi.listCategories(),
      publicApi.listProducts({ limit: 8 }),
    ])
      .then(([cats, prods]) => {
        if (cancelled) return;
        setCategories(cats || []);
        setFeatured(prods?.items || []);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex flex-col">
      {/* Hero — 1 promo banner (bukan carousel per research) */}
      <section className="bg-gradient-to-br from-cherry-100 via-cherry-50 to-cherry-100 border-b border-cherry-100">
        <div className="max-w-6xl mx-auto px-4 py-6 sm:py-10 flex items-center gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold uppercase tracking-widest text-cherry-500 mb-1">
              Promo Bulan Ini
            </p>
            <h1 className="text-xl sm:text-3xl font-black tracking-tight text-ink-900 leading-tight mb-2">
              Bahan Kue Lengkap
              <br />
              Kirim Seluruh Indonesia
            </h1>
            <p className="text-sm text-ink-700 mb-4">
              Belanja mudah, harga grosir, stok fresh.
            </p>
            <Link
              to="/kategori"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-white text-sm font-bold bg-gradient-to-r from-cherry-400 to-cherry-500 hover:opacity-90 transition-opacity"
            >
              Mulai Belanja
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
          <div className="hidden sm:flex shrink-0 shadow-xl rounded-3xl overflow-hidden">
            <BakeryLogo size={140} />
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="border-b border-cherry-100 bg-white">
        <div className="max-w-6xl mx-auto px-4 py-3 grid grid-cols-3 gap-2 text-center">
          {[
            { icon: Truck, label: "Kirim ke seluruh Indonesia" },
            { icon: ShieldCheck, label: "Pembayaran aman" },
            { icon: PackageIcon, label: "Stok fresh & terpercaya" },
          ].map((t) => (
            <div key={t.label} className="flex items-center gap-2 justify-center">
              <t.icon size={16} className="text-cherry-500 shrink-0" aria-hidden="true" />
              <p className="text-xs text-ink-700 font-semibold text-left">{t.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Category grid */}
      <section className="py-6">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-base font-black text-ink-900 mb-3">Kategori</h2>
          {loading ? (
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="aspect-square bg-cherry-50 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : categories.length === 0 ? (
            <div className="py-8 text-center text-ink-500">
              <p className="text-sm">Kategori belum tersedia. Cek lagi sebentar lagi ya.</p>
            </div>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
              {categories.slice(0, 12).map((c) => (
                <Link
                  key={c.id}
                  to={`/kategori/${c.id}`}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-white border border-cherry-100 hover:border-cherry-300 hover:shadow-sm transition-all"
                >
                  <div className="w-12 h-12 rounded-xl bg-cherry-50 flex items-center justify-center text-cherry-500">
                    <CategoryIcon nameId={c.name_id || c.name} iconName={c.icon_name} size={22} />
                  </div>
                  <p className="text-xs font-bold text-ink-900 text-center leading-tight line-clamp-2">
                    {c.name_id || c.name}
                  </p>
                  <p className="text-xs text-ink-500">{c.product_count} produk</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Featured products */}
      <section className="py-6 border-t border-cherry-100">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-black text-ink-900">Produk Terbaru</h2>
            <Link
              to="/kategori"
              className="text-sm font-bold text-cherry-500 hover:text-cherry-600 inline-flex items-center gap-1"
            >
              Lihat semua
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-[3/4] bg-cherry-50 rounded-2xl animate-pulse"
                />
              ))}
            </div>
          ) : featured.length === 0 ? (
            <div className="py-10 text-center">
              <div className="w-16 h-16 rounded-full bg-cherry-50 mx-auto mb-3 flex items-center justify-center">
                <PackageIcon size={30} className="text-cherry-300" aria-hidden="true" />
              </div>
              <p className="text-sm font-black text-ink-900 mb-1">Produk sedang disiapkan</p>
              <p className="text-xs text-ink-500 max-w-xs mx-auto leading-relaxed">
                Katalog kami sedang di-update. Cek lagi nanti ya, banyak bahan kue kekinian yang akan hadir.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {featured.map((p) => (
                <ProductCard key={p.id} p={p} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
