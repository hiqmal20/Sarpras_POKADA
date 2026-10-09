"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  IdCard,
} from "lucide-react";
import { api, setCurrentUser, setAuthToken, setRefreshToken } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [nomorInduk, setNomorInduk] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setLoading(true);

    try {
      const res = await api.auth.login({
        email: email.trim(),
        nomor_induk: nomorInduk.trim(),
        password,
      });

      if (res.status === "success" && res.data) {
        if (res.data.token) {
          setAuthToken(res.data.token);
        }
        if (res.data.refreshToken) {
          setRefreshToken(res.data.refreshToken);
        }
        if (res.data.user) {
          setCurrentUser(res.data.user);
        }

        const userRole = (res.data.user?.role || "").toLowerCase();
        if (userRole === "admin" || userRole === "petugas") {
          router.push("/admin/dashboard_admin");
        } else {
          router.push("/user/dashboard");
        }
      } else {
        setErrorMessage(res.message || "Email, Nomor Induk, atau password salah.");
      }
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat masuk sistem.";
      setErrorMessage(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const inputClass = `
    h-9
    w-full
    rounded-lg
    border border-white/50
    bg-white/50
    pl-9
    pr-9
    text-xs
    text-slate-800
    placeholder:text-slate-400
    shadow-[0_2px_10px_rgba(0,0,0,0.05)]
    outline-none
    transition-all
    duration-200
    focus:border-blue-300/80
    focus:bg-white/65
    focus:ring-2
    focus:ring-blue-400/15
  `;

  const iconClass = `
    pointer-events-none
    absolute
    left-3
    top-1/2
    -translate-y-1/2
    text-slate-400
  `;

  const labelClass = `
    block
    text-[11px]
    font-semibold
    text-slate-800
  `;

  return (
    <main className="relative min-h-screen min-h-dvh w-full overflow-y-auto overflow-x-hidden">
      <div className="fixed inset-0">
        <img
          src="/images/background.png"
          alt="Background Sarpras"
          className="h-full w-full object-cover object-center"
        />
      </div>

      <div className="fixed inset-0 bg-slate-950/35" />

      <div
        className="
          pointer-events-none
          fixed
          inset-0
          bg-[radial-gradient(circle_at_center,transparent_25%,rgba(15,23,42,0.12)_100%)]
        "
      />

      <div className="relative z-10 flex min-h-screen min-h-dvh items-center justify-center px-4 py-6 sm:py-8">
        <div className="w-full max-w-[365px]">
          <div
            className="
              relative
              overflow-hidden
              rounded-[19px]
              border
              border-white/45
              bg-white/45
              px-6
              py-6
              sm:px-8
              sm:py-7
              shadow-[0_20px_60px_rgba(0,0,0,0.32)]
              backdrop-blur-xl
            "
          >
            <div
              className="
                pointer-events-none
                absolute
                inset-x-0
                top-0
                h-20
                bg-white/10
              "
            />

            <div
              className="
                pointer-events-none
                absolute
                left-1/2
                top-0
                h-px
                w-3/4
                -translate-x-1/2
                bg-white/70
                blur-[1px]
              "
            />

            <div className="relative flex flex-col items-center">
              <div
                className="
                  flex
                  h-[64px]
                  w-[64px]
                  items-center
                  justify-center
                  overflow-hidden
                  rounded-2xl
                  border
                  border-white/70
                  bg-white/80
                  shadow-[0_4px_20px_rgba(0,0,0,0.08)]
                "
              >
                <img
                  src="/images/pokada.jpg"
                  alt="Logo Sarpras"
                  className="h-[54px] w-[54px] object-contain"
                />
              </div>

              <span className="mt-2.5 text-base font-bold text-blue-600 tracking-wide">
                SARPRAS POKADA
              </span>
            </div>

            <div className="relative mt-6 text-center">
              <h1
                className="
                  text-[22px]
                  font-bold
                  tracking-tight
                  text-slate-900
                "
              >
                Selamat Datang
              </h1>

              <p className="mt-1.5 text-[12px] text-slate-600">
                Silakan masuk menggunakan Email, Nomor Induk, dan Password Anda
              </p>
            </div>

            {errorMessage && (
              <div
                className="
                  relative
                  mt-5
                  rounded-lg
                  border
                  border-red-300/50
                  bg-red-100/60
                  px-3
                  py-2.5
                  text-[11px]
                  text-red-700
                  backdrop-blur-sm
                "
              >
                {errorMessage}
              </div>
            )}

            <form
              onSubmit={handleLogin}
              className="relative mt-6 space-y-4"
            >
              <div>
                <label className={`${labelClass} mb-1.5`}>
                  Email atau Nama Pengguna
                </label>

                <div className="relative">
                  <Mail
                    size={15}
                    strokeWidth={2}
                    className={iconClass}
                  />

                  <input
                    type="text"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="pokada@example.com"
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className={`${labelClass} mb-1.5`}>
                  Nomor Induk
                </label>

                <div className="relative">
                  <IdCard
                    size={15}
                    strokeWidth={2}
                    className={iconClass}
                  />

                  <input
                    type="text"
                    required
                    value={nomorInduk}
                    onChange={(e) => setNomorInduk(e.target.value)}
                    placeholder="Masukkan Nomor Induk"
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className={labelClass}>
                    Password
                  </label>
                </div>

                <div className="relative">
                  <Lock
                    size={15}
                    strokeWidth={2}
                    className={iconClass}
                  />

                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className={inputClass}
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="
                      absolute
                      right-3
                      top-1/2
                      -translate-y-1/2
                      text-slate-400
                      transition-colors
                      hover:text-slate-600
                    "
                    aria-label={
                      showPassword
                        ? "Sembunyikan password"
                        : "Tampilkan password"
                    }
                  >
                    {showPassword ? (
                      <EyeOff size={15} />
                    ) : (
                      <Eye size={15} />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="
                  mt-2
                  h-10
                  w-full
                  rounded-lg
                  bg-blue-600
                  text-xs
                  font-semibold
                  text-white
                  shadow-md
                  shadow-blue-600/20
                  transition-all
                  duration-200
                  hover:bg-blue-700
                  active:scale-[0.99]
                  focus:outline-none
                  focus:ring-2
                  focus:ring-blue-500/30
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                "
              >
                {loading ? "Memproses..." : "Masuk"}
              </button>
            </form>

            <div className="relative mt-5 text-center">
              <p className="text-[11px] text-slate-600">
                Belum punya akun?{" "}
                <Link
                  href="/auth/register"
                  className="
                    font-semibold
                    text-blue-600
                    transition-colors
                    hover:text-blue-700
                  "
                >
                  Daftar di sini
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
