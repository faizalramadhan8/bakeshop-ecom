// CommandPalette — Sprint 6 Chunk 14 + 15 (4 Aug 2026).
// Cmd+K / Ctrl+K palette dengan dual mode:
//   1. Empty query → navigation commands (Go to Pesanan, Go to Produk, dst)
//      + recent items (kalau ada di localStorage)
//   2. Non-empty query → live search parallel ke products/orders/customers
//      dengan debounce 250ms. Grouped by tipe di dropdown.
//
// Keyboard nav: arrow up/down + enter. Escape untuk close.
//
// Trigger:
//   - Cmd/Ctrl + K → open palette
//   - Klik search icon di topbar → open palette

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, Package, ShoppingCart, Users, Bell, Tag, Ticket,
  MessageSquare, Star, TrendingUp, Settings, History, LayoutDashboard,
  ArrowRight, Loader2, X,
} from "lucide-react";
import {
  adminApi, formatRp,
  type EcomAdminProduct, type EcomAdminOrderListItem,
  type EcomAdminCustomerListItem,
} from "@/lib/api";

// Navigation commands — sinkron dengan NAV_ITEMS di AdminShell + tambahan
// "Buat X baru" untuk quick-action.
type NavCommand = {
  id: string;
  label: string;
  hint?: string;
  icon: React.ReactNode;
  path: string;
  keywords?: string[]; // untuk match search "buat komplain" → tetap ke Komplain
};

const NAV_COMMANDS: NavCommand[] = [
  { id: "dashboard",  label: "Dashboard",       icon: <LayoutDashboard size={16} />, path: "/admin",            keywords: ["beranda", "home"] },
  { id: "pesanan",    label: "Pesanan",         icon: <ShoppingCart size={16} />,    path: "/admin/pesanan",    keywords: ["order", "orders"] },
  { id: "produk",     label: "Produk Online",   icon: <Package size={16} />,         path: "/admin/produk",     keywords: ["product"] },
  { id: "kategori",   label: "Kategori",        icon: <Tag size={16} />,             path: "/admin/kategori" },
  { id: "voucher",    label: "Voucher & Promo", icon: <Ticket size={16} />,          path: "/admin/voucher",    keywords: ["diskon", "kupon"] },
  { id: "customer",   label: "Customer",        icon: <Users size={16} />,           path: "/admin/customers",  keywords: ["pelanggan", "user"] },
  { id: "komplain",   label: "Komplain",        icon: <MessageSquare size={16} />,   path: "/admin/komplain",   keywords: ["complaint", "keluhan"] },
  { id: "ulasan",     label: "Ulasan",          icon: <Star size={16} />,            path: "/admin/ulasan",     keywords: ["review", "rating"] },
  { id: "broadcast",  label: "Broadcast Push",  icon: <Bell size={16} />,            path: "/admin/broadcast",  keywords: ["notif", "push"] },
  { id: "laporan",    label: "Analytics",       icon: <TrendingUp size={16} />,      path: "/admin/laporan",    keywords: ["report", "grafik"] },
  { id: "aktivitas",  label: "Aktivitas",       icon: <History size={16} />,         path: "/admin/aktivitas",  keywords: ["audit", "log"] },
  { id: "pengaturan", label: "Pengaturan",      icon: <Settings size={16} />,        path: "/admin/pengaturan", keywords: ["setting", "config"] },
];

// Result row generic — icon + label + subtitle + path.
interface Row {
  key: string;
  section: "Navigasi" | "Produk" | "Pesanan" | "Customer";
  icon: React.ReactNode;
  label: string;
  sub?: string;
  path: string;
  // Untuk display accent — mis. total order untuk highlight.
  meta?: string;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<EcomAdminProduct[]>([]);
  const [orders, setOrders] = useState<EcomAdminOrderListItem[]>([]);
  const [customers, setCustomers] = useState<EcomAdminCustomerListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset saat open — cegah stale query dari session lalu.
  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIdx(0);
      // Focus input setelah paint — cegah race dengan animasi mount.
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // Debounced search — 250ms, cegah spam BE per keystroke.
  useEffect(() => {
    if (!open) return;
    const trimmed = query.trim();
    if (!trimmed) {
      setProducts([]);
      setOrders([]);
      setCustomers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      // Parallel — semua limit 5 supaya total < 20 hasil tampil.
      const [p, o, c] = await Promise.all([
        adminApi.listProducts({ search: trimmed, limit: 5 }).catch(() => ({ items: [], next_cursor: "" })),
        adminApi.listOrders({ search: trimmed, status: "", limit: 5 }).catch(() => ({ items: [], next_cursor: "" })),
        adminApi.listCustomers({ search: trimmed, limit: 5 }).catch(() => ({ items: [], next_cursor: "", total: 0 })),
      ]);
      setProducts(p.items || []);
      setOrders(o.items || []);
      setCustomers(c.items || []);
      setLoading(false);
    }, 250);
    return () => clearTimeout(t);
  }, [query, open]);

  // Build flat row list — untuk keyboard nav + render.
  const rows: Row[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list: Row[] = [];

    // Nav — kalau empty query, tampilkan semua. Kalau ada query, filter by
    // label/keywords substring.
    const navFiltered = q
      ? NAV_COMMANDS.filter((c) =>
          c.label.toLowerCase().includes(q) ||
          c.keywords?.some((k) => k.includes(q))
        )
      : NAV_COMMANDS;
    navFiltered.forEach((c) => {
      list.push({
        key: `nav:${c.id}`,
        section: "Navigasi",
        icon: c.icon,
        label: c.label,
        path: c.path,
      });
    });

    // Data results — hanya kalau ada query.
    if (q) {
      products.forEach((p) => {
        list.push({
          key: `product:${p.id}`,
          section: "Produk",
          icon: <Package size={16} />,
          label: p.name,
          sub: `SKU: ${p.sku}`,
          meta: formatRp(p.ecom_price ?? p.selling_price),
          path: `/admin/produk/${p.id}`,
        });
      });
      orders.forEach((o) => {
        list.push({
          key: `order:${o.id}`,
          section: "Pesanan",
          icon: <ShoppingCart size={16} />,
          label: `#${o.id.slice(0, 8).toUpperCase()}${o.recipient ? " · " + o.recipient : ""}`,
          sub: `${o.ecom_status} · ${o.item_count} item`,
          meta: formatRp(o.total),
          path: `/admin/pesanan/${o.id}`,
        });
      });
      customers.forEach((c) => {
        list.push({
          key: `customer:${c.id}`,
          section: "Customer",
          icon: <Users size={16} />,
          label: c.full_name || "(tanpa nama)",
          sub: [c.email, c.phone].filter(Boolean).join(" · "),
          meta: `${c.order_count} order`,
          path: `/admin/customers?open=${c.id}`,
        });
      });
    }
    return list;
  }, [query, products, orders, customers]);

  // Keep selectedIdx dalam range saat rows berubah.
  useEffect(() => {
    if (selectedIdx >= rows.length) setSelectedIdx(Math.max(0, rows.length - 1));
  }, [rows, selectedIdx]);

  // Keyboard nav.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIdx((i) => Math.min(rows.length - 1, i + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIdx((i) => Math.max(0, i - 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const row = rows[selectedIdx];
        if (row) {
          navigate(row.path);
          onClose();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, rows, selectedIdx, navigate, onClose]);

  if (!open) return null;

  // Group rows by section untuk render.
  const bySection = rows.reduce<Record<string, Row[]>>((acc, r) => {
    (acc[r.section] = acc[r.section] || []).push(r);
    return acc;
  }, {});

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[10vh] modal-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      <div className="absolute inset-0 bg-ink-900/60 backdrop-blur-sm" />

      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden border border-cherry-200 modal-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 h-14 border-b border-cherry-100">
          <Search size={18} className="text-ink-500 shrink-0" aria-hidden="true" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIdx(0); }}
            placeholder="Cari produk, pesanan, customer, atau navigasi…"
            className="flex-1 h-full bg-transparent text-sm text-ink-900 focus:outline-none placeholder:text-ink-500"
          />
          {loading && <Loader2 size={14} className="animate-spin text-ink-500 shrink-0" aria-hidden="true" />}
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-ink-500 hover:bg-cherry-50 shrink-0"
          >
            <X size={14} />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto py-2">
          {rows.length === 0 ? (
            <div className="py-12 text-center text-sm text-ink-500">
              {query ? "Tidak ada hasil." : "Ketik untuk mencari."}
            </div>
          ) : (
            (["Navigasi", "Produk", "Pesanan", "Customer"] as const).map((sec) => {
              const items = bySection[sec];
              if (!items || items.length === 0) return null;
              return (
                <div key={sec} className="mb-1">
                  <p className="px-4 py-1 text-[10px] font-black uppercase tracking-wider text-ink-500">
                    {sec}
                  </p>
                  {items.map((r) => {
                    const globalIdx = rows.findIndex((x) => x.key === r.key);
                    const active = globalIdx === selectedIdx;
                    return (
                      <button
                        key={r.key}
                        type="button"
                        onClick={() => { navigate(r.path); onClose(); }}
                        onMouseEnter={() => setSelectedIdx(globalIdx)}
                        className={`w-full text-left px-4 py-2.5 flex items-center gap-3 ${
                          active ? "bg-cherry-100" : "hover:bg-cherry-50"
                        }`}
                      >
                        <span className={active ? "text-cherry-600" : "text-ink-500"}>{r.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm truncate ${active ? "font-black text-ink-900" : "font-semibold text-ink-900"}`}>
                            {r.label}
                          </p>
                          {r.sub && (
                            <p className="text-xs text-ink-500 truncate">{r.sub}</p>
                          )}
                        </div>
                        {r.meta && (
                          <span className={`text-xs tabular-nums shrink-0 ${active ? "font-bold text-cherry-600" : "text-ink-500"}`}>
                            {r.meta}
                          </span>
                        )}
                        <ArrowRight size={12} className={`shrink-0 ${active ? "text-cherry-500" : "text-ink-500 opacity-0"}`} />
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2 border-t border-cherry-100 flex items-center gap-3 text-[10px] text-ink-500">
          <Kbd>↑</Kbd> <Kbd>↓</Kbd> pilih
          <Kbd>↵</Kbd> buka
          <Kbd>Esc</Kbd> tutup
          <span className="ml-auto">Cmd+K untuk buka</span>
        </div>
      </div>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded border border-cherry-200 bg-cherry-50 font-mono text-[10px] text-ink-700">
      {children}
    </span>
  );
}
