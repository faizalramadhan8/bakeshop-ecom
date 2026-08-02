import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Package, MapPin, CreditCard, Truck, Copy, Check,
  AlertCircle, Loader2, PackageCheck, Ban, Undo, Zap, Info,
} from "lucide-react";
import toast from "react-hot-toast";
import { adminApi, decodeToken, type CustomerOrderDetail } from "@/lib/api";
import { AdminShell } from "@/components/AdminShell";

const ECOM_ADMIN_ROLES = ["ecom_admin", "ecom_superadmin", "superadmin"];

function formatRp(n: number): string {
  return "Rp " + Math.round(n).toLocaleString("id-ID");
}

function formatDateFull(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("id-ID", {
    day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// Map status → transitions yang bisa admin lakukan dari status ini.
// Sinkron dengan isValidTransition di BE — kalau ubah salah satu, ubah dua-duanya.
function actionsForStatus(status: string): Array<{ next: string; label: string; icon: typeof PackageCheck; kind: "primary" | "secondary" | "danger" }> {
  switch (status) {
    case "paid":
      return [
        { next: "processing", label: "Mulai Proses", icon: PackageCheck, kind: "primary" },
        { next: "cancelled",  label: "Batalkan",     icon: Ban,          kind: "danger" },
      ];
    case "processing":
      // Set resi = via form terpisah (button di section shipping).
      return [
        { next: "cancelled", label: "Batalkan", icon: Ban, kind: "danger" },
      ];
    case "shipped":
      // Marketplace pattern (28 Jul 2026): normalnya Biteship webhook yang
      // trigger delivered, tapi kalau kurir non-Biteship (resi manual) admin
      // bisa tandai sampai manual → customer confirm sendiri di app.
      // "Tandai Selesai" tetap ada sebagai override kalau customer complain
      // sudah terima tapi lupa konfirmasi (edge case).
      return [
        { next: "delivered", label: "Tandai Sampai Kurir", icon: PackageCheck, kind: "primary" },
        { next: "completed", label: "Paksa Selesai",       icon: Check,        kind: "secondary" },
        { next: "cancelled", label: "Batalkan",            icon: Ban,          kind: "danger" },
      ];
    case "delivered":
      // Nunggu customer konfirmasi. Admin cuma boleh cancel (kalau ada
      // dispute) atau paksa selesai (kalau customer complain di WA sudah
      // terima tapi malas buka app).
      return [
        { next: "completed", label: "Paksa Selesai", icon: Check, kind: "primary" },
        { next: "cancelled", label: "Batalkan",      icon: Ban,   kind: "danger" },
      ];
    case "pending_payment":
      return [
        { next: "cancelled", label: "Batalkan", icon: Ban, kind: "danger" },
      ];
    default:
      return [];
  }
}

function statusColor(s: string): string {
  const map: Record<string, string> = {
    pending_payment: "bg-amber-100 text-amber-700",
    paid:            "bg-cherry-100 text-cherry-600",
    processing:      "bg-blue-100 text-blue-700",
    shipped:         "bg-purple-100 text-purple-700",
    delivered:       "bg-teal-100 text-teal-700",
    completed:       "bg-emerald-100 text-emerald-700",
    cancelled:       "bg-red-100 text-red-700",
    expired:         "bg-ink-100 text-ink-700",
  };
  return map[s] || "bg-ink-100 text-ink-700";
}

function statusLabel(s: string): string {
  const map: Record<string, string> = {
    pending_payment: "Menunggu Pembayaran",
    paid:            "Perlu Diproses",
    processing:      "Sedang Diproses",
    shipped:         "Sudah Dikirim",
    delivered:       "Sampai — Tunggu Konfirmasi Customer",
    completed:       "Selesai",
    cancelled:       "Dibatalkan",
    expired:         "Expired",
  };
  return map[s] || s;
}

export function AdminPesananDetail() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<CustomerOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showResiForm, setShowResiForm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showBiteshipConfirm, setShowBiteshipConfirm] = useState(false);
  const [syncingBiteship, setSyncingBiteship] = useState(false);
  const [awb, setAwb] = useState("");
  const [courierOverride, setCourierOverride] = useState("");
  const [saving, setSaving] = useState(false);
  const [creatingBiteship, setCreatingBiteship] = useState(false);

  useEffect(() => {
    const claims = decodeToken();
    if (!claims || !ECOM_ADMIN_ROLES.includes(claims.role || "")) {
      window.location.href = "/";
      return;
    }
    if (!id) return;
    load(id);
  }, [id]);

  const load = async (orderId: string) => {
    setLoading(true);
    try {
      const o = await adminApi.getOrder(orderId);
      setOrder(o);
      setAwb(o.shipping?.awb || "");
      setCourierOverride(o.shipping?.courier || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal load");
    } finally {
      setLoading(false);
    }
  };

  const transition = async (next: string) => {
    if (!order) return;
    // Cancel butuh explicit confirm — destructive action.
    if (next === "cancelled") {
      setShowCancelConfirm(true);
      return;
    }
    setSaving(true);
    try {
      const updated = await adminApi.updateOrderStatus(order.id, next);
      setOrder(updated);
      toast.success("Status diperbarui");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal update");
    } finally {
      setSaving(false);
    }
  };

  const confirmCancel = async () => {
    if (!order) return;
    setSaving(true);
    try {
      const updated = await adminApi.updateOrderStatus(order.id, "cancelled");
      setOrder(updated);
      toast.success("Pesanan dibatalkan. Stok online sudah dikembalikan.");
      setShowCancelConfirm(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal batal");
    } finally {
      setSaving(false);
    }
  };

  const createBiteship = async () => {
    if (!order) return;
    setCreatingBiteship(true);
    try {
      const updated = await adminApi.createBiteshipShipment(order.id);
      setOrder(updated);
      toast.success(
        updated.shipping.awb
          ? `Resi otomatis: ${updated.shipping.awb}`
          : "Order Biteship dibuat. Resi menyusul saat kurir konfirmasi pickup."
      );
      setShowBiteshipConfirm(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal buat order Biteship");
    } finally {
      setCreatingBiteship(false);
    }
  };

  const syncBiteship = async () => {
    if (!order || syncingBiteship) return;
    setSyncingBiteship(true);
    try {
      const updated = await adminApi.syncBiteshipStatus(order.id);
      setOrder(updated);
      toast.success("Status Biteship di-sync");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal sync Biteship");
    } finally {
      setSyncingBiteship(false);
    }
  };

  const saveResi = async () => {
    if (!order) return;
    if (!awb.trim()) {
      toast.error("Nomor resi wajib diisi");
      return;
    }
    setSaving(true);
    try {
      const updated = await adminApi.setOrderShipping(order.id, {
        awb: awb.trim(),
        courier: courierOverride.trim() || undefined,
      });
      setOrder(updated);
      toast.success("Resi tersimpan. Status jadi Dikirim.");
      setShowResiForm(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal simpan resi");
    } finally {
      setSaving(false);
    }
  };

  const copyId = () => {
    if (!order) return;
    navigator.clipboard?.writeText(order.id);
    toast.success("Order ID disalin");
  };

  if (loading) {
    return (
      <AdminShell title="Memuat pesanan…" parents={[{ label: "Pesanan", to: "/admin/pesanan" }]}>
        <div className="py-16 text-center text-ink-500 text-sm">
          <Loader2 size={20} className="animate-spin mx-auto mb-2" aria-hidden="true" />
          Memuat…
        </div>
      </AdminShell>
    );
  }
  if (error || !order) {
    return (
      <AdminShell title="Pesanan tidak ditemukan" parents={[{ label: "Pesanan", to: "/admin/pesanan" }]}>
        <div className="max-w-2xl mx-auto text-center py-16">
          <AlertCircle size={40} className="mx-auto text-cherry-600 mb-3" aria-hidden="true" />
          <p className="text-sm font-semibold text-cherry-600">{error || "Order tidak ditemukan"}</p>
          <Link to="/admin/pesanan" className="inline-block mt-4 text-sm text-cherry-500 underline">
            Kembali ke daftar
          </Link>
        </div>
      </AdminShell>
    );
  }

  const actions = actionsForStatus(order.ecom_status);
  const showResiButton = order.ecom_status === "paid" || order.ecom_status === "processing" || order.ecom_status === "shipped";

  return (
    <AdminShell
      title={`Pesanan #${order.id.slice(0, 8)}`}
      parents={[{ label: "Pesanan", to: "/admin/pesanan" }]}
    >
      <div className="max-w-3xl pb-24">
        {/* Header */}
        <div className="bg-white border border-cherry-200 rounded-2xl p-5 mb-4">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-ink-500 mb-1">Order ID</p>
              <button
                onClick={copyId}
                className="font-mono text-sm font-bold text-ink-900 inline-flex items-center gap-1.5 hover:text-cherry-500"
              >
                {order.id.slice(0, 12)}…
                <Copy size={12} aria-hidden="true" />
              </button>
            </div>
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${statusColor(order.ecom_status)}`}>
              {statusLabel(order.ecom_status)}
            </span>
          </div>
          <dl className="text-sm space-y-1">
            <div className="flex justify-between">
              <dt className="text-ink-500">Dibuat</dt>
              <dd className="text-ink-900">{formatDateFull(order.created_at)}</dd>
            </div>
            {order.payment.paid_at && (
              <div className="flex justify-between">
                <dt className="text-ink-500">Dibayar</dt>
                <dd className="text-ink-900">{formatDateFull(order.payment.paid_at)}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Alamat */}
        <div className="bg-white border border-cherry-200 rounded-2xl p-5 mb-4">
          <h2 className="text-xs font-black uppercase tracking-wider text-ink-500 mb-3 flex items-center gap-2">
            <MapPin size={14} aria-hidden="true" />
            Alamat Pengiriman
          </h2>
          <p className="text-sm font-bold text-ink-900">{order.shipping.address.recipient_name}</p>
          <p className="text-sm text-ink-700">{order.shipping.address.recipient_phone}</p>
          <p className="text-sm text-ink-700 mt-1 whitespace-pre-line leading-relaxed">
            {order.shipping.address.street_address}
            {"\n"}
            {[
              order.shipping.address.subdistrict,
              order.shipping.address.district,
              order.shipping.address.city,
              order.shipping.address.province,
              order.shipping.address.zipcode,
            ].filter(Boolean).join(", ")}
          </p>
          {order.shipping.address.notes && (
            <p className="text-xs text-ink-500 mt-2 italic">Catatan: {order.shipping.address.notes}</p>
          )}
        </div>

        {/* Items */}
        <div className="bg-white border border-cherry-200 rounded-2xl overflow-hidden mb-4">
          <div className="px-5 py-3 border-b border-cherry-100 flex items-center gap-2">
            <Package size={14} className="text-ink-500" aria-hidden="true" />
            <h2 className="text-xs font-black uppercase tracking-wider text-ink-500">
              Rincian Barang ({order.items.length})
            </h2>
          </div>
          {order.items.map((it, i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-3 border-b border-cherry-100 last:border-0">
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

        {/* Pengiriman + Resi */}
        <div className="bg-white border border-cherry-200 rounded-2xl p-5 mb-4">
          <h2 className="text-xs font-black uppercase tracking-wider text-ink-500 mb-3 flex items-center gap-2">
            <Truck size={14} aria-hidden="true" />
            Pengiriman
          </h2>
          <dl className="text-sm space-y-1.5">
            <div className="flex justify-between">
              <dt className="text-ink-500">Kurir</dt>
              <dd className="font-bold text-ink-900">{order.shipping.courier || "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-500">Layanan</dt>
              <dd className="text-ink-900">{order.shipping.service_name || "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-500">Estimasi</dt>
              <dd className="text-ink-900">{order.shipping.etd || "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-500">Ongkir</dt>
              <dd className="text-ink-900">{formatRp(order.shipping_cost)}</dd>
            </div>
            {order.shipping.awb && (
              <div className="flex justify-between border-t border-cherry-100 pt-2 mt-2">
                <dt className="text-ink-500">Nomor Resi</dt>
                <dd className="font-mono font-bold text-cherry-600">{order.shipping.awb}</dd>
              </div>
            )}
          </dl>

          {/* Biteship auto-resi — cuma untuk order yang belum di-Biteship-kan */}
          {(order.ecom_status === "paid" || order.ecom_status === "processing") && !order.shipping.biteship_order_id && (
            <div className="mt-4 border-t border-cherry-100 pt-4">
              {!showBiteshipConfirm ? (
                <button
                  onClick={() => setShowBiteshipConfirm(true)}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white text-sm font-bold bg-gradient-to-r from-cherry-400 to-cherry-500 hover:opacity-90 shadow-sm"
                >
                  <Zap size={14} aria-hidden="true" />
                  Buat Order Otomatis (Biteship)
                </button>
              ) : (
                <div className="bg-cherry-50 border border-cherry-200 rounded-xl p-4">
                  <p className="text-sm font-bold text-ink-900 mb-1 flex items-center gap-2">
                    <Info size={14} className="text-cherry-500" aria-hidden="true" />
                    Konfirmasi buat order di Biteship?
                  </p>
                  <p className="text-xs text-ink-700 mb-3 leading-relaxed">
                    Sistem akan pesan pickup ke <b>{order.shipping.courier}</b> ({order.shipping.service_name || "reg"}) untuk dikirim ke <b>{order.shipping.address.recipient_name}</b>.
                    Nomor resi otomatis muncul setelah kurir konfirmasi (biasanya 1–15 menit).
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={createBiteship}
                      disabled={creatingBiteship}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-sm font-bold bg-gradient-to-r from-cherry-400 to-cherry-500 disabled:opacity-60"
                    >
                      {creatingBiteship ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <Zap size={14} aria-hidden="true" />}
                      Ya, Buat Order
                    </button>
                    <button
                      onClick={() => setShowBiteshipConfirm(false)}
                      className="px-4 py-2.5 rounded-xl border border-cherry-200 text-sm font-bold text-ink-700"
                    >
                      Batal
                    </button>
                  </div>
                </div>
              )}
              <p className="text-xs text-ink-500 mt-2 text-center">
                Atau input resi manual kalau kurir dipesan sendiri (jemput sendiri ke ekspedisi).
              </p>
            </div>
          )}

          {/* Info kalau sudah pakai Biteship — tampil Biteship order id + status auto */}
          {order.shipping.biteship_order_id && (
            <div className="mt-4 border-t border-cherry-100 pt-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                <p className="text-xs font-bold text-emerald-700 mb-1 flex items-center gap-1.5">
                  <Zap size={12} aria-hidden="true" />
                  Order Otomatis (Biteship)
                </p>
                <p className="text-xs text-ink-700 font-mono">
                  ID: {order.shipping.biteship_order_id}
                </p>
                {!order.shipping.awb && (
                  <p className="text-xs text-ink-500 mt-1">
                    Menunggu nomor resi dari kurir…
                  </p>
                )}
                {order.shipping.tracking_url && (
                  <a
                    href={order.shipping.tracking_url}
                    target="_blank"
                    rel="noopener"
                    className="inline-flex items-center gap-1 mt-2 text-xs font-bold text-emerald-700 underline hover:text-emerald-800"
                  >
                    <Truck size={12} aria-hidden="true" />
                    Buka Tracking Biteship
                  </a>
                )}
                {/* Sync manual — fallback kalau webhook missed. Aman di-klik
                    berkali-kali; endpoint idempotent. */}
                <button
                  type="button"
                  onClick={syncBiteship}
                  disabled={syncingBiteship}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800 disabled:opacity-50"
                >
                  {syncingBiteship ? (
                    <Loader2 size={12} className="animate-spin" aria-hidden="true" />
                  ) : (
                    <Undo size={12} aria-hidden="true" />
                  )}
                  Sync Status dari Biteship
                </button>
              </div>
            </div>
          )}

          {/* Resi form manual */}
          {showResiButton && (
            <div className="mt-4 border-t border-cherry-100 pt-4">
              {!showResiForm ? (
                <button
                  onClick={() => setShowResiForm(true)}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-cherry-300 text-cherry-500 text-sm font-bold hover:bg-cherry-50"
                >
                  <Truck size={14} aria-hidden="true" />
                  {order.shipping.awb ? "Ubah Nomor Resi" : "Input Nomor Resi Manual"}
                </button>
              ) : (
                <div className="space-y-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-ink-700 uppercase tracking-wider">
                      Nomor Resi *
                    </label>
                    <input
                      value={awb}
                      onChange={(e) => setAwb(e.target.value)}
                      placeholder="Contoh: JNE1234567890"
                      className="px-4 py-3 rounded-xl border border-cherry-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-cherry-500/30 focus:border-cherry-400"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-ink-700 uppercase tracking-wider">
                      Kurir (opsional — override)
                    </label>
                    <input
                      value={courierOverride}
                      onChange={(e) => setCourierOverride(e.target.value)}
                      placeholder={order.shipping.courier || "JNE / J&T / SiCepat"}
                      className="px-4 py-3 rounded-xl border border-cherry-200 text-sm focus:outline-none focus:ring-2 focus:ring-cherry-500/30 focus:border-cherry-400"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={saveResi}
                      disabled={saving || !awb.trim()}
                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-white text-sm font-bold bg-gradient-to-r from-cherry-400 to-cherry-500 disabled:opacity-60"
                    >
                      {saving ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <Check size={14} aria-hidden="true" />}
                      Simpan & Tandai Dikirim
                    </button>
                    <button
                      onClick={() => { setShowResiForm(false); setAwb(order.shipping.awb || ""); }}
                      className="px-4 py-3 rounded-xl border border-cherry-200 text-sm font-bold text-ink-700"
                    >
                      Batal
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Pembayaran + total */}
        <div className="bg-white border border-cherry-200 rounded-2xl p-5 mb-4">
          <h2 className="text-xs font-black uppercase tracking-wider text-ink-500 mb-3 flex items-center gap-2">
            <CreditCard size={14} aria-hidden="true" />
            Pembayaran
          </h2>
          <dl className="text-sm space-y-1.5">
            <div className="flex justify-between">
              <dt className="text-ink-500">Metode</dt>
              <dd className="text-ink-900">
                {order.payment.mode === "pg" ? "Payment Gateway" : "Transfer Manual"}
              </dd>
            </div>
            {order.payment.channel && (
              <div className="flex justify-between">
                <dt className="text-ink-500">Kanal</dt>
                <dd className="text-ink-900 uppercase">{order.payment.channel}</dd>
              </div>
            )}
            {order.payment.reference && (
              <div className="flex justify-between">
                <dt className="text-ink-500">Referensi</dt>
                <dd className="font-mono text-xs text-ink-900">{order.payment.reference}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-ink-500">Subtotal</dt>
              <dd className="text-ink-900">{formatRp(order.subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-500">Ongkir</dt>
              <dd className="text-ink-900">{formatRp(order.shipping_cost)}</dd>
            </div>
            <div className="flex justify-between border-t border-cherry-100 pt-2 mt-2">
              <dt className="font-bold text-ink-900">Total</dt>
              <dd className="text-lg font-black text-cherry-500">{formatRp(order.total)}</dd>
            </div>
          </dl>
        </div>

        {/* Action buttons */}
        {actions.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-2">
            {actions.map((a) => (
              <button
                key={a.next}
                onClick={() => transition(a.next)}
                disabled={saving}
                className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold transition-opacity disabled:opacity-60 ${
                  a.kind === "primary"
                    ? "text-white bg-gradient-to-r from-cherry-400 to-cherry-500"
                    : a.kind === "danger"
                    ? "text-red-600 bg-white border-2 border-red-200 hover:bg-red-50"
                    : "text-ink-700 bg-white border border-cherry-200 hover:bg-cherry-50"
                }`}
              >
                {saving ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <a.icon size={14} aria-hidden="true" />}
                {a.label}
              </button>
            ))}
          </div>
        )}

        {/* Cancel confirm inline (bukan JS alert supaya konsisten UI) */}
        {showCancelConfirm && (
          <div className="mt-3 bg-red-50 border-2 border-red-200 rounded-2xl p-4">
            <p className="text-sm font-bold text-red-700 mb-1">Batalkan pesanan ini?</p>
            <p className="text-xs text-red-600 mb-3 leading-relaxed">
              Stok online akan otomatis dikembalikan ({order.items.length} produk).
              Kalau customer sudah bayar, refund harus di-proses manual di dashboard PG.
            </p>
            <div className="flex gap-2">
              <button
                onClick={confirmCancel}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-sm font-bold bg-red-500 hover:bg-red-600 disabled:opacity-60"
              >
                {saving ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <Ban size={14} aria-hidden="true" />}
                Ya, Batalkan
              </button>
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="px-4 py-2.5 rounded-xl border border-red-200 text-sm font-bold text-red-600"
              >
                <Undo size={14} className="inline mr-1" aria-hidden="true" />
                Ga jadi
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
