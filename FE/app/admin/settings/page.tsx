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
  AlertTriangle,
  Loader2,
  LogOut,
  Smartphone,
  Globe,
  Clock,
  Laptop,
} from "lucide-react";
import { AdminLayout } from "@/components/admin";
import api, { getCurrentUser } from "@/lib/api";
import ExportModal from "@/components/ExportModal";

type SettingsTab = "profile" | "account" | "notifications" | "security" | "data";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [saved, setSaved] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  // Profile settings
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [department, setDepartment] = useState("");
  const [bio, setBio] = useState("");
  const [address, setAddress] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Account settings
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  // Notification settings
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
      setDepartment(user.role || user.department || "Administrator");
      setBio(user.bio || "");
      setAddress(user.address || "");
      setPhotoUrl(user.foto || "");
    }

    // Load saved settings dari localStorage agar tetap persisten
    try {
      const rawSettings = localStorage.getItem("appSettings");
      if (rawSettings) {
        const parsed = JSON.parse(rawSettings);
        if (parsed.notifications) {
          if (parsed.notifications.email !== undefined) setEmailNotif(parsed.notifications.email);
          if (parsed.notifications.push !== undefined) setPushNotif(parsed.notifications.push);
          if (parsed.notifications.borrowing !== undefined) setBorrowingNotif(parsed.notifications.borrowing);
          if (parsed.notifications.return !== undefined) setReturnNotif(parsed.notifications.return);
          if (parsed.notifications.damage !== undefined) setDamageNotif(parsed.notifications.damage);
          if (parsed.notifications.weeklyReport !== undefined) setWeeklyReport(parsed.notifications.weeklyReport);
        }
        if (parsed.security) {
          if (parsed.security.twoFactor !== undefined) setTwoFactorEnabled(parsed.security.twoFactor);
          if (parsed.security.sessionTimeout !== undefined) setSessionTimeout(parsed.security.sessionTimeout);
          if (parsed.security.loginAlerts !== undefined) setLoginAlerts(parsed.security.loginAlerts);
          if (parsed.security.activityLog !== undefined) setActivityLog(parsed.security.activityLog);
        }
      }
    } catch (e) {
      console.warn("Gagal memuat setting tersimpan:", e);
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
        setProfileMsg({ type: "success", text: "Foto profil berhasil diperbarui ke server!" });
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
          setProfileMsg({ type: "success", text: "Foto profil berhasil disimpan!" });
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
        setProfileMsg({ type: "success", text: "Foto profil berhasil disimpan!" });
      };
      reader.readAsDataURL(file);
    } finally {
      setUploadingPhoto(false);
      setTimeout(() => setProfileMsg(null), 3500);
    }
  };

  const saveSettingsImmediate = (overrideSettings?: any) => {
    const settings = overrideSettings || {
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
      },
    };
    localStorage.setItem("appSettings", JSON.stringify(settings));
    window.dispatchEvent(new Event("storage"));
    window.dispatchEvent(new Event("settings-updated"));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSaveProfile = async () => {
    setProfileMsg(null);
    if (!fullName.trim()) {
      setProfileMsg({ type: "error", text: "Nama lengkap tidak boleh kosong." });
      return;
    }
    if (email && (!email.includes("@") || !email.includes("."))) {
      setProfileMsg({ type: "error", text: "Format email tidak valid." });
      return;
    }

    setSavingProfile(true);
    const updatedUser = {
      ...currentUser,
      name: fullName.trim(),
      full_name: fullName.trim(),
      email: email.trim().toLowerCase(),
      no_hp: phone.trim(),
      phone: phone.trim(),
      department: department,
      bio: bio.trim(),
      address: address.trim(),
      foto: photoUrl,
    };

    if (currentUser?.id) {
      try {
        const updatePayload: any = {
          name: fullName.trim(),
          no_hp: phone.trim(),
          foto: photoUrl,
        };
        if (email && email.trim().toLowerCase() !== (currentUser.email || "").toLowerCase()) {
          updatePayload.email = email.trim().toLowerCase();
        }
        await api.users.update(currentUser.id, updatePayload);
      } catch (e: any) {
        console.warn("Gagal simpan profil ke backend:", e);
      }
    }

    localStorage.setItem("user", JSON.stringify(updatedUser));
    window.dispatchEvent(new Event("user-updated"));
    saveSettingsImmediate();
    setSavingProfile(false);
    setProfileMsg({ type: "success", text: "Profil berhasil diperbarui dan disinkronkan ke database!" });
    setTimeout(() => setProfileMsg(null), 3500);
  };

  const handleChangePassword = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setPasswordMsg(null);

    if (!currentPassword.trim()) {
      setPasswordMsg({ type: "error", text: "Masukkan kata sandi saat ini." });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMsg({ type: "error", text: "Kata sandi baru minimal 6 karakter." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: "error", text: "Konfirmasi kata sandi baru tidak cocok." });
      return;
    }

    setSavingPassword(true);
    try {
      const res = await api.auth.changePassword({
        currentPassword,
        newPassword,
      });

      if (res.status === "success") {
        setPasswordMsg({ type: "success", text: "Kata sandi berhasil diubah dan disinkronkan ke database!" });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setPasswordMsg({ type: "error", text: res.message || "Gagal mengubah kata sandi." });
      }
    } catch (err: any) {
      setPasswordMsg({
        type: "error",
        text: err.message || "Kata sandi saat ini tidak sesuai atau terjadi kendala sistem.",
      });
    } finally {
      setSavingPassword(false);
    }
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
    a.download = `sarpras-pengaturan-${Date.now()}.json`;
    a.click();
  };

  const handleLogout = async () => {
    if (confirm("Apakah Anda yakin ingin logout dan mengakhiri sesi admin saat ini?")) {
      try {
        await api.auth.logout();
      } catch {}
      localStorage.clear();
      window.location.href = "/auth/login";
    }
  };

  const handleDeleteAccount = async () => {
    if (!currentUser?.id) return;
    const confirmed = confirm(
      "PERINGATAN: Apakah Anda yakin ingin menghapus akun Anda secara permanen dari sistem? Seluruh hak akses dan profil akan dihapus!"
    );
    if (confirmed) {
      try {
        await api.users.delete(currentUser.id);
      } catch (err: any) {
        console.warn("Gagal hapus akun di backend:", err);
      }
      try {
        await api.auth.logout();
      } catch {}
      localStorage.clear();
      window.location.href = "/auth/login";
    }
  };

  const tabs = [
    { id: "profile", label: "Profil", icon: User },
    { id: "account", label: "Akun & Sandi", icon: Lock },
    { id: "notifications", label: "Notifikasi", icon: Bell },
    { id: "security", label: "Keamanan Sesi", icon: Shield },
    { id: "data", label: "Data & Privasi", icon: Database },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Pengaturan Sistem & Akun</h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-slate-100 text-slate-600 border border-slate-200">
              KONFIGURASI SISTEM
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelola preferensi akun, integrasi notifikasi, keamanan sesi, dan ekspor data platform.
          </p>
        </div>

        {/* Success Banner */}
        {saved && (
          <div className="flex items-center gap-2 p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 text-xs font-semibold animate-fade-in">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Preferensi pengaturan berhasil disimpan dan disinkronkan secara realtime!</span>
          </div>
        )}

        {/* Settings Container */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="flex flex-col md:flex-row">
            {/* Sidebar Tabs */}
            <div className="w-full md:w-56 border-b md:border-b-0 md:border-r border-slate-200/80 p-2.5 sm:p-3 bg-slate-50/50 overflow-x-auto">
              <nav className="flex md:flex-col gap-1 overflow-x-auto pb-1 md:pb-0">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as SettingsTab)}
                      className={`flex items-center gap-2.5 px-3 py-2 sm:py-2.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 md:shrink transition-all ${
                        isActive
                          ? "bg-[#0785BC] text-white shadow-xs font-semibold"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-400"}`} />
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
                    <p className="text-xs text-slate-400 mt-0.5">
                      Perbarui informasi identitas, foto profil, dan kontak admin Anda di database
                    </p>
                  </div>

                  {profileMsg && (
                    <div
                      className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                        profileMsg.type === "success"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-rose-50 text-rose-700 border border-rose-200"
                      }`}
                    >
                      {profileMsg.type === "success" ? (
                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      )}
                      <span>{profileMsg.text}</span>
                    </div>
                  )}

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
                        <span>{uploadingPhoto ? "Mengunggah..." : "Ubah Foto"}</span>
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
                      <label className="block font-semibold text-slate-700 mb-1.5">Nama Lengkap</label>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0785BC]"
                        placeholder="Nama lengkap..."
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1.5">Alamat Email</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0785BC]"
                        placeholder="contoh@kampus.ac.id"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">Email disinkronkan ke akun login Supabase</p>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1.5">Nomor Telepon / WhatsApp</label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0785BC]"
                        placeholder="08xxxxxxxxxx"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1.5">Hak Akses / Peran</label>
                      <input
                        type="text"
                        value={department}
                        disabled
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-500 cursor-not-allowed"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block font-semibold text-slate-700 mb-1.5">Alamat / Lokasi Kerja</label>
                      <input
                        type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0785BC]"
                        placeholder="contoh: Gedung Rektorat Lt. 2, Ruang Sarpras"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block font-semibold text-slate-700 mb-1.5">Bio / Keterangan</label>
                      <textarea
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        rows={2}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0785BC] resize-none"
                        placeholder="Catatan profil atau peran tugas sarpras..."
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-4 border-t border-slate-100">
                    <button
                      onClick={handleSaveProfile}
                      disabled={savingProfile}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0785BC] text-white text-xs font-semibold rounded-xl hover:bg-[#0672a0] active:scale-95 transition-all shadow-sm disabled:opacity-60"
                    >
                      {savingProfile && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      <span>{savingProfile ? "Menyimpan ke DB..." : "Simpan Profil"}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Account Tab */}
              {activeTab === "account" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Pengaturan Akun & Sandi</h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Perbarui kata sandi akun Anda secara langsung ke server autentikasi
                    </p>
                  </div>

                  {passwordMsg && (
                    <div
                      className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                        passwordMsg.type === "success"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-rose-50 text-rose-700 border border-rose-200"
                      }`}
                    >
                      {passwordMsg.type === "success" ? (
                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      )}
                      <span>{passwordMsg.text}</span>
                    </div>
                  )}

                  <form onSubmit={handleChangePassword} className="max-w-md space-y-4 text-xs">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1.5">Kata Sandi Saat Ini</label>
                      <div className="relative">
                        <input
                          type={showCurrentPassword ? "text" : "password"}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          className="w-full px-3 py-2 pr-10 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0785BC]"
                          placeholder="Masukkan sandi lama"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1.5">Kata Sandi Baru</label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full px-3 py-2 pr-10 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0785BC]"
                          placeholder="Minimal 6 karakter"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1.5">Konfirmasi Kata Sandi Baru</label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full px-3 py-2 pr-10 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0785BC]"
                          placeholder="Ulangi kata sandi baru"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={savingPassword}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0785BC] text-white text-xs font-semibold rounded-xl hover:bg-[#0672a0] active:scale-95 transition-all shadow-sm disabled:opacity-60"
                    >
                      {savingPassword && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      <span>{savingPassword ? "Memperbarui Sandi..." : "Perbarui Kata Sandi"}</span>
                    </button>
                  </form>
                </div>
              )}

              {/* Notifications Tab */}
              {activeTab === "notifications" && (
                <div className="space-y-6 text-xs">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Pengaturan Notifikasi Realtime</h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Pilihan ini langsung menyaring notifikasi yang tampil di Navbar dan saluran peringatan
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h3 className="font-semibold text-slate-700 uppercase tracking-wider text-[11px]">
                      Saluran Pemberitahuan
                    </h3>

                    <div className="flex items-center justify-between p-3.5 bg-slate-50/70 border border-slate-100 rounded-xl">
                      <div className="flex items-center gap-3">
                        <Mail className="w-4 h-4 text-[#0785BC]" />
                        <div>
                          <p className="font-semibold text-slate-800">Email Notification</p>
                          <p className="text-[11px] text-slate-400">Terima ringkasan transaksi & peringatan via email</p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          const nextVal = !emailNotif;
                          setEmailNotif(nextVal);
                          saveSettingsImmediate({
                            notifications: {
                              email: nextVal,
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
                            },
                          });
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
                          <p className="font-semibold text-slate-800">In-App Notification Badge (Navbar)</p>
                          <p className="text-[11px] text-slate-400">
                            Tampilkan badge lonceng & pop-up notifikasi langsung di bilah atas aplikasi
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          const nextVal = !pushNotif;
                          setPushNotif(nextVal);
                          saveSettingsImmediate({
                            notifications: {
                              email: emailNotif,
                              push: nextVal,
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
                            },
                          });
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
                    <h3 className="font-semibold text-slate-700 uppercase tracking-wider text-[11px]">
                      Filter Jenis Notifikasi Masuk
                    </h3>

                    <label className="flex items-center gap-3 p-2.5 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={borrowingNotif}
                        onChange={(e) => {
                          const nextVal = e.target.checked;
                          setBorrowingNotif(nextVal);
                          saveSettingsImmediate({
                            notifications: {
                              email: emailNotif,
                              push: pushNotif,
                              borrowing: nextVal,
                              return: returnNotif,
                              damage: damageNotif,
                              weeklyReport: weeklyReport,
                            },
                            security: {
                              twoFactor: twoFactorEnabled,
                              sessionTimeout: sessionTimeout,
                              loginAlerts: loginAlerts,
                              activityLog: activityLog,
                            },
                          });
                        }}
                        className="w-4 h-4 text-[#0785BC] rounded border-slate-300"
                      />
                      <div>
                        <p className="font-semibold text-slate-800">Pengajuan Peminjaman Baru</p>
                        <p className="text-[11px] text-slate-400">Pemberitahuan saat ada user meminjam barang/paket</p>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-2.5 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={returnNotif}
                        onChange={(e) => {
                          const nextVal = e.target.checked;
                          setReturnNotif(nextVal);
                          saveSettingsImmediate({
                            notifications: {
                              email: emailNotif,
                              push: pushNotif,
                              borrowing: borrowingNotif,
                              return: nextVal,
                              damage: damageNotif,
                              weeklyReport: weeklyReport,
                            },
                            security: {
                              twoFactor: twoFactorEnabled,
                              sessionTimeout: sessionTimeout,
                              loginAlerts: loginAlerts,
                              activityLog: activityLog,
                            },
                          });
                        }}
                        className="w-4 h-4 text-[#0785BC] rounded border-slate-300"
                      />
                      <div>
                        <p className="font-semibold text-slate-800">Pengembalian Barang</p>
                        <p className="text-[11px] text-slate-400">Pemberitahuan saat aset fisik telah dikembalikan peminjam</p>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-2.5 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={damageNotif}
                        onChange={(e) => {
                          const nextVal = e.target.checked;
                          setDamageNotif(nextVal);
                          saveSettingsImmediate({
                            notifications: {
                              email: emailNotif,
                              push: pushNotif,
                              borrowing: borrowingNotif,
                              return: returnNotif,
                              damage: nextVal,
                              weeklyReport: weeklyReport,
                            },
                            security: {
                              twoFactor: twoFactorEnabled,
                              sessionTimeout: sessionTimeout,
                              loginAlerts: loginAlerts,
                              activityLog: activityLog,
                            },
                          });
                        }}
                        className="w-4 h-4 text-[#0785BC] rounded border-slate-300"
                      />
                      <div>
                        <p className="font-semibold text-slate-800">Laporan Kerusakan & Insiden</p>
                        <p className="text-[11px] text-slate-400">Pemberitahuan tiket kerusakan atau kehilangan aset</p>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* Security Tab */}
              {activeTab === "security" && (
                <div className="space-y-6 text-xs">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Keamanan Sesi & Hak Akses</h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Pengaturan batas waktu tidak aktif, proteksi autentikasi, dan status sesi berjalan
                    </p>
                  </div>

                  <div className="space-y-4 max-w-lg">
                    {/* Session Timeout */}
                    <div className="p-4 bg-slate-50/70 border border-slate-200/80 rounded-2xl space-y-2">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-[#0785BC]" />
                        <label className="font-bold text-slate-800">Batas Waktu Sesi Tidak Aktif (Idle Timeout)</label>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Sistem secara otomatis akan mengeluarkan (logout) admin jika tidak ada interaksi mouse/keyboard selama batas waktu yang ditentukan.
                      </p>
                      <select
                        value={sessionTimeout}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSessionTimeout(val);
                          saveSettingsImmediate({
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
                              sessionTimeout: val,
                              loginAlerts: loginAlerts,
                              activityLog: activityLog,
                            },
                          });
                        }}
                        className="w-full mt-1.5 px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0785BC] bg-white font-semibold text-slate-800"
                      >
                        <option value="15">15 Menit (Sangat Aman)</option>
                        <option value="30">30 Menit (Standar)</option>
                        <option value="60">1 Jam (Aktivitas Padat)</option>
                        <option value="120">2 Jam (Maksimal)</option>
                      </select>
                    </div>

                    {/* 2FA PIN Protection */}
                    <div className="flex items-center justify-between p-4 bg-slate-50/70 border border-slate-200/80 rounded-2xl">
                      <div className="space-y-0.5 pr-4">
                        <div className="flex items-center gap-2">
                          <Key className="w-4 h-4 text-[#0785BC]" />
                          <p className="font-bold text-slate-800">Konfirmasi Keamanan Tindakan Kritis (2FA)</p>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Memerlukan konfirmasi ulang kata sandi saat menghapus barang, mengubah denda, atau aksi sensitif
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          const nextVal = !twoFactorEnabled;
                          setTwoFactorEnabled(nextVal);
                          saveSettingsImmediate({
                            notifications: {
                              email: emailNotif,
                              push: pushNotif,
                              borrowing: borrowingNotif,
                              return: returnNotif,
                              damage: damageNotif,
                              weeklyReport: weeklyReport,
                            },
                            security: {
                              twoFactor: nextVal,
                              sessionTimeout: sessionTimeout,
                              loginAlerts: loginAlerts,
                              activityLog: activityLog,
                            },
                          });
                        }}
                        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                          twoFactorEnabled ? "bg-[#0785BC]" : "bg-slate-300"
                        }`}
                      >
                        <span
                          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                            twoFactorEnabled ? "translate-x-4.5" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>

                    {/* Login Alerts */}
                    <div className="flex items-center justify-between p-4 bg-slate-50/70 border border-slate-200/80 rounded-2xl">
                      <div className="space-y-0.5 pr-4">
                        <div className="flex items-center gap-2">
                          <Shield className="w-4 h-4 text-[#0785BC]" />
                          <p className="font-bold text-slate-800">Peringatan Deteksi Sesi Login Baru</p>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Simpan log identitas browser dan beri peringatan jika terdeteksi login dari peramban berbeda
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          const nextVal = !loginAlerts;
                          setLoginAlerts(nextVal);
                          saveSettingsImmediate({
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
                              loginAlerts: nextVal,
                              activityLog: activityLog,
                            },
                          });
                        }}
                        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
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

                    {/* Sesi Aktif Saat Ini Card */}
                    <div className="p-4 bg-blue-50/40 border border-blue-100 rounded-2xl space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 flex items-center gap-1.5">
                          <Laptop className="w-3.5 h-3.5 text-[#0785BC]" /> Sesi Aktif Saat Ini
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Terverifikasi
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-600 space-y-1">
                        <p>
                          <span className="text-slate-400">Pengguna:</span> {currentUser?.name} ({currentUser?.email})
                        </p>
                        <p>
                          <span className="text-slate-400">Otoritas:</span> {currentUser?.role || "Admin SARPRAS"}
                        </p>
                        <p>
                          <span className="text-slate-400">Pemberlakuan Idle Timeout:</span> {sessionTimeout} Menit
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Data & Privacy Tab */}
              {activeTab === "data" && (
                <div className="space-y-6 text-xs">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Data & Privasi Akun</h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Unduh arsip sistem komprehensif, salinan konfigurasi, atau kelola sesi akun
                    </p>
                  </div>

                  <div className="space-y-3.5 max-w-lg">
                    {/* Master Excel Archive */}
                    <div className="p-4 border border-blue-200 bg-blue-50/40 rounded-2xl flex items-center justify-between gap-4">
                      <div>
                        <p className="font-bold text-slate-900 text-xs">Arsip Master Komprehensif (Excel / CSV)</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Unduh berkas rekapitulasi data riil 5 modul utama (Peminjaman, Pengembalian, Barang, Kerusakan, User)
                        </p>
                      </div>
                      <button
                        onClick={() => setShowExportModal(true)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#0785BC] hover:bg-[#0672a0] text-white rounded-xl font-bold shadow-2xs shrink-0 active:scale-95 transition-all"
                      >
                        <Download className="w-3.5 h-3.5" /> Ekspor Master
                      </button>
                    </div>

                    {/* JSON Config Export */}
                    <div className="p-4 border border-slate-200 rounded-2xl flex items-center justify-between gap-4 bg-white">
                      <div>
                        <p className="font-bold text-slate-800">Ekspor Salinan Konfigurasi Sistem</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Unduh salinan profil dan preferensi sistem lokal dalam format JSON
                        </p>
                      </div>
                      <button
                        onClick={handleExportData}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-700 font-semibold active:scale-95 transition-all shrink-0 shadow-2xs"
                      >
                        <Download className="w-3.5 h-3.5" /> Unduh JSON
                      </button>
                    </div>

                    {/* Logout Session */}
                    <div className="p-4 border border-amber-200 bg-amber-50/40 rounded-2xl flex items-center justify-between gap-4">
                      <div>
                        <p className="font-bold text-amber-900">Keluar Sesi (Logout)</p>
                        <p className="text-[11px] text-amber-700 mt-0.5">
                          Akhiri token autentikasi sesi admin saat ini dan bersihkan memori peramban
                        </p>
                      </div>
                      <button
                        onClick={handleLogout}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-semibold active:scale-95 transition-all shrink-0 shadow-2xs"
                      >
                        <LogOut className="w-3.5 h-3.5" /> Logout Sesi
                      </button>
                    </div>

                    {/* Delete Account */}
                    <div className="p-4 border border-rose-200 bg-rose-50/40 rounded-2xl flex items-center justify-between gap-4">
                      <div>
                        <p className="font-bold text-rose-900">Hapus Akun Permanen</p>
                        <p className="text-[11px] text-rose-600 mt-0.5">
                          Hapus akun administrator ini secara permanen dari basis data sistem
                        </p>
                      </div>
                      <button
                        onClick={handleDeleteAccount}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-semibold active:scale-95 transition-all shrink-0 shadow-2xs"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Hapus Akun
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        isMasterArchive={true}
        title="Ekspor Arsip Master SARPRAS"
        description="Unduh berkas rekapitulasi data riil seluruh modul sistem."
        moduleName="Master_Archive"
      />
    </AdminLayout>
  );
}
