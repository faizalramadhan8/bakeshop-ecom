// Service Worker — handle push notifications untuk ecom customer.
// Minimal SW: cuma push + notificationclick. Tidak cache (bukan full PWA).
// Sprint 2 #5 (30 Jul 2026).

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  if (!event.data) return;
  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: "Toko Bahan Kue Santi", body: event.data.text() };
  }
  const title = data.title || "Toko Bahan Kue Santi";
  const options = {
    body: data.body || "",
    icon: "/pwa-192x192.png",
    badge: "/pwa-192x192.png",
    data: { url: data.url || "/" },
    tag: data.tag || "tbksanti-notif",
    renotify: true,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      // Fokus tab yang sudah open di URL yang sama, kalau tidak ada buka baru.
      for (const c of clients) {
        if (c.url.includes(url) && "focus" in c) return c.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
