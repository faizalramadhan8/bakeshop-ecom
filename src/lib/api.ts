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
  snap_token?: string;
  snap_redirect_url?: string;
  payment_mode: "midtrans" | "manual";
  ecom_status: string;
}

export const checkoutApi = {
  getShippingRates: (addressId: string) =>
    request<ShippingRatesResponse>("POST", "/ecom/shipping/rates", { address_id: addressId }, "customer"),
  createOrder: (data: {
    address_id: string;
    shipping_courier: string;
    shipping_service: string;
    shipping_cost: number;
    shipping_etd: string;
    notes?: string;
  }) => request<CheckoutResponse>("POST", "/ecom/checkout/create-order", data, "customer"),
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
    mode: "midtrans" | "manual";
    snap_token?: string;
    snap_redirect_url?: string;
    reference?: string;
    paid_at?: string;
    expired_at?: string;
  };
}

export const ordersApi = {
  list: () => request<CustomerOrderListItem[]>("GET", "/ecom/orders", undefined, "customer"),
  getDetail: (id: string) => request<CustomerOrderDetail>("GET", `/ecom/orders/${id}`, undefined, "customer"),
};
