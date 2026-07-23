import { Routes, Route, Navigate } from "react-router-dom";
import { Home } from "@/pages/Home";
import { AdminLogin } from "@/pages/AdminLogin";
import { AdminDashboard } from "@/pages/AdminDashboard";
import { AdminProdukList } from "@/pages/AdminProdukList";
import { AdminProdukEdit } from "@/pages/AdminProdukEdit";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/admin/produk" element={<AdminProdukList />} />
      <Route path="/admin/produk/:id" element={<AdminProdukEdit />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
