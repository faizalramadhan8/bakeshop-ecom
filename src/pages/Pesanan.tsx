import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Receipt, Package, ChevronRight } from "lucide-react";
import { ordersApi, formatRp, type CustomerOrderListItem } from "@/lib/api";

const STATUS_STYLE: Record<string, { label: string; class: string }> = {
  pending_payment: { label: "Menunggu Pembayaran", class: "bg-amber-100 text-amber-600" },
  paid: { label: "Sudah Dibayar", class: "bg-cherry-100 text-cherry-600" },
  processing: { label: "Diproses", class: "bg-cherry-100 text-cherry-600" },
  shipped: { label: "Dikirim", class: "bg-cherry-100 text-cherry-600" },
  delivered: { label: "Sampai Tujuan", class: "bg-cherry-100 text-cherry-600" },
  completed: { label: "Selesai", class: "bg-cherry-200 text-cherry-700" },
  cancelled: { label: "Dibatalkan", class: "bg-ink-500/20 text-ink-700" },
  expired: { label: "Kadaluarsa", class: "bg-ink-500/20 text-ink-700" },
};

function formatDateShort(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  const hh = String(d.getHours()).padStart(2, "0");
  const mn = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yy} ${hh}:${mn}`;
}

export function Pesanan() {
  const [orders, setOrders] = useState<CustomerOrderListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ordersApi.list().then(setOrders).catch(() => setOrders([])).finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-xl font-black text-ink-900 mb-4">Pesanan Saya</h1>
      {loading ? (
        <p className="text-center text-ink-500 py-8">Memuat…</p>
      ) : orders.length === 0 ? (
        <div className="py-14 text-center">
          <div className="w-20 h-20 rounded-full bg-cherry-50 mx-auto mb-4 flex items-center justify-center">
            <Receipt size={40} className="text-cherry-300" aria-hidden="true" />
          </div>
          <p className="text-base font-black text-ink-900 mb-1">Belum ada pesanan</p>
          <p className="text-sm text-ink-500 mb-5 max-w-xs mx-auto leading-relaxed">
            Yuk mulai belanja bahan kue favoritmu. Semua pesanan bakal tampil di sini.
          </p>
          <Link
            to="/kategori"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white text-sm font-black bg-gradient-to-r from-cherry-500 to-cherry-600 shadow-md active:scale-[0.98]"
          >
            <Package size={14} aria-hidden="true" />
            Mulai Belanja
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {orders.map((o) => {
            const style = STATUS_STYLE[o.ecom_status] || { label: o.ecom_status, class: "bg-ink-500/20 text-ink-700" };
            return (
              <Link
                key={o.id}
                to={`/pesanan/${o.id}`}
                className="flex items-center gap-3 bg-white border border-cherry-100 rounded-2xl p-4 hover:border-cherry-300 transition-colors"
              >
                <div className="w-11 h-11 rounded-xl bg-cherry-50 flex items-center justify-center shrink-0">
                  <Receipt size={20} className="text-cherry-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${style.class}`}>
                      {style.label}
                    </span>
                    <span className="text-xs text-ink-500 truncate">
                      {formatDateShort(o.created_at)}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-ink-900 truncate">
                    {o.first_item}
                    {o.item_count > 1 && (
                      <span className="text-ink-500 font-normal"> +{o.item_count - 1} produk</span>
                    )}
                  </p>
                  <p className="text-sm font-black text-cherry-500 mt-0.5">{formatRp(o.total)}</p>
                </div>
                <ChevronRight size={16} className="text-ink-500 shrink-0" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
