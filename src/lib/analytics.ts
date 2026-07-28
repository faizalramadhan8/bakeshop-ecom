// Lightweight analytics wrapper — GA4 + Meta Pixel opt-in via env var.
// Baca Vite env `VITE_GA_MEASUREMENT_ID` + `VITE_META_PIXEL_ID` — kosong = disabled.
// Ini injected saat build; kalau owner belum daftar akun, script tidak muncul di HTML.
//
// Public API:
//   initAnalytics()      — panggil sekali di App.tsx entry.
//   trackPageView(path)  — panggil di router change (SPA — history push).
//   trackEvent(name, params) — custom event (add_to_cart, purchase, dll).

const GA_ID = import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined;
const META_PIXEL_ID = import.meta.env.VITE_META_PIXEL_ID as string | undefined;

// Track init state supaya tidak double-inject saat HMR reload atau
// StrictMode double render.
let initialized = false;

// Type sederhana untuk window globals (gtag + fbq).
declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
    _fbq?: unknown;
  }
}

export function initAnalytics() {
  if (initialized) return;
  initialized = true;

  if (GA_ID) {
    // GA4 — pakai global site tag standard.
    const s1 = document.createElement("script");
    s1.async = true;
    s1.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
    document.head.appendChild(s1);

    window.dataLayer = window.dataLayer || [];
    // eslint-disable-next-line prefer-rest-params
    window.gtag = function () {
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer!.push(arguments);
    };
    window.gtag("js", new Date());
    // send_page_view=false — SPA, kita fire manual di route change.
    window.gtag("config", GA_ID, { send_page_view: false });
  }

  if (META_PIXEL_ID) {
    // Meta Pixel — snippet resmi Meta (fbq init + PageView).
    /* eslint-disable */
    !(function (f: any, b: any, e: any, v: any) {
      if (f.fbq) return;
      const n: any = (f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      });
      if (!f._fbq) f._fbq = n;
      n.push = n;
      n.loaded = !0;
      n.version = "2.0";
      n.queue = [];
      const t = b.createElement(e);
      t.async = !0;
      t.src = v;
      const s = b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t, s);
    })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
    /* eslint-enable */
    window.fbq?.("init", META_PIXEL_ID);
  }
}

// Panggil di route change (SPA history push, react-router location listener).
export function trackPageView(path: string) {
  if (GA_ID) {
    window.gtag?.("event", "page_view", {
      page_path: path,
      page_location: window.location.href,
    });
  }
  if (META_PIXEL_ID) {
    window.fbq?.("track", "PageView");
  }
}

// Custom events. GA4 event names conventions:
// - view_item (PDP view) — { currency, value, items: [...] }
// - add_to_cart — same shape
// - begin_checkout — same
// - purchase — same + transaction_id
// Meta Pixel counterparts: ViewContent, AddToCart, InitiateCheckout, Purchase.
export function trackEvent(name: string, params?: Record<string, unknown>) {
  if (GA_ID) {
    window.gtag?.("event", name, params || {});
  }
  if (META_PIXEL_ID) {
    // Map common GA4 → Meta names.
    const map: Record<string, string> = {
      view_item: "ViewContent",
      add_to_cart: "AddToCart",
      begin_checkout: "InitiateCheckout",
      purchase: "Purchase",
    };
    const metaName = map[name] || name;
    window.fbq?.("track", metaName, params || {});
  }
}
