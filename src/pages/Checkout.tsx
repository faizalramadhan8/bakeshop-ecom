import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft, MapPin, Truck, CreditCard, Check, Plus, AlertCircle, Package,
  X, ChevronDown, Loader2, Wallet,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  addressApi, checkoutApi, formatRp, pgChannelsApi, publicApi,
  type Address, type ShippingRate, type ShippingRatesResponse,
  type PGChannel, type PGChannelGroup, type PGChannelCategory,
  type EcomProductDetail,
} from "@/lib/api";
import { useCart, refreshCart } from "@/lib/cartStore";
import { trackEvent } from "@/lib/analytics";

// CheckoutContext (dari sessionStorage) — set oleh Cart page atau PDP "Beli Sekarang".
type CheckoutContext =
  | { mode: "cart"; selected_item_ids?: string[] }
  | { mode: "buy_now"; buy_now_items: { product_id: string; quantity: number }[] };

// Label Indonesia untuk PG category header — biar Bu Santi ngerti (bukan
// "virtual-account" yang tehnis).
const CATEGORY_LABEL: Record<PGChannelCategory, string> = {
  "virtual-account": "Virtual Account (Transfer Bank)",
  "qris": "QRIS",
  "e-wallet": "E-Wallet",
  "credit-card": "Kartu Kredit",
};

// Ordering — VA di atas (paling common Indonesia), QRIS + e-wallet next
// (skala Bu Santi customer digital-native), credit card terakhir (rare).
const CATEGORY_ORDER: PGChannelCategory[] = ["virtual-account", "qris", "e-wallet", "credit-card"];

// Grouped shipping rates by carrier — untuk UX dropdown.
// Kalau ada JNE Reguler + JNE YES, jadi 1 grup JNE dengan 2 sub-option.
function groupByCarrier(rates: ShippingRate[]): Array<{ carrier: string; options: ShippingRate[] }> {
  const map = new Map<string, ShippingRate[]>();
  for (const r of rates) {
    const key = r.courier_name || r.courier;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(r);
  }
  return Array.from(map.entries())
    .map(([carrier, options]) => ({
      carrier,
      // Sort by cost naik supaya customer lihat termurah dulu.
      options: options.sort((a, b) => a.cost - b.cost),
    }))
    .sort((a, b) => {
      // Sort carrier by cheapest option, jadi termurah keliatan di atas.
      const minA = Math.min(...a.options.map((o) => o.cost));
      const minB = Math.min(...b.options.map((o) => o.cost));
      return minA - minB;
    });
}

export function Checkout() {
  const navigate = useNavigate();
  const { cart } = useCart();

  // Load checkout context sekali di mount. Kalau tidak ada = full cart mode.
  const [ctx] = useState<CheckoutContext>(() => {
    try {
      const raw = sessionStorage.getItem("checkoutContext");
      if (!raw) return { mode: "cart" };
      return JSON.parse(raw) as CheckoutContext;
    } catch {
      return { mode: "cart" };
    }
  });
  const isBuyNow = ctx.mode === "buy_now";
  const selectedIds = ctx.mode === "cart" ? ctx.selected_item_ids : undefined;

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [showAddressSwitcher, setShowAddressSwitcher] = useState(false);

  const [rates, setRates] = useState<ShippingRatesResponse | null>(null);
  const [loadingRates, setLoadingRates] = useState(false);
  const [selectedRate, setSelectedRate] = useState<ShippingRate | null>(null);
  const [expandedCarrier, setExpandedCarrier] = useState<string | null>(null);

  const [placing, setPlacing] = useState(false);
  const [voucherInput, setVoucherInput] = useState("");
  const [applyingVoucher, setApplyingVoucher] = useState(false);
  const [appliedVoucher, setAppliedVoucher] = useState<{ code: string; discount: number; description?: string } | null>(null);

  // Buy-now: fetch produk detail supaya bisa tampil nama + harga + subtotal
  // real (bukan placeholder "—"). Cart mode ambil dari useCart, tidak perlu
  // fetch tambahan. Failed fetch → item skip render, checkout tetap bisa jalan
  // (BE re-verify harga).
  const [buyNowProducts, setBuyNowProducts] = useState<EcomProductDetail[]>([]);
  useEffect(() => {
    if (!isBuyNow || ctx.mode !== "buy_now") return;
    Promise.all(
      ctx.buy_now_items.map((bn) => publicApi.getProduct(bn.product_id).catch(() => null))
    ).then((results) => {
      setBuyNowProducts(results.filter((p): p is EcomProductDetail => p !== null));
    });
  }, [isBuyNow, ctx]);

  // PG channels — di-fetch langsung dari alifworks (public endpoint). Grup
  // by category (VA / QRIS / e-wallet / kartu kredit) sesuai preferensi
  // Bu Santi. Loading state di-tampilkan di section pembayaran; kalau fetch
  // gagal, section jadi disabled + tampil retry.
  const [channelGroups, setChannelGroups] = useState<PGChannelGroup[]>([]);
  const [loadingChannels, setLoadingChannels] = useState(false);
  const [channelsError, setChannelsError] = useState<string | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<PGChannel | null>(null);

  const loadChannels = () => {
    setLoadingChannels(true);
    setChannelsError(null);
    pgChannelsApi.list()
      .then((groups) => {
        // Sort groups sesuai CATEGORY_ORDER, filter category yang tidak
        // dikenal (defensive kalau PG tambah kategori baru).
        const known = groups.filter((g) => CATEGORY_ORDER.includes(g.category));
        known.sort((a, b) => CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category));
        setChannelGroups(known);
      })
      .catch((err) => setChannelsError(err instanceof Error ? err.message : "Gagal memuat metode pembayaran"))
      .finally(() => setLoadingChannels(false));
  };

  useEffect(() => {
    loadChannels();
  }, []);

  useEffect(() => {
    if (!isBuyNow) refreshCart();
    addressApi
      .list()
      .then((list) => {
        setAddresses(list);
        const def = list.find((a) => a.is_default) || list[0];
        if (def) setSelectedAddress(def);
      })
      .catch(() => setAddresses([]));
  }, [isBuyNow]);

  // Cleanup context saat unmount ATAU saat kembali ke katalog — cegah context
  // "nyangkut" untuk checkout berikutnya.
  useEffect(() => {
    return () => {
      // Only clear kalau kita nggak lagi navigate ke pesanan (success flow
      // navigate langsung ke /pesanan/:id, unmount fire disini).
      // Simple approach: clear di unmount, kalau nanti user buka lagi Cart /
      // PDP, mereka set context baru.
      sessionStorage.removeItem("checkoutContext");
    };
  }, []);

  // Cart empty guard — tapi hanya untuk mode cart (buy-now nggak butuh cart).
  useEffect(() => {
    if (isBuyNow) return;
    if (cart && cart.items.length === 0) {
      toast.error("Keranjangmu kosong");
      navigate("/kategori");
    }
  }, [cart, navigate, isBuyNow]);

  // Compute local subtotal untuk display (BE tetap re-verify di CreateOrder).
  const localSubtotal = useMemo(() => {
    if (isBuyNow && ctx.mode === "buy_now") {
      // Buy-now — hitung dari produk yang sudah di-fetch. Kalau ada item
      // yang belum ke-fetch (network gagal), skip. BE re-verify saat checkout.
      return ctx.buy_now_items.reduce((sum, bn) => {
        const p = buyNowProducts.find((x) => x.id === bn.product_id);
        if (!p) return sum;
        const price = p.price;
        return sum + price * bn.quantity;
      }, 0);
    }
    if (!cart) return 0;
    if (!selectedIds || selectedIds.length === 0) return cart.subtotal;
    const set = new Set(selectedIds);
    return cart.items
      .filter((i) => set.has(i.id) && !i.unavailable)
      .reduce((s, i) => s + i.subtotal, 0);
  }, [cart, selectedIds, isBuyNow, ctx, buyNowProducts]);

  const localItemCount = useMemo(() => {
    if (isBuyNow) return ctx.mode === "buy_now" ? ctx.buy_now_items.length : 0;
    if (!cart) return 0;
    if (!selectedIds || selectedIds.length === 0) return cart.item_count;
    const set = new Set(selectedIds);
    return cart.items.filter((i) => set.has(i.id) && !i.unavailable).length;
  }, [cart, selectedIds, isBuyNow, ctx]);

  const localTotalQty = useMemo(() => {
    if (isBuyNow && ctx.mode === "buy_now") {
      return ctx.buy_now_items.reduce((s, i) => s + i.quantity, 0);
    }
    if (!cart) return 0;
    if (!selectedIds || selectedIds.length === 0) return cart.total_qty;
    const set = new Set(selectedIds);
    return cart.items.filter((i) => set.has(i.id) && !i.unavailable).reduce((s, i) => s + i.quantity, 0);
  }, [cart, selectedIds, isBuyNow, ctx]);

  // Load shipping rates saat address berubah (bukan step).
  useEffect(() => {
    if (!selectedAddress) return;
    setLoadingRates(true);
    setSelectedRate(null);
    checkoutApi
      .getShippingRates(selectedAddress.id, {
        selected_item_ids: selectedIds,
        buy_now_items: ctx.mode === "buy_now" ? ctx.buy_now_items : undefined,
      })
      .then((r) => {
        setRates(r);
        if (r.rates.length > 0) {
          // Auto-pick termurah — bukan first (dulu bug: kadang termahal jadi default).
          const cheapest = [...r.rates].sort((a, b) => a.cost - b.cost)[0];
          setSelectedRate(cheapest);
          // Auto-expand grup carrier termurah.
          setExpandedCarrier(cheapest.courier_name || cheapest.courier);
        }
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Gagal ambil ongkir"))
      .finally(() => setLoadingRates(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAddress?.id]);

  const applyVoucher = async () => {
    const code = voucherInput.trim();
    if (!code) return;
    setApplyingVoucher(true);
    try {
      const resp = await checkoutApi.validateVoucher(code);
      setAppliedVoucher({ code: resp.code, discount: resp.discount, description: resp.description });
      toast.success(`Voucher aktif: hemat ${formatRp(resp.discount)}`);
    } catch (err) {
      setAppliedVoucher(null);
      toast.error(err instanceof Error ? err.message : "Voucher tidak valid");
    } finally {
      setApplyingVoucher(false);
    }
  };

  const removeVoucher = () => {
    setAppliedVoucher(null);
    setVoucherInput("");
  };

  const voucherDiscount = appliedVoucher?.discount || 0;
  const shippingCost = selectedRate?.cost || 0;
  const total = Math.max(0, localSubtotal - voucherDiscount) + shippingCost;

  const placeOrder = async () => {
    if (!selectedAddress) {
      toast.error("Pilih alamat pengiriman");
      return;
    }
    if (!selectedRate) {
      toast.error("Pilih metode pengiriman");
      return;
    }
    if (!selectedChannel) {
      toast.error("Pilih metode pembayaran");
      return;
    }
    setPlacing(true);
    try {
      const resp = await checkoutApi.createOrder({
        address_id: selectedAddress.id,
        // Kirim CODE (bukan display name) — BE pakai untuk call Biteship
        // /v1/orders. Display name di *_name untuk render UI.
        shipping_courier: selectedRate.courier,
        shipping_courier_name: selectedRate.courier_name,
        shipping_service: selectedRate.service,
        shipping_service_name: selectedRate.service_name,
        shipping_cost: selectedRate.cost,
        shipping_etd: selectedRate.etd,
        voucher_code: appliedVoucher?.code,
        payment_channel: selectedChannel.payment_code,
        payment_channel_category: selectedChannel.category,
        selected_item_ids: selectedIds,
        buy_now_items: ctx.mode === "buy_now" ? ctx.buy_now_items : undefined,
      });
      if (!isBuyNow) await refreshCart();
      // Clear context — kita sudah pakai.
      sessionStorage.removeItem("checkoutContext");
      trackEvent("purchase", {
        transaction_id: resp.order_id,
        currency: "IDR",
        value: resp.total,
        shipping: resp.shipping_cost,
      });
      // PG DOKU — redirect ke checkout link supaya customer bisa bayar VA/
      // QRIS/e-wallet. Kalau stub / gagal PG, fallback ke pesanan detail
      // dengan mode manual (Bu Santi verify bank transfer).
      if (resp.payment_mode === "pg" && resp.payment_url && !resp.payment_url.startsWith("stub-")) {
        window.location.href = resp.payment_url;
        return;
      }
      toast.success("Order berhasil dibuat");
      navigate(`/pesanan/${resp.order_id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal checkout");
    } finally {
      setPlacing(false);
    }
  };

  if (!isBuyNow && !cart) {
    return <div className="max-w-4xl mx-auto p-6 text-center text-ink-500">Memuat…</div>;
  }

  const groupedRates = rates ? groupByCarrier(rates.rates) : [];

  return (
    <div className="max-w-3xl mx-auto p-4 pb-40 sm:pb-24">
      <div className="flex items-center gap-2 mb-4">
        <Link
          to={isBuyNow ? "/kategori" : "/keranjang"}
          aria-label="Kembali"
          className="w-9 h-9 rounded-xl flex items-center justify-center text-ink-700 hover:bg-cherry-50"
        >
          <ArrowLeft size={16} aria-hidden="true" />
        </Link>
        <h1 className="text-xl font-black text-ink-900">Checkout</h1>
      </div>

      {/* Section 1 — Alamat */}
      <section className="bg-white border border-cherry-200 rounded-2xl p-4 mb-3">
        <div className="flex items-center gap-2 mb-3">
          <MapPin size={16} className="text-cherry-500" aria-hidden="true" />
          <h2 className="text-sm font-black text-ink-900">Alamat Pengiriman</h2>
        </div>
        {selectedAddress ? (
          <div>
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-ink-900">
                  {selectedAddress.recipient_name}{" "}
                  <span className="text-xs font-semibold text-ink-500">
                    · {selectedAddress.label}
                    {selectedAddress.is_default && " · Utama"}
                  </span>
                </p>
                <p className="text-sm text-ink-700">{selectedAddress.recipient_phone}</p>
                <p className="text-sm text-ink-700 mt-1 leading-relaxed">
                  {selectedAddress.street_address}, {selectedAddress.subdistrict}, {selectedAddress.district}, {selectedAddress.city}, {selectedAddress.province} {selectedAddress.zipcode}
                </p>
              </div>
              {addresses.length > 1 && (
                <button
                  onClick={() => setShowAddressSwitcher(!showAddressSwitcher)}
                  className="shrink-0 text-xs font-bold text-cherry-500 hover:text-cherry-600 underline"
                >
                  Ganti
                </button>
              )}
            </div>
            {showAddressSwitcher && (
              <div className="mt-3 pt-3 border-t border-cherry-100 flex flex-col gap-2">
                {addresses.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => {
                      setSelectedAddress(a);
                      setShowAddressSwitcher(false);
                    }}
                    aria-pressed={a.id === selectedAddress?.id}
                    className={`text-left px-3 py-2 rounded-xl border text-sm ${
                      a.id === selectedAddress?.id
                        ? "border-cherry-500 bg-cherry-50"
                        : "border-cherry-100 hover:border-cherry-300"
                    }`}
                  >
                    <p className="font-bold text-ink-900">{a.label} — {a.recipient_name}</p>
                    <p className="text-xs text-ink-500 truncate">{a.street_address}, {a.city}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-ink-500 mb-3">Belum ada alamat</p>
            <Link
              to="/akun/alamat"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-sm font-bold bg-gradient-to-r from-cherry-400 to-cherry-500"
            >
              <Plus size={14} aria-hidden="true" /> Tambah Alamat
            </Link>
          </div>
        )}
        {selectedAddress && (
          <Link
            to="/akun/alamat"
            className="inline-flex items-center gap-1 mt-3 text-xs font-bold text-cherry-500 hover:text-cherry-600"
          >
            <Plus size={12} aria-hidden="true" /> Tambah / kelola alamat
          </Link>
        )}
      </section>

      {/* Section 2 — Pengiriman */}
      <section className="bg-white border border-cherry-200 rounded-2xl p-4 mb-3">
        <div className="flex items-center gap-2 mb-3">
          <Truck size={16} className="text-cherry-500" aria-hidden="true" />
          <h2 className="text-sm font-black text-ink-900">Metode Pengiriman</h2>
        </div>
        {!selectedAddress ? (
          <p className="text-sm text-ink-500">Pilih alamat dulu untuk hitung ongkir.</p>
        ) : loadingRates ? (
          <div className="flex items-center justify-center py-6 text-ink-500 text-sm">
            <Loader2 size={16} className="animate-spin mr-2" aria-hidden="true" />
            Menghitung ongkir…
          </div>
        ) : groupedRates.length === 0 ? (
          <div className="text-center py-6 text-ink-500">
            <AlertCircle size={24} className="mx-auto mb-1 text-cherry-500" aria-hidden="true" />
            <p className="text-sm">Tidak ada opsi kirim untuk alamat ini.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {groupedRates.map(({ carrier, options }) => {
              const expanded = expandedCarrier === carrier;
              const selectedInCarrier = options.find((o) => o === selectedRate);
              const cheapest = options[0];
              return (
                <div
                  key={carrier}
                  className={`border rounded-xl overflow-hidden ${
                    selectedInCarrier ? "border-cherry-500" : "border-cherry-100"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setExpandedCarrier(expanded ? null : carrier)}
                    aria-expanded={expanded}
                    className={`w-full flex items-center justify-between px-3 py-3 text-left ${
                      selectedInCarrier ? "bg-cherry-50" : "hover:bg-cherry-50/50"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-white border border-cherry-100 flex items-center justify-center shrink-0">
                        <Truck size={14} className="text-cherry-500" aria-hidden="true" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-ink-900 truncate">{carrier}</p>
                        {selectedInCarrier ? (
                          <p className="text-xs text-cherry-600 font-bold">
                            {selectedInCarrier.service_name} · {formatRp(selectedInCarrier.cost)}
                          </p>
                        ) : (
                          <p className="text-xs text-ink-500">
                            {options.length > 1 ? `${options.length} pilihan · mulai ` : ""}
                            {formatRp(cheapest.cost)}
                          </p>
                        )}
                      </div>
                    </div>
                    <ChevronDown
                      size={16}
                      className={`text-ink-500 shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`}
                      aria-hidden="true"
                    />
                  </button>
                  {expanded && (
                    <div className="border-t border-cherry-100 flex flex-col">
                      {options.map((opt) => {
                        const active = opt === selectedRate;
                        return (
                          <button
                            key={opt.courier + opt.service}
                            type="button"
                            onClick={() => setSelectedRate(opt)}
                            aria-pressed={active}
                            className={`flex items-center gap-3 px-3 py-3 text-left border-t border-cherry-50 first:border-t-0 ${
                              active ? "bg-cherry-100/40" : "hover:bg-cherry-50/50"
                            }`}
                          >
                            <div className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${
                              active ? "border-cherry-500 bg-cherry-500" : "border-cherry-300 bg-white"
                            }`}>
                              {active && <Check size={10} className="text-white" strokeWidth={3} aria-hidden="true" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-ink-900">{opt.service_name}</p>
                              <p className="text-xs text-ink-500">Estimasi {opt.etd || "—"}</p>
                            </div>
                            <p className="text-sm font-bold text-ink-900 shrink-0">
                              {formatRp(opt.cost)}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Section 3 — Pembayaran + Voucher + Ringkasan */}
      <section className="bg-white border border-cherry-200 rounded-2xl p-4 mb-3">
        <div className="flex items-center gap-2 mb-3">
          <CreditCard size={16} className="text-cherry-500" aria-hidden="true" />
          <h2 className="text-sm font-black text-ink-900">Metode Pembayaran</h2>
        </div>

        {loadingChannels && (
          <div className="flex items-center justify-center gap-2 py-6 text-ink-500 text-sm">
            <Loader2 size={16} className="animate-spin" aria-hidden="true" />
            Memuat metode pembayaran…
          </div>
        )}

        {channelsError && !loadingChannels && (
          <div className="bg-cherry-50 border border-cherry-200 rounded-xl p-3 text-sm">
            <p className="text-cherry-600 font-bold mb-2">{channelsError}</p>
            <button
              type="button"
              onClick={loadChannels}
              className="text-xs font-bold text-cherry-500 underline hover:text-cherry-600"
            >
              Coba lagi
            </button>
          </div>
        )}

        {!loadingChannels && !channelsError && channelGroups.length > 0 && (
          <div className="space-y-4">
            {channelGroups.map((group) => (
              <div key={group.category}>
                <p className="text-xs font-black uppercase tracking-wider text-ink-500 mb-2">
                  {CATEGORY_LABEL[group.category]}
                </p>
                <div className="grid grid-cols-1 xs:grid-cols-2 gap-2">
                  {group.channels.map((ch) => {
                    const active = selectedChannel?.id === ch.id;
                    return (
                      <button
                        key={ch.id}
                        type="button"
                        onClick={() => setSelectedChannel(ch)}
                        aria-pressed={active}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 text-left transition-colors ${
                          active
                            ? "border-cherry-500 bg-cherry-50"
                            : "border-cherry-100 bg-white hover:border-cherry-300"
                        }`}
                      >
                        <div className="w-10 h-10 rounded-lg bg-white border border-cherry-100 flex items-center justify-center shrink-0 overflow-hidden">
                          {ch.payment_logo ? (
                            // eslint-disable-next-line jsx-a11y/alt-text
                            <img
                              src={ch.payment_logo}
                              alt=""
                              className="max-w-full max-h-full object-contain"
                              loading="lazy"
                            />
                          ) : (
                            <Wallet size={16} className="text-cherry-500" aria-hidden="true" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-ink-900 truncate">{ch.payment_name}</p>
                          {ch.total_admin_fee > 0 && (
                            <p className="text-xs text-ink-500">Biaya admin {formatRp(ch.total_admin_fee)}</p>
                          )}
                        </div>
                        <div
                          className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${
                            active ? "border-cherry-500 bg-cherry-500" : "border-cherry-300 bg-white"
                          }`}
                          aria-hidden="true"
                        >
                          {active && <Check size={10} className="text-white" strokeWidth={3} />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {!loadingChannels && !channelsError && channelGroups.length === 0 && (
          <p className="text-sm text-ink-500 py-4 text-center">
            Tidak ada metode pembayaran tersedia saat ini.
          </p>
        )}

        {/* Voucher input */}
        <div className="mt-4 pt-4 border-t border-cherry-100">
          <p className="text-xs font-bold text-ink-700 uppercase tracking-wider mb-2">
            Voucher / Kode Promo
          </p>
          {appliedVoucher ? (
            <div className="flex items-center justify-between gap-2 bg-cherry-50 border border-cherry-200 rounded-xl px-3 py-2">
              <div className="min-w-0">
                <p className="text-sm font-black text-cherry-600 truncate">{appliedVoucher.code}</p>
                {appliedVoucher.description && (
                  <p className="text-xs text-ink-500 truncate">{appliedVoucher.description}</p>
                )}
              </div>
              <button
                onClick={removeVoucher}
                aria-label="Hapus voucher"
                className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-ink-700 hover:bg-white"
              >
                <X size={14} aria-hidden="true" />
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                value={voucherInput}
                onChange={(e) => setVoucherInput(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && applyVoucher()}
                placeholder="Kode voucher"
                className="flex-1 px-3 py-2.5 rounded-xl border border-cherry-200 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-cherry-500/30 focus:border-cherry-400"
                aria-label="Kode voucher"
              />
              <button
                onClick={applyVoucher}
                disabled={!voucherInput.trim() || applyingVoucher}
                className="px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-cherry-400 to-cherry-500 disabled:opacity-40"
              >
                {applyingVoucher ? "…" : "Apply"}
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Ringkasan Belanja */}
      <section className="bg-white border border-cherry-200 rounded-2xl p-4 mb-3">
        <div className="flex items-center gap-2 mb-3">
          <Package size={16} className="text-cherry-500" aria-hidden="true" />
          <h2 className="text-sm font-black text-ink-900">
            Ringkasan {isBuyNow && "(Beli Langsung)"}
          </h2>
        </div>

        {/* List item — cart mode dari useCart, buy-now dari fetched products.
            Cegah UX bingung "kenapa produk yang saya klik tidak muncul". */}
        {isBuyNow && ctx.mode === "buy_now" && (
          <ul className="mb-3 space-y-2 border-b border-cherry-100 pb-3">
            {ctx.buy_now_items.map((bn) => {
              const p = buyNowProducts.find((x) => x.id === bn.product_id);
              const price = p ? p.price : 0;
              return (
                <li key={bn.product_id} className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-lg bg-cherry-50 border border-cherry-100 shrink-0 overflow-hidden flex items-center justify-center">
                    {p?.image ? (
                      // eslint-disable-next-line jsx-a11y/alt-text
                      <img src={p.image} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Package size={18} className="text-cherry-300" aria-hidden="true" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-ink-900 truncate">
                      {p?.name_id || "Memuat produk…"}
                    </p>
                    <p className="text-xs text-ink-500">
                      {bn.quantity} × {p ? formatRp(price) : "—"}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-ink-900 shrink-0">
                    {p ? formatRp(price * bn.quantity) : "—"}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
        {!isBuyNow && cart && (
          <ul className="mb-3 space-y-2 border-b border-cherry-100 pb-3">
            {cart.items
              .filter((i) => !i.unavailable && (!selectedIds || selectedIds.includes(i.id)))
              .map((it) => (
                <li key={it.id} className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-lg bg-cherry-50 border border-cherry-100 shrink-0 overflow-hidden flex items-center justify-center">
                    {it.image ? (
                      // eslint-disable-next-line jsx-a11y/alt-text
                      <img src={it.image} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Package size={18} className="text-cherry-300" aria-hidden="true" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-ink-900 truncate">{it.name_id || it.name}</p>
                    <p className="text-xs text-ink-500">
                      {it.quantity} × {formatRp(it.price)}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-ink-900 shrink-0">{formatRp(it.subtotal)}</p>
                </li>
              ))}
          </ul>
        )}

        <dl className="text-sm space-y-2">
          <div className="flex justify-between">
            <dt className="text-ink-700">
              Subtotal ({localTotalQty} item{localItemCount > 1 ? `, ${localItemCount} produk` : ""})
            </dt>
            <dd className="font-bold text-ink-900">
              {formatRp(localSubtotal)}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-700">Ongkir</dt>
            <dd className="font-bold text-ink-900">
              {selectedRate ? formatRp(selectedRate.cost) : "—"}
            </dd>
          </div>
          {appliedVoucher && (
            <div className="flex justify-between text-cherry-600">
              <dt className="font-bold">Voucher {appliedVoucher.code}</dt>
              <dd className="font-bold">−{formatRp(appliedVoucher.discount)}</dd>
            </div>
          )}
          <div className="border-t border-cherry-100 pt-2 mt-2 flex justify-between items-center">
            <dt className="text-base font-black text-ink-900">Total</dt>
            <dd className="text-xl font-black text-cherry-500">
              {!selectedRate ? "—" : formatRp(total)}
            </dd>
          </div>
        </dl>
      </section>

      {/* Sticky bottom — Place Order button.
          Mobile: offset di atas BottomNav (56px + safe-area).
          Desktop: flush bottom (BottomNav hidden sm:hidden). */}
      <div
        className="fixed left-0 right-0 z-50 bg-white border-t border-cherry-200 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] [bottom:calc(56px+env(safe-area-inset-bottom))] sm:!bottom-0"
      >
        <div className="max-w-3xl mx-auto px-3 sm:px-4 py-3 flex items-center gap-2 sm:gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] sm:text-xs text-ink-500 leading-tight">Total</p>
            <p className="text-base sm:text-lg font-black text-cherry-500 leading-tight truncate">
              {isBuyNow && !selectedRate ? "—" : formatRp(total)}
            </p>
          </div>
          <button
            onClick={placeOrder}
            disabled={placing || !selectedAddress || !selectedRate}
            className="shrink-0 px-4 sm:px-6 py-3 rounded-xl text-white text-sm font-bold bg-gradient-to-r from-cherry-400 to-cherry-500 disabled:opacity-40 active:scale-[0.98]"
          >
            {placing ? (
              <>
                <Loader2 size={14} className="inline animate-spin mr-1" aria-hidden="true" />
                Memproses…
              </>
            ) : (
              "Buat Pesanan"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
