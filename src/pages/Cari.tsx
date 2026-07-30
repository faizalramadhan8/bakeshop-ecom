import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Search, X, Clock, TrendingUp, Package, SlidersHorizontal, Check } from "lucide-react";
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
  // Sprint 2 #7 — filter + sort state
  const [sort, setSort] = useState<"" | "price_asc" | "price_desc" | "name">("");
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [filterOpen, setFilterOpen] = useState(false);
  const activeFilterCount = (sort ? 1 : 0) + (minPrice ? 1 : 0) + (maxPrice ? 1 : 0);

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
        .listProducts({
          search: query,
          limit: 30,
          sort: sort || undefined,
          min_price: minPrice ? Number(minPrice) : undefined,
          max_price: maxPrice ? Number(maxPrice) : undefined,
        })
        .then((resp) => {
          setProducts(resp?.items || []);
          setSearched(true);
        })
        .catch(() => setProducts([]))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [q, sort, minPrice, maxPrice]);

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
        {/* Filter button — badge count */}
        <button
          type="button"
          onClick={() => setFilterOpen(true)}
          aria-label="Filter & Urutkan"
          className={`relative w-10 h-10 rounded-xl flex items-center justify-center border ${
            activeFilterCount > 0
              ? "bg-cherry-500 text-white border-cherry-500"
              : "bg-white text-ink-700 border-cherry-200 hover:bg-cherry-50"
          }`}
        >
          <SlidersHorizontal size={16} aria-hidden="true" />
          {activeFilterCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Active filter chips — quick clear */}
      {activeFilterCount > 0 && (
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          {sort && (
            <span className="inline-flex items-center gap-1 bg-cherry-50 border border-cherry-200 text-cherry-600 text-xs font-bold px-2 py-1 rounded-lg">
              {sort === "price_asc" ? "Harga Terendah" : sort === "price_desc" ? "Harga Tertinggi" : "Nama A-Z"}
              <button type="button" onClick={() => setSort("")} aria-label="Hapus filter">
                <X size={10} />
              </button>
            </span>
          )}
          {minPrice && (
            <span className="inline-flex items-center gap-1 bg-cherry-50 border border-cherry-200 text-cherry-600 text-xs font-bold px-2 py-1 rounded-lg">
              Min Rp {Number(minPrice).toLocaleString("id-ID")}
              <button type="button" onClick={() => setMinPrice("")} aria-label="Hapus filter">
                <X size={10} />
              </button>
            </span>
          )}
          {maxPrice && (
            <span className="inline-flex items-center gap-1 bg-cherry-50 border border-cherry-200 text-cherry-600 text-xs font-bold px-2 py-1 rounded-lg">
              Max Rp {Number(maxPrice).toLocaleString("id-ID")}
              <button type="button" onClick={() => setMaxPrice("")} aria-label="Hapus filter">
                <X size={10} />
              </button>
            </span>
          )}
          <button
            type="button"
            onClick={() => { setSort(""); setMinPrice(""); setMaxPrice(""); }}
            className="text-xs font-bold text-ink-500 hover:text-cherry-600 underline"
          >
            Reset semua
          </button>
        </div>
      )}

      {/* Filter Sheet */}
      {filterOpen && (
        <FilterSheet
          sort={sort}
          minPrice={minPrice}
          maxPrice={maxPrice}
          onApply={(newSort, newMin, newMax) => {
            setSort(newSort);
            setMinPrice(newMin);
            setMaxPrice(newMax);
            setFilterOpen(false);
          }}
          onClose={() => setFilterOpen(false)}
        />
      )}

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

// ─── FilterSheet ──────────────────────────────────────────────────────
// Sprint 2 #7 — bottom sheet filter + sort. Local draft state supaya
// customer bisa preview sebelum apply — cegah refetch tiap ketik angka.

const SORT_OPTIONS: { value: "" | "price_asc" | "price_desc" | "name"; label: string }[] = [
  { value: "",           label: "Terbaru" },
  { value: "price_asc",  label: "Harga Terendah" },
  { value: "price_desc", label: "Harga Tertinggi" },
  { value: "name",       label: "Nama A-Z" },
];

function FilterSheet({
  sort: initialSort,
  minPrice: initialMin,
  maxPrice: initialMax,
  onApply,
  onClose,
}: {
  sort: "" | "price_asc" | "price_desc" | "name";
  minPrice: string;
  maxPrice: string;
  onApply: (sort: "" | "price_asc" | "price_desc" | "name", min: string, max: string) => void;
  onClose: () => void;
}) {
  const [sort, setSort] = useState(initialSort);
  const [minP, setMinP] = useState(initialMin);
  const [maxP, setMaxP] = useState(initialMax);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const reset = () => {
    setSort("");
    setMinP("");
    setMaxP("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4" role="dialog" aria-modal="true">
      <div
        className="absolute inset-0 bg-ink-900/60 backdrop-blur-sm modal-fade-in"
        onClick={onClose}
      />
      <div className="relative bg-white sm:rounded-3xl rounded-t-3xl shadow-2xl max-w-md w-full max-h-[85vh] flex flex-col modal-sheet-in overflow-hidden">
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup"
          className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full flex items-center justify-center text-ink-500 bg-white/70 backdrop-blur hover:bg-white"
        >
          <X size={16} aria-hidden="true" />
        </button>

        <div className="px-5 sm:px-6 pt-5 pb-3 border-b border-cherry-100 shrink-0">
          <h2 className="text-base font-black text-ink-900">Filter & Urutkan</h2>
        </div>

        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4">
          {/* Sort options */}
          <p className="text-xs font-black uppercase tracking-wider text-ink-500 mb-2">
            Urutkan
          </p>
          <div className="grid grid-cols-2 gap-2 mb-5">
            {SORT_OPTIONS.map((opt) => {
              const active = sort === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSort(opt.value)}
                  className={`flex items-center gap-2 px-3 py-3 rounded-xl border-2 text-left ${
                    active ? "border-cherry-500 bg-cherry-50" : "border-cherry-100 bg-white hover:border-cherry-300"
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${
                    active ? "border-cherry-500 bg-cherry-500" : "border-cherry-300 bg-white"
                  }`}>
                    {active && <Check size={10} className="text-white" strokeWidth={3} />}
                  </div>
                  <span className="text-sm font-bold text-ink-900">{opt.label}</span>
                </button>
              );
            })}
          </div>

          {/* Price range */}
          <p className="text-xs font-black uppercase tracking-wider text-ink-500 mb-2">
            Rentang Harga
          </p>
          <div className="flex items-center gap-2 mb-1">
            <div className="flex-1">
              <label className="text-xs text-ink-500 block mb-1">Minimum</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-ink-500">Rp</span>
                <input
                  type="number"
                  value={minP}
                  onChange={(e) => setMinP(e.target.value.replace(/\D/g, ""))}
                  inputMode="numeric"
                  placeholder="0"
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-cherry-200 text-sm focus:outline-none focus:ring-2 focus:ring-cherry-500/30 focus:border-cherry-400"
                />
              </div>
            </div>
            <span className="text-ink-500 pt-6">–</span>
            <div className="flex-1">
              <label className="text-xs text-ink-500 block mb-1">Maksimum</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-ink-500">Rp</span>
                <input
                  type="number"
                  value={maxP}
                  onChange={(e) => setMaxP(e.target.value.replace(/\D/g, ""))}
                  inputMode="numeric"
                  placeholder="~"
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-cherry-200 text-sm focus:outline-none focus:ring-2 focus:ring-cherry-500/30 focus:border-cherry-400"
                />
              </div>
            </div>
          </div>
          {/* Quick range chips */}
          <div className="flex flex-wrap gap-2 mt-3">
            {[
              { min: "", max: "20000", label: "< Rp 20rb" },
              { min: "20000", max: "50000", label: "Rp 20-50rb" },
              { min: "50000", max: "100000", label: "Rp 50-100rb" },
              { min: "100000", max: "", label: "> Rp 100rb" },
            ].map((r) => (
              <button
                key={r.label}
                type="button"
                onClick={() => { setMinP(r.min); setMaxP(r.max); }}
                className="text-xs font-bold px-3 py-1.5 rounded-lg border border-cherry-200 bg-white hover:bg-cherry-50 text-ink-700"
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <div className="px-5 sm:px-6 pt-3 pb-4 border-t border-cherry-100 shrink-0 bg-white flex gap-2">
          <button
            type="button"
            onClick={reset}
            className="flex-1 h-12 rounded-xl border-2 border-cherry-200 text-sm font-black text-ink-700 hover:bg-cherry-50"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={() => onApply(sort, minP, maxP)}
            className="flex-1 h-12 rounded-xl text-sm font-black text-white bg-gradient-to-r from-cherry-500 to-cherry-600 hover:from-cherry-600 hover:to-cherry-700 shadow-lg shadow-cherry-500/20 active:scale-[0.98] transition-transform"
          >
            Terapkan
          </button>
        </div>
      </div>
    </div>
  );
}
