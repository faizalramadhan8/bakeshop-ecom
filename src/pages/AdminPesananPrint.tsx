// AdminPesananPrint — Sprint 4 Chunk 3 (31 Jul 2026).
// Print multiple packing slips dalam 1 page. Route: /admin/pesanan/print?ids=xxx,yyy,zzz.
//
// UX flow:
//   1. Admin pilih N pesanan di /admin/pesanan (checkbox)
//   2. Klik "Cetak Packing Slip" → navigate ke sini
//   3. Fetch semua order detail parallel
//   4. Render packing slip stacked (page break per order) — A5 half-page each
//   5. Auto trigger window.print() saat data ready
//
// Content packing slip: header toko + order ID + tanggal + customer + address
// + item list + shipping courier/AWB. Untuk internal packer + attach ke paket.

import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, Loader2, Printer, AlertCircle } from "lucide-react";
import { adminApi, decodeToken, type CustomerOrderDetail } from "@/lib/api";

const ECOM_ADMIN_ROLES = ["ecom_admin", "ecom_superadmin", "superadmin"];

function fmtRp(n: number): string {
  return "Rp " + Math.round(n).toLocaleString("id-ID");
}
function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString("id-ID", {
    day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export function AdminPesananPrint() {
  useEffect(() => {
    const claims = decodeToken();
    if (!claims || !ECOM_ADMIN_ROLES.includes(claims.role || "")) {
      window.location.href = "/";
    }
  }, []);

  const [params] = useSearchParams();
  const ids = (params.get("ids") || "").split(",").filter(Boolean);
  const [orders, setOrders] = useState<CustomerOrderDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ids.length === 0) {
      setError("Tidak ada pesanan yang dipilih.");
      setLoading(false);
      return;
    }
    let cancelled = false;
    Promise.allSettled(ids.map((id) => adminApi.getOrder(id)))
      .then((results) => {
        if (cancelled) return;
        const ok = results
          .filter((r): r is PromiseFulfilledResult<CustomerOrderDetail> => r.status === "fulfilled")
          .map((r) => r.value);
        const failCount = results.length - ok.length;
        if (ok.length === 0) {
          setError("Gagal memuat semua pesanan.");
        } else {
          setOrders(ok);
          if (failCount > 0) {
            setError(`${failCount} pesanan gagal dimuat, dilewati.`);
          }
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  // Auto-print saat data siap. Delay 500ms supaya browser render selesai.
  useEffect(() => {
    if (!loading && orders.length > 0) {
      const t = setTimeout(() => window.print(), 500);
      return () => clearTimeout(t);
    }
  }, [loading, orders.length]);

  return (
    <>
      {/* Print-only CSS — hide toolbar saat print + page break per slip */}
      <style>{`
        @page { size: A4; margin: 12mm; }
        @media print {
          .no-print { display: none !important; }
          .slip { page-break-inside: avoid; page-break-after: always; }
          .slip:last-child { page-break-after: auto; }
          body { background: white; }
        }
        @media screen {
          .slip {
            box-shadow: 0 4px 12px rgba(0,0,0,0.08);
            border-radius: 8px;
            margin-bottom: 16px;
          }
        }
      `}</style>

      {/* Toolbar — sembunyi saat print */}
      <div className="no-print sticky top-0 z-10 bg-white border-b border-cherry-200 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center gap-3 px-4 h-16">
          <Link
            to="/admin/pesanan"
            className="w-10 h-10 rounded-xl flex items-center justify-center text-ink-700 hover:bg-cherry-50"
            aria-label="Kembali"
          >
            <ArrowLeft size={18} />
          </Link>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black text-ink-900">Packing Slip</p>
            <p className="text-xs text-ink-500">
              {loading ? "Memuat…" : `${orders.length} pesanan siap dicetak`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            disabled={loading || orders.length === 0}
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl text-sm font-black text-white bg-gradient-to-r from-cherry-500 to-cherry-600 hover:from-cherry-600 hover:to-cherry-700 shadow disabled:opacity-40"
          >
            <Printer size={14} />
            Cetak
          </button>
        </div>
      </div>

      <main className="min-h-screen bg-cherry-50/30 py-6 px-4 print:bg-white print:py-0 print:px-0">
        {loading ? (
          <div className="max-w-4xl mx-auto text-center py-16 text-ink-500 text-sm">
            <Loader2 size={20} className="animate-spin mx-auto mb-2" />
            Memuat {ids.length} pesanan…
          </div>
        ) : error && orders.length === 0 ? (
          <div className="max-w-4xl mx-auto py-16 text-center">
            <AlertCircle size={40} className="mx-auto text-red-500 mb-3" aria-hidden="true" />
            <p className="text-sm font-black text-ink-900">{error}</p>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">
            {error && (
              <div className="no-print mb-4 bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800">
                {error}
              </div>
            )}
            {orders.map((o) => <PackingSlip key={o.id} order={o} />)}
          </div>
        )}
      </main>
    </>
  );
}

function PackingSlip({ order }: { order: CustomerOrderDetail }) {
  const addr = order.shipping.address;
  const totalItems = order.items.reduce((sum, it) => sum + it.quantity, 0);
  return (
    <div className="slip bg-white p-8 mb-4">
      {/* Header — brand + order info */}
      <div className="flex items-start justify-between mb-4 pb-4 border-b border-ink-500/20">
        <div>
          <p className="text-lg font-black text-ink-900">Toko Bahan Kue Santi</p>
          <p className="text-xs text-ink-500">tbksanti.id · Bahan Kue &amp; Pastry Lengkap</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black uppercase tracking-wider text-ink-500">Order ID</p>
          <p className="font-mono text-sm font-black text-ink-900">#{order.id.slice(0, 8).toUpperCase()}</p>
          <p className="text-xs text-ink-500 mt-1">{fmtDate(order.created_at)}</p>
        </div>
      </div>

      {/* Recipient — big, easy to read at packing station */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-ink-500 mb-1">Kirim ke</p>
          <p className="text-base font-black text-ink-900">{addr.recipient_name}</p>
          <p className="text-sm text-ink-700">{addr.recipient_phone}</p>
          <p className="text-xs text-ink-700 mt-1 leading-relaxed">
            {addr.street_address}
            <br />
            {addr.subdistrict}, {addr.district}
            <br />
            {addr.city}, {addr.province} {addr.zipcode}
          </p>
          {addr.notes && (
            <p className="text-xs text-ink-500 mt-1 italic">Catatan: {addr.notes}</p>
          )}
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-ink-500 mb-1">Kurir</p>
          <p className="text-sm font-black text-ink-900">
            {order.shipping.courier || "—"} {order.shipping.service_name && `· ${order.shipping.service_name}`}
          </p>
          {order.shipping.awb && (
            <>
              <p className="text-[10px] font-black uppercase tracking-wider text-ink-500 mt-3 mb-1">Nomor Resi</p>
              <p className="font-mono text-base font-black text-ink-900">{order.shipping.awb}</p>
            </>
          )}
        </div>
      </div>

      {/* Items table */}
      <div className="mb-4">
        <p className="text-[10px] font-black uppercase tracking-wider text-ink-500 mb-2">
          Items ({totalItems})
        </p>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-ink-500/20 text-left">
              <th className="py-1.5 font-black text-ink-500 uppercase text-[10px]">Produk</th>
              <th className="py-1.5 font-black text-ink-500 uppercase text-[10px] text-center w-16">Qty</th>
              <th className="py-1.5 font-black text-ink-500 uppercase text-[10px] text-right w-24">Harga</th>
              <th className="py-1.5 font-black text-ink-500 uppercase text-[10px] text-right w-28">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((it) => (
              <tr key={it.product_id} className="border-b border-ink-500/10">
                <td className="py-1.5 text-ink-900">{it.name}</td>
                <td className="py-1.5 text-center font-bold text-ink-900 tabular-nums">{it.quantity}</td>
                <td className="py-1.5 text-right tabular-nums text-ink-700">{fmtRp(it.unit_price)}</td>
                <td className="py-1.5 text-right tabular-nums font-bold text-ink-900">{fmtRp(it.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Total footer */}
      <div className="flex justify-end">
        <div className="w-64">
          <div className="flex justify-between text-xs text-ink-700 py-0.5">
            <span>Subtotal</span>
            <span className="tabular-nums">{fmtRp(order.subtotal)}</span>
          </div>
          <div className="flex justify-between text-xs text-ink-700 py-0.5">
            <span>Ongkir</span>
            <span className="tabular-nums">{fmtRp(order.shipping_cost)}</span>
          </div>
          <div className="flex justify-between text-sm font-black text-ink-900 py-1.5 border-t border-ink-500/20 mt-1">
            <span>TOTAL</span>
            <span className="tabular-nums">{fmtRp(order.total)}</span>
          </div>
        </div>
      </div>

      {/* Footer — terima kasih */}
      <div className="mt-6 pt-4 border-t border-ink-500/20 text-center text-[10px] text-ink-500">
        Terima kasih telah berbelanja di Toko Bahan Kue Santi ·
        <span className="ml-1">Ada pertanyaan? WA 0815-7427-3040</span>
      </div>
    </div>
  );
}
