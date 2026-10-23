import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, Save } from "lucide-react";
import toast from "react-hot-toast";
import { AdminShell } from "@/components/AdminShell";
import { adminApi } from "@/lib/api";

// Tambah produk toko rumah.
//
// Sampai 21 Okt 2026 produk hanya bisa lahir di POS, jadi panel ini tidak
// punya cara membuat katalognya sendiri. Sejak katalog dipisah (migration
// 000075), produk yang dibuat di sini milik toko rumah dan tidak pernah
// terlihat di POS — kasir tidak boleh bisa menjual barang yang fisiknya ada
// di rumah.
//
// Stok awal diisi di sini sekali. Sesudahnya stok HANYA bisa diubah lewat
// Sesuaikan Stok di halaman edit, yang mewajibkan alasan dan menulis jejak.

type Ref = { id: string; name: string };

const SATUAN = ["pcs", "pack", "box", "kg", "gram", "liter", "ml", "lusin", "renteng", "karton"];

export function AdminProdukBaru() {
  const nav = useNavigate();
  const [refs, setRefs] = useState<{ categories: Ref[]; suppliers: Ref[] }>({
    categories: [],
    suppliers: [],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [f, setF] = useState({
    sku: "",
    barcode: "",
    name: "",
    name_id: "",
    category_id: "",
    supplier_id: "",
    unit: "pcs",
    purchase_price: "",
    selling_price: "",
    stock: "",
    min_stock: "",
    qty_per_box: "",
    ecom_weight_grams: "",
  });

  useEffect(() => {
    adminApi.catalogRefs().then(setRefs).catch(() => {});
  }, []);

  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));

  // Wajib menurut backend: sku, name, category_id, unit. Dicek di sini juga
  // supaya pesannya muncul di sebelah isian, bukan sebagai galat server.
  const kurang: string[] = [];
  if (!f.sku.trim()) kurang.push("Kode (SKU)");
  if (!f.name.trim()) kurang.push("Nama produk");
  if (!f.category_id) kurang.push("Kategori");
  if (!f.unit) kurang.push("Satuan");

  const simpan = async () => {
    if (kurang.length) return;
    setError(null);
    setSaving(true);
    try {
      const num = (v: string) => (v.trim() === "" ? 0 : Number(v));
      const baru = await adminApi.createProduct({
        sku: f.sku.trim(),
        barcode: f.barcode.trim(),
        name: f.name.trim(),
        // name_id dipakai di seluruh storefront. Dikosongkan = produk tampil
        // tanpa nama di etalase, jadi jatuh ke `name`.
        name_id: f.name_id.trim() || f.name.trim(),
        category_id: f.category_id,
        supplier_id: f.supplier_id || undefined,
        unit: f.unit,
        purchase_price: num(f.purchase_price),
        selling_price: num(f.selling_price),
        stock: num(f.stock),
        min_stock: num(f.min_stock),
        qty_per_box: num(f.qty_per_box) || 1,
      });
      toast.success("Produk tersimpan");
      // Langsung ke halaman edit: harga online, foto, dan deskripsi etalase
      // diatur di sana. Tanpa ini produk baru tidak akan pernah tayang.
      nav(`/admin/produk/${baru.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan produk.");
    } finally {
      setSaving(false);
    }
  };

  const inp =
    "w-full px-3 py-2.5 text-sm rounded-xl border border-cherry-200 bg-white text-ink-900";
  const lbl = "text-xs font-bold text-ink-700 block mb-1.5";

  return (
    <AdminShell
      title="Tambah Produk"
      subtitle="Produk toko rumah — tidak muncul di kasir Bekasi"
      parents={[{ label: "Produk", to: "/admin/produk" }]}
    >
      <div className="max-w-2xl space-y-4">
        <section className="bg-white rounded-2xl border border-cherry-200 p-5 space-y-3">
          <h2 className="text-sm font-black text-ink-900">Identitas</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Kode (SKU) *</label>
              <input value={f.sku} onChange={(e) => set("sku", e.target.value)} className={inp}
                placeholder="mis. RMH-001" />
              <p className="text-xs text-ink-500 mt-1 leading-relaxed">
                Harus unik di seluruh sistem, termasuk terhadap produk Bekasi.
              </p>
            </div>
            <div>
              <label className={lbl}>Barcode</label>
              <input value={f.barcode} onChange={(e) => set("barcode", e.target.value)} className={inp} />
            </div>
          </div>
          <div>
            <label className={lbl}>Nama produk *</label>
            <input value={f.name} onChange={(e) => set("name", e.target.value)} className={inp} />
          </div>
          <div>
            <label className={lbl}>Nama tampil di etalase</label>
            <input value={f.name_id} onChange={(e) => set("name_id", e.target.value)} className={inp}
              placeholder="Kosongkan = sama dengan nama produk" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Kategori *</label>
              <select value={f.category_id} onChange={(e) => set("category_id", e.target.value)} className={inp}>
                <option value="">— pilih —</option>
                {refs.categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={lbl}>Pemasok</label>
              <select value={f.supplier_id} onChange={(e) => set("supplier_id", e.target.value)} className={inp}>
                <option value="">— tanpa pemasok —</option>
                {refs.suppliers.map((sp) => (
                  <option key={sp.id} value={sp.id}>{sp.name}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-cherry-200 p-5 space-y-3">
          <h2 className="text-sm font-black text-ink-900">Harga &amp; Satuan</h2>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={lbl}>Satuan *</label>
              <select value={f.unit} onChange={(e) => set("unit", e.target.value)} className={inp}>
                {SATUAN.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Harga modal</label>
              <input type="number" min="0" value={f.purchase_price}
                onChange={(e) => set("purchase_price", e.target.value)} className={inp} />
            </div>
            <div>
              <label className={lbl}>Harga jual</label>
              <input type="number" min="0" value={f.selling_price}
                onChange={(e) => set("selling_price", e.target.value)} className={inp} />
            </div>
          </div>
          <p className="text-xs text-ink-500 leading-relaxed">
            Harga jual ini dipakai kalau harga online belum diisi. Harga khusus online
            diatur di halaman edit setelah produk tersimpan.
          </p>
        </section>

        <section className="bg-white rounded-2xl border border-cherry-200 p-5 space-y-3">
          <h2 className="text-sm font-black text-ink-900">Stok Awal</h2>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={lbl}>Jumlah</label>
              <input type="number" min="0" value={f.stock}
                onChange={(e) => set("stock", e.target.value)} className={inp} />
            </div>
            <div>
              <label className={lbl}>Batas menipis</label>
              <input type="number" min="0" value={f.min_stock}
                onChange={(e) => set("min_stock", e.target.value)} className={inp} />
            </div>
            <div>
              <label className={lbl}>Isi per dus</label>
              <input type="number" min="0" value={f.qty_per_box}
                onChange={(e) => set("qty_per_box", e.target.value)} className={inp} placeholder="1" />
            </div>
          </div>
          <p className="text-xs text-ink-500 leading-relaxed">
            Diisi sekali di sini. Setelah produk tersimpan, stok hanya bisa diubah lewat
            <b className="text-ink-900"> Sesuaikan Stok</b> di halaman edit — supaya setiap
            perubahan punya alasan dan tercatat di Pergerakan Stok.
          </p>
        </section>

        {error && (
          <p role="alert" className="flex items-start gap-2 text-sm font-bold text-red-700 leading-relaxed">
            <AlertCircle size={16} className="shrink-0 mt-0.5" aria-hidden="true" />
            {error}
          </p>
        )}

        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={simpan} disabled={saving || kurang.length > 0}
            className="inline-flex items-center gap-2 min-h-11 px-6 rounded-xl text-white text-sm font-black bg-gradient-to-r from-cherry-500 to-cherry-600 disabled:opacity-40 active:scale-[0.98]">
            <Save size={15} aria-hidden="true" />
            {saving ? "Menyimpan…" : "Simpan Produk"}
          </button>
          {/* Menyebut APA yang kurang, bukan sekadar mematikan tombolnya —
              tombol mati tanpa alasan membuat orang menekannya berulang kali
              lalu menyerah. */}
          {kurang.length > 0 && (
            <p className="text-xs text-ink-500">Lengkapi dulu: <b>{kurang.join(", ")}</b></p>
          )}
        </div>
      </div>
    </AdminShell>
  );
}
