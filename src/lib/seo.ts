import { useEffect } from "react";

// Lightweight SEO helper untuk SPA — update <title>, meta description, dan
// Open Graph tags per halaman. Tidak pakai react-helmet-async supaya
// nol-dependency + bundle kecil. Trade-off: crawler tanpa JS (bot lama)
// dapat title default dari index.html — untuk Google/Bing/Meta itu OK (mereka
// eksekusi JS). Kalau nanti butuh SSR untuk crawler tua, migrate ke Next/Astro.

type SEOMeta = {
  title?: string;             // <title> — max ~60 char untuk SERP
  description?: string;       // meta description — 120–160 char sweet spot
  image?: string;             // og:image absolute URL
  canonical?: string;         // link rel=canonical — relative dari domain OK
  jsonLD?: object;            // structured data JSON-LD (Schema.org Product/etc)
  noIndex?: boolean;          // hide dari search index (mis. /akun, /checkout)
};

// Track last-set title supaya restore ke default saat unmount page.
const DEFAULT_TITLE = "Toko Bahan Kue Santi — Belanja Bahan Kue Online, Kirim Seluruh Indonesia";
const DEFAULT_DESC = "Belanja bahan kue & pastry lengkap: tepung, cokelat, whipping cream, mentega, gula, perisa. Harga grosir, stok fresh, kirim seluruh Indonesia.";
const CANONICAL_BASE = "https://tbksanti.id";

function setMeta(name: string, content: string, attr: "name" | "property" = "name") {
  let el = document.querySelector<HTMLMetaElement>(`meta[${attr}="${name}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setLink(rel: string, href: string) {
  let el = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

// Tag JSON-LD tersendiri per page (tandai dengan data attribute supaya bisa
// di-cleanup saat unmount — kalau tidak, script menumpuk tiap navigasi).
function setJsonLD(data: object | undefined) {
  document.querySelectorAll('script[data-seo-jsonld="true"]').forEach((s) => s.remove());
  if (!data) return;
  const s = document.createElement("script");
  s.type = "application/ld+json";
  s.dataset.seoJsonld = "true";
  s.text = JSON.stringify(data);
  document.head.appendChild(s);
}

export function useSEO(meta: SEOMeta) {
  useEffect(() => {
    const title = meta.title ? `${meta.title} — TBK Santi` : DEFAULT_TITLE;
    const desc = meta.description || DEFAULT_DESC;
    const image = meta.image || "https://tbksanti.id/shop/og-image.jpg";
    const canonical = meta.canonical ? CANONICAL_BASE + meta.canonical : CANONICAL_BASE + "/shop" + window.location.pathname.replace(/^\/shop/, "");

    document.title = title;
    setMeta("description", desc);
    setLink("canonical", canonical);

    // OG / Twitter
    setMeta("og:title", title, "property");
    setMeta("og:description", desc, "property");
    setMeta("og:image", image, "property");
    setMeta("og:url", canonical, "property");
    setMeta("twitter:title", title);
    setMeta("twitter:description", desc);
    setMeta("twitter:image", image);

    // Noindex — /akun, /keranjang, /checkout, /pesanan (private pages).
    setMeta("robots", meta.noIndex ? "noindex, nofollow" : "index, follow");

    setJsonLD(meta.jsonLD);

    return () => {
      // Restore ke default on unmount (kalau page next tidak call useSEO).
      // Page selanjutnya yang call useSEO akan overwrite lagi — this is safe.
      document.title = DEFAULT_TITLE;
      setJsonLD(undefined);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meta.title, meta.description, meta.image, meta.canonical, meta.noIndex, JSON.stringify(meta.jsonLD)]);
}

// Helper: build Schema.org Product JSON-LD dari product detail.
// Ini yang muncul di Google rich snippet (price + availability + rating).
export function productJsonLD(p: {
  id: string;
  name_id: string;
  name?: string;
  price: number;
  member_price?: number;
  image?: string;
  images?: string[];
  stock: number;
  sku: string;
  description?: string;
}) {
  const imgs = p.images && p.images.length > 0 ? p.images : p.image ? [p.image] : [];
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name_id || p.name,
    image: imgs.length > 0 ? imgs.map((u) => (u.startsWith("http") ? u : "https://tbksanti.id" + u)) : undefined,
    description: p.description || undefined,
    sku: p.sku,
    brand: { "@type": "Brand", name: "Toko Bahan Kue Santi" },
    offers: {
      "@type": "Offer",
      url: `${CANONICAL_BASE}/shop/produk/${p.id}`,
      priceCurrency: "IDR",
      price: p.price,
      availability: p.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      seller: { "@type": "Organization", name: "Toko Bahan Kue Santi" },
    },
  };
}
