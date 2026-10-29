import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import "./index.css";
import App from "./App";
import { initAnalytics } from "@/lib/analytics";
import { registerSW } from "@/lib/push";
import { pasangBrandDariIngatan } from "@/lib/brandTheme";

// Warna merek dipasang SEBELUM React menggambar. Menunggu pengaturan tiba
// membuat halaman berkedip merah muda sekejap tiap kali dibuka.
pasangBrandDariIngatan();

// Init GA4 + Meta Pixel (kalau env var di-set saat build).
initAnalytics();

// Register service worker silent — subscribe UI di Akun page.
// Kalau browser tidak support, no-op.
registerSW();

// basename "/shop" match dengan Vite base config + POS nginx routing.
// react-router treat this as prefix untuk semua route.
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter basename="/shop">
      <App />
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: "#2B1318",
            color: "var(--color-cherry-50)",
            fontSize: "14px",
            fontWeight: 600,
            borderRadius: "12px",
          },
        }}
      />
    </BrowserRouter>
  </StrictMode>
);
