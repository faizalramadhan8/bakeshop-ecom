import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { trackPageView } from "@/lib/analytics";
import { ShopLayout } from "@/components/ShopLayout";
import { Home } from "@/pages/Home";
import { Kategori } from "@/pages/Kategori";
import { Produk } from "@/pages/Produk";
import { Keranjang } from "@/pages/Keranjang";
import { Akun } from "@/pages/Akun";
import { Alamat } from "@/pages/Alamat";
import { Checkout } from "@/pages/Checkout";
import { Pesanan } from "@/pages/Pesanan";
import { PesananDetail } from "@/pages/PesananDetail";
import { AdminLogin } from "@/pages/AdminLogin";
import { AdminDashboard } from "@/pages/AdminDashboard";
import { AdminProdukList } from "@/pages/AdminProdukList";
import { AdminProdukEdit } from "@/pages/AdminProdukEdit";
import { AdminKategori } from "@/pages/AdminKategori";
import { AdminPesananList } from "@/pages/AdminPesananList";
import { AdminPesananDetail } from "@/pages/AdminPesananDetail";
import { AdminVoucher } from "@/pages/AdminVoucher";
import { AdminKomplain } from "@/pages/AdminKomplain";
import { AdminReview } from "@/pages/AdminReview";
import { AdminCustomers } from "@/pages/AdminCustomers";
import { AdminPesananPrint } from "@/pages/AdminPesananPrint";
import { AdminEcomSettings } from "@/pages/AdminEcomSettings";
import { Profil } from "@/pages/Profil";
import { LupaPassword } from "@/pages/LupaPassword";
import { Wishlist } from "@/pages/Wishlist";
import { Cari } from "@/pages/Cari";
import { TentangKami, FAQ, SyaratKetentuan, KebijakanPrivasi } from "@/pages/StaticPages";

// AnalyticsListener — fire GA4 page_view + Meta PageView pada SPA route change.
// Ini terpisah dari App biar useLocation ada di dalam <BrowserRouter>.
function AnalyticsListener() {
  const loc = useLocation();
  useEffect(() => {
    trackPageView(loc.pathname + loc.search);
  }, [loc.pathname, loc.search]);
  return null;
}

export default function App() {
  return (
    <>
    <AnalyticsListener />
    <Routes>
      {/* Public storefront routes wrapped in shared Layout */}
      <Route element={<ShopLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/kategori" element={<Kategori />} />
        <Route path="/kategori/:slug" element={<Kategori />} />
        <Route path="/produk/:id" element={<Produk />} />
        <Route path="/keranjang" element={<Keranjang />} />
        <Route path="/akun" element={<Akun />} />
        <Route path="/akun/alamat" element={<Alamat />} />
        <Route path="/akun/profil" element={<Profil />} />
        <Route path="/wishlist" element={<Wishlist />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/pesanan" element={<Pesanan />} />
        <Route path="/pesanan/:id" element={<PesananDetail />} />
        <Route path="/cari" element={<Cari />} />
        {/* Sprint 3 #11 — legal & info pages */}
        <Route path="/tentang" element={<TentangKami />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/syarat-ketentuan" element={<SyaratKetentuan />} />
        <Route path="/kebijakan-privasi" element={<KebijakanPrivasi />} />
      </Route>

      {/* Public standalone (no ShopLayout — user belum login) */}
      <Route path="/lupa-password" element={<LupaPassword />} />

      {/* Admin routes (no Layout) */}
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/admin/produk" element={<AdminProdukList />} />
      <Route path="/admin/produk/:id" element={<AdminProdukEdit />} />
      <Route path="/admin/kategori" element={<AdminKategori />} />
      <Route path="/admin/pesanan" element={<AdminPesananList />} />
      {/* Print route HARUS sebelum :id supaya "print" tidak ke-match sebagai order ID */}
      <Route path="/admin/pesanan/print" element={<AdminPesananPrint />} />
      <Route path="/admin/pesanan/:id" element={<AdminPesananDetail />} />
      <Route path="/admin/voucher" element={<AdminVoucher />} />
      <Route path="/admin/komplain" element={<AdminKomplain />} />
      <Route path="/admin/ulasan" element={<AdminReview />} />
      <Route path="/admin/customers" element={<AdminCustomers />} />
      <Route path="/admin/pengaturan" element={<AdminEcomSettings />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </>
  );
}
