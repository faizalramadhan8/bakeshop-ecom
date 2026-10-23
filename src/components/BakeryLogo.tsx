import { usePublicSettings } from "@/lib/publicSettings";

// Logo storefront.
//
// Sejak 23 Okt 2026 logonya datang dari Pengaturan, bukan digambar di kode.
// Bu Santi punya logo untuk toko rumah (Tobaku) dan minta bisa menggantinya
// sendiri — tiap pergantian dulu menuntut ubah kode + deploy.
//
// Logo bawaan di bawah tetap ada sebagai cadangan: dipakai sebelum
// pengaturan termuat, kalau backend tidak terjangkau, atau kalau logonya
// memang belum diunggah. Tanpa cadangan, header berkedip kosong tiap kali
// halaman dibuka.
export function BakeryLogo({ size = 40, className = "" }: { size?: number; className?: string }) {
  const settings = usePublicSettings();
  const logo = settings.store_logo?.trim();
  const nama = settings.store_name?.trim() || "Toko Bahan Kue";

  if (logo) {
    return (
      <img
        src={logo}
        alt={nama}
        // Lebar DAN tinggi dipatok sama supaya tidak ada pergeseran tata
        // letak saat gambarnya selesai dimuat — logo Bu Santi berbentuk
        // bundar, tapi yang diunggah berikutnya belum tentu.
        width={size}
        height={size}
        className={`shrink-0 object-contain ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return <LogoBawaan size={size} className={className} />;
}

// Logo bawaan — persegi panjang merah bata, "Toko Bahan Kue" + "SANTI".
// Dipertahankan apa adanya: toko Bekasi masih memakainya, dan ini yang
// tampil selama logo toko rumah belum diunggah.
function LogoBawaan({ size, className }: { size: number; className: string }) {
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
