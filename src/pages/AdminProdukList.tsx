import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Search, Package, Eye, EyeOff, AlertCircle } from "lucide-react";
import { adminApi, getAdminToken, type EcomAdminProduct } from "@/lib/api";

function formatRp(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return "Rp " + n.toLocaleString("id-ID");
}

export function AdminProdukList() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<EcomAdminProduct[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!getAdminToken()) {
      navigate("/admin/login", { replace: true });
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
  }, [search, navigate]);

  return (
    <main className="min-h-screen p-6">
      <div className="max-w-5xl mx-auto">
        <Link
          to="/admin"
          className="inline-flex items-center gap-2 text-sm text-ink-700 hover:text-ink-900 mb-4"
        >
          <ArrowLeft size={16} />
          Kembali ke Dashboard
        </Link>

        <h1 className="text-2xl font-black text-ink-900 mb-1">Produk Online</h1>
        <p className="text-sm text-ink-700 mb-6">
          Publish produk ke storefront + manage stok dan harga online
        </p>

        <div className="relative mb-6">
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

        {loading ? (
          <div className="py-16 text-center text-ink-500">
            <Package size={40} className="mx-auto opacity-30 mb-3 animate-pulse" />
            <p className="text-sm font-semibold">Memuat produk…</p>
          </div>
        ) : error ? (
          <div className="py-16 text-center">
            <AlertCircle size={40} className="mx-auto text-cherry-600 mb-3" />
            <p className="text-sm font-semibold text-cherry-600">{error}</p>
          </div>
        ) : products.length === 0 ? (
          <div className="py-16 text-center text-ink-500">
            <Package size={40} className="mx-auto opacity-30 mb-3" />
            <p className="text-sm font-semibold">Belum ada produk</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-cherry-200 overflow-hidden">
            {products.map((p, idx) => {
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
        )}
      </div>
    </main>
  );
}
