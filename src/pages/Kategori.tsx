import { Link, useParams, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { Package, ArrowLeft } from "lucide-react";
import { publicApi, type EcomCategory, type EcomProductListItem } from "@/lib/api";
import { ProductCard } from "@/components/ProductCard";
import { useSEO } from "@/lib/seo";

type SortKey = "" | "price_asc" | "price_desc" | "name";

const SORT_LABELS: Record<SortKey, string> = {
  "": "Terbaru",
  price_asc: "Termurah",
  price_desc: "Termahal",
  name: "Nama A–Z",
};

export function Kategori() {
  const { slug } = useParams<{ slug?: string }>();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get("q") || "";
  const sort = (searchParams.get("sort") as SortKey) || "";

  const [categories, setCategories] = useState<EcomCategory[]>([]);
  const [products, setProducts] = useState<EcomProductListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const activeCat = slug ? categories.find((c) => c.id === slug) : null;
  useSEO({
    title: activeCat
      ? `Kategori ${activeCat.name_id || activeCat.name}`
      : search
      ? `Cari: ${search}`
      : "Semua Kategori",
    description: activeCat
      ? `Belanja produk ${activeCat.name_id || activeCat.name} di TBK Santi. Harga grosir, kirim seluruh Indonesia.`
      : "Jelajahi semua kategori bahan kue di TBK Santi.",
  });

  useEffect(() => {
    publicApi.listCategories().then((c) => setCategories(c || [])).catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    publicApi
      .listProducts({
        category: slug || undefined,
        search: search || undefined,
        sort: sort || undefined,
        limit: 48,
      })
      .then((res) => {
        if (!cancelled) setProducts(res?.items || []);
      })
      .catch(() => {
        if (!cancelled) setProducts([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug, search, sort]);

  const activeCategory = slug ? categories.find((c) => c.id === slug) : null;

  const setSort = (s: SortKey) => {
    const next = new URLSearchParams(searchParams);
    if (s) next.set("sort", s);
    else next.delete("sort");
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-4">
      {/* Category chips (horizontal scroll) */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-3">
          {slug && (
            <Link
              to="/kategori"
              className="inline-flex items-center gap-1 text-sm text-ink-700 hover:text-ink-900"
            >
              <ArrowLeft size={14} />
              Semua
            </Link>
          )}
          <h1 className="text-lg font-black text-ink-900">
            {activeCategory?.name_id || activeCategory?.name || "Semua Kategori"}
          </h1>
        </div>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-4 px-4">
          <Link
            to="/kategori"
            className={`shrink-0 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              !slug
                ? "text-white bg-gradient-to-r from-cherry-400 to-cherry-500"
                : "border border-cherry-200 bg-white text-ink-700 hover:border-cherry-400"
            }`}
          >
            Semua
          </Link>
          {categories.map((c) => (
            <Link
              key={c.id}
              to={`/kategori/${c.id}`}
              className={`shrink-0 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                slug === c.id
                  ? "text-white bg-gradient-to-r from-cherry-400 to-cherry-500"
                  : "border border-cherry-200 bg-white text-ink-700 hover:border-cherry-400"
              }`}
            >
              {c.name_id || c.name}
            </Link>
          ))}
        </div>
      </div>

      {/* Sort + count */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <p className="text-sm text-ink-700">
          {loading ? "Memuat…" : `${products.length} produk`}
          {search && ` untuk "${search}"`}
        </p>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-ink-500 hidden sm:inline">Urutkan:</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="px-3 py-1.5 rounded-lg border border-cherry-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-cherry-500/30"
          >
            {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
              <option key={k} value={k}>
                {SORT_LABELS[k]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="aspect-[3/4] bg-cherry-50 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="py-16 text-center text-ink-500">
          <Package size={48} className="mx-auto opacity-30 mb-3" />
          <p className="text-sm font-semibold">Tidak ada produk ditemukan</p>
          <p className="text-xs mt-1">Coba kategori lain atau kata kunci berbeda</p>
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
