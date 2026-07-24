import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, Edit3, X, Save, Loader2, Package } from "lucide-react";
import toast from "react-hot-toast";
import { adminApi, decodeToken, type EcomCategoryAdmin } from "@/lib/api";
import { CATEGORY_ICONS, CATEGORY_ICON_NAMES, CategoryIcon } from "@/components/CategoryIcon";

const ECOM_ADMIN_ROLES = ["ecom_admin", "ecom_superadmin", "superadmin"];

// Kurasi kategori khusus storefront ecom — terpisah dari kategori POS.
// Admin ecom bebas atur taxonomy customer-facing tanpa ganggu reporting POS.
export function AdminKategori() {
  const [items, setItems] = useState<EcomCategoryAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [nameId, setNameId] = useState("");
  const [icon, setIcon] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    const claims = decodeToken();
    if (!claims || !ECOM_ADMIN_ROLES.includes(claims.role || "")) {
      window.location.href = "/";
      return;
    }
    load();
  }, []);

  const load = () => {
    setLoading(true);
    adminApi
      .listCategories()
      .then((list) => setItems(list || []))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Gagal load"))
      .finally(() => setLoading(false));
  };

  const openCreate = () => {
    setEditingId(null);
    setName("");
    setNameId("");
    setIcon("");
    setSortOrder("0");
    setIsActive(true);
    setShowForm(true);
  };

  const openEdit = (c: EcomCategoryAdmin) => {
    setEditingId(c.id);
    setName(c.name);
    setNameId(c.name_id ?? "");
    setIcon(c.icon_name ?? "");
    setSortOrder(String(c.sort_order));
    setIsActive(c.is_active);
    setShowForm(true);
  };

  const save = async () => {
    if (!name.trim()) {
      toast.error("Nama kategori wajib");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        name_id: nameId.trim(),
        icon_name: icon.trim(),
        sort_order: Number(sortOrder) || 0,
        is_active: isActive,
      };
      if (editingId) {
        await adminApi.updateCategory(editingId, payload);
        toast.success("Kategori diupdate");
      } else {
        await adminApi.createCategory(payload);
        toast.success("Kategori dibuat");
      }
      setShowForm(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal simpan");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (c: EcomCategoryAdmin) => {
    if (c.product_count > 0) {
      if (!confirm(`Kategori "${c.name}" masih dipakai ${c.product_count} produk. Kalau dihapus, produk tersebut jadi tanpa kategori (masih tetap ada). Lanjutkan?`)) {
        return;
      }
    } else if (!confirm(`Hapus kategori "${c.name}"?`)) {
      return;
    }
    try {
      await adminApi.deleteCategory(c.id);
      toast.success("Kategori dihapus");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal hapus");
    }
  };

  return (
    <main className="min-h-screen p-6">
      <div className="max-w-3xl mx-auto">
        <Link
          to="/admin"
          className="inline-flex items-center gap-2 text-sm text-ink-700 hover:text-ink-900 mb-4"
        >
          <ArrowLeft size={16} />
          Dashboard Admin
        </Link>

        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-black text-ink-900">Kategori Ecommerce</h1>
            <p className="text-sm text-ink-500 mt-1">
              Kelompok produk yang tampil di storefront online. Terpisah dari kategori POS.
            </p>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-white text-sm font-bold bg-gradient-to-r from-cherry-400 to-cherry-500 hover:opacity-90"
          >
            <Plus size={14} />
            Tambah
          </button>
        </div>

        {showForm && (
          <div className="mb-4 bg-white border border-cherry-200 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-black text-ink-900">
                {editingId ? "Edit Kategori" : "Kategori Baru"}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-ink-500 hover:text-ink-900">
                <X size={16} />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-ink-700 uppercase tracking-wider">
                  Nama (EN) *
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Flour & Dry Goods"
                  className="px-4 py-3 rounded-xl border border-cherry-200 text-sm focus:outline-none focus:ring-2 focus:ring-cherry-500/30 focus:border-cherry-400"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-ink-700 uppercase tracking-wider">
                  Nama (ID)
                </label>
                <input
                  value={nameId}
                  onChange={(e) => setNameId(e.target.value)}
                  placeholder="Tepung & Bahan Kering"
                  className="px-4 py-3 rounded-xl border border-cherry-200 text-sm focus:outline-none focus:ring-2 focus:ring-cherry-500/30 focus:border-cherry-400"
                />
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label className="text-xs font-bold text-ink-700 uppercase tracking-wider">
                  Ikon
                </label>
                <div className="grid grid-cols-8 sm:grid-cols-10 gap-1.5 p-2 rounded-xl border border-cherry-200 bg-cherry-50/40 max-h-48 overflow-y-auto">
                  {CATEGORY_ICON_NAMES.map((name) => {
                    const Ic = CATEGORY_ICONS[name];
                    const isSelected = icon === name;
                    return (
                      <button
                        key={name}
                        type="button"
                        onClick={() => setIcon(isSelected ? "" : name)}
                        title={name}
                        aria-pressed={isSelected}
                        aria-label={name}
                        className={`aspect-square min-h-[44px] rounded-lg flex items-center justify-center transition-colors ${
                          isSelected
                            ? "bg-cherry-500 text-white"
                            : "bg-white text-ink-700 hover:bg-cherry-100"
                        }`}
                      >
                        <Ic size={18} aria-hidden="true" />
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-ink-500">
                  Klik icon lagi untuk deselect. Kalau kosong, sistem pilih otomatis dari nama.
                </p>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-ink-700 uppercase tracking-wider">
                  Urutan Tampil
                </label>
                <input
                  type="number"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  className="px-4 py-3 rounded-xl border border-cherry-200 text-sm focus:outline-none focus:ring-2 focus:ring-cherry-500/30 focus:border-cherry-400"
                />
              </div>
            </div>
            <label className="flex items-center gap-2 mt-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 accent-cherry-500"
              />
              <span className="text-sm text-ink-900">Aktif — tampil di storefront</span>
            </label>
            <div className="flex gap-2 mt-4">
              <button
                onClick={save}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-sm font-bold bg-gradient-to-r from-cherry-400 to-cherry-500 hover:opacity-90 disabled:opacity-60"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {editingId ? "Simpan Perubahan" : "Buat"}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2.5 rounded-xl border border-cherry-200 text-sm font-bold text-ink-700 hover:bg-cherry-50"
              >
                Batal
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="py-16 text-center text-ink-500 text-sm">Memuat…</div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center bg-white rounded-2xl border border-cherry-200">
            <Package size={40} className="mx-auto text-ink-500 opacity-40 mb-2" />
            <p className="text-sm text-ink-700 mb-1">Belum ada kategori ecom</p>
            <p className="text-xs text-ink-500">
              Tambah minimal 1 kategori supaya produk bisa di-group di storefront.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {items.map((c) => (
              <div
                key={c.id}
                className={`flex items-center gap-3 p-4 rounded-2xl bg-white border ${
                  c.is_active ? "border-cherry-200" : "border-ink-200 opacity-60"
                }`}
              >
                <div className="w-12 h-12 rounded-xl bg-cherry-50 flex items-center justify-center text-cherry-500 shrink-0">
                  <CategoryIcon nameId={c.name_id || c.name} iconName={c.icon_name} size={22} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-ink-900 truncate">
                    {c.name_id || c.name}
                  </p>
                  <p className="text-xs text-ink-500">
                    {c.product_count} produk · Urutan {c.sort_order}
                    {!c.is_active && " · Nonaktif"}
                  </p>
                </div>
                <button
                  onClick={() => openEdit(c)}
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-ink-700 hover:bg-cherry-50 hover:text-cherry-500"
                  aria-label="Edit"
                >
                  <Edit3 size={14} />
                </button>
                <button
                  onClick={() => remove(c)}
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-ink-700 hover:bg-red-50 hover:text-red-500"
                  aria-label="Hapus"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
