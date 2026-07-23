import { Link } from "react-router-dom";
import { ShoppingBag, LayoutDashboard } from "lucide-react";

export function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 gap-6">
      <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-cherry-300 to-cherry-500 shadow-lg flex items-center justify-center">
        <span className="text-white font-black text-3xl">S</span>
      </div>
      <div className="text-center max-w-md">
        <h1 className="text-3xl font-black tracking-tight text-ink-900 mb-2">
          Toko Bahan Kue Santi
        </h1>
        <p className="text-base text-ink-700">
          Storefront online sedang disiapkan. Kunjungi kami segera.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mt-4 w-full max-w-md">
        <Link
          to="/"
          className="flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-2xl text-white font-bold bg-gradient-to-r from-cherry-400 to-cherry-500 hover:opacity-90 transition-opacity"
        >
          <ShoppingBag size={18} />
          Lihat Katalog
        </Link>
        <Link
          to="/admin/login"
          className="flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-bold border-2 border-cherry-500 text-cherry-500 hover:bg-cherry-50 transition-colors"
        >
          <LayoutDashboard size={18} />
          Admin
        </Link>
      </div>

      <p className="text-xs text-ink-500 mt-8">v0.1 · Fase 1 skeleton</p>
    </main>
  );
}
