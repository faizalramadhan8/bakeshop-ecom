import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Save, User, KeyRound, Eye, EyeOff, Loader2, Mail } from "lucide-react";
import toast from "react-hot-toast";
import { accountApi } from "@/lib/api";

export function Profil() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const [email, setEmail] = useState("");
  const [fullname, setFullname] = useState("");
  const [phone, setPhone] = useState("");

  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [showPwd, setShowPwd] = useState(false);

  useEffect(() => {
    accountApi
      .getMe()
      .then((me) => {
        setEmail(me.email || "");
        setFullname(me.fullname || "");
        setPhone(me.phone || "");
      })
      .catch(() => toast.error("Gagal load profil"))
      .finally(() => setLoading(false));
  }, []);

  const saveProfile = async () => {
    if (!fullname.trim()) {
      toast.error("Nama wajib diisi");
      return;
    }
    setSavingProfile(true);
    try {
      await accountApi.updateProfile({ fullname: fullname.trim(), phone: phone.trim() });
      toast.success("Profil diperbarui");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal simpan");
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async () => {
    if (!currentPwd || !newPwd) {
      toast.error("Isi password lama dan baru");
      return;
    }
    if (newPwd.length < 6) {
      toast.error("Password baru minimal 6 karakter");
      return;
    }
    if (newPwd !== confirmPwd) {
      toast.error("Konfirmasi password tidak cocok");
      return;
    }
    setSavingPassword(true);
    try {
      await accountApi.changePassword({ current_password: currentPwd, new_password: newPwd });
      toast.success("Password diperbarui");
      setCurrentPwd(""); setNewPwd(""); setConfirmPwd("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal ganti password");
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) {
    return <div className="max-w-2xl mx-auto p-6 text-center text-ink-500 text-sm">Memuat…</div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-4 pb-8">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 text-sm text-ink-700 hover:text-ink-900 mb-4"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Kembali
      </button>

      <h1 className="text-2xl font-black text-ink-900 mb-1">Profil Saya</h1>
      <p className="text-sm text-ink-500 mb-4">Kelola informasi akun dan password.</p>

      {/* Profile section */}
      <section className="bg-white rounded-2xl border border-cherry-200 p-5 mb-4">
        <h2 className="text-sm font-black text-ink-900 mb-3 flex items-center gap-2">
          <User size={14} className="text-cherry-500" aria-hidden="true" />
          Informasi Akun
        </h2>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-ink-700 uppercase tracking-wider">
              Email
            </label>
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-cherry-100 bg-cherry-50/30 text-sm text-ink-700">
              <Mail size={14} className="text-ink-500 shrink-0" aria-hidden="true" />
              {email}
              <span className="ml-auto text-xs text-ink-500">tidak bisa diubah</span>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="fullname" className="text-xs font-bold text-ink-700 uppercase tracking-wider">
              Nama Lengkap *
            </label>
            <input
              id="fullname"
              value={fullname}
              onChange={(e) => setFullname(e.target.value)}
              autoComplete="name"
              className="px-4 py-3 rounded-xl border border-cherry-200 text-sm focus:outline-none focus:ring-2 focus:ring-cherry-500/30 focus:border-cherry-400"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="phone" className="text-xs font-bold text-ink-700 uppercase tracking-wider">
              Nomor HP
            </label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
              placeholder="08xxxxxxxxxx"
              className="px-4 py-3 rounded-xl border border-cherry-200 text-sm focus:outline-none focus:ring-2 focus:ring-cherry-500/30 focus:border-cherry-400"
            />
          </div>

          <button
            onClick={saveProfile}
            disabled={savingProfile}
            className="flex items-center justify-center gap-2 py-3 rounded-xl text-white text-sm font-bold bg-gradient-to-r from-cherry-400 to-cherry-500 hover:opacity-90 disabled:opacity-60 transition-opacity mt-1"
          >
            {savingProfile ? (
              <>
                <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                Menyimpan…
              </>
            ) : (
              <>
                <Save size={14} aria-hidden="true" />
                Simpan Profil
              </>
            )}
          </button>
        </div>
      </section>

      {/* Password section */}
      <section className="bg-white rounded-2xl border border-cherry-200 p-5 mb-4">
        <h2 className="text-sm font-black text-ink-900 mb-3 flex items-center gap-2">
          <KeyRound size={14} className="text-cherry-500" aria-hidden="true" />
          Ganti Password
        </h2>
        <p className="text-xs text-ink-500 mb-3">
          Butuh password lama untuk verifikasi. Kalau lupa,{" "}
          <Link to="/lupa-password" className="text-cherry-500 font-bold underline">
            reset via email
          </Link>
          .
        </p>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-ink-700 uppercase tracking-wider">
              Password Lama
            </label>
            <div className="relative">
              <input
                type={showPwd ? "text" : "password"}
                value={currentPwd}
                onChange={(e) => setCurrentPwd(e.target.value)}
                autoComplete="current-password"
                className="w-full pr-11 px-4 py-3 rounded-xl border border-cherry-200 text-sm focus:outline-none focus:ring-2 focus:ring-cherry-500/30 focus:border-cherry-400"
              />
              <button
                type="button"
                onClick={() => setShowPwd(!showPwd)}
                aria-label={showPwd ? "Sembunyikan" : "Tampilkan"}
                className="absolute right-1 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-ink-500 hover:text-ink-900"
              >
                {showPwd ? <EyeOff size={14} aria-hidden="true" /> : <Eye size={14} aria-hidden="true" />}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-ink-700 uppercase tracking-wider">
              Password Baru (min 6 karakter)
            </label>
            <input
              type={showPwd ? "text" : "password"}
              value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)}
              autoComplete="new-password"
              className="px-4 py-3 rounded-xl border border-cherry-200 text-sm focus:outline-none focus:ring-2 focus:ring-cherry-500/30 focus:border-cherry-400"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-ink-700 uppercase tracking-wider">
              Konfirmasi Password Baru
            </label>
            <input
              type={showPwd ? "text" : "password"}
              value={confirmPwd}
              onChange={(e) => setConfirmPwd(e.target.value)}
              autoComplete="new-password"
              className="px-4 py-3 rounded-xl border border-cherry-200 text-sm focus:outline-none focus:ring-2 focus:ring-cherry-500/30 focus:border-cherry-400"
            />
          </div>

          <button
            onClick={savePassword}
            disabled={savingPassword}
            className="flex items-center justify-center gap-2 py-3 rounded-xl text-white text-sm font-bold bg-gradient-to-r from-cherry-400 to-cherry-500 hover:opacity-90 disabled:opacity-60 transition-opacity mt-1"
          >
            {savingPassword ? (
              <>
                <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                Menyimpan…
              </>
            ) : (
              <>
                <KeyRound size={14} aria-hidden="true" />
                Ganti Password
              </>
            )}
          </button>
        </div>
      </section>
    </div>
  );
}
