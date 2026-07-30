// Static pages — T&C, Privacy, FAQ, About. Sprint 3 #11 (30 Jul 2026).
// Bu Santi bisa update copy di sini nanti kalau ada perubahan legal/kebijakan.
// Untuk sekarang: template starter dengan format prose siap-print.

import { Link } from "react-router-dom";
import { ArrowLeft, ShoppingBag, CreditCard, Truck, RefreshCw, MessageCircle, Sparkles } from "lucide-react";
import { useSEO } from "@/lib/seo";

// ─── About ────────────────────────────────────────────────────────────
export function TentangKami() {
  useSEO({ title: "Tentang Kami", description: "Kenalan dengan Toko Bahan Kue Santi — pusat bahan kue kekinian di Bekasi." });
  return (
    <PageShell title="Tentang Kami">
      <div className="max-w-3xl mx-auto">
        <div className="bg-gradient-to-br from-cherry-100 to-cherry-50 rounded-3xl p-6 sm:p-8 mb-6">
          <p className="text-xs font-bold uppercase tracking-widest text-cherry-600 mb-1">
            Est. 2020
          </p>
          <h1 className="text-2xl sm:text-3xl font-black text-ink-900 leading-tight tracking-tight mb-3">
            Toko Bahan Kue Santi
          </h1>
          <p className="text-sm text-ink-700 leading-relaxed">
            Toko bahan kue rumahan yang berkembang jadi pusat belanja bahan kue terlengkap di Bekasi. Kami sedia tepung, cokelat, whipping cream, topping, sampai peralatan dekorasi — semua yang kamu butuhkan untuk bikin kue kekinian di rumah.
          </p>
        </div>

        <h2 className="text-lg font-black text-ink-900 mb-2">Kenapa belanja di kami?</h2>
        <ul className="space-y-3 mb-6">
          {[
            { icon: ShoppingBag, title: "Produk terkurasi", desc: "Kami pilih bahan yang benar-benar dipakai baker rumahan sampai pelaku UMKM." },
            { icon: Sparkles,    title: "Selalu fresh",     desc: "Stok cepat rotasi, terutama untuk bahan sensitif seperti keju dan cokelat." },
            { icon: Truck,       title: "Kirim ke seluruh Indonesia", desc: "Kerjasama dengan JNE, SiCepat, J&T, Anteraja, dan Ninja." },
            { icon: MessageCircle, title: "Support ramah",   desc: "Bu Santi dan tim siap bantu via WhatsApp kalau kamu bingung pilih bahan." },
          ].map((f) => (
            <li key={f.title} className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-cherry-100 text-cherry-500 flex items-center justify-center shrink-0">
                <f.icon size={18} aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-black text-ink-900 mb-0.5">{f.title}</p>
                <p className="text-sm text-ink-500 leading-relaxed">{f.desc}</p>
              </div>
            </li>
          ))}
        </ul>

        <h2 className="text-lg font-black text-ink-900 mb-2">Alamat Toko</h2>
        <p className="text-sm text-ink-700 leading-relaxed mb-6">
          Ruko Puri Gading II Blok PG II No. 29<br />
          Jl. Raya Puri Gading, Jatimelati, Pd. Melati<br />
          Kota Bekasi, Jawa Barat 17415
        </p>
      </div>
    </PageShell>
  );
}

// ─── FAQ ──────────────────────────────────────────────────────────────
export function FAQ() {
  useSEO({ title: "FAQ", description: "Tanya jawab tentang belanja di TBK Santi — pembayaran, pengiriman, retur, dan lain-lain." });
  const items = [
    {
      q: "Berapa lama pesanan diproses?",
      a: "Order yang masuk sebelum jam 15.00 WIB akan diproses hari itu juga. Setelah jam 15.00, pesanan diproses di hari kerja berikutnya.",
    },
    {
      q: "Metode pembayaran apa saja yang tersedia?",
      a: "Kami terima Virtual Account 6 bank (BCA, BRI, BNI, Mandiri, CIMB, Permata), QRIS (bisa scan dari DANA, GoPay, ShopeePay, BCA, dsb), e-wallet (OVO, ShopeePay, DANA), dan kartu kredit — semua via payment gateway resmi.",
    },
    {
      q: "Kalau barang rusak atau salah kirim gimana?",
      a: "Kamu bisa ajukan komplain dari halaman pesananmu (setelah status Sampai / Selesai). Klik 'Ada masalah dengan pesanan?', pilih jenis masalah, ceritakan detailnya. Admin akan balas dalam 1×24 jam.",
    },
    {
      q: "Kurirnya siapa saja?",
      a: "Kami kerjasama dengan JNE, SiCepat, J&T Express, Anteraja, Ninja Express, dan Pos Indonesia. Pilihan kurir tergantung alamat tujuan dan tarif termurah.",
    },
    {
      q: "Bisa order via WhatsApp?",
      a: "Bisa. Klik tombol WhatsApp yang muncul di kanan bawah — kami akan bantu proses pesananmu manual. Tapi lebih cepat kalau order via website, sudah include cek ongkir + link pembayaran otomatis.",
    },
    {
      q: "Kalau lupa password gimana?",
      a: "Klik 'Lupa Password' di halaman login. Kami kirim kode OTP ke emailmu. Kode berlaku 10 menit.",
    },
    {
      q: "Apakah bisa datang langsung ke toko?",
      a: "Tentu bisa. Alamat lengkap di halaman 'Tentang Kami'. Buka Senin-Sabtu jam 08.00-17.00 WIB.",
    },
  ];
  return (
    <PageShell title="FAQ">
      <div className="max-w-3xl mx-auto">
        <p className="text-sm text-ink-500 mb-5">
          Tanya jawab yang paling sering ditanya customer. Kalau belum ada di sini, silakan chat kami via WhatsApp.
        </p>
        <div className="flex flex-col gap-3">
          {items.map((it) => (
            <details key={it.q} className="bg-white border border-cherry-200 rounded-2xl p-4 open:border-cherry-400 group">
              <summary className="cursor-pointer text-sm font-black text-ink-900 flex items-center justify-between gap-2 list-none">
                <span>{it.q}</span>
                <span className="text-cherry-500 text-lg leading-none transform group-open:rotate-45 transition-transform">+</span>
              </summary>
              <p className="text-sm text-ink-700 leading-relaxed mt-3">{it.a}</p>
            </details>
          ))}
        </div>
      </div>
    </PageShell>
  );
}

// ─── Terms & Conditions ───────────────────────────────────────────────
export function SyaratKetentuan() {
  useSEO({ title: "Syarat & Ketentuan", description: "Syarat & ketentuan penggunaan Toko Bahan Kue Santi." });
  return (
    <PageShell title="Syarat & Ketentuan">
      <div className="max-w-3xl mx-auto prose-content">
        <p className="text-xs text-ink-500 mb-4">Terakhir diperbarui: 30 Juli 2026</p>

        <Sec title="1. Definisi">
          <p>“Kami” / “TBK Santi” merujuk pada Toko Bahan Kue Santi. “Kamu” / “customer” merujuk pada pengguna yang membuka atau bertransaksi di website ini.</p>
        </Sec>

        <Sec title="2. Akun Customer">
          <p>Kamu wajib memberikan informasi yang akurat saat mendaftar (nama, email, nomor HP). Kamu bertanggung jawab menjaga kerahasiaan password. Kalau ada aktivitas mencurigakan di akunmu, segera hubungi kami.</p>
        </Sec>

        <Sec title="3. Pemesanan & Pembayaran">
          <p>Pesanan yang belum dibayar dalam 24 jam akan otomatis dibatalkan dan stok akan dikembalikan. Kami hanya memproses pesanan yang statusnya <b>Sudah Dibayar</b>. Metode pembayaran tersedia via payment gateway (VA, QRIS, e-wallet, kartu kredit).</p>
        </Sec>

        <Sec title="4. Pengiriman">
          <p>Estimasi waktu pengiriman mengikuti jadwal kurir. Kami bekerjasama dengan JNE, SiCepat, J&T, Anteraja, Ninja, dan Pos Indonesia. Keterlambatan yang disebabkan kurir di luar kendali kami. Kamu bisa melacak paket via halaman pesanan.</p>
        </Sec>

        <Sec title="5. Pembatalan & Pengembalian">
          <p>Pesanan yang masih <b>Menunggu Pembayaran</b> bisa kamu batalkan sendiri langsung di halaman pesanan. Pesanan yang sudah dibayar hanya bisa dibatalkan/refund kalau ada kendala serius (barang tidak tersedia, salah kirim). Ajukan lewat fitur Komplain di halaman pesananmu.</p>
        </Sec>

        <Sec title="6. Ulasan Produk">
          <p>Ulasan yang kamu tulis harus jujur dan tidak mengandung ujaran kebencian, SARA, spam, atau konten dewasa. Kami berhak menyembunyikan ulasan yang melanggar aturan ini.</p>
        </Sec>

        <Sec title="7. Perubahan Ketentuan">
          <p>Kami dapat mengubah syarat & ketentuan sewaktu-waktu. Perubahan akan diumumkan di halaman ini dan berlaku sejak tanggal update di atas.</p>
        </Sec>

        <Sec title="8. Kontak">
          <p>Hubungi kami via WhatsApp untuk pertanyaan lebih lanjut, atau kunjungi toko fisik di alamat yang tercantum di halaman <Link to="/tentang" className="text-cherry-500 font-bold hover:underline">Tentang Kami</Link>.</p>
        </Sec>
      </div>
    </PageShell>
  );
}

// ─── Privacy Policy ───────────────────────────────────────────────────
export function KebijakanPrivasi() {
  useSEO({ title: "Kebijakan Privasi", description: "Kebijakan privasi & pengelolaan data customer TBK Santi." });
  return (
    <PageShell title="Kebijakan Privasi">
      <div className="max-w-3xl mx-auto prose-content">
        <p className="text-xs text-ink-500 mb-4">Terakhir diperbarui: 30 Juli 2026</p>

        <Sec title="1. Data yang Kami Kumpulkan">
          <p>Kami mengumpulkan data yang kamu berikan saat daftar akun (nama, email, HP), alamat pengiriman, dan riwayat transaksi. Kami juga mencatat perangkat + browser yang kamu pakai untuk keperluan keamanan.</p>
        </Sec>

        <Sec title="2. Cara Kami Menggunakan Data">
          <ul>
            <li>Memproses pesanan dan pengiriman.</li>
            <li>Memberi tahu kamu tentang status pesanan (email + push notification).</li>
            <li>Analisis performa website supaya pengalaman belanja makin baik.</li>
            <li>Marketing (kalau kamu setuju): informasi promo, produk baru.</li>
          </ul>
        </Sec>

        <Sec title="3. Data yang Kami Bagikan">
          <p>Kami hanya membagikan data ke pihak ketiga yang perlu untuk memproses pesananmu — payment gateway (DOKU) untuk transaksi, ekspedisi (Biteship) untuk pengiriman. Kami tidak menjual data customer ke pihak lain.</p>
        </Sec>

        <Sec title="4. Cookies & Analytics">
          <p>Website kami menggunakan cookies untuk menyimpan sesi login dan preferensi. Kami juga pakai Google Analytics untuk memahami perilaku customer secara agregat (tidak identifiable per-individu).</p>
        </Sec>

        <Sec title="5. Keamanan Data">
          <p>Password disimpan dalam bentuk hash (bcrypt), tidak plain text. Transaksi diproses via HTTPS + payment gateway resmi. Kami tidak menyimpan detail kartu kreditmu.</p>
        </Sec>

        <Sec title="6. Hak Kamu">
          <p>Kamu bisa update profil dan alamat kapan saja lewat halaman Akun. Untuk request hapus akun permanen, hubungi kami via WhatsApp — kami akan proses dalam 7 hari kerja.</p>
        </Sec>

        <Sec title="7. Kontak">
          <p>Pertanyaan tentang privasi? Chat kami di WhatsApp yang tersedia di kanan bawah setiap halaman.</p>
        </Sec>
      </div>
    </PageShell>
  );
}

// ─── Shared helpers ───────────────────────────────────────────────────
function PageShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-cherry-50/30">
      <div className="max-w-5xl mx-auto px-4 py-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-ink-700 hover:text-cherry-600 mb-4"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Kembali ke Beranda
        </Link>
        <h1 className="text-2xl font-black text-ink-900 mb-6">{title}</h1>
        {children}
      </div>
    </div>
  );
}

function Sec({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-5">
      <h2 className="text-base font-black text-ink-900 mb-2">{title}</h2>
      <div className="text-sm text-ink-700 leading-relaxed space-y-2">{children}</div>
    </section>
  );
}
