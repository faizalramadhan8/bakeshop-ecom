import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Plus, MapPin, Trash2, Edit3, Check, X, Loader2, Navigation, Search } from "lucide-react";
import toast from "react-hot-toast";
import { addressApi, shippingApi, type Address, type AddressPayload, type BiteshipArea } from "@/lib/api";

// Reverse-geocode lat/lng → address fields via Nominatim (OpenStreetMap, gratis).
// Rate limit 1 request/detik — cukup untuk single-user click. Kalau nanti butuh
// scale, ganti ke Google Geocoding API atau host Nominatim sendiri.
async function reverseGeocode(lat: number, lng: number): Promise<Partial<AddressPayload>> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=id`;
  const res = await fetch(url, {
    headers: { "User-Agent": "TBK-Santi-Ecom/1.0 (tbksanti.id)" },
  });
  if (!res.ok) throw new Error("Gagal cari alamat");
  const data = await res.json();
  const a = data.address || {};
  // OSM address parts (varies per country/region). Untuk Indonesia:
  //   state → Provinsi
  //   city / town / regency → Kota/Kabupaten
  //   suburb / city_district / district → Kecamatan
  //   village / neighbourhood → Kelurahan/Desa
  //   road + house_number → Alamat jalan
  //   postcode → Kode pos
  const road = [a.road, a.house_number].filter(Boolean).join(" No. ");
  return {
    province: a.state || "",
    city: a.city || a.town || a.county || a.regency || "",
    district: a.suburb || a.city_district || a.district || "",
    subdistrict: a.village || a.hamlet || a.neighbourhood || a.quarter || "",
    zipcode: a.postcode || "",
    street_address: road || data.display_name?.split(",").slice(0, 2).join(", ") || "",
  };
}

const EMPTY: AddressPayload = {
  label: "Rumah",
  recipient_name: "",
  recipient_phone: "",
  province: "",
  city: "",
  district: "",
  subdistrict: "",
  zipcode: "",
  biteship_area_id: undefined,
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
  const [locating, setLocating] = useState(false);

  // Biteship Maps autocomplete state — debounced fetch supaya tidak spam
  // Biteship (docs: trigger after user finished typing).
  const [areaQuery, setAreaQuery] = useState("");
  const [areaResults, setAreaResults] = useState<BiteshipArea[]>([]);
  const [areaLoading, setAreaLoading] = useState(false);
  const [areaOpen, setAreaOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!areaOpen) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (areaQuery.trim().length < 3) {
      setAreaResults([]);
      return;
    }
    debounceRef.current = setTimeout(() => {
      setAreaLoading(true);
      shippingApi.searchAreas(areaQuery.trim())
        .then((rows) => setAreaResults(rows || []))
        .catch(() => setAreaResults([]))
        .finally(() => setAreaLoading(false));
    }, 300);
  }, [areaQuery, areaOpen]);

  const pickArea = (a: BiteshipArea) => {
    setForm((prev) => ({
      ...prev,
      biteship_area_id: a.id,
      province: a.administrative_division_level_1_name,
      city: a.administrative_division_level_2_name,
      subdistrict: a.administrative_division_level_3_name,
      // Biteship API tidak provide "district" (kecamatan) separately —
      // fallback pakai city sebagai display. Customer bisa edit manual.
      district: prev.district || a.administrative_division_level_3_name,
      zipcode: String(a.postal_code),
    }));
    setAreaQuery(a.name);
    setAreaOpen(false);
  };

  // Geolocation → reverse-geocode → autofill province/city/district/subdistrict/zip/street.
  // Manual fields tetap editable — user boleh koreksi hasil auto-fill.
  const useCurrentLocation = () => {
    if (!("geolocation" in navigator)) {
      toast.error("Browser tidak support geolocation");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const parts = await reverseGeocode(latitude, longitude);
          setForm((prev) => ({
            ...prev,
            ...parts,
            // Simpan lat/lng juga (walaupun tidak dipakai display, useful untuk
            // future map picker / Biteship instant courier accuracy).
          }));
          toast.success("Alamat dari lokasi berhasil di-isi");
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Gagal cari alamat");
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        setLocating(false);
        const msg =
          err.code === 1 ? "Izin lokasi ditolak. Aktifkan di setting browser."
          : err.code === 2 ? "Lokasi tidak bisa diambil (GPS off?)"
          : "Timeout. Coba lagi.";
        toast.error(msg);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

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
    setAreaQuery("");
    setAreaResults([]);
    setAreaOpen(false);
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
      biteship_area_id: a.biteship_area_id,
      street_address: a.street_address,
      notes: a.notes || "",
      is_default: a.is_default,
    });
    // Pre-fill areaQuery kalau ada area_id (address sudah presisi) supaya
    // combobox tampil hasil sebelumnya, tidak kosong.
    if (a.biteship_area_id) {
      setAreaQuery(`${a.subdistrict}, ${a.city}, ${a.province}. ${a.zipcode}`);
    } else {
      setAreaQuery("");
    }
    setAreaResults([]);
    setAreaOpen(false);
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

          {/* Quick-fill via geolocation. Nominatim reverse-geocode OSM (free).
              User bisa koreksi manual setelah auto-fill. */}
          <button
            onClick={useCurrentLocation}
            disabled={locating}
            type="button"
            className="w-full mb-3 flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-cherry-300 text-cherry-500 text-sm font-bold hover:bg-cherry-50 disabled:opacity-60"
          >
            {locating ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Mengambil lokasi…
              </>
            ) : (
              <>
                <Navigation size={14} />
                Gunakan Lokasi Saya
              </>
            )}
          </button>
          <p className="text-xs text-ink-500 mb-3">
            Isi otomatis dari GPS. Cek dan koreksi manual kalau kurang tepat.
          </p>

          <div className="flex flex-col gap-3">
            {/* Label + penerima — 3 field manual di atas */}
            {[
              { key: "label" as const, ph: "Label (mis. Rumah, Kantor)" },
              { key: "recipient_name" as const, ph: "Nama Penerima" },
              { key: "recipient_phone" as const, ph: "No. HP Penerima" },
            ].map((f) => (
              <input
                key={f.key}
                value={form[f.key] || ""}
                onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                placeholder={f.ph}
                className="px-4 py-2.5 rounded-xl border border-cherry-200 text-sm focus:outline-none focus:ring-2 focus:ring-cherry-500/30"
              />
            ))}

            {/* Combobox Cari Kelurahan — auto-fill 5 field lokasi + area_id
                Biteship (unlock coverage kurir Anteraja/Ninja/ID Express).
                Debounce 300ms, min 3 char. */}
            <div className="relative">
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-cherry-200 focus-within:ring-2 focus-within:ring-cherry-500/30">
                <Search size={14} className="text-cherry-500 shrink-0" aria-hidden="true" />
                <input
                  value={areaQuery}
                  onChange={(e) => {
                    setAreaQuery(e.target.value);
                    setAreaOpen(true);
                    // Reset area_id kalau user retype — cegah stale mapping.
                    if (form.biteship_area_id) {
                      setForm((prev) => ({ ...prev, biteship_area_id: undefined }));
                    }
                  }}
                  onFocus={() => setAreaOpen(true)}
                  placeholder="Cari kelurahan / kecamatan / kota..."
                  className="flex-1 text-sm focus:outline-none bg-transparent"
                />
                {areaLoading && <Loader2 size={12} className="animate-spin text-ink-500" aria-hidden="true" />}
              </div>
              {form.biteship_area_id ? (
                <p className="text-xs text-cherry-600 mt-1 flex items-center gap-1">
                  <Check size={11} aria-hidden="true" />
                  Alamat sudah tepat
                </p>
              ) : (
                <p className="text-xs text-ink-500 mt-1">
                  Pilih dari hasil pencarian supaya pilihan kurir lebih lengkap.
                </p>
              )}

              {areaOpen && areaResults.length > 0 && (
                <div className="absolute z-30 left-0 right-0 top-full mt-1 bg-white border border-cherry-200 rounded-xl shadow-lg max-h-72 overflow-y-auto">
                  {areaResults.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => pickArea(a)}
                      className="w-full text-left px-3 py-2.5 hover:bg-cherry-50 border-b border-cherry-100 last:border-0"
                    >
                      <p className="text-sm font-bold text-ink-900 truncate">{a.administrative_division_level_3_name}</p>
                      <p className="text-xs text-ink-500 truncate">
                        {a.administrative_division_level_2_name}, {a.administrative_division_level_1_name}. {a.postal_code}
                      </p>
                    </button>
                  ))}
                </div>
              )}

              {areaOpen && !areaLoading && areaQuery.trim().length >= 3 && areaResults.length === 0 && (
                <div className="absolute z-30 left-0 right-0 top-full mt-1 bg-white border border-cherry-200 rounded-xl shadow-lg p-3 text-xs text-ink-500">
                  Tidak ada hasil. Coba kata kunci lain, atau isi field manual di bawah.
                </div>
              )}
            </div>

            {/* Manual field override — collapsible, tampil kalau user perlu
                edit hasil pilih (mis. kecamatan berbeda dari district level 3
                Biteship, atau customer koreksi zipcode). */}
            <details className="rounded-xl border border-cherry-100 bg-cherry-50/40">
              <summary className="cursor-pointer text-xs font-bold text-ink-700 px-3 py-2">
                Edit manual field lokasi
              </summary>
              <div className="p-3 pt-0 flex flex-col gap-2">
                {[
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
                    className="px-3 py-2 rounded-lg border border-cherry-200 text-sm focus:outline-none focus:ring-2 focus:ring-cherry-500/30 bg-white"
                  />
                ))}
              </div>
            </details>
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
        <div className="py-14 text-center">
          <div className="w-20 h-20 rounded-full bg-cherry-50 mx-auto mb-4 flex items-center justify-center">
            <MapPin size={40} className="text-cherry-300" aria-hidden="true" />
          </div>
          <p className="text-base font-black text-ink-900 mb-1">Belum ada alamat</p>
          <p className="text-sm text-ink-500 max-w-xs mx-auto leading-relaxed">
            Tambahkan alamat pengiriman supaya proses checkout jadi lebih cepat.
          </p>
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
