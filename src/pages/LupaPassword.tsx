import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Mail, KeyRound, Loader2, Send, Check, Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";
import { accountApi } from "@/lib/api";
import { BakeryLogo } from "@/components/BakeryLogo";

type Step = "email" | "otp";

export function LupaPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [sending, setSending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const otpInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus OTP input when moving to step 2.
  useEffect(() => {
    if (step === "otp") {
      setTimeout(() => otpInputRef.current?.focus(), 100);
    }
  }, [step]);

  // Countdown untuk enable resend OTP (matches BE rate-limit 60s).
  useEffect(() => {
    if (resendCountdown <= 0) return;
    const t = setTimeout(() => setResendCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCountdown]);

  const sendOTP = async () => {
    if (!email.trim() || !email.includes("@")) {
      toast.error("Email tidak valid");
      return;
    }
    setSending(true);
    try {
      await accountApi.requestResetOTP(email.trim().toLowerCase());
      toast.success("Kalau email terdaftar, OTP dikirim. Cek inbox + folder spam.");
      setStep("otp");
      setResendCountdown(60);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal kirim OTP");
    } finally {
      setSending(false);
    }
  };

  const confirmReset = async () => {
    if (!otp || otp.length !== 6) {
      toast.error("Masukkan 6 digit OTP");
      return;
    }
    if (newPwd.length < 6) {
      toast.error("Password minimal 6 karakter");
      return;
    }
    if (newPwd !== confirmPwd) {
      toast.error("Konfirmasi password tidak cocok");
      return;
    }
    setConfirming(true);
    try {
      await accountApi.confirmResetOTP({
        email: email.trim().toLowerCase(),
        otp: otp.trim(),
        new_password: newPwd,
      });
      toast.success("Password baru berhasil. Silakan login.");
      setTimeout(() => navigate("/"), 1500);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal reset password");
    } finally {
      setConfirming(false);
    }
  };

  return (
    <main className="min-h-dvh flex items-start justify-center p-4 pt-8 sm:pt-16">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <BakeryLogo size={72} />
        </div>

        <div className="bg-white rounded-2xl border border-cherry-200 p-6 shadow-sm">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-ink-700 hover:text-ink-900 mb-4"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            Kembali ke Login
          </Link>

          {step === "email" ? (
            <>
              <h1 className="text-xl font-black text-ink-900 mb-1">Lupa Password?</h1>
              <p className="text-sm text-ink-500 mb-5">
                Masukkan email terdaftar. Kami akan kirim kode OTP 6 digit ke inbox kamu.
              </p>

              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="email" className="text-xs font-bold text-ink-700 uppercase tracking-wider">
                    Email
                  </label>
                  <div className="relative">
                    <Mail
                      size={14}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-500 pointer-events-none"
                      aria-hidden="true"
                    />
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && sendOTP()}
                      autoComplete="email"
                      inputMode="email"
                      placeholder="kamu@email.com"
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-cherry-200 text-sm focus:outline-none focus:ring-2 focus:ring-cherry-500/30 focus:border-cherry-400"
                    />
                  </div>
                </div>

                <button
                  onClick={sendOTP}
                  disabled={sending}
                  className="flex items-center justify-center gap-2 py-3.5 rounded-xl text-white text-sm font-bold bg-gradient-to-r from-cherry-400 to-cherry-500 hover:opacity-90 disabled:opacity-60"
                >
                  {sending ? (
                    <>
                      <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                      Mengirim…
                    </>
                  ) : (
                    <>
                      <Send size={14} aria-hidden="true" />
                      Kirim Kode OTP
                    </>
                  )}
                </button>
              </div>
            </>
          ) : (
            <>
              <h1 className="text-xl font-black text-ink-900 mb-1">Kode OTP Dikirim</h1>
              <p className="text-sm text-ink-500 mb-4">
                Kami kirim kode ke <b className="text-ink-900">{email}</b>.<br />
                Cek inbox (dan folder spam) — kode berlaku 10 menit.
              </p>

              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="otp" className="text-xs font-bold text-ink-700 uppercase tracking-wider">
                    Kode OTP (6 digit)
                  </label>
                  <input
                    ref={otpInputRef}
                    id="otp"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    autoComplete="one-time-code"
                    placeholder="000000"
                    className="px-4 py-3 rounded-xl border border-cherry-200 text-center text-2xl font-black font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-cherry-500/30 focus:border-cherry-400"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-ink-700 uppercase tracking-wider">
                    Password Baru
                  </label>
                  <div className="relative">
                    <input
                      type={showPwd ? "text" : "password"}
                      value={newPwd}
                      onChange={(e) => setNewPwd(e.target.value)}
                      autoComplete="new-password"
                      minLength={6}
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
                  onClick={confirmReset}
                  disabled={confirming}
                  className="flex items-center justify-center gap-2 py-3.5 rounded-xl text-white text-sm font-bold bg-gradient-to-r from-cherry-400 to-cherry-500 disabled:opacity-60"
                >
                  {confirming ? (
                    <>
                      <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                      Memproses…
                    </>
                  ) : (
                    <>
                      <Check size={14} aria-hidden="true" />
                      Reset Password
                    </>
                  )}
                </button>

                <div className="flex items-center justify-between text-xs pt-1">
                  <button
                    onClick={() => setStep("email")}
                    className="text-ink-500 hover:text-ink-900 underline"
                  >
                    Ganti email
                  </button>
                  <button
                    onClick={sendOTP}
                    disabled={resendCountdown > 0 || sending}
                    className="text-cherry-500 font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {resendCountdown > 0 ? `Kirim ulang (${resendCountdown}s)` : "Kirim ulang kode"}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
