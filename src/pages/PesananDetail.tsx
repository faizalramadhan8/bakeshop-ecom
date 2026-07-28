import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft, Package, MapPin, Truck, CreditCard, Check, Clock, AlertCircle, Copy,
  PackageCheck,
} from "lucide-react";
import toast from "react-hot-toast";
import { ordersApi, formatRp, type CustomerOrderDetail } from "@/lib/api";

// Map courier name (case-insensitive substring) → tracking URL template.
// Return null kalau kurir tidak dikenal — FE hide tombol lacak.
function trackingURL(courier: string, awb: string): string | null {
  if (!awb) return null;
  const c = courier.toLowerCase();
  if (c.includes("jne")) return `https://www.jne.co.id/tracking/trace/${encodeURIComponent(awb)}`;
  if (c.includes("j&t") || c.includes("jnt")) return `https://www.jet.co.id/track?awb=${encodeURIComponent(awb)}`;
  if (c.includes("sicepat")) return `https://www.sicepat.com/checkAwb/${encodeURIComponent(awb)}`;
  if (c.includes("anteraja")) return `https://anteraja.id/tracking?awb=${encodeURIComponent(awb)}`;
  if (c.includes("ninja")) return `https://www.ninjaxpress.co/id-id/tracking?id=${encodeURIComponent(awb)}`;
  if (c.includes("pos")) return `https://www.posindonesia.co.id/id/tracking?resi=${encodeURIComponent(awb)}`;
  return null;
}

const STATUS_STEPS = ["pending_payment", "paid", "processing", "shipped", "delivered", "completed"];
const STATUS_LABEL: Record<string, string> = {
  pending_payment: "Menunggu Pembayaran",
  paid: "Sudah Dibayar",
  processing: "Diproses",
  shipped: "Dikirim",
  delivered: "Sampai",
  completed: "Selesai",
  cancelled: "Dibatalkan",
  expired: "Kadaluarsa",
};
// Label ringkas untuk stepper 6-kolom di mobile — max 1 kata pendek supaya
// tidak overflow / wrap ke 2 baris di iPhone SE (320px).
const STATUS_STEP_LABEL: Record<string, string> = {
  pending_payment: "Bayar",
  paid: "Dibayar",
  processing: "Diproses",
  shipped: "Dikirim",
  delivered: "Sampai",
  completed: "Selesai",
};

function formatDateFull(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString("id-ID", {
    day: "2-digit", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// Selisih hari (bulat ke bawah) antara now dan iso timestamp. Return 0 kalau
// hari yang sama (baru saja tag delivered).
function daysSince(iso?: string): number {
  if (!iso) return 0;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 0;
  const diffMs = Date.now() - then;
  return Math.max(0, Math.floor(diffMs / (24 * 60 * 60 * 1000)));
}

export function PesananDetail() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<CustomerOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const load = () => {
    if (!id) return;
    setLoading(true);
    ordersApi.getDetail(id)
      .then(setOrder)
      .catch((err) => setError(err instanceof Error ? err.message : "Gagal load"))
      .finally(() => setLoading(false));
  };
  useEffect(load, [id]);

  const handleConfirmReceived = async () => {
    if (!id || confirming) return;
    // Marketplace pattern — final action, tegaskan sekali sebelum kirim
    // (cegah tap tidak sengaja saat scroll).
    if (!window.confirm("Konfirmasi barang sudah diterima dengan baik? Setelah dikonfirmasi, pesanan ditandai selesai.")) {
      return;
    }
    setConfirming(true);
    try {
      const updated = await ordersApi.confirmReceived(id);
      setOrder(updated);
      toast.success("Terima kasih! Pesanan selesai. Yuk tulis ulasan 🌟");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal konfirmasi");
    } finally {
      setConfirming(false);
    }
  };

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
  const isPaid = ["paid", "processing", "shipped", "delivered", "completed"].includes(order.ecom_status);
  const isPendingPayment = order.ecom_status === "pending_payment";
  // Kurir sudah tandai sampai — customer boleh konfirmasi. Termasuk state
  // `shipped` untuk kasus kurir Bu Santi tanpa Biteship webhook (Bu Santi
  // set resi manual, customer terima duluan, admin belum sempat mark
  // delivered). Cegah customer stuck menunggu status berubah.
  const canConfirmReceive = order.ecom_status === "delivered" || order.ecom_status === "shipped";
  const deliveredDaysAgo = daysSince(order.ecom_delivered_at);

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
                  <p className={`text-[10px] sm:text-xs text-center leading-tight ${
                    current ? "font-black text-cherry-500" : "text-ink-500"
                  }`}>
                    {STATUS_STEP_LABEL[s]}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Panel konfirmasi barang diterima — muncul saat status delivered
          atau shipped (kalau resi manual, kurir sudah sampai tapi Biteship
          webhook tidak fire). CTA utama halaman ini saat step 5. */}
      {canConfirmReceive && (
        <div className="bg-gradient-to-br from-cherry-50 to-white border border-cherry-200 rounded-2xl p-4 mb-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-cherry-500 flex items-center justify-center shrink-0">
              <PackageCheck size={20} className="text-white" aria-hidden="true" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-black text-ink-900">
                Barang sudah sampai?
              </p>
              <p className="text-xs text-ink-700 leading-relaxed mt-1">
                {order.ecom_status === "delivered"
                  ? `Kurir sudah menandai pesanan sampai${
                      deliveredDaysAgo > 0 ? ` ${deliveredDaysAgo} hari lalu` : " hari ini"
                    }. Cek dulu barangnya, lalu konfirmasi supaya pesanan selesai.`
                  : "Kalau kurir sudah kasih paketmu dan barangnya sesuai, klik tombol di bawah untuk tandai selesai."}
              </p>
              <button
                type="button"
                onClick={handleConfirmReceived}
                disabled={confirming}
                className="mt-3 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-black text-white bg-gradient-to-r from-cherry-500 to-cherry-600 hover:from-cherry-600 hover:to-cherry-700 disabled:opacity-60 disabled:cursor-not-allowed shadow-md active:scale-[0.98] transition-transform"
              >
                {confirming ? (
                  <>
                    <Clock size={14} className="animate-spin" aria-hidden="true" />
                    Memproses…
                  </>
                ) : (
                  <>
                    <Check size={14} aria-hidden="true" />
                    Ya, Barang Diterima
                  </>
                )}
              </button>
              {order.ecom_status === "delivered" && (
                <p className="text-xs text-ink-500 mt-2 leading-snug">
                  Kalau tidak konfirmasi dalam 7 hari, pesanan akan otomatis
                  ditandai selesai.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Panel selesai — customer sudah konfirmasi (atau auto-complete). */}
      {order.ecom_status === "completed" && (
        <div className="bg-cherry-50 border border-cherry-200 rounded-2xl p-4 mb-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-cherry-500 flex items-center justify-center shrink-0">
              <Check size={20} className="text-white" aria-hidden="true" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-black text-ink-900">Pesanan Selesai</p>
              <p className="text-xs text-ink-700 mt-1">
                Terima kasih sudah belanja di Toko Bahan Kue Santi 🌟 Jangan
                lupa tulis ulasan untuk produk yang kamu beli.
              </p>
            </div>
          </div>
        </div>
      )}

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
              {order.payment.mode === "pg" && order.payment.payment_url ? (
                <div className="mt-3">
                  {order.payment.channel && (
                    <p className="text-xs text-ink-700 mb-2">
                      Metode: <span className="font-bold uppercase">{order.payment.channel}</span>
                    </p>
                  )}
                  <a
                    href={order.payment.payment_url}
                    target="_blank"
                    rel="noopener"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-bold bg-gradient-to-r from-cherry-400 to-cherry-500"
                  >
                    <CreditCard size={14} aria-hidden="true" />
                    Bayar Sekarang
                  </a>
                </div>
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
          <div className="mt-3 pt-3 border-t border-cherry-100">
            <div className="flex items-center justify-between mb-2">
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
                <Copy size={12} aria-hidden="true" /> Salin
              </button>
            </div>
            {/* Prefer Biteship public tracking link — sudah include peta +
                history + auto-refresh, jauh lebih baik dari web kurir manual.
                Fallback ke tracking URL per courier kalau Biteship link belum ada. */}
            {(order.shipping.tracking_url || trackingURL(order.shipping.courier, order.shipping.awb)) && (
              <a
                href={order.shipping.tracking_url || trackingURL(order.shipping.courier, order.shipping.awb)!}
                target="_blank"
                rel="noopener"
                className="inline-flex items-center gap-1.5 mt-1 px-3 py-2 rounded-lg text-xs font-bold text-cherry-500 border border-cherry-200 hover:bg-cherry-50"
              >
                <Truck size={12} aria-hidden="true" />
                Lacak Paket
              </a>
            )}
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
