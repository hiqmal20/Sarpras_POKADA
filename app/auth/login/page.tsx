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
import { setAuthToken, setCurrentUser } from "@/lib/api";

// Mock users untuk development/demo
const MOCK_USERS = [
  {
    email: "admin@pokada.com",
    nomor_induk: "ADM001",
    password: "admin123",
    role: "admin",
    name: "Admin POKADA",
  },
  {
    email: "user@pokada.com",
    nomor_induk: "USR001",
    password: "user123",
    role: "user",
    name: "User POKADA",
  },
];

export default function LoginPage() {
  const router = useRouter();

  const [identifier, setIdentifier] = useState("");
  const [nomorInduk, setNomorInduk] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setLoading(true);

    await new Promise((resolve) => setTimeout(resolve, 500));

    try {
      const user = MOCK_USERS.find((u) => {
        const emailOrNameMatch =
          u.email.toLowerCase() === identifier.toLowerCase() ||
          u.name.toLowerCase() === identifier.toLowerCase();

        const nomorIndukMatch =
          !nomorInduk ||
          u.nomor_induk.toLowerCase() === nomorInduk.toLowerCase();

        return (
          emailOrNameMatch &&
          nomorIndukMatch &&
          u.password === password
        );
      });

      if (user) {
        const mockToken = `mock-token-${Date.now()}`;

        const mockUser = {
          id: user.nomor_induk,
          email: user.email,
          nomor_induk: user.nomor_induk,
          full_name: user.name,
          role: user.role,
        };

        setAuthToken(mockToken);
        setCurrentUser(mockUser);

        if (user.role === "admin" || user.role === "petugas") {
          router.push("/admin/dashboard_admin");
        } else {
          router.push("/user/dashboard");
        }
      } else {
        const mockToken = `mock-token-${Date.now()}`;

        const mockUser = {
          id: nomorInduk || "DEMO001",
          email: identifier || "demo@pokada.com",
          nomor_induk: nomorInduk || "DEMO001",
          full_name: "Demo User",
          role: "admin",
        };

        setAuthToken(mockToken);
        setCurrentUser(mockUser);

        router.push("/admin/dashboard_admin");
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

  // =========================
  // STYLE
  // =========================

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
    <main className="relative min-h-screen w-full overflow-hidden">
      {/* ================= BACKGROUND ================= */}
      <div className="absolute inset-0">
        <img
          src="/images/background.png"
          alt="Background Sarpras"
          className="
            h-full
            w-full
            object-cover
            object-center
          "
        />
      </div>

      {/* ================= BACKGROUND OVERLAY ================= */}
      <div className="absolute inset-0 bg-slate-950/35" />

      {/* Soft vignette seperti halaman register */}
      <div
        className="
          pointer-events-none
          absolute
          inset-0
          bg-[radial-gradient(circle_at_center,transparent_25%,rgba(15,23,42,0.12)_100%)]
        "
      />

      {/* ================= LOGIN CONTAINER ================= */}
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-8">
        <div className="w-full max-w-[365px]">

          {/* ================= GLASS CARD ================= */}
          <div
            className="
              relative
              overflow-hidden
              rounded-[19px]
              border
              border-white/45
              bg-white/45
              px-8
              py-7
              shadow-[0_20px_60px_rgba(0,0,0,0.32)]
              backdrop-blur-xl
            "
          >
            {/* Glass Highlight */}
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

            {/* Subtle top shine */}
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

            {/* ================= LOGO ================= */}
            <div className="relative flex flex-col items-center">
              <div
                className="
                  flex
                  h-[52px]
                  w-[52px]
                  items-center
                  justify-center
                  overflow-hidden
                  rounded-[13px]
                  border
                  border-white/70
                  bg-white/80
                  shadow-[0_4px_15px_rgba(0,0,0,0.08)]
                "
              >
                <img
                  src="/images/pokada.jpg"
                  alt="Logo Sarpras"
                  className="h-[43px] w-[43px] object-contain"
                />
              </div>

              <span className="mt-2 text-sm font-bold text-blue-600">
                Sarpras
              </span>
            </div>

            {/* ================= TITLE ================= */}
            <div className="relative mt-6 text-center">
              <h1
                className="
                  text-[22px]
                  font-bold
                  tracking-tight
                  text-slate-900
                "
              >
                Welcome Back
              </h1>

              <p className="mt-1.5 text-[12px] text-slate-600">
                Please sign in to access your dashboard.
              </p>
            </div>

            {/* ================= ERROR ================= */}
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

            {/* ================= FORM ================= */}
            <form
              onSubmit={handleLogin}
              className="relative mt-6 space-y-4"
            >
              {/* ================= EMAIL / NAMA ================= */}
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
                    value={identifier}
                    onChange={(e) =>
                      setIdentifier(e.target.value)
                    }
                    placeholder="pokada@example.com"
                    className={inputClass}
                  />
                </div>
              </div>

              {/* ================= NOMOR INDUK ================= */}
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
                    value={nomorInduk}
                    onChange={(e) =>
                      setNomorInduk(e.target.value)
                    }
                    placeholder="Masukkan Nomor Induk"
                    className={inputClass}
                  />
                </div>
              </div>

              {/* ================= PASSWORD ================= */}
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className={labelClass}>
                    Password
                  </label>

                  <span
                    className="
                      cursor-pointer
                      text-[10px]
                      font-medium
                      text-blue-600
                      transition-colors
                      hover:text-blue-700
                    "
                  >
                    Lupa Password?
                  </span>
                </div>

                <div className="relative">
                  <Lock
                    size={15}
                    strokeWidth={2}
                    className={iconClass}
                  />

                  <input
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    required
                    value={password}
                    onChange={(e) =>
                      setPassword(e.target.value)
                    }
                    placeholder="••••••••"
                    className={inputClass}
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword(
                        (prev) => !prev
                      )
                    }
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

              {/* ================= REMEMBER ME ================= */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="
                    h-3.5
                    w-3.5
                    cursor-pointer
                    rounded
                    border-slate-300
                    accent-blue-600
                  "
                />

                <span className="text-[10px] text-slate-600">
                  Remember me for 30 days
                </span>
              </div>

              {/* ================= LOGIN BUTTON ================= */}
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
                {loading ? "Memproses..." : "Sign In"}
              </button>
            </form>

            {/* ================= OR ================= */}
            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-white/60" />

              <span className="text-[10px] text-slate-500">
                or
              </span>

              <div className="h-px flex-1 bg-white/60" />
            </div>

            {/* ================= REGISTER ================= */}
            <Link
              href="/auth/register"
              className="
                flex
                h-10
                w-full
                items-center
                justify-center
                rounded-lg
                border
                border-white/70
                bg-white/50
                text-xs
                font-semibold
                text-blue-600
                shadow-[0_2px_10px_rgba(0,0,0,0.05)]
                transition-all
                hover:bg-white/70
                hover:text-blue-700
              "
            >
              Daftar Akun
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}