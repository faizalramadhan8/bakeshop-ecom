// Logo Santi — inline SVG (sama seperti POS bakeshop-fe/BakeryLogo).
// Landscape red-brick rectangle dengan "Toko Bahan Kue" small caps + "SANTI" big bold.
// Bu Santi 24 Jul 2026 — konsisten branding lintas app.
export function BakeryLogo({ size = 40, className = "" }: { size?: number; className?: string }) {
  const height = size;
  const width = Math.round(size * 1.4);
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 112 80"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      aria-label="Toko Bahan Kue Santi"
      role="img"
    >
      <rect x="2" y="2" width="108" height="76" rx="14" fill="#C4302B" />
      <text
        x="56"
        y="30"
        textAnchor="middle"
        fontFamily="Arial Narrow, Arial, sans-serif"
        fontSize="14"
        fontWeight="700"
        fill="#FFFFFF"
        letterSpacing="0.6"
      >
        Toko Bahan Kue
      </text>
      <text
        x="56"
        y="64"
        textAnchor="middle"
        fontFamily="Arial Narrow, Arial Black, sans-serif"
        fontSize="32"
        fontWeight="900"
        fill="#FFFFFF"
        letterSpacing="3"
      >
        SANTI
      </text>
    </svg>
  );
}
