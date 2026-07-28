import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft, ShoppingBag, Package, Minus, Plus, Trash2, AlertCircle, Check,
} from "lucide-react";
import toast from "react-hot-toast";
import { formatRp } from "@/lib/api";
import { useCart, updateCartItem, removeCartItem, refreshCart } from "@/lib/cartStore";

function formatWeight(grams: number): string {
  if (grams >= 1000) return `${(grams / 1000).toFixed(grams % 1000 === 0 ? 0 : 1)} kg`;
  return `${grams} g`;
}

// Custom checkbox — bigger tap target than native, brand color, accessible.
function CheckBox({
  checked,
  onChange,
  disabled,
  label,
  size = "md",
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  label: string;
  size?: "sm" | "md";
}) {
  const sz = size === "sm" ? "w-5 h-5" : "w-6 h-6";
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`${sz} shrink-0 rounded-md border-2 flex items-center justify-center transition-colors ${
        disabled
          ? "border-ink-200 opacity-40 cursor-not-allowed"
          : checked
          ? "bg-cherry-500 border-cherry-500 text-white"
          : "bg-white border-cherry-300 hover:border-cherry-500"
      }`}
    >
      {checked && <Check size={size === "sm" ? 12 : 14} strokeWidth={3} aria-hidden="true" />}
    </button>
  );
}

export function Keranjang() {
  const { cart } = useCart();
  const navigate = useNavigate();
  const [busyId, setBusyId] = useState<string | null>(null);
  // selectedIds — controlled by user via checkboxes. Default = semua item yang
  // available di-select (biar behavior familiar untuk yang cepat).
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    refreshCart();
  }, []);

  // Initial select semua item yang available saat cart pertama load.
  // Set `initialized` supaya toggle user selanjutnya tidak di-reset.
  useEffect(() => {
    if (!cart || initialized) return;
    const ids = new Set<string>();
    for (const it of cart.items) {
      if (!it.unavailable) ids.add(it.id);
    }
    setSelectedIds(ids);
    setInitialized(true);
  }, [cart, initialized]);

  // Cleanup — kalau item di-remove, drop dari selectedIds juga.
  useEffect(() => {
    if (!cart || !initialized) return;
    const availableIds = new Set(cart.items.map((i) => i.id));
    setSelectedIds((prev) => {
      const next = new Set<string>();
      for (const id of prev) if (availableIds.has(id)) next.add(id);
      return next;
    });
  }, [cart, initialized]);

  const availableItems = useMemo(
    () => (cart ? cart.items.filter((i) => !i.unavailable) : []),
    [cart]
  );
  const selectedItems = useMemo(
    () => (cart ? cart.items.filter((i) => selectedIds.has(i.id) && !i.unavailable) : []),
    [cart, selectedIds]
  );

  const allSelected = availableItems.length > 0 && selectedItems.length === availableItems.length;
  const selectedSubtotal = selectedItems.reduce((sum, it) => sum + it.subtotal, 0);
  const selectedQty = selectedItems.reduce((sum, it) => sum + it.quantity, 0);

  const toggleAll = (v: boolean) => {
    setSelectedIds(v ? new Set(availableItems.map((i) => i.id)) : new Set());
  };
  const toggleOne = (id: string, v: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (v) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleQty = async (itemId: string, newQty: number, min: number) => {
    if (newQty < min) return;
    setBusyId(itemId);
    try {
      await updateCartItem(itemId, newQty);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal update");
    } finally {
      setBusyId(null);
    }
  };

  const handleRemove = async (itemId: string) => {
    setBusyId(itemId);
    try {
      await removeCartItem(itemId);
      toast.success("Item dihapus dari keranjang");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal hapus");
    } finally {
      setBusyId(null);
    }
  };

  // Bulk remove unavailable items — helper button.
  const removeAllUnavailable = async () => {
    if (!cart) return;
    const ids = cart.items.filter((i) => i.unavailable).map((i) => i.id);
    if (ids.length === 0) return;
    for (const id of ids) {
      try {
        await removeCartItem(id);
      } catch {
        /* skip individual failure, coba yang lain */
      }
    }
    toast.success(`${ids.length} item habis dihapus`);
  };

  const goCheckout = () => {
    if (selectedItems.length === 0) {
      toast.error("Pilih minimal 1 produk untuk checkout");
      return;
    }
    // Pass selected IDs via sessionStorage — Checkout page baca dari sini.
    // Rationale: kalau via query string, ID list bisa panjang + URL messy.
    sessionStorage.setItem(
      "checkoutContext",
      JSON.stringify({ mode: "cart", selected_item_ids: Array.from(selectedIds) })
    );
    navigate("/checkout");
  };

  if (cart === null) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <p className="text-center text-ink-500">Memuat keranjang…</p>
      </div>
    );
  }

  const empty = cart.items.length === 0;
  const unavailableCount = cart.items.filter((i) => i.unavailable).length;

  return (
    <div className="max-w-4xl mx-auto p-4 pb-52 md:pb-4">
      <div className="flex items-center gap-2 mb-4">
        <Link
          to="/kategori"
          aria-label="Kembali belanja"
          className="w-9 h-9 rounded-xl flex items-center justify-center text-ink-700 hover:bg-cherry-50"
        >
          <ArrowLeft size={16} aria-hidden="true" />
        </Link>
        <h1 className="text-xl font-black text-ink-900">Keranjang</h1>
        <span className="text-sm text-ink-500 ml-1">· {cart.item_count} produk</span>
      </div>

      {empty ? (
        <div className="py-16 text-center text-ink-500">
          <ShoppingBag size={48} className="mx-auto opacity-30 mb-3" aria-hidden="true" />
          <p className="text-sm font-semibold mb-1">Keranjangmu masih kosong</p>
          <p className="text-xs mb-4">Yuk mulai belanja</p>
          <Link
            to="/kategori"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-white text-sm font-bold bg-gradient-to-r from-cherry-400 to-cherry-500"
          >
            <ShoppingBag size={16} aria-hidden="true" />
            Lihat Katalog
          </Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-3 gap-4">
          {/* Items list */}
          <div className="md:col-span-2 flex flex-col gap-3">
            {/* Master checkbox */}
            {availableItems.length > 0 && (
              <div className="flex items-center justify-between bg-white border border-cherry-100 rounded-2xl px-4 py-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <CheckBox
                    checked={allSelected}
                    onChange={toggleAll}
                    label={allSelected ? "Batalkan semua" : "Pilih semua"}
                  />
                  <span className="text-sm font-bold text-ink-900">
                    Pilih semua {availableItems.length > 0 && `(${availableItems.length})`}
                  </span>
                </label>
                {unavailableCount > 0 && (
                  <button
                    onClick={removeAllUnavailable}
                    className="text-xs font-bold text-cherry-500 hover:text-cherry-600 underline"
                  >
                    Hapus {unavailableCount} habis
                  </button>
                )}
              </div>
            )}

            {cart.items.map((it) => {
              const busy = busyId === it.id;
              const isSelected = selectedIds.has(it.id);
              return (
                <div
                  key={it.id}
                  className={`relative flex gap-3 p-3 rounded-2xl border ${
                    it.unavailable
                      ? "border-ink-200 bg-ink-50/50"
                      : isSelected
                      ? "border-cherry-300 bg-white"
                      : "border-cherry-100 bg-white"
                  }`}
                >
                  {/* Checkbox — disabled kalau unavailable */}
                  <div className="pt-1">
                    <CheckBox
                      checked={isSelected}
                      onChange={(v) => toggleOne(it.id, v)}
                      disabled={it.unavailable}
                      label={`Pilih ${it.name_id || it.name}`}
                    />
                  </div>

                  {/* Image dengan out-of-stock overlay */}
                  <div className="w-20 h-20 shrink-0 rounded-xl bg-cherry-50 flex items-center justify-center overflow-hidden relative">
                    {it.image ? (
                      // eslint-disable-next-line jsx-a11y/alt-text
                      <img
                        src={it.image}
                        alt={it.name_id}
                        className={`w-full h-full object-cover ${it.unavailable ? "grayscale opacity-60" : ""}`}
                      />
                    ) : (
                      <Package size={28} className={`${it.unavailable ? "text-ink-300" : "text-cherry-200"}`} aria-hidden="true" />
                    )}
                    {it.unavailable && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                        <span className="text-white text-[10px] font-black uppercase tracking-wider text-center leading-tight px-1">
                          Habis
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Body */}
                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/produk/${it.product_id}`}
                      className={`text-sm font-bold hover:text-cherry-500 line-clamp-2 ${
                        it.unavailable ? "text-ink-500" : "text-ink-900"
                      }`}
                    >
                      {it.name_id || it.name}
                    </Link>
                    {it.weight_grams && (
                      <p className="text-xs text-ink-500 mt-0.5">{formatWeight(it.weight_grams)}</p>
                    )}
                    {it.unavailable ? (
                      <p className="text-xs text-red-600 font-bold mt-1 flex items-center gap-1">
                        <AlertCircle size={12} aria-hidden="true" />
                        {it.unavailable_reason || "Tidak tersedia"}
                      </p>
                    ) : (
                      <p className="text-sm font-black text-cherry-500 mt-1">
                        {formatRp(it.price)}
                        {it.stock <= 5 && (
                          <span className="ml-2 text-xs font-bold text-amber-600">
                            Sisa {it.stock}
                          </span>
                        )}
                      </p>
                    )}

                    {/* Qty + remove. flex-wrap supaya narrow (320-360px) tidak overflow. */}
                    <div className="flex items-center justify-between flex-wrap gap-y-2 mt-2">
                      {!it.unavailable ? (
                        <div className="inline-flex items-center border border-cherry-200 rounded-lg bg-white">
                          <button
                            onClick={() => handleQty(it.id, it.quantity - 1, it.min_order)}
                            disabled={busy || it.quantity <= it.min_order}
                            aria-label="Kurang"
                            className="w-8 h-8 flex items-center justify-center hover:bg-cherry-50 disabled:opacity-30"
                          >
                            <Minus size={14} aria-hidden="true" />
                          </button>
                          <span className="w-8 text-center text-sm font-bold">{it.quantity}</span>
                          <button
                            onClick={() => handleQty(it.id, it.quantity + 1, it.min_order)}
                            disabled={busy || it.quantity >= it.stock}
                            aria-label="Tambah"
                            className="w-8 h-8 flex items-center justify-center hover:bg-cherry-50 disabled:opacity-30"
                          >
                            <Plus size={14} aria-hidden="true" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-ink-500">Qty: {it.quantity}</span>
                      )}
                      <div className="flex items-center gap-2">
                        {!it.unavailable && (
                          <p className="text-sm font-bold text-ink-900">{formatRp(it.subtotal)}</p>
                        )}
                        <button
                          onClick={() => handleRemove(it.id)}
                          disabled={busy}
                          aria-label="Hapus"
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-cherry-600 hover:bg-cherry-100 disabled:opacity-40"
                        >
                          <Trash2 size={14} aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Summary desktop */}
          <div className="hidden md:block sticky top-20 self-start">
            <div className="bg-white border border-cherry-200 rounded-2xl p-4">
              <h3 className="text-sm font-black text-ink-900 mb-3">
                Ringkasan {selectedItems.length > 0 && `(${selectedItems.length} dipilih)`}
              </h3>
              <dl className="text-sm space-y-2">
                <div className="flex justify-between">
                  <dt className="text-ink-700">Subtotal ({selectedQty} item)</dt>
                  <dd className="font-bold text-ink-900">{formatRp(selectedSubtotal)}</dd>
                </div>
              </dl>
              <div className="border-t border-cherry-100 mt-3 pt-3">
                <div className="flex justify-between mb-4">
                  <span className="text-base font-black text-ink-900">Total</span>
                  <span className="text-lg font-black text-cherry-500">{formatRp(selectedSubtotal)}</span>
                </div>
                <button
                  onClick={goCheckout}
                  disabled={selectedItems.length === 0}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white text-sm font-bold bg-gradient-to-r from-cherry-400 to-cherry-500 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Checkout ({selectedItems.length})
                </button>
                {selectedItems.length === 0 && (
                  <p className="text-xs text-ink-500 mt-2 text-center">
                    Pilih minimal 1 produk
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile sticky bottom — master checkbox + total selected + checkout.
          Narrow viewport (320-360px): "Semua" label hilang, cuma checkbox +
          count di button. Cegah cramp/overflow. */}
      {!empty && (
        <div
          className="md:hidden fixed left-0 right-0 z-50 bg-white border-t border-cherry-200 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] [bottom:calc(56px+env(safe-area-inset-bottom))]"
        >
          <div className="px-3 py-3 flex items-center gap-2">
            <label className="flex items-center gap-1.5 shrink-0">
              <CheckBox
                checked={allSelected}
                onChange={toggleAll}
                label="Pilih semua"
                size="sm"
              />
              {/* "Semua" label — hidden di <=360px, tampil dari xs (376px+) */}
              <span className="hidden xs:inline text-xs font-bold text-ink-900">Semua</span>
            </label>
            <div className="flex-1 min-w-0 text-right">
              <p className="text-[11px] text-ink-500 leading-tight">Total ({selectedQty})</p>
              <p className="text-base font-black text-cherry-500 leading-tight truncate">
                {formatRp(selectedSubtotal)}
              </p>
            </div>
            <button
              onClick={goCheckout}
              disabled={selectedItems.length === 0}
              className="shrink-0 px-4 py-3 rounded-xl text-white text-sm font-bold bg-gradient-to-r from-cherry-400 to-cherry-500 disabled:opacity-40 active:scale-[0.98]"
            >
              {selectedItems.length > 0 ? `Checkout (${selectedItems.length})` : "Checkout"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
