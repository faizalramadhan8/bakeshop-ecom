import { Routes, Route, Navigate } from "react-router-dom";
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

export default function App() {
  return (
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
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/pesanan" element={<Pesanan />} />
        <Route path="/pesanan/:id" element={<PesananDetail />} />
        <Route path="/cari" element={<Kategori />} />
      </Route>

      {/* Admin routes (no Layout) */}
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/admin/produk" element={<AdminProdukList />} />
      <Route path="/admin/produk/:id" element={<AdminProdukEdit />} />
      <Route path="/admin/kategori" element={<AdminKategori />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
