import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Receipt, Package, ChevronRight } from "lucide-react";
import { ordersApi, formatRp, type CustomerOrderListItem } from "@/lib/api";
import { useUrlQueryState } from "@/lib/useUrlQueryState";
import { SkeletonList } from "@/components/Skeleton";

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

// Tab mengikuti perjalanan pesanan, bukan daftar status mentah. Customer tidak
// membedakan `paid` dari `processing` — dua-duanya berarti "sudah bayar,
// tinggal nunggu dikemas". Status batal/kadaluarsa sengaja hanya muncul di
// "Semua": memberinya tab sendiri berarti memajang kegagalan sebagai menu.
const TABS = [
  { key: "semua", label: "Semua", match: null as string[] | null },
  { key: "belum-bayar", label: "Belum Bayar", match: ["pending_payment"] },
  { key: "dikemas", label: "Dikemas", match: ["paid", "processing"] },
  { key: "dikirim", label: "Dikirim", match: ["shipped", "delivered"] },
  { key: "selesai", label: "Selesai", match: ["completed"] },
];

// Tiap tab punya kalimat kosongnya sendiri. Satu kalimat generik untuk semua
// tab membuat orang mengira halamannya rusak, padahal cuma tidak ada isinya.
const EMPTY_TEXT: Record<string, string> = {
  "belum-bayar": "Tidak ada pesanan yang menunggu pembayaran.",
  dikemas: "Belum ada pesanan yang sedang disiapkan.",
  dikirim: "Belum ada paket yang sedang dalam perjalanan.",
  selesai: "Belum ada pesanan yang selesai.",
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
  // Disimpan di URL supaya bisa di-bookmark, tahan refresh, dan tombol back
  // browser mengembalikan tab sebelumnya alih-alih keluar dari halaman.
  const [tab, setTab] = useUrlQueryState("tab", "semua");

  useEffect(() => {
    ordersApi.list().then(setOrders).catch(() => setOrders([])).finally(() => setLoading(false));
  }, []);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const t of TABS) {
      c[t.key] = t.match ? orders.filter((o) => t.match!.includes(o.ecom_status)).length : orders.length;
    }
    return c;
  }, [orders]);

  const aktif = TABS.find((t) => t.key === tab) ?? TABS[0];
  const shown = aktif.match ? orders.filter((o) => aktif.match!.includes(o.ecom_status)) : orders;

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-xl font-black text-ink-900 mb-3">Pesanan Saya</h1>

      {/* Tab digeser mendatar di layar sempit — lima tab tidak muat di 375px
          tanpa memperkecil tulisan di bawah batas baca. */}
      <div
        role="tablist"
        aria-label="Saring pesanan menurut status"
        className="flex gap-1.5 overflow-x-auto -mx-4 px-4 pb-2 mb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {TABS.map((t) => {
          const dipilih = t.key === aktif.key;
          // Badge hanya untuk yang menuntut tindakan customer. Angka di tiap
          // tab berubah jadi hiasan dan justru menenggelamkan yang penting.
          const badge = t.key === "belum-bayar" && counts[t.key] > 0 ? counts[t.key] : null;
          return (
            <button
              key={t.key}
              role="tab"
              aria-selected={dipilih}
              onClick={() => setTab(t.key)}
              className={`shrink-0 inline-flex items-center gap-1.5 min-h-11 px-4 rounded-xl text-sm font-bold border transition-colors active:scale-[0.98] ${
                dipilih
                  ? "bg-cherry-500 border-cherry-500 text-white"
                  : "bg-white border-cherry-100 text-ink-700"
              }`}
            >
              {t.label}
              {badge && (
                <span
                  className={`inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full text-[11px] font-black tabular-nums ${
                    dipilih ? "bg-white text-cherry-600" : "bg-amber-500 text-white"
                  }`}
                >
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {loading ? (
        <SkeletonList rows={4} />
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
      ) : shown.length === 0 ? (
        <div className="py-12 text-center" role="status">
          <p className="text-sm text-ink-500 leading-relaxed max-w-xs mx-auto">
            {EMPTY_TEXT[aktif.key] ?? "Tidak ada pesanan di tab ini."}
          </p>
          <button
            onClick={() => setTab("semua")}
            className="mt-3 min-h-11 px-5 rounded-xl text-sm font-bold text-cherry-700 border border-cherry-300 active:scale-[0.98]"
          >
            Lihat semua pesanan
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {shown.map((o) => {
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
