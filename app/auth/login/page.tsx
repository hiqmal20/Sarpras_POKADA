"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { setAuthToken, setCurrentUser } from "@/lib/api";

// Mock users untuk development/demo
const MOCK_USERS = [
  {
    email: "admin@pokada.com",
    nomor_induk: "ADM001",
    password: "admin123",
    role: "admin",
    name: "Admin POKADA"
  },
  {
    email: "user@pokada.com",
    nomor_induk: "USR001",
    password: "user123",
    role: "user",
    name: "User POKADA"
  }
];

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState(""); // Email atau Nomor Induk
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setLoading(true);

    // Simulate loading delay
    await new Promise(resolve => setTimeout(resolve, 500));

    try {
      // Mock authentication - check against mock users
      const user = MOCK_USERS.find(
        u => (u.email.toLowerCase() === identifier.toLowerCase() || 
              u.nomor_induk.toLowerCase() === identifier.toLowerCase()) &&
             u.password === password
      );

      if (user) {
        // Generate mock token
        const mockToken = `mock-token-${Date.now()}`;
        const mockUser = {
          id: user.nomor_induk,
          email: user.email,
          nomor_induk: user.nomor_induk,
          full_name: user.name,
          role: user.role
        };

        // Save to localStorage
        setAuthToken(mockToken);
        setCurrentUser(mockUser);

        // Redirect based on role
        if (user.role === "admin" || user.role === "petugas") {
          router.push("/admin/dashboard_admin");
        } else {
          router.push("/user/dashboard");
        }
      } else {
        // Allow any credentials in mock mode (fallback)
        const mockToken = `mock-token-${Date.now()}`;
        const mockUser = {
          id: "DEMO001",
          email: identifier || "demo@pokada.com",
          nomor_induk: identifier || "DEMO001",
          full_name: "Demo User",
          role: "admin" // Default to admin for demo
        };

        setAuthToken(mockToken);
        setCurrentUser(mockUser);
        router.push("/admin/dashboard_admin");
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Terjadi kesalahan saat masuk sistem.";
      setErrorMessage(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 p-8 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            SARPRAS POKADA
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Silakan masuk menggunakan Email atau Nomor Induk
          </p>
        </div>

        {/* Demo Credentials Info */}
        <div className="p-3 text-xs bg-blue-50 border border-blue-200 rounded-lg dark:bg-blue-950/40 dark:border-blue-900">
          <p className="font-semibold text-blue-900 dark:text-blue-300 mb-1">🎭 Mode Demo (Mock Data)</p>
          <p className="text-blue-700 dark:text-blue-400">
            <strong>Admin:</strong> admin@pokada.com / ADM001 / admin123
          </p>
          <p className="text-blue-700 dark:text-blue-400 mt-0.5">
            <strong>User:</strong> user@pokada.com / USR001 / user123
          </p>
          <p className="text-blue-600 dark:text-blue-500 mt-1 italic">
            Atau gunakan kredensial apapun untuk login
          </p>
        </div>

        {errorMessage && (
          <div className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg dark:bg-red-950/40 dark:border-red-900 dark:text-red-400">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email atau Nomor Induk
            </label>
            <input
              type="text"
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="Email@gmail.com atau Nomor Induk"
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Masukkan password Anda"
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 text-sm font-semibold rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Memproses..." : "Masuk"}
          </button>
        </form>

        <div className="text-center text-sm text-gray-500 dark:text-gray-400">
          Belum memiliki akun?{" "}
          <Link
            href="/auth/register"
            className="font-medium text-blue-600 hover:text-blue-500 underline"
          >
            Daftar Sekarang
          </Link>
        </div>
      </div>
    </div>
  );
}
