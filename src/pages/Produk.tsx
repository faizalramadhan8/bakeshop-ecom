import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Package, Minus, Plus, ShoppingBag, AlertCircle, Tag, Check } from "lucide-react";
import toast from "react-hot-toast";
import { publicApi, formatRp, type EcomProductDetail } from "@/lib/api";
import { addToCart } from "@/lib/cartStore";

function formatWeight(grams?: number): string {
  if (!grams) return "";
  if (grams >= 1000) return `${(grams / 1000).toFixed(grams % 1000 === 0 ? 0 : 1)} kg`;
  return `${grams} g`;
}

export function Produk() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<EcomProductDetail | null>(null);
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    publicApi
      .getProduct(id)
      .then((p) => {
        if (cancelled) return;
        setProduct(p);
        setQty(p.min_order);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Gagal load");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="animate-pulse space-y-3">
          <div className="aspect-square bg-cherry-50 rounded-2xl" />
          <div className="h-6 bg-cherry-50 rounded w-2/3" />
          <div className="h-4 bg-cherry-50 rounded w-1/3" />
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-2xl mx-auto p-6 text-center py-16">
        <AlertCircle size={40} className="mx-auto text-cherry-600 mb-3" />
        <p className="text-sm font-semibold text-cherry-600">
          {error || "Produk tidak tersedia"}
        </p>
        <Link
          to="/kategori"
          className="inline-block mt-4 text-sm text-cherry-500 underline"
        >
          Lihat produk lain
        </Link>
      </div>
    );
  }

  // Effective price berdasar qty (grosir tier eligible).
  const effectivePrice = getBestTierPrice(product, qty);
  const savings = (product.price - effectivePrice) * qty;

  const [adding, setAdding] = useState(false);
  const handleAdd = async () => {
    if (!product) return;
    setAdding(true);
    try {
      await addToCart(product.id, qty);
      toast.success(`${qty} × ${product.name_id} ditambahkan ke keranjang`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal menambahkan ke keranjang";
      toast.error(msg);
    } finally {
      setAdding(false);
    }
  };

  const changeQty = (delta: number) => {
    const next = qty + delta;
    if (next < product.min_order) return;
    if (next > product.stock) {
      toast.error(`Stok hanya ${product.stock}`);
      return;
    }
    setQty(next);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 pb-32 sm:pb-4">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1 text-sm text-ink-700 hover:text-ink-900 mb-4"
      >
        <ArrowLeft size={16} />
        Kembali
      </button>

      <div className="grid sm:grid-cols-2 gap-6">
        {/* Image */}
        <div className="aspect-square bg-cherry-50 rounded-2xl border border-cherry-100 relative flex items-center justify-center overflow-hidden">
          {product.image ? (
            // eslint-disable-next-line jsx-a11y/alt-text
            <img
              src={product.image}
              alt={product.name_id}
              className="w-full h-full object-cover"
            />
          ) : (
            <Package size={80} className="text-cherry-200" />
          )}
          {product.weight_grams && (
            <span className="absolute top-3 left-3 text-xs font-bold px-3 py-1 rounded-lg bg-white/90 text-ink-900">
              {formatWeight(product.weight_grams)}
            </span>
          )}
          {product.is_low_stock && product.stock > 0 && (
            <span className="absolute top-3 right-3 text-xs font-bold px-3 py-1 rounded-lg bg-cherry-500 text-white">
              Sisa {product.stock}
            </span>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col gap-3">
          {product.category_name && (
            <Link
              to={`/kategori/${product.category_id}`}
              className="text-xs font-bold text-cherry-500 uppercase tracking-wider"
            >
              {product.category_name}
            </Link>
          )}
          <h1 className="text-2xl font-black text-ink-900 leading-tight tracking-tight">
            {product.name_id}
          </h1>
          <p className="text-xs text-ink-500">SKU: {product.sku}</p>

          {/* Price */}
          <div className="mt-2">
            <p className="text-3xl font-black text-cherry-500 tracking-tight">
              {formatRp(effectivePrice)}
            </p>
            {effectivePrice < product.price && (
              <p className="text-sm text-ink-500 line-through">{formatRp(product.price)}</p>
            )}
            {product.member_price && product.member_price < product.price && (
              <p className="text-sm text-amber-600 font-bold mt-1">
                Harga Member: {formatRp(product.member_price)}
              </p>
            )}
          </div>

          {/* Grosir tier info */}
          {product.tiers && product.tiers.length > 0 && (
            <div className="bg-amber-50 border border-amber-500/30 rounded-2xl p-3">
              <div className="flex items-center gap-2 mb-2">
                <Tag size={14} className="text-amber-600" />
                <p className="text-xs font-black uppercase tracking-wider text-amber-600">
                  Harga Grosir
                </p>
              </div>
              <div className="space-y-1">
                {product.tiers.map((t, i) => (
                  <p key={i} className="text-sm text-ink-900">
                    Beli ≥ <b>{t.min_qty}</b>{" "}
                    <span className="text-ink-500">→ {formatRp(t.price)}/pcs</span>
                    {qty >= t.min_qty && (
                      <span className="ml-2 inline-flex items-center gap-1 text-xs font-bold text-cherry-500">
                        <Check size={12} aria-hidden="true" /> aktif
                      </span>
                    )}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Info block */}
          <dl className="text-sm space-y-1.5 border-t border-cherry-100 pt-3">
            <div className="flex justify-between">
              <dt className="text-ink-500">Stok</dt>
              <dd className="font-bold text-ink-900">{product.stock} tersedia</dd>
            </div>
            {product.weight_grams && (
              <div className="flex justify-between">
                <dt className="text-ink-500">Berat</dt>
                <dd className="font-bold text-ink-900">{formatWeight(product.weight_grams)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-ink-500">Min. order</dt>
              <dd className="font-bold text-ink-900">{product.min_order} pcs</dd>
            </div>
          </dl>

          {/* Qty + CTA (desktop) */}
          <div className="hidden sm:flex flex-col gap-3 border-t border-cherry-100 pt-3">
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-ink-700">Jumlah:</span>
              <div className="inline-flex items-center border border-cherry-200 rounded-xl">
                <button
                  onClick={() => changeQty(-1)}
                  disabled={qty <= product.min_order}
                  aria-label="Kurang"
                  className="w-10 h-10 flex items-center justify-center hover:bg-cherry-50 disabled:opacity-30"
                >
                  <Minus size={16} />
                </button>
                <input
                  type="number"
                  value={qty}
                  onChange={(e) => {
                    const n = Number(e.target.value) || product.min_order;
                    setQty(Math.max(product.min_order, Math.min(product.stock, n)));
                  }}
                  className="w-14 text-center text-sm font-bold border-none focus:outline-none bg-transparent"
                />
                <button
                  onClick={() => changeQty(1)}
                  disabled={qty >= product.stock}
                  aria-label="Tambah"
                  className="w-10 h-10 flex items-center justify-center hover:bg-cherry-50 disabled:opacity-30"
                >
                  <Plus size={16} />
                </button>
              </div>
              {savings > 0 && (
                <span className="text-xs text-cherry-500 font-bold">
                  Hemat {formatRp(savings)}
                </span>
              )}
            </div>
            <button
              onClick={handleAdd}
              disabled={adding}
              className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl text-white text-sm font-bold bg-gradient-to-r from-cherry-400 to-cherry-500 hover:opacity-90 disabled:opacity-60 transition-opacity"
            >
              <ShoppingBag size={16} />
              {adding ? "Menambah…" : `Tambah ke Keranjang · ${formatRp(effectivePrice * qty)}`}
            </button>
          </div>
        </div>
      </div>

      {/* Description */}
      {product.description && (
        <section className="mt-6 border-t border-cherry-100 pt-6">
          <h2 className="text-base font-black text-ink-900 mb-3">Deskripsi Produk</h2>
          <div className="text-sm text-ink-700 whitespace-pre-wrap leading-relaxed">
            {product.description}
          </div>
        </section>
      )}

      {/* Sticky bottom bar (mobile) */}
      <div
        className="sm:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-cherry-200 px-4 py-3"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center border border-cherry-200 rounded-xl shrink-0">
            <button
              onClick={() => changeQty(-1)}
              disabled={qty <= product.min_order}
              aria-label="Kurang"
              className="w-10 h-10 flex items-center justify-center hover:bg-cherry-50 disabled:opacity-30"
            >
              <Minus size={16} />
            </button>
            <span className="w-8 text-center text-sm font-bold">{qty}</span>
            <button
              onClick={() => changeQty(1)}
              disabled={qty >= product.stock}
              aria-label="Tambah"
              className="w-10 h-10 flex items-center justify-center hover:bg-cherry-50 disabled:opacity-30"
            >
              <Plus size={16} />
            </button>
          </div>
          <button
            onClick={handleAdd}
            disabled={adding}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-white text-sm font-bold bg-gradient-to-r from-cherry-400 to-cherry-500 disabled:opacity-60 active:scale-[0.98] transition-transform"
          >
            <ShoppingBag size={16} />
            {adding ? "…" : formatRp(effectivePrice * qty)}
          </button>
        </div>
      </div>
    </div>
  );
}

// Greedy match tier: pilih min_qty tertinggi yang qty >= min_qty. Sesuai
// pattern computeBestUnitPrice di POS bakeshop-fe (all_customers scope).
function getBestTierPrice(product: EcomProductDetail, qty: number): number {
  if (!product.tiers || product.tiers.length === 0) return product.price;
  const eligible = product.tiers.filter((t) => qty >= t.min_qty);
  if (eligible.length === 0) return product.price;
  const best = eligible.reduce((a, b) => (a.min_qty > b.min_qty ? a : b));
  return best.price < product.price ? best.price : product.price;
}
