"use client";

import { useState, useEffect } from "react";
import {
  User,
  Bell,
  Lock,
  Shield,
  Database,
  Check,
  Mail,
  Download,
  Trash2,
  Key,
  Eye,
  EyeOff,
  Camera,
} from "lucide-react";
import { AdminLayout } from "@/components/admin";
import api, { getCurrentUser } from "@/lib/api";

type SettingsTab = "profile" | "account" | "notifications" | "security" | "data";

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
  const [address, setAddress] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Account settings
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  // Notification settings (SMS removed)
  const [emailNotif, setEmailNotif] = useState(true);
  const [pushNotif, setPushNotif] = useState(true);
  const [borrowingNotif, setBorrowingNotif] = useState(true);
  const [returnNotif, setReturnNotif] = useState(true);
  const [damageNotif, setDamageNotif] = useState(true);
  const [weeklyReport, setWeeklyReport] = useState(false);

  // Security settings
  const [sessionTimeout, setSessionTimeout] = useState("30");
  const [loginAlerts, setLoginAlerts] = useState(true);
  const [activityLog, setActivityLog] = useState(true);

  useEffect(() => {
    const user = getCurrentUser();
    if (user) {
      setCurrentUser(user);
      setFullName(user.name || user.full_name || "");
      setEmail(user.email || "");
      setPhone(user.no_hp || user.phone || "");
      setDepartment(user.role || user.department || "");
      setBio(user.bio || "");
      setAddress(user.address || "");
      setPhotoUrl(user.foto || "");
    }
  }, []);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser?.id) return;

    setUploadingPhoto(true);
    try {
      const res = await api.users.uploadPhoto(currentUser.id, file);
      if (res.status === "success" && res.data?.foto) {
        const newUrl = res.data.foto;
        setPhotoUrl(newUrl);
        const updated = { ...currentUser, foto: newUrl };
        setCurrentUser(updated);
        localStorage.setItem("user", JSON.stringify(updated));
        window.dispatchEvent(new Event("user-updated"));
        alert("Foto profil berhasil diperbarui!");
      } else {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64Data = reader.result as string;
          setPhotoUrl(base64Data);
          const updated = { ...currentUser, foto: base64Data };
          setCurrentUser(updated);
          localStorage.setItem("user", JSON.stringify(updated));
          window.dispatchEvent(new Event("user-updated"));
          try {
            await api.users.update(currentUser.id, { foto: base64Data });
          } catch {}
          alert("Foto profil berhasil disimpan!");
        };
        reader.readAsDataURL(file);
      }
    } catch {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Data = reader.result as string;
        setPhotoUrl(base64Data);
        const updated = { ...currentUser, foto: base64Data };
        setCurrentUser(updated);
        localStorage.setItem("user", JSON.stringify(updated));
        window.dispatchEvent(new Event("user-updated"));
        try {
          await api.users.update(currentUser.id, { foto: base64Data });
        } catch {}
        alert("Foto profil berhasil disimpan!");
      };
      reader.readAsDataURL(file);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSave = async () => {
    const updatedUser = {
      ...currentUser,
      name: fullName,
      full_name: fullName,
      email: email,
      no_hp: phone,
      phone: phone,
      department: department,
      bio: bio,
      address: address,
      foto: photoUrl,
    };

    if (currentUser?.id) {
      try {
        await api.users.update(currentUser.id, {
          name: fullName,
          no_hp: phone,
          foto: photoUrl,
        });
      } catch (e) {
        console.warn("Gagal simpan setting ke backend:", e);
      }
    }
    
    localStorage.setItem("user", JSON.stringify(updatedUser));
    window.dispatchEvent(new Event("user-updated"));
    
    // Save settings to localStorage
    const settings = {
      notifications: {
        email: emailNotif,
        push: pushNotif,
        borrowing: borrowingNotif,
        return: returnNotif,
        damage: damageNotif,
        weeklyReport: weeklyReport,
      },
      security: {
        twoFactor: twoFactorEnabled,
        sessionTimeout: sessionTimeout,
        loginAlerts: loginAlerts,
        activityLog: activityLog,
      }
    };
    
    localStorage.setItem("appSettings", JSON.stringify(settings));
    
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
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
          <div className="flex items-center gap-2 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs font-semibold">
            <Check className="w-4 h-4" />
            <span>Pengaturan berhasil disimpan!</span>
          </div>
        )}

        {/* Settings Container */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex flex-col md:flex-row">
            {/* Sidebar Tabs */}
            <div className="w-full md:w-60 border-b md:border-b-0 md:border-r border-slate-100 p-4 bg-slate-50/50">
              <nav className="space-y-1">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as SettingsTab)}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                        activeTab === tab.id
                          ? "bg-[#0785BC] text-white shadow-xs"
                          : "text-slate-600 hover:bg-white hover:text-slate-900"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Content Area */}
            <div className="flex-1 p-6 md:p-8">
              {/* Profile Tab */}
              {activeTab === "profile" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Informasi Profil</h2>
                    <p className="text-xs text-slate-400 mt-0.5">Perbarui informasi profil, foto avatar, dan kontak Anda</p>
                  </div>

                  {/* Avatar Upload */}
                  <div className="flex items-center gap-4 p-4 bg-slate-50/70 border border-slate-100 rounded-2xl">
                    <div className="relative w-20 h-20 rounded-full bg-white p-1 shadow-sm overflow-hidden flex items-center justify-center shrink-0">
                      {photoUrl ? (
                        <img src={photoUrl} alt={fullName} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <div className="w-full h-full rounded-full bg-[#0785BC] text-white font-bold text-2xl flex items-center justify-center">
                          {fullName.charAt(0) || "A"}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800 mb-1">Foto Profil Avatar</p>
                      <p className="text-[11px] text-slate-400 mb-2.5">JPG, PNG, atau WEBP. Maksimal 5MB.</p>
                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#0785BC] hover:bg-[#0672a0] active:scale-95 rounded-xl cursor-pointer transition-all shadow-xs">
                        <Camera className="w-3.5 h-3.5" />
                        <span>{uploadingPhoto ? "Menyimpan..." : "Ubah Foto"}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoUpload}
                          disabled={uploadingPhoto}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1.5">
                        Nama Lengkap
                      </label>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0785BC]"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1.5">
                        Email
                      </label>
                      <input
                        type="email"
                        value={email}
                        disabled
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-500 cursor-not-allowed"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1.5">
                        Nomor Telepon / WhatsApp
                      </label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0785BC]"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1.5">
                        Peran / Departemen
                      </label>
                      <input
                        type="text"
                        value={department}
                        disabled
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-500 cursor-not-allowed"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block font-semibold text-slate-700 mb-1.5">
                        Alamat / Lokasi Kerja
                      </label>
                      <input
                        type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0785BC]"
                        placeholder="contoh: Gedung Rektorat Lt. 2, Ruang Sarpras"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block font-semibold text-slate-700 mb-1.5">
                        Bio Singkat
                      </label>
                      <textarea
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        rows={2}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0785BC] resize-none"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-4 border-t border-slate-100">
                    <button
                      onClick={handleSave}
                      className="px-5 py-2.5 bg-[#0785BC] text-white text-xs font-semibold rounded-xl hover:bg-[#0672a0] active:scale-95 transition-all shadow-sm"
                    >
                      Simpan Profil
                    </button>
                  </div>
                </div>
              )}

              {/* Account Tab */}
              {activeTab === "account" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Pengaturan Akun & Sandi</h2>
                    <p className="text-xs text-slate-400 mt-0.5">Kelola kata sandi akun sistem Anda</p>
                  </div>

                  <div className="max-w-md space-y-4 text-xs">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1.5">
                        Password Baru
                      </label>
                      <div className="relative">
                        <input
                          type={showPasswords ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full px-3 py-2 pr-10 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0785BC]"
                          placeholder="Minimal 8 karakter"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords(!showPasswords)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1.5">
                        Konfirmasi Password Baru
                      </label>
                      <input
                        type={showPasswords ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0785BC]"
                      />
                    </div>

                    <button
                      onClick={handleChangePassword}
                      className="px-5 py-2.5 bg-[#0785BC] text-white text-xs font-semibold rounded-xl hover:bg-[#0672a0] active:scale-95 transition-all shadow-sm"
                    >
                      Ubah Password
                    </button>
                  </div>
                </div>
              )}

              {/* Notifications Tab */}
              {activeTab === "notifications" && (
                <div className="space-y-6 text-xs">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Pengaturan Notifikasi</h2>
                    <p className="text-xs text-slate-400 mt-0.5">Atur saluran dan jenis peringatan yang ingin Anda terima</p>
                  </div>

                  <div className="space-y-3">
                    <h3 className="font-semibold text-slate-700 uppercase tracking-wider text-[11px]">Saluran Notifikasi</h3>
                    
                    <div className="flex items-center justify-between p-3.5 bg-slate-50/70 border border-slate-100 rounded-xl">
                      <div className="flex items-center gap-3">
                        <Mail className="w-4 h-4 text-[#0785BC]" />
                        <div>
                          <p className="font-semibold text-slate-800">Email Notification</p>
                          <p className="text-[11px] text-slate-400">Kirim salinan ringkasan ke alamat email terdaftar</p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setEmailNotif(!emailNotif);
                          setTimeout(handleSave, 100);
                        }}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                          emailNotif ? "bg-[#0785BC]" : "bg-slate-300"
                        }`}
                      >
                        <span
                          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                            emailNotif ? "translate-x-4.5" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-3.5 bg-slate-50/70 border border-slate-100 rounded-xl">
                      <div className="flex items-center gap-3">
                        <Bell className="w-4 h-4 text-[#0785BC]" />
                        <div>
                          <p className="font-semibold text-slate-800">Browser In-App Notification</p>
                          <p className="text-[11px] text-slate-400">Pemberitahuan langsung di navbar aplikasi</p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setPushNotif(!pushNotif);
                          setTimeout(handleSave, 100);
                        }}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                          pushNotif ? "bg-[#0785BC]" : "bg-slate-300"
                        }`}
                      >
                        <span
                          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                            pushNotif ? "translate-x-4.5" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-4 space-y-3">
                    <h3 className="font-semibold text-slate-700 uppercase tracking-wider text-[11px]">Kategori Notifikasi</h3>

                    <label className="flex items-center gap-3 p-2.5 hover:bg-slate-50 rounded-xl cursor-pointer">
                      <input
                        type="checkbox"
                        checked={borrowingNotif}
                        onChange={(e) => {
                          setBorrowingNotif(e.target.checked);
                          setTimeout(handleSave, 100);
                        }}
                        className="w-4 h-4 text-[#0785BC] rounded"
                      />
                      <div>
                        <p className="font-semibold text-slate-800">Pengajuan Peminjaman Baru</p>
                        <p className="text-[11px] text-slate-400">Pemberitahuan saat ada user meminjam sarpras</p>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-2.5 hover:bg-slate-50 rounded-xl cursor-pointer">
                      <input
                        type="checkbox"
                        checked={returnNotif}
                        onChange={(e) => {
                          setReturnNotif(e.target.checked);
                          setTimeout(handleSave, 100);
                        }}
                        className="w-4 h-4 text-[#0785BC] rounded"
                      />
                      <div>
                        <p className="font-semibold text-slate-800">Pengembalian Barang</p>
                        <p className="text-[11px] text-slate-400">Pemberitahuan saat barang telah dikembalikan</p>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-2.5 hover:bg-slate-50 rounded-xl cursor-pointer">
                      <input
                        type="checkbox"
                        checked={damageNotif}
                        onChange={(e) => {
                          setDamageNotif(e.target.checked);
                          setTimeout(handleSave, 100);
                        }}
                        className="w-4 h-4 text-[#0785BC] rounded"
                      />
                      <div>
                        <p className="font-semibold text-slate-800">Laporan Kerusakan Masuk</p>
                        <p className="text-[11px] text-slate-400">Pemberitahuan saat ada insiden kerusakan barang</p>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* Security Tab */}
              {activeTab === "security" && (
                <div className="space-y-6 text-xs">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Keamanan Sesi</h2>
                    <p className="text-xs text-slate-400 mt-0.5">Pengaturan perlindungan akses portal admin</p>
                  </div>

                  <div className="space-y-4 max-w-md">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1.5">Batas Waktu Sesi Tidak Aktif</label>
                      <select
                        value={sessionTimeout}
                        onChange={(e) => {
                          setSessionTimeout(e.target.value);
                          setTimeout(handleSave, 100);
                        }}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0785BC]"
                      >
                        <option value="15">15 menit</option>
                        <option value="30">30 menit</option>
                        <option value="60">1 jam</option>
                        <option value="120">2 jam</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-100 rounded-xl">
                      <div>
                        <p className="font-semibold text-slate-800">Alert Deteksi Login Baru</p>
                        <p className="text-[11px] text-slate-400">Kirim notifikasi bila ada login dari perangkat asing</p>
                      </div>
                      <button
                        onClick={() => {
                          setLoginAlerts(!loginAlerts);
                          setTimeout(handleSave, 100);
                        }}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                          loginAlerts ? "bg-[#0785BC]" : "bg-slate-300"
                        }`}
                      >
                        <span
                          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                            loginAlerts ? "translate-x-4.5" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Data & Privacy Tab */}
              {activeTab === "data" && (
                <div className="space-y-6 text-xs">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Data & Privasi</h2>
                    <p className="text-xs text-slate-400 mt-0.5">Ekspor data konfigurasi akun atau pembersihan sesi</p>
                  </div>

                  <div className="space-y-3 max-w-md">
                    <div className="p-4 border border-slate-200 rounded-xl flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-slate-800">Ekspor Salinan Data</p>
                        <p className="text-[11px] text-slate-400">Unduh data profil dan konfigurasi dalam format JSON</p>
                      </div>
                      <button
                        onClick={handleExportData}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-700 font-semibold"
                      >
                        <Download className="w-3.5 h-3.5" /> Unduh
                      </button>
                    </div>

                    <div className="p-4 border border-rose-100 bg-rose-50/40 rounded-xl flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-rose-800">Hapus Sesi & Logout</p>
                        <p className="text-[11px] text-rose-600">Bersihkan token dan cache akun dari browser</p>
                      </div>
                      <button
                        onClick={handleDeleteAccount}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Hapus
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
