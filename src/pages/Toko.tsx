import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, MapPin, Package, Phone, Store } from "lucide-react";
import { publicApi, type EcomProductListItem } from "@/lib/api";
import { useStoreSettings } from "@/lib/publicSettings";
import { ProductCard } from "@/components/ProductCard";
import { SkeletonCard } from "@/components/Skeleton";
import { useSEO } from "@/lib/seo";

/**
 * Halaman satu toko — identitasnya plus semua barang yang dia jual.
 *
 * Storefront melayani dua toko sejak 30 Okt 2026. Beranda menampilkan
 * barang keduanya; halaman ini untuk customer yang ingin belanja dari satu
 * toko saja — yang juga berarti satu paket dan satu ongkir.
 *
 * Sengaja TIDAK bergaya profil penjual marketplace (rating, tombol ikuti,
 * jumlah pengikut): dua toko ini milik orang yang sama, jadi menilai salah
 * satunya terhadap yang lain tidak berarti apa-apa.
 */
export function Toko() {
  const { location: rawLoc } = useParams<{ location: string }>();
  const location = rawLoc === "store" ? "store" : "home";
  const toko = useStoreSettings(location);

  const [items, setItems] = useState<EcomProductListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState("");
  const [loadingMore, setLoadingMore] = useState(false);

  const namaToko = toko?.store_name || (location === "store" ? "Toko Bekasi" : "Toko Rumah");

  useSEO({
    title: `${namaToko} — semua produk`,
    description: `Belanja produk dari ${namaToko}. Dikirim langsung dari tokonya.`,
  });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setItems([]);
    setCursor("");
    publicApi
      .listProducts({ location, limit: 24 })
      .then((r) => {
        if (cancelled) return;
        setItems(r.items ?? []);
        setCursor(r.next_cursor || "");
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [location]);

  const muatLagi = () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    publicApi
      .listProducts({ location, limit: 24, cursor })
      .then((r) => {
        setItems((prev) => [...prev, ...(r.items ?? [])]);
        setCursor(r.next_cursor || "");
      })
      .catch(() => {
        /* diam — tombol tetap ada untuk dicoba lagi */
      })
      .finally(() => setLoadingMore(false));
  };

  const alamat = useMemo(() => (toko?.store_pickup_address || "").trim(), [toko]);
  const telepon = useMemo(() => (toko?.store_pickup_phone || "").trim(), [toko]);

  return (
    <div className="max-w-5xl mx-auto p-4 pb-24">
      <div className="flex items-center gap-2 mb-4">
        <Link
          to="/"
          aria-label="Kembali"
          className="w-9 h-9 rounded-xl flex items-center justify-center text-ink-700 hover:bg-cherry-50"
        >
          <ArrowLeft size={16} aria-hidden="true" />
        </Link>
        <h1 className="text-xl font-black text-ink-900 truncate">{namaToko}</h1>
      </div>

      {/* Kartu identitas toko */}
      <section className="bg-white border border-cherry-200 rounded-2xl p-4 mb-4">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-xl bg-cherry-50 border border-cherry-100 flex items-center justify-center shrink-0">
            <Store size={22} className="text-cherry-500" strokeWidth={1.5} aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-base font-black text-ink-900 truncate">{namaToko}</p>
            {/* Alamat jemput = titik awal pengiriman. Ini yang menentukan
                ongkir, jadi di halaman toko dia informasi, bukan hiasan. */}
            {alamat ? (
              <p className="text-sm text-ink-700 mt-1 flex items-start gap-1.5">
                <MapPin size={14} className="text-cherry-500 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{alamat}</span>
              </p>
            ) : (
              <p className="text-sm text-ink-500 mt-1">Alamat toko belum dicantumkan.</p>
            )}
            {telepon && (
              <p className="text-sm text-ink-700 mt-1 flex items-center gap-1.5">
                <Phone size={14} className="text-cherry-500 shrink-0" aria-hidden="true" />
                <span>{telepon}</span>
              </p>
            )}
          </div>
        </div>
      </section>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16">
          <Package size={32} className="mx-auto text-ink-300 mb-3" strokeWidth={1.5} aria-hidden="true" />
          <p className="text-sm font-bold text-ink-700">Belum ada produk di toko ini</p>
          <p className="text-sm text-ink-500 mt-1">Coba lihat toko satunya di beranda.</p>
          <Link
            to="/"
            className="inline-block mt-4 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-cherry-400 to-cherry-500"
          >
            Ke Beranda
          </Link>
        </div>
      ) : (
        <>
          <p className="text-sm text-ink-500 mb-3">{items.length} produk</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {items.map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>
          {cursor && (
            <div className="text-center mt-6">
              <button
                onClick={muatLagi}
                disabled={loadingMore}
                className="px-5 py-3 rounded-xl text-sm font-bold border border-cherry-200 text-ink-700 disabled:opacity-40"
              >
                {loadingMore ? "Memuat…" : "Muat lebih banyak"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
