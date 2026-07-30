import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Package, Minus, Plus, ShoppingBag, AlertCircle, Tag, Check, TrendingDown, Bell, BellOff } from "lucide-react";
import toast from "react-hot-toast";
import { publicApi, formatRp, type EcomProductDetail, type EcomProductListItem } from "@/lib/api";
import { addToCart } from "@/lib/cartStore";
import { ProductGallery } from "@/components/ProductGallery";
import { ProductReviews } from "@/components/ProductReviews";
import { ProductCard } from "@/components/ProductCard";
import { useSEO, productJsonLD } from "@/lib/seo";
import { trackEvent } from "@/lib/analytics";
import { pushRecent } from "@/lib/recentlyViewed";

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
  // Hooks HARUS declare di top level — tidak boleh setelah early return
  // (Rules of Hooks). Sebelumnya di declare setelah `if (loading) return` +
  // `if (error) return` → crash silent saat product loaded karena jumlah hook
  // berubah antar render.
  const [adding, setAdding] = useState(false);
  // Sprint 2 #6 — related products state
  const [related, setRelated] = useState<EcomProductListItem[]>([]);
  // Sprint 3 #16 — restock alert state
  const [restockSub, setRestockSub] = useState(false);
  const [restockLoading, setRestockLoading] = useState(false);

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
        // Sprint 3 #15: track recently viewed (LRU localStorage)
        pushRecent(p.id);
        // Fetch related products (best-effort, tidak block PDP)
        publicApi.getRelated(id, 8).then((r) => {
          if (!cancelled) setRelated(r || []);
        }).catch(() => {});
        // Sprint 3 #16: cek restock subscribe status (best-effort, silent)
        publicApi.restockStatus(id).then((r) => {
          if (!cancelled) setRestockSub(r?.subscribed || false);
        }).catch(() => {});
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

  // GA4 view_item — fire sekali per produk (guard biar tidak double di StrictMode).
  useEffect(() => {
    if (!product) return;
    trackEvent("view_item", {
      currency: "IDR",
      value: product.price,
      items: [{ item_id: product.id, item_name: product.name_id, price: product.price }],
    });
  }, [product?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // SEO — dynamic per produk. Title + description + JSON-LD Product supaya
  // Google rich snippet muncul (harga + stok + brand).
  useSEO({
    title: product?.name_id,
    description: product?.description
      ? product.description.slice(0, 155) + "…"
      : product?.name_id
      ? `Beli ${product.name_id} di TBK Santi. Harga Rp ${Math.round(product.price).toLocaleString("id-ID")}. Kirim seluruh Indonesia.`
      : undefined,
    image: product?.image ? (product.image.startsWith("http") ? product.image : "https://tbksanti.id" + product.image) : undefined,
    canonical: id ? `/shop/produk/${id}` : undefined,
    jsonLD: product ? productJsonLD(product) : undefined,
  });

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

  const handleAdd = async () => {
    if (!product) return;
    setAdding(true);
    try {
      await addToCart(product.id, qty);
      toast.success(`${qty} × ${product.name_id} ditambahkan ke keranjang`);
      // GA4 + Meta Pixel — add_to_cart standard e-commerce event.
      trackEvent("add_to_cart", {
        currency: "IDR",
        value: effectivePrice * qty,
        items: [{ item_id: product.id, item_name: product.name_id, price: effectivePrice, quantity: qty }],
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal menambahkan ke keranjang";
      toast.error(msg);
    } finally {
      setAdding(false);
    }
  };

  // Beli Sekarang — bypass cart, langsung ke checkout dengan produk ini saja.
  // Session-scoped context via sessionStorage — hilang saat tab close (safe).
  const handleBuyNow = () => {
    if (!product) return;
    sessionStorage.setItem(
      "checkoutContext",
      JSON.stringify({
        mode: "buy_now",
        buy_now_items: [{ product_id: product.id, quantity: qty }],
      })
    );
    // GA4 begin_checkout event.
    trackEvent("begin_checkout", {
      currency: "IDR",
      value: effectivePrice * qty,
      items: [{ item_id: product.id, item_name: product.name_id, price: effectivePrice, quantity: qty }],
    });
    navigate("/checkout");
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
    // pb-44 mobile = clearance untuk sticky action bar (72px) + BottomNav (76px)
    // + safe-area. Cegah content ter-obscure saat scroll ke bawah.
    <div className="max-w-4xl mx-auto p-4 pb-44 sm:pb-4">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1 text-sm text-ink-700 hover:text-ink-900 mb-4"
      >
        <ArrowLeft size={16} />
        Kembali
      </button>

      <div className="grid sm:grid-cols-2 gap-6">
        {/* Gallery — swipe di mobile, thumbnail row + arrow di desktop.
            Fallback ke [product.image] kalau BE tidak return images. */}
        <ProductGallery
          images={product.images && product.images.length > 0 ? product.images : (product.image ? [product.image] : [])}
          alt={product.name_id}
          weightBadge={product.weight_grams ? formatWeight(product.weight_grams) : undefined}
          stockBadge={product.is_low_stock && product.stock > 0 ? `Sisa ${product.stock}` : undefined}
        />

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

          {/* Stock urgency banner — pattern Tokopedia/Shopee "Stok tinggal N!"
              untuk trigger FOMO + jujur ke customer. */}
          {product.stock === 0 ? (
            <div className="bg-ink-100 border border-ink-500/30 rounded-2xl p-3">
              <div className="flex items-center gap-2 mb-2">
                <Package size={16} className="text-ink-700 shrink-0" aria-hidden="true" />
                <p className="text-sm font-black text-ink-700">Stok habis</p>
              </div>
              {/* Sprint 3 #16 — restock alert toggle */}
              <button
                type="button"
                onClick={async () => {
                  if (restockLoading) return;
                  setRestockLoading(true);
                  try {
                    if (restockSub) {
                      await publicApi.restockUnsubscribe(product.id);
                      setRestockSub(false);
                      toast.success("Notifikasi restock dimatikan");
                    } else {
                      await publicApi.restockSubscribe(product.id);
                      setRestockSub(true);
                      toast.success("Kami akan kabari begitu produk restock");
                    }
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Gagal ubah notifikasi");
                  } finally {
                    setRestockLoading(false);
                  }
                }}
                disabled={restockLoading}
                className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-bold border disabled:opacity-40 ${
                  restockSub
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                    : "border-cherry-300 bg-white text-cherry-600 hover:bg-cherry-50"
                }`}
              >
                {restockSub ? (
                  <>
                    <Bell size={12} aria-hidden="true" />
                    Sudah aktif — Matikan
                  </>
                ) : (
                  <>
                    <BellOff size={12} aria-hidden="true" />
                    Kabari saya kalau restock
                  </>
                )}
              </button>
            </div>
          ) : product.stock <= 5 ? (
            <div className="bg-amber-50 border border-amber-500/40 rounded-2xl p-3 flex items-center gap-2">
              <TrendingDown size={16} className="text-amber-600 shrink-0" aria-hidden="true" />
              <p className="text-sm font-black text-amber-700">
                Stok tinggal {product.stock}! Buruan check-out.
              </p>
            </div>
          ) : product.is_low_stock ? (
            <div className="bg-cherry-50 border border-cherry-200 rounded-2xl p-3 flex items-center gap-2">
              <TrendingDown size={16} className="text-cherry-500 shrink-0" aria-hidden="true" />
              <p className="text-sm font-bold text-cherry-600">
                Stok terbatas — tersisa {product.stock}
              </p>
            </div>
          ) : null}

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
            {/* 2-tombol pattern e-commerce standar: primary "Beli Sekarang"
                (direct checkout), secondary "+ Keranjang" (build cart). */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleAdd}
                disabled={adding}
                className="flex items-center justify-center gap-2 py-3.5 rounded-2xl border-2 border-cherry-300 text-cherry-500 text-sm font-bold hover:bg-cherry-50 disabled:opacity-60"
              >
                <ShoppingBag size={16} aria-hidden="true" />
                {adding ? "…" : "Keranjang"}
              </button>
              <button
                onClick={handleBuyNow}
                disabled={adding}
                className="flex items-center justify-center gap-2 py-3.5 rounded-2xl text-white text-sm font-bold bg-gradient-to-r from-cherry-400 to-cherry-500 hover:opacity-90 disabled:opacity-60"
              >
                Beli Sekarang
              </button>
            </div>
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

      {/* Reviews (Sprint 5b) — display + submit form (gated ke completed orders) */}
      <ProductReviews productId={product.id} />

      {/* Related Products (Sprint 2 #6) — cross-sell dari category sama.
          Horizontal scroll di mobile, grid di desktop. Best-effort fetch. */}
      {related.length > 0 && (
        <section className="mt-6 border-t border-cherry-100 pt-5">
          <div className="flex items-center justify-between gap-2 mb-3 px-4 sm:px-0">
            <h2 className="text-lg font-black text-ink-900">Produk Sejenis</h2>
            {product.category_id && (
              <Link
                to={`/kategori/${product.category_id}`}
                className="text-sm font-bold text-cherry-500 hover:text-cherry-600 shrink-0"
              >
                Lihat semua
              </Link>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {related.map((rp) => (
              <ProductCard key={rp.id} p={rp} />
            ))}
          </div>
        </section>
      )}

      {/* Sticky action bar (mobile) — sits ABOVE BottomNav. BottomNav = fixed
          bottom-0 z-40 tinggi 56px+safe-area; action bar tumpuk di atasnya
          via bottom-14 (56px) + z-50. Tanpa offset ini, action bar
          ke-obscure oleh BottomNav → user tidak lihat tombol beli. */}
      <div
        className="sm:hidden fixed left-0 right-0 z-50 bg-white border-t border-cherry-200 px-3 py-3 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] [bottom:calc(56px+env(safe-area-inset-bottom))]"
      >
        <div className="flex items-center gap-2">
          {/* Qty stepper — compact: 34/28/34 = 96px total */}
          <div className="inline-flex items-center border border-cherry-200 rounded-xl shrink-0">
            <button
              onClick={() => changeQty(-1)}
              disabled={qty <= product.min_order}
              aria-label="Kurang"
              className="w-9 h-11 flex items-center justify-center hover:bg-cherry-50 disabled:opacity-30"
            >
              <Minus size={14} aria-hidden="true" />
            </button>
            <span className="w-7 text-center text-sm font-bold">{qty}</span>
            <button
              onClick={() => changeQty(1)}
              disabled={qty >= product.stock}
              aria-label="Tambah"
              className="w-9 h-11 flex items-center justify-center hover:bg-cherry-50 disabled:opacity-30"
            >
              <Plus size={14} aria-hidden="true" />
            </button>
          </div>
          <button
            onClick={handleAdd}
            disabled={adding}
            aria-label="Tambah ke keranjang"
            className="w-11 h-11 shrink-0 rounded-xl flex items-center justify-center border-2 border-cherry-300 text-cherry-500 disabled:opacity-60"
          >
            <ShoppingBag size={16} aria-hidden="true" />
          </button>
          <button
            onClick={handleBuyNow}
            disabled={adding}
            className="flex-1 min-w-0 flex items-center justify-center gap-1 h-11 rounded-xl text-white text-sm font-bold bg-gradient-to-r from-cherry-400 to-cherry-500 disabled:opacity-60 active:scale-[0.98] transition-transform"
          >
            <span className="truncate">Beli · {formatRp(effectivePrice * qty)}</span>
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
