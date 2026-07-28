import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import "./index.css";
import App from "./App";
import { initAnalytics } from "@/lib/analytics";

// Init GA4 + Meta Pixel (kalau env var di-set saat build).
initAnalytics();

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
            color: "#FFF4F6",
            fontSize: "14px",
            fontWeight: 600,
            borderRadius: "12px",
          },
        }}
      />
    </BrowserRouter>
  </StrictMode>
);
