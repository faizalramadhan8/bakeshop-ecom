// Warna merek storefront — dipilih Bu Santi di Pengaturan.
//
// Paletnya didefinisikan di index.css sebagai penimpa variabel CSS pada
// `:root[data-brand="…"]`. Modul ini cuma memasang atributnya; semua
// pekerjaan warna dilakukan CSS, jadi tidak ada komponen yang perlu tahu
// warna apa yang sedang aktif.

export const PALET = [
  { v: "", label: "Merah Muda", contoh: "#E11D48" },
  { v: "biru", label: "Biru", contoh: "#2563EB" },
  { v: "hijau", label: "Hijau", contoh: "#16A34A" },
  { v: "ungu", label: "Ungu", contoh: "#9333EA" },
  { v: "jingga", label: "Jingga", contoh: "#EA580C" },
] as const;

const KUNCI = "tobaku-brand";
const SAH = new Set(PALET.map((p) => p.v));

/**
 * Pasang paletnya. Nilai yang tidak dikenal dibuang ke bawaan — kalau tidak,
 * `data-brand` berisi nama asing membuat SELURUH variabel warna jatuh ke
 * nilai @theme, yang kebetulan benar, tapi menyembunyikan salah ketiknya.
 */
export function pasangBrand(nama: string | null | undefined) {
  const v = (nama || "").trim();
  const dipakai = SAH.has(v as never) ? v : "";
  const root = document.documentElement;
  if (dipakai) root.setAttribute("data-brand", dipakai);
  else root.removeAttribute("data-brand");

  // Diingat supaya kunjungan berikutnya memasangnya SEBELUM pengaturan
  // selesai diambil. Tanpa ini halaman berkedip merah muda sekejap tiap kali
  // dibuka — dan kedipan warna merek justru yang paling kentara.
  try {
    if (dipakai) localStorage.setItem(KUNCI, dipakai);
    else localStorage.removeItem(KUNCI);
  } catch {
    // localStorage ditolak (mode privat / disetel blokir) — tidak apa-apa,
    // warnanya tetap benar begitu pengaturan tiba.
  }
}

/**
 * Pasang dari ingatan. Dipanggil sekali sebelum React menggambar.
 *
 * Kunjungan pertama memang belum punya ingatan, jadi tetap merah muda
 * sekejap. Itu harga yang dibayar sekali per pengunjung baru, dan menebak
 * warnanya lebih buruk daripada sekejap bawaan.
 */
export function pasangBrandDariIngatan() {
  try {
    pasangBrand(localStorage.getItem(KUNCI));
  } catch {
    /* abaikan */
  }
}
