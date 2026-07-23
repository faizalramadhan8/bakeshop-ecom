// API client — talk ke bakeshop-be Go backend.
// PATH: basePath="/shop", tapi API fetch harus ABSOLUTE root ("/api/v1")
// supaya langsung ke POS nginx yang forward ke backend (bypass ecom container).
// Kalau pakai relative path, browser resolve jadi "/shop/api/v1" yang gak ada.
// Token storage split: `bakeshop-ecom-admin-token` untuk admin, TBD customer.

const API_PREFIX = "/api/v1";

// ─── Token storage ───────────────────────────────────────────────────
const ADMIN_TOKEN_KEY = "bakeshop-ecom-admin-token";
const CUSTOMER_TOKEN_KEY = "bakeshop-ecom-customer-token";

export function getAdminToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ADMIN_TOKEN_KEY);
}
export function setAdminToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) localStorage.setItem(ADMIN_TOKEN_KEY, token);
  else localStorage.removeItem(ADMIN_TOKEN_KEY);
}

export function getCustomerToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(CUSTOMER_TOKEN_KEY);
}
export function setCustomerToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) localStorage.setItem(CUSTOMER_TOKEN_KEY, token);
  else localStorage.removeItem(CUSTOMER_TOKEN_KEY);
}

// ─── Base request ────────────────────────────────────────────────────
type Scope = "admin" | "customer" | "public";

async function request<T = unknown>(
  method: string,
  path: string,
  body?: unknown,
  scope: Scope = "public"
): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = scope === "admin" ? getAdminToken() : scope === "customer" ? getCustomerToken() : null;
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

// ─── Admin API ───────────────────────────────────────────────────────
export const adminApi = {
  login: (email: string, password: string) =>
    request<{ access_token: string; user: { id: string; role: string; fullname: string } }>(
      "POST", "/ecom/admin/auth/login", { email, password }, "public"
    ),

  logout: () => {
    setAdminToken(null);
    return Promise.resolve();
  },

  // Product management — endpoint akan dibikin di Fase 1 BE.
  listProducts: (params?: { search?: string; cursor?: string; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.search) q.set("search", params.search);
    if (params?.cursor) q.set("cursor", params.cursor);
    if (params?.limit) q.set("limit", String(params.limit));
    const qs = q.toString();
    return request<{ items: EcomAdminProduct[]; next_cursor: string }>(
      "GET", `/ecom/admin/products${qs ? "?" + qs : ""}`, undefined, "admin"
    );
  },

  getProduct: (id: string) =>
    request<EcomAdminProduct>("GET", `/ecom/admin/products/${id}`, undefined, "admin"),

  updateEcomFields: (id: string, data: EcomFieldsPayload) =>
    request<EcomAdminProduct>("PATCH", `/ecom/admin/products/${id}/ecom-fields`, data, "admin"),
};

// ─── Types ───────────────────────────────────────────────────────────
export interface EcomAdminProduct {
  id: string;
  name: string;
  sku: string;
  // POS side (read-only di ecom admin)
  stock_pos: number;
  selling_price: number;
  // Ecom side (editable)
  stock_ecom: number;
  ecom_price: number | null;
  ecom_member_price: number | null;
  ecom_is_available: boolean;
  ecom_description: string | null;
  ecom_weight_grams: number | null;
  ecom_min_order: number;
}

export interface EcomFieldsPayload {
  stock_ecom?: number;
  ecom_price?: number | null;
  ecom_member_price?: number | null;
  ecom_is_available?: boolean;
  ecom_description?: string | null;
  ecom_weight_grams?: number | null;
  ecom_min_order?: number;
}
