import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Search, X, Clock, TrendingUp, Package } from "lucide-react";
import { publicApi, type EcomProductListItem, type EcomCategory } from "@/lib/api";
import { ProductCard } from "@/components/ProductCard";
import { useSEO } from "@/lib/seo";
import { CategoryIcon } from "@/components/CategoryIcon";

// Recent searches — localStorage, max 8 entry (LRU).
const RECENT_KEY = "bakeshop-recent-searches";
const RECENT_MAX = 8;

function loadRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}
function pushRecent(q: string) {
  const arr = loadRecent().filter((x) => x.toLowerCase() !== q.toLowerCase());
  arr.unshift(q);
  const trimmed = arr.slice(0, RECENT_MAX);
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(trimmed));
  } catch {
    /* ignore */
  }
}
function clearRecent() {
  try {
    localStorage.removeItem(RECENT_KEY);
  } catch {
    /* ignore */
  }
}

export function Cari() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialQ = searchParams.get("q") || "";
  const [q, setQ] = useState(initialQ);
  const [products, setProducts] = useState<EcomProductListItem[]>([]);
  const [categories, setCategories] = useState<EcomCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(!!initialQ);
  const [recent, setRecent] = useState<string[]>(loadRecent());
  const inputRef = useRef<HTMLInputElement>(null);

  useSEO({
    title: q ? `Cari: ${q}` : "Cari Produk",
    description: q
      ? `Hasil pencarian "${q}" di TBK Santi.`
      : "Cari bahan kue di TBK Santi — tepung, cokelat, whipping cream, dll.",
  });

  // Load kategori untuk suggestions section.
  useEffect(() => {
    publicApi.listCategories().then((c) => setCategories(c || [])).catch(() => {});
  }, []);

  // Auto-focus search input di mount (mobile UX — customer datang untuk cari).
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Debounced search — fire 300ms setelah user berhenti ngetik.
  useEffect(() => {
    const query = q.trim();
    if (!query || query.length < 2) {
      setProducts([]);
      setSearched(false);
      return;
    }
    const t = setTimeout(() => {
      setLoading(true);
      publicApi
        .listProducts({ search: query, limit: 30 })
        .then((resp) => {
          setProducts(resp?.items || []);
          setSearched(true);
        })
        .catch(() => setProducts([]))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  // Sync URL param supaya bisa share link + back button OK.
  useEffect(() => {
    const query = q.trim();
    if (query) {
      setSearchParams({ q: query }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  }, [q]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = (query: string) => {
    if (!query.trim()) return;
    pushRecent(query.trim());
    setRecent(loadRecent());
    setQ(query.trim());
  };

  return (
    <div className="max-w-6xl mx-auto p-4 pb-8">
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => navigate(-1)}
          aria-label="Kembali"
          className="w-10 h-10 rounded-xl flex items-center justify-center text-ink-700 hover:bg-cherry-50"
        >
          <ArrowLeft size={18} aria-hidden="true" />
        </button>
        <div className="flex-1 relative">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-500 pointer-events-none"
            aria-hidden="true"
          />
          <input
            ref={inputRef}
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit(q)}
            placeholder="Cari tepung, cokelat, whipping cream…"
            aria-label="Cari produk"
            inputMode="search"
            autoComplete="off"
            className="w-full pl-10 pr-10 py-3 rounded-xl border border-cherry-200 text-base focus:outline-none focus:ring-2 focus:ring-cherry-500/30 focus:border-cherry-400"
          />
          {q && (
            <button
              onClick={() => setQ("")}
              aria-label="Clear"
              className="absolute right-1 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center text-ink-500 hover:text-ink-900"
            >
              <X size={14} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {/* Empty state — belum ngetik, tampil recent + trending category */}
      {!searched && q.trim().length < 2 && (
        <div className="flex flex-col gap-6">
          {recent.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-black text-ink-900 flex items-center gap-2">
                  <Clock size={14} className="text-ink-500" aria-hidden="true" />
                  Pencarian Terakhir
                </h2>
                <button
                  onClick={() => {
                    clearRecent();
                    setRecent([]);
                  }}
                  className="text-xs text-ink-500 hover:text-cherry-500 font-bold"
                >
                  Hapus semua
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {recent.map((r) => (
                  <button
                    key={r}
                    onClick={() => submit(r)}
                    className="px-3 py-1.5 rounded-full bg-cherry-50 border border-cherry-200 text-sm text-ink-900 hover:border-cherry-400 hover:bg-cherry-100"
                  >
                    {r}
                  </button>
                ))}
              </div>
            </section>
          )}

          <section>
            <h2 className="text-sm font-black text-ink-900 mb-2 flex items-center gap-2">
              <TrendingUp size={14} className="text-cherry-500" aria-hidden="true" />
              Jelajah Kategori
            </h2>
            {categories.length === 0 ? (
              <p className="text-sm text-ink-500">Belum ada kategori</p>
            ) : (
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                {categories.slice(0, 12).map((c) => (
                  <Link
                    key={c.id}
                    to={`/kategori/${c.id}`}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-white border border-cherry-100 hover:border-cherry-300"
                  >
                    <div className="w-12 h-12 rounded-xl bg-cherry-50 text-cherry-500 flex items-center justify-center">
                      <CategoryIcon nameId={c.name_id || c.name} iconName={c.icon_name} size={22} />
                    </div>
                    <p className="text-xs font-bold text-ink-900 text-center leading-tight line-clamp-2">
                      {c.name_id || c.name}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* Result state */}
      {searched && (
        <>
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="aspect-[3/4] bg-cherry-50 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="py-16 text-center bg-white rounded-2xl border border-cherry-100">
              <Package size={40} className="mx-auto text-ink-500 opacity-40 mb-2" aria-hidden="true" />
              <p className="text-sm font-bold text-ink-900">Tidak ada hasil untuk "{q}"</p>
              <p className="text-xs text-ink-500 mt-1">Coba kata lain atau jelajah kategori.</p>
              <Link
                to="/kategori"
                className="inline-block mt-4 px-5 py-2.5 rounded-xl text-white text-sm font-bold bg-gradient-to-r from-cherry-400 to-cherry-500"
              >
                Lihat Semua Produk
              </Link>
            </div>
          ) : (
            <>
              <p className="text-sm text-ink-500 mb-3">
                Ditemukan <b className="text-ink-900">{products.length}</b> produk untuk "{q}"
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {products.map((p) => (
                  <ProductCard key={p.id} p={p} />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
