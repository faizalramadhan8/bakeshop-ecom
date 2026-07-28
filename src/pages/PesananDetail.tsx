import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft, Package, MapPin, Truck, CreditCard, Check, Clock, AlertCircle, Copy,
  PackageCheck, Star, X, Sparkles,
} from "lucide-react";
import toast from "react-hot-toast";
import { ordersApi, accountApi, formatRp, formatETD, type CustomerOrderDetail } from "@/lib/api";
import { CourierLogo } from "@/components/CourierLogo";

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
  // Modal states — marketplace-style: (1) confirmation modal, (2) review composer
  // muncul otomatis setelah konfirmasi sukses supaya customer langsung kasih
  // ulasan mumpung habis unboxing. Cegah "reminder review" via push nanti.
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);

  const load = () => {
    if (!id) return;
    setLoading(true);
    ordersApi.getDetail(id)
      .then(setOrder)
      .catch((err) => setError(err instanceof Error ? err.message : "Gagal load"))
      .finally(() => setLoading(false));
  };
  useEffect(load, [id]);

  const submitConfirm = async () => {
    if (!id || confirming) return;
    setConfirming(true);
    try {
      const updated = await ordersApi.confirmReceived(id);
      setOrder(updated);
      setConfirmOpen(false);
      // Auto-open review composer — pattern Tokopedia/Shopee: kasih ulasan
      // langsung setelah selesai, mumpung memori unboxing masih fresh.
      setReviewOpen(true);
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
        <p className="text-sm font-semibold text-cherry-600">{error || "Pesanan tidak ditemukan"}</p>
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
          <p className="text-xs text-ink-500">No. Pesanan</p>
          <p className="text-sm font-bold text-ink-900 font-mono">{order.id.slice(0, 8)}</p>
        </div>
        <button
          onClick={() => {
            navigator.clipboard.writeText(order.id);
            toast.success("No. pesanan disalin");
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
                onClick={() => setConfirmOpen(true)}
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
        <div className="flex items-center gap-3 pt-3 border-t border-cherry-100">
          <CourierLogo courier={order.shipping.courier} size={36} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-ink-900 truncate">
              {order.shipping.courier} · {order.shipping.service_name}
            </p>
            <p className="text-xs text-ink-500">Estimasi {formatETD(order.shipping.etd)}</p>
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

      {/* Modal konfirmasi terima — ganti native window.confirm dengan UI
          on-brand + touch target 44px+ + escape via backdrop/X/Cancel. */}
      {confirmOpen && (
        <ConfirmReceivedModal
          confirming={confirming}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={submitConfirm}
        />
      )}

      {/* Modal review composer — auto-open setelah konfirmasi sukses. Per-item
          rating 5 bintang + comment opsional. Multi-item = scrollable list.
          Skip button "Nanti Saja" tanpa penalty. */}
      {reviewOpen && (
        <ReviewComposerModal
          order={order}
          onClose={() => setReviewOpen(false)}
        />
      )}
    </div>
  );
}

// ─── ConfirmReceivedModal ─────────────────────────────────────────────
// Ganti native window.confirm() supaya UX on-brand + support keyboard
// escape + backdrop click + loading state saat submit. Focus dikelola user
// via Tab — no auto-focus trap untuk sekarang.

function ConfirmReceivedModal({
  confirming,
  onCancel,
  onConfirm,
}: {
  confirming: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !confirming) onCancel();
    };
    document.addEventListener("keydown", onKey);
    // Cegah scroll background saat modal terbuka.
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [confirming, onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-ink-900/60 backdrop-blur-sm modal-fade-in"
        onClick={() => !confirming && onCancel()}
      />

      {/* Card */}
      <div className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-7 modal-scale-in">
        {/* Close X — cepat tap untuk close, touch target 44px */}
        <button
          type="button"
          onClick={onCancel}
          disabled={confirming}
          aria-label="Tutup"
          className="absolute top-3 right-3 w-11 h-11 rounded-xl flex items-center justify-center text-ink-500 hover:bg-cherry-50 disabled:opacity-40"
        >
          <X size={16} aria-hidden="true" />
        </button>

        {/* Icon hero */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cherry-400 to-cherry-500 flex items-center justify-center mx-auto mb-4 shadow-lg">
          <PackageCheck size={28} className="text-white" aria-hidden="true" />
        </div>

        {/* Title + description */}
        <h2 id="confirm-title" className="text-lg font-black text-ink-900 text-center mb-2">
          Barang sudah diterima?
        </h2>
        <p className="text-sm text-ink-700 text-center leading-relaxed mb-6">
          Cek dulu paketnya, pastikan barangnya sesuai dan tidak rusak.
          Setelah kamu konfirmasi, pesanan langsung ditandai selesai.
        </p>

        {/* Actions — primary di kanan, sesuai konvensi mobile. Height 48px
            (di atas 44 min tap target). */}
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={confirming}
            className="flex-1 h-12 rounded-xl border-2 border-cherry-200 text-sm font-black text-ink-700 hover:bg-cherry-50 disabled:opacity-40"
          >
            Nanti Dulu
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={confirming}
            className="flex-1 h-12 rounded-xl text-sm font-black text-white bg-gradient-to-r from-cherry-500 to-cherry-600 hover:from-cherry-600 hover:to-cherry-700 shadow-md active:scale-[0.98] transition-transform disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {confirming ? (
              <>
                <Clock size={14} className="animate-spin" aria-hidden="true" />
                Memproses…
              </>
            ) : (
              <>
                <Check size={14} aria-hidden="true" />
                Ya, Diterima
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── ReviewComposerModal ──────────────────────────────────────────────
// Auto-open setelah konfirmasi terima. Per-item rating 1-5 bintang + comment
// opsional. Submit sekaligus semua item yang di-rating. Skip item tanpa
// bintang. Best-effort — 1 review gagal tidak block sisanya, cegah customer
// stuck kalau salah satu produk sudah pernah di-review sebelumnya.

interface DraftReview {
  rating: number;
  comment: string;
}

function ReviewComposerModal({
  order,
  onClose,
}: {
  order: CustomerOrderDetail;
  onClose: () => void;
}) {
  // Hanya item non-redeem (product_id valid) yang bisa di-review.
  const reviewableItems = order.items.filter((it) => it.product_id);
  const [drafts, setDrafts] = useState<Record<string, DraftReview>>(() =>
    Object.fromEntries(reviewableItems.map((it) => [it.product_id, { rating: 0, comment: "" }]))
  );
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [submitting, onClose]);

  const setRating = (productId: string, rating: number) =>
    setDrafts((prev) => ({ ...prev, [productId]: { ...prev[productId], rating } }));
  const setComment = (productId: string, comment: string) =>
    setDrafts((prev) => ({ ...prev, [productId]: { ...prev[productId], comment } }));

  const rated = reviewableItems.filter((it) => drafts[it.product_id]?.rating > 0);

  const submitAll = async () => {
    if (rated.length === 0) {
      toast.error("Pilih dulu bintang untuk minimal 1 produk");
      return;
    }
    setSubmitting(true);
    let okCount = 0;
    let errCount = 0;
    await Promise.all(
      rated.map(async (it) => {
        const d = drafts[it.product_id];
        try {
          await accountApi.submitReview({
            product_id: it.product_id,
            rating: d.rating,
            comment: d.comment.trim() || undefined,
          });
          okCount++;
        } catch {
          errCount++;
        }
      })
    );
    setSubmitting(false);
    if (okCount > 0) {
      toast.success(`Terima kasih! ${okCount} ulasan terkirim 🌟`);
    }
    if (errCount > 0) {
      toast.error(`${errCount} ulasan gagal terkirim`);
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="review-title"
    >
      <div
        className="absolute inset-0 bg-ink-900/60 backdrop-blur-sm modal-fade-in"
        onClick={() => !submitting && onClose()}
      />

      {/* Bottom sheet on mobile, centered card on desktop. Max height 90vh
          + scroll body untuk multi-item. */}
      <div className="relative bg-white sm:rounded-3xl rounded-t-3xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col modal-sheet-in">
        {/* Header sticky */}
        <div className="px-5 sm:px-6 pt-5 pb-3 border-b border-cherry-100 flex items-start gap-3 shrink-0">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center shrink-0 shadow-md">
            <Sparkles size={22} className="text-white" aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 id="review-title" className="text-base font-black text-ink-900">
              Yuk kasih ulasan 🌟
            </h2>
            <p className="text-xs text-ink-500 leading-relaxed mt-0.5">
              Bantu customer lain dengan pengalamanmu.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Tutup"
            className="w-11 h-11 rounded-xl flex items-center justify-center text-ink-500 hover:bg-cherry-50 shrink-0 disabled:opacity-40"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        {/* Items list — scrollable */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 space-y-4">
          {reviewableItems.map((it) => {
            const draft = drafts[it.product_id] || { rating: 0, comment: "" };
            return (
              <div key={it.product_id} className="border border-cherry-100 rounded-2xl p-4 bg-cherry-50/40">
                {/* Product row */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-lg bg-white border border-cherry-100 shrink-0 overflow-hidden flex items-center justify-center">
                    {it.image ? (
                      // eslint-disable-next-line jsx-a11y/alt-text
                      <img src={it.image} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Package size={18} className="text-cherry-300" aria-hidden="true" />
                    )}
                  </div>
                  <p className="flex-1 min-w-0 text-sm font-bold text-ink-900 truncate">{it.name}</p>
                </div>

                {/* Star rating — touch target 44px per star */}
                <div className="flex items-center gap-1 mb-3">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setRating(it.product_id, n)}
                      disabled={submitting}
                      aria-label={`${n} bintang`}
                      aria-pressed={draft.rating >= n}
                      className="w-11 h-11 flex items-center justify-center active:scale-90 transition-transform"
                    >
                      <Star
                        size={24}
                        className={
                          draft.rating >= n
                            ? "fill-amber-400 text-amber-400"
                            : "fill-transparent text-cherry-200"
                        }
                        aria-hidden="true"
                      />
                    </button>
                  ))}
                  {draft.rating > 0 && (
                    <span className="ml-2 text-xs font-bold text-ink-700">
                      {draft.rating === 5 ? "Sempurna!" : draft.rating === 4 ? "Bagus" : draft.rating === 3 ? "Cukup" : draft.rating === 2 ? "Kurang" : "Buruk"}
                    </span>
                  )}
                </div>

                {/* Comment — muncul kalau sudah pilih bintang, cegah UI ramai
                    kalau customer skip item. */}
                {draft.rating > 0 && (
                  <textarea
                    value={draft.comment}
                    onChange={(e) => setComment(it.product_id, e.target.value)}
                    disabled={submitting}
                    placeholder="Ceritakan pengalamanmu (opsional)"
                    rows={2}
                    maxLength={500}
                    className="w-full px-3 py-2 rounded-xl border border-cherry-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-cherry-500/30 resize-y"
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Footer sticky */}
        <div className="px-5 sm:px-6 py-4 border-t border-cherry-100 flex flex-col sm:flex-row gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex-1 h-12 rounded-xl border-2 border-cherry-200 text-sm font-black text-ink-700 hover:bg-cherry-50 disabled:opacity-40"
          >
            Nanti Saja
          </button>
          <button
            type="button"
            onClick={submitAll}
            disabled={submitting || rated.length === 0}
            className="flex-1 h-12 rounded-xl text-sm font-black text-white bg-gradient-to-r from-cherry-500 to-cherry-600 hover:from-cherry-600 hover:to-cherry-700 shadow-md active:scale-[0.98] transition-transform disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Clock size={14} className="animate-spin" aria-hidden="true" />
                Mengirim…
              </>
            ) : (
              <>
                <Sparkles size={14} aria-hidden="true" />
                Kirim {rated.length > 0 ? `(${rated.length})` : ""}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
