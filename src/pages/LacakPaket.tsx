import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Truck, Copy, Check, PackageSearch, AlertCircle, ExternalLink } from "lucide-react";
import toast from "react-hot-toast";
import { ordersApi, type OrderTracking } from "@/lib/api";
import { SkeletonBar } from "@/components/Skeleton";

// Lacak paket di dalam aplikasi.
//
// Sebelum ini tombol "Lacak Paket" melempar customer KELUAR ke
// track.biteship.com. Keluar dari toko untuk tahu barangnya sampai mana adalah
// tempat paling mudah kehilangan orang — dan halaman tujuannya berbahasa
// Inggris, tanpa merek toko, tanpa jalan kembali.
//
// Yang tidak bisa ditiru dari marketplace besar: peta dengan kurir bergerak.
// `history` dari Biteship hanya berisi status, catatan, dan waktu — tidak ada
// koordinat. Jadi yang disajikan adalah hal yang memang orang baca: sampai
// mana sekarang, dan kapan.

const COURIER_NAME: Record<string, string> = {
  jne: "JNE",
  jnt: "J&T Express",
  sicepat: "SiCepat",
  anteraja: "AnterAja",
  ninja: "Ninja Xpress",
  gojek: "Gojek",
  grab: "Grab",
  pos: "Pos Indonesia",
  tiki: "TIKI",
  lion: "Lion Parcel",
  wahana: "Wahana",
  paxel: "Paxel",
  borzo: "Borzo",
  lalamove: "Lalamove",
  deliveree: "Deliveree",
};

function namaKurir(code: string): string {
  const k = (code || "").toLowerCase().trim();
  return COURIER_NAME[k] || (code ? code.toUpperCase() : "Kurir");
}

// Cadangan kalau Biteship tidak mengirim tautannya — pindahan dari
// PesananDetail, yang dulu memakainya sebagai tujuan tombol "Lacak Paket".
function trackingURL(courier: string, awb: string): string | null {
  if (!awb) return null;
  const c = (courier || "").toLowerCase();
  if (c.includes("jne")) return `https://www.jne.co.id/tracking/trace/${encodeURIComponent(awb)}`;
  if (c.includes("j&t") || c.includes("jnt")) return `https://www.jet.co.id/track?awb=${encodeURIComponent(awb)}`;
  if (c.includes("sicepat")) return `https://www.sicepat.com/checkAwb/${encodeURIComponent(awb)}`;
  if (c.includes("anteraja")) return `https://anteraja.id/tracking?awb=${encodeURIComponent(awb)}`;
  if (c.includes("ninja")) return `https://www.ninjaxpress.co/id-id/tracking?id=${encodeURIComponent(awb)}`;
  if (c.includes("pos")) return `https://www.posindonesia.co.id/id/tracking?resi=${encodeURIComponent(awb)}`;
  return null;
}

function formatWaktu(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function LacakPaket() {
  const { id = "" } = useParams();
  const [data, setData] = useState<OrderTracking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tersalin, setTersalin] = useState(false);

  useEffect(() => {
    let batal = false;
    setLoading(true);
    setError(null);
    ordersApi
      .getTracking(id)
      .then((d) => {
        if (!batal) setData(d);
      })
      .catch((e) => {
        if (!batal) setError(e instanceof Error ? e.message : "Gagal memuat status pengiriman.");
      })
      .finally(() => {
        if (!batal) setLoading(false);
      });
    return () => {
      batal = true;
    };
  }, [id]);

  const salinResi = async () => {
    if (!data?.waybill_id) return;
    try {
      await navigator.clipboard.writeText(data.waybill_id);
      setTersalin(true);
      window.setTimeout(() => setTersalin(false), 2000);
      toast.success("Nomor resi disalin");
    } catch {
      toast.error("Gagal menyalin. Silakan catat manual.");
    }
  };

  // Terbaru di atas — yang dicari orang saat membuka halaman ini adalah
  // "sekarang di mana", bukan "dulu mulai dari mana".
  const riwayat = data ? [...data.history].reverse() : [];

  return (
    <div className="max-w-2xl mx-auto p-4">
      <Link
        to={`/pesanan/${id}`}
        className="inline-flex items-center gap-1.5 min-h-11 text-sm font-bold text-cherry-600"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Kembali ke pesanan
      </Link>

      <h1 className="text-xl font-black text-ink-900 mt-2 mb-4">Lacak Paket</h1>

      {loading ? (
        <div className="space-y-3">
          <div className="bg-white border border-cherry-100 rounded-2xl p-4 space-y-2">
            <SkeletonBar w="40%" h="0.9rem" />
            <SkeletonBar w="70%" h="1.2rem" />
          </div>
          <div className="bg-white border border-cherry-100 rounded-2xl p-4 space-y-3">
            <SkeletonBar w="85%" />
            <SkeletonBar w="60%" />
            <SkeletonBar w="75%" />
          </div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4" role="alert">
          <p className="flex items-start gap-2 text-sm font-bold text-red-700 leading-relaxed">
            <AlertCircle size={16} className="shrink-0 mt-0.5" aria-hidden="true" />
            {error}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-3 min-h-11 px-5 rounded-xl text-sm font-bold text-white bg-red-600 active:scale-[0.98]"
          >
            Coba Lagi
          </button>
        </div>
      ) : !data ? (
        // Resi belum terbit — keadaan normal, bukan kesalahan. Nomor resi baru
        // turun setelah kurir mengalokasikan, jadi jedanya bisa beberapa jam.
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-center" role="status">
          <PackageSearch size={32} className="text-amber-600 mx-auto mb-2" aria-hidden="true" />
          <p className="text-sm font-black text-ink-900 mb-1">Resi belum terbit</p>
          <p className="text-sm text-ink-700 leading-relaxed max-w-xs mx-auto">
            Nomor resi muncul setelah kurir menjemput paketmu. Biasanya beberapa jam setelah
            pesanan disiapkan.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Kartu kurir + resi */}
          <div className="bg-white border border-cherry-100 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Truck size={16} className="text-cherry-500" aria-hidden="true" />
              <p className="text-sm font-black text-ink-900">{namaKurir(data.courier)}</p>
            </div>
            <p className="text-xs font-bold uppercase tracking-wider text-ink-500">Nomor Resi</p>
            <div className="flex items-center justify-between gap-3 mt-1">
              <p className="text-lg font-black text-ink-900 tabular-nums break-all">
                {data.waybill_id || "—"}
              </p>
              {data.waybill_id && (
                <button
                  type="button"
                  onClick={salinResi}
                  aria-label="Salin nomor resi"
                  title="Salin nomor resi"
                  className={`shrink-0 grid place-items-center h-11 w-11 rounded-xl border active:scale-95 transition-colors ${
                    tersalin
                      ? "border-green-300 bg-green-50 text-green-700"
                      : "border-cherry-300 text-cherry-700"
                  }`}
                >
                  {tersalin ? <Check size={18} aria-hidden="true" /> : <Copy size={18} aria-hidden="true" />}
                </button>
              )}
            </div>
          </div>

          {/* Riwayat perjalanan */}
          <div className="bg-white border border-cherry-100 rounded-2xl p-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-ink-500 mb-3">
              Perjalanan Paket
            </h2>
            {riwayat.length === 0 ? (
              <p className="text-sm text-ink-500 leading-relaxed" role="status">
                Belum ada pembaruan dari kurir.
              </p>
            ) : (
              <ol className="relative">
                {riwayat.map((h, i) => {
                  const terbaru = i === 0;
                  return (
                    <li key={`${h.updated_at}-${i}`} className="flex gap-3 pb-4 last:pb-0">
                      {/* Garis + titik. Titik terisi hanya untuk yang terbaru —
                          itu yang menjawab "sekarang di mana". */}
                      <div className="flex flex-col items-center shrink-0">
                        <span
                          className={`w-3 h-3 rounded-full mt-1 ${
                            terbaru ? "bg-cherry-500 ring-4 ring-cherry-100" : "bg-cherry-200"
                          }`}
                          aria-hidden="true"
                        />
                        {i < riwayat.length - 1 && (
                          <span className="w-px flex-1 bg-cherry-100 mt-1" aria-hidden="true" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0 pb-1">
                        <p
                          className={`text-sm leading-snug ${
                            terbaru ? "font-black text-ink-900" : "font-bold text-ink-700"
                          }`}
                        >
                          {h.label}
                        </p>
                        <p className="text-xs text-ink-500 mt-0.5 tabular-nums">
                          {formatWaktu(h.updated_at)}
                        </p>
                        {/* Catatan asli dari kurir ditampilkan kalau berbeda
                            dari labelnya — kadang memuat nama kota sortir yang
                            tidak ada di terjemahan status. */}
                        {h.note && h.note !== h.label && (
                          <p className="text-xs text-ink-500 mt-1 leading-relaxed">{h.note}</p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>

          {(data.link || trackingURL(data.courier, data.waybill_id)) && (
            <a
              href={data.link || trackingURL(data.courier, data.waybill_id)!}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 min-h-11 rounded-xl border border-cherry-200 text-sm font-bold text-cherry-700 active:scale-[0.98]"
            >
              Buka halaman resmi kurir
              <ExternalLink size={14} aria-hidden="true" />
            </a>
          )}
        </div>
      )}
    </div>
  );
}
