// Push notification helper — subscribe / unsubscribe untuk ecom customer.
// Sprint 2 #5 (30 Jul 2026).
//
// Flow:
//   1. registerSW() — panggil di App.tsx boot (silent)
//   2. requestPushPermission() — panggil dari button "Aktifkan Notifikasi"
//   3. isSubscribed() — cek state untuk toggle di UI
//   4. unsubscribeFromPush() — untuk toggle off

import { request } from "./api";

// VAPID public key — hardcoded karena akan sama semua device. Kalau nanti
// pindah env, ambil dari GET /api/v1/push/vapid-key.
async function getVapidPublicKey(): Promise<string> {
  const cached = sessionStorage.getItem("bakeshop-vapid-key");
  if (cached) return cached;
  try {
    const key = await request<string>("GET", "/push/vapid-key");
    if (key) sessionStorage.setItem("bakeshop-vapid-key", key);
    return key || "";
  } catch {
    return "";
  }
}

// Convert base64 VAPID key → Uint8Array (Web Push API requirement).
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export function pushSupported(): boolean {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export async function registerSW(): Promise<ServiceWorkerRegistration | null> {
  if (!pushSupported()) return null;
  try {
    const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    return reg;
  } catch (err) {
    console.warn("SW register failed:", err);
    return null;
  }
}

export async function isSubscribed(): Promise<boolean> {
  if (!pushSupported()) return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    return !!sub;
  } catch {
    return false;
  }
}

export async function requestPushPermission(): Promise<{ success: boolean; message?: string }> {
  if (!pushSupported()) {
    return { success: false, message: "Browser tidak mendukung notifikasi" };
  }
  // Permission
  const perm = await Notification.requestPermission();
  if (perm !== "granted") {
    return { success: false, message: "Izin notifikasi ditolak" };
  }
  // Register SW + subscribe
  const reg = await registerSW();
  if (!reg) return { success: false, message: "Service Worker gagal daftar" };

  const vapidKey = await getVapidPublicKey();
  if (!vapidKey) return { success: false, message: "VAPID key belum di-set di server" };

  try {
    // Cek existing sub, kalau ada reuse
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
    }
    // Kirim subscription ke BE (endpoint existing dari POS push infra)
    const raw = sub.toJSON();
    if (!raw.endpoint || !raw.keys?.p256dh || !raw.keys?.auth) {
      return { success: false, message: "Subscription tidak lengkap" };
    }
    await request<null>("POST", "/push/subscribe", {
      endpoint: raw.endpoint,
      p256dh: raw.keys.p256dh,
      auth: raw.keys.auth,
    }, "customer");
    return { success: true };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Gagal subscribe push",
    };
  }
}

export async function unsubscribeFromPush(): Promise<{ success: boolean; message?: string }> {
  if (!pushSupported()) return { success: true };
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return { success: true };
    const endpoint = sub.endpoint;
    await sub.unsubscribe();
    // Notify BE untuk hapus sub
    await request<null>("POST", "/push/unsubscribe", { endpoint }, "customer").catch(() => {});
    return { success: true };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Gagal unsubscribe",
    };
  }
}
