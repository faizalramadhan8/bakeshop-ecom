// AdminAnalytics — Sprint 5 Chunk 8 (2 Aug 2026).
// Analytics deep untuk owner: daily revenue trend 30d + funnel + payment split + KPI.
// SVG-based charts (no chart library dependency).

import { useEffect, useState } from "react";
import {
  Loader2, TrendingUp, ShoppingCart, DollarSign, Percent,
  XCircle, CreditCard, Calendar, AlertCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import { adminApi, decodeToken, formatRp, type EcomAdminAnalytics } from "@/lib/api";
import { AdminShell } from "@/components/AdminShell";
import { SkeletonStat } from "@/components/Skeleton";

const ECOM_ADMIN_ROLES = ["ecom_admin", "ecom_superadmin", "superadmin"];

// Funnel steps sesuai lifecycle order (drop-off visible urutan ini).
const FUNNEL_STEPS: Array<{ key: string; label: string; color: string }> = [
  { key: "pending_payment", label: "Menunggu Bayar", color: "#F59E0B" },
  { key: "paid",            label: "Sudah Bayar",    color: "#E11D48" },
  { key: "processing",      label: "Diproses",       color: "#8B5CF6" },
  { key: "shipped",         label: "Dikirim",        color: "#3B82F6" },
  { key: "delivered",       label: "Sampai",         color: "#10B981" },
  { key: "completed",       label: "Selesai",        color: "#059669" },
];

const CHANNEL_LABELS: Record<string, string> = {
  cash: "Tunai (COD)",
  qris: "QRIS",
  transfer: "Transfer Bank",
  card: "Kartu",
  va: "Virtual Account",
  ewallet: "E-Wallet",
};

const CHANNEL_COLORS = ["#E11D48", "#F59E0B", "#8B5CF6", "#3B82F6", "#10B981", "#EC4899"];

function fmtShortDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

export function AdminAnalytics() {
  useEffect(() => {
    const claims = decodeToken();
    if (!claims || !ECOM_ADMIN_ROLES.includes(claims.role || "")) {
      window.location.href = "/";
    }
  }, []);

  const [data, setData] = useState<EcomAdminAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.getAnalytics()
      .then(setData)
      .catch((err) => toast.error(err instanceof Error ? err.message : "Gagal load"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AdminShell
      title="Analytics"
      subtitle="Ringkasan performa storefront 30 hari terakhir — trend, funnel, dan channel."
    >
      <div className="flex flex-col gap-4">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Array.from({ length: 4 }, (_, i) => <SkeletonStat key={i} />)}
          </div>
        ) : !data ? (
          <div className="py-16 text-center">
            <AlertCircle size={40} className="mx-auto text-cherry-300 mb-2" aria-hidden="true" />
            <p className="text-sm font-black text-ink-900">Belum ada data analytics</p>
            <p className="text-xs text-ink-500">Data akan muncul setelah ada transaksi.</p>
          </div>
        ) : (
          <>
            {/* KPI cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <KPICard
                icon={<DollarSign size={16} />}
                label="Pendapatan (30 hari)"
                value={formatRp(data.total_revenue)}
                sub={`${data.completed_count} order selesai`}
                highlight
              />
              <KPICard
                icon={<ShoppingCart size={16} />}
                label="Total Order"
                value={String(data.total_orders)}
                sub={`${data.completed_count} berhasil selesai`}
              />
              <KPICard
                icon={<TrendingUp size={16} />}
                label="Rata-rata Order"
                value={formatRp(data.avg_order_value)}
                sub="per transaksi selesai"
              />
              <KPICard
                icon={<Percent size={16} />}
                label="Conversion Rate"
                value={`${data.conversion_rate.toFixed(1)}%`}
                sub={`Cancel rate ${data.cancel_rate.toFixed(1)}%`}
              />
            </div>

            {/* Daily revenue chart */}
            <section className="bg-white border border-cherry-100 rounded-2xl p-5">
              <div className="flex items-start gap-3 pb-3 border-b border-cherry-100 mb-4">
                <div className="w-9 h-9 rounded-lg bg-cherry-50 text-cherry-500 flex items-center justify-center shrink-0">
                  <Calendar size={16} />
                </div>
                <div>
                  <h2 className="text-sm font-black text-ink-900">Pendapatan Harian</h2>
                  <p className="text-xs text-ink-500 mt-0.5">
                    {fmtShortDate(data.range_from)} — {fmtShortDate(data.range_to)} · order selesai saja
                  </p>
                </div>
              </div>
              <DailyRevenueChart buckets={data.daily_revenue} />
            </section>

            {/* Funnel + Channel split — side by side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Funnel */}
              <section className="bg-white border border-cherry-100 rounded-2xl p-5">
                <div className="flex items-start gap-3 pb-3 border-b border-cherry-100 mb-4">
                  <div className="w-9 h-9 rounded-lg bg-cherry-50 text-cherry-500 flex items-center justify-center shrink-0">
                    <TrendingUp size={16} />
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-ink-900">Funnel Pesanan</h2>
                    <p className="text-xs text-ink-500 mt-0.5">Drop-off per tahap 30 hari.</p>
                  </div>
                </div>
                <FunnelChart funnel={data.funnel} />
              </section>

              {/* Payment channels */}
              <section className="bg-white border border-cherry-100 rounded-2xl p-5">
                <div className="flex items-start gap-3 pb-3 border-b border-cherry-100 mb-4">
                  <div className="w-9 h-9 rounded-lg bg-cherry-50 text-cherry-500 flex items-center justify-center shrink-0">
                    <CreditCard size={16} />
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-ink-900">Metode Pembayaran</h2>
                    <p className="text-xs text-ink-500 mt-0.5">Distribusi total revenue per channel.</p>
                  </div>
                </div>
                <ChannelBreakdown channels={data.payment_channels} />
              </section>
            </div>

            {/* Cancel warning */}
            {data.cancel_rate > 20 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2 text-xs text-amber-800">
                <AlertCircle size={14} className="shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <b>Cancel rate tinggi ({data.cancel_rate.toFixed(1)}%).</b> Cek alasan customer batal —
                  bisa karena stok tidak match, ongkir kemahalan, atau timing pembayaran expired.
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AdminShell>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────

function KPICard({
  icon, label, value, sub, highlight,
}: {
  icon: React.ReactNode; label: string; value: string; sub?: string; highlight?: boolean;
}) {
  return (
    <div className={`rounded-2xl border p-4 ${
      highlight
        ? "border-cherry-400 bg-gradient-to-br from-cherry-100 to-cherry-50"
        : "border-cherry-200 bg-white"
    }`}>
      <div className="flex items-center gap-1.5 mb-1">
        <span className={highlight ? "text-cherry-600" : "text-cherry-500"}>{icon}</span>
        <p className="text-xs font-black uppercase tracking-wider text-ink-500 truncate">{label}</p>
      </div>
      <p className={`text-lg sm:text-xl font-black tabular-nums truncate ${highlight ? "text-cherry-600" : "text-ink-900"}`}>
        {value}
      </p>
      {sub && <p className="text-xs text-ink-500 mt-0.5">{sub}</p>}
    </div>
  );
}

// DailyRevenueChart — inline SVG bar chart, 30 columns.
function DailyRevenueChart({ buckets }: { buckets: EcomAdminAnalytics["daily_revenue"] }) {
  const maxRev = Math.max(...buckets.map((b) => b.revenue), 1);
  const W = 700;
  const H = 200;
  const padL = 50;
  const padR = 10;
  const padT = 10;
  const padB = 30;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;
  const barW = chartW / buckets.length;

  const totalDays = buckets.length;
  const hasData = buckets.some((b) => b.revenue > 0);

  if (!hasData) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-ink-500">Belum ada order selesai dalam 30 hari.</p>
      </div>
    );
  }

  // 4 gridlines
  const gridLines = [0.25, 0.5, 0.75, 1].map((r) => ({
    y: padT + chartH * (1 - r),
    label: fmtCompactRp(maxRev * r),
  }));

  // Label x-axis: setiap 5 hari
  const xLabels = buckets.map((b, i) => ({
    x: padL + barW * (i + 0.5),
    label: fmtShortDate(b.date),
    show: i === 0 || i === totalDays - 1 || (i + 1) % 5 === 0,
  }));

  return (
    <div className="overflow-x-auto -mx-2 px-2">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[500px]" aria-label="Grafik pendapatan harian">
        {/* Gridlines */}
        {gridLines.map((g, i) => (
          <g key={i}>
            <line x1={padL} y1={g.y} x2={W - padR} y2={g.y} stroke="#FFE4E9" strokeWidth={1} />
            <text x={padL - 4} y={g.y + 3} fontSize={9} fill="#8B6A73" textAnchor="end">{g.label}</text>
          </g>
        ))}
        {/* Bars */}
        {buckets.map((b, i) => {
          const h = (b.revenue / maxRev) * chartH;
          const x = padL + barW * i + 1;
          const y = padT + chartH - h;
          return (
            <g key={b.date}>
              <rect
                x={x} y={y} width={barW - 2} height={h}
                fill="url(#barGrad)"
                rx={2}
              >
                <title>{fmtShortDate(b.date)}: {formatRp(b.revenue)} · {b.orders} order</title>
              </rect>
            </g>
          );
        })}
        {/* X-axis labels */}
        {xLabels.filter((l) => l.show).map((l, i) => (
          <text key={i} x={l.x} y={H - 10} fontSize={9} fill="#8B6A73" textAnchor="middle">
            {l.label}
          </text>
        ))}
        <defs>
          <linearGradient id="barGrad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#E11D48" />
            <stop offset="100%" stopColor="#FB7185" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

// FunnelChart — horizontal bar per step. Show absolute count + % drop dari step pertama.
function FunnelChart({ funnel }: { funnel: Record<string, number> }) {
  const rows = FUNNEL_STEPS.map((s) => ({ ...s, count: funnel[s.key] || 0 }));
  const maxCount = Math.max(...rows.map((r) => r.count), 1);
  const firstCount = rows[0]?.count || 0;
  const hasData = rows.some((r) => r.count > 0);

  if (!hasData) {
    return <p className="text-sm text-ink-500 text-center py-8">Belum ada order.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {rows.map((r) => {
        const pct = (r.count / maxCount) * 100;
        const dropPct = firstCount > 0 ? (r.count / firstCount) * 100 : 0;
        return (
          <div key={r.key}>
            <div className="flex items-center justify-between text-xs mb-0.5">
              <span className="font-bold text-ink-900">{r.label}</span>
              <span className="text-ink-500 tabular-nums">
                <b className="text-ink-900">{r.count}</b>
                {firstCount > 0 && r.key !== "pending_payment" && (
                  <span className="ml-1 text-ink-500">({dropPct.toFixed(0)}%)</span>
                )}
              </span>
            </div>
            <div className="h-6 bg-cherry-50 rounded-md overflow-hidden">
              <div
                className="h-full transition-all"
                style={{ width: `${pct}%`, backgroundColor: r.color }}
                role="progressbar"
                aria-valuenow={r.count}
              />
            </div>
          </div>
        );
      })}
      {/* Cancelled — separate row supaya jelas ini negative outcome */}
      {(funnel["cancelled"] || 0) > 0 && (
        <div className="pt-2 mt-2 border-t border-cherry-100">
          <div className="flex items-center justify-between text-xs mb-0.5">
            <span className="font-bold text-ink-900 flex items-center gap-1">
              <XCircle size={11} className="text-red-500" />
              Dibatalkan
            </span>
            <span className="tabular-nums font-bold text-red-600">
              {funnel["cancelled"]}
            </span>
          </div>
          <div className="h-6 bg-red-50 rounded-md overflow-hidden">
            <div
              className="h-full bg-red-500 transition-all"
              style={{ width: `${((funnel["cancelled"] || 0) / maxCount) * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function ChannelBreakdown({ channels }: { channels: EcomAdminAnalytics["payment_channels"] }) {
  if (channels.length === 0) {
    return <p className="text-sm text-ink-500 text-center py-8">Belum ada pembayaran tercatat.</p>;
  }
  const total = channels.reduce((sum, c) => sum + c.amount, 0);
  return (
    <div className="flex flex-col gap-3">
      {/* Stacked bar visualization */}
      <div className="h-3 bg-cherry-50 rounded-full overflow-hidden flex">
        {channels.map((c, i) => {
          const pct = total > 0 ? (c.amount / total) * 100 : 0;
          return (
            <div
              key={c.method}
              style={{ width: `${pct}%`, backgroundColor: CHANNEL_COLORS[i % CHANNEL_COLORS.length] }}
              title={`${c.method}: ${pct.toFixed(1)}%`}
            />
          );
        })}
      </div>

      {/* Legend + amounts */}
      <div className="flex flex-col gap-1.5">
        {channels.map((c, i) => {
          const pct = total > 0 ? (c.amount / total) * 100 : 0;
          const label = CHANNEL_LABELS[c.method] || c.method;
          return (
            <div key={c.method} className="flex items-center gap-2 text-xs">
              <span
                className="w-2.5 h-2.5 rounded-sm shrink-0"
                style={{ backgroundColor: CHANNEL_COLORS[i % CHANNEL_COLORS.length] }}
              />
              <span className="flex-1 font-bold text-ink-900 truncate">{label}</span>
              <span className="text-ink-500 tabular-nums">{c.count}×</span>
              <span className="text-ink-900 font-bold tabular-nums w-24 text-right">{formatRp(c.amount)}</span>
              <span className="text-ink-500 tabular-nums w-12 text-right">{pct.toFixed(0)}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Compact Rp untuk axis label ("1.2jt", "500rb").
function fmtCompactRp(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1) + "jt";
  if (n >= 1_000) return Math.round(n / 1_000) + "rb";
  return String(Math.round(n));
}
