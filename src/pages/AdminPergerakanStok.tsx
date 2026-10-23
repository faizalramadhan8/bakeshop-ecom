import { useEffect, useState } from "react";
import { ArrowDownCircle, ArrowUpCircle, RefreshCw } from "lucide-react";
import { AdminShell } from "@/components/AdminShell";
import { SkeletonList } from "@/components/Skeleton";
import { adminApi, type EcomStockMovement } from "@/lib/api";

// Pergerakan stok toko rumah.
//
// Bu Santi melihat pergerakan stok rumah HANYA di sini (keputusan Fai
// 21 Okt 2026) — POS menyaringnya keluar, karena rak Bekasi dan rak rumah
// adalah dua tumpukan yang berbeda dan mencampurnya membuat tab Pergerakan
// Stok di POS tidak bisa dipercaya.
//
// Backend memaksa `location=home`; parameter itu tidak dibaca dari query,
// jadi halaman ini tidak bisa diakali untuk mengintip pergerakan Bekasi.

const ALASAN: Record<string, string> = {
  initial: "Stok awal saat produk dibuat",
  sale: "Terjual online",
  restock: "Stok masuk dari pemasok",
  repack: "Kemasan dipecah",
  lost: "Hilang",
  damaged: "Rusak / kedaluwarsa",
  opname: "Koreksi opname",
  sample: "Sample / promo",
  cancel: "Pesanan dibatalkan",
  refund: "Refund — barang kembali",
  other: "Lainnya",
};

function waktuRelatif(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const menit = Math.floor((Date.now() - d.getTime()) / 60000);
  if (menit < 1) return "baru saja";
  if (menit < 60) return `${menit} menit lalu`;
  const jam = Math.floor(menit / 60);
  if (jam < 24) return `${jam} jam lalu`;
  const hari = Math.floor(jam / 24);
  if (hari < 7) return `${hari} hari lalu`;
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  }).format(d);
}

const TAB = [
  { key: "", label: "Semua" },
  { key: "in", label: "Masuk" },
  { key: "out", label: "Keluar" },
];

export function AdminPergerakanStok() {
  const [rows, setRows] = useState<EcomStockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [tipe, setTipe] = useState("");

  useEffect(() => {
    let batal = false;
    setLoading(true);
    adminApi
      .listStockMovements({ type: tipe || undefined, limit: 100 })
      .then((d) => { if (!batal) setRows(d ?? []); })
      .catch(() => { if (!batal) setRows([]); })
      .finally(() => { if (!batal) setLoading(false); });
    return () => { batal = true; };
  }, [tipe]);

  const hariIni = rows.filter((r) => {
    const d = new Date(r.created_at);
    const n = new Date();
    return d.toDateString() === n.toDateString();
  });
  const masukHariIni = hariIni.filter((r) => r.type === "in").reduce((s, r) => s + r.quantity, 0);
  const keluarHariIni = hariIni.filter((r) => r.type === "out").reduce((s, r) => s + r.quantity, 0);

  return (
    <AdminShell title="Pergerakan Stok" subtitle="Rak toko rumah — terpisah dari toko Bekasi">
      <div className="max-w-3xl space-y-4">
        {/* Ringkasan hari ini, bukan periode. Yang dicari saat membuka
            halaman ini adalah "hari ini ada apa", bukan rekap bulanan. */}
        <section className="bg-white rounded-2xl border border-cherry-200 p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-ink-500 mb-3">Hari Ini</p>
          <div className="flex gap-6">
            <div className="flex items-center gap-2">
              <ArrowDownCircle size={22} className="text-cherry-500" aria-hidden="true" />
              <div>
                <p className="text-xl font-black text-ink-900 tabular-nums">+{masukHariIni}</p>
                <p className="text-xs text-ink-500">masuk</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ArrowUpCircle size={22} className="text-red-600" aria-hidden="true" />
              <div>
                <p className="text-xl font-black text-ink-900 tabular-nums">−{keluarHariIni}</p>
                <p className="text-xs text-ink-500">keluar</p>
              </div>
            </div>
          </div>
          {hariIni.length === 0 && !loading && (
            <p className="text-sm text-ink-500 mt-3">Belum ada pergerakan hari ini.</p>
          )}
        </section>

        <div className="flex gap-1.5" role="group" aria-label="Saring jenis pergerakan">
          {TAB.map((t) => (
            <button key={t.key} onClick={() => setTipe(t.key)} aria-pressed={tipe === t.key}
              className={`min-h-11 px-4 rounded-xl text-sm font-bold border active:scale-[0.98] ${
                tipe === t.key
                  ? "bg-cherry-500 border-cherry-500 text-white"
                  : "bg-white border-cherry-100 text-ink-700"
              }`}>{t.label}</button>
          ))}
        </div>

        {loading ? (
          <SkeletonList rows={5} />
        ) : rows.length === 0 ? (
          <div className="bg-white rounded-2xl border border-cherry-200 p-8 text-center" role="status">
            <RefreshCw size={28} className="text-cherry-300 mx-auto mb-2" aria-hidden="true" />
            <p className="text-sm font-black text-ink-900 mb-1">Belum ada pergerakan</p>
            <p className="text-sm text-ink-500 leading-relaxed max-w-sm mx-auto">
              Setiap penjualan online dan setiap Sesuaikan Stok otomatis tercatat di sini.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-cherry-200 divide-y divide-cherry-100">
            {rows.map((m) => {
              const masuk = m.type === "in";
              return (
                <div key={m.id} className="flex items-center gap-3 p-4">
                  <div className={`w-10 h-10 rounded-full grid place-items-center shrink-0 ${
                    masuk ? "bg-cherry-50 text-cherry-500" : "bg-red-50 text-red-600"
                  }`}>
                    {masuk
                      ? <ArrowDownCircle size={20} aria-hidden="true" />
                      : <ArrowUpCircle size={20} aria-hidden="true" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-ink-900 truncate">
                      {m.product?.name_id || m.product?.name || "(produk dihapus)"}
                    </p>
                    <p className="text-xs text-ink-500 mt-0.5">
                      {/* Alasan dalam bahasa sehari-hari, bukan kode enum.
                          Catatan bebasnya ikut kalau ada — di situ biasanya
                          nomor pesanan atau keterangan opname. */}
                      {ALASAN[m.reason || ""] || m.reason || "—"} · {waktuRelatif(m.created_at)}
                      {m.note ? ` · ${m.note}` : ""}
                    </p>
                  </div>
                  <p className={`text-base font-black tabular-nums shrink-0 ${
                    masuk ? "text-cherry-600" : "text-red-600"
                  }`}>
                    {masuk ? "+" : "−"}{m.quantity}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminShell>
  );
}
