// API client — talk ke bakeshop-be Go backend.
// Client-side fetch pakai ABSOLUTE root "/api/v1" — dilayani nginx POS
// yang forward ke backend:7889. Skip Vite basePath supaya tidak resolve ke
// "/shop/api/v1" (yang tidak ada).

const API_PREFIX = "/api/v1";

const ADMIN_TOKEN_KEY = "bakeshop-ecom-admin-token";
const CUSTOMER_TOKEN_KEY = "bakeshop-ecom-customer-token";

export function getAdminToken(): string | null {
  return typeof window === "undefined" ? null : localStorage.getItem(ADMIN_TOKEN_KEY);
}
export function setAdminToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) localStorage.setItem(ADMIN_TOKEN_KEY, token);
  else localStorage.removeItem(ADMIN_TOKEN_KEY);
}
export function getCustomerToken(): string | null {
  return typeof window === "undefined" ? null : localStorage.getItem(CUSTOMER_TOKEN_KEY);
}
export function setCustomerToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) localStorage.setItem(CUSTOMER_TOKEN_KEY, token);
  else localStorage.removeItem(CUSTOMER_TOKEN_KEY);
}

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
