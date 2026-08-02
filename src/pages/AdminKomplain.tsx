import { useEffect, useState } from "react";
import {
  AlertCircle, MessageSquare, Check, X, Loader2, Clock, Wallet,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  adminApi, decodeToken,
  type ComplaintAdmin, type RefundMethod,
} from "@/lib/api";
import { AdminShell } from "@/components/AdminShell";

const ECOM_ADMIN_ROLES = ["ecom_admin", "ecom_superadmin", "superadmin"];

type StatusFilter = "all" | "open" | "in_review" | "resolved" | "rejected";

const STATUS_STYLE: Record<string, { label: string; badge: string }> = {
  open:       { label: "Baru",         badge: "bg-amber-100 text-amber-700" },
  in_review:  { label: "Diproses",     badge: "bg-blue-100 text-blue-700" },
  resolved:   { label: "Selesai",      badge: "bg-emerald-100 text-emerald-700" },
  rejected:   { label: "Ditolak",      badge: "bg-red-100 text-red-700" },
};

function formatDate(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("id-ID", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export function AdminKomplain() {
  useEffect(() => {
    const claims = decodeToken();
    if (!claims || !ECOM_ADMIN_ROLES.includes(claims.role || "")) {
      window.location.href = "/";
    }
  }, []);

  const [items, setItems] = useState<ComplaintAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>("open");
  const [replying, setReplying] = useState<ComplaintAdmin | null>(null);

  const load = () => {
    setLoading(true);
    adminApi.listComplaints(filter)
      .then((rows) => setItems(rows || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  };
  useEffect(load, [filter]);

  // Count per status untuk badge di filter chip
  const [counts, setCounts] = useState<Record<string, number>>({});
  useEffect(() => {
    adminApi.listComplaints("all")
      .then((rows) => {
        const c: Record<string, number> = { all: rows.length };
        for (const r of rows) c[r.status] = (c[r.status] || 0) + 1;
        setCounts(c);
      })
      .catch(() => {});
  }, [items.length]);

  const filters: { key: StatusFilter; label: string }[] = [
    { key: "open", label: "Baru" },
    { key: "in_review", label: "Diproses" },
    { key: "resolved", label: "Selesai" },
    { key: "rejected", label: "Ditolak" },
    { key: "all", label: "Semua" },
  ];

  return (
    <AdminShell
      title="Moderasi Komplain"
      subtitle="Balas keluhan dari customer supaya diselesaikan cepat."
    >
      {/* Filter chips */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto scrollbar-hide pb-1">
        {filters.map((f) => {
          const count = counts[f.key] ?? 0;
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`shrink-0 inline-flex items-center gap-1.5 px-3 h-9 rounded-full text-sm font-bold ${
                active ? "bg-cherry-500 text-white" : "bg-white border border-cherry-200 text-ink-700 hover:bg-cherry-50"
              }`}
            >
              {f.label}
              {count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-black ${
                  active ? "bg-white/20 text-white" : "bg-cherry-100 text-cherry-600"
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* List */}
      {loading ? (
        <div className="py-16 text-center text-ink-500 text-sm">
          <Loader2 size={20} className="animate-spin mx-auto mb-2" />
          Memuat komplain…
        </div>
      ) : items.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-cherry-200">
          <div className="w-16 h-16 rounded-full bg-cherry-50 mx-auto mb-3 flex items-center justify-center">
            <MessageSquare size={30} className="text-cherry-300" aria-hidden="true" />
          </div>
          <p className="text-sm font-black text-ink-900 mb-1">
            {filter === "open" ? "Tidak ada komplain baru" : "Tidak ada komplain"}
          </p>
          <p className="text-xs text-ink-500">
            {filter === "open" ? "Bagus! Belum ada keluhan dari customer." : "Coba filter lain."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((c) => {
            const style = STATUS_STYLE[c.status] || { label: c.status, badge: "bg-ink-100 text-ink-700" };
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setReplying(c)}
                className="text-left bg-white border border-cherry-200 rounded-2xl p-4 hover:border-cherry-400 transition-colors"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`text-xs font-black uppercase tracking-wide px-2 py-0.5 rounded ${style.badge}`}>
                        {style.label}
                      </span>
                      <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                        {c.reason_label}
                      </span>
                    </div>
                    <p className="text-sm font-black text-ink-900 truncate">
                      {c.user_name || "Customer"}
                    </p>
                    <p className="text-xs text-ink-500 font-mono">
                      Order #{c.order_id.slice(0, 8)}
                    </p>
                  </div>
                  <p className="text-xs text-ink-500 shrink-0 text-right">
                    {formatDate(c.created_at)}
                  </p>
                </div>
                <p className="text-sm text-ink-700 line-clamp-2 mt-2">
                  {c.description}
                </p>
                {c.admin_reply && (
                  <p className="text-xs text-emerald-700 mt-2 flex items-center gap-1">
                    <Check size={12} aria-hidden="true" />
                    Sudah dibalas
                  </p>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Reply Modal */}
      {replying && (
        <ReplyModal
          complaint={replying}
          onClose={() => setReplying(null)}
          onSaved={() => { setReplying(null); load(); }}
        />
      )}
    </AdminShell>
  );
}

// ─── ReplyModal ───────────────────────────────────────────────────────
function ReplyModal({
  complaint,
  onClose,
  onSaved,
}: {
  complaint: ComplaintAdmin;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [reply, setReply] = useState(complaint.admin_reply || "");
  const [status, setStatus] = useState<"in_review" | "resolved" | "rejected">(
    (complaint.status === "resolved" || complaint.status === "rejected") ? complaint.status : "in_review"
  );
  const [submitting, setSubmitting] = useState(false);

  // Sprint 4 Chunk 2 — refund panel, hanya muncul saat status resolved.
  // Toggle opt-in supaya Bu Santi tidak "wajib" isi refund tiap resolve komplain
  // (mis. komplain "kurir lama" — dibalas tapi tidak perlu refund).
  const [refundEnabled, setRefundEnabled] = useState(false);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundMethod, setRefundMethod] = useState<RefundMethod>("transfer_bank");
  const [refundNote, setRefundNote] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !submitting && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [submitting, onClose]);

  const submit = async () => {
    if (reply.trim().length < 5) {
      toast.error("Balasan minimal 5 karakter");
      return;
    }
    // Validasi refund kalau enabled — cegah submit dengan data setengah.
    if (status === "resolved" && refundEnabled) {
      const amt = Number(refundAmount);
      if (!amt || amt <= 0) {
        toast.error("Nominal refund wajib diisi dan lebih dari 0");
        return;
      }
    }
    setSubmitting(true);
    try {
      await adminApi.replyComplaint(complaint.id, { reply: reply.trim(), status });
      // Kalau enabled + resolved → juga record refund.
      // Order sequence: reply dulu (idempotent PATCH), baru refund. Kalau
      // refund gagal, reply tetap tersimpan — user bisa retry refund manual
      // dari halaman order detail nanti.
      if (status === "resolved" && refundEnabled) {
        try {
          await adminApi.createRefund({
            order_id: complaint.order_id,
            complaint_id: complaint.id,
            amount: Number(refundAmount),
            method: refundMethod,
            note: refundNote.trim() || undefined,
          });
          toast.success("Balasan + refund tersimpan");
        } catch (err) {
          toast.error(
            "Balasan tersimpan, tapi refund gagal: " +
            (err instanceof Error ? err.message : "unknown")
          );
        }
      } else {
        toast.success("Balasan tersimpan");
      }
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal simpan");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4" role="dialog" aria-modal="true">
      <div
        className="absolute inset-0 bg-ink-900/60 backdrop-blur-sm modal-fade-in"
        onClick={() => !submitting && onClose()}
      />
      <div className="relative bg-white sm:rounded-3xl rounded-t-3xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col modal-sheet-in overflow-hidden">
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          aria-label="Tutup"
          className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full flex items-center justify-center text-ink-500 bg-white/70 backdrop-blur hover:bg-white disabled:opacity-40"
        >
          <X size={16} aria-hidden="true" />
        </button>

        {/* Header */}
        <div className="px-5 sm:px-6 pt-5 pb-3 border-b border-cherry-100 shrink-0">
          <h2 className="text-base font-black text-ink-900">Balas Komplain</h2>
          <p className="text-xs text-ink-500 mt-0.5">
            Customer: <span className="font-bold">{complaint.user_name || "—"}</span>
            {" · "}Order #{complaint.order_id.slice(0, 8)}
          </p>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4">
          {/* Info komplain */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle size={14} className="text-amber-600 shrink-0" aria-hidden="true" />
              <p className="text-xs font-black uppercase tracking-wide text-amber-700">
                {complaint.reason_label}
              </p>
            </div>
            <p className="text-sm text-ink-900 leading-relaxed whitespace-pre-wrap">
              {complaint.description}
            </p>
            {complaint.images && complaint.images.length > 0 && (
              <div className="flex gap-2 mt-3 overflow-x-auto">
                {complaint.images.map((url, i) => (
                  // eslint-disable-next-line jsx-a11y/alt-text
                  <img
                    key={i}
                    src={url}
                    className="w-20 h-20 object-cover rounded-lg border border-amber-200 shrink-0"
                    loading="lazy"
                  />
                ))}
              </div>
            )}
          </div>

          {/* Status selector */}
          <p className="text-xs font-black uppercase tracking-wider text-ink-500 mb-2">
            Status Setelah Dibalas
          </p>
          <div className="flex gap-2 mb-4 flex-wrap">
            {[
              { key: "in_review" as const, label: "Diproses", color: "border-blue-500 bg-blue-50 text-blue-700" },
              { key: "resolved" as const, label: "Selesai", color: "border-emerald-500 bg-emerald-50 text-emerald-700" },
              { key: "rejected" as const, label: "Ditolak", color: "border-red-500 bg-red-50 text-red-700" },
            ].map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => setStatus(s.key)}
                disabled={submitting}
                className={`px-3 py-2 rounded-xl border-2 text-sm font-bold ${
                  status === s.key ? s.color : "border-cherry-100 bg-white text-ink-500 hover:border-cherry-300"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Reply textarea */}
          <p className="text-xs font-black uppercase tracking-wider text-ink-500 mb-2">
            Balasan ke Customer
          </p>
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            disabled={submitting}
            placeholder="Tulis balasan yang jelas dan solutif..."
            rows={5}
            maxLength={1000}
            className="w-full px-3 py-2.5 rounded-xl border border-cherry-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-cherry-500/30 focus:border-cherry-400 resize-none"
          />
          <p className="text-xs text-ink-500 mt-1 text-right">{reply.length} / 1000</p>

          {/* Refund panel — muncul hanya saat status resolved. */}
          {status === "resolved" && (
            <div className="mt-4 rounded-xl border border-cherry-200 bg-cherry-50/40 p-4">
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={refundEnabled}
                  onChange={(e) => setRefundEnabled(e.target.checked)}
                  disabled={submitting}
                  className="mt-0.5 w-4 h-4 accent-cherry-500"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black text-ink-900 flex items-center gap-1.5">
                    <Wallet size={14} className="text-cherry-500" aria-hidden="true" />
                    Catat refund untuk komplain ini
                  </p>
                  <p className="text-xs text-ink-500 mt-0.5">
                    Transfer dana ke customer secara manual, lalu catat di sini untuk
                    audit. Restock manual via <b>Sesuaikan Stok</b> di halaman produk.
                  </p>
                </div>
              </label>

              {refundEnabled && (
                <div className="mt-4 pl-6 flex flex-col gap-3">
                  <div>
                    <label className="text-xs font-black uppercase tracking-wider text-ink-500 mb-1 block">
                      Nominal Refund (Rp) *
                    </label>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={refundAmount}
                      onChange={(e) => setRefundAmount(e.target.value)}
                      disabled={submitting}
                      placeholder="0"
                      className="w-full h-11 px-3 rounded-xl border border-cherry-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-cherry-500/30"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-black uppercase tracking-wider text-ink-500 mb-1 block">
                      Metode Refund
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {([
                        { key: "transfer_bank" as const, label: "Transfer Bank" },
                        { key: "ewallet"       as const, label: "E-Wallet" },
                        { key: "cash"          as const, label: "Tunai" },
                        { key: "voucher"       as const, label: "Voucher" },
                        { key: "other"         as const, label: "Lainnya" },
                      ]).map((m) => (
                        <button
                          key={m.key}
                          type="button"
                          onClick={() => setRefundMethod(m.key)}
                          disabled={submitting}
                          className={`px-3 h-8 rounded-full text-xs font-bold border ${
                            refundMethod === m.key
                              ? "bg-cherry-500 border-cherry-500 text-white"
                              : "bg-white border-cherry-200 text-ink-700 hover:bg-cherry-50"
                          }`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-black uppercase tracking-wider text-ink-500 mb-1 block">
                      Catatan (opsional)
                    </label>
                    <input
                      type="text"
                      value={refundNote}
                      onChange={(e) => setRefundNote(e.target.value)}
                      disabled={submitting}
                      placeholder="Contoh: BCA 1234, bukti tf 31 Jul"
                      maxLength={500}
                      className="w-full h-11 px-3 rounded-xl border border-cherry-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-cherry-500/30"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 pt-3 pb-4 border-t border-cherry-100 shrink-0 bg-white">
          <button
            type="button"
            onClick={submit}
            disabled={submitting || reply.trim().length < 5}
            className="w-full h-12 rounded-xl text-sm font-black text-white bg-gradient-to-r from-cherry-500 to-cherry-600 hover:from-cherry-600 hover:to-cherry-700 shadow-lg shadow-cherry-500/20 active:scale-[0.98] transition-transform disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Clock size={14} className="animate-spin" aria-hidden="true" />
                Menyimpan…
              </>
            ) : (
              "Simpan Balasan"
            )}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="w-full mt-2 h-11 rounded-xl text-sm font-bold text-ink-500 hover:text-ink-700 hover:bg-cherry-50/50 disabled:opacity-40"
          >
            Batal
          </button>
        </div>
      </div>
    </div>
  );
}
