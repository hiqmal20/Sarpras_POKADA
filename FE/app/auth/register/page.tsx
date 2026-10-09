"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User,
  Mail,
  Lock,
  IdCard,
  Phone,
  ChevronDown,
  ArrowLeft,
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
        try {
          sessionStorage.removeItem("logged_out");
        } catch {}
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
        const errorDetail =
          res.errors && res.errors.length > 0
            ? res.errors.map((e) => e.message).join(", ")
            : res.message;
        setErrorMessage(
          errorDetail || "Gagal melakukan pendaftaran akun."
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
    focus:border-[#0785BC]
    focus:bg-white/65
    focus:ring-2
    focus:ring-[#0785BC]/20
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
              <div className="w-full flex items-center justify-start mb-2">
                <Link
                  href="/"
                  className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 hover:text-[#0785BC] transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Kembali ke Beranda
                </Link>
              </div>

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

              <span className="mt-2.5 text-base font-bold text-slate-800 tracking-wide">
                SARPRAS<span className="text-[#0785BC]">POKADA</span>
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
                Buat Akun
              </h1>

              <p className="mt-1.5 text-[12px] text-slate-600">
                Daftarkan akun untuk mengakses sistem peminjaman sarpras
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
              onSubmit={handleRegister}
              className="relative mt-6 space-y-3.5"
            >
              <div>
                <label className={`${labelClass} mb-1.5`}>
                  Nama Lengkap
                </label>

                <div className="relative">
                  <User
                    size={15}
                    strokeWidth={2}
                    className={iconClass}
                  />

                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Masukkan nama lengkap"
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className={`${labelClass} mb-1.5`}>
                  Email
                </label>

                <div className="relative">
                  <Mail
                    size={15}
                    strokeWidth={2}
                    className={iconClass}
                  />

                  <input
                    type="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
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
                    name="nomor_induk"
                    required
                    value={formData.nomor_induk}
                    onChange={handleChange}
                    placeholder="Masukkan Nomor Induk"
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className={`${labelClass} mb-1.5`}>
                  Role / Jabatan
                </label>

                <div className="relative">
                  <ChevronDown
                    size={15}
                    className="
                      pointer-events-none
                      absolute
                      right-3
                      top-1/2
                      -translate-y-1/2
                      text-slate-400
                    "
                  />

                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    className={`${inputClass} appearance-none cursor-pointer pl-3`}
                  >
                    <option value="Mahasiswa">Mahasiswa</option>
                    <option value="Dosen">Dosen</option>
                    <option value="Staff">Staff</option>
                  </select>
                </div>
              </div>

              <div>
                <label className={`${labelClass} mb-1.5`}>
                  No. WhatsApp / HP
                </label>

                <div className="relative">
                  <Phone
                    size={15}
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

              <div>
                <label className={`${labelClass} mb-1.5`}>
                  Password
                </label>

                <div className="relative">
                  <Lock
                    size={15}
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

              <button
                type="submit"
                disabled={loading}
                className="
                  mt-2
                  h-10
                  w-full
                  rounded-lg
                  bg-[#0785BC]
                  text-xs
                  font-semibold
                  text-white
                  shadow-md
                  shadow-[#0785BC]/25
                  transition-all
                  duration-200
                  hover:bg-[#0672a0]
                  active:scale-[0.99]
                  focus:outline-none
                  focus:ring-2
                  focus:ring-[#0785BC]/30
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                "
              >
                {loading ? "Mendaftarkan..." : "Daftar"}
              </button>
            </form>

            <div className="relative mt-5 text-center">
              <p className="text-[11px] text-slate-600">
                Sudah punya akun?{" "}
                <Link
                  href="/auth/login"
                  className="
                    font-semibold
                    text-[#0785BC]
                    transition-colors
                    hover:text-[#0672a0]
                  "
                >
                  Masuk di sini
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
