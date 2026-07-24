import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Save, AlertCircle, Info, Upload, Camera, Image as ImageIcon, X, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { adminApi, decodeToken, type EcomAdminProduct, type EcomCategoryAdmin } from "@/lib/api";

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
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

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

  if (loading) {
    return <main className="min-h-screen p-6 text-center text-ink-500">Memuat…</main>;
  }
  if (error || !product) {
    return (
      <main className="min-h-screen p-6">
        <div className="max-w-2xl mx-auto text-center py-16">
          <AlertCircle size={40} className="mx-auto text-cherry-600 mb-3" />
          <p className="text-sm font-semibold text-cherry-600">
            {error || "Produk tidak ditemukan"}
          </p>
          <Link to="/admin/produk" className="inline-block mt-4 text-sm text-cherry-500 underline">
            Kembali ke daftar produk
          </Link>
        </div>
      </main>
    );
  }

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
    <main className="min-h-screen p-6">
      <div className="max-w-2xl mx-auto">
        <Link
          to="/admin/produk"
          className="inline-flex items-center gap-2 text-sm text-ink-700 hover:text-ink-900 mb-4"
        >
          <ArrowLeft size={16} />
          Kembali ke daftar
        </Link>

        <h1 className="text-2xl font-black text-ink-900 mb-1">{product.name}</h1>
        <p className="text-sm text-ink-500 mb-6">SKU: {product.sku}</p>

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
    </main>
  );
}
