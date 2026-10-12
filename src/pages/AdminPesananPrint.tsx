// AdminPesananPrint — Sprint 4 Chunk 3 (31 Jul 2026).
// Print multiple packing slips dalam 1 page. Route: /admin/pesanan/print?ids=xxx,yyy,zzz.
//
// UX flow:
//   1. Admin pilih N pesanan di /admin/pesanan (checkbox)
//   2. Klik "Cetak Packing Slip" → navigate ke sini
//   3. Fetch semua order detail parallel
//   4. Render label/slip stacked (page break per order)
//   5. Admin pilih ukuran (label 10x15 / 4 per A4 / surat jalan) lalu Cetak
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
  // Default LABEL, bukan surat jalan: yang ditanyakan Fai adalah "sesuatu
  // untuk ditempel di paket", dan itu kebutuhan harian. Surat jalan A4 tetap
  // tersedia untuk yang butuh daftar barang saat packing.
  const [mode, setMode] = useState<"label" | "label4up" | "slip">("label");
  const [pengirim, setPengirim] = useState({ nama: "Toko Bahan Kue Santi", alamat: "", telepon: "" });
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

  // Auto-print DIHAPUS 12 Okt 2026. Dulu halaman ini langsung membuka dialog
  // cetak 500ms setelah data siap — masuk akal waktu formatnya cuma satu.
  // Setelah ada pilihan ukuran (label 10x15 / 4 per A4 / surat jalan), dialog
  // yang terbuka sendiri justru mendahului pilihannya: admin harus menutup
  // dialog dulu, memilih ukuran, baru menekan Cetak. Sekarang Cetak selalu
  // ditekan sendiri.

  // Alamat pengirim diambil dari Pengaturan — sumber yang sama dengan titik
  // jemput kurir, jadi tidak mungkin beda dengan yang dipakai hitung ongkir.
  // Best-effort: kalau gagal, label tetap tercetak tanpa blok pengirim.
  useEffect(() => {
    adminApi.getSettings()
      .then((st) => setPengirim({
        nama: st.store_name || "Toko Bahan Kue Santi",
        alamat: st.store_pickup_address || "",
        telepon: st.store_pickup_phone || "",
      }))
      .catch(() => { /* biarkan default */ });
  }, []);

  return (
    <>
      {/* Print-only CSS — hide toolbar saat print + page break per slip */}
      <style>{`
        /* Ukuran halaman mengikuti mode cetak:
           - label    : 10x15 cm, ukuran standar printer thermal label
           - label4up : A4 berisi 4 label untuk digunting (printer biasa)
           - slip     : A4 surat jalan lama
           Margin label dibuat 0 karena printer thermal sudah punya margin
           fisiknya sendiri; menambah margin CSS membuat isinya terpotong. */
        @page { size: ${mode === "label" ? "100mm 150mm" : "A4"}; margin: ${mode === "label" ? "0" : "10mm"}; }
        @media print {
          .no-print { display: none !important; }
          .slip { page-break-inside: avoid; page-break-after: always; }
          .slip:last-child { page-break-after: auto; }
          body { background: white; }
          .label { page-break-inside: avoid; }
        }
        /* Satu label = satu halaman penuh 10x15 cm. */
        .print-label .label { width: 100mm; height: 150mm; }
        @media print { .print-label .label { page-break-after: always; } }
        @media print { .print-label .label:last-child { page-break-after: auto; } }

        /* 4 label per A4 — dua kolom, dua baris, dengan garis potong. */
        .print-label4up { display: grid; grid-template-columns: 1fr 1fr; gap: 0; }
        .print-label4up .label {
          width: 95mm; height: 138mm;
          outline: 1px dashed #999; outline-offset: -1px;
        }
        @media print {
          .print-label4up .label:nth-child(4n) { page-break-after: always; }
          .print-label4up .label:last-child { page-break-after: auto; }
        }

        @media screen {
          .label { box-shadow: 0 4px 12px rgba(0,0,0,0.08); border-radius: 4px; }
          .print-label { display: flex; flex-direction: column; gap: 16px; align-items: center; }
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
            <p className="text-sm font-black text-ink-900">Cetak Pesanan</p>
            <p className="text-xs text-ink-500">
              {loading ? "Memuat…" : `${orders.length} pesanan siap dicetak`}
            </p>
          </div>
          {/* Pemilih ukuran — label dulu karena itu kebutuhan harian.
              Tombol 44px supaya nyaman ditekan di tablet. */}
          <div className="flex items-center gap-1 rounded-xl border border-cherry-200 p-1" role="group" aria-label="Ukuran cetak">
            {([
              { id: "label" as const,    label: "Label 10×15" },
              { id: "label4up" as const, label: "4 per A4" },
              { id: "slip" as const,     label: "Surat Jalan" },
            ]).map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMode(m.id)}
                aria-pressed={mode === m.id}
                className={`min-h-11 px-3 rounded-lg text-xs font-black transition-colors ${
                  mode === m.id ? "bg-cherry-600 text-white" : "text-ink-700 hover:bg-cherry-50"
                }`}
              >
                {m.label}
              </button>
            ))}
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
            {mode === "slip" ? (
              orders.map((o) => <PackingSlip key={o.id} order={o} />)
            ) : (
              <div className={mode === "label" ? "print-label" : "print-label4up"}>
                {orders.map((o) => (
                  <ShippingLabel key={o.id} order={o} pengirim={pengirim} />
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </>
  );
}


// ─── Label tempel ────────────────────────────────────────────────────────────
// Fai 12 Okt 2026: "ga ada yg bisa di cetak untuk di tempel di paket nya ya?"
// Packing slip yang sudah ada berukuran A4 — itu lembar periksa untuk packer,
// bukan label tempel; kertasnya sering lebih besar daripada paketnya sendiri.
//
// Label ini memprioritaskan satu hal: alamat penerima harus terbaca kurir
// dalam sekali lihat, bahkan saat label terkena air atau tercetak buram.
// Karena itu nama dan alamat dicetak paling besar, dan segala yang bukan
// alamat (daftar barang, harga) SENGAJA tidak ikut — harga di luar paket juga
// mengundang risiko saat barang berpindah tangan.
function ShippingLabel({
  order, pengirim,
}: {
  order: CustomerOrderDetail;
  pengirim: { nama: string; alamat: string; telepon: string };
}) {
  const addr = order.shipping.address;
  const totalItems = order.items.reduce((sum, it) => sum + it.quantity, 0);
  return (
    <div className="label bg-white text-black p-4 flex flex-col">
      {/* Kurir + resi — baris paling atas supaya petugas sortir langsung lihat */}
      <div className="flex items-start justify-between gap-2 pb-2 border-b-2 border-black">
        <div className="min-w-0">
          <p className="text-[9pt] uppercase tracking-wider leading-none">Kurir</p>
          <p className="text-[13pt] font-black leading-tight truncate">
            {order.shipping.courier || "—"}
          </p>
          {order.shipping.service_name && (
            <p className="text-[9pt] leading-tight">{order.shipping.service_name}</p>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className="text-[9pt] uppercase tracking-wider leading-none">No. Pesanan</p>
          <p className="text-[12pt] font-black font-mono leading-tight">
            #{order.id.slice(0, 8).toUpperCase()}
          </p>
        </div>
      </div>

      {order.shipping.awb ? (
        <div className="py-1.5 border-b border-black">
          <p className="text-[9pt] uppercase tracking-wider leading-none">No. Resi</p>
          <p className="text-[15pt] font-black font-mono leading-tight tracking-wide break-all">
            {order.shipping.awb}
          </p>
        </div>
      ) : (
        // Tanpa resi label tetap berguna untuk penjemputan yang diatur sendiri,
        // tapi kurir ekspedisi akan menempelkan resinya sendiri di atas ini.
        <div className="py-1.5 border-b border-black">
          <p className="text-[9pt] leading-tight italic">
            Resi belum terbit — tempelkan resi kurir di sini
          </p>
        </div>
      )}

      {/* PENERIMA — bagian terbesar, ini inti labelnya */}
      <div className="py-2 flex-1">
        <p className="text-[9pt] font-black uppercase tracking-wider leading-none mb-1">
          Penerima
        </p>
        <p className="text-[14pt] font-black leading-tight">{addr.recipient_name}</p>
        <p className="text-[12pt] font-bold leading-tight">{addr.recipient_phone}</p>
        <p className="text-[11pt] leading-snug mt-1">
          {addr.street_address}
          <br />
          {[addr.subdistrict, addr.district].filter(Boolean).join(", ")}
          <br />
          {[addr.city, addr.province].filter(Boolean).join(", ")} {addr.zipcode}
        </p>
        {addr.notes && (
          <p className="text-[9pt] leading-snug mt-1 italic">Catatan: {addr.notes}</p>
        )}
      </div>

      {/* PENGIRIM — kecil; cuma dibutuhkan kalau paket harus dikembalikan */}
      <div className="pt-1.5 border-t border-black flex items-end justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[8pt] font-black uppercase tracking-wider leading-none">Pengirim</p>
          <p className="text-[9pt] font-bold leading-tight truncate">{pengirim.nama}</p>
          <p className="text-[8pt] leading-tight line-clamp-2">{pengirim.alamat}</p>
          {pengirim.telepon && <p className="text-[8pt] leading-tight">{pengirim.telepon}</p>}
        </div>
        <p className="text-[9pt] font-black shrink-0 whitespace-nowrap">
          {totalItems} barang
        </p>
      </div>
    </div>
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
