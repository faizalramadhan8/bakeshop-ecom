import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Save, AlertCircle, Info, Upload, Camera, Image as ImageIcon, X, Loader2, Bell } from "lucide-react";
import toast from "react-hot-toast";
import { adminApi, decodeToken, type EcomAdminProduct, type EcomCategoryAdmin } from "@/lib/api";
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
  const [stockEcom, setStockEcom] = useState("");
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
        setStockEcom(String(p.stock_ecom));
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
        stock_ecom: Number(stockEcom) || 0,
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
  if (available && Number(stockEcom) === 0)
    warnings.push("Stok online 0 — produk tidak akan tampil di storefront");
  if (available && !weight.trim())
    warnings.push("Berat belum di-set — tidak bisa hitung ongkir");
  if (Number(stockEcom) > product.stock_pos)
    warnings.push(
      `Stok online (${stockEcom}) lebih besar dari stok toko (${product.stock_pos})`
    );

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

          <section className="bg-white rounded-2xl border border-cherry-200 p-5">
            <h2 className="text-sm font-black text-ink-900 mb-3">Stok Online</h2>
            <div className="flex flex-col gap-2">
              <input
                type="number"
                min="0"
                value={stockEcom}
                onChange={(e) => setStockEcom(e.target.value)}
                className="px-4 py-3 rounded-xl border border-cherry-200 text-sm focus:outline-none focus:ring-2 focus:ring-cherry-500/30 focus:border-cherry-400"
              />
              <p className="text-xs text-ink-500">
                Stok toko fisik saat ini: <b className="text-ink-900">{product.stock_pos}</b>{" "}
                (dikelola di POS, tidak di sini)
              </p>
            </div>

            {/* Sprint 3 #16 — Dispatch restock alert kalau produk sudah
                restock. Muncul cuma kalau stock_ecom saat ini > 0. Idempotent
                di BE (subscriber yang sudah notified skip auto). */}
            {product.stock_ecom > 0 && (
              <div className="mt-4 pt-4 border-t border-cherry-100">
                <RestockDispatchButton productID={product.id} productName={product.name_id} />
              </div>
            )}
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
