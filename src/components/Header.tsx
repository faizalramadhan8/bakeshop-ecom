import { Link } from "react-router-dom";
import { Search, ShoppingBag, User } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export function Header() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim()) navigate(`/cari?q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-cherry-100">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
        {/* Logo */}
        <Link to="/" className="shrink-0 flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cherry-300 to-cherry-500 flex items-center justify-center">
            <span className="text-white font-black text-sm">S</span>
          </div>
          <span className="hidden sm:block font-black text-sm text-ink-900 tracking-tight">
            Santi
          </span>
        </Link>

        {/* Search */}
        <form onSubmit={submit} className="flex-1 relative">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-500 pointer-events-none"
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari bahan kue…"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-cherry-200 bg-cherry-50 text-sm focus:outline-none focus:ring-2 focus:ring-cherry-500/30 focus:border-cherry-400 focus:bg-white"
          />
        </form>

        {/* Actions */}
        <div className="hidden sm:flex items-center gap-1">
          <Link
            to="/keranjang"
            aria-label="Keranjang"
            className="w-10 h-10 rounded-xl flex items-center justify-center text-ink-700 hover:bg-cherry-50 hover:text-cherry-500 transition-colors"
          >
            <ShoppingBag size={18} />
          </Link>
          <Link
            to="/akun"
            aria-label="Akun"
            className="w-10 h-10 rounded-xl flex items-center justify-center text-ink-700 hover:bg-cherry-50 hover:text-cherry-500 transition-colors"
          >
            <User size={18} />
          </Link>
        </div>
      </div>
    </header>
  );
}
