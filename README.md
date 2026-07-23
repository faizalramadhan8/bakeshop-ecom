# bakeshop-ecom

Storefront + Admin Panel untuk Toko Bahan Kue Santi. Next.js 15 App Router.

## Struktur

```
src/app/
├── page.tsx                    # placeholder homepage (Fase 1)
├── layout.tsx                  # root layout + Toaster
├── globals.css                 # Tailwind + palette pink Confectionery Warmth
├── admin/                      # Ecom Admin panel (auth-gated)
│   ├── login/page.tsx
│   ├── page.tsx                # dashboard skeleton
│   └── produk/
│       ├── page.tsx            # list produk semua
│       └── [id]/page.tsx       # edit ecom fields only
├── kategori/                   # public storefront (Fase 2)
├── produk/                     # public storefront (Fase 2)
└── (Fase 3)
    ├── (account)/              # customer login/register
    └── (checkout)/             # multi-step checkout

src/
├── components/                 # shared UI components
└── lib/
    └── api.ts                  # BE API client (public/customer/admin scopes)
```

## Setup

```bash
cd bakeshop-ecom
cp .env.example .env
npm install
npm run dev   # http://localhost:3001
```

Butuh backend `bakeshop-be` up di `:7889` supaya API calls jalan. Next.js rewrite `/api/v1/*` → BE via `NEXT_PUBLIC_API_URL`.

## Convention

- **Palette**: sync sama bakeshop-fe POS (`cherry-*` scale = pink cherry, `ink-*` = warm ink text, `amber-500` = grosir/reseller badge accent). Lihat `globals.css`.
- **Base font size**: 20px (Bu Santi prefer larger text) — konsisten sama POS.
- **Token storage**: `bakeshop-ecom-admin-token` + `bakeshop-ecom-customer-token` di localStorage. Split scope cegah admin credentials bocor via customer session.
- **Auth model** (lihat root CLAUDE.md + ECOM_ROADMAP.md):
  - Ecom admin: role `ecom_admin`, `ecom_superadmin`, atau `superadmin`
  - Ecom customer: extended dari `members` table

## Fase status

- ✅ **Fase 1 — Foundation** (in progress)
  - Skeleton structure up
  - Admin login page + dashboard skeleton
  - Admin product list + edit (ecom fields only)
  - Butuh BE endpoint `/api/v1/ecom/admin/*` untuk fully functional (belum di-implement)
- ⏳ Fase 2 — Storefront catalog
- ⏳ Fase 3 — Auth + checkout + payment (Brevo email OTP + Midtrans + Biteship)
- ⏳ Fase 4 — Polish + launch
