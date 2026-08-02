import { useEffect, useState } from "react";
import { Plus, Trash2, Edit3, X, Save, Loader2, Ticket } from "lucide-react";
import toast from "react-hot-toast";
import { adminApi, decodeToken, type VoucherAdmin } from "@/lib/api";
import { AdminShell } from "@/components/AdminShell";

const ECOM_ADMIN_ROLES = ["ecom_admin", "ecom_superadmin", "superadmin"];

function formatRp(n: number): string {
  return "Rp " + Math.round(n).toLocaleString("id-ID");
}
function fmtDate(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}
// input type="date" wants YYYY-MM-DD in local (not UTC).
function isoToDateInput(iso?: string): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

export function AdminVoucher() {
  const [items, setItems] = useState<VoucherAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  // Filter chips — supaya admin cepat cari voucher aktif vs nonaktif.
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"percent" | "fixed">("percent");
  const [value, setValue] = useState("");
  const [minSubtotal, setMinSubtotal] = useState("0");
  const [maxDiscount, setMaxDiscount] = useState("");
  const [usageLimit, setUsageLimit] = useState("0");
  const [startsAt, setStartsAt] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
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
      .listVouchers()
      .then((list) => setItems(list || []))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Gagal load"))
      .finally(() => setLoading(false));
  };

  const resetForm = () => {
    setEditingId(null);
    setCode(""); setDescription(""); setType("percent"); setValue("");
    setMinSubtotal("0"); setMaxDiscount(""); setUsageLimit("0");
    setStartsAt(""); setExpiresAt(""); setIsActive(true);
  };

  const openCreate = () => { resetForm(); setShowForm(true); };
  const openEdit = (v: VoucherAdmin) => {
    setEditingId(v.id);
    setCode(v.code);
    setDescription(v.description || "");
    setType(v.type);
    setValue(String(v.value));
    setMinSubtotal(String(v.min_subtotal));
    setMaxDiscount(v.max_discount != null ? String(v.max_discount) : "");
    setUsageLimit(String(v.usage_limit));
    setStartsAt(isoToDateInput(v.starts_at));
    setExpiresAt(isoToDateInput(v.expires_at));
    setIsActive(v.is_active);
    setShowForm(true);
  };

  const save = async () => {
    if (!code.trim()) { toast.error("Kode wajib"); return; }
    if (!value || Number(value) <= 0) { toast.error("Nilai voucher wajib > 0"); return; }
    setSaving(true);
    try {
      const payload = {
        code: code.trim().toUpperCase(),
        description: description.trim(),
        type,
        value: Number(value),
        min_subtotal: Number(minSubtotal) || 0,
        max_discount: maxDiscount ? Number(maxDiscount) : null,
        usage_limit: Number(usageLimit) || 0,
        starts_at: startsAt || undefined,
        expires_at: expiresAt || undefined,
        is_active: isActive,
      };
      if (editingId) {
        await adminApi.updateVoucher(editingId, payload);
        toast.success("Voucher diupdate");
      } else {
        await adminApi.createVoucher(payload);
        toast.success("Voucher dibuat");
      }
      setShowForm(false);
      resetForm();
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal simpan");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await adminApi.deleteVoucher(id);
      toast.success("Voucher dihapus");
      setConfirmDelete(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal hapus");
    }
  };

  return (
    <AdminShell
      title="Voucher & Promo"
      subtitle="Kode diskon untuk customer online."
      headerRight={
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 px-4 h-10 rounded-xl text-white text-sm font-bold bg-gradient-to-r from-cherry-400 to-cherry-500 shrink-0"
        >
          <Plus size={14} aria-hidden="true" /> Tambah
        </button>
      }
    >
      <div className="max-w-3xl">
        {showForm && (
          <div className="mb-4 bg-white border border-cherry-200 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-black text-ink-900">
                {editingId ? "Edit Voucher" : "Voucher Baru"}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-ink-500 hover:text-ink-900">
                <X size={16} aria-hidden="true" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label className="text-xs font-bold text-ink-700 uppercase tracking-wider">Kode *</label>
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="DISKONHEMAT10"
                  className="px-4 py-3 rounded-xl border border-cherry-200 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-cherry-500/30 focus:border-cherry-400"
                />
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label className="text-xs font-bold text-ink-700 uppercase tracking-wider">Deskripsi (opsional)</label>
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Diskon 10% max Rp 20rb, min belanja Rp 100rb"
                  className="px-4 py-3 rounded-xl border border-cherry-200 text-sm focus:outline-none focus:ring-2 focus:ring-cherry-500/30 focus:border-cherry-400"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-ink-700 uppercase tracking-wider">Tipe *</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as "percent" | "fixed")}
                  className="px-4 py-3 rounded-xl border border-cherry-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-cherry-500/30 focus:border-cherry-400"
                >
                  <option value="percent">Persen (%)</option>
                  <option value="fixed">Fixed (Rp)</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-ink-700 uppercase tracking-wider">
                  Nilai * ({type === "percent" ? "%" : "Rp"})
                </label>
                <input
                  type="number"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder={type === "percent" ? "10" : "10000"}
                  className="px-4 py-3 rounded-xl border border-cherry-200 text-sm focus:outline-none focus:ring-2 focus:ring-cherry-500/30 focus:border-cherry-400"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-ink-700 uppercase tracking-wider">Min. Belanja (Rp)</label>
                <input
                  type="number"
                  value={minSubtotal}
                  onChange={(e) => setMinSubtotal(e.target.value)}
                  placeholder="0"
                  className="px-4 py-3 rounded-xl border border-cherry-200 text-sm focus:outline-none focus:ring-2 focus:ring-cherry-500/30 focus:border-cherry-400"
                />
              </div>
              {type === "percent" && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-ink-700 uppercase tracking-wider">
                    Cap Max Diskon (opsional, Rp)
                  </label>
                  <input
                    type="number"
                    value={maxDiscount}
                    onChange={(e) => setMaxDiscount(e.target.value)}
                    placeholder="Contoh: 20000"
                    className="px-4 py-3 rounded-xl border border-cherry-200 text-sm focus:outline-none focus:ring-2 focus:ring-cherry-500/30 focus:border-cherry-400"
                  />
                </div>
              )}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-ink-700 uppercase tracking-wider">
                  Kuota (0 = unlimited)
                </label>
                <input
                  type="number"
                  value={usageLimit}
                  onChange={(e) => setUsageLimit(e.target.value)}
                  className="px-4 py-3 rounded-xl border border-cherry-200 text-sm focus:outline-none focus:ring-2 focus:ring-cherry-500/30 focus:border-cherry-400"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-ink-700 uppercase tracking-wider">Mulai (opsional)</label>
                <input
                  type="date"
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                  className="px-4 py-3 rounded-xl border border-cherry-200 text-sm focus:outline-none focus:ring-2 focus:ring-cherry-500/30 focus:border-cherry-400"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-ink-700 uppercase tracking-wider">Berakhir (opsional)</label>
                <input
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
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
              <span className="text-sm text-ink-900">Aktif — bisa dipakai customer</span>
            </label>
            <div className="flex gap-2 mt-4">
              <button
                onClick={save}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-sm font-bold bg-gradient-to-r from-cherry-400 to-cherry-500 disabled:opacity-60"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {editingId ? "Simpan Perubahan" : "Buat Voucher"}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2.5 rounded-xl border border-cherry-200 text-sm font-bold text-ink-700"
              >
                Batal
              </button>
            </div>
          </div>
        )}

        {/* Filter chips — active/inactive quick narrow */}
        {!loading && items.length > 0 && (
          <div className="flex gap-2 mb-3">
            {(
              [
                { key: "all", label: "Semua" },
                { key: "active", label: "Aktif" },
                { key: "inactive", label: "Nonaktif" },
              ] as const
            ).map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setStatusFilter(f.key)}
                className={`px-3 h-8 rounded-full text-xs font-bold ${
                  statusFilter === f.key
                    ? "bg-cherry-500 text-white"
                    : "bg-white border border-cherry-200 text-ink-700 hover:bg-cherry-50"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="py-16 text-center text-ink-500 text-sm">
            <Loader2 size={20} className="animate-spin mx-auto mb-2" />
            Memuat voucher…
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center bg-white rounded-2xl border border-cherry-200">
            <div className="w-16 h-16 rounded-full bg-cherry-50 mx-auto mb-3 flex items-center justify-center">
              <Ticket size={30} className="text-cherry-300" aria-hidden="true" />
            </div>
            <p className="text-sm font-black text-ink-900 mb-1">Belum ada voucher</p>
            <p className="text-xs text-ink-500">Bikin voucher pertama untuk narik customer.</p>
          </div>
        ) : (() => {
          const filtered = items.filter((v) => {
            if (statusFilter === "active") return v.is_active;
            if (statusFilter === "inactive") return !v.is_active;
            return true;
          });
          if (filtered.length === 0) {
            return (
              <div className="py-16 text-center bg-white rounded-2xl border border-cherry-200">
                <div className="w-16 h-16 rounded-full bg-cherry-50 mx-auto mb-3 flex items-center justify-center">
                  <Ticket size={30} className="text-cherry-300" aria-hidden="true" />
                </div>
                <p className="text-sm font-black text-ink-900 mb-1">Tidak ada hasil</p>
                <p className="text-xs text-ink-500">Coba ganti filter di atas.</p>
              </div>
            );
          }
          return (
          <div className="flex flex-col gap-2">
            {filtered.map((v) => (
              <div
                key={v.id}
                className={`bg-white rounded-2xl border p-4 ${v.is_active ? "border-cherry-200" : "border-ink-200 opacity-60"}`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-xl bg-cherry-50 text-cherry-500 flex items-center justify-center shrink-0">
                    <Ticket size={18} aria-hidden="true" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm font-black text-ink-900">{v.code}</span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-cherry-100 text-cherry-600">
                        {v.type === "percent"
                          ? `${v.value}%${v.max_discount ? ` (max ${formatRp(v.max_discount)})` : ""}`
                          : formatRp(v.value)}
                      </span>
                      {!v.is_active && (
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-ink-100 text-ink-700">
                          Nonaktif
                        </span>
                      )}
                    </div>
                    {v.description && (
                      <p className="text-xs text-ink-700 mt-1">{v.description}</p>
                    )}
                    <p className="text-xs text-ink-500 mt-1">
                      Min Rp {formatRp(v.min_subtotal).slice(3)} · Terpakai {v.used_count}/{v.usage_limit || "∞"} · Sd {fmtDate(v.expires_at)}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => openEdit(v)} aria-label="Edit"
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-ink-700 hover:bg-cherry-50 hover:text-cherry-500">
                      <Edit3 size={14} aria-hidden="true" />
                    </button>
                    <button onClick={() => setConfirmDelete(v.id)} aria-label="Hapus"
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-ink-700 hover:bg-red-50 hover:text-red-500">
                      <Trash2 size={14} aria-hidden="true" />
                    </button>
                  </div>
                </div>
                {confirmDelete === v.id && (
                  <div className="mt-3 bg-red-50 border border-red-200 rounded-xl p-3">
                    <p className="text-xs text-red-700 mb-2">Hapus voucher <b>{v.code}</b>? Customer yang sudah pakai tidak terpengaruh.</p>
                    <div className="flex gap-2">
                      <button onClick={() => remove(v.id)} className="flex-1 py-2 rounded-lg text-xs font-bold text-white bg-red-500 hover:bg-red-600">
                        Ya, Hapus
                      </button>
                      <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 rounded-lg text-xs font-bold border border-red-200 text-red-600">
                        Batal
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          );
        })()}
      </div>
    </AdminShell>
  );
}
