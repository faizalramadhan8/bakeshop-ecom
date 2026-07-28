import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Search, Package, RefreshCw, ChevronRight } from "lucide-react";
import toast from "react-hot-toast";
import { adminApi, decodeToken, type EcomAdminOrderListItem } from "@/lib/api";

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
    <main className="min-h-screen p-4 sm:p-6">
      <div className="max-w-5xl mx-auto">
        <Link
          to="/admin"
          className="inline-flex items-center gap-2 text-sm text-ink-700 hover:text-ink-900 mb-4"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Dashboard Admin
        </Link>

        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl font-black text-ink-900">Pesanan Online</h1>
            <p className="text-sm text-ink-500 mt-1">
              Terima, proses, kirim, dan input resi pesanan customer.
            </p>
          </div>
          <button
            onClick={() => load()}
            disabled={refreshing}
            aria-label="Refresh"
            className="w-11 h-11 rounded-xl border border-cherry-200 text-ink-700 hover:bg-cherry-50 flex items-center justify-center disabled:opacity-40"
          >
            <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} aria-hidden="true" />
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-500 pointer-events-none"
            aria-hidden="true"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama penerima / nomor HP / order ID"
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-cherry-200 text-sm focus:outline-none focus:ring-2 focus:ring-cherry-500/30 focus:border-cherry-400"
          />
        </div>

        {/* Filter tabs — horizontal scroll di mobile */}
        <div className="overflow-x-auto -mx-4 sm:mx-0 mb-4">
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
          <div className="space-y-2">
            {items.map((it) => {
              const badge = statusBadge(it.ecom_status);
              return (
                <Link
                  key={it.id}
                  to={`/admin/pesanan/${it.id}`}
                  className="block bg-white rounded-2xl border border-cherry-200 p-4 hover:border-cherry-400 hover:shadow-sm transition-all"
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
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
