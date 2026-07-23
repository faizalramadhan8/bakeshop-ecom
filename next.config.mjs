/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Standalone output — Docker image ringkas, cocok untuk deploy container.
  output: "standalone",
  // Base path routing (Bu Santi 20 Jul 2026): serve dari tbksanti.id/shop
  // instead of subdomain. POS nginx proxy /shop/* ke container ini. Next.js
  // auto-prefix semua Link href + asset URL dengan /shop.
  basePath: "/shop",
  // assetPrefix penting supaya _next/static assets di-load dari /shop/_next/*
  // instead of /_next/* (yang gak ke-route ke ecom container).
  assetPrefix: "/shop",
  // Bakery ingredient product images — future proofing untuk CDN / Cloudflare
  // Images. Sekarang produk pakai foto POS existing di /storage.
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "tbksanti.id" },
      { protocol: "http", hostname: "localhost" },
    ],
  },
  // API rewrite ke BE — dev + prod pakai path prefix `/api/v1` sama.
  // Env NEXT_PUBLIC_API_URL override kalau BE beda origin dari FE.
  // Note: rewrite JALAN dari root (bukan /shop/api/v1) — di production
  // POS nginx route /api/v1 langsung ke backend, jadi client fetch absolute
  // ke /api/v1 bypass ecom container. Rewrite di sini cuma buat dev mode
  // dimana browser hit /shop lalu client fetch relative ke basePath.
  async rewrites() {
    const beUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:7889";
    return [
      { source: "/api/v1/:path*", destination: `${beUrl}/api/v1/:path*` },
    ];
  },
};

export default nextConfig;
