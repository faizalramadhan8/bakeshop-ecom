import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogIn } from "lucide-react";
import toast from "react-hot-toast";
import { adminApi, setAdminToken } from "@/lib/api";

export function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setLoading(true);
    try {
      const res = await adminApi.login(email.trim(), password);
      setAdminToken(res.access_token);
      toast.success("Login berhasil");
      navigate("/admin");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Login gagal";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-cherry-300 to-cherry-500 shadow-md flex items-center justify-center mb-6">
          <span className="text-white font-black text-2xl">S</span>
        </div>
        <h1 className="text-2xl font-black text-center text-ink-900 mb-1">Ecom Admin</h1>
        <p className="text-sm text-center text-ink-700 mb-8">
          Login untuk manage toko online
        </p>

        <form
          onSubmit={submit}
          className="flex flex-col gap-4 bg-white rounded-3xl border border-cherry-200 p-6 shadow-sm"
        >
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-ink-700 uppercase tracking-wider">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@tbksanti.id"
              autoComplete="email"
              required
              className="px-4 py-3 rounded-xl border border-cherry-200 text-sm focus:outline-none focus:ring-2 focus:ring-cherry-500/30 focus:border-cherry-400"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-ink-700 uppercase tracking-wider">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              className="px-4 py-3 rounded-xl border border-cherry-200 text-sm focus:outline-none focus:ring-2 focus:ring-cherry-500/30 focus:border-cherry-400"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 flex items-center justify-center gap-2 py-3 rounded-xl text-white text-sm font-bold bg-gradient-to-r from-cherry-400 to-cherry-500 hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {loading ? (
              "Memproses…"
            ) : (
              <>
                <LogIn size={16} />
                Masuk
              </>
            )}
          </button>
        </form>

        <p className="text-xs text-center text-ink-500 mt-6">
          Bukan admin ecom?{" "}
          <a href="/shop/" className="text-cherry-500 underline">
            storefront
          </a>
        </p>
      </div>
    </main>
  );
}
