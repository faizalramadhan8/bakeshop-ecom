import { useEffect, useState } from "react";
import { Star, Loader2, Send, Edit3, MessageSquare } from "lucide-react";
import toast from "react-hot-toast";
import { publicApi, accountApi, decodeToken, type ReviewItem, type ReviewSummary } from "@/lib/api";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric", month: "short", year: "numeric",
  });
}

// StarRow — display N stars filled + (5-N) empty. Compact + accessible.
function StarRow({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={`Rating ${value} dari 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={size}
          className={i <= value ? "fill-amber-400 text-amber-400" : "fill-none text-ink-500 opacity-40"}
          aria-hidden="true"
        />
      ))}
    </span>
  );
}

// StarInput — clickable rating picker untuk form. Support keyboard (arrow keys).
function StarInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="inline-flex items-center gap-1" role="radiogroup" aria-label="Pilih rating">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i)}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight" && value < 5) onChange(value + 1);
            if (e.key === "ArrowLeft" && value > 1) onChange(value - 1);
          }}
          aria-label={`${i} bintang`}
          aria-checked={value === i}
          role="radio"
          className="p-1"
        >
          <Star
            size={28}
            className={i <= value ? "fill-amber-400 text-amber-400" : "fill-none text-ink-500 opacity-40"}
            aria-hidden="true"
          />
        </button>
      ))}
    </div>
  );
}

export function ProductReviews({ productId }: { productId: string }) {
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [canReview, setCanReview] = useState(false);
  const [myReview, setMyReview] = useState<ReviewItem | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isLoggedIn = !!decodeToken();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    publicApi
      .listReviews(productId, 20)
      .then((resp) => {
        if (cancelled) return;
        setItems(resp.items || []);
        setSummary(resp.summary);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    // Check eligibility (auth-only endpoint — silent fail kalau not logged).
    if (isLoggedIn) {
      accountApi
        .checkReviewEligibility(productId)
        .then((r) => {
          if (cancelled) return;
          setCanReview(r.can_review);
          if (r.my_review) {
            setMyReview(r.my_review);
            setRating(r.my_review.rating);
            setComment(r.my_review.comment || "");
          }
        })
        .catch(() => {});
    }
    return () => {
      cancelled = true;
    };
  }, [productId, isLoggedIn]);

  const submit = async () => {
    if (rating < 1 || rating > 5) {
      toast.error("Pilih 1-5 bintang");
      return;
    }
    setSubmitting(true);
    try {
      await accountApi.submitReview({ product_id: productId, rating, comment: comment.trim() });
      toast.success(myReview ? "Review diupdate" : "Terima kasih! Review dipublish.");
      setShowForm(false);
      // Reload untuk tampil di list.
      const resp = await publicApi.listReviews(productId, 20);
      setItems(resp.items || []);
      setSummary(resp.summary);
      const eligibility = await accountApi.checkReviewEligibility(productId);
      if (eligibility.my_review) setMyReview(eligibility.my_review);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal submit review");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="mt-6 border-t border-cherry-100 pt-6">
      <h2 className="text-base font-black text-ink-900 mb-3 flex items-center gap-2">
        <MessageSquare size={16} className="text-cherry-500" aria-hidden="true" />
        Ulasan Pembeli
        {summary && summary.count > 0 && (
          <span className="text-sm text-ink-500 font-semibold">({summary.count})</span>
        )}
      </h2>

      {/* Summary */}
      {summary && summary.count > 0 && (
        <div className="mb-4 bg-white border border-cherry-100 rounded-2xl p-4 flex items-center gap-4">
          <div className="text-center shrink-0">
            <p className="text-3xl font-black text-ink-900">{summary.average.toFixed(1)}</p>
            <StarRow value={Math.round(summary.average)} size={12} />
            <p className="text-xs text-ink-500 mt-1">{summary.count} ulasan</p>
          </div>
          <div className="flex-1 min-w-0 flex flex-col gap-1">
            {[5, 4, 3, 2, 1].map((star) => {
              const cnt = summary.distribution[String(star)] || 0;
              const pct = summary.count ? (cnt / summary.count) * 100 : 0;
              return (
                <div key={star} className="flex items-center gap-2 text-xs">
                  <span className="w-3 text-ink-700 tabular-nums">{star}</span>
                  <Star size={10} className="fill-amber-400 text-amber-400 shrink-0" aria-hidden="true" />
                  <div className="flex-1 h-1.5 rounded-full bg-cherry-50 overflow-hidden">
                    <div className="h-full bg-amber-400" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-6 text-right text-ink-500 tabular-nums">{cnt}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Form/eligibility */}
      {isLoggedIn && canReview && (
        <div className="mb-4">
          {!showForm ? (
            <button
              onClick={() => setShowForm(true)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-cherry-300 text-cherry-500 text-sm font-bold hover:bg-cherry-50"
            >
              {myReview ? <Edit3 size={14} aria-hidden="true" /> : <Star size={14} aria-hidden="true" />}
              {myReview ? "Edit Ulasan Kamu" : "Tulis Ulasan"}
            </button>
          ) : (
            <div className="bg-white border border-cherry-200 rounded-2xl p-4">
              <p className="text-sm font-bold text-ink-900 mb-2">
                {myReview ? "Update ulasan" : "Bagikan pengalaman kamu"}
              </p>
              <div className="mb-3">
                <StarInput value={rating} onChange={setRating} />
              </div>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                maxLength={1000}
                placeholder="Ceritakan pengalaman kamu — kualitas, packing, pengiriman, dll (opsional)"
                className="w-full px-4 py-3 rounded-xl border border-cherry-200 text-sm focus:outline-none focus:ring-2 focus:ring-cherry-500/30 focus:border-cherry-400 resize-y"
              />
              <p className="text-xs text-ink-500 text-right mt-1">{comment.length}/1000</p>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={submit}
                  disabled={submitting}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-sm font-bold bg-gradient-to-r from-cherry-400 to-cherry-500 disabled:opacity-60"
                >
                  {submitting ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <Send size={14} aria-hidden="true" />}
                  Kirim Ulasan
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2.5 rounded-xl border border-cherry-200 text-sm font-bold text-ink-700"
                >
                  Batal
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {isLoggedIn && !canReview && !loading && items.length > 0 && (
        <p className="text-xs text-ink-500 mb-3 italic">
          Beli produk ini + status pesanan Selesai untuk bisa review.
        </p>
      )}

      {/* List */}
      {loading ? (
        <div className="py-8 text-center text-ink-500 text-sm">Memuat ulasan…</div>
      ) : items.length === 0 ? (
        <div className="py-8 text-center bg-white rounded-2xl border border-cherry-100">
          <MessageSquare size={32} className="mx-auto text-ink-500 opacity-40 mb-2" aria-hidden="true" />
          <p className="text-sm text-ink-700">Belum ada ulasan</p>
          <p className="text-xs text-ink-500 mt-1">Jadilah yang pertama beri ulasan.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((r) => (
            <li key={r.id} className="bg-white border border-cherry-100 rounded-2xl p-4">
              <div className="flex items-center justify-between gap-2 mb-1">
                <p className="text-sm font-bold text-ink-900">{r.user_name}</p>
                <p className="text-xs text-ink-500">{formatDate(r.created_at)}</p>
              </div>
              <StarRow value={r.rating} size={13} />
              {r.comment && (
                <p className="text-sm text-ink-700 mt-2 leading-relaxed whitespace-pre-wrap">
                  {r.comment}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
