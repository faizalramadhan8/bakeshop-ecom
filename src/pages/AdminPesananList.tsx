import { useEffect, useState, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, Package, RefreshCw, ChevronRight, Printer, X } from "lucide-react";
import toast from "react-hot-toast";
import { adminApi, decodeToken, type EcomAdminOrderListItem } from "@/lib/api";
import { AdminShell } from "@/components/AdminShell";

const ECOM_ADMIN_ROLES = ["ecom_admin", "ecom_superadmin", "superadmin"];

// Filter tabs — urutan mirroring fulfillment funnel (yang butuh action dulu).
const STATUS_TABS: Array<{ key: string; label: string; hint: string }> = [
  { key: "paid", label: "Perlu Diproses", hint: "sudah bayar, siap packing" },
  { key: "processing", label: "Diproses", hint: "sedang di-pack" },
  { key: "shipped", label: "Dikirim", hint: "sudah kirim ke kurir" },
  { key: "pending_payment", label: "Nunggu Bayar", hint: "belum ada pembayaran" },
  { key: "completed", label: "Selesai", hint: "sampai ke customer" },
  { key: "cancelled", label: "Batal", hint: "dibatalkan" },
  { key: "all", label: "Semua", hint: "" },
];

function formatRp(n: number): string {
  return "Rp " + Math.round(n).toLocaleString("id-ID");
}

function formatDateShort(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function statusBadge(status: string): { text: string; className: string } {
  switch (status) {
    case "pending_payment": return { text: "Menunggu bayar", className: "bg-amber-100 text-amber-700" };
    case "paid":            return { text: "Perlu diproses", className: "bg-cherry-100 text-cherry-600" };
    case "processing":      return { text: "Diproses",       className: "bg-blue-100 text-blue-700" };
    case "shipped":         return { text: "Dikirim",        className: "bg-purple-100 text-purple-700" };
    case "completed":       return { text: "Selesai",        className: "bg-emerald-100 text-emerald-700" };
    case "cancelled":       return { text: "Batal",          className: "bg-red-100 text-red-700" };
    case "expired":         return { text: "Expired",        className: "bg-ink-100 text-ink-700" };
    default:                return { text: status,           className: "bg-ink-100 text-ink-700" };
  }
}

export function AdminPesananList() {
  const [items, setItems] = useState<EcomAdminOrderListItem[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [status, setStatus] = useState("paid");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // Sprint 4 Chunk 3 (31 Jul 2026) — Bulk selection for shipping actions.
  const [selectedIDs, setSelectedIDs] = useState<Set<string>>(new Set());
  const navigate = useNavigate();

  // Reset selection saat status/search berubah — cegah aksi bulk salah scope.
  useEffect(() => { setSelectedIDs(new Set()); }, [status, search]);

  const toggleSelect = (id: string) => {
    setSelectedIDs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const allVisibleIDs = useMemo(() => items.map((i) => i.id), [items]);
  const allSelected = allVisibleIDs.length > 0 && allVisibleIDs.every((id) => selectedIDs.has(id));
  const toggleSelectAll = () => {
    if (allSelected) setSelectedIDs(new Set());
    else setSelectedIDs(new Set(allVisibleIDs));
  };

  const bulkPrint = () => {
    const ids = Array.from(selectedIDs);
    if (ids.length === 0) return;
    navigate(`/admin/pesanan/print?ids=${ids.join(",")}`);
  };

  useEffect(() => {
    const claims = decodeToken();
    if (!claims || !ECOM_ADMIN_ROLES.includes(claims.role || "")) {
      window.location.href = "/";
    }
  }, []);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const resp = await adminApi.listOrders({ status, search: search.trim(), limit: 100 });
      setItems(resp.items || []);
      setCounts(resp.counts_by_status || {});
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal load pesanan");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [status, search]);

  // Debounce search — hindari fire per keystroke.
  useEffect(() => {
    const t = setTimeout(() => load(), 300);
    return () => clearTimeout(t);
  }, [load]);

  // Auto-refresh 30s untuk tab "Perlu Diproses" — supaya admin lihat order
  // baru masuk tanpa reload manual. Cegah polling tab lain (hemat request).
  useEffect(() => {
    if (status !== "paid") return;
    const iv = setInterval(() => load(true), 30_000);
    return () => clearInterval(iv);
  }, [status, load]);

  return (
    <AdminShell
      title="Pesanan Online"
      subtitle="Terima, proses, kirim, dan input resi pesanan customer."
      headerRight={
        <button
          onClick={() => load()}
          disabled={refreshing}
          aria-label="Refresh"
          className="w-11 h-11 rounded-xl border border-cherry-200 text-ink-700 hover:bg-cherry-50 flex items-center justify-center disabled:opacity-40"
        >
          <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} aria-hidden="true" />
        </button>
      }
    >
      <div>
        {/* Search — Sprint 4 Chunk 4: cover semua field + auto lintas status */}
        <div className="relative mb-1">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-500 pointer-events-none"
            aria-hidden="true"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari order ID, nama, HP, email, atau nomor resi…"
            className="w-full pl-10 pr-10 py-3 rounded-xl border border-cherry-200 text-sm focus:outline-none focus:ring-2 focus:ring-cherry-500/30 focus:border-cherry-400"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="Hapus pencarian"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center text-ink-500 hover:bg-cherry-50 hover:text-ink-700"
            >
              <X size={14} />
            </button>
          )}
        </div>
        {search && (
          <p className="text-xs text-ink-500 mb-3 px-1">
            Mencari di semua status ({items.length} hasil). Filter tab di-nonaktifkan sementara.
          </p>
        )}

        {/* Filter tabs — horizontal scroll di mobile. Dim saat search aktif. */}
        <div className={`overflow-x-auto -mx-4 sm:mx-0 mb-4 ${search ? "opacity-40 pointer-events-none" : ""}`}>
          <div className="flex gap-2 px-4 sm:px-0 min-w-max">
            {STATUS_TABS.map((tab) => {
              const cnt = tab.key === "all"
                ? Object.values(counts).reduce((a, b) => a + b, 0)
                : counts[tab.key] || 0;
              const active = status === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setStatus(tab.key)}
                  aria-pressed={active}
                  className={`shrink-0 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors flex items-center gap-2 ${
                    active
                      ? "bg-gradient-to-r from-cherry-400 to-cherry-500 text-white"
                      : "bg-white border border-cherry-200 text-ink-700 hover:bg-cherry-50"
                  }`}
                >
                  {tab.label}
                  {cnt > 0 && (
                    <span className={`min-w-[20px] h-5 px-1.5 rounded-full text-xs flex items-center justify-center font-black ${
                      active ? "bg-white/20 text-white" : "bg-cherry-100 text-cherry-600"
                    }`}>
                      {cnt}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Select-all toolbar */}
        {!loading && items.length > 0 && (
          <div className="flex items-center gap-2 mb-2 px-1">
            <label className="flex items-center gap-2 text-xs font-bold text-ink-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleSelectAll}
                className="w-4 h-4 accent-cherry-500"
              />
              {allSelected ? "Batal pilih semua" : `Pilih semua ${items.length} pesanan`}
            </label>
            {selectedIDs.size > 0 && (
              <span className="ml-auto text-xs text-cherry-600 font-black">
                {selectedIDs.size} dipilih
              </span>
            )}
          </div>
        )}

        {/* List */}
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 bg-cherry-50 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center bg-white rounded-2xl border border-cherry-200">
            <Package size={40} className="mx-auto text-ink-500 opacity-40 mb-2" aria-hidden="true" />
            <p className="text-sm text-ink-700">Tidak ada pesanan di kategori ini</p>
            <p className="text-xs text-ink-500 mt-1">
              {status === "paid" && "Semua pesanan baru sudah diproses."}
              {status === "shipped" && "Belum ada yang dikirim."}
            </p>
          </div>
        ) : (
          <div className={`space-y-2 ${selectedIDs.size > 0 ? "pb-20" : ""}`}>
            {items.map((it) => {
              const badge = statusBadge(it.ecom_status);
              const isSelected = selectedIDs.has(it.id);
              return (
                <div
                  key={it.id}
                  className={`flex items-stretch gap-0 bg-white rounded-2xl border transition-all ${
                    isSelected
                      ? "border-cherry-500 ring-2 ring-cherry-500/20"
                      : "border-cherry-200 hover:border-cherry-400 hover:shadow-sm"
                  }`}
                >
                  {/* Checkbox column — touch target 44×44 */}
                  <label className="flex items-center justify-center px-4 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(it.id)}
                      className="w-4 h-4 accent-cherry-500"
                      aria-label={`Pilih pesanan ${it.id.slice(0, 8)}`}
                    />
                  </label>
                <Link
                  to={`/admin/pesanan/${it.id}`}
                  className="flex-1 min-w-0 block p-4 pl-0"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-mono text-xs text-ink-500">
                          #{it.id.slice(0, 8)}
                        </span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${badge.className}`}>
                          {badge.text}
                        </span>
                        {it.payment_method && (
                          <span className="text-xs text-ink-500">· {it.payment_method}</span>
                        )}
                      </div>
                      <p className="text-sm font-bold text-ink-900 truncate">
                        {it.recipient || "—"}
                      </p>
                      <p className="text-xs text-ink-500 mt-0.5">
                        {it.item_count} produk · {formatRp(it.total)} · {formatDateShort(it.created_at)}
                      </p>
                      {it.awb && (
                        <p className="text-xs text-ink-700 mt-1">
                          Resi: <span className="font-mono font-bold">{it.awb}</span>
                          {it.courier && <span className="text-ink-500"> · {it.courier}</span>}
                        </p>
                      )}
                    </div>
                    <ChevronRight size={16} className="text-ink-500 mt-1 shrink-0" aria-hidden="true" />
                  </div>
                </Link>
                </div>
              );
            })}
          </div>
        )}

        {/* Bulk action bar — sticky bottom saat ada selection */}
        {selectedIDs.size > 0 && (
          <div className="fixed bottom-0 left-0 right-0 lg:left-60 z-30 bg-white border-t border-cherry-200 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] p-3">
            <div className="max-w-7xl mx-auto flex items-center gap-3 px-1 sm:px-5">
              <button
                type="button"
                onClick={() => setSelectedIDs(new Set())}
                className="w-10 h-10 rounded-xl flex items-center justify-center text-ink-700 hover:bg-cherry-50 shrink-0"
                aria-label="Batal pilih"
              >
                <X size={18} />
              </button>
              <p className="text-sm font-black text-ink-900 flex-1 min-w-0 truncate">
                <span className="text-cherry-500">{selectedIDs.size}</span> pesanan dipilih
              </p>
              <button
                type="button"
                onClick={bulkPrint}
                className="inline-flex items-center gap-1.5 h-11 px-4 rounded-xl text-sm font-black text-white bg-gradient-to-r from-cherry-500 to-cherry-600 hover:from-cherry-600 hover:to-cherry-700 shadow-lg shadow-cherry-500/20 shrink-0"
              >
                <Printer size={16} />
                Cetak Packing Slip
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
