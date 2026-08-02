// AdminCustomers — Sprint 4 Chunk 1 (30 Jul 2026).
// List customer registered + drill-down riwayat order + ban/unban.
// Data source BE: /ecom/admin/customers (LEFT JOIN aggregate order stats).

import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Search, Users, Loader2, Mail, Phone, ShoppingBag,
  UserCheck, UserX, ChevronRight, MapPin, TrendingUp, X, Ban, CheckCircle2,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  adminApi, decodeToken, formatRp,
  type EcomAdminCustomerListItem, type EcomAdminCustomerDetail,
} from "@/lib/api";
import { AdminShell } from "@/components/AdminShell";
import { SkeletonList } from "@/components/Skeleton";

const ECOM_ADMIN_ROLES = ["ecom_admin", "ecom_superadmin", "superadmin"];

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric", month: "short", year: "numeric",
  });
}

export function AdminCustomers() {
  useEffect(() => {
    const claims = decodeToken();
    if (!claims || !ECOM_ADMIN_ROLES.includes(claims.role || "")) {
      window.location.href = "/";
    }
  }, []);

  const [items, setItems] = useState<EcomAdminCustomerListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "banned" | "no_order">("all");
  const [total, setTotal] = useState(0);
  const [detailID, setDetailID] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    adminApi.listCustomers({ search: search.trim() || undefined, limit: 100 })
      .then((res) => {
        setItems(res.items || []);
        setTotal(res.total || 0);
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Gagal load"))
      .finally(() => setLoading(false));
  };

  // Debounce search 400ms.
  useEffect(() => {
    const t = setTimeout(load, search ? 400 : 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const filtered = useMemo(() => {
    return items.filter((c) => {
      if (statusFilter === "active") return c.is_active;
      if (statusFilter === "banned") return !c.is_active;
      if (statusFilter === "no_order") return c.order_count === 0;
      return true;
    });
  }, [items, statusFilter]);

  return (
    <AdminShell
      title="Customer"
      subtitle={`${total} customer terdaftar — filter & drill-down riwayat order`}
    >
      {/* Search */}
      <div className="relative mb-3">
        <Search
          size={18}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-500 pointer-events-none"
          aria-hidden="true"
        />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nama, email, atau nomor HP…"
          className="w-full pl-12 pr-4 py-3 rounded-2xl border border-cherry-200 text-sm focus:outline-none focus:ring-2 focus:ring-cherry-500/30 focus:border-cherry-400"
        />
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-2 mb-6">
        {(
          [
            { key: "all", label: "Semua" },
            { key: "active", label: "Aktif" },
            { key: "banned", label: "Diblokir" },
            { key: "no_order", label: "Belum pernah order" },
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
        <SkeletonList rows={6} />
      ) : filtered.length === 0 ? (
        <EmptyState hasSearch={!!search || statusFilter !== "all"} />
      ) : (
        <div className="bg-white rounded-2xl border border-cherry-200 overflow-hidden">
          {filtered.map((c, idx) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setDetailID(c.id)}
              className={`w-full text-left flex items-center gap-4 px-5 py-4 hover:bg-cherry-50 transition-colors ${
                idx > 0 ? "border-t border-cherry-100" : ""
              }`}
            >
              {/* Avatar initials */}
              <div className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-black shrink-0 ${
                c.is_active
                  ? "bg-gradient-to-br from-cherry-400 to-cherry-500 text-white"
                  : "bg-ink-500/20 text-ink-500"
              }`}>
                {initials(c.full_name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-sm font-black text-ink-900 truncate">{c.full_name || "(tanpa nama)"}</p>
                  {!c.is_active && (
                    <span className="shrink-0 text-[10px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded bg-red-100 text-red-700">
                      Blokir
                    </span>
                  )}
                </div>
                <p className="text-xs text-ink-500 truncate">
                  {c.email}
                  {c.phone && <> · {c.phone}</>}
                </p>
              </div>
              <div className="hidden sm:flex flex-col items-end shrink-0">
                <p className="text-xs text-ink-500">
                  {c.order_count} order
                </p>
                <p className="text-sm font-black text-cherry-500 tabular-nums">
                  {formatRp(c.total_spent)}
                </p>
              </div>
              <ChevronRight size={16} className="text-ink-500 shrink-0" aria-hidden="true" />
            </button>
          ))}
        </div>
      )}

      {/* Detail modal */}
      {detailID && (
        <CustomerDetailModal
          customerID={detailID}
          onClose={() => setDetailID(null)}
          onChanged={() => load()}
        />
      )}
    </AdminShell>
  );
}

function initials(name: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function EmptyState({ hasSearch }: { hasSearch: boolean }) {
  return (
    <div className="py-16 text-center bg-white rounded-2xl border border-cherry-200">
      <div className="w-16 h-16 rounded-full bg-cherry-50 mx-auto mb-3 flex items-center justify-center">
        <Users size={30} className="text-cherry-300" aria-hidden="true" />
      </div>
      <p className="text-sm font-black text-ink-900 mb-1">
        {hasSearch ? "Tidak ada hasil" : "Belum ada customer"}
      </p>
      <p className="text-xs text-ink-500">
        {hasSearch
          ? "Coba ubah filter atau kata kunci pencarian."
          : "Customer baru akan tampil setelah register di storefront."}
      </p>
    </div>
  );
}

interface CustomerDetailModalProps {
  customerID: string;
  onClose: () => void;
  onChanged: () => void;
}

function CustomerDetailModal({ customerID, onClose, onChanged }: CustomerDetailModalProps) {
  const [data, setData] = useState<EcomAdminCustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmingBan, setConfirmingBan] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    setLoading(true);
    adminApi.getCustomer(customerID)
      .then((res) => setData(res))
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : "Gagal load detail");
        onClose();
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerID]);

  // Escape untuk tutup — a11y (rule §1 escape-routes).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doToggleActive = async (nextActive: boolean) => {
    if (!data) return;
    setProcessing(true);
    try {
      await adminApi.setCustomerActive(data.id, nextActive);
      setData({ ...data, is_active: nextActive });
      setConfirmingBan(false);
      onChanged();
      toast.success(nextActive ? "Customer diaktifkan" : "Customer diblokir");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal update status");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink-900/50 p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-2xl sm:rounded-3xl rounded-t-3xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-cherry-100">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-cherry-400 to-cherry-500 text-white flex items-center justify-center text-sm font-black shrink-0">
              {data ? initials(data.full_name) : "…"}
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-black text-ink-900 truncate">
                {data?.full_name || "Memuat…"}
              </h2>
              <p className="text-xs text-ink-500 truncate">Customer detail</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-ink-700 hover:bg-cherry-50 shrink-0"
            aria-label="Tutup"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body scrollable */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading || !data ? (
            <div className="py-16 text-center text-ink-500 text-sm">
              <Loader2 size={20} className="animate-spin mx-auto mb-2" />
              Memuat detail…
            </div>
          ) : (
            <>
              {/* Contact */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
                <InfoCard icon={<Mail size={14} />} label="Email" value={data.email || "—"} />
                <InfoCard icon={<Phone size={14} />} label="No HP" value={data.phone || "—"} />
                <InfoCard icon={<MapPin size={14} />} label="Alamat tersimpan" value={`${data.address_count} alamat`} />
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
                <StatMini label="Total Spent" value={formatRp(data.total_spent)} highlight />
                <StatMini label="Total Order" value={String(data.order_count)} />
                <StatMini label="Rata-rata" value={formatRp(data.avg_order_value)} />
                <StatMini label="Terakhir Order" value={fmtDate(data.last_order_date)} />
              </div>

              {/* Status breakdown */}
              <div className="grid grid-cols-3 gap-2 mb-5">
                <StatusChip icon={<CheckCircle2 size={13} />} tone="green" label="Selesai" count={data.completed_count} />
                <StatusChip icon={<TrendingUp size={13} />} tone="amber" label="Diproses" count={data.pending_count} />
                <StatusChip icon={<Ban size={13} />} tone="red" label="Batal" count={data.cancelled_count} />
              </div>

              {/* Recent orders */}
              <div className="mb-5">
                <h3 className="text-xs font-black uppercase tracking-wider text-ink-500 mb-2">
                  Riwayat Order (Terbaru)
                </h3>
                {data.recent_orders.length === 0 ? (
                  <div className="bg-cherry-50/50 rounded-xl p-4 text-center text-xs text-ink-500">
                    Belum ada order.
                  </div>
                ) : (
                  <div className="bg-white border border-cherry-100 rounded-xl overflow-hidden">
                    {data.recent_orders.map((o, i) => (
                      <Link
                        key={o.id}
                        to={`/admin/pesanan/${o.id}`}
                        className={`flex items-center gap-3 px-4 py-3 hover:bg-cherry-50 transition-colors ${
                          i > 0 ? "border-t border-cherry-100" : ""
                        }`}
                        onClick={onClose}
                      >
                        <ShoppingBag size={14} className="text-ink-500 shrink-0" aria-hidden="true" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-ink-900 truncate">
                            #{o.id.slice(0, 8).toUpperCase()} · {o.item_count} item
                          </p>
                          <p className="text-[10px] text-ink-500">
                            {fmtDate(o.created_at)} · {o.status}
                          </p>
                        </div>
                        <span className="text-xs font-black text-cherry-500 tabular-nums shrink-0">
                          {formatRp(o.total)}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Ban/Unban section */}
              <div className={`rounded-xl p-4 border ${
                data.is_active ? "bg-red-50/50 border-red-200" : "bg-green-50/50 border-green-200"
              }`}>
                {confirmingBan ? (
                  <div>
                    <p className="text-sm font-black text-ink-900 mb-1">
                      Blokir customer ini?
                    </p>
                    <p className="text-xs text-ink-700 mb-3">
                      Setelah diblokir, customer tidak bisa login atau checkout. Riwayat
                      order tetap tersimpan. Bisa di-unblock kapan saja.
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => doToggleActive(false)}
                        disabled={processing}
                        className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-md active:scale-[0.98] disabled:opacity-40"
                      >
                        {processing ? (
                          <><Loader2 size={12} className="animate-spin" />Memproses…</>
                        ) : (
                          <><Ban size={12} />Ya, Blokir</>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmingBan(false)}
                        disabled={processing}
                        className="h-9 px-3 rounded-lg text-xs font-bold text-ink-500 hover:text-ink-700 disabled:opacity-40"
                      >
                        Batal
                      </button>
                    </div>
                  </div>
                ) : data.is_active ? (
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-ink-900">Customer aktif</p>
                      <p className="text-xs text-ink-500">Bisa login + checkout normal.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setConfirmingBan(true)}
                      className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-bold border border-red-500 text-red-600 hover:bg-red-50 shrink-0"
                    >
                      <UserX size={12} />Blokir
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-ink-900">Customer diblokir</p>
                      <p className="text-xs text-ink-500">Tidak bisa login atau checkout.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => doToggleActive(true)}
                      disabled={processing}
                      className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-md shrink-0 disabled:opacity-40"
                    >
                      {processing ? <Loader2 size={12} className="animate-spin" /> : <UserCheck size={12} />}
                      Aktifkan
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-cherry-50/50 rounded-xl p-3">
      <p className="text-[10px] font-black uppercase tracking-wider text-ink-500 mb-1 flex items-center gap-1">
        {icon}{label}
      </p>
      <p className="text-xs font-bold text-ink-900 truncate" title={value}>{value}</p>
    </div>
  );
}

function StatMini({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl p-3 border ${
      highlight
        ? "border-cherry-300 bg-gradient-to-br from-cherry-100 to-cherry-50"
        : "border-cherry-100 bg-white"
    }`}>
      <p className="text-[10px] font-black uppercase tracking-wider text-ink-500 mb-1">{label}</p>
      <p className={`text-sm font-black tabular-nums truncate ${highlight ? "text-cherry-600" : "text-ink-900"}`}>
        {value}
      </p>
    </div>
  );
}

function StatusChip({ icon, tone, label, count }: {
  icon: React.ReactNode; tone: "green" | "amber" | "red"; label: string; count: number;
}) {
  const cls = {
    green: "bg-green-50 border-green-200 text-green-700",
    amber: "bg-amber-50 border-amber-200 text-amber-700",
    red:   "bg-red-50 border-red-200 text-red-700",
  }[tone];
  return (
    <div className={`rounded-xl border p-2.5 ${cls}`}>
      <div className="flex items-center gap-1.5 mb-0.5">
        {icon}
        <p className="text-[10px] font-black uppercase tracking-wider truncate">{label}</p>
      </div>
      <p className="text-base font-black tabular-nums">{count}</p>
    </div>
  );
}
