// AdminShell — layout persistent untuk semua page /admin/*.
// Sprint 4 foundation (30 Jul 2026, Chunk 0).
//
// Struktur:
//   Desktop (>= lg): sidebar fixed kiri 240px + main content + topbar sticky
//   Mobile (< lg):   topbar sticky + hamburger → drawer slide-in
//
// Fitur:
//   - Nav consistent tiap page (tidak perlu "back to dashboard")
//   - Active state indicator (background cherry + border)
//   - Badge count auto-fetch dari /ecom/admin/dashboard (paid orders, pending complaints, low stock)
//   - Breadcrumb otomatis dari `title` + optional `parents` prop
//   - Logout + POS quick-jump di sidebar footer

import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Package, Tag, Ticket, ShoppingCart,
  MessageSquare, Star, Users, TrendingUp, Settings,
  LogOut, Menu, X, ChevronRight, ArrowLeftRight, Bell, History,
} from "lucide-react";
import { setToken, decodeToken, adminApi, type EcomAdminDashboardStats } from "@/lib/api";

type NavItem = {
  to: string;
  icon: ReactNode;
  label: string;
  badgeKey?: "paid" | "complaints" | "lowStock";
};

// Nav master — SATU source of truth untuk sidebar + breadcrumb + notif logic.
const NAV_ITEMS: NavItem[] = [
  { to: "/admin", icon: <LayoutDashboard size={18} />, label: "Dashboard" },
  { to: "/admin/pesanan", icon: <ShoppingCart size={18} />, label: "Pesanan", badgeKey: "paid" },
  { to: "/admin/produk", icon: <Package size={18} />, label: "Produk", badgeKey: "lowStock" },
  { to: "/admin/kategori", icon: <Tag size={18} />, label: "Kategori" },
  { to: "/admin/voucher", icon: <Ticket size={18} />, label: "Voucher" },
  { to: "/admin/customers", icon: <Users size={18} />, label: "Customer" },
  { to: "/admin/komplain", icon: <MessageSquare size={18} />, label: "Komplain", badgeKey: "complaints" },
  { to: "/admin/ulasan", icon: <Star size={18} />, label: "Ulasan" },
  { to: "/admin/broadcast", icon: <Bell size={18} />, label: "Broadcast" },
  { to: "/admin/laporan", icon: <TrendingUp size={18} />, label: "Laporan" },
  { to: "/admin/aktivitas", icon: <History size={18} />, label: "Aktivitas" },
  { to: "/admin/pengaturan", icon: <Settings size={18} />, label: "Pengaturan" },
];

export type Breadcrumb = { label: string; to?: string };

interface AdminShellProps {
  // Halaman ini (breadcrumb terakhir + judul topbar mobile). Wajib.
  title: string;
  subtitle?: string;
  // Parent breadcrumb chain — default cuma "Dashboard".
  // Contoh untuk /admin/produk/xxx: [{label:"Produk", to:"/admin/produk"}]
  parents?: Breadcrumb[];
  // CTA di kanan topbar (mis. "+ Tambah Produk", "Simpan").
  headerRight?: ReactNode;
  children: ReactNode;
}

export function AdminShell({ title, subtitle, parents = [], headerRight, children }: AdminShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [stats, setStats] = useState<EcomAdminDashboardStats | null>(null);
  const loc = useLocation();

  useEffect(() => {
    adminApi.getDashboardStats().then(setStats).catch(() => {});
  }, []);

  // Tutup drawer setiap route change.
  useEffect(() => { setDrawerOpen(false); }, [loc.pathname]);

  const claims = decodeToken();
  const isSuperadmin = claims?.role === "superadmin";

  const statusCounts = stats?.status_counts || {};
  const badges = {
    paid: statusCounts.paid || 0,
    complaints: stats?.complaints_pending || 0,
    lowStock: stats?.low_stock_count || 0,
  };

  const handleLogout = () => {
    setToken(null);
    window.location.href = "/";
  };

  return (
    <div className="min-h-dvh bg-cherry-50/40">
      {/* Sidebar — desktop only */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-60 bg-white border-r border-cherry-100 flex-col z-30">
        <SidebarContent
          badges={badges}
          isSuperadmin={isSuperadmin}
          onLogout={handleLogout}
          currentPath={loc.pathname}
        />
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <>
          <div
            className="fixed inset-0 bg-ink-900/40 z-40 lg:hidden"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          <aside className="fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-white z-50 lg:hidden shadow-2xl flex flex-col animate-[slideIn_200ms_ease-out]">
            <div className="flex items-center justify-between p-4 border-b border-cherry-100">
              <p className="text-sm font-black text-ink-900">Menu Admin</p>
              <button
                onClick={() => setDrawerOpen(false)}
                className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-cherry-50"
                aria-label="Tutup menu"
              >
                <X size={18} />
              </button>
            </div>
            <SidebarContent
              badges={badges}
              isSuperadmin={isSuperadmin}
              onLogout={handleLogout}
              currentPath={loc.pathname}
            />
          </aside>
        </>
      )}

      {/* Main area — offset kiri untuk sidebar desktop */}
      <div className="lg:pl-60 flex flex-col min-h-dvh">
        {/* Topbar sticky */}
        <header className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-cherry-100">
          <div className="flex items-center gap-3 px-4 lg:px-8 h-16">
            {/* Hamburger — mobile only */}
            <button
              onClick={() => setDrawerOpen(true)}
              className="lg:hidden w-10 h-10 rounded-xl flex items-center justify-center text-ink-700 hover:bg-cherry-50"
              aria-label="Buka menu"
            >
              <Menu size={20} />
            </button>

            {/* Breadcrumb + title */}
            <div className="flex-1 min-w-0">
              {/* Breadcrumb — hanya tampil kalau ada parents (desktop only) */}
              {parents.length > 0 && (
                <nav aria-label="Breadcrumb" className="hidden sm:flex items-center gap-1 text-xs text-ink-500 mb-0.5">
                  <Link to="/admin" className="hover:text-cherry-500">Admin</Link>
                  {parents.map((p, i) => (
                    <span key={i} className="flex items-center gap-1">
                      <ChevronRight size={12} className="opacity-50" aria-hidden="true" />
                      {p.to ? (
                        <Link to={p.to} className="hover:text-cherry-500">{p.label}</Link>
                      ) : (
                        <span>{p.label}</span>
                      )}
                    </span>
                  ))}
                  <ChevronRight size={12} className="opacity-50" aria-hidden="true" />
                  <span className="text-ink-700 font-bold">{title}</span>
                </nav>
              )}
              <h1 className="text-base sm:text-lg font-black text-ink-900 truncate leading-tight">
                {title}
              </h1>
              {subtitle && (
                <p className="text-xs text-ink-500 truncate hidden sm:block">{subtitle}</p>
              )}
            </div>

            {/* Header CTA slot */}
            {headerRight && <div className="shrink-0">{headerRight}</div>}
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 px-4 lg:px-8 py-6 max-w-7xl w-full">
          {children}
        </main>
      </div>

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}

interface SidebarContentProps {
  badges: { paid: number; complaints: number; lowStock: number };
  isSuperadmin: boolean;
  onLogout: () => void;
  currentPath: string;
}

function SidebarContent({ badges, isSuperadmin, onLogout, currentPath }: SidebarContentProps) {
  return (
    <>
      {/* Brand */}
      <div className="p-5 border-b border-cherry-100">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cherry-400 to-cherry-500 flex items-center justify-center text-white shrink-0">
            <LayoutDashboard size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-black text-ink-900 leading-tight">Ecom Admin</p>
            <p className="text-xs text-ink-500 truncate">TBK Santi</p>
          </div>
        </div>
      </div>

      {/* Nav list */}
      <nav className="flex-1 overflow-y-auto p-3 flex flex-col gap-0.5">
        {NAV_ITEMS.map((item) => {
          const isActive = currentPath === item.to
            || (item.to !== "/admin" && currentPath.startsWith(item.to));
          const badgeCount = item.badgeKey ? badges[item.badgeKey] : 0;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 h-11 px-3 rounded-xl text-sm transition-colors ${
                isActive
                  ? "bg-gradient-to-r from-cherry-100 to-cherry-50 text-cherry-600 font-black"
                  : "text-ink-700 hover:bg-cherry-50 font-semibold"
              }`}
            >
              <span className={isActive ? "text-cherry-500" : "text-ink-500"}>{item.icon}</span>
              <span className="flex-1 truncate">{item.label}</span>
              {badgeCount > 0 && (
                <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-cherry-500 text-white text-[10px] font-black flex items-center justify-center">
                  {badgeCount > 99 ? "99+" : badgeCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer — POS jump + logout */}
      <div className="p-3 border-t border-cherry-100 flex flex-col gap-1">
        {isSuperadmin && (
          <button
            onClick={() => { window.location.href = "/"; }}
            className="flex items-center gap-3 h-10 px-3 rounded-xl text-sm font-semibold text-ink-700 hover:bg-cherry-50 transition-colors"
          >
            <ArrowLeftRight size={16} className="text-ink-500" />
            <span className="flex-1 text-left">Pindah ke POS</span>
          </button>
        )}
        <button
          onClick={onLogout}
          className="flex items-center gap-3 h-10 px-3 rounded-xl text-sm font-semibold text-ink-700 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut size={16} className="text-ink-500" />
          <span className="flex-1 text-left">Keluar</span>
        </button>
      </div>
    </>
  );
}
