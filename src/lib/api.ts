// API client — talk ke bakeshop-be Go backend.
// Unified auth (Bu Santi 21 Jul 2026): pakai SATU token key `bakeshop-token`
// (same as POS). Login flow: user login di POS `/`, JWT stored, ecom reads
// same key. Role di JWT determine access.
// Client-side fetch pakai ABSOLUTE root "/api/v1" — dilayani nginx POS
// yang forward ke backend:7889.

const API_PREFIX = "/api/v1";
const TOKEN_KEY = "bakeshop-token";

export function getToken(): string | null {
  return typeof window === "undefined" ? null : localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

// Backward-compat aliases — komponen lama masih pakai setAdminToken etc.
// Semua sekarang tulis ke same TOKEN_KEY.
export const getAdminToken = getToken;
export const setAdminToken = setToken;
export const getCustomerToken = getToken;
export const setCustomerToken = setToken;

// Decode JWT payload (unsafe — cuma untuk read claims di FE, tidak validate).
export function decodeToken(): { role?: string; email?: string; fullname?: string; id?: string } | null {
  const tk = getToken();
  if (!tk) return null;
  try {
    const parts = tk.split(".");
    if (parts.length !== 3) return null;
    return JSON.parse(atob(parts[1]));
  } catch {
    return null;
  }
}

type Scope = "admin" | "customer" | "public";

async function request<T = unknown>(
  method: string,
  path: string,
  body?: unknown,
  scope: Scope = "public"
): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = scope !== "public" ? getToken() : null;
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_PREFIX}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = data?.message || data?.error || res.statusText;
    throw new Error(typeof msg === "string" ? msg : "Request failed");
  }
  return (data?.body ?? data) as T;
}

export const adminApi = {
  login: (email: string, password: string) =>
    request<{ access_token: string; user: { id: string; role: string; fullname: string } }>(
      "POST",
      "/ecom/admin/auth/login",
      { email, password, device_fingerprint: "" },
      "public"
    ),

  logout: () => {
    setAdminToken(null);
    return Promise.resolve();
  },

  listProducts: (params?: { search?: string; cursor?: string; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.search) q.set("search", params.search);
    if (params?.cursor) q.set("cursor", params.cursor);
    if (params?.limit) q.set("limit", String(params.limit));
    const qs = q.toString();
    return request<{ items: EcomAdminProduct[]; next_cursor: string }>(
      "GET",
      `/ecom/admin/products${qs ? "?" + qs : ""}`,
      undefined,
      "admin"
    );
  },

  getProduct: (id: string) =>
    request<EcomAdminProduct>("GET", `/ecom/admin/products/${id}`, undefined, "admin"),

  updateEcomFields: (id: string, data: EcomFieldsPayload) =>
    request<EcomAdminProduct>("PATCH", `/ecom/admin/products/${id}/ecom-fields`, data, "admin"),

  // Ecom categories CRUD (terpisah dari POS categories).
  listCategories: () =>
    request<EcomCategoryAdmin[]>("GET", "/ecom/admin/categories", undefined, "admin"),
  createCategory: (data: EcomCategoryPayload) =>
    request<EcomCategoryAdmin>("POST", "/ecom/admin/categories", data, "admin"),
  updateCategory: (id: string, data: EcomCategoryPayload) =>
    request<EcomCategoryAdmin>("PUT", `/ecom/admin/categories/${id}`, data, "admin"),
  deleteCategory: (id: string) =>
    request<null>("DELETE", `/ecom/admin/categories/${id}`, undefined, "admin"),

  // Ecom orders admin (Sprint 1).
  listOrders: (params?: { status?: string; search?: string; cursor?: string; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set("status", params.status);
    if (params?.search) q.set("search", params.search);
    if (params?.cursor) q.set("cursor", params.cursor);
    if (params?.limit) q.set("limit", String(params.limit));
    const qs = q.toString();
    return request<EcomAdminOrderListResponse>("GET", `/ecom/admin/orders${qs ? "?" + qs : ""}`, undefined, "admin");
  },
  getOrder: (id: string) =>
    request<CustomerOrderDetail>("GET", `/ecom/admin/orders/${id}`, undefined, "admin"),
  updateOrderStatus: (id: string, status: string) =>
    request<CustomerOrderDetail>("PATCH", `/ecom/admin/orders/${id}/status`, { status }, "admin"),
  setOrderShipping: (id: string, data: { awb: string; courier?: string; service?: string }) =>
    request<CustomerOrderDetail>("POST", `/ecom/admin/orders/${id}/shipping`, data, "admin"),
  createBiteshipShipment: (id: string) =>
    request<CustomerOrderDetail>("POST", `/ecom/admin/orders/${id}/biteship-create`, undefined, "admin"),

  // Sprint 5 — Voucher CRUD.
  listVouchers: () => request<VoucherAdmin[]>("GET", "/ecom/admin/vouchers", undefined, "admin"),
  createVoucher: (data: VoucherPayload) =>
    request<VoucherAdmin>("POST", "/ecom/admin/vouchers", data, "admin"),
  updateVoucher: (id: string, data: VoucherPayload) =>
    request<VoucherAdmin>("PUT", `/ecom/admin/vouchers/${id}`, data, "admin"),
  deleteVoucher: (id: string) =>
    request<null>("DELETE", `/ecom/admin/vouchers/${id}`, undefined, "admin"),

  // Upload gambar produk ecom. Multipart form-data (bypass generic request()
  // yang JSON-only). Endpoint /upload berlaku umum, dipakai POS + ecom.
  uploadImage: async (file: File): Promise<{ url: string; filename: string }> => {
    const tk = getToken();
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`${API_PREFIX}/upload?type=products`, {
      method: "POST",
      headers: tk ? { Authorization: `Bearer ${tk}` } : {},
      body: fd,
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(data?.message || "Gagal upload gambar");
    }
    return data?.body ?? data;
  },
};

// ─── Customer self-service (Sprint 2) ─────────────────────────────
export const accountApi = {
  getMe: () =>
    request<{ id: string; email: string; fullname: string; phone: string; role: string }>(
      "GET", "/auth/session", undefined, "customer"
    ),
  updateProfile: (data: { fullname?: string; phone?: string }) =>
    request<unknown>("PATCH", "/auth/me", data, "customer"),
  changePassword: (data: { current_password: string; new_password: string }) =>
    request<unknown>("POST", "/auth/me/password", data, "customer"),

  // Password reset via email OTP (public endpoints).
  requestResetOTP: (email: string) =>
    request<unknown>("POST", "/auth/password-reset/request", { email }, "public"),
  confirmResetOTP: (data: { email: string; otp: string; new_password: string }) =>
    request<unknown>("POST", "/auth/password-reset/confirm", data, "public"),

  // Reviews — customer submit/update review.
  checkReviewEligibility: (productId: string) =>
    request<{ can_review: boolean; my_review?: ReviewItem }>(
      "GET", `/ecom/products/${productId}/reviews/me`, undefined, "customer"
    ),
  submitReview: (data: { product_id: string; rating: number; comment?: string }) =>
    request<unknown>("POST", "/ecom/reviews", data, "customer"),
};

export interface EcomAdminProduct {
  id: string;
  name: string;
  name_id: string;
  sku: string;
  stock_pos: number;
  selling_price: number;
  member_price?: number | null;
  image?: string;
  stock_ecom: number;
  ecom_price: number | null;
  ecom_member_price: number | null;
  ecom_is_available: boolean;
  ecom_description: string | null;
  ecom_image: string | null;
  ecom_images?: string[];
  ecom_category_id: string | null;
  ecom_category_name?: string;
  ecom_weight_grams: number | null;
  ecom_min_order: number;
}

export interface EcomFieldsPayload {
  stock_ecom?: number;
  ecom_price?: number | null;
  ecom_member_price?: number | null;
  ecom_is_available?: boolean;
  ecom_description?: string | null;
  ecom_image?: string | null;
  ecom_images?: string[];
  ecom_category_id?: string | null;
  ecom_weight_grams?: number | null;
  ecom_min_order?: number;
}

export interface EcomCategoryAdmin {
  id: string;
  name: string;
  name_id?: string;
  icon_name?: string;
  sort_order: number;
  is_active: boolean;
  product_count: number;
}

// ─── Ecom Admin Orders (Sprint 1) ────────────────────────────────
export interface EcomAdminOrderListItem {
  id: string;
  total: number;
  shipping_cost: number;
  ecom_status: string;
  item_count: number;
  recipient: string;
  courier?: string;
  awb?: string;
  created_at: string;
  payment_method?: string;
}

export interface EcomAdminOrderListResponse {
  items: EcomAdminOrderListItem[];
  next_cursor?: string;
  counts_by_status: Record<string, number>;
}

// Sprint 5 — Voucher.
export interface VoucherAdmin {
  id: string;
  code: string;
  description?: string;
  type: "percent" | "fixed";
  value: number;
  min_subtotal: number;
  max_discount?: number;
  usage_limit: number;
  used_count: number;
  starts_at?: string;
  expires_at?: string;
  is_active: boolean;
  created_at?: string;
}

export interface VoucherPayload {
  code: string;
  description?: string;
  type: "percent" | "fixed";
  value: number;
  min_subtotal?: number;
  max_discount?: number | null;
  usage_limit?: number;
  starts_at?: string;
  expires_at?: string;
  is_active?: boolean;
}

// Sprint 5b — Reviews.
export interface ReviewItem {
  id: string;
  rating: number;
  comment?: string;
  user_name: string;
  created_at: string;
}
export interface ReviewSummary {
  count: number;
  average: number;
  distribution: Record<string, number>;
}

export interface VoucherValidateResponse {
  code: string;
  description?: string;
  type: "percent" | "fixed";
  value: number;
  discount: number;
}

export interface EcomCategoryPayload {
  name: string;
  name_id?: string;
  icon_name?: string;
  sort_order?: number;
  is_active?: boolean;
}

// ─── Public storefront API (Fase 2) ─────────────────────────────────
export interface EcomCategory {
  id: string;
  name: string;
  name_id: string;
  icon_name?: string;
  sort_order?: number;
  is_active?: boolean;
  product_count: number;
}

export interface EcomProductListItem {
  id: string;
  name: string;
  name_id: string;
  sku: string;
  category_id: string;
  category_name?: string;
  image?: string;
  price: number;
  member_price?: number;
  stock: number;
  weight_grams?: number;
  min_order: number;
  is_low_stock: boolean;
}

export interface EcomProductDetail extends EcomProductListItem {
  description?: string;
  images?: string[]; // gallery URLs untuk swipe
  tiers?: { min_qty: number; price: number; note?: string }[];
}

export interface EcomProductListResponse {
  items: EcomProductListItem[];
  next_cursor: string;
}

export const publicApi = {
  listCategories: () => request<EcomCategory[]>("GET", "/ecom/categories"),
  listProducts: (params?: {
    category?: string;
    search?: string;
    sort?: "price_asc" | "price_desc" | "name" | "";
    cursor?: string;
    limit?: number;
  }) => {
    const q = new URLSearchParams();
    if (params?.category) q.set("category", params.category);
    if (params?.search) q.set("search", params.search);
    if (params?.sort) q.set("sort", params.sort);
    if (params?.cursor) q.set("cursor", params.cursor);
    if (params?.limit) q.set("limit", String(params.limit));
    const qs = q.toString();
    return request<EcomProductListResponse>("GET", `/ecom/products${qs ? "?" + qs : ""}`);
  },
  getProduct: (id: string) => request<EcomProductDetail>("GET", `/ecom/products/${id}`),
  listReviews: (productId: string, limit = 20) =>
    request<{ items: ReviewItem[]; summary: ReviewSummary }>(
      "GET", `/ecom/products/${productId}/reviews?limit=${limit}`
    ),
};

export function formatRp(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return "Rp " + n.toLocaleString("id-ID");
}

// ─── Customer Cart API (Fase 3) ─────────────────────────────────────
export interface CartItem {
  id: string;
  product_id: string;
  name: string;
  name_id: string;
  sku: string;
  image?: string;
  quantity: number;
  price: number;
  member_price?: number;
  stock: number;
  min_order: number;
  weight_grams?: number;
  subtotal: number;
  unavailable?: boolean;
  unavailable_reason?: string;
}

export interface Cart {
  items: CartItem[];
  item_count: number;
  total_qty: number;
  subtotal: number;
  total_weight_grams: number;
  has_unavailable: boolean;
}

export const cartApi = {
  get: () => request<Cart>("GET", "/ecom/cart", undefined, "customer"),
  add: (productId: string, quantity: number) =>
    request<Cart>("POST", "/ecom/cart/items", { product_id: productId, quantity }, "customer"),
  update: (itemId: string, quantity: number) =>
    request<Cart>("PATCH", `/ecom/cart/items/${itemId}`, { quantity }, "customer"),
  remove: (itemId: string) =>
    request<Cart>("DELETE", `/ecom/cart/items/${itemId}`, undefined, "customer"),
};

// ─── Address Book API (Fase 3b) ─────────────────────────────────────
export interface Address {
  id: string;
  label: string;
  recipient_name: string;
  recipient_phone: string;
  province: string;
  city: string;
  district: string;
  subdistrict: string;
  zipcode: string;
  street_address: string;
  notes?: string;
  is_default: boolean;
}

export interface AddressPayload {
  label: string;
  recipient_name: string;
  recipient_phone: string;
  province: string;
  city: string;
  district: string;
  subdistrict: string;
  zipcode: string;
  street_address: string;
  notes?: string;
  is_default: boolean;
}

export const addressApi = {
  list: () => request<Address[]>("GET", "/ecom/addresses", undefined, "customer"),
  create: (data: AddressPayload) => request<Address>("POST", "/ecom/addresses", data, "customer"),
  update: (id: string, data: AddressPayload) => request<Address>("PUT", `/ecom/addresses/${id}`, data, "customer"),
  remove: (id: string) => request<null>("DELETE", `/ecom/addresses/${id}`, undefined, "customer"),
};

// ─── Checkout API (Fase 3c-3d) ──────────────────────────────────────
export interface ShippingRate {
  courier: string;
  courier_name: string;
  service: string;
  service_name: string;
  cost: number;
  etd: string;
}

export interface ShippingRatesResponse {
  address: {
    label: string;
    recipient_name: string;
    city: string;
    province: string;
  };
  total_weight_grams: number;
  rates: ShippingRate[];
}

export interface CheckoutResponse {
  order_id: string;
  subtotal: number;
  shipping_cost: number;
  total: number;
  // PG DOKU (28 Jul 2026). URL yang customer buka untuk lakukan pembayaran
  // — VA number/QR code/e-wallet redirect page ditentukan channel.
  payment_url?: string;
  payment_channel?: string;
  payment_mode: "pg" | "manual";
  ecom_status: string;
}

// PG channels — direct fetch dari alifworks PG (public, no auth). BE tidak
// jadi proxy karena channels rarely change + no security concern (list bank
// public info). Response grouped by category dari upstream.
export type PGChannelCategory = "virtual-account" | "qris" | "e-wallet" | "credit-card";

export interface PGChannel {
  id: number;
  payment_name: string;      // "BCA Virtual Account"
  payment_code: string;      // "bca" — yang di-submit ke BE saat checkout
  payment_description: string;
  payment_logo: string;
  admin_fee: number;
  total_admin_fee: number;
  category: PGChannelCategory;
  min_amount: number;
}

export interface PGChannelGroup {
  category: PGChannelCategory;
  channels: PGChannel[];
}

// PG_BASE_URL — override via VITE_PG_BASE_URL kalau nanti pindah ke prod.
// Default ke sandbox URL yang dipakai sekarang.
const PG_BASE_URL = import.meta.env.VITE_PG_BASE_URL || "https://api-pgsanbox.alifworks.net";

export const pgChannelsApi = {
  list: async (): Promise<PGChannelGroup[]> => {
    const res = await fetch(`${PG_BASE_URL}/payment/api/v1/channels`);
    if (!res.ok) throw new Error("Gagal ambil daftar metode pembayaran");
    const json = await res.json();
    // Envelope PG: {code, message, body: [...groups]}
    if (json.code !== 0) throw new Error(json.message || "PG error");
    return (json.body ?? []) as PGChannelGroup[];
  },
};

export const checkoutApi = {
  getShippingRates: (addressId: string, opts?: { selected_item_ids?: string[]; buy_now_items?: { product_id: string; quantity: number }[] }) =>
    request<ShippingRatesResponse>("POST", "/ecom/shipping/rates", {
      address_id: addressId,
      selected_item_ids: opts?.selected_item_ids,
      buy_now_items: opts?.buy_now_items,
    }, "customer"),
  createOrder: (data: {
    address_id: string;
    shipping_courier: string;
    shipping_service: string;
    shipping_cost: number;
    shipping_etd: string;
    notes?: string;
    voucher_code?: string;
    payment_channel: string;             // bca/qris/ovo/dst
    payment_channel_category?: string;   // audit: virtual-account/qris/e-wallet/credit-card
    selected_item_ids?: string[];
    buy_now_items?: { product_id: string; quantity: number }[];
  }) => request<CheckoutResponse>("POST", "/ecom/checkout/create-order", data, "customer"),
  validateVoucher: (code: string) =>
    request<VoucherValidateResponse>("POST", "/ecom/checkout/validate-voucher", { code }, "customer"),
};

// ─── Customer Orders API (Fase 3e) ──────────────────────────────────
export interface CustomerOrderListItem {
  id: string;
  total: number;
  ecom_status: string;
  item_count: number;
  first_item: string;
  created_at: string;
  payment_paid_at?: string;
}

export interface CustomerOrderDetail {
  id: string;
  subtotal: number;
  shipping_cost: number;
  total: number;
  ecom_status: string;
  // Waktu kurir tandai sampai. Isi kalau status = delivered / completed
  // (kalau completed = customer sudah konfirmasi, atau auto-complete 7d).
  ecom_delivered_at?: string;
  created_at: string;
  items: {
    product_id: string;
    name: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
    image?: string;
  }[];
  shipping: {
    courier: string;
    service_name: string;
    etd: string;
    awb?: string;
    biteship_order_id?: string;
    address: {
      label: string;
      recipient_name: string;
      recipient_phone: string;
      street_address: string;
      subdistrict: string;
      district: string;
      city: string;
      province: string;
      zipcode: string;
      notes?: string;
    };
  };
  payment: {
    mode: "pg" | "manual";
    // PG DOKU checkout link. Customer tap "Bayar Sekarang" → open payment_url
    // di new tab (VA number / QR code / e-wallet redirect page).
    payment_url?: string;
    channel?: string;                    // bca/qris/ovo/dst
    channel_category?: string;           // virtual-account/qris/e-wallet/credit-card
    reference?: string;
    paid_at?: string;
    expired_at?: string;
  };
}

export const ordersApi = {
  list: () => request<CustomerOrderListItem[]>("GET", "/ecom/orders", undefined, "customer"),
  getDetail: (id: string) => request<CustomerOrderDetail>("GET", `/ecom/orders/${id}`, undefined, "customer"),
  // Marketplace-style "Barang Diterima". Body kosong; ownership via JWT.
  confirmReceived: (id: string) =>
    request<CustomerOrderDetail>("POST", `/ecom/orders/${id}/confirm-received`, {}, "customer"),
};
