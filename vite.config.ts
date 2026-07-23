import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// Vite config untuk bakeshop-ecom SPA. Mirror pola bakeshop-fe POS.
// base "/shop/" — semua asset di-prefix untuk deploy di tbksanti.id/shop.
// POS nginx sudah route /shop/* ke container ini.
export default defineConfig({
  base: "/shop/",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  server: {
    port: 3001,
    // Dev mode: forward /api/v1 ke backend. Prod: nginx handle.
    proxy: {
      "/api": {
        target: process.env.VITE_API_URL || "http://localhost:7889",
        changeOrigin: true,
      },
    },
  },
});
