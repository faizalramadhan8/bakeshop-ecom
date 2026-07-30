import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MapPin, Receipt, LogOut, ChevronRight, User, UserCog, Heart, Bell, BellOff, Loader2, Info, HelpCircle, FileText, Shield } from "lucide-react";
import toast from "react-hot-toast";
import { decodeToken, setToken } from "@/lib/api";
import { isSubscribed, requestPushPermission, unsubscribeFromPush, pushSupported } from "@/lib/push";

export function Akun() {
  const claims = decodeToken();
  const email = claims?.email || "";
  const fullname = claims?.fullname || "Customer";

  // Sprint 2 #5: notification state
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);
  const notifSupported = pushSupported();

  useEffect(() => {
    if (!notifSupported) return;
    isSubscribed().then(setNotifEnabled);
  }, [notifSupported]);

  const toggleNotif = async () => {
    setNotifLoading(true);
    try {
      if (notifEnabled) {
        const r = await unsubscribeFromPush();
        if (r.success) {
          setNotifEnabled(false);
          toast.success("Notifikasi dimatikan");
        } else {
          toast.error(r.message || "Gagal matikan notifikasi");
        }
      } else {
        const r = await requestPushPermission();
        if (r.success) {
          setNotifEnabled(true);
          toast.success("Notifikasi aktif. Kamu akan dapat update pesanan.");
        } else {
          toast.error(r.message || "Gagal aktifkan notifikasi");
        }
      }
    } finally {
      setNotifLoading(false);
    }
  };

  const menu = [
    { to: "/akun/profil", icon: UserCog, label: "Profil & Password", desc: "Ubah nama, HP, password" },
    { to: "/akun/alamat", icon: MapPin,  label: "Alamat Pengiriman", desc: "Kelola alamat kirim" },
    { to: "/pesanan",     icon: Receipt, label: "Pesanan Saya",      desc: "Riwayat & Status Order" },
    { to: "/wishlist",    icon: Heart,   label: "Wishlist",           desc: "Produk favorit untuk dibeli nanti" },
  ];

  // Sprint 3 #11 — link ke static pages (legal + info)
  const infoMenu = [
    { to: "/tentang",           icon: Info,       label: "Tentang Kami",      desc: "Cerita toko + alamat + kontak" },
    { to: "/faq",               icon: HelpCircle, label: "FAQ",               desc: "Tanya jawab yang sering ditanya" },
    { to: "/syarat-ketentuan",  icon: FileText,   label: "Syarat & Ketentuan", desc: "Aturan penggunaan website" },
    { to: "/kebijakan-privasi", icon: Shield,     label: "Kebijakan Privasi", desc: "Bagaimana data kamu dijaga" },
  ];

  return (
    <div className="max-w-2xl mx-auto p-4">
      {/* Profile summary */}
      <div className="bg-white border border-cherry-200 rounded-2xl p-4 flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cherry-300 to-cherry-500 flex items-center justify-center">
          <User size={20} className="text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-ink-900 truncate">{fullname}</p>
          <p className="text-xs text-ink-500 truncate">{email}</p>
        </div>
      </div>

      {/* Sprint 2 #5 — Notification toggle card. Muncul cuma kalau browser
          support push (Chrome, Edge, Firefox mobile; iOS Safari 16.4+). */}
      {notifSupported && (
        <button
          type="button"
          onClick={toggleNotif}
          disabled={notifLoading}
          className="w-full bg-white border border-cherry-200 rounded-2xl p-4 mb-4 flex items-center gap-3 hover:bg-cherry-50/50 transition-colors text-left disabled:opacity-60"
        >
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              notifEnabled ? "bg-cherry-500 text-white" : "bg-cherry-100 text-cherry-500"
            }`}
          >
            {notifLoading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : notifEnabled ? (
              <Bell size={18} />
            ) : (
              <BellOff size={18} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-ink-900">
              {notifEnabled ? "Notifikasi Aktif" : "Aktifkan Notifikasi"}
            </p>
            <p className="text-xs text-ink-500">
              {notifEnabled
                ? "Kamu akan dapat update status pesanan langsung di HP."
                : "Dapat notif saat pesanan dibayar, dikirim, dan sampai."}
            </p>
          </div>
          {/* Toggle switch visual */}
          <div
            className={`w-11 h-6 rounded-full transition-colors shrink-0 relative ${
              notifEnabled ? "bg-cherry-500" : "bg-cherry-200"
            }`}
            aria-hidden="true"
          >
            <span
              className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                notifEnabled ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </div>
        </button>
      )}

      {/* Menu utama — akun & transaksi */}
      <div className="bg-white border border-cherry-200 rounded-2xl overflow-hidden">
        {menu.map((m, idx) => (
          <Link
            key={m.to}
            to={m.to}
            className={`flex items-center gap-3 px-4 py-3.5 hover:bg-cherry-50 transition-colors ${
              idx > 0 ? "border-t border-cherry-100" : ""
            }`}
          >
            <div className="w-9 h-9 rounded-xl bg-cherry-100 text-cherry-500 flex items-center justify-center shrink-0">
              <m.icon size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-ink-900">{m.label}</p>
              <p className="text-xs text-ink-500">{m.desc}</p>
            </div>
            <ChevronRight size={16} className="text-ink-500 shrink-0" />
          </Link>
        ))}
      </div>

      {/* Sprint 3 #11 — info & legal pages. Grouped terpisah supaya
          menu utama tidak tercampur dengan link static. */}
      <p className="text-xs font-black uppercase tracking-wider text-ink-500 mt-6 mb-2 px-1">
        Informasi
      </p>
      <div className="bg-white border border-cherry-200 rounded-2xl overflow-hidden">
        {infoMenu.map((m, idx) => (
          <Link
            key={m.to}
            to={m.to}
            className={`flex items-center gap-3 px-4 py-3.5 hover:bg-cherry-50 transition-colors ${
              idx > 0 ? "border-t border-cherry-100" : ""
            }`}
          >
            <div className="w-9 h-9 rounded-xl bg-cherry-50 text-cherry-500 flex items-center justify-center shrink-0">
              <m.icon size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-ink-900">{m.label}</p>
              <p className="text-xs text-ink-500">{m.desc}</p>
            </div>
            <ChevronRight size={16} className="text-ink-500 shrink-0" />
          </Link>
        ))}
      </div>

      <button
        onClick={() => {
          setToken(null);
          window.location.href = "/";
        }}
        className="w-full mt-4 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold border border-cherry-200 text-ink-700 hover:bg-cherry-50 transition-colors"
      >
        <LogOut size={14} />
        Keluar
      </button>
    </div>
  );
}
