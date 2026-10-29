import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Save, AlertCircle, Info, Upload, Camera, Image as ImageIcon, X, Loader2, Bell } from "lucide-react";
import toast from "react-hot-toast";
import { adminApi, decodeToken, type EcomAdminProduct, type EcomCategoryAdmin, type EcomPriceTier } from "@/lib/api";
import { AdminShell } from "@/components/AdminShell";

const ECOM_ADMIN_ROLES = ["ecom_admin", "ecom_superadmin", "superadmin"];

function formatRp(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return "Rp " + n.toLocaleString("id-ID");
}

export function AdminProdukEdit() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<EcomAdminProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [available, setAvailable] = useState(false);
  const [ecomPrice, setEcomPrice] = useState("");
  const [ecomMemberPrice, setEcomMemberPrice] = useState("");
  const [weight, setWeight] = useState("");
  const [minOrder, setMinOrder] = useState("1");
  const [desc, setDesc] = useState("");
  const [ecomImage, setEcomImage] = useState<string | null>(null);
  const [ecomCategoryId, setEcomCategoryId] = useState<string>("");
  const [categories, setCategories] = useState<EcomCategoryAdmin[]>([]);
  const [ecomImages, setEcomImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Dipakai setelah stok disesuaikan — angkanya harus datang dari server,
  // bukan dihitung di sisi depan. Kalau dihitung sendiri, layar bisa
  // menampilkan angka yang berbeda dari yang benar-benar tersimpan.
  const muatUlang = () => {
    if (!id) return;
    adminApi.getProduct(id).then(setProduct).catch(() => {});
  };

  useEffect(() => {
    const claims = decodeToken();
    if (!claims || !ECOM_ADMIN_ROLES.includes(claims.role || "")) {
      window.location.href = "/";
      return;
    }
    if (!id) return;
    // Fetch category list paralel (best-effort — kalau fail, dropdown empty).
    adminApi.listCategories().then((c) => setCategories(c || [])).catch(() => {});
    let cancelled = false;
    setLoading(true);
    adminApi
      .getProduct(id)
      .then((p) => {
        if (cancelled) return;
        setProduct(p);
        setAvailable(p.ecom_is_available);
        setEcomPrice(p.ecom_price !== null ? String(p.ecom_price) : "");
        setEcomMemberPrice(p.ecom_member_price !== null ? String(p.ecom_member_price) : "");
        setWeight(p.ecom_weight_grams !== null ? String(p.ecom_weight_grams) : "");
        setMinOrder(String(p.ecom_min_order));
        setDesc(p.ecom_description ?? "");
        setEcomImage(p.ecom_image ?? null);
        setEcomImages(p.ecom_images ?? []);
        setEcomCategoryId(p.ecom_category_id ?? "");
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Gagal load");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const save = async () => {
    if (!product) return;
    setSaving(true);
    try {
      const parseNumber = (s: string) => (s.trim() === "" ? null : Number(s));
      const updated = await adminApi.updateEcomFields(product.id, {
        ecom_is_available: available,
        ecom_price: parseNumber(ecomPrice),
        ecom_member_price: parseNumber(ecomMemberPrice),
        ecom_weight_grams: parseNumber(weight),
        ecom_min_order: Number(minOrder) || 1,
        ecom_description: desc.trim() || null,
        ecom_image: ecomImage,
        ecom_images: ecomImages,
        ecom_category_id: ecomCategoryId || null,
      });
      setProduct(updated);
      toast.success("Perubahan disimpan");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal simpan");
    } finally {
      setSaving(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset input value supaya re-select file yang sama trigger onChange lagi.
    e.target.value = "";
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ukuran gambar maksimal 5 MB");
      return;
    }
    setUploading(true);
    try {
      const res = await adminApi.uploadImage(file);
      setEcomImage(res.url);
      toast.success("Gambar berhasil diupload. Jangan lupa Simpan Perubahan.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal upload");
    } finally {
      setUploading(false);
    }
  };

  // Gallery upload — support MULTIPLE files sekaligus (mobile Safari allow
  // multiple pick, desktop pasti). Cap 5 gambar total per produk (1 utama +
  // 4 tambahan) supaya customer tidak overwhelmed + payload manageable.
  const MAX_GALLERY = 4;
  const handleGalleryChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (files.length === 0) return;
    const remaining = MAX_GALLERY - ecomImages.length;
    if (remaining <= 0) {
      toast.error(`Maksimal ${MAX_GALLERY} gambar tambahan`);
      return;
    }
    const toUpload = files.slice(0, remaining);
    if (files.length > remaining) {
      toast(`Cuma ${remaining} slot tersisa. ${files.length - remaining} file di-skip.`);
    }
    setUploadingGallery(true);
    try {
      const uploaded: string[] = [];
      for (const f of toUpload) {
        if (f.size > 5 * 1024 * 1024) {
          toast.error(`${f.name}: max 5 MB, di-skip`);
          continue;
        }
        const res = await adminApi.uploadImage(f);
        uploaded.push(res.url);
      }
      if (uploaded.length > 0) {
        setEcomImages((prev) => [...prev, ...uploaded]);
        toast.success(`${uploaded.length} gambar ditambah. Simpan untuk apply.`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal upload gallery");
    } finally {
      setUploadingGallery(false);
    }
  };

  const removeGalleryImage = (url: string) => {
    setEcomImages((prev) => prev.filter((u) => u !== url));
  };

  if (loading) {
    return (
      <AdminShell title="Memuat produk…" parents={[{ label: "Produk", to: "/admin/produk" }]}>
        <div className="text-center text-ink-500 text-sm py-16">
          <Loader2 size={20} className="animate-spin mx-auto mb-2" />
          Memuat produk…
        </div>
      </AdminShell>
    );
  }
  if (error || !product) {
    return (
      <AdminShell title="Produk tidak ditemukan" parents={[{ label: "Produk", to: "/admin/produk" }]}>
        <div className="text-center py-16">
          <AlertCircle size={40} className="mx-auto text-cherry-600 mb-3" aria-hidden="true" />
          <p className="text-sm font-semibold text-cherry-600">
            {error || "Produk tidak ditemukan"}
          </p>
        </div>
      </AdminShell>
    );
  }
  // Link import removed above; re-import for other in-body usages.

  const warnings: string[] = [];
  if (available && product.stock_ecom === 0)
    warnings.push("Stok habis — produk tidak akan tampil di storefront");
  if (available && !weight.trim())
    warnings.push("Berat belum di-set — tidak bisa hitung ongkir");

  return (
    <AdminShell
      title={product.name}
      subtitle={`SKU: ${product.sku}`}
      parents={[{ label: "Produk", to: "/admin/produk" }]}
    >
      <div className="max-w-2xl">
        {warnings.length > 0 && (
          <div className="bg-amber-50 border border-amber-500/30 rounded-2xl p-4 mb-6">
            <p className="text-xs font-black uppercase tracking-wider text-amber-600 mb-2">
              Perlu diperhatikan
            </p>
            <ul className="text-xs text-ink-700 space-y-1 list-disc list-inside">
              {warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-col gap-4">
          <section className="bg-white rounded-2xl border border-cherry-200 p-5">
            <h2 className="text-sm font-black text-ink-900 mb-3">Publish di storefront</h2>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={available}
                onChange={(e) => setAvailable(e.target.checked)}
                className="w-5 h-5 rounded accent-cherry-500"
              />
              <span className="text-sm text-ink-900">
                Tampilkan produk ini di toko online
              </span>
            </label>
            <p className="text-xs text-ink-500 mt-2 flex items-start gap-1.5">
              <Info size={12} className="mt-0.5 shrink-0" />
              Produk baru tampil di storefront kalau: publish ON + stok online &gt; 0 + berat sudah di-set
            </p>
          </section>

          <section className="bg-white rounded-2xl border border-cherry-200 p-5">
            <h2 className="text-sm font-black text-ink-900 mb-3">Kategori Storefront</h2>
            {categories.length === 0 ? (
              <div className="text-xs text-ink-500">
                Belum ada kategori ecom.{" "}
                <Link to="/admin/kategori" className="text-cherry-500 font-bold underline">
                  Tambah kategori dulu →
                </Link>
              </div>
            ) : (
              <>
                <select
                  value={ecomCategoryId}
                  onChange={(e) => setEcomCategoryId(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-cherry-200 text-sm focus:outline-none focus:ring-2 focus:ring-cherry-500/30 focus:border-cherry-400 bg-white"
                >
                  <option value="">— Tanpa kategori ecom —</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name_id || c.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-ink-500 mt-2">
                  Terpisah dari kategori POS. Kelola daftar di{" "}
                  <Link to="/admin/kategori" className="text-cherry-500 font-bold underline">
                    Kategori Ecommerce
                  </Link>
                  .
                </p>
              </>
            )}
          </section>

          <section className="bg-white rounded-2xl border border-cherry-200 p-5">
            <h2 className="text-sm font-black text-ink-900 mb-3">Foto Produk Online</h2>
            <p className="text-xs text-ink-500 mb-3">
              Foto khusus storefront. Kalau kosong, pakai foto default dari POS.
            </p>

            {ecomImage ? (
              <div className="relative w-full aspect-square max-w-xs rounded-2xl overflow-hidden bg-cherry-50 border border-cherry-200 mb-3">
                <img
                  src={ecomImage}
                  alt="Foto produk ecom"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => setEcomImage(null)}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
                  aria-label="Hapus foto"
                >
                  <X size={14} />
                </button>
              </div>
            ) : product.image ? (
              <div className="relative w-full aspect-square max-w-xs rounded-2xl overflow-hidden bg-cherry-50 border border-cherry-200 mb-3">
                <img src={product.image} alt="Foto POS" className="w-full h-full object-cover" />
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs py-1 px-2 text-center">
                  Foto dari POS (fallback)
                </div>
              </div>
            ) : (
              <div className="w-full aspect-square max-w-xs rounded-2xl bg-cherry-50 border-2 border-dashed border-cherry-200 flex flex-col items-center justify-center text-ink-500 mb-3">
                <ImageIcon size={32} className="opacity-40" />
                <p className="text-xs mt-2">Belum ada foto</p>
              </div>
            )}

            {/* Hidden file inputs — trigger via visible buttons below */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
            />

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                disabled={uploading}
                className="flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-cherry-300 text-cherry-500 text-sm font-bold hover:bg-cherry-50 disabled:opacity-60"
              >
                {uploading ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
                Foto Langsung
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-cherry-300 text-cherry-500 text-sm font-bold hover:bg-cherry-50 disabled:opacity-60"
              >
                {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                Pilih dari Galeri
              </button>
            </div>
            <p className="text-xs text-ink-500 mt-2">Max 5 MB. Format: JPG, PNG, WebP.</p>
          </section>

          <section className="bg-white rounded-2xl border border-cherry-200 p-5">
            <h2 className="text-sm font-black text-ink-900 mb-3">Foto Tambahan (Gallery)</h2>
            <p className="text-xs text-ink-500 mb-3">
              Sampai {MAX_GALLERY} foto tambahan (angle lain / detail / kemasan / hasil masakan).
              Customer bisa swipe di halaman produk.
            </p>

            {/* Grid preview 2/3/4 kolom responsive */}
            {ecomImages.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
                {ecomImages.map((url, i) => (
                  <div key={url} className="relative aspect-square rounded-xl overflow-hidden border border-cherry-200 bg-cherry-50">
                    <img src={url} alt={`Foto tambahan ${i + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeGalleryImage(url)}
                      aria-label={`Hapus foto ${i + 1}`}
                      className="absolute top-1 right-1 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
                    >
                      <X size={12} aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Hidden input support multiple */}
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleGalleryChange}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => galleryInputRef.current?.click()}
              disabled={uploadingGallery || ecomImages.length >= MAX_GALLERY}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-cherry-300 text-cherry-500 text-sm font-bold hover:bg-cherry-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {uploadingGallery ? (
                <>
                  <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                  Mengupload…
                </>
              ) : (
                <>
                  <Upload size={14} aria-hidden="true" />
                  {ecomImages.length >= MAX_GALLERY
                    ? `Slot penuh (${MAX_GALLERY} / ${MAX_GALLERY})`
                    : `Tambah Foto (${ecomImages.length} / ${MAX_GALLERY})`}
                </>
              )}
            </button>
          </section>

          {/* Angka ini adalah stok RUMAH (`products.stock_home`), bukan rak
              Bekasi — dua tumpukan fisik yang terpisah sejak migrasi 000075.
              Read-only di sini; satu-satunya jalur ubah stok adalah menu
              Sesuaikan Stok di POS, yang mewajibkan alasan dan menulis audit
              trail. BE juga menolak patch stok dari endpoint ini.

              Penyebutannya sengaja eksplisit. Label lama berbunyi "stok toko
              dan online satu angka" — kalimat yang benar saat itu, tapi
              justru kalimat semacam inilah yang dulu bikin arti kolom stok
              tertukar dan 105 produk menggelembung 914 unit (1 Okt 2026). */}
          <section className="bg-white rounded-2xl border border-cherry-200 p-5">
            <h2 className="text-sm font-black text-ink-900 mb-3">Stok di Rumah</h2>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-ink-900 tabular-nums">
                {product.stock_ecom}
              </span>
              <span className="text-sm text-ink-500">tersedia</span>
            </div>
            <p className="text-xs text-ink-500 mt-2 leading-relaxed">
              Rak toko rumah, terpisah dari toko Bekasi. Hanya penjualan online yang
              mengurangi angka ini.
            </p>

            {/* Penyesuaian stok sengaja DIPISAH dari tombol Simpan di atas.
                Form yang bisa menimpa stok bersamaan dengan harga adalah
                persis mekanisme yang bikin insiden Sunbay 26 Jul 2026: nilai
                stok di form sudah basi, lalu Save menimpa potongan penjualan
                yang baru terjadi. Di sini stok diset absolut, wajib alasan,
                dan selalu menulis jejak ke Pergerakan Stok. */}
            <SesuaikanStok
              productId={product.id}
              stokSekarang={product.stock_ecom}
              onSelesai={muatUlang}
            />


            {/* Sprint 3 #16 — Dispatch restock alert kalau produk sudah
                restock. Muncul cuma kalau stok saat ini > 0. Idempotent
                di BE (subscriber yang sudah notified skip auto). */}
            {product.stock_ecom > 0 && (
              <div className="mt-4 pt-4 border-t border-cherry-100">
                <RestockDispatchButton productID={product.id} productName={product.name_id} />
              </div>
            )}
          </section>

          {/* Harga grosir — inti model bisnis toko rumah ("menyasar
              pembelian jumlah kartonan"). Sebelum 23 Okt 2026 layar ini cuma
              ada di POS, dan POS menyaring produk rumah keluar, jadi produk
              rumah tidak bisa diberi harga kartonan sama sekali. */}
          <section className="bg-white rounded-2xl border border-cherry-200 p-5">
            <HargaGrosir
              productId={product.id}
              hargaNormal={product.ecom_price ?? product.selling_price}
            />
          </section>

          <section className="bg-white rounded-2xl border border-cherry-200 p-5">
            <h2 className="text-sm font-black text-ink-900 mb-3">Harga Online</h2>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-ink-700 uppercase tracking-wider">
                  Harga jual online
                </label>
                <input
                  type="number"
                  value={ecomPrice}
                  onChange={(e) => setEcomPrice(e.target.value)}
                  placeholder={`Kosongkan = pakai harga toko ${formatRp(product.selling_price)}`}
                  className="px-4 py-3 rounded-xl border border-cherry-200 text-sm focus:outline-none focus:ring-2 focus:ring-cherry-500/30 focus:border-cherry-400"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-ink-700 uppercase tracking-wider">
                  Harga member online
                </label>
                <input
                  type="number"
                  value={ecomMemberPrice}
                  onChange={(e) => setEcomMemberPrice(e.target.value)}
                  placeholder="Kosongkan = tidak ada harga member"
                  className="px-4 py-3 rounded-xl border border-cherry-200 text-sm focus:outline-none focus:ring-2 focus:ring-cherry-500/30 focus:border-cherry-400"
                />
              </div>
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-cherry-200 p-5">
            <h2 className="text-sm font-black text-ink-900 mb-3">Info Pengiriman</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-ink-700 uppercase tracking-wider">
                  Berat (gram)
                </label>
                <input
                  type="number"
                  min="0"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="mis. 1000"
                  className="px-4 py-3 rounded-xl border border-cherry-200 text-sm focus:outline-none focus:ring-2 focus:ring-cherry-500/30 focus:border-cherry-400"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-ink-700 uppercase tracking-wider">
                  Min. order
                </label>
                <input
                  type="number"
                  min="1"
                  value={minOrder}
                  onChange={(e) => setMinOrder(e.target.value)}
                  className="px-4 py-3 rounded-xl border border-cherry-200 text-sm focus:outline-none focus:ring-2 focus:ring-cherry-500/30 focus:border-cherry-400"
                />
              </div>
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-cherry-200 p-5">
            <h2 className="text-sm font-black text-ink-900 mb-3">Deskripsi Produk</h2>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={6}
              placeholder="Deskripsi yang akan tampil di halaman produk storefront"
              className="w-full px-4 py-3 rounded-xl border border-cherry-200 text-sm focus:outline-none focus:ring-2 focus:ring-cherry-500/30 focus:border-cherry-400 resize-y"
            />
          </section>

          <button
            onClick={save}
            disabled={saving}
            className="flex items-center justify-center gap-2 py-4 rounded-2xl text-white text-sm font-bold bg-gradient-to-r from-cherry-400 to-cherry-500 hover:opacity-90 disabled:opacity-50 transition-opacity mb-8"
          >
            <Save size={16} />
            {saving ? "Menyimpan…" : "Simpan Perubahan"}
          </button>
        </div>
      </div>
    </AdminShell>
  );
}

// ─── RestockDispatchButton ───────────────────────────────────────────
// Sprint 3 #16 — Admin trigger email + push notif ke customer yang subscribe
// restock alert. Idempotent di BE (mark notified_at cegah dobel kirim).
// Inline confirm pattern (Voucher style) — cegah accidental send massal.
function RestockDispatchButton({ productID, productName }: { productID: string; productName: string }) {
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const [sentAt, setSentAt] = useState<Date | null>(null);

  const send = async () => {
    if (sending) return;
    setSending(true);
    try {
      await adminApi.dispatchRestockNotif(productID);
      setSentAt(new Date());
      setConfirming(false);
      toast.success("Notifikasi restock terkirim ke customer yang subscribe");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal kirim notif");
    } finally {
      setSending(false);
    }
  };

  if (sentAt) {
    return (
      <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5">
        <Bell size={12} aria-hidden="true" />
        <span className="font-bold">
          Notifikasi terkirim{" "}
          {sentAt.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
    );
  }

  if (confirming) {
    return (
      <div className="bg-cherry-50 border border-cherry-200 rounded-xl p-3">
        <p className="text-sm text-ink-900 mb-2">
          Kirim email + push ke semua customer yang subscribe alert untuk <b>{productName}</b>?
        </p>
        <p className="text-xs text-ink-500 mb-3">
          Sistem otomatis skip customer yang sudah di-notif sebelumnya (cegah spam).
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={send}
            disabled={sending}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-cherry-500 to-cherry-600 hover:from-cherry-600 hover:to-cherry-700 shadow-md active:scale-[0.98] disabled:opacity-40"
          >
            {sending ? (
              <>
                <Loader2 size={12} className="animate-spin" aria-hidden="true" />
                Mengirim…
              </>
            ) : (
              <>
                <Bell size={12} aria-hidden="true" />
                Ya, Kirim
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            disabled={sending}
            className="h-9 px-3 rounded-lg text-xs font-bold text-ink-500 hover:text-ink-700 disabled:opacity-40"
          >
            Batal
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-bold text-cherry-600 border border-cherry-300 bg-white hover:bg-cherry-50"
    >
      <Bell size={12} aria-hidden="true" />
      Kirim Notif Restock ke Subscriber
    </button>
  );
}


// ─── Sesuaikan Stok ───────────────────────────────────────────────────────
//
// Satu-satunya jalur ubah stok toko rumah. Set absolut (bukan selisih),
// alasan wajib, dan selalu menulis baris ke Pergerakan Stok.
//
// Dipisah dari tombol Simpan produk dengan sengaja. Nilai stok di sebuah
// form sudah basi begitu halaman dimuat — kalau ikut tersimpan bersama
// harga, penjualan yang terjadi di sela itu tertimpa diam-diam. Itu persis
// insiden Sunbay 26 Jul 2026.
const ALASAN_PILIHAN: { v: string; label: string; hint: string }[] = [
  { v: "opname", label: "Koreksi opname", hint: "Hasil hitung fisik beda dengan sistem" },
  { v: "restock", label: "Stok masuk", hint: "Barang baru datang dari distributor" },
  { v: "damaged", label: "Rusak / kedaluwarsa", hint: "Tidak bisa dijual lagi" },
  { v: "lost", label: "Hilang", hint: "Barang fisik tidak ada" },
  { v: "repack", label: "Kemasan dipecah", hint: "Kemasan besar jadi kemasan kecil" },
  { v: "sample", label: "Sample / promo", hint: "Diberikan ke customer" },
  { v: "other", label: "Lainnya", hint: "Isi catatan untuk detail" },
];

function SesuaikanStok({
  productId, stokSekarang, onSelesai,
}: {
  productId: string;
  stokSekarang: number;
  onSelesai: () => void;
}) {
  const [buka, setBuka] = useState(false);
  const [nilai, setNilai] = useState(String(stokSekarang));
  const [alasan, setAlasan] = useState("opname");
  const [catatan, setCatatan] = useState("");
  const [simpan, setSimpan] = useState(false);
  const [salah, setSalah] = useState<string | null>(null);

  const angka = parseInt(nilai, 10);
  const selisih = Number.isFinite(angka) ? angka - stokSekarang : 0;
  const butuhCatatan = alasan === "other" && !catatan.trim();

  const kirim = async () => {
    if (!Number.isFinite(angka) || angka < 0) { setSalah("Jumlah stok tidak valid."); return; }
    if (selisih === 0) { setSalah("Jumlahnya sama dengan sekarang — tidak ada yang disesuaikan."); return; }
    if (butuhCatatan) { setSalah("Alasan \"Lainnya\" wajib diisi catatannya."); return; }
    setSalah(null);
    setSimpan(true);
    try {
      await adminApi.adjustStock(productId, { new_stock: angka, reason: alasan, note: catatan.trim() });
      toast.success("Stok disesuaikan");
      setBuka(false);
      setCatatan("");
      onSelesai();
    } catch (e) {
      setSalah(e instanceof Error ? e.message : "Gagal menyesuaikan stok.");
    } finally {
      setSimpan(false);
    }
  };

  if (!buka) {
    return (
      <button
        onClick={() => { setBuka(true); setNilai(String(stokSekarang)); setSalah(null); }}
        className="mt-3 inline-flex items-center gap-1.5 min-h-11 px-4 rounded-xl border border-cherry-300 text-sm font-bold text-cherry-700 active:scale-[0.98]"
      >
        Sesuaikan Stok
      </button>
    );
  }

  const inp = "w-full px-3 py-2.5 text-sm rounded-xl border border-cherry-200 bg-white text-ink-900";

  return (
    <div className="mt-3 rounded-xl border border-cherry-200 bg-cherry-50/40 p-4 space-y-3">
      <div>
        <label className="text-xs font-bold text-ink-700 block mb-1.5">Stok setelah disesuaikan</label>
        <input type="number" min="0" value={nilai} onChange={(e) => setNilai(e.target.value)} className={inp} />
        {Number.isFinite(angka) && selisih !== 0 && (
          <p className={`text-xs mt-1 font-bold ${selisih > 0 ? "text-cherry-600" : "text-red-600"}`}>
            {selisih > 0 ? `+${selisih}` : selisih} dari sekarang ({stokSekarang})
          </p>
        )}
      </div>

      <div>
        <label className="text-xs font-bold text-ink-700 block mb-1.5">Alasan</label>
        <select value={alasan} onChange={(e) => setAlasan(e.target.value)} className={inp}>
          {ALASAN_PILIHAN.map((a) => <option key={a.v} value={a.v}>{a.label}</option>)}
        </select>
        <p className="text-xs text-ink-500 mt-1">
          {ALASAN_PILIHAN.find((a) => a.v === alasan)?.hint}
        </p>
      </div>

      <div>
        <label className="text-xs font-bold text-ink-700 block mb-1.5">
          Catatan {alasan === "other" && <span className="text-red-600">*</span>}
        </label>
        <input value={catatan} onChange={(e) => setCatatan(e.target.value)} className={inp}
          placeholder="Opsional — mis. nomor nota atau nama yang menghitung" />
      </div>

      {salah && (
        <p role="alert" className="text-xs font-bold text-red-700 leading-relaxed">{salah}</p>
      )}

      <div className="flex gap-2">
        <button onClick={() => { setBuka(false); setSalah(null); }} disabled={simpan}
          className="flex-1 min-h-11 rounded-xl border border-cherry-200 text-sm font-bold text-ink-700 disabled:opacity-40">
          Batal
        </button>
        <button onClick={kirim} disabled={simpan}
          className="flex-1 min-h-11 rounded-xl text-white text-sm font-black bg-gradient-to-r from-cherry-500 to-cherry-600 disabled:opacity-40 active:scale-[0.98]">
          {simpan ? "Menyimpan…" : "Simpan"}
        </button>
      </div>
    </div>
  );
}


// ─── Harga grosir (kartonan) ──────────────────────────────────────────────
//
// Aturannya mode PAKET, sama persis dengan kasir dan dengan yang ditagih
// checkout: tier berlaku HANYA dalam kelipatan jumlah minimumnya, sisanya
// harga normal. "Beli 2 = 33rb" berarti 2 → 33rb, 3 → 33rb + 1 satuan,
// 4 → 66rb. Bukan "sekali lewat ambang semua unit murah" — aturan itu
// ditolak Bu Santi 21 Jun 2026 karena terlalu murah hati.
//
// Admin mengetik TOTAL PAKET ("beli 3 = Rp 149.000"), bukan harga satuan.
// Itu cara Bu Santi memasangnya dan cara customer membacanya; pembagian ke
// harga per satuan dilakukan saat menyimpan, karena begitulah backend
// menyimpannya.
//
// Target selalu "semua customer" — toko rumah tidak punya konsep member POS,
// dan backend memaksanya juga. Tidak ditampilkan sebagai pilihan supaya
// tidak ada yang perlu diputuskan tanpa guna.

function rp(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
}

// ── Periode berlaku tier ──────────────────────────────────────────────────
//
// Bu Santi 30 Okt 2026: "Ada periode tanggal dan bulan. Jadi saya bisa buat
// promo dalam bulan mendatang." Pilihan durasi yang lama (1/3/6/12/30 hari)
// selalu mulai detik itu juga, jadi promo Desember hanya bisa dipasang pada
// 1 Desember — tepat saat tokonya paling sibuk.

function fmtTgl(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function tglMulaiInput(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : fmtTgl(d);
}

/**
 * Backend menyimpan batas akhir secara eksklusif — tanggal yang diketik admin
 * jadi 00:00 hari BERIKUTNYA supaya hari terakhir terhitung penuh. Untuk
 * ditampilkan lagi harus dimundurkan sehari. Tier lama yang dibuat lewat
 * pilihan durasi punya jam sembarang; itu ditampilkan apa adanya.
 */
function tglSampaiInput(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  if (d.getHours() === 0 && d.getMinutes() === 0 && d.getSeconds() === 0) {
    d.setDate(d.getDate() - 1);
  }
  return fmtTgl(d);
}

function pintasanPeriode() {
  const now = new Date();
  return [
    { label: "Berlaku terus", mulai: "", sampai: "" },
    { label: "7 hari", mulai: fmtTgl(now), sampai: fmtTgl(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 6)) },
    { label: "Sisa bulan ini", mulai: fmtTgl(now), sampai: fmtTgl(new Date(now.getFullYear(), now.getMonth() + 1, 0)) },
    { label: "Bulan depan", mulai: fmtTgl(new Date(now.getFullYear(), now.getMonth() + 1, 1)), sampai: fmtTgl(new Date(now.getFullYear(), now.getMonth() + 2, 0)) },
  ];
}

/** Status jadwal untuk label di daftar. */
function statusJadwal(t: { starts_at?: string | null; expires_at?: string | null }):
  { kind: "aktif" | "terjadwal" | "berakhir"; hariLagi: number } | null {
  const now = Date.now();
  if (t.starts_at) {
    const mulai = new Date(t.starts_at).getTime();
    if (!Number.isNaN(mulai) && mulai > now) {
      return { kind: "terjadwal", hariLagi: Math.ceil((mulai - now) / 86400000) };
    }
  }
  if (t.expires_at) {
    const habis = new Date(t.expires_at).getTime();
    if (Number.isNaN(habis)) return null;
    if (habis <= now) return { kind: "berakhir", hariLagi: 0 };
    return { kind: "aktif", hariLagi: Math.ceil((habis - now) / 86400000) };
  }
  return null;
}

function HargaGrosir({ productId, hargaNormal }: { productId: string; hargaNormal: number }) {
  const [tiers, setTiers] = useState<EcomPriceTier[]>([]);
  const [muat, setMuat] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [buka, setBuka] = useState(false);
  const [qty, setQty] = useState("");
  const [total, setTotal] = useState("");
  const [mulai, setMulai] = useState("");
  const [sampai, setSampai] = useState("");
  const [catatan, setCatatan] = useState("");
  const [simpan, setSimpan] = useState(false);
  const [salah, setSalah] = useState<string | null>(null);
  const [hapusId, setHapusId] = useState<string | null>(null);

  const ambil = () => {
    setMuat(true);
    adminApi.listTiers(productId)
      .then((d) => setTiers(d ?? []))
      .catch(() => setTiers([]))
      .finally(() => setMuat(false));
  };
  useEffect(ambil, [productId]);

  const tutup = () => {
    setBuka(false); setEditId(null); setQty(""); setTotal("");
    setMulai(""); setSampai(""); setCatatan(""); setSalah(null);
  };

  const mulaiEdit = (t: EcomPriceTier) => {
    setEditId(t.id);
    setQty(String(t.min_qty));
    // Dikalikan balik ke total paket — tersimpan per satuan, diketik per paket.
    setTotal(String(Math.round(t.price * t.min_qty)));
    setCatatan(t.note || "");
    // Tanggalnya sekarang ikut dimuat. Dulu tidak bisa karena layarnya
    // menanyakan durasi sementara backend menyimpan tanggal — akibatnya
    // menyimpan perubahan apa pun diam-diam menghapus masa berlakunya.
    setMulai(tglMulaiInput(t.starts_at));
    setSampai(tglSampaiInput(t.expires_at));
    setSalah(null);
    setBuka(true);
  };

  const n = (v: string) => (v.trim() === "" ? NaN : Number(v));
  const q = n(qty), tot = n(total);
  const perSatuan = Number.isFinite(q) && Number.isFinite(tot) && q > 0 ? tot / q : 0;
  const hemat = Number.isFinite(q) && q > 0 ? hargaNormal * q - tot : 0;

  const kirim = async () => {
    if (!Number.isFinite(q) || q < 2) { setSalah("Jumlah minimal harus 2 atau lebih."); return; }
    if (!Number.isFinite(tot) || tot <= 0) { setSalah("Harga paket belum diisi."); return; }
    if (perSatuan >= hargaNormal) {
      // Dicegah di sini, bukan dibiarkan tersimpan: backend juga mengabaikan
      // tier yang lebih mahal dari harga normal, jadi kalau diloloskan
      // tiernya akan tampil di daftar tapi tidak pernah berlaku.
      setSalah(`Harga per satuan (${rp(Math.round(perSatuan))}) tidak lebih murah dari harga normal (${rp(hargaNormal)}). Grosir seharusnya lebih murah.`);
      return;
    }
    if (mulai && sampai && sampai < mulai) {
      setSalah("Tanggal selesai tidak boleh sebelum tanggal mulai."); return;
    }
    setSalah(null);
    setSimpan(true);
    try {
      const payload = {
        min_qty: q,
        price: tot / q,
        target_type: "all_customers" as const,
        note: catatan.trim(),
        // Dikirim selalu, termasuk saat kosong — string kosong berarti
        // "hapus batasnya". Kalau field-nya dihilangkan, backend menganggap
        // tidak ada perubahan dan jadwal lama menempel terus.
        starts_at: mulai,
        expires_at: sampai,
      };
      if (editId) await adminApi.updateTier(productId, editId, payload);
      else await adminApi.createTier(productId, payload);
      toast.success(editId ? "Harga grosir diperbarui" : "Harga grosir ditambahkan");
      tutup();
      ambil();
    } catch (e) {
      setSalah(e instanceof Error ? e.message : "Gagal menyimpan harga grosir.");
    } finally {
      setSimpan(false);
    }
  };

  const hapus = async (id: string) => {
    try {
      await adminApi.deleteTier(productId, id);
      toast.success("Harga grosir dihapus");
      setHapusId(null);
      ambil();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menghapus.");
    }
  };

  const inp = "w-full px-3 py-2.5 text-sm rounded-xl border border-cherry-200 bg-white text-ink-900";

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-1">
        <h2 className="text-sm font-black text-ink-900">Harga Grosir</h2>
        {!buka && (
          <button onClick={() => { tutup(); setBuka(true); }}
            className="min-h-11 px-4 rounded-xl border border-cherry-300 text-sm font-bold text-cherry-700 active:scale-[0.98]">
            + Tambah
          </button>
        )}
      </div>
      <p className="text-xs text-ink-500 leading-relaxed mb-3">
        Berlaku per kelipatan. Contoh &quot;beli 3 = {rp(149000)}&quot;: beli 3 dapat harga paket,
        beli 4 jadi 1 paket + 1 satuan harga normal.
      </p>

      {muat ? (
        <p className="text-sm text-ink-500">Memuat…</p>
      ) : tiers.length === 0 && !buka ? (
        <p className="text-sm text-ink-500 leading-relaxed">
          Belum ada harga grosir. Tanpa ini customer selalu membayar harga satuan,
          berapa pun banyaknya yang dibeli.
        </p>
      ) : (
        <div className="space-y-2">
          {tiers.map((t) => {
            const jadwal = statusJadwal(t);
            return (
              <div key={t.id} className="rounded-xl border border-cherry-100 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-ink-900">
                      Beli {t.min_qty} = {rp(Math.round(t.price * t.min_qty))}
                      <span className="text-ink-500 font-normal text-xs"> ({rp(Math.round(t.price))}/satuan)</span>
                    </p>
                    {t.note && <p className="text-xs text-ink-500 mt-0.5">{t.note}</p>}
                    {jadwal && (
                      <p className={`text-xs font-bold mt-1 ${
                        jadwal.kind === "berakhir" ? "text-red-600"
                          : jadwal.kind === "terjadwal" ? "text-cherry-600"
                          : "text-amber-700"
                      }`}>
                        {jadwal.kind === "berakhir"
                          ? "Sudah berakhir — tidak berlaku lagi"
                          : jadwal.kind === "terjadwal"
                          // Promo terjadwal terlihat persis seperti promo yang
                          // tidak jalan. Tanpa label ini mudah dikira rusak
                          // lalu dipasang dua kali.
                          ? `Belum berlaku — mulai ${jadwal.hariLagi} hari lagi`
                          : `Sisa ${jadwal.hariLagi} hari`}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button onClick={() => mulaiEdit(t)}
                      className="min-h-11 px-3 rounded-xl border border-cherry-200 text-xs font-bold text-ink-700">
                      Ubah
                    </button>
                    <button onClick={() => setHapusId(t.id)}
                      className="min-h-11 px-3 rounded-xl border border-red-200 text-xs font-bold text-red-700">
                      Hapus
                    </button>
                  </div>
                </div>
                {hapusId === t.id && (
                  <div className="mt-3 pt-3 border-t border-cherry-100">
                    <p className="text-xs text-ink-700 mb-2 leading-relaxed">
                      Hapus harga grosir ini? Customer kembali membayar harga satuan.
                    </p>
                    <div className="flex gap-2">
                      <button onClick={() => setHapusId(null)}
                        className="flex-1 min-h-11 rounded-xl border border-cherry-200 text-sm font-bold text-ink-700">
                        Batal
                      </button>
                      <button onClick={() => hapus(t.id)}
                        className="flex-1 min-h-11 rounded-xl text-white text-sm font-bold bg-red-600">
                        Ya, Hapus
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {buka && (
        <div className="mt-3 rounded-xl border border-cherry-200 bg-cherry-50/40 p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-ink-700 block mb-1.5">Beli berapa</label>
              <input type="number" min="2" value={qty} onChange={(e) => setQty(e.target.value)}
                className={inp} placeholder="mis. 12" />
            </div>
            <div>
              <label className="text-xs font-bold text-ink-700 block mb-1.5">Total harga paket</label>
              <input type="number" min="0" value={total} onChange={(e) => setTotal(e.target.value)}
                className={inp} placeholder="mis. 149000" />
            </div>
          </div>

          {/* Hitungan ditampilkan sebelum disimpan — angka per satuan yang
              tersimpan di belakang layar, dan hematnya yang dilihat customer. */}
          {perSatuan > 0 && (
            <p className="text-xs text-ink-700 leading-relaxed">
              Jadi <b>{rp(Math.round(perSatuan))}</b> per satuan
              {hargaNormal > 0 && hemat > 0 && (
                <> — customer hemat <b>{rp(Math.round(hemat))}</b> dibanding harga normal</>
              )}
            </p>
          )}

          <div>
            <label className="text-xs font-bold text-ink-700 block mb-1.5">Periode berlaku</label>
            <div className="flex gap-1.5 flex-wrap mb-2">
              {pintasanPeriode().map((p) => {
                const aktif = mulai === p.mulai && sampai === p.sampai;
                return (
                  <button key={p.label} type="button"
                    onClick={() => { setMulai(p.mulai); setSampai(p.sampai); }}
                    className={`min-h-11 px-3 rounded-xl border text-xs font-bold ${
                      aktif ? "bg-cherry-500 text-white border-cherry-500" : "border-cherry-200 text-ink-700"
                    }`}>
                    {p.label}
                  </button>
                );
              })}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-xs text-ink-500 block mb-1">Mulai</span>
                <input type="date" value={mulai} onChange={(e) => setMulai(e.target.value)} className={inp} />
              </div>
              <div>
                <span className="text-xs text-ink-500 block mb-1">Sampai</span>
                <input type="date" value={sampai} min={mulai || undefined}
                  onChange={(e) => setSampai(e.target.value)} className={inp} />
              </div>
            </div>
            <p className="text-xs text-ink-500 mt-1 leading-relaxed">
              {(() => {
                const hariIni = fmtTgl(new Date());
                const tgl = (v: string) => new Date(v + "T00:00:00")
                  .toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
                if (mulai && mulai > hariIni) {
                  return sampai
                    ? `Belum berlaku. Harga ini aktif ${tgl(mulai)} sampai ${tgl(sampai)}.`
                    : `Belum berlaku. Harga ini mulai aktif ${tgl(mulai)}.`;
                }
                if (sampai) return `Berlaku sampai habis ${tgl(sampai)}, lalu balik ke harga normal.`;
                return "Kosongkan keduanya kalau harga ini berlaku terus.";
              })()}
            </p>
          </div>

          <div>
            <label className="text-xs font-bold text-ink-700 block mb-1.5">Catatan</label>
            <input value={catatan} onChange={(e) => setCatatan(e.target.value)} className={inp}
              placeholder="Opsional — mis. harga karton" />
          </div>

          {salah && <p role="alert" className="text-xs font-bold text-red-700 leading-relaxed">{salah}</p>}

          <div className="flex gap-2">
            <button onClick={tutup} disabled={simpan}
              className="flex-1 min-h-11 rounded-xl border border-cherry-200 text-sm font-bold text-ink-700 disabled:opacity-40">
              Batal
            </button>
            <button onClick={kirim} disabled={simpan}
              className="flex-1 min-h-11 rounded-xl text-white text-sm font-black bg-gradient-to-r from-cherry-500 to-cherry-600 disabled:opacity-40 active:scale-[0.98]">
              {simpan ? "Menyimpan…" : editId ? "Simpan Perubahan" : "Tambah"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
