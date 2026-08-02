// AdminActivityLog — Sprint 5 Chunk 9 (2 Aug 2026).
// Audit trail admin ecom — mirror pola POS `useAuditStore.log()`. Filter per
// aksi + search + drill meta JSON kalau ada.

import { useEffect, useMemo, useState } from "react";
import {
  Loader2, History, Search, User, Settings, Bell, Wallet,
  UserCheck, UserX, ShoppingCart, MessageSquare, Star,
  Package, Tag, X, ChevronDown,
} from "lucide-react";
import toast from "react-hot-toast";
import { adminApi, decodeToken, type EcomActivityLogRow } from "@/lib/api";
import { AdminShell } from "@/components/AdminShell";
import { SkeletonList } from "@/components/Skeleton";

const ECOM_ADMIN_ROLES = ["ecom_admin", "ecom_superadmin", "superadmin"];

// Action metadata — icon + tone per action slug. Fallback ke default kalau
// action baru belum di-map (biar tetap render, tidak crash).
const ACTION_META: Record<string, { icon: React.ReactNode; label: string; tone: string }> = {
  settings_changed:    { icon: <Settings size={14} />,    label: "Ubah Pengaturan",   tone: "bg-purple-50 text-purple-700 border-purple-200" },
  broadcast_sent:      { icon: <Bell size={14} />,        label: "Kirim Broadcast",   tone: "bg-cherry-50 text-cherry-700 border-cherry-200" },
  refund_created:      { icon: <Wallet size={14} />,      label: "Buat Refund",       tone: "bg-red-50 text-red-700 border-red-200" },
  customer_blocked:    { icon: <UserX size={14} />,       label: "Blokir Customer",   tone: "bg-red-50 text-red-700 border-red-200" },
  customer_unblocked:  { icon: <UserCheck size={14} />,   label: "Aktifkan Customer", tone: "bg-green-50 text-green-700 border-green-200" },
  order_status_changed:{ icon: <ShoppingCart size={14} />,label: "Ubah Status Order", tone: "bg-blue-50 text-blue-700 border-blue-200" },
  complaint_replied:   { icon: <MessageSquare size={14} />,label: "Balas Komplain",   tone: "bg-amber-50 text-amber-700 border-amber-200" },
  review_hidden:       { icon: <Star size={14} />,        label: "Sembunyikan Review",tone: "bg-red-50 text-red-700 border-red-200" },
  review_shown:        { icon: <Star size={14} />,        label: "Tampilkan Review",  tone: "bg-green-50 text-green-700 border-green-200" },
  product_published:   { icon: <Package size={14} />,     label: "Publish Produk",    tone: "bg-green-50 text-green-700 border-green-200" },
  product_unpublished: { icon: <Package size={14} />,     label: "Unpublish Produk",  tone: "bg-red-50 text-red-700 border-red-200" },
  product_price_changed:{icon: <Package size={14} />,    label: "Ubah Harga",         tone: "bg-amber-50 text-amber-700 border-amber-200" },
  category_created:    { icon: <Tag size={14} />,         label: "Buat Kategori",     tone: "bg-cherry-50 text-cherry-700 border-cherry-200" },
  category_deleted:    { icon: <Tag size={14} />,         label: "Hapus Kategori",    tone: "bg-red-50 text-red-700 border-red-200" },
};

// Filter chips — subset action yang paling sering di-audit Bu Santi.
const FILTER_OPTIONS: Array<{ key: string; label: string }> = [
  { key: "all",              label: "Semua" },
  { key: "settings_changed", label: "Pengaturan" },
  { key: "broadcast_sent",   label: "Broadcast" },
  { key: "refund_created",   label: "Refund" },
  { key: "customer_blocked", label: "Blokir" },
];

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString("id-ID", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function fmtRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "baru saja";
  if (mins < 60) return `${mins} menit lalu`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} hari lalu`;
  return fmtDate(iso);
}

export function AdminActivityLog() {
  useEffect(() => {
    const claims = decodeToken();
    if (!claims || !ECOM_ADMIN_ROLES.includes(claims.role || "")) {
      window.location.href = "/";
    }
  }, []);

  const [rows, setRows] = useState<EcomActivityLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState("all");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    adminApi.listActivity({ action, search: search.trim() || undefined, limit: 200 })
      .then((r) => setRows(r || []))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Gagal load"))
      .finally(() => setLoading(false));
  };

  // Debounce search 400ms; filter action fire immediately.
  useEffect(() => {
    const t = setTimeout(load, search ? 400 : 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [action, search]);

  const grouped = useMemo(() => {
    // Group by date "Hari ini" / "Kemarin" / "TGL"
    const map = new Map<string, EcomActivityLogRow[]>();
    const now = new Date();
    const today = now.toDateString();
    const yesterday = new Date(now.getTime() - 86_400_000).toDateString();
    rows.forEach((r) => {
      const d = new Date(r.created_at);
      let label: string;
      if (d.toDateString() === today) label = "Hari Ini";
      else if (d.toDateString() === yesterday) label = "Kemarin";
      else label = d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
      const arr = map.get(label) || [];
      arr.push(r);
      map.set(label, arr);
    });
    return Array.from(map.entries());
  }, [rows]);

  return (
    <AdminShell
      title="Riwayat Aktivitas"
      subtitle="Audit trail aksi admin — pengaturan, broadcast, refund, blokir customer, dan lainnya."
    >
      <div className="max-w-4xl flex flex-col gap-4">
        {/* Filter + search */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1 relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-500 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari keterangan atau target…"
              className="w-full h-10 pl-9 pr-3 rounded-full border border-cherry-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-cherry-500/30"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto -mx-2 px-2 sm:mx-0 sm:px-0">
            {FILTER_OPTIONS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setAction(f.key)}
                className={`shrink-0 px-3 h-10 rounded-full text-xs font-bold ${
                  action === f.key
                    ? "bg-cherry-500 text-white"
                    : "bg-white border border-cherry-200 text-ink-700 hover:bg-cherry-50"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        {loading ? (
          <SkeletonList rows={6} />
        ) : rows.length === 0 ? (
          <div className="py-16 text-center bg-white rounded-2xl border border-cherry-200">
            <div className="w-16 h-16 rounded-full bg-cherry-50 mx-auto mb-3 flex items-center justify-center">
              <History size={30} className="text-cherry-300" aria-hidden="true" />
            </div>
            <p className="text-sm font-black text-ink-900 mb-1">
              {search || action !== "all" ? "Tidak ada hasil" : "Belum ada aktivitas"}
            </p>
            <p className="text-xs text-ink-500">
              {search || action !== "all"
                ? "Coba ubah filter atau kata kunci."
                : "Aktivitas admin akan tampil di sini."}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {grouped.map(([dateLabel, dayRows]) => (
              <section key={dateLabel}>
                <p className="text-xs font-black uppercase tracking-wider text-ink-500 mb-2 px-1">
                  {dateLabel}
                </p>
                <div className="bg-white border border-cherry-100 rounded-2xl overflow-hidden">
                  {dayRows.map((r, idx) => (
                    <ActivityRow
                      key={r.id}
                      row={r}
                      expanded={expandedId === r.id}
                      onToggle={() => setExpandedId(expandedId === r.id ? null : r.id)}
                      isFirst={idx === 0}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </AdminShell>
  );
}

interface ActivityRowProps {
  row: EcomActivityLogRow;
  expanded: boolean;
  onToggle: () => void;
  isFirst: boolean;
}

function ActivityRow({ row, expanded, onToggle, isFirst }: ActivityRowProps) {
  const meta = ACTION_META[row.action] || {
    icon: <History size={14} />,
    label: row.action,
    tone: "bg-ink-50 text-ink-700 border-ink-200",
  };
  const hasMeta = row.meta && row.meta !== "null" && row.meta !== "{}";
  return (
    <div className={isFirst ? "" : "border-t border-cherry-100"}>
      <button
        type="button"
        onClick={hasMeta ? onToggle : undefined}
        disabled={!hasMeta}
        className={`w-full text-left flex items-start gap-3 p-4 ${
          hasMeta ? "hover:bg-cherry-50 cursor-pointer" : "cursor-default"
        }`}
      >
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${meta.tone}`}>
          {meta.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <span className={`text-[10px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded ${meta.tone} border`}>
              {meta.label}
            </span>
            {row.target && (
              <span className="text-[10px] font-mono text-ink-500 truncate">{row.target}</span>
            )}
          </div>
          <p className="text-sm text-ink-900">{row.description}</p>
          <p className="text-[10px] text-ink-500 mt-1 flex items-center gap-1">
            <User size={9} />
            {row.admin_name || row.admin_id.slice(0, 8)}
            <span>·</span>
            {fmtRelative(row.created_at)}
          </p>
        </div>
        {hasMeta && (
          <ChevronDown
            size={14}
            className={`shrink-0 text-ink-500 transition-transform mt-1 ${expanded ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
        )}
      </button>
      {expanded && hasMeta && (
        <div className="px-4 pb-4 -mt-2">
          <div className="rounded-lg bg-cherry-50/50 border border-cherry-100 p-3">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[10px] font-black uppercase tracking-wider text-ink-500">Detail</p>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onToggle(); }}
                className="text-ink-500 hover:text-ink-900"
                aria-label="Tutup detail"
              >
                <X size={12} />
              </button>
            </div>
            <pre className="text-[11px] text-ink-700 whitespace-pre-wrap break-all font-mono leading-snug">
              {(() => {
                try {
                  return JSON.stringify(JSON.parse(row.meta as string), null, 2);
                } catch {
                  return String(row.meta);
                }
              })()}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
