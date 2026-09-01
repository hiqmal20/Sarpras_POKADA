"use client";

import { useState, useEffect } from "react";
import {
  User,
  Bell,
  Lock,
  Palette,
  Globe,
  Shield,
  Database,
  Moon,
  Sun,
  Check,
  Mail,
  Smartphone,
  MessageSquare,
  Download,
  Trash2,
  Key,
  Eye,
  EyeOff,
} from "lucide-react";
import { AdminLayout } from "@/components/admin";
import { getCurrentUser } from "@/lib/api";

type SettingsTab = "profile" | "account" | "notifications" | "appearance" | "security" | "data";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [saved, setSaved] = useState(false);
  
  // Profile settings
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [department, setDepartment] = useState("");
  const [bio, setBio] = useState("");
  
  // Account settings
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  
  // Notification settings
  const [emailNotif, setEmailNotif] = useState(true);
  const [pushNotif, setPushNotif] = useState(true);
  const [smsNotif, setSmsNotif] = useState(false);
  const [borrowingNotif, setBorrowingNotif] = useState(true);
  const [returnNotif, setReturnNotif] = useState(true);
  const [damageNotif, setDamageNotif] = useState(true);
  const [weeklyReport, setWeeklyReport] = useState(false);
  
  // Appearance settings
  const [theme, setTheme] = useState<"light" | "dark" | "system">("light");
  const [language, setLanguage] = useState("id");
  const [compactMode, setCompactMode] = useState(false);
  const [fontSize, setFontSize] = useState("medium");
  
  // Security settings
  const [sessionTimeout, setSessionTimeout] = useState("30");
  const [loginAlerts, setLoginAlerts] = useState(true);
  const [activityLog, setActivityLog] = useState(true);

  useEffect(() => {
    const user = getCurrentUser();
    if (user) {
      setCurrentUser(user);
      setFullName(user.full_name || "");
      setEmail(user.email || "");
      setDepartment(user.department || "");
    }
  }, []);

  const handleSave = () => {
    // Simulate save to localStorage
    const updatedUser = {
      ...currentUser,
      full_name: fullName,
      email: email,
      phone: phone,
      department: department,
      bio: bio,
    };
    
    localStorage.setItem("user", JSON.stringify(updatedUser));
    
    // Save settings to localStorage
    const settings = {
      notifications: {
        email: emailNotif,
        push: pushNotif,
        sms: smsNotif,
        borrowing: borrowingNotif,
        return: returnNotif,
        damage: damageNotif,
        weeklyReport: weeklyReport,
      },
      appearance: {
        theme: theme,
        language: language,
        compactMode: compactMode,
        fontSize: fontSize,
      },
      security: {
        twoFactor: twoFactorEnabled,
        sessionTimeout: sessionTimeout,
        loginAlerts: loginAlerts,
        activityLog: activityLog,
      }
    };
    
    localStorage.setItem("appSettings", JSON.stringify(settings));
    
    // Show success message
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    
    // Apply theme
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const handleChangePassword = () => {
    if (newPassword !== confirmPassword) {
      alert("Password baru tidak cocok!");
      return;
    }
    if (newPassword.length < 8) {
      alert("Password minimal 8 karakter!");
      return;
    }
    alert("Password berhasil diubah!");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const handleExportData = () => {
    const data = {
      user: currentUser,
      settings: JSON.parse(localStorage.getItem("appSettings") || "{}"),
      exportDate: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pokada-data-${Date.now()}.json`;
    a.click();
  };

  const handleDeleteAccount = () => {
    if (confirm("Apakah Anda yakin ingin menghapus akun? Tindakan ini tidak dapat dibatalkan!")) {
      localStorage.clear();
      window.location.href = "/auth/login";
    }
  };

  const tabs = [
    { id: "profile", label: "Profil", icon: User },
    { id: "account", label: "Akun", icon: Lock },
    { id: "notifications", label: "Notifikasi", icon: Bell },
    { id: "appearance", label: "Tampilan", icon: Palette },
    { id: "security", label: "Keamanan", icon: Shield },
    { id: "data", label: "Data & Privasi", icon: Database },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pengaturan</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Kelola preferensi dan pengaturan akun Anda
          </p>
        </div>

        {/* Success Message */}
        {saved && (
          <div className="flex items-center gap-2 p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700">
            <Check className="w-5 h-5" />
            <span className="font-medium">Pengaturan berhasil disimpan!</span>
          </div>
        )}

        {/* Settings Container */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex">
            {/* Sidebar Tabs */}
            <div className="w-64 border-r border-slate-100 p-4 bg-slate-50/50">
              <nav className="space-y-1">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as SettingsTab)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                        activeTab === tab.id
                          ? "bg-[#0785BC] text-white"
                          : "text-slate-600 hover:bg-white hover:text-slate-900"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      {tab.label}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Content Area */}
            <div className="flex-1 p-8">
              {/* Profile Tab */}
              {activeTab === "profile" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Informasi Profil</h2>
                    <p className="text-sm text-slate-500">Update informasi profil Anda</p>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Nama Lengkap
                      </label>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0785BC]"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0785BC]"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Nomor Telepon
                      </label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+62 812-3456-7890"
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0785BC]"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Status
                      </label>
                      <input
                        type="text"
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        placeholder="Status Anda"
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0785BC]"
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Bio
                      </label>
                      <textarea
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        rows={4}
                        placeholder="Ceritakan sedikit tentang Anda..."
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0785BC]"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleSave}
                    className="px-6 py-2.5 bg-[#0785BC] text-white font-medium rounded-lg hover:bg-[#0672a0] transition-colors"
                  >
                    Simpan Perubahan
                  </button>
                </div>
              )}

              {/* Account Tab */}
              {activeTab === "account" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Pengaturan Akun</h2>
                    <p className="text-sm text-slate-500">Kelola password dan keamanan akun</p>
                  </div>

                  {/* Change Password */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-slate-800">Ubah Password</h3>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Password Saat Ini
                      </label>
                      <div className="relative">
                        <input
                          type={showPasswords ? "text" : "password"}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0785BC] pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords(!showPasswords)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showPasswords ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Password Baru
                      </label>
                      <input
                        type={showPasswords ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0785BC]"
                      />
                      <p className="text-xs text-slate-500 mt-1">Minimal 8 karakter</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Konfirmasi Password Baru
                      </label>
                      <input
                        type={showPasswords ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0785BC]"
                      />
                    </div>

                    <button
                      onClick={handleChangePassword}
                      className="px-6 py-2.5 bg-[#0785BC] text-white font-medium rounded-lg hover:bg-[#0672a0] transition-colors"
                    >
                      Ubah Password
                    </button>
                  </div>

                  <div className="border-t border-slate-200 pt-6">
                    <h3 className="font-semibold text-slate-800 mb-4">Two-Factor Authentication</h3>
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                      <div>
                        <p className="font-medium text-slate-800">Autentikasi Dua Faktor</p>
                        <p className="text-sm text-slate-500">Tambahkan lapisan keamanan ekstra</p>
                      </div>
                      <button
                        onClick={() => {
                          setTwoFactorEnabled(!twoFactorEnabled);
                          handleSave();
                        }}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          twoFactorEnabled ? "bg-[#0785BC]" : "bg-slate-300"
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            twoFactorEnabled ? "translate-x-6" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Notifications Tab */}
              {activeTab === "notifications" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Pengaturan Notifikasi</h2>
                    <p className="text-sm text-slate-500">Kelola preferensi notifikasi Anda</p>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-semibold text-slate-800">Metode Notifikasi</h3>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Mail className="w-5 h-5 text-[#0785BC]" />
                          <div>
                            <p className="font-medium text-slate-800">Email</p>
                            <p className="text-sm text-slate-500">Terima notifikasi via email</p>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setEmailNotif(!emailNotif);
                            setTimeout(handleSave, 100);
                          }}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            emailNotif ? "bg-[#0785BC]" : "bg-slate-300"
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              emailNotif ? "translate-x-6" : "translate-x-1"
                            }`}
                          />
                        </button>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Bell className="w-5 h-5 text-[#0785BC]" />
                          <div>
                            <p className="font-medium text-slate-800">Push Notification</p>
                            <p className="text-sm text-slate-500">Terima notifikasi push di browser</p>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setPushNotif(!pushNotif);
                            setTimeout(handleSave, 100);
                          }}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            pushNotif ? "bg-[#0785BC]" : "bg-slate-300"
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              pushNotif ? "translate-x-6" : "translate-x-1"
                            }`}
                          />
                        </button>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Smartphone className="w-5 h-5 text-[#0785BC]" />
                          <div>
                            <p className="font-medium text-slate-800">SMS</p>
                            <p className="text-sm text-slate-500">Terima notifikasi via SMS</p>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setSmsNotif(!smsNotif);
                            setTimeout(handleSave, 100);
                          }}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            smsNotif ? "bg-[#0785BC]" : "bg-slate-300"
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              smsNotif ? "translate-x-6" : "translate-x-1"
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-200 pt-6 space-y-4">
                    <h3 className="font-semibold text-slate-800">Jenis Notifikasi</h3>
                    
                    <div className="space-y-3">
                      <label className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-lg cursor-pointer">
                        <input
                          type="checkbox"
                          checked={borrowingNotif}
                          onChange={(e) => {
                            setBorrowingNotif(e.target.checked);
                            setTimeout(handleSave, 100);
                          }}
                          className="w-5 h-5 text-[#0785BC] rounded focus:ring-2 focus:ring-[#0785BC]"
                        />
                        <div>
                          <p className="font-medium text-slate-800">Peminjaman Baru</p>
                          <p className="text-sm text-slate-500">Notifikasi saat ada peminjaman baru</p>
                        </div>
                      </label>

                      <label className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-lg cursor-pointer">
                        <input
                          type="checkbox"
                          checked={returnNotif}
                          onChange={(e) => {
                            setReturnNotif(e.target.checked);
                            setTimeout(handleSave, 100);
                          }}
                          className="w-5 h-5 text-[#0785BC] rounded focus:ring-2 focus:ring-[#0785BC]"
                        />
                        <div>
                          <p className="font-medium text-slate-800">Pengembalian</p>
                          <p className="text-sm text-slate-500">Notifikasi saat ada pengembalian</p>
                        </div>
                      </label>

                      <label className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-lg cursor-pointer">
                        <input
                          type="checkbox"
                          checked={damageNotif}
                          onChange={(e) => {
                            setDamageNotif(e.target.checked);
                            setTimeout(handleSave, 100);
                          }}
                          className="w-5 h-5 text-[#0785BC] rounded focus:ring-2 focus:ring-[#0785BC]"
                        />
                        <div>
                          <p className="font-medium text-slate-800">Laporan Kerusakan</p>
                          <p className="text-sm text-slate-500">Notifikasi saat ada laporan kerusakan</p>
                        </div>
                      </label>

                      <label className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-lg cursor-pointer">
                        <input
                          type="checkbox"
                          checked={weeklyReport}
                          onChange={(e) => {
                            setWeeklyReport(e.target.checked);
                            setTimeout(handleSave, 100);
                          }}
                          className="w-5 h-5 text-[#0785BC] rounded focus:ring-2 focus:ring-[#0785BC]"
                        />
                        <div>
                          <p className="font-medium text-slate-800">Laporan Mingguan</p>
                          <p className="text-sm text-slate-500">Terima ringkasan aktivitas setiap minggu</p>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Appearance Tab */}
              {activeTab === "appearance" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Pengaturan Tampilan</h2>
                    <p className="text-sm text-slate-500">Sesuaikan tampilan aplikasi sesuai preferensi Anda</p>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-semibold text-slate-800">Tema</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <button
                        onClick={() => {
                          setTheme("light");
                          setTimeout(handleSave, 100);
                        }}
                        className={`p-4 border-2 rounded-lg text-center transition-all ${
                          theme === "light" ? "border-[#0785BC] bg-blue-50" : "border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <Sun className="w-6 h-6 mx-auto mb-2 text-amber-500" />
                        <p className="font-medium text-slate-800">Terang</p>
                      </button>

                      <button
                        onClick={() => {
                          setTheme("dark");
                          setTimeout(handleSave, 100);
                        }}
                        className={`p-4 border-2 rounded-lg text-center transition-all ${
                          theme === "dark" ? "border-[#0785BC] bg-blue-50" : "border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <Moon className="w-6 h-6 mx-auto mb-2 text-slate-700" />
                        <p className="font-medium text-slate-800">Gelap</p>
                      </button>

                      <button
                        onClick={() => {
                          setTheme("system");
                          setTimeout(handleSave, 100);
                        }}
                        className={`p-4 border-2 rounded-lg text-center transition-all ${
                          theme === "system" ? "border-[#0785BC] bg-blue-50" : "border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <Palette className="w-6 h-6 mx-auto mb-2 text-[#0785BC]" />
                        <p className="font-medium text-slate-800">Sistem</p>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-semibold text-slate-800">Bahasa</h3>
                    <select
                      value={language}
                      onChange={(e) => {
                        setLanguage(e.target.value);
                        setTimeout(handleSave, 100);
                      }}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0785BC]"
                    >
                      <option value="id">Bahasa Indonesia</option>
                      <option value="en">English</option>
                      <option value="jv">Basa Jawa</option>
                    </select>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-semibold text-slate-800">Ukuran Font</h3>
                    <div className="flex items-center gap-4">
                      <input
                        type="range"
                        min="0"
                        max="2"
                        step="1"
                        value={fontSize === "small" ? 0 : fontSize === "medium" ? 1 : 2}
                        onChange={(e) => {
                          const sizes = ["small", "medium", "large"];
                          setFontSize(sizes[parseInt(e.target.value)]);
                          setTimeout(handleSave, 100);
                        }}
                        className="flex-1"
                      />
                      <span className="text-sm font-medium text-slate-700 w-20">
                        {fontSize === "small" ? "Kecil" : fontSize === "medium" ? "Sedang" : "Besar"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                    <div>
                      <p className="font-medium text-slate-800">Mode Kompak</p>
                      <p className="text-sm text-slate-500">Kurangi jarak antar elemen</p>
                    </div>
                    <button
                      onClick={() => {
                        setCompactMode(!compactMode);
                        setTimeout(handleSave, 100);
                      }}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        compactMode ? "bg-[#0785BC]" : "bg-slate-300"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          compactMode ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              )}

              {/* Security Tab */}
              {activeTab === "security" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Pengaturan Keamanan</h2>
                    <p className="text-sm text-slate-500">Kelola keamanan dan privasi akun Anda</p>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-semibold text-slate-800">Session Timeout</h3>
                    <select
                      value={sessionTimeout}
                      onChange={(e) => {
                        setSessionTimeout(e.target.value);
                        setTimeout(handleSave, 100);
                      }}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0785BC]"
                    >
                      <option value="15">15 menit</option>
                      <option value="30">30 menit</option>
                      <option value="60">1 jam</option>
                      <option value="120">2 jam</option>
                      <option value="never">Tidak pernah</option>
                    </select>
                    <p className="text-sm text-slate-500">Logout otomatis setelah tidak aktif</p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                      <div>
                        <p className="font-medium text-slate-800">Notifikasi Login</p>
                        <p className="text-sm text-slate-500">Terima alert saat ada login baru</p>
                      </div>
                      <button
                        onClick={() => {
                          setLoginAlerts(!loginAlerts);
                          setTimeout(handleSave, 100);
                        }}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          loginAlerts ? "bg-[#0785BC]" : "bg-slate-300"
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            loginAlerts ? "translate-x-6" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                      <div>
                        <p className="font-medium text-slate-800">Log Aktivitas</p>
                        <p className="text-sm text-slate-500">Simpan riwayat aktivitas akun</p>
                      </div>
                      <button
                        onClick={() => {
                          setActivityLog(!activityLog);
                          setTimeout(handleSave, 100);
                        }}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          activityLog ? "bg-[#0785BC]" : "bg-slate-300"
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            activityLog ? "translate-x-6" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  <div className="border-t border-slate-200 pt-6">
                    <h3 className="font-semibold text-slate-800 mb-3">Sesi Aktif</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                        <div>
                          <p className="font-medium text-emerald-900">Windows - Chrome</p>
                          <p className="text-sm text-emerald-700">Sesi saat ini • Aktif sekarang</p>
                        </div>
                        <span className="px-2 py-1 text-xs font-semibold text-emerald-700 bg-emerald-100 rounded">
                          Aktif
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Data & Privacy Tab */}
              {activeTab === "data" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Data & Privasi</h2>
                    <p className="text-sm text-slate-500">Kelola data pribadi dan pengaturan privasi</p>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-semibold text-slate-800">Export Data</h3>
                    <div className="p-4 bg-slate-50 rounded-lg">
                      <p className="text-sm text-slate-600 mb-4">
                        Download semua data Anda dalam format JSON
                      </p>
                      <button
                        onClick={handleExportData}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-[#0785BC] text-white font-medium rounded-lg hover:bg-[#0672a0] transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        Export Data
                      </button>
                    </div>
                  </div>

                  <div className="border-t border-slate-200 pt-6 space-y-4">
                    <h3 className="font-semibold text-slate-800">Hapus Akun</h3>
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-900 font-medium mb-2">Danger Zone</p>
                      <p className="text-sm text-red-700 mb-4">
                        Menghapus akun akan menghapus semua data Anda secara permanen. Tindakan ini tidak dapat dibatalkan.
                      </p>
                      <button
                        onClick={handleDeleteAccount}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        Hapus Akun
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
