import { useEffect, useRef, useState } from "react";
import { Package, ChevronLeft, ChevronRight } from "lucide-react";

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
            <div
              key={src + i}
              className="snap-start shrink-0 w-full aspect-square flex items-center justify-center"
            >
              {/* eslint-disable-next-line jsx-a11y/alt-text */}
              <img
                src={src}
                alt={`${alt} — foto ${i + 1}`}
                className="w-full h-full object-cover"
                loading={i === 0 ? "eager" : "lazy"}
              />
            </div>
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
    </div>
  );
}
