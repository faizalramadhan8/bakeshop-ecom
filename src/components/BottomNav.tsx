import { NavLink } from "react-router-dom";
import { Home as HomeIcon, LayoutGrid, ShoppingBag, Receipt, User } from "lucide-react";

// Mobile-only bottom nav — 5 tabs (Material Design bottom-nav-limit).
// Hidden pada sm+ (768px) supaya desktop pakai header actions.
export function BottomNav() {
  const items = [
    { to: "/", icon: HomeIcon, label: "Home" },
    { to: "/kategori", icon: LayoutGrid, label: "Kategori" },
    { to: "/keranjang", icon: ShoppingBag, label: "Cart" },
    { to: "/pesanan", icon: Receipt, label: "Order" },
    { to: "/akun", icon: User, label: "Akun" },
  ];

  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-cherry-100 shadow-[0_-4px_20px_rgba(0,0,0,0.04)]">
      <div
        className="grid grid-cols-5 max-w-md mx-auto"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {items.map((it) => (
          <NavLink
            key={it.to}
            to={it.to}
            end={it.to === "/"}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-0.5 py-2 min-h-[56px] transition-colors ${
                isActive ? "text-cherry-500" : "text-ink-700"
              }`
            }
          >
            <it.icon size={20} />
            <span className="text-xs font-semibold">{it.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
