import { useEffect, useRef, useState } from "react";
import { Package, ChevronLeft, ChevronRight, X, ZoomIn } from "lucide-react";

// Swipeable product gallery — pattern e-commerce standar:
// - Main image (aspect-square) dengan scroll snap horizontal untuk swipe di
//   mobile (touch native, tidak butuh library).
// - Thumbnail row di bawah kalau ada > 1 gambar (tap thumb → scroll ke slide).
// - Arrow prev/next di desktop (opsional, di mobile pakai swipe).
// - Fallback Package icon kalau tidak ada gambar.
//
// Kenapa CSS scroll-snap bukan carousel library: 0 dependency, native touch
// smooth, works with reduced-motion, no bundle bloat. Cukup untuk 1-5 gambar.
export function ProductGallery({
  images,
  alt,
  weightBadge,
  stockBadge,
}: {
  images: string[];
  alt: string;
  weightBadge?: string;
  stockBadge?: string;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  // Sprint 2 #9 — lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Track scroll position → highlight thumb aktif + hide arrow at edges.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const onScroll = () => {
      const idx = Math.round(el.scrollLeft / el.clientWidth);
      setActiveIndex(idx);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToIndex = (i: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  };

  if (images.length === 0) {
    return (
      <div className="aspect-square bg-cherry-50 rounded-2xl border border-cherry-100 flex items-center justify-center">
        <Package size={80} className="text-cherry-200" aria-hidden="true" />
      </div>
    );
  }

  const hasMultiple = images.length > 1;

  return (
    <div className="flex flex-col gap-2">
      {/* Main viewport */}
      <div className="relative">
        <div
          ref={scrollerRef}
          className="aspect-square rounded-2xl border border-cherry-100 overflow-x-auto snap-x snap-mandatory scroll-smooth flex bg-cherry-50 scrollbar-hide"
          role="region"
          aria-label="Foto produk (geser untuk melihat lain)"
        >
          {images.map((src, i) => (
            <button
              key={src + i}
              type="button"
              onClick={() => setLightboxOpen(true)}
              aria-label="Perbesar foto"
              className="snap-start shrink-0 w-full aspect-square flex items-center justify-center relative group"
            >
              {/* eslint-disable-next-line jsx-a11y/alt-text */}
              <img
                src={src}
                alt={`${alt} — foto ${i + 1}`}
                className="w-full h-full object-cover"
                loading={i === 0 ? "eager" : "lazy"}
              />
              {/* Hover hint zoom (desktop) */}
              <span className="hidden sm:flex absolute bottom-3 right-3 w-9 h-9 rounded-full bg-white/90 text-ink-700 items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md">
                <ZoomIn size={16} aria-hidden="true" />
              </span>
            </button>
          ))}
        </div>

        {/* Overlay badges */}
        {weightBadge && (
          <span className="absolute top-3 left-3 text-xs font-bold px-3 py-1 rounded-lg bg-white/90 text-ink-900 pointer-events-none">
            {weightBadge}
          </span>
        )}
        {stockBadge && (
          <span className="absolute top-3 right-3 text-xs font-bold px-3 py-1 rounded-lg bg-cherry-500 text-white pointer-events-none">
            {stockBadge}
          </span>
        )}

        {/* Arrow controls (desktop) */}
        {hasMultiple && activeIndex > 0 && (
          <button
            type="button"
            onClick={() => scrollToIndex(activeIndex - 1)}
            aria-label="Foto sebelumnya"
            className="hidden sm:flex absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 text-ink-900 items-center justify-center shadow-md hover:bg-white"
          >
            <ChevronLeft size={18} aria-hidden="true" />
          </button>
        )}
        {hasMultiple && activeIndex < images.length - 1 && (
          <button
            type="button"
            onClick={() => scrollToIndex(activeIndex + 1)}
            aria-label="Foto berikutnya"
            className="hidden sm:flex absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 text-ink-900 items-center justify-center shadow-md hover:bg-white"
          >
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        )}

        {/* Dot indicator (mobile) */}
        {hasMultiple && (
          <div className="sm:hidden absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 bg-black/40 px-2 py-1 rounded-full">
            {images.map((_, i) => (
              <span
                key={i}
                aria-hidden="true"
                className={`w-1.5 h-1.5 rounded-full transition-all ${
                  i === activeIndex ? "bg-white w-3" : "bg-white/60"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Thumbnail strip */}
      {hasMultiple && (
        <div className="hidden sm:flex gap-2 overflow-x-auto pb-1">
          {images.map((src, i) => (
            <button
              key={src + i}
              type="button"
              onClick={() => scrollToIndex(i)}
              aria-label={`Lihat foto ${i + 1}`}
              aria-current={i === activeIndex ? "true" : undefined}
              className={`shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                i === activeIndex ? "border-cherry-500" : "border-cherry-100 hover:border-cherry-300"
              }`}
            >
              {/* eslint-disable-next-line jsx-a11y/alt-text */}
              <img src={src} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* Lightbox fullscreen (Sprint 2 #9) — pinch-zoom via touch-action.
          Sync activeIndex ke initial state — customer buka lightbox dari
          gambar keberapa saja. */}
      {lightboxOpen && (
        <ImageLightbox
          images={images}
          alt={alt}
          initialIndex={activeIndex}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </div>
  );
}

// ─── ImageLightbox ────────────────────────────────────────────────────
// Fullscreen viewer — swipe/arrow untuk navigate + native pinch-zoom via
// touch-action + click backdrop/X untuk close. Sengaja simple (no library)
// karena Tailwind cukup + pinch native di Chrome/Safari sudah smooth.

function ImageLightbox({
  images,
  alt,
  initialIndex,
  onClose,
}: {
  images: string[];
  alt: string;
  initialIndex: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(initialIndex);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") setIndex((i) => Math.max(0, i - 1));
      if (e.key === "ArrowRight") setIndex((i) => Math.min(images.length - 1, i + 1));
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [images.length, onClose]);

  // Scroll ke slide sesuai index (untuk arrow nav + initial mount)
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ left: index * el.clientWidth, behavior: "smooth" });
  }, [index]);

  const hasMultiple = images.length > 1;

  return (
    <div
      className="fixed inset-0 z-[60] bg-ink-900/95 flex flex-col modal-fade-in"
      role="dialog"
      aria-modal="true"
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2 shrink-0">
        <span className="text-white/70 text-sm font-bold">
          {hasMultiple ? `${index + 1} / ${images.length}` : ""}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup"
          className="w-11 h-11 rounded-full flex items-center justify-center text-white hover:bg-white/10"
        >
          <X size={20} aria-hidden="true" />
        </button>
      </div>

      {/* Scrollable images — snap horizontal + native pinch-zoom */}
      <div
        ref={scrollerRef}
        className="flex-1 overflow-x-auto snap-x snap-mandatory flex scrollbar-hide"
        onScroll={(e) => {
          const el = e.currentTarget;
          const i = Math.round(el.scrollLeft / el.clientWidth);
          if (i !== index) setIndex(i);
        }}
      >
        {images.map((src, i) => (
          <div
            key={src + i}
            className="snap-start shrink-0 w-full h-full flex items-center justify-center overflow-auto"
            style={{ touchAction: "pinch-zoom" }}
          >
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <img
              src={src}
              alt={`${alt} — foto ${i + 1}`}
              className="max-w-full max-h-full object-contain select-none"
              draggable={false}
            />
          </div>
        ))}
      </div>

      {/* Nav arrows desktop */}
      {hasMultiple && index > 0 && (
        <button
          type="button"
          onClick={() => setIndex(index - 1)}
          aria-label="Foto sebelumnya"
          className="hidden sm:flex absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 backdrop-blur text-white items-center justify-center hover:bg-white/20"
        >
          <ChevronLeft size={22} aria-hidden="true" />
        </button>
      )}
      {hasMultiple && index < images.length - 1 && (
        <button
          type="button"
          onClick={() => setIndex(index + 1)}
          aria-label="Foto berikutnya"
          className="hidden sm:flex absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 backdrop-blur text-white items-center justify-center hover:bg-white/20"
        >
          <ChevronRight size={22} aria-hidden="true" />
        </button>
      )}

      {/* Dot indicator mobile */}
      {hasMultiple && (
        <div className="sm:hidden flex items-center justify-center gap-1.5 py-4 shrink-0">
          {images.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? "bg-white w-4" : "bg-white/40 w-1.5"
              }`}
              aria-hidden="true"
            />
          ))}
        </div>
      )}
    </div>
  );
}
