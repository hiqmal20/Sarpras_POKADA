"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User,
  Mail,
  Building2,
  Lock,
  IdCard,
  Phone,
  ChevronDown,
} from "lucide-react";
import { api, setAuthToken, setCurrentUser } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    nomor_induk: "",
    name: "",
    email: "",
    password: "",
    role: "Mahasiswa",
    no_hp: "",
  });

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setLoading(true);

    try {
      const res = await api.auth.register({
        nomor_induk: formData.nomor_induk.trim(),
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password,
        role: formData.role,
        no_hp: formData.no_hp.trim(),
      });

      if (res.status === "success" && res.data) {
        if (res.data.token) {
          setAuthToken(res.data.token);
        }

        if (res.data.user) {
          setCurrentUser(res.data.user);
        }

        const userRole = (
          res.data.user?.role ||
          formData.role ||
          ""
        ).toLowerCase();

        if (userRole === "admin" || userRole === "petugas") {
          router.push("/admin/dashboard_admin");
        } else {
          router.push("/user/dashboard");
        }
      } else {
        setErrorMessage(
          res.message || "Gagal melakukan pendaftaran akun."
        );
      }
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan koneksi server.";

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
    pr-3
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
    absolute
    left-3
    top-1/2
    -translate-y-1/2
    text-slate-400
  `;

  const labelClass = `
    mb-1.5
    block
    text-[11px]
    font-semibold
    text-slate-800
  `;

  return (
    <main className="relative min-h-screen w-full overflow-hidden">
      {/* =====================================================
          BACKGROUND
      ====================================================== */}
      <div className="absolute inset-0">
        <img
          src="/images/background.png"
          alt="Background Sarpras"
          className="h-full w-full object-cover object-center"
        />
      </div>

      {/* =====================================================
          OVERLAY
          Dibuat sedikit lebih gelap agar background tidak
          terlalu terang, sama seperti nuansa halaman login.
      ====================================================== */}
      <div className="absolute inset-0 bg-slate-950/35" />

      {/* Soft vignette supaya bagian tengah tetap fokus */}
      <div
        className="
          pointer-events-none
          absolute
          inset-0
          bg-[radial-gradient(circle_at_center,transparent_25%,rgba(15,23,42,0.12)_100%)]
        "
      />

      {/* =====================================================
          REGISTER CONTENT
      ====================================================== */}
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-8">
        <div className="w-full max-w-[430px]">

          {/* =================================================
              REGISTER CARD
          ================================================= */}
          <div
            className="
              relative
              overflow-hidden
              rounded-[20px]
              border
              border-white/45
              bg-white/45
              px-7
              py-6
              shadow-[0_20px_60px_rgba(0,0,0,0.32)]
              backdrop-blur-xl
              sm:px-8
              sm:py-7
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

            {/* =================================================
                LOGO
            ================================================= */}
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

              <span className="mt-2 text-xs font-semibold text-blue-600">
                Sarpras
              </span>
            </div>

            {/* =================================================
                TITLE
            ================================================= */}
            <div className="relative mt-5 text-center">
              <h1 className="text-sm font-bold text-slate-900">
                Create Account
              </h1>

              <p className="mx-auto mt-1.5 max-w-[280px] text-[11px] leading-4 text-slate-600">
                Request access to the facility management system.
              </p>
            </div>

            {/* =================================================
                ERROR MESSAGE
            ================================================= */}
            {errorMessage && (
              <div
                className="
                  relative
                  mt-4
                  rounded-lg
                  border
                  border-red-300/50
                  bg-red-100/60
                  px-3
                  py-2
                  text-[11px]
                  text-red-700
                  backdrop-blur-sm
                "
              >
                {errorMessage}
              </div>
            )}

            {/* =================================================
                FORM
            ================================================= */}
            <form
              onSubmit={handleRegister}
              className="relative mt-5 space-y-3"
            >

              {/* FULL NAME */}
              <div>
                <label className={labelClass}>
                  Full Name
                </label>

                <div className="relative">
                  <User
                    size={14}
                    strokeWidth={2}
                    className={iconClass}
                  />

                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Nama Lengkap"
                    className={inputClass}
                  />
                </div>
              </div>

              {/* EMAIL */}
              <div>
                <label className={labelClass}>
                  Email Address
                </label>

                <div className="relative">
                  <Mail
                    size={14}
                    strokeWidth={2}
                    className={iconClass}
                  />

                  <input
                    type="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="admin@example.com"
                    className={inputClass}
                  />
                </div>
              </div>

              {/* DEPARTMENT */}
              <div>
                <label className={labelClass}>
                  Department
                </label>

                <div className="relative">
                  <Building2
                    size={14}
                    strokeWidth={2}
                    className={iconClass}
                  />

                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    className={`
                      ${inputClass}
                      appearance-none
                      cursor-pointer
                      pr-9
                    `}
                  >
                    <option value="Mahasiswa">
                      Mahasiswa
                    </option>

                    <option value="Dosen">
                      Dosen
                    </option>

                    <option value="Staff">
                      Staff
                    </option>
                  </select>

                  <ChevronDown
                    size={14}
                    className="
                      pointer-events-none
                      absolute
                      right-3
                      top-1/2
                      -translate-y-1/2
                      text-slate-400
                    "
                  />
                </div>
              </div>

              {/* NOMOR INDUK */}
              <div>
                <label className={labelClass}>
                  Nomor Induk
                </label>

                <div className="relative">
                  <IdCard
                    size={14}
                    strokeWidth={2}
                    className={iconClass}
                  />

                  <input
                    type="text"
                    name="nomor_induk"
                    required
                    value={formData.nomor_induk}
                    onChange={handleChange}
                    placeholder="Nomor Induk"
                    className={inputClass}
                  />
                </div>
              </div>

              {/* NO HP */}
              <div>
                <label className={labelClass}>
                  No. WhatsApp / HP
                </label>

                <div className="relative">
                  <Phone
                    size={14}
                    strokeWidth={2}
                    className={iconClass}
                  />

                  <input
                    type="text"
                    name="no_hp"
                    value={formData.no_hp}
                    onChange={handleChange}
                    placeholder="08123456789"
                    className={inputClass}
                  />
                </div>
              </div>

              {/* PASSWORD */}
              <div>
                <label className={labelClass}>
                  Password
                </label>

                <div className="relative">
                  <Lock
                    size={14}
                    strokeWidth={2}
                    className={iconClass}
                  />

                  <input
                    type="password"
                    name="password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className={inputClass}
                  />
                </div>
              </div>

              {/* SUBMIT */}
              <button
                type="submit"
                disabled={loading}
                className="
                  mt-2
                  h-9
                  w-full
                  rounded-lg
                  bg-blue-600
                  text-xs
                  font-medium
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
                {loading ? "Mendaftarkan..." : "Daftar"}
              </button>
            </form>

            {/* =================================================
                LOGIN LINK
            ================================================= */}
            <div className="relative mt-4 text-center">
              <p className="text-[10px] text-slate-600">
                Already have an account?{" "}

                <Link
                  href="/auth/login"
                  className="
                    font-medium
                    text-blue-600
                    transition-colors
                    hover:text-blue-700
                  "
                >
                  Sign in here
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}