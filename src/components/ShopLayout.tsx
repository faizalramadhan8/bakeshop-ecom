import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { Header } from "./Header";
import { BottomNav } from "./BottomNav";
import { FloatingWA } from "./FloatingWA";
import { decodeToken } from "@/lib/api";

// Layout untuk semua public storefront routes: Header sticky + main + BottomNav.
// Bu Santi 21 Jul 2026: login-first flow — kalau customer buka /shop tanpa
// JWT, redirect ke POS login (`tbksanti.id/`). Storefront jadi private.
export function ShopLayout() {
  const [ok, setOk] = useState<boolean | null>(null);

  useEffect(() => {
    const claims = decodeToken();
    if (!claims) {
      window.location.href = "/";
      return;
    }
    // Role check: user + superadmin bisa akses storefront.
    // (ecom_admin/superadmin harusnya di /shop/admin, tapi biarkan bisa
    // browse juga kalau mau — read-only test.)
    const role = claims.role || "";
    const allowed = ["user", "superadmin", "ecom_admin", "ecom_superadmin"].includes(role);
    if (!allowed) {
      // Kasir/staff/admin POS accidentally hit /shop → back to POS.
      window.location.href = "/";
      return;
    }
    setOk(true);
  }, []);

  if (ok === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-ink-500">Memuat…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col pb-20 sm:pb-0">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <BottomNav />
      <FloatingWA />
    </div>
  );
}
