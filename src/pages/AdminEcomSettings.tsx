// AdminEcomSettings — Sprint 4 Chunk 5 (31 Jul 2026).
// Konfigurasi storefront (min order, WA contact, announcement bar, payment
// toggles, store info). Singleton row di BE (id='default').

import { useEffect, useState } from "react";
import {
  Save, Loader2, Info, MessageCircle, ShoppingCart, Store,
  Megaphone, CreditCard, Mail, AlertCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import { adminApi, decodeToken, type EcomSettings } from "@/lib/api";
import { AdminShell } from "@/components/AdminShell";

const ECOM_ADMIN_ROLES = ["ecom_admin", "ecom_superadmin", "superadmin"];

export function AdminEcomSettings() {
  useEffect(() => {
    const claims = decodeToken();
    if (!claims || !ECOM_ADMIN_ROLES.includes(claims.role || "")) {
      window.location.href = "/";
    }
  }, []);

  const [data, setData] = useState<EcomSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    adminApi.getSettings()
      .then((s) => setData(s))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Gagal load"))
      .finally(() => setLoading(false));
  }, []);

  const patch = <K extends keyof EcomSettings>(k: K, v: EcomSettings[K]) => {
    if (!data) return;
    setData({ ...data, [k]: v });
    setDirty(true);
  };

  const save = async () => {
    if (!data) return;
    // Validate WA number kalau ada — normalize supaya konsisten E.164 Indonesia.
    if (data.wa_contact_number) {
      const digits = data.wa_contact_number.replace(/\D/g, "");
      if (digits.length < 9) {
        toast.error("Nomor WA tidak valid (min 9 digit)");
        return;
      }
    }
    if (data.announcement_bar_enabled && !(data.announcement_bar_text || "").trim()) {
      toast.error("Teks announcement bar wajib diisi kalau di-enable");
      return;
    }
    setSaving(true);
    try {
      const resp = await adminApi.updateSettings(data);
      setData(resp);
      setDirty(false);
      toast.success("Pengaturan tersimpan");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal simpan");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !data) {
    return (
      <AdminShell title="Pengaturan Storefront">
        <div className="py-16 text-center text-ink-500 text-sm">
          <Loader2 size={20} className="animate-spin mx-auto mb-2" />
          Memuat pengaturan…
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell
      title="Pengaturan Storefront"
      subtitle="Konfigurasi min order, kontak WA, banner, dan metode pembayaran."
      headerRight={
        <button
          type="button"
          onClick={save}
          disabled={saving || !dirty}
          className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl text-sm font-black text-white bg-gradient-to-r from-cherry-500 to-cherry-600 hover:from-cherry-600 hover:to-cherry-700 shadow disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {saving ? <><Loader2 size={14} className="animate-spin" />Menyimpan…</> : <><Save size={14} />Simpan</>}
        </button>
      }
    >
      <div className="max-w-3xl flex flex-col gap-4 pb-8">
        {dirty && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2 text-xs text-amber-800">
            <AlertCircle size={14} className="shrink-0 mt-0.5" aria-hidden="true" />
            <span>Ada perubahan yang belum disimpan. Klik <b>Simpan</b> di kanan atas.</span>
          </div>
        )}

        {/* Section: Store Info */}
        <Section icon={<Store size={16} />} title="Info Toko" desc="Muncul di email order + slip pengiriman.">
          <Field label="Nama Toko" required>
            <input
              type="text"
              value={data.store_name}
              onChange={(e) => patch("store_name", e.target.value)}
              className="w-full h-11 px-3 rounded-xl border border-cherry-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-cherry-500/30"
            />
          </Field>
          <Field label="Email Toko" hint="Untuk reply-to email order confirmation.">
            <input
              type="email"
              value={data.store_email || ""}
              onChange={(e) => patch("store_email", e.target.value)}
              placeholder="cs@tbksanti.id"
              className="w-full h-11 px-3 rounded-xl border border-cherry-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-cherry-500/30"
            />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Alamat Pickup" hint="Kurir jemput di sini.">
              <textarea
                value={data.store_pickup_address || ""}
                onChange={(e) => patch("store_pickup_address", e.target.value)}
                rows={3}
                placeholder="Jl. Contoh No. 123, Kel. …"
                className="w-full px-3 py-2 rounded-xl border border-cherry-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-cherry-500/30 resize-none"
              />
            </Field>
            <div className="flex flex-col gap-3">
              <Field label="No HP Pickup">
                <input
                  type="tel"
                  value={data.store_pickup_phone || ""}
                  onChange={(e) => patch("store_pickup_phone", e.target.value)}
                  placeholder="0812…"
                  className="w-full h-11 px-3 rounded-xl border border-cherry-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-cherry-500/30"
                />
              </Field>
              <Field label="Biteship Area ID" hint="ID area toko untuk hitung ongkir kurir.">
                <input
                  type="text"
                  value={data.store_pickup_area_id || ""}
                  onChange={(e) => patch("store_pickup_area_id", e.target.value)}
                  placeholder="IDNP6IDNC115IDND2222"
                  className="w-full h-11 px-3 rounded-xl border border-cherry-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-cherry-500/30 font-mono"
                />
              </Field>
            </div>
          </div>
        </Section>

        {/* Section: Checkout Rules */}
        <Section icon={<ShoppingCart size={16} />} title="Aturan Checkout" desc="Batasan minimum order untuk customer.">
          <Field label="Minimum Order (Rp)" hint="Checkout ditolak kalau subtotal < ini. 0 = tidak ada minimum.">
            <input
              type="number"
              inputMode="numeric"
              value={data.min_order_amount || 0}
              onChange={(e) => patch("min_order_amount", Number(e.target.value) || 0)}
              min={0}
              step={10000}
              className="w-full h-11 px-3 rounded-xl border border-cherry-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-cherry-500/30 tabular-nums"
            />
          </Field>
        </Section>

        {/* Section: WhatsApp Contact */}
        <Section icon={<MessageCircle size={16} />} title="Kontak WhatsApp" desc="Nomor untuk floating button WA di storefront.">
          <Field label="Nomor WhatsApp" hint="Format Indonesia (08xxx atau 628xxx). Diconvert otomatis ke wa.me link.">
            <input
              type="tel"
              value={data.wa_contact_number}
              onChange={(e) => patch("wa_contact_number", e.target.value)}
              placeholder="6281574273040"
              className="w-full h-11 px-3 rounded-xl border border-cherry-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-cherry-500/30 tabular-nums"
            />
          </Field>
          <Field label="Teks default pesan" hint="Auto-fill kalau customer klik floating WA button.">
            <textarea
              value={data.wa_pretext || ""}
              onChange={(e) => patch("wa_pretext", e.target.value)}
              rows={2}
              maxLength={200}
              placeholder="Halo Bu Santi, saya customer TBK Santi. Mau tanya..."
              className="w-full px-3 py-2 rounded-xl border border-cherry-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-cherry-500/30 resize-none"
            />
          </Field>
        </Section>

        {/* Section: Announcement Bar */}
        <Section icon={<Megaphone size={16} />} title="Announcement Bar" desc="Banner sticky di atas storefront (mis. flash sale, gratis ongkir).">
          <label className="flex items-start gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={data.announcement_bar_enabled}
              onChange={(e) => patch("announcement_bar_enabled", e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-cherry-500"
            />
            <div>
              <p className="text-sm font-black text-ink-900">Aktifkan announcement bar</p>
              <p className="text-xs text-ink-500">Muncul di semua halaman customer, di atas header.</p>
            </div>
          </label>
          {data.announcement_bar_enabled && (
            <div className="pl-6 flex flex-col gap-3 border-l-2 border-cherry-200 mt-2">
              <Field label="Teks banner" required>
                <input
                  type="text"
                  value={data.announcement_bar_text || ""}
                  onChange={(e) => patch("announcement_bar_text", e.target.value)}
                  maxLength={200}
                  placeholder="Gratis ongkir untuk pembelian di atas Rp 200.000!"
                  className="w-full h-11 px-3 rounded-xl border border-cherry-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-cherry-500/30"
                />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Label CTA (opsional)">
                  <input
                    type="text"
                    value={data.announcement_bar_cta_label || ""}
                    onChange={(e) => patch("announcement_bar_cta_label", e.target.value)}
                    maxLength={50}
                    placeholder="Lihat produk"
                    className="w-full h-11 px-3 rounded-xl border border-cherry-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-cherry-500/30"
                  />
                </Field>
                <Field label="URL CTA (opsional)">
                  <input
                    type="text"
                    value={data.announcement_bar_cta_url || ""}
                    onChange={(e) => patch("announcement_bar_cta_url", e.target.value)}
                    placeholder="/kategori/tepung"
                    className="w-full h-11 px-3 rounded-xl border border-cherry-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-cherry-500/30 font-mono"
                  />
                </Field>
              </div>
            </div>
          )}
        </Section>

        {/* Section: Payment Methods */}
        <Section icon={<CreditCard size={16} />} title="Metode Pembayaran" desc="Toggle channel yang tersedia untuk customer di checkout.">
          <ToggleRow
            label="Payment Gateway DOKU"
            desc="VA, QRIS, e-wallet, kartu kredit."
            checked={data.payment_pg_enabled}
            onChange={(v) => patch("payment_pg_enabled", v)}
          />
          <ToggleRow
            label="Transfer Manual"
            desc="Customer transfer ke rekening + upload bukti."
            checked={data.payment_manual_enabled}
            onChange={(v) => patch("payment_manual_enabled", v)}
          />
          {!data.payment_pg_enabled && !data.payment_manual_enabled && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-2.5 text-xs text-red-700 flex items-start gap-2">
              <AlertCircle size={12} className="shrink-0 mt-0.5" aria-hidden="true" />
              Minimal salah satu metode pembayaran harus aktif, kalau tidak customer tidak bisa checkout.
            </div>
          )}
        </Section>

        {/* Section: Notification */}
        <Section icon={<Mail size={16} />} title="Notifikasi" desc="Toggle email + push saat status order berubah.">
          <ToggleRow
            label="Email Konfirmasi Order"
            desc="Kirim email ke customer setelah order sukses + saat status berubah (paid/shipped/delivered)."
            checked={data.notif_order_email_enabled}
            onChange={(v) => patch("notif_order_email_enabled", v)}
          />
        </Section>

        {/* Bottom save (mobile — supaya tidak perlu scroll ke atas) */}
        <div className="sm:hidden mt-2">
          <button
            type="button"
            onClick={save}
            disabled={saving || !dirty}
            className="w-full h-12 rounded-xl text-sm font-black text-white bg-gradient-to-r from-cherry-500 to-cherry-600 hover:from-cherry-600 hover:to-cherry-700 shadow disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {saving ? <><Loader2 size={14} className="animate-spin" />Menyimpan…</> : <><Save size={14} />Simpan</>}
          </button>
        </div>

        {/* Info footer */}
        <div className="mt-2 bg-cherry-50/60 border border-cherry-100 rounded-xl p-3 text-xs text-ink-700 flex items-start gap-2">
          <Info size={12} className="shrink-0 mt-0.5 text-cherry-500" aria-hidden="true" />
          <div>
            <b>Catatan:</b> perubahan langsung berlaku untuk semua customer setelah Simpan.
            Kalau ada masalah, contact developer via WhatsApp.
          </div>
        </div>
      </div>
    </AdminShell>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────

function Section({
  icon, title, desc, children,
}: {
  icon: React.ReactNode; title: string; desc: string; children: React.ReactNode;
}) {
  return (
    <section className="bg-white border border-cherry-100 rounded-2xl p-5 flex flex-col gap-3">
      <div className="flex items-start gap-3 pb-2 border-b border-cherry-100">
        <div className="w-9 h-9 rounded-lg bg-cherry-50 text-cherry-500 flex items-center justify-center shrink-0">
          {icon}
        </div>
        <div className="min-w-0">
          <h2 className="text-sm font-black text-ink-900">{title}</h2>
          <p className="text-xs text-ink-500 mt-0.5">{desc}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function Field({
  label, hint, required, children,
}: {
  label: string; hint?: string; required?: boolean; children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-black uppercase tracking-wider text-ink-500 mb-1">
        {label} {required && <span className="text-cherry-500">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-ink-500 mt-1">{hint}</p>}
    </div>
  );
}

function ToggleRow({
  label, desc, checked, onChange,
}: {
  label: string; desc: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3 p-3 rounded-xl border border-cherry-100 hover:bg-cherry-50/40 cursor-pointer select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 w-4 h-4 accent-cherry-500"
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-black text-ink-900">{label}</p>
        <p className="text-xs text-ink-500">{desc}</p>
      </div>
    </label>
  );
}
