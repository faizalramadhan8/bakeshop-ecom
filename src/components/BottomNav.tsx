import { NavLink } from "react-router-dom";
import { Home as HomeIcon, LayoutGrid, ShoppingBag, Receipt, User } from "lucide-react";
import { useCart } from "@/lib/cartStore";

// Mobile-only bottom nav — 5 tabs (Material Design bottom-nav-limit).
// Hidden pada sm+ (768px) supaya desktop pakai header actions.
export function BottomNav() {
  const { cart } = useCart();
  const cartCount = cart?.total_qty || 0;
  const items = [
    { to: "/", icon: HomeIcon, label: "Home", badge: 0 },
    { to: "/kategori", icon: LayoutGrid, label: "Kategori", badge: 0 },
    { to: "/keranjang", icon: ShoppingBag, label: "Cart", badge: cartCount },
    { to: "/pesanan", icon: Receipt, label: "Order", badge: 0 },
    { to: "/akun", icon: User, label: "Akun", badge: 0 },
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
              `relative flex flex-col items-center justify-center gap-0.5 py-2 min-h-[56px] transition-colors ${
                isActive ? "text-cherry-500" : "text-ink-700"
              }`
            }
          >
            <div className="relative">
              <it.icon size={20} />
              {it.badge > 0 && (
                <span className="absolute -top-1.5 -right-2 min-w-[16px] h-[16px] px-1 rounded-full bg-gradient-to-br from-cherry-400 to-cherry-500 text-white text-xs font-black flex items-center justify-center leading-none">
                  {it.badge > 99 ? "99+" : it.badge}
                </span>
              )}
            </div>
            <span className="text-xs font-semibold">{it.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
