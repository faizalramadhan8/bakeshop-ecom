import { Link } from "react-router-dom";
import { MapPin, Receipt, LogOut, ChevronRight, User } from "lucide-react";
import { decodeToken, setToken } from "@/lib/api";

export function Akun() {
  const claims = decodeToken();
  const email = claims?.email || "";
  const fullname = claims?.fullname || "Customer";

  const menu = [
    { to: "/akun/alamat", icon: MapPin, label: "Alamat Pengiriman", desc: "Kelola alamat kirim" },
    { to: "/pesanan", icon: Receipt, label: "Pesanan Saya", desc: "Riwayat + status order" },
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

      {/* Menu */}
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
