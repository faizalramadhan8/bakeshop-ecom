import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft, Package, MapPin, Truck, CreditCard, Check, Clock, AlertCircle, Copy,
} from "lucide-react";
import toast from "react-hot-toast";
import { ordersApi, formatRp, type CustomerOrderDetail } from "@/lib/api";

const STATUS_STEPS = ["pending_payment", "paid", "processing", "shipped", "completed"];
const STATUS_LABEL: Record<string, string> = {
  pending_payment: "Menunggu Pembayaran",
  paid: "Sudah Dibayar",
  processing: "Diproses",
  shipped: "Dikirim",
  completed: "Selesai",
  cancelled: "Dibatalkan",
  expired: "Kadaluarsa",
};

function formatDateFull(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString("id-ID", {
    day: "2-digit", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export function PesananDetail() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<CustomerOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    if (!id) return;
    setLoading(true);
    ordersApi.getDetail(id)
      .then(setOrder)
      .catch((err) => setError(err instanceof Error ? err.message : "Gagal load"))
      .finally(() => setLoading(false));
  };
  useEffect(load, [id]);

  if (loading) return <div className="max-w-3xl mx-auto p-6 text-center text-ink-500">Memuat…</div>;
  if (error || !order) {
    return (
      <div className="max-w-3xl mx-auto p-6 text-center py-16">
        <AlertCircle size={40} className="mx-auto text-cherry-600 mb-3" />
        <p className="text-sm font-semibold text-cherry-600">{error || "Order tidak ditemukan"}</p>
        <Link to="/pesanan" className="inline-block mt-4 text-sm text-cherry-500 underline">
          Kembali ke daftar pesanan
        </Link>
      </div>
    );
  }

  const isCancelled = order.ecom_status === "cancelled" || order.ecom_status === "expired";
  const currentStepIdx = STATUS_STEPS.indexOf(order.ecom_status);
  const isPaid = ["paid", "processing", "shipped", "completed"].includes(order.ecom_status);
  const isPendingPayment = order.ecom_status === "pending_payment";

  return (
    <div className="max-w-3xl mx-auto p-4">
      <Link to="/pesanan" className="inline-flex items-center gap-2 text-sm text-ink-700 hover:text-ink-900 mb-4">
        <ArrowLeft size={16} /> Kembali ke daftar
      </Link>

      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs text-ink-500">Order ID</p>
          <p className="text-sm font-bold text-ink-900 font-mono">{order.id.slice(0, 8)}</p>
        </div>
        <button
          onClick={() => {
            navigator.clipboard.writeText(order.id);
            toast.success("Order ID disalin");
          }}
          className="text-xs text-cherry-500 hover:text-cherry-600 inline-flex items-center gap-1"
        >
          <Copy size={12} /> Salin ID
        </button>
      </div>

      {/* Status stepper */}
      <div className="bg-white border border-cherry-200 rounded-2xl p-4 mb-4">
        {isCancelled ? (
          <div className="text-center py-4">
            <AlertCircle size={32} className="mx-auto text-ink-500 mb-2" />
            <p className="text-sm font-bold text-ink-700">{STATUS_LABEL[order.ecom_status]}</p>
            <p className="text-xs text-ink-500 mt-1">Order ini tidak dilanjutkan</p>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            {STATUS_STEPS.map((s, i) => {
              const passed = i <= currentStepIdx;
              const current = i === currentStepIdx;
              return (
                <div key={s} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                      passed
                        ? "bg-cherry-500 text-white"
                        : "bg-cherry-100 text-ink-500"
                    }`}
                  >
                    {passed ? <Check size={14} /> : i + 1}
                  </div>
                  <p className={`text-xs text-center leading-tight ${
                    current ? "font-black text-cherry-500" : "text-ink-500"
                  }`}>
                    {STATUS_LABEL[s].split(" ")[0]}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Payment action untuk pending_payment */}
      {isPendingPayment && (
        <div className="bg-amber-50 border border-amber-500/30 rounded-2xl p-4 mb-4">
          <div className="flex items-start gap-3">
            <Clock size={18} className="text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-bold text-ink-900">Menunggu Pembayaran</p>
              {order.payment.expired_at && (
                <p className="text-xs text-ink-500 mt-0.5">
                  Bayar sebelum {formatDateFull(order.payment.expired_at)}
                </p>
              )}
              {order.payment.mode === "midtrans" && order.payment.snap_redirect_url ? (
                <a
                  href={order.payment.snap_redirect_url}
                  target="_blank"
                  rel="noopener"
                  className="inline-flex items-center gap-2 mt-3 px-4 py-2 rounded-lg text-white text-sm font-bold bg-gradient-to-r from-cherry-400 to-cherry-500"
                >
                  <CreditCard size={14} aria-hidden="true" />
                  Bayar Sekarang
                </a>
              ) : (
                <div className="mt-2 text-xs text-ink-700 leading-relaxed">
                  <p className="mb-1">
                    Transfer ke rekening toko Bu Santi kemudian hubungi admin untuk konfirmasi.
                  </p>
                  <p className="text-ink-500">
                    Kontak admin: WhatsApp 08123456789
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Items */}
      <div className="bg-white border border-cherry-200 rounded-2xl overflow-hidden mb-4">
        <div className="px-4 py-3 border-b border-cherry-100">
          <p className="text-xs font-black uppercase tracking-wider text-ink-500">
            Rincian Barang ({order.items.length})
          </p>
        </div>
        {order.items.map((it) => (
          <div key={it.product_id} className="flex items-center gap-3 px-4 py-3 border-b border-cherry-100 last:border-0">
            <div className="w-12 h-12 rounded-lg bg-cherry-50 flex items-center justify-center shrink-0">
              {it.image ? (
                // eslint-disable-next-line jsx-a11y/alt-text
                <img src={it.image} alt="" className="w-full h-full object-cover rounded-lg" />
              ) : (
                <Package size={20} className="text-cherry-300" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-ink-900 truncate">{it.name}</p>
              <p className="text-xs text-ink-500">
                {it.quantity} × {formatRp(it.unit_price)}
              </p>
            </div>
            <p className="text-sm font-bold text-ink-900 shrink-0">{formatRp(it.subtotal)}</p>
          </div>
        ))}
      </div>

      {/* Shipping */}
      <div className="bg-white border border-cherry-200 rounded-2xl p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <MapPin size={16} className="text-cherry-500" />
          <p className="text-sm font-bold text-ink-900">Alamat Pengiriman</p>
        </div>
        <p className="text-sm font-bold text-ink-900">
          {order.shipping.address.recipient_name} · {order.shipping.address.label}
        </p>
        <p className="text-xs text-ink-500 mb-1">{order.shipping.address.recipient_phone}</p>
        <p className="text-sm text-ink-700 leading-snug mb-3">
          {order.shipping.address.street_address}, {order.shipping.address.subdistrict},{" "}
          {order.shipping.address.district}, {order.shipping.address.city},{" "}
          {order.shipping.address.province} {order.shipping.address.zipcode}
        </p>
        <div className="flex items-center gap-2 pt-3 border-t border-cherry-100">
          <Truck size={16} className="text-cherry-500" />
          <div className="flex-1">
            <p className="text-sm font-bold text-ink-900">
              {order.shipping.courier} — {order.shipping.service_name}
            </p>
            <p className="text-xs text-ink-500">Estimasi {order.shipping.etd}</p>
          </div>
        </div>
        {order.shipping.awb && (
          <div className="mt-3 pt-3 border-t border-cherry-100 flex items-center justify-between">
            <div>
              <p className="text-xs text-ink-500">No. Resi</p>
              <p className="text-sm font-bold text-ink-900 font-mono">{order.shipping.awb}</p>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(order.shipping.awb || "");
                toast.success("Resi disalin");
              }}
              className="text-xs text-cherry-500 hover:text-cherry-600 inline-flex items-center gap-1"
            >
              <Copy size={12} /> Salin
            </button>
          </div>
        )}
      </div>

      {/* Payment summary */}
      <div className="bg-white border border-cherry-200 rounded-2xl p-4">
        <p className="text-xs font-black uppercase tracking-wider text-ink-500 mb-3">
          Ringkasan Pembayaran
        </p>
        <dl className="text-sm space-y-2">
          <div className="flex justify-between">
            <dt className="text-ink-700">Subtotal</dt>
            <dd className="text-ink-900">{formatRp(order.subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-700">Ongkir</dt>
            <dd className="text-ink-900">{formatRp(order.shipping_cost)}</dd>
          </div>
          <div className="flex justify-between pt-2 border-t border-cherry-100">
            <dt className="text-base font-black text-ink-900">Total</dt>
            <dd className="text-lg font-black text-cherry-500">{formatRp(order.total)}</dd>
          </div>
        </dl>
        {isPaid && order.payment.paid_at && (
          <p className="text-xs text-cherry-600 font-bold mt-3 flex items-center gap-1">
            <Check size={12} />
            Dibayar {formatDateFull(order.payment.paid_at)}
          </p>
        )}
      </div>
    </div>
  );
}
