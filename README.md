# bakeshop-ecom

Storefront + Admin Panel untuk Toko Bahan Kue Santi. **Vite + React 19 SPA** (sama stack POS `bakeshop-fe`).

## Struktur

```
src/
├── main.tsx                  # entry + BrowserRouter basename="/shop"
├── App.tsx                   # router: /, /admin/login, /admin, /admin/produk[/:id]
├── index.css                 # Tailwind v4 CSS-based + palette Confectionery Warmth
├── pages/
│   ├── Home.tsx              # placeholder homepage (Fase 1)
│   ├── AdminLogin.tsx        # login form
│   ├── AdminDashboard.tsx    # 4 stat cards (3 disabled)
│   ├── AdminProdukList.tsx   # list produk + search + status badge
│   └── AdminProdukEdit.tsx   # edit ecom fields (publish, stok, harga, berat, deskripsi)
├── components/               # shared (empty di Fase 1)
└── lib/
    └── api.ts                # BE client, 3 scopes: public/customer/admin
```

## Setup

```bash
cd bakeshop-ecom
cp .env.example .env
npm install
npm run dev              # http://localhost:3001/shop/
```

Butuh backend `bakeshop-be` up di `:7889`. Vite dev proxy forward `/api` ke backend.

## Deploy (Docker Compose)

Build multi-stage: Node build → Nginx serve static.

```bash
docker compose up -d --build ecom
```

Container serve dari `/usr/share/nginx/html/shop/*` at port 80. POS `bakeshop-fe` nginx proxy `/shop/*` → `ecom:80`.

Direct debug port di localhost:
```bash
curl http://127.0.0.1:3334/shop/
```

## Convention

- **Palette**: pink Confectionery Warmth via Tailwind v4 `@theme` block di `index.css`. Utility classes: `bg-cherry-500`, `text-ink-900`, `border-cherry-200`, dst.
- **Base font**: 20px (Bu Santi prefer larger text) — konsisten POS.
- **Token storage**: `bakeshop-ecom-admin-token` + `bakeshop-ecom-customer-token` di localStorage. Beda dari `bakeshop-token` (POS staff JWT).
- **Auth model**:
  - Admin ecom: role `ecom_admin`, `ecom_superadmin`, atau `superadmin`
  - Customer ecom (Fase 3): extended dari `members` table + email + password + Brevo OTP

## Fase status

- ✅ **Fase 1 Foundation** — skeleton + admin login + product management (ecom fields only)
- ⏳ Fase 2 — Storefront catalog (homepage, kategori, product detail, cart)
- ⏳ Fase 3 — Auth customer + checkout + payment (Brevo + Midtrans + Biteship)
- ⏳ Fase 4 — Polish + launch
