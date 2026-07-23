import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Package, ShoppingCart, Users, TrendingUp, LogOut } from "lucide-react";
import { getAdminToken, setAdminToken } from "@/lib/api";

export function AdminDashboard() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!getAdminToken()) navigate("/admin/login", { replace: true });
  }, [navigate]);

  const cards = [
    {
      to: "/admin/produk",
      icon: <Package size={20} />,
      title: "Produk Online",
      desc: "Manage stok, harga, deskripsi produk yang tampil di storefront",
    },
    {
      to: "#",
      icon: <ShoppingCart size={20} />,
      title: "Pesanan Online",
      desc: "Terima + proses order dari customer",
      disabled: true,
    },
    {
      to: "#",
      icon: <Users size={20} />,
      title: "Customer",
      desc: "Daftar customer registered + riwayat order",
      disabled: true,
    },
    {
      to: "#",
      icon: <TrendingUp size={20} />,
      title: "Laporan",
      desc: "Revenue, conversion, top produk online",
      disabled: true,
    },
  ];

  return (
    <main className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-black text-ink-900">Ecom Admin</h1>
            <p className="text-sm text-ink-700 mt-0.5">Toko Bahan Kue Santi</p>
          </div>
          <button
            onClick={() => {
              setAdminToken(null);
              navigate("/admin/login");
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border border-cherry-200 text-ink-700 hover:bg-cherry-50 transition-colors"
          >
            <LogOut size={14} />
            Keluar
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((c) => (
            <Link
              key={c.title}
              to={c.disabled ? "#" : c.to}
              onClick={(e) => c.disabled && e.preventDefault()}
              className={`block bg-white rounded-2xl border p-5 transition-all ${
                c.disabled
                  ? "border-cherry-100 opacity-50 cursor-not-allowed"
                  : "border-cherry-200 hover:border-cherry-400 hover:shadow-md"
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-cherry-100 text-cherry-500 flex items-center justify-center mb-3">
                {c.icon}
              </div>
              <h2 className="text-base font-black text-ink-900 mb-1">{c.title}</h2>
              <p className="text-xs text-ink-700 leading-relaxed">{c.desc}</p>
              {c.disabled && (
                <p className="text-xs text-cherry-600 font-bold mt-2">Segera hadir</p>
              )}
            </Link>
          ))}
        </div>

        <div className="mt-8 bg-cherry-50 rounded-2xl border border-cherry-200 p-5">
          <h3 className="text-sm font-black text-ink-900 mb-2">v0.1 · Fase 1 skeleton</h3>
          <p className="text-xs text-ink-700 leading-relaxed">
            Sekarang bisa manage produk online (allocate stok + set harga).
            Fitur order, customer, laporan menyusul di fase berikutnya.
          </p>
        </div>
      </div>
    </main>
  );
}
