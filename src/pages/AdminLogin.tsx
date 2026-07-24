import { useEffect } from "react";

// Deprecated (Bu Santi 21 Jul 2026): unified auth di POS login (`tbksanti.id/`).
// Route ini masih ada untuk backward compat + link lama — redirect ke POS.
export function AdminLogin() {
  useEffect(() => {
    window.location.href = "/";
  }, []);
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="text-center">
        <p className="text-sm text-ink-700">Redirect ke halaman login…</p>
        <p className="text-xs text-ink-500 mt-1">
          Kalau tidak auto-redirect,{" "}
          <a href="/" className="text-cherry-500 underline">
            klik sini
          </a>
        </p>
      </div>
    </main>
  );
}
