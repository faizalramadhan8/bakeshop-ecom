import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ShoppingBag, Package, Minus, Plus, Trash2, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";
import { formatRp } from "@/lib/api";
import { useCart, updateCartItem, removeCartItem, refreshCart } from "@/lib/cartStore";

function formatWeight(grams: number): string {
  if (grams >= 1000) return `${(grams / 1000).toFixed(grams % 1000 === 0 ? 0 : 1)} kg`;
  return `${grams} g`;
}

export function Keranjang() {
  const { cart } = useCart();
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    refreshCart();
  }, []);

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

  if (cart === null) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <p className="text-center text-ink-500">Memuat keranjang…</p>
      </div>
    );
  }

  const empty = cart.items.length === 0;

  return (
    <div className="max-w-4xl mx-auto p-4 pb-32 sm:pb-4">
      <div className="flex items-center gap-2 mb-4">
        <Link
          to="/kategori"
          aria-label="Kembali belanja"
          className="w-9 h-9 rounded-xl flex items-center justify-center text-ink-700 hover:bg-cherry-50"
        >
          <ArrowLeft size={16} />
        </Link>
        <h1 className="text-xl font-black text-ink-900">Keranjang</h1>
        <span className="text-sm text-ink-500 ml-1">· {cart.item_count} produk</span>
      </div>

      {empty ? (
        <div className="py-16 text-center text-ink-500">
          <ShoppingBag size={48} className="mx-auto opacity-30 mb-3" />
          <p className="text-sm font-semibold mb-1">Keranjangmu masih kosong</p>
          <p className="text-xs mb-4">Yuk mulai belanja</p>
          <Link
            to="/kategori"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-white text-sm font-bold bg-gradient-to-r from-cherry-400 to-cherry-500"
          >
            <ShoppingBag size={16} />
            Lihat Katalog
          </Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-3 gap-4">
          {/* Items list */}
          <div className="md:col-span-2 flex flex-col gap-3">
            {cart.items.map((it) => {
              const busy = busyId === it.id;
              return (
                <div
                  key={it.id}
                  className={`flex gap-3 p-3 rounded-2xl border ${
                    it.unavailable
                      ? "border-cherry-500/50 bg-cherry-50"
                      : "border-cherry-100 bg-white"
                  }`}
                >
                  {/* Image */}
                  <div className="w-20 h-20 shrink-0 rounded-xl bg-cherry-50 flex items-center justify-center overflow-hidden">
                    {it.image ? (
                      // eslint-disable-next-line jsx-a11y/alt-text
                      <img src={it.image} alt={it.name_id} className="w-full h-full object-cover" />
                    ) : (
                      <Package size={28} className="text-cherry-200" />
                    )}
                  </div>

                  {/* Body */}
                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/produk/${it.product_id}`}
                      className="text-sm font-bold text-ink-900 hover:text-cherry-500 line-clamp-2"
                    >
                      {it.name_id || it.name}
                    </Link>
                    {it.weight_grams && (
                      <p className="text-xs text-ink-500 mt-0.5">
                        {formatWeight(it.weight_grams)}
                      </p>
                    )}
                    {it.unavailable ? (
                      <p className="text-xs text-cherry-600 font-bold mt-1 flex items-center gap-1">
                        <AlertCircle size={12} />
                        {it.unavailable_reason}
                      </p>
                    ) : (
                      <p className="text-sm font-black text-cherry-500 mt-1">
                        {formatRp(it.price)}
                      </p>
                    )}

                    {/* Qty + remove */}
                    <div className="flex items-center justify-between mt-2">
                      <div className="inline-flex items-center border border-cherry-200 rounded-lg bg-white">
                        <button
                          onClick={() => handleQty(it.id, it.quantity - 1, it.min_order)}
                          disabled={busy || it.quantity <= it.min_order}
                          aria-label="Kurang"
                          className="w-8 h-8 flex items-center justify-center hover:bg-cherry-50 disabled:opacity-30"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="w-8 text-center text-sm font-bold">{it.quantity}</span>
                        <button
                          onClick={() => handleQty(it.id, it.quantity + 1, it.min_order)}
                          disabled={busy || it.quantity >= it.stock}
                          aria-label="Tambah"
                          className="w-8 h-8 flex items-center justify-center hover:bg-cherry-50 disabled:opacity-30"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        {!it.unavailable && (
                          <p className="text-sm font-bold text-ink-900">
                            {formatRp(it.subtotal)}
                          </p>
                        )}
                        <button
                          onClick={() => handleRemove(it.id)}
                          disabled={busy}
                          aria-label="Hapus"
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-cherry-600 hover:bg-cherry-100 disabled:opacity-40"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Summary (desktop side / mobile sticky bottom) */}
          <div className="hidden md:block sticky top-20 self-start">
            <div className="bg-white border border-cherry-200 rounded-2xl p-4">
              <h3 className="text-sm font-black text-ink-900 mb-3">Ringkasan Belanja</h3>
              <dl className="text-sm space-y-2">
                <div className="flex justify-between">
                  <dt className="text-ink-700">Subtotal ({cart.total_qty} item)</dt>
                  <dd className="font-bold text-ink-900">{formatRp(cart.subtotal)}</dd>
                </div>
                {cart.total_weight_grams > 0 && (
                  <div className="flex justify-between">
                    <dt className="text-ink-500 text-xs">Berat total</dt>
                    <dd className="text-xs text-ink-500">
                      {formatWeight(cart.total_weight_grams)}
                    </dd>
                  </div>
                )}
              </dl>
              <div className="border-t border-cherry-100 mt-3 pt-3">
                <div className="flex justify-between mb-4">
                  <span className="text-base font-black text-ink-900">Total</span>
                  <span className="text-lg font-black text-cherry-500">
                    {formatRp(cart.subtotal)}
                  </span>
                </div>
                <Link
                  to={cart.has_unavailable ? "#" : "/checkout"}
                  onClick={(e) => {
                    if (cart.has_unavailable) {
                      e.preventDefault();
                      toast.error("Hapus produk yang tidak tersedia dulu");
                    }
                  }}
                  className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white text-sm font-bold ${
                    cart.has_unavailable
                      ? "bg-ink-500 cursor-not-allowed"
                      : "bg-gradient-to-r from-cherry-400 to-cherry-500 hover:opacity-90"
                  }`}
                >
                  Lanjut ke Checkout
                </Link>
                {cart.has_unavailable && (
                  <p className="text-xs text-cherry-600 mt-2 text-center">
                    Ada produk yang tidak tersedia
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile sticky bottom checkout */}
      {!empty && (
        <div
          className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-cherry-200 px-4 py-3"
          style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-ink-500">Total ({cart.total_qty} item)</span>
            <span className="text-lg font-black text-cherry-500">{formatRp(cart.subtotal)}</span>
          </div>
          <Link
            to={cart.has_unavailable ? "#" : "/checkout"}
            onClick={(e) => {
              if (cart.has_unavailable) {
                e.preventDefault();
                toast.error("Hapus produk yang tidak tersedia dulu");
              }
            }}
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white text-sm font-bold ${
              cart.has_unavailable
                ? "bg-ink-500 cursor-not-allowed"
                : "bg-gradient-to-r from-cherry-400 to-cherry-500 active:scale-[0.98]"
            }`}
          >
            Lanjut ke Checkout
          </Link>
        </div>
      )}
    </div>
  );
}
