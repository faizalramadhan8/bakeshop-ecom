import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Search, Package, Eye, EyeOff, AlertCircle, Loader2 } from "lucide-react";
import { adminApi, decodeToken, type EcomAdminProduct } from "@/lib/api";

const ECOM_ADMIN_ROLES = ["ecom_admin", "ecom_superadmin", "superadmin"];

function formatRp(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return "Rp " + n.toLocaleString("id-ID");
}

export function AdminProdukList() {
  const [products, setProducts] = useState<EcomAdminProduct[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Filter chips supaya admin cepat cari "yang tayang" / "yang perlu setup" tanpa scroll.
  const [statusFilter, setStatusFilter] = useState<"all" | "tayang" | "perlu_setup" | "hidden">("all");

  useEffect(() => {
    const claims = decodeToken();
    if (!claims || !ECOM_ADMIN_ROLES.includes(claims.role || "")) {
      window.location.href = "/";
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    adminApi
      .listProducts({ search: search.trim() || undefined, limit: 100 })
      .then((res) => {
        if (!cancelled) setProducts(res.items || []);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Gagal load");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [search]);

  return (
    <main className="min-h-screen p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header consistent dengan AdminKomplain: back icon-only + heading + subtitle inline */}
        <div className="flex items-center gap-3 mb-5">
          <Link
            to="/admin"
            className="w-10 h-10 rounded-xl flex items-center justify-center text-ink-700 hover:bg-cherry-50"
            aria-label="Kembali"
          >
            <ArrowLeft size={18} />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-black text-ink-900">Produk Online</h1>
            <p className="text-xs text-ink-500 mt-0.5">
              Publish produk ke storefront + manage stok dan harga online.
            </p>
          </div>
        </div>

        <div className="relative mb-3">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-500 pointer-events-none"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama produk atau SKU…"
            className="w-full pl-12 pr-4 py-3 rounded-2xl border border-cherry-200 text-sm focus:outline-none focus:ring-2 focus:ring-cherry-500/30 focus:border-cherry-400"
          />
        </div>

        {/* Filter chips — quick narrow by status */}
        <div className="flex flex-wrap gap-2 mb-6">
          {(
            [
              { key: "all", label: "Semua" },
              { key: "tayang", label: "Tayang" },
              { key: "perlu_setup", label: "Perlu Setup" },
              { key: "hidden", label: "Disembunyikan" },
            ] as const
          ).map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setStatusFilter(f.key)}
              className={`px-3 h-8 rounded-full text-xs font-bold ${
                statusFilter === f.key
                  ? "bg-cherry-500 text-white"
                  : "bg-white border border-cherry-200 text-ink-700 hover:bg-cherry-50"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="py-16 text-center text-ink-500 text-sm">
            <Loader2 size={20} className="animate-spin mx-auto mb-2" />
            Memuat produk…
          </div>
        ) : error ? (
          <div className="py-16 text-center">
            <AlertCircle size={40} className="mx-auto text-cherry-600 mb-3" />
            <p className="text-sm font-semibold text-cherry-600">{error}</p>
          </div>
        ) : (() => {
          const filtered = products.filter((p) => {
            const needsSetup = p.ecom_is_available && (!p.stock_ecom || !p.ecom_weight_grams);
            const tayang = p.ecom_is_available && p.stock_ecom > 0 && p.ecom_weight_grams;
            if (statusFilter === "tayang") return tayang;
            if (statusFilter === "perlu_setup") return needsSetup;
            if (statusFilter === "hidden") return !p.ecom_is_available;
            return true;
          });
          if (filtered.length === 0) {
            return (
              <div className="py-16 text-center bg-white rounded-2xl border border-cherry-200">
                <div className="w-16 h-16 rounded-full bg-cherry-50 mx-auto mb-3 flex items-center justify-center">
                  <Package size={30} className="text-cherry-300" aria-hidden="true" />
                </div>
                <p className="text-sm font-black text-ink-900 mb-1">
                  {statusFilter === "all" && !search
                    ? "Belum ada produk"
                    : "Tidak ada hasil"}
                </p>
                <p className="text-xs text-ink-500">
                  {statusFilter === "all" && !search
                    ? "Produk POS akan otomatis tampil di sini."
                    : "Coba ubah filter atau kata kunci pencarian."}
                </p>
              </div>
            );
          }
          return (
          <div className="bg-white rounded-2xl border border-cherry-200 overflow-hidden">
            {filtered.map((p, idx) => {
              const needsSetup = p.ecom_is_available && (!p.stock_ecom || !p.ecom_weight_grams);
              const tayang = p.ecom_is_available && p.stock_ecom > 0 && p.ecom_weight_grams;
              return (
                <Link
                  key={p.id}
                  to={`/admin/produk/${p.id}`}
                  className={`flex items-center gap-4 px-5 py-4 hover:bg-cherry-50 transition-colors ${
                    idx > 0 ? "border-t border-cherry-100" : ""
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {p.ecom_is_available ? (
                        <Eye size={12} className="text-cherry-500 shrink-0" />
                      ) : (
                        <EyeOff size={12} className="text-ink-500 shrink-0" />
                      )}
                      <p className="text-sm font-bold text-ink-900 truncate">{p.name}</p>
                      {needsSetup && (
                        <span className="shrink-0 text-xs font-bold px-2 py-0.5 rounded bg-amber-500 text-white">
                          Perlu setup
                        </span>
                      )}
                      {tayang && (
                        <span className="shrink-0 text-xs font-bold px-2 py-0.5 rounded bg-cherry-100 text-cherry-600">
                          Tayang
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-ink-500">
                      SKU: {p.sku} · Stok toko: {p.stock_pos} · Stok online: {p.stock_ecom}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-black text-cherry-500">
                      {formatRp(p.ecom_price ?? p.selling_price)}
                    </p>
                    {p.ecom_price === null && (
                      <p className="text-xs text-ink-500">= harga toko</p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
          );
        })()}
      </div>
    </main>
  );
}
