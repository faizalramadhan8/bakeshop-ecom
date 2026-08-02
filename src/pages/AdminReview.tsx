import { useEffect, useState } from "react";
import {
  Star, Eye, EyeOff, Loader2, MessageSquare, Search,
} from "lucide-react";
import toast from "react-hot-toast";
import { adminApi, decodeToken, type ReviewAdmin } from "@/lib/api";
import { AdminShell } from "@/components/AdminShell";

const ECOM_ADMIN_ROLES = ["ecom_admin", "ecom_superadmin", "superadmin"];

function formatDate(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("id-ID", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export function AdminReview() {
  useEffect(() => {
    const claims = decodeToken();
    if (!claims || !ECOM_ADMIN_ROLES.includes(claims.role || "")) {
      window.location.href = "/";
    }
  }, []);

  const [items, setItems] = useState<ReviewAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "hidden">("all");
  const [search, setSearch] = useState("");
  const [processing, setProcessing] = useState<string | null>(null);
  // Inline confirm state — cegah window.confirm ugly. Sprint 3 admin polish.
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    adminApi.listReviewsAdmin({ hidden_only: filter === "hidden" })
      .then((rows) => setItems(rows || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  };
  useEffect(load, [filter]);

  // Filter di FE by search — product name / user name / comment.
  const filtered = search.trim()
    ? items.filter((r) => {
        const s = search.toLowerCase();
        return (
          r.product_name.toLowerCase().includes(s) ||
          r.user_name.toLowerCase().includes(s) ||
          (r.comment || "").toLowerCase().includes(s)
        );
      })
    : items;

  // Aksi tampil-kembali langsung (tidak destruktif). Aksi sembunyikan gate ke
  // inline confirm panel supaya jelas + tidak trigger native dialog.
  const performToggle = async (r: ReviewAdmin, nextHidden: boolean) => {
    if (processing === r.id) return;
    setProcessing(r.id);
    try {
      await adminApi.toggleReviewHide(r.id, nextHidden);
      setItems((prev) =>
        prev.map((x) => (x.id === r.id ? { ...x, is_hidden: nextHidden } : x))
      );
      setConfirmingId(null);
      toast.success(nextHidden ? "Review disembunyikan" : "Review ditampilkan kembali");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal update");
    } finally {
      setProcessing(null);
    }
  };

  return (
    <AdminShell
      title="Moderasi Ulasan"
      subtitle="Sembunyikan ulasan yang mengandung ujaran kebencian, SARA, spam, atau tidak sesuai aturan."
    >
      {/* Filter + search */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="flex gap-2">
          {(["all", "hidden"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`px-3 h-9 rounded-full text-sm font-bold ${
                filter === f
                  ? "bg-cherry-500 text-white"
                  : "bg-white border border-cherry-200 text-ink-700 hover:bg-cherry-50"
              }`}
            >
              {f === "all" ? "Semua" : "Yang Disembunyikan"}
            </button>
          ))}
        </div>
        <div className="flex-1 relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-500 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari produk, customer, atau komentar…"
            className="w-full h-9 pl-9 pr-3 rounded-full border border-cherry-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-cherry-500/30"
          />
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="py-16 text-center text-ink-500 text-sm">
          <Loader2 size={20} className="animate-spin mx-auto mb-2" />
          Memuat ulasan…
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-cherry-200">
          <div className="w-16 h-16 rounded-full bg-cherry-50 mx-auto mb-3 flex items-center justify-center">
            <MessageSquare size={30} className="text-cherry-300" aria-hidden="true" />
          </div>
          <p className="text-sm font-black text-ink-900 mb-1">
            {filter === "hidden" ? "Tidak ada ulasan disembunyikan" : "Belum ada ulasan"}
          </p>
          <p className="text-xs text-ink-500">
            {filter === "hidden" ? "Semua ulasan customer tampil normal." : "Ulasan akan tampil di sini setelah customer submit."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((r) => (
            <div
              key={r.id}
              className={`bg-white border rounded-2xl p-4 ${
                r.is_hidden ? "border-red-300 bg-red-50/30" : "border-cherry-200"
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1 min-w-0">
                  {/* Star rating */}
                  <div className="flex items-center gap-1 mb-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star
                        key={n}
                        size={14}
                        strokeWidth={1.5}
                        className={
                          r.rating >= n
                            ? "fill-amber-400 text-amber-400"
                            : "fill-transparent text-cherry-200"
                        }
                        aria-hidden="true"
                      />
                    ))}
                    <span className="ml-1 text-xs font-bold text-ink-500">
                      {r.rating}/5
                    </span>
                    {r.is_hidden && (
                      <span className="ml-2 inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded bg-red-100 text-red-700">
                        <EyeOff size={10} /> Disembunyikan
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-black text-ink-900 truncate">
                    {r.product_name || "(produk terhapus)"}
                  </p>
                  <p className="text-xs text-ink-500">
                    {r.user_name} · {r.user_email}
                  </p>
                </div>
                <p className="text-xs text-ink-500 shrink-0 text-right">
                  {formatDate(r.created_at)}
                </p>
              </div>
              {r.comment && (
                <p className="text-sm text-ink-700 leading-relaxed mt-2 whitespace-pre-wrap">
                  {r.comment}
                </p>
              )}
              <div className="mt-3 pt-3 border-t border-cherry-100">
                {confirmingId === r.id ? (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                    <p className="text-sm text-ink-900 mb-1">
                      Sembunyikan ulasan ini dari halaman produk?
                    </p>
                    <p className="text-xs text-ink-500 mb-3">
                      Ulasan tetap tersimpan di database — customer lain tidak akan
                      melihatnya. Bisa ditampilkan kembali kapan saja.
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => performToggle(r, true)}
                        disabled={processing === r.id}
                        className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-md active:scale-[0.98] disabled:opacity-40"
                      >
                        {processing === r.id ? (
                          <>
                            <Loader2 size={12} className="animate-spin" aria-hidden="true" />
                            Menyembunyikan…
                          </>
                        ) : (
                          <>
                            <EyeOff size={12} aria-hidden="true" />
                            Ya, Sembunyikan
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmingId(null)}
                        disabled={processing === r.id}
                        className="h-9 px-3 rounded-lg text-xs font-bold text-ink-500 hover:text-ink-700 disabled:opacity-40"
                      >
                        Batal
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      r.is_hidden ? performToggle(r, false) : setConfirmingId(r.id)
                    }
                    disabled={processing === r.id}
                    className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-bold disabled:opacity-40 ${
                      r.is_hidden
                        ? "border border-emerald-500 text-emerald-700 hover:bg-emerald-50"
                        : "border border-red-500 text-red-600 hover:bg-red-50"
                    }`}
                  >
                    {processing === r.id ? (
                      <Loader2 size={12} className="animate-spin" aria-hidden="true" />
                    ) : r.is_hidden ? (
                      <Eye size={12} aria-hidden="true" />
                    ) : (
                      <EyeOff size={12} aria-hidden="true" />
                    )}
                    {r.is_hidden ? "Tampilkan Kembali" : "Sembunyikan"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminShell>
  );
}
