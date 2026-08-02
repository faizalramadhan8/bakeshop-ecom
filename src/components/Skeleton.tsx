// Skeleton — placeholder loading yang lebih pro daripada spinner untuk
// list/card layout (rule §3 progressive-loading + §7 fade-crossfade).
// Sprint 4 foundation (30 Jul 2026).
//
// Kegunaan:
//   <SkeletonBar w="60%" />           — teks 1 baris
//   <SkeletonCard />                   — card produk/order generic
//   <SkeletonList rows={5} />          — beberapa card berturut-turut
//   <SkeletonAvatar size={40} />       — foto profile

interface SkeletonBarProps {
  w?: string;    // width, e.g. "60%", "8rem"
  h?: string;    // height, default "0.75rem"
  className?: string;
}

export function SkeletonBar({ w = "100%", h = "0.75rem", className = "" }: SkeletonBarProps) {
  return (
    <div
      className={`rounded bg-gradient-to-r from-cherry-100 via-cherry-50 to-cherry-100 animate-pulse ${className}`}
      style={{ width: w, height: h }}
      aria-hidden="true"
    />
  );
}

export function SkeletonAvatar({ size = 40 }: { size?: number }) {
  return (
    <div
      className="rounded-full bg-cherry-100 animate-pulse shrink-0"
      style={{ width: size, height: size }}
      aria-hidden="true"
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-white border border-cherry-100 rounded-2xl p-4 flex items-center gap-3">
      <SkeletonAvatar size={44} />
      <div className="flex-1 flex flex-col gap-2">
        <SkeletonBar w="70%" />
        <SkeletonBar w="40%" h="0.625rem" />
      </div>
      <SkeletonBar w="4rem" h="1.25rem" />
    </div>
  );
}

export function SkeletonList({ rows = 4 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-2" role="status" aria-label="Memuat data">
      {Array.from({ length: rows }, (_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

// Skeleton untuk stat card di Dashboard.
export function SkeletonStat() {
  return (
    <div className="bg-white border border-cherry-100 rounded-2xl p-4 flex flex-col gap-2">
      <SkeletonBar w="60%" h="0.625rem" />
      <SkeletonBar w="40%" h="1.5rem" />
      <SkeletonBar w="50%" h="0.625rem" />
    </div>
  );
}
