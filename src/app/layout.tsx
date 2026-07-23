import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
  title: {
    default: "Toko Bahan Kue Santi — Belanja Online",
    template: "%s · Toko Bahan Kue Santi",
  },
  description: "Belanja bahan kue dan pastry berkualitas — tepung, cokelat, whipping cream, mentega, dan lainnya. Kirim seluruh Indonesia.",
  keywords: ["bahan kue", "tepung", "cokelat", "whipping cream", "toko bahan kue online"],
  openGraph: {
    type: "website",
    locale: "id_ID",
    siteName: "Toko Bahan Kue Santi",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#E11D48",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="min-h-screen antialiased">
        {children}
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
      </body>
    </html>
  );
}
