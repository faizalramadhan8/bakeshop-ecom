import { Store, Home, Layers } from "lucide-react";

export type Tempat = "" | "home" | "store";

/**
 * Pemilih tempat untuk panel admin ecom.
 *
 * Satu panel, dua toko — pola yang sama dengan pemilih Toko Bekasi · Online
 * Rumah di POS, supaya Bu Santi cuma perlu memahami satu cara berpikir:
 * "saya sedang melihat tempat yang mana?".
 *
 * WAJIB selalu tampil, juga saat pilihannya Gabungan. Penyaring yang tidak
 * kelihatan membuat orang mengira angkanya sudah mencakup semuanya — dan
 * itulah cara angka yang salah bertahan lama tanpa ketahuan.
 */
export function PilihTempat({
  value,
  onChange,
  namaRumah = "Online Rumah",
  namaToko = "Toko Bekasi",
  className = "",
}: {
  value: Tempat;
  onChange: (v: Tempat) => void;
  namaRumah?: string;
  namaToko?: string;
  className?: string;
}) {
  const opsi: { v: Tempat; label: string; Icon: typeof Store }[] = [
    { v: "", label: "Gabungan", Icon: Layers },
    { v: "home", label: namaRumah, Icon: Home },
    { v: "store", label: namaToko, Icon: Store },
  ];
  return (
    <div
      role="group"
      aria-label="Pilih tempat"
      className={`inline-flex gap-1 p-1 rounded-xl bg-cherry-50 border border-cherry-100 ${className}`}
    >
      {opsi.map((o) => {
        const aktif = value === o.v;
        return (
          <button
            key={o.v || "all"}
            type="button"
            onClick={() => onChange(o.v)}
            aria-pressed={aktif}
            className={`inline-flex items-center gap-1.5 px-3 min-h-9 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
              aktif ? "bg-white text-ink-900 shadow-sm" : "text-ink-500 hover:text-ink-700"
            }`}
          >
            <o.Icon size={13} aria-hidden="true" />
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
