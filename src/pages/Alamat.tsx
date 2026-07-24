import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Plus, MapPin, Trash2, Edit3, Check, X } from "lucide-react";
import toast from "react-hot-toast";
import { addressApi, type Address, type AddressPayload } from "@/lib/api";

const EMPTY: AddressPayload = {
  label: "Rumah",
  recipient_name: "",
  recipient_phone: "",
  province: "",
  city: "",
  district: "",
  subdistrict: "",
  zipcode: "",
  street_address: "",
  notes: "",
  is_default: false,
};

export function Alamat() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AddressPayload>(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    addressApi
      .list()
      .then(setAddresses)
      .catch(() => setAddresses([]))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const startAdd = () => {
    setForm({ ...EMPTY, is_default: addresses.length === 0 });
    setEditingId(null);
    setShowForm(true);
  };

  const startEdit = (a: Address) => {
    setForm({
      label: a.label,
      recipient_name: a.recipient_name,
      recipient_phone: a.recipient_phone,
      province: a.province,
      city: a.city,
      district: a.district,
      subdistrict: a.subdistrict,
      zipcode: a.zipcode,
      street_address: a.street_address,
      notes: a.notes || "",
      is_default: a.is_default,
    });
    setEditingId(a.id);
    setShowForm(true);
  };

  const submit = async () => {
    // Basic validation
    for (const [k, v] of Object.entries(form)) {
      if (typeof v === "string" && k !== "notes" && !v.trim()) {
        toast.error("Semua field wajib diisi (kecuali catatan)");
        return;
      }
    }
    setSaving(true);
    try {
      if (editingId) {
        await addressApi.update(editingId, form);
        toast.success("Alamat diperbarui");
      } else {
        await addressApi.create(form);
        toast.success("Alamat ditambahkan");
      }
      setShowForm(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal simpan");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string, label: string) => {
    if (!confirm(`Hapus alamat "${label}"?`)) return;
    try {
      await addressApi.remove(id);
      toast.success("Alamat dihapus");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal hapus");
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="flex items-center gap-2 mb-4">
        <Link to="/akun" className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-cherry-50">
          <ArrowLeft size={16} />
        </Link>
        <h1 className="text-xl font-black text-ink-900">Alamat Pengiriman</h1>
      </div>

      {!showForm && (
        <button
          onClick={startAdd}
          className="w-full mb-4 flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-cherry-300 text-cherry-500 text-sm font-bold hover:bg-cherry-50"
        >
          <Plus size={16} />
          Tambah Alamat Baru
        </button>
      )}

      {showForm && (
        <div className="mb-4 bg-white border border-cherry-200 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-black text-ink-900">
              {editingId ? "Edit Alamat" : "Alamat Baru"}
            </h2>
            <button onClick={() => setShowForm(false)} className="text-ink-500 hover:text-ink-900">
              <X size={16} />
            </button>
          </div>
          <div className="flex flex-col gap-3">
            {[
              { key: "label" as const, ph: "Label (mis. Rumah, Kantor)" },
              { key: "recipient_name" as const, ph: "Nama Penerima" },
              { key: "recipient_phone" as const, ph: "No. HP Penerima" },
              { key: "province" as const, ph: "Provinsi" },
              { key: "city" as const, ph: "Kota / Kabupaten" },
              { key: "district" as const, ph: "Kecamatan" },
              { key: "subdistrict" as const, ph: "Kelurahan / Desa" },
              { key: "zipcode" as const, ph: "Kode Pos" },
            ].map((f) => (
              <input
                key={f.key}
                value={form[f.key] || ""}
                onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                placeholder={f.ph}
                className="px-4 py-2.5 rounded-xl border border-cherry-200 text-sm focus:outline-none focus:ring-2 focus:ring-cherry-500/30"
              />
            ))}
            <textarea
              value={form.street_address}
              onChange={(e) => setForm({ ...form, street_address: e.target.value })}
              placeholder="Alamat lengkap (jalan, nomor, blok, RT/RW)"
              rows={3}
              className="px-4 py-2.5 rounded-xl border border-cherry-200 text-sm focus:outline-none focus:ring-2 focus:ring-cherry-500/30 resize-y"
            />
            <input
              value={form.notes || ""}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Catatan untuk kurir (opsional)"
              className="px-4 py-2.5 rounded-xl border border-cherry-200 text-sm focus:outline-none focus:ring-2 focus:ring-cherry-500/30"
            />
            <label className="flex items-center gap-2 text-sm text-ink-900 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_default}
                onChange={(e) => setForm({ ...form, is_default: e.target.checked })}
                className="w-4 h-4 accent-cherry-500"
              />
              Jadikan alamat utama
            </label>
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 py-3 rounded-xl border border-cherry-200 text-sm font-bold text-ink-700"
              >
                Batal
              </button>
              <button
                onClick={submit}
                disabled={saving}
                className="flex-1 py-3 rounded-xl text-white text-sm font-bold bg-gradient-to-r from-cherry-400 to-cherry-500 disabled:opacity-60"
              >
                {saving ? "Menyimpan…" : "Simpan Alamat"}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-center text-ink-500 py-8">Memuat…</p>
      ) : addresses.length === 0 && !showForm ? (
        <div className="py-12 text-center text-ink-500">
          <MapPin size={40} className="mx-auto opacity-30 mb-2" />
          <p className="text-sm">Belum ada alamat tersimpan</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {addresses.map((a) => (
            <div
              key={a.id}
              className={`bg-white border rounded-2xl p-4 ${
                a.is_default ? "border-cherry-400" : "border-cherry-100"
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-ink-900">{a.label}</span>
                  {a.is_default && (
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-cherry-100 text-cherry-600 inline-flex items-center gap-1">
                      <Check size={10} />
                      Utama
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => startEdit(a)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-ink-700 hover:bg-cherry-50"
                    aria-label="Edit"
                  >
                    <Edit3 size={14} />
                  </button>
                  <button
                    onClick={() => remove(a.id, a.label)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-cherry-600 hover:bg-cherry-100"
                    aria-label="Hapus"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <p className="text-sm font-bold text-ink-900">{a.recipient_name}</p>
              <p className="text-xs text-ink-500 mb-1">{a.recipient_phone}</p>
              <p className="text-sm text-ink-700 leading-snug">
                {a.street_address}, {a.subdistrict}, {a.district}, {a.city}, {a.province}{" "}
                {a.zipcode}
              </p>
              {a.notes && <p className="text-xs text-ink-500 italic mt-1">"{a.notes}"</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
