import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Search, Package, Eye, EyeOff, AlertCircle, Loader2,
  X, CheckSquare, Wallet, RefreshCw,
} from "lucide-react";
import toast from "react-hot-toast";
import { adminApi, decodeToken, type EcomAdminProduct } from "@/lib/api";
import { AdminShell } from "@/components/AdminShell";

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
  // Sprint 5 Chunk 10 (2 Aug 2026) — bulk selection state.
  const [selectedIDs, setSelectedIDs] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<"publish" | "unpublish" | "sync_price" | "reset_price" | null>(null);
  const [processing, setProcessing] = useState(false);

  // Reset selection saat filter/search berubah — cegah aksi bulk salah scope.
  useEffect(() => { setSelectedIDs(new Set()); setBulkAction(null); }, [statusFilter, search]);

  const toggleSelect = (id: string) => {
    setSelectedIDs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const runBulk = async () => {
    if (!bulkAction || selectedIDs.size === 0) return;
    setProcessing(true);
    try {
      const res = await adminApi.bulkProductOps(bulkAction, Array.from(selectedIDs));
      toast.success(`${res.affected_count} produk berhasil di-update`);
      setSelectedIDs(new Set());
      setBulkAction(null);
      // Re-fetch supaya UI reflect status baru
      const fresh = await adminApi.listProducts({ search: search.trim() || undefined, limit: 100 });
      setProducts(fresh.items || []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal bulk update");
    } finally {
      setProcessing(false);
    }
  };

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
    <AdminShell
      title="Produk Online"
      subtitle="Publish produk ke storefront + manage stok dan harga online"
    >
      <div>
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
          const allSelected = filtered.length > 0 && filtered.every((p) => selectedIDs.has(p.id));
          const toggleAll = () => {
            if (allSelected) setSelectedIDs(new Set());
            else setSelectedIDs(new Set(filtered.map((p) => p.id)));
          };
          return (
          <>
          {/* Select-all toolbar */}
          <div className="flex items-center gap-2 mb-2 px-1">
            <label className="flex items-center gap-2 text-xs font-bold text-ink-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                className="w-4 h-4 accent-cherry-500"
              />
              {allSelected ? "Batal pilih semua" : `Pilih semua ${filtered.length} produk`}
            </label>
            {selectedIDs.size > 0 && (
              <span className="ml-auto text-xs text-cherry-600 font-black">
                {selectedIDs.size} dipilih
              </span>
            )}
          </div>
          <div className={`bg-white rounded-2xl border border-cherry-200 overflow-hidden ${selectedIDs.size > 0 ? "mb-20" : ""}`}>
            {filtered.map((p, idx) => {
              const needsSetup = p.ecom_is_available && (!p.stock_ecom || !p.ecom_weight_grams);
              const tayang = p.ecom_is_available && p.stock_ecom > 0 && p.ecom_weight_grams;
              const isSelected = selectedIDs.has(p.id);
              return (
                <div
                  key={p.id}
                  className={`flex items-stretch gap-0 transition-colors ${
                    idx > 0 ? "border-t border-cherry-100" : ""
                  } ${isSelected ? "bg-cherry-50" : ""}`}
                >
                  {/* Checkbox column */}
                  <label className="flex items-center justify-center px-4 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(p.id)}
                      className="w-4 h-4 accent-cherry-500"
                      aria-label={`Pilih ${p.name}`}
                    />
                  </label>
                  <Link
                    to={`/admin/produk/${p.id}`}
                    className="flex-1 min-w-0 flex items-center gap-4 pr-5 py-4 hover:bg-cherry-50 transition-colors"
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
                </div>
              );
            })}
          </div>
          </>
          );
        })()}

        {/* Bulk action bar sticky bottom */}
        {selectedIDs.size > 0 && (
          <div className="fixed bottom-0 left-0 right-0 lg:left-60 z-30 bg-white border-t border-cherry-200 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
            <div className="max-w-7xl mx-auto p-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <button
                type="button"
                onClick={() => { setSelectedIDs(new Set()); setBulkAction(null); }}
                className="hidden sm:flex w-10 h-10 rounded-xl items-center justify-center text-ink-700 hover:bg-cherry-50 shrink-0"
                aria-label="Batal pilih"
              >
                <X size={18} />
              </button>
              <p className="text-sm font-black text-ink-900 flex-1 min-w-0 sm:truncate">
                <span className="text-cherry-500">{selectedIDs.size}</span> produk dipilih
              </p>
              {bulkAction ? (
                <BulkConfirmPanel
                  action={bulkAction}
                  count={selectedIDs.size}
                  processing={processing}
                  onConfirm={runBulk}
                  onCancel={() => setBulkAction(null)}
                />
              ) : (
                <div className="flex flex-wrap gap-1.5 shrink-0">
                  <BulkActionButton icon={<Eye size={13} />} label="Publish" onClick={() => setBulkAction("publish")} tone="green" />
                  <BulkActionButton icon={<EyeOff size={13} />} label="Sembunyikan" onClick={() => setBulkAction("unpublish")} tone="ink" />
                  <BulkActionButton icon={<Wallet size={13} />} label="Sync Harga POS" onClick={() => setBulkAction("sync_price")} tone="cherry" />
                  <BulkActionButton icon={<RefreshCw size={13} />} label="Reset Harga" onClick={() => setBulkAction("reset_price")} tone="ink" />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────

function BulkActionButton({ icon, label, onClick, tone }: {
  icon: React.ReactNode; label: string; onClick: () => void; tone: "green" | "ink" | "cherry";
}) {
  const cls = {
    green:  "border-green-500 text-green-700 hover:bg-green-50",
    ink:    "border-ink-500/30 text-ink-700 hover:bg-cherry-50",
    cherry: "border-cherry-500 text-cherry-600 hover:bg-cherry-50",
  }[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 h-10 px-3 rounded-lg text-xs font-bold bg-white border ${cls}`}
    >
      {icon}
      {label}
    </button>
  );
}

function BulkConfirmPanel({ action, count, processing, onConfirm, onCancel }: {
  action: "publish" | "unpublish" | "sync_price" | "reset_price";
  count: number;
  processing: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const meta = useMemo(() => {
    switch (action) {
      case "publish":     return { title: "Publish", desc: `${count} produk akan tampil di storefront.` };
      case "unpublish":   return { title: "Sembunyikan", desc: `${count} produk tidak tampil di storefront (customer tidak bisa beli).` };
      case "sync_price":  return { title: "Sync Harga POS", desc: `Harga online = harga toko untuk ${count} produk. Override harga custom sebelumnya.` };
      case "reset_price": return { title: "Reset Harga", desc: `Hapus harga custom untuk ${count} produk (fallback ke harga toko).` };
    }
  }, [action, count]);
  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0 bg-cherry-50 border border-cherry-200 rounded-lg p-2">
      <p className="text-xs text-ink-900 flex-1 min-w-0">
        <b>{meta.title}?</b>
        <br className="sm:hidden" />
        <span className="text-ink-500"> {meta.desc}</span>
      </p>
      <div className="flex gap-1.5 shrink-0">
        <button
          type="button"
          onClick={onConfirm}
          disabled={processing}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-black text-white bg-gradient-to-r from-cherry-500 to-cherry-600 hover:from-cherry-600 hover:to-cherry-700 shadow-md disabled:opacity-40"
        >
          {processing ? <><Loader2 size={12} className="animate-spin" />Memproses…</> : <><CheckSquare size={12} />Ya, Lanjut</>}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={processing}
          className="h-9 px-3 rounded-lg text-xs font-bold text-ink-500 hover:text-ink-700 disabled:opacity-40"
        >
          Batal
        </button>
      </div>
    </div>
  );
}
