import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Package, ShoppingCart, Users, TrendingUp, Tag, Ticket, MessageSquare, Star, AlertCircle, Settings } from "lucide-react";
import { decodeToken, adminApi, formatRp, type EcomAdminDashboardStats } from "@/lib/api";
import { AdminShell } from "@/components/AdminShell";

const ECOM_ADMIN_ROLES = ["ecom_admin", "ecom_superadmin", "superadmin"];

export function AdminDashboard() {
  useEffect(() => {
    const claims = decodeToken();
    if (!claims || !ECOM_ADMIN_ROLES.includes(claims.role || "")) {
      window.location.href = "/";
    }
  }, []);

  // Sprint 3 #13 — Dashboard stats widget
  const [stats, setStats] = useState<EcomAdminDashboardStats | null>(null);
  useEffect(() => {
    adminApi.getDashboardStats()
      .then(setStats)
      .catch(() => {});
  }, []);

  const cards = [
    {
      to: "/admin/produk",
      icon: <Package size={20} />,
      title: "Produk Online",
      desc: "Manage stok, harga, deskripsi produk yang tampil di storefront",
    },
    {
      to: "/admin/kategori",
      icon: <Tag size={20} />,
      title: "Kategori Online",
      desc: "Kelompok produk khusus storefront (terpisah dari kategori POS)",
    },
    {
      to: "/admin/voucher",
      icon: <Ticket size={20} />,
      title: "Voucher & Promo",
      desc: "Kode diskon percent/fixed, kuota, expiry, min belanja",
    },
    {
      to: "/admin/pesanan",
      icon: <ShoppingCart size={20} />,
      title: "Pesanan Online",
      desc: "Terima, proses, kirim, input resi pesanan customer",
    },
    {
      to: "/admin/komplain",
      icon: <MessageSquare size={20} />,
      title: "Komplain Customer",
      desc: "Balas keluhan customer soal barang rusak/salah/kurang",
    },
    {
      to: "/admin/ulasan",
      icon: <Star size={20} />,
      title: "Moderasi Ulasan",
      desc: "Sembunyikan ulasan yang mengandung SARA, spam, atau tidak sesuai aturan",
    },
    {
      to: "/admin/customers",
      icon: <Users size={20} />,
      title: "Customer",
      desc: "Daftar customer registered + riwayat order + block/unblock",
    },
    {
      to: "/admin/pengaturan",
      icon: <Settings size={20} />,
      title: "Pengaturan",
      desc: "Min order, kontak WA, announcement bar, metode pembayaran",
    },
  ];

  return (
    <AdminShell title="Dashboard" subtitle="Ringkasan operasional storefront Toko Bahan Kue Santi">
      <div>
        {/* Sprint 3 #13 — Widgets. status_counts + top_products defensively
            guarded — kalau BE belum deploy endpoint baru atau shape mismatch,
            block ini jangan sampai crash React (blank page insiden 30 Jul). */}
        {stats && (() => {
          const statusCounts = stats.status_counts || {};
          const paidCount = statusCounts.paid || 0;
          const pendingCount = statusCounts.pending_payment || 0;
          const topProducts = stats.top_products_month || [];
          const complaintsPending = stats.complaints_pending || 0;
          const lowStockCount = stats.low_stock_count || 0;
          return (
          <div className="mb-8 flex flex-col gap-4">
            {/* Alert bar untuk hal urgent — complaints + low stock */}
            {(complaintsPending > 0 || lowStockCount > 0 || paidCount > 0) && (
              <div className="bg-white border border-cherry-200 rounded-2xl p-4">
                <p className="text-xs font-black uppercase tracking-wider text-cherry-600 mb-3 flex items-center gap-1.5">
                  <AlertCircle size={14} />
                  Butuh Perhatian
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {paidCount > 0 && (
                    <Link
                      to="/admin/pesanan"
                      className="flex items-center gap-3 p-3 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 transition-colors"
                    >
                      <ShoppingCart size={22} className="text-amber-600 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-lg font-black text-amber-700 leading-tight">{paidCount}</p>
                        <p className="text-xs text-amber-700 font-bold">Pesanan siap diproses</p>
                      </div>
                    </Link>
                  )}
                  {complaintsPending > 0 && (
                    <Link
                      to="/admin/komplain"
                      className="flex items-center gap-3 p-3 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 transition-colors"
                    >
                      <MessageSquare size={22} className="text-red-600 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-lg font-black text-red-700 leading-tight">{complaintsPending}</p>
                        <p className="text-xs text-red-700 font-bold">Komplain menunggu balasan</p>
                      </div>
                    </Link>
                  )}
                  {lowStockCount > 0 && (
                    <Link
                      to="/admin/produk"
                      className="flex items-center gap-3 p-3 rounded-xl border border-cherry-200 bg-cherry-50 hover:bg-cherry-100 transition-colors"
                    >
                      <Package size={22} className="text-cherry-600 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-lg font-black text-cherry-700 leading-tight">{lowStockCount}</p>
                        <p className="text-xs text-cherry-700 font-bold">Produk stok tipis</p>
                      </div>
                    </Link>
                  )}
                </div>
              </div>
            )}

            {/* Revenue widgets */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard label="Pendapatan Hari Ini" value={formatRp(stats.today_revenue || 0)} sub={`${stats.today_orders || 0} pesanan`} />
              <StatCard label="Pendapatan Bulan Ini" value={formatRp(stats.month_revenue || 0)} sub={`${stats.month_orders || 0} pesanan`} highlight />
              <StatCard label="Total Customer" value={String(stats.total_customers || 0)} sub="terdaftar aktif" />
              <StatCard label="Menunggu Bayar" value={String(pendingCount)} sub="belum lunas" />
            </div>

            {/* Top produk */}
            {topProducts.length > 0 && (
              <div className="bg-white border border-cherry-200 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp size={16} className="text-cherry-500" />
                  <h3 className="text-sm font-black text-ink-900">Terlaris Bulan Ini</h3>
                </div>
                <div className="flex flex-col divide-y divide-cherry-100">
                  {topProducts.map((p, i) => (
                    <div key={p.product_id} className="flex items-center gap-3 py-2.5">
                      <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                        i === 0 ? "bg-amber-500 text-white" :
                        i === 1 ? "bg-cherry-300 text-white" :
                        i === 2 ? "bg-cherry-200 text-cherry-700" :
                        "bg-cherry-100 text-cherry-600"
                      }`}>
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-ink-900 truncate">{p.name}</p>
                        <p className="text-xs text-ink-500">
                          {p.qty_sold} terjual · {formatRp(p.revenue)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          );
        })()}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((c) => (
            <Link
              key={c.title}
              to={c.to}
              className="block bg-white rounded-2xl border border-cherry-200 p-5 transition-all hover:border-cherry-400 hover:shadow-md"
            >
              <div className="w-10 h-10 rounded-xl bg-cherry-100 text-cherry-500 flex items-center justify-center mb-3">
                {c.icon}
              </div>
              <h2 className="text-base font-black text-ink-900 mb-1">{c.title}</h2>
              <p className="text-xs text-ink-700 leading-relaxed">{c.desc}</p>
            </Link>
          ))}
        </div>

        <div className="mt-8 bg-cherry-50 rounded-2xl border border-cherry-200 p-5">
          <h3 className="text-sm font-black text-ink-900 mb-2">Butuh bantuan?</h3>
          <p className="text-xs text-ink-700 leading-relaxed">
            Kalau ada kendala teknis atau permintaan fitur baru, hubungi tim developer
            via WhatsApp. Data storefront terpisah dari POS — perubahan di sini tidak
            mengganggu operasi kasir.
          </p>
        </div>
      </div>
    </AdminShell>
  );
}

function StatCard({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 ${highlight ? "border-cherry-400 bg-gradient-to-br from-cherry-100 to-cherry-50" : "border-cherry-200 bg-white"}`}>
      <p className="text-xs font-bold text-ink-500 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-lg sm:text-xl font-black tracking-tight truncate ${highlight ? "text-cherry-600" : "text-ink-900"}`}>
        {value}
      </p>
      {sub && <p className="text-xs text-ink-500 mt-0.5">{sub}</p>}
    </div>
  );
}
