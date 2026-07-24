import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft, MapPin, Truck, CreditCard, Check, Plus, AlertCircle, Package,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  addressApi, checkoutApi, formatRp,
  type Address, type ShippingRate, type ShippingRatesResponse, type Cart,
} from "@/lib/api";
import { useCart, refreshCart } from "@/lib/cartStore";

type Step = 1 | 2 | 3;

export function Checkout() {
  const navigate = useNavigate();
  const { cart } = useCart();
  const [step, setStep] = useState<Step>(1);

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);

  const [rates, setRates] = useState<ShippingRatesResponse | null>(null);
  const [loadingRates, setLoadingRates] = useState(false);
  const [selectedRate, setSelectedRate] = useState<ShippingRate | null>(null);

  const [placing, setPlacing] = useState(false);

  useEffect(() => {
    refreshCart();
    addressApi
      .list()
      .then((list) => {
        setAddresses(list);
        const def = list.find((a) => a.is_default) || list[0];
        if (def) setSelectedAddress(def);
      })
      .catch(() => setAddresses([]));
  }, []);

  // Redirect kalau cart kosong
  useEffect(() => {
    if (cart && cart.items.length === 0) {
      toast.error("Keranjangmu kosong");
      navigate("/kategori");
    }
  }, [cart, navigate]);

  // Load shipping rates saat masuk step 2
  useEffect(() => {
    if (step !== 2 || !selectedAddress) return;
    setLoadingRates(true);
    checkoutApi
      .getShippingRates(selectedAddress.id)
      .then((r) => {
        setRates(r);
        if (r.rates.length > 0) setSelectedRate(r.rates[0]);
      })
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : "Gagal ambil ongkir");
      })
      .finally(() => setLoadingRates(false));
  }, [step, selectedAddress?.id]);

  const placeOrder = async () => {
    if (!selectedAddress || !selectedRate) return;
    setPlacing(true);
    try {
      const resp = await checkoutApi.createOrder({
        address_id: selectedAddress.id,
        shipping_courier: selectedRate.courier_name,
        shipping_service: selectedRate.service_name,
        shipping_cost: selectedRate.cost,
        shipping_etd: selectedRate.etd,
      });
      await refreshCart();
      // Kalau ada snap_token beneran (bukan stub), buka Snap popup / redirect.
      if (resp.payment_mode === "midtrans" && resp.snap_token && !resp.snap_token.startsWith("stub-")) {
        // Redirect ke Midtrans hosted payment page. Simpler dari embed Snap.js
        // (butuh script tag). Untuk MVP redirect approach OK.
        if (resp.snap_redirect_url) {
          window.location.href = resp.snap_redirect_url;
          return;
        }
        // Fallback ke halaman order dengan snap_token
      }
      toast.success("Order berhasil dibuat");
      navigate(`/pesanan/${resp.order_id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal checkout");
    } finally {
      setPlacing(false);
    }
  };

  if (!cart) {
    return <div className="max-w-4xl mx-auto p-6 text-center text-ink-500">Memuat…</div>;
  }

  const totalWithShipping = cart.subtotal + (selectedRate?.cost || 0);

  return (
    <div className="max-w-4xl mx-auto p-4 pb-48">
      <div className="flex items-center gap-2 mb-4">
        <Link to="/keranjang" className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-cherry-50">
          <ArrowLeft size={16} />
        </Link>
        <h1 className="text-xl font-black text-ink-900">Checkout</h1>
      </div>

      {/* Progress stepper */}
      <div className="flex items-center gap-1 mb-6">
        {[
          { n: 1, label: "Alamat", icon: MapPin },
          { n: 2, label: "Pengiriman", icon: Truck },
          { n: 3, label: "Pembayaran", icon: CreditCard },
        ].map((s, i) => (
          <div key={s.n} className="flex items-center flex-1">
            <div
              className={`flex items-center gap-2 ${
                step >= s.n ? "text-cherry-500" : "text-ink-500"
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                  step > s.n
                    ? "bg-cherry-500 text-white"
                    : step === s.n
                    ? "bg-gradient-to-br from-cherry-400 to-cherry-500 text-white"
                    : "bg-cherry-100 text-ink-500"
                }`}
              >
                {step > s.n ? <Check size={14} /> : <s.icon size={14} />}
              </div>
              <span className="text-xs font-bold hidden sm:inline">{s.label}</span>
            </div>
            {i < 2 && (
              <div
                className={`flex-1 h-0.5 mx-2 ${step > s.n ? "bg-cherry-500" : "bg-cherry-100"}`}
              />
            )}
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          {step === 1 && (
            <Step1Address
              addresses={addresses}
              selected={selectedAddress}
              onSelect={setSelectedAddress}
              onAddNew={() => navigate("/akun/alamat")}
            />
          )}
          {step === 2 && (
            <Step2Shipping
              rates={rates}
              loading={loadingRates}
              selected={selectedRate}
              onSelect={setSelectedRate}
            />
          )}
          {step === 3 && (
            <Step3Payment cart={cart} selectedAddress={selectedAddress} selectedRate={selectedRate} />
          )}
        </div>

        {/* Summary */}
        <div className="md:sticky md:top-20 self-start">
          <div className="bg-white border border-cherry-200 rounded-2xl p-4">
            <h3 className="text-sm font-black text-ink-900 mb-3">Ringkasan</h3>
            <dl className="text-sm space-y-2">
              <div className="flex justify-between">
                <dt className="text-ink-700">Subtotal ({cart.total_qty} item)</dt>
                <dd className="font-bold text-ink-900">{formatRp(cart.subtotal)}</dd>
              </div>
              {selectedRate && (
                <div className="flex justify-between">
                  <dt className="text-ink-700">Ongkir</dt>
                  <dd className="font-bold text-ink-900">{formatRp(selectedRate.cost)}</dd>
                </div>
              )}
            </dl>
            <div className="border-t border-cherry-100 mt-3 pt-3">
              <div className="flex justify-between mb-4">
                <span className="text-base font-black text-ink-900">Total</span>
                <span className="text-lg font-black text-cherry-500">
                  {formatRp(totalWithShipping)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky bottom actions — sit above BottomNav (56px + safe-area).
          Sebelumnya bottom-0 z-30 → ke-obscure BottomNav (z-40). */}
      <div
        className="fixed left-0 right-0 z-50 bg-white border-t border-cherry-200 px-4 py-3 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]"
        style={{ bottom: "calc(56px + env(safe-area-inset-bottom))" }}
      >
        <div className="max-w-4xl mx-auto flex items-center gap-2">
          {step > 1 && (
            <button
              onClick={() => setStep((step - 1) as Step)}
              className="px-4 py-3 rounded-xl border border-cherry-200 text-sm font-bold text-ink-700"
            >
              Kembali
            </button>
          )}
          {step < 3 ? (
            <button
              onClick={() => {
                if (step === 1 && !selectedAddress) {
                  toast.error("Pilih alamat pengiriman");
                  return;
                }
                if (step === 2 && !selectedRate) {
                  toast.error("Pilih metode pengiriman");
                  return;
                }
                setStep((step + 1) as Step);
              }}
              className="flex-1 py-3 rounded-xl text-white text-sm font-bold bg-gradient-to-r from-cherry-400 to-cherry-500"
            >
              Lanjut
            </button>
          ) : (
            <button
              onClick={placeOrder}
              disabled={placing || !selectedAddress || !selectedRate}
              className="flex-1 py-3 rounded-xl text-white text-sm font-bold bg-gradient-to-r from-cherry-400 to-cherry-500 disabled:opacity-60"
            >
              {placing ? "Memproses…" : `Bayar ${formatRp(totalWithShipping)}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Step 1: Alamat ─────────────────────────────────────────────────
function Step1Address({
  addresses,
  selected,
  onSelect,
  onAddNew,
}: {
  addresses: Address[];
  selected: Address | null;
  onSelect: (a: Address) => void;
  onAddNew: () => void;
}) {
  if (addresses.length === 0) {
    return (
      <div className="bg-white border border-cherry-200 rounded-2xl p-8 text-center">
        <MapPin size={40} className="mx-auto text-cherry-300 mb-3" />
        <p className="text-sm font-bold text-ink-900 mb-1">Belum ada alamat</p>
        <p className="text-xs text-ink-500 mb-4">
          Tambah alamat pengiriman dulu supaya bisa checkout
        </p>
        <button
          onClick={onAddNew}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-white text-sm font-bold bg-gradient-to-r from-cherry-400 to-cherry-500"
        >
          <Plus size={14} />
          Tambah Alamat
        </button>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-bold text-ink-900">Pilih alamat pengiriman</p>
      {addresses.map((a) => (
        <button
          key={a.id}
          onClick={() => onSelect(a)}
          className={`text-left bg-white border-2 rounded-2xl p-4 transition-all ${
            selected?.id === a.id ? "border-cherry-500" : "border-cherry-100 hover:border-cherry-300"
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-black text-ink-900">{a.label}</span>
            {a.is_default && (
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-cherry-100 text-cherry-600">
                Utama
              </span>
            )}
            {selected?.id === a.id && (
              <Check size={14} className="text-cherry-500 ml-auto" />
            )}
          </div>
          <p className="text-sm font-bold text-ink-900">{a.recipient_name}</p>
          <p className="text-xs text-ink-500 mb-1">{a.recipient_phone}</p>
          <p className="text-sm text-ink-700 leading-snug">
            {a.street_address}, {a.subdistrict}, {a.district}, {a.city}, {a.province}{" "}
            {a.zipcode}
          </p>
        </button>
      ))}
      <button
        onClick={onAddNew}
        className="flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-cherry-300 text-cherry-500 text-sm font-bold hover:bg-cherry-50"
      >
        <Plus size={14} />
        Tambah Alamat Baru
      </button>
    </div>
  );
}

// ─── Step 2: Pengiriman ─────────────────────────────────────────────
function Step2Shipping({
  rates,
  loading,
  selected,
  onSelect,
}: {
  rates: ShippingRatesResponse | null;
  loading: boolean;
  selected: ShippingRate | null;
  onSelect: (r: ShippingRate) => void;
}) {
  if (loading) {
    return (
      <div className="bg-white border border-cherry-200 rounded-2xl p-8 text-center text-ink-500">
        <Truck size={40} className="mx-auto mb-2 opacity-30 animate-pulse" />
        <p className="text-sm">Menghitung ongkir…</p>
      </div>
    );
  }
  if (!rates || rates.rates.length === 0) {
    return (
      <div className="bg-white border border-cherry-200 rounded-2xl p-8 text-center">
        <AlertCircle size={40} className="mx-auto text-cherry-600 mb-3" />
        <p className="text-sm font-bold text-ink-900">Tidak ada opsi kirim</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-bold text-ink-900 mb-1">
        Pilih kurir · berat total {(rates.total_weight_grams / 1000).toFixed(2)} kg
      </p>
      {rates.rates.map((r, i) => {
        const isSelected =
          selected && selected.courier === r.courier && selected.service === r.service;
        return (
          <button
            key={`${r.courier}-${r.service}-${i}`}
            onClick={() => onSelect(r)}
            className={`text-left bg-white border-2 rounded-2xl p-3 flex items-center gap-3 transition-all ${
              isSelected ? "border-cherry-500" : "border-cherry-100 hover:border-cherry-300"
            }`}
          >
            <div className="w-10 h-10 rounded-lg bg-cherry-100 flex items-center justify-center text-cherry-500 shrink-0">
              <Truck size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-ink-900">
                {r.courier_name} — {r.service_name}
              </p>
              <p className="text-xs text-ink-500">Estimasi {r.etd}</p>
            </div>
            <p className="text-sm font-black text-cherry-500 shrink-0">{formatRp(r.cost)}</p>
            {isSelected && <Check size={16} className="text-cherry-500 shrink-0" />}
          </button>
        );
      })}
    </div>
  );
}

// ─── Step 3: Payment (review) ────────────────────────────────────────
function Step3Payment({
  cart,
  selectedAddress,
  selectedRate,
}: {
  cart: Cart;
  selectedAddress: Address | null;
  selectedRate: ShippingRate | null;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="bg-white border border-cherry-200 rounded-2xl p-4">
        <p className="text-xs font-black uppercase tracking-wider text-ink-500 mb-2">
          Kirim ke
        </p>
        {selectedAddress && (
          <>
            <p className="text-sm font-bold text-ink-900">
              {selectedAddress.recipient_name} · {selectedAddress.label}
            </p>
            <p className="text-xs text-ink-500 mb-1">{selectedAddress.recipient_phone}</p>
            <p className="text-sm text-ink-700 leading-snug">
              {selectedAddress.street_address}, {selectedAddress.subdistrict},{" "}
              {selectedAddress.district}, {selectedAddress.city}, {selectedAddress.province}{" "}
              {selectedAddress.zipcode}
            </p>
          </>
        )}
      </div>

      <div className="bg-white border border-cherry-200 rounded-2xl p-4">
        <p className="text-xs font-black uppercase tracking-wider text-ink-500 mb-2">
          Pengiriman
        </p>
        {selectedRate && (
          <p className="text-sm">
            <b>{selectedRate.courier_name} — {selectedRate.service_name}</b>
            <span className="text-ink-500 ml-1">· {selectedRate.etd}</span>
          </p>
        )}
      </div>

      <div className="bg-white border border-cherry-200 rounded-2xl p-4">
        <p className="text-xs font-black uppercase tracking-wider text-ink-500 mb-2">
          Metode Pembayaran
        </p>
        <p className="text-sm text-ink-900">
          Pembayaran otomatis via QRIS / VA / E-Wallet / Kartu Kredit
        </p>
        <p className="text-xs text-ink-500 mt-1">
          Setelah klik Bayar, kamu akan diarahkan ke halaman pembayaran aman.
        </p>
      </div>

      <div className="bg-white border border-cherry-200 rounded-2xl p-4">
        <p className="text-xs font-black uppercase tracking-wider text-ink-500 mb-2">
          Barang ({cart.item_count} produk)
        </p>
        <div className="space-y-2">
          {cart.items.slice(0, 5).map((it) => (
            <div key={it.id} className="flex items-center gap-2 text-sm">
              <div className="w-8 h-8 rounded bg-cherry-50 flex items-center justify-center shrink-0">
                {it.image ? (
                  // eslint-disable-next-line jsx-a11y/alt-text
                  <img src={it.image} alt="" className="w-full h-full object-cover rounded" />
                ) : (
                  <Package size={14} className="text-cherry-300" />
                )}
              </div>
              <span className="flex-1 truncate text-ink-900">{it.name_id || it.name}</span>
              <span className="text-ink-500">× {it.quantity}</span>
              <span className="font-bold text-ink-900">{formatRp(it.subtotal)}</span>
            </div>
          ))}
          {cart.items.length > 5 && (
            <p className="text-xs text-ink-500">+{cart.items.length - 5} produk lain</p>
          )}
        </div>
      </div>
    </div>
  );
}
