// CourierLogo — brand badge untuk kurir Indonesia. Sengaja pakai colored
// SVG-like text badge (bukan fetch image dari CDN kurir) supaya:
//   1. No external image dependency (kurang deps, no CORS, no broken img)
//   2. Konsisten sizing + fit di layout kita
//   3. Legal-safe (tidak host / redistribute logo pihak lain)
//
// Kalau nanti Bu Santi partnership resmi + dapat asset kit dari kurir,
// swap ke <img> — signature-nya tetap sama.

type CourierBrand = {
  bg: string;
  text: string;
  color: string;
};

const BRANDS: Record<string, CourierBrand> = {
  jne:       { bg: "#E60012", text: "JNE",  color: "#FFF" },
  jnt:       { bg: "#E60012", text: "J&T",  color: "#FFF" },
  sicepat:   { bg: "#DC2626", text: "SiC",  color: "#FFF" },
  anteraja:  { bg: "#FFC300", text: "AJA",  color: "#0F172A" },
  ninja:     { bg: "#D90429", text: "Ninja", color: "#FFF" },
  pos:       { bg: "#F97316", text: "POS",  color: "#FFF" },
  tiki:      { bg: "#0284C7", text: "TIKI", color: "#FFF" },
  lion:      { bg: "#DC2626", text: "LP",   color: "#FFF" },
  idexpress: { bg: "#0F172A", text: "ID",   color: "#FFF" },
  wahana:    { bg: "#059669", text: "WHN",  color: "#FFF" },
  sap:       { bg: "#7C3AED", text: "SAP",  color: "#FFF" },
  rpx:       { bg: "#1E3A8A", text: "RPX",  color: "#FFF" },
  paxel:     { bg: "#F97316", text: "PXL",  color: "#FFF" },
  gojek:     { bg: "#00A650", text: "GOJEK", color: "#FFF" },
  grab:      { bg: "#00B14F", text: "GRAB",  color: "#FFF" },
  rara:      { bg: "#DC2626", text: "RARA",  color: "#FFF" },
  jdl:       { bg: "#0EA5E9", text: "JDL",   color: "#FFF" },
  deliveree: { bg: "#1E3A8A", text: "DLV",   color: "#FFF" },
  sentralcargo: { bg: "#7C3AED", text: "SCG", color: "#FFF" },
};

const DEFAULT: CourierBrand = { bg: "#8B6A73", text: "KUR", color: "#FFF" };

// Normalize input — user bisa pass "SiCepat", "sicepat", "j&t express", dll.
function toKey(courier: string): string {
  const s = courier.toLowerCase().trim();
  if (s.includes("j&t") || s === "jnt" || s.startsWith("j&t") || s.includes("jt express")) return "jnt";
  if (s.includes("sicepat")) return "sicepat";
  if (s.includes("jne")) return "jne";
  if (s.includes("anteraja")) return "anteraja";
  if (s.includes("ninja")) return "ninja";
  if (s.includes("pos indonesia") || s === "pos") return "pos";
  if (s.includes("tiki")) return "tiki";
  if (s.includes("lion")) return "lion";
  if (s.includes("id express") || s === "idexpress") return "idexpress";
  if (s.includes("wahana")) return "wahana";
  if (s.includes("paxel")) return "paxel";
  if (s.includes("gojek") || s.includes("gosend")) return "gojek";
  if (s.includes("grab")) return "grab";
  return s.replace(/[^a-z]/g, "");
}

export function CourierLogo({
  courier,
  size = 40,
  className = "",
}: {
  courier: string;
  size?: number;
  className?: string;
}) {
  const brand = BRANDS[toKey(courier)] || DEFAULT;
  // Font size scales dengan text length — 3 char (default) fill nyaman;
  // "GOJEK"/"Ninja"/"KUR" dikecilkan supaya tidak overflow.
  const fontSize = brand.text.length >= 5 ? size * 0.24 : brand.text.length >= 4 ? size * 0.28 : size * 0.32;
  return (
    <div
      style={{
        width: size,
        height: size,
        background: brand.bg,
        color: brand.color,
        fontSize,
      }}
      className={`flex items-center justify-center rounded-lg font-black tracking-tight shrink-0 ${className}`}
      aria-label={courier}
      role="img"
    >
      {brand.text}
    </div>
  );
}
