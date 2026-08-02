// AdminBroadcasts — Sprint 5 Chunk 6 (2 Aug 2026).
// Kompose + kirim push notif ke SEMUA customer ecom subscriber + history.
// Aksi destructive (broadcast tidak bisa undo), pakai inline confirm banner.

import { useEffect, useState } from "react";
import {
  Bell, Send, Loader2, CheckCircle2, AlertCircle, Sparkles,
  ExternalLink, Users, TrendingUp,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  adminApi, decodeToken,
  type EcomBroadcastResponse,
} from "@/lib/api";
import { AdminShell } from "@/components/AdminShell";
import { SkeletonList } from "@/components/Skeleton";

const ECOM_ADMIN_ROLES = ["ecom_admin", "ecom_superadmin", "superadmin"];

// Template preset — kasih kickstart Bu Santi kalau bingung mulai dari mana.
// Semua text bisa di-edit setelah dipilih.
const TEMPLATES: Array<{ label: string; title: string; body: string; url: string }> = [
  {
    label: "Flash Sale",
    title: "Flash Sale hari ini!",
    body: "Diskon spesial untuk semua produk hari ini saja. Jangan sampai kehabisan.",
    url: "/",
  },
  {
    label: "Gratis Ongkir",
    title: "Gratis ongkir min. Rp 200.000",
    body: "Belanja lebih hemat mulai hari ini. Berlaku untuk semua wilayah Indonesia.",
    url: "/",
  },
  {
    label: "Stok Baru",
    title: "Stok baru sudah masuk!",
    body: "Bahan kue favoritmu sudah tersedia. Cek koleksi terbaru sekarang.",
    url: "/kategori",
  },
  {
    label: "Voucher",
    title: "Voucher baru untukmu",
    body: "Pakai kode HEMAT10 untuk diskon 10% weekend ini.",
    url: "/",
  },
];

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString("id-ID", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export function AdminBroadcasts() {
  useEffect(() => {
    const claims = decodeToken();
    if (!claims || !ECOM_ADMIN_ROLES.includes(claims.role || "")) {
      window.location.href = "/";
    }
  }, []);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);

  const [history, setHistory] = useState<EcomBroadcastResponse[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const load = () => {
    setHistoryLoading(true);
    adminApi.listBroadcasts()
      .then((rows) => setHistory(rows || []))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Gagal load history"))
      .finally(() => setHistoryLoading(false));
  };
  useEffect(load, []);

  const applyTemplate = (t: typeof TEMPLATES[0]) => {
    setTitle(t.title);
    setBody(t.body);
    setUrl(t.url);
    setConfirming(false);
  };

  const doSend = async () => {
    if (title.trim().length < 3) {
      toast.error("Judul minimal 3 karakter");
      return;
    }
    if (body.trim().length < 3) {
      toast.error("Pesan minimal 3 karakter");
      return;
    }
    setSending(true);
    try {
      const res = await adminApi.sendBroadcast({
        title: title.trim(),
        body: body.trim(),
        url: url.trim() || undefined,
      });
      toast.success(
        `Terkirim ke ${res.delivered_count} dari ${res.total_subscribers} subscriber`
      );
      setTitle("");
      setBody("");
      setUrl("");
      setConfirming(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal kirim broadcast");
    } finally {
      setSending(false);
    }
  };

  const canSend = title.trim().length >= 3 && body.trim().length >= 3 && !sending;

  return (
    <AdminShell
      title="Broadcast Push"
      subtitle="Kirim notifikasi ke SEMUA customer yang aktifkan push notif di aplikasi."
    >
      <div className="max-w-3xl flex flex-col gap-4">

        {/* Warning banner — broadcast irreversible */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2 text-xs text-amber-800">
          <AlertCircle size={14} className="shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <b>Broadcast tidak bisa dibatalkan.</b> Notif langsung sampai ke semua device
            customer subscriber. Pastikan pesan sudah benar sebelum kirim.
          </div>
        </div>

        {/* Compose form */}
        <section className="bg-white border border-cherry-100 rounded-2xl p-5 flex flex-col gap-4">
          <div className="flex items-start gap-3 pb-2 border-b border-cherry-100">
            <div className="w-9 h-9 rounded-lg bg-cherry-50 text-cherry-500 flex items-center justify-center shrink-0">
              <Bell size={16} />
            </div>
            <div>
              <h2 className="text-sm font-black text-ink-900">Compose Broadcast</h2>
              <p className="text-xs text-ink-500 mt-0.5">Pilih template atau tulis dari nol.</p>
            </div>
          </div>

          {/* Templates */}
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-ink-500 mb-2">
              Template Cepat
            </p>
            <div className="flex flex-wrap gap-2">
              {TEMPLATES.map((t) => (
                <button
                  key={t.label}
                  type="button"
                  onClick={() => applyTemplate(t)}
                  disabled={sending}
                  className="inline-flex items-center gap-1.5 px-3 h-8 rounded-full text-xs font-bold bg-cherry-50 border border-cherry-200 text-cherry-600 hover:bg-cherry-100 disabled:opacity-40"
                >
                  <Sparkles size={11} />
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-ink-500 mb-1">
              Judul Notif <span className="text-cherry-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={sending}
              maxLength={100}
              placeholder="Contoh: Flash Sale hari ini!"
              className="w-full h-11 px-3 rounded-xl border border-cherry-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-cherry-500/30"
            />
            <p className="text-xs text-ink-500 mt-1 text-right">{title.length} / 100</p>
          </div>

          {/* Body */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-ink-500 mb-1">
              Pesan <span className="text-cherry-500">*</span>
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              disabled={sending}
              rows={3}
              maxLength={500}
              placeholder="Detail pesan yang akan tampil di notifikasi..."
              className="w-full px-3 py-2 rounded-xl border border-cherry-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-cherry-500/30 resize-none"
            />
            <p className="text-xs text-ink-500 mt-1 text-right">{body.length} / 500</p>
          </div>

          {/* URL */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-ink-500 mb-1">
              URL Tujuan (opsional)
            </label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={sending}
              maxLength={500}
              placeholder="/produk/xxx atau /kategori/tepung"
              className="w-full h-11 px-3 rounded-xl border border-cherry-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-cherry-500/30 font-mono"
            />
            <p className="text-xs text-ink-500 mt-1">
              Halaman yang dibuka saat customer klik notif. Kosongkan → buka halaman utama.
            </p>
          </div>

          {/* Preview */}
          {(title || body) && (
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-ink-500 mb-2">
                Preview Notif
              </p>
              <div className="rounded-xl border border-cherry-200 bg-gradient-to-br from-cherry-50/70 to-cherry-100/50 p-3 flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-cherry-500 flex items-center justify-center text-white shrink-0">
                  <Bell size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-ink-900 truncate">
                    {title || "Judul akan tampil di sini"}
                  </p>
                  <p className="text-xs text-ink-700 mt-0.5 line-clamp-2">
                    {body || "Isi pesan akan tampil di sini."}
                  </p>
                  <p className="text-[10px] text-ink-500 mt-1">TBK Santi · sekarang</p>
                </div>
              </div>
            </div>
          )}

          {/* Send button + inline confirm */}
          {confirming ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3">
              <p className="text-sm font-black text-ink-900 mb-1">
                Kirim broadcast ke semua subscriber?
              </p>
              <p className="text-xs text-ink-700 mb-3">
                Notif akan sampai ke semua device customer yang aktifkan push notif.
                Tidak bisa dibatalkan setelah kirim.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={doSend}
                  disabled={sending}
                  className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl text-sm font-black text-white bg-gradient-to-r from-cherry-500 to-cherry-600 hover:from-cherry-600 hover:to-cherry-700 shadow disabled:opacity-40"
                >
                  {sending ? (
                    <><Loader2 size={14} className="animate-spin" />Mengirim…</>
                  ) : (
                    <><Send size={14} />Ya, Kirim Sekarang</>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  disabled={sending}
                  className="h-10 px-4 rounded-xl text-sm font-bold text-ink-500 hover:text-ink-700 disabled:opacity-40"
                >
                  Batal
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              disabled={!canSend}
              className="inline-flex items-center justify-center gap-1.5 h-12 rounded-xl text-sm font-black text-white bg-gradient-to-r from-cherry-500 to-cherry-600 hover:from-cherry-600 hover:to-cherry-700 shadow-lg shadow-cherry-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Send size={16} />
              Kirim Broadcast
            </button>
          )}
        </section>

        {/* History */}
        <section className="bg-white border border-cherry-100 rounded-2xl p-5">
          <div className="flex items-start gap-3 pb-3 border-b border-cherry-100 mb-3">
            <div className="w-9 h-9 rounded-lg bg-cherry-50 text-cherry-500 flex items-center justify-center shrink-0">
              <TrendingUp size={16} />
            </div>
            <div>
              <h2 className="text-sm font-black text-ink-900">Riwayat Broadcast</h2>
              <p className="text-xs text-ink-500 mt-0.5">100 broadcast terakhir + metrik keberhasilan.</p>
            </div>
          </div>

          {historyLoading ? (
            <SkeletonList rows={4} />
          ) : history.length === 0 ? (
            <div className="py-12 text-center">
              <div className="w-14 h-14 rounded-full bg-cherry-50 mx-auto mb-3 flex items-center justify-center">
                <Bell size={26} className="text-cherry-300" aria-hidden="true" />
              </div>
              <p className="text-sm font-black text-ink-900 mb-1">Belum ada broadcast</p>
              <p className="text-xs text-ink-500">
                Broadcast pertama akan tampil di sini setelah dikirim.
              </p>
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-cherry-100">
              {history.map((h) => (
                <BroadcastRow key={h.id} broadcast={h} />
              ))}
            </div>
          )}
        </section>
      </div>
    </AdminShell>
  );
}

function BroadcastRow({ broadcast }: { broadcast: EcomBroadcastResponse }) {
  // Rate delivery — dashboard-style success indicator.
  const rate = broadcast.total_subscribers > 0
    ? Math.round((broadcast.delivered_count / broadcast.total_subscribers) * 100)
    : 0;
  const rateColor = rate >= 80 ? "text-green-600" : rate >= 50 ? "text-amber-600" : "text-red-600";

  return (
    <div className="py-3 flex items-start gap-3">
      <div className="w-9 h-9 rounded-lg bg-cherry-50 flex items-center justify-center shrink-0">
        <Bell size={14} className="text-cherry-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-black text-ink-900 truncate">{broadcast.title}</p>
        <p className="text-xs text-ink-700 line-clamp-2 mt-0.5">{broadcast.body}</p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-[11px] text-ink-500">
          <span className="inline-flex items-center gap-1">
            <CheckCircle2 size={10} className="text-green-500" />
            <span className="tabular-nums">{broadcast.delivered_count}</span> terkirim
          </span>
          {broadcast.failed_count > 0 && (
            <span className="inline-flex items-center gap-1 text-red-600">
              <AlertCircle size={10} />
              <span className="tabular-nums">{broadcast.failed_count}</span> gagal
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <Users size={10} />
            <span className="tabular-nums">{broadcast.total_subscribers}</span> subscriber
          </span>
          {broadcast.total_subscribers > 0 && (
            <span className={`font-bold ${rateColor}`}>{rate}%</span>
          )}
          {broadcast.url && (
            <span className="inline-flex items-center gap-1 font-mono truncate max-w-[10rem]">
              <ExternalLink size={10} />
              {broadcast.url}
            </span>
          )}
        </div>
        <p className="text-[10px] text-ink-500 mt-1">
          {fmtDate(broadcast.sent_at)}
          {broadcast.sent_by_name && ` · oleh ${broadcast.sent_by_name}`}
        </p>
      </div>
    </div>
  );
}
