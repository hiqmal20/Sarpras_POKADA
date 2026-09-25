"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  User,
  Bell,
  Lock,
  Camera,
  Check,
  AlertCircle,
  Eye,
  EyeOff,
  SlidersHorizontal,
  Mail,
  Phone,
  ShieldCheck,
  Save,
} from "lucide-react";
import { UserLayout } from "@/components/user";
import api, { getCurrentUser } from "@/lib/api";
import { useLanguage } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";

type SettingsTab = "profile" | "notifications" | "security" | "preferences";

export default function UserSettingsPage() {
  const { t } = useLanguage();
  return (
    <Suspense fallback={<div className="p-8 text-sm text-slate-500">{t("settings.loading", "Memuat pengaturan...")}</div>}>
      <SettingsContent />
    </Suspense>
  );
}

function SettingsContent() {
  const searchParams = useSearchParams();
  const { t, lang, setLang } = useLanguage();
  const tr = (k: string, fb: string) => {
    const v = t(k, fb);
    return v === k ? fb : v;
  };
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Profile fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [noHp, setNoHp] = useState("");
  const [nomorInduk, setNomorInduk] = useState("");
  const [foto, setFoto] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Password fields
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);

  // Notification toggles
  const [pushNotif, setPushNotif] = useState(true);
  const [borrowingNotif, setBorrowingNotif] = useState(true);
  const [returnNotif, setReturnNotif] = useState(true);
  const [chatNotif, setChatNotif] = useState(true);

  // Preferences
  const [language, setLanguageState] = useState("id");
  const [dateFormat, setDateFormat] = useState("DD/MM/YYYY");
  const setLanguage = (v: string) => {
    setLanguageState(v);
    if (v === "id" || v === "en") setLang(v);
  };

  // State feedback
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam && ["profile", "notifications", "security", "preferences"].includes(tabParam)) {
      setActiveTab(tabParam as SettingsTab);
    }

    const user = getCurrentUser();
    if (user) {
      setCurrentUser(user);
      setName(user.name || user.full_name || "");
      setEmail(user.email || "");
      setNoHp(user.no_hp || user.phone || "");
      setNomorInduk(user.nomor_induk || user.nip_nim || "");
      setFoto(user.foto || "");
    }

    // Load appSettings
    try {
      const savedLang = localStorage.getItem("app-lang");
      if (savedLang === "id" || savedLang === "en") setLanguageState(savedLang);
      else setLanguageState(lang);
      const raw = localStorage.getItem("appSettings");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.notifications) {
          if (parsed.notifications.push !== undefined) setPushNotif(parsed.notifications.push);
          if (parsed.notifications.borrowing !== undefined) setBorrowingNotif(parsed.notifications.borrowing);
          if (parsed.notifications.return !== undefined) setReturnNotif(parsed.notifications.return);
          if (parsed.notifications.chat !== undefined) setChatNotif(parsed.notifications.chat);
        }
        if (parsed.preferences) {
          if (parsed.preferences.language) setLanguage(parsed.preferences.language);
          if (parsed.preferences.dateFormat) setDateFormat(parsed.preferences.dateFormat);
        }
      }
    } catch {}
  }, [searchParams]);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setErrorMsg("");
    setTimeout(() => setSuccessMsg(""), 3500);
  };

  const showError = (msg: string) => {
    setErrorMsg(msg);
    setSuccessMsg("");
    setTimeout(() => setErrorMsg(""), 4500);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      showError(tr("settings.err_photo_size", "Ukuran foto maksimal 2MB."));
      return;
    }

    setUploadingPhoto(true);
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setFoto(base64);
      setUploadingPhoto(false);
    };
    reader.onerror = () => {
      setUploadingPhoto(false);
      showError(tr("settings.err_photo_read", "Gagal membaca file gambar."));
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const payload: any = {
        name,
        email,
        no_hp: noHp,
        nomor_induk: nomorInduk,
        foto,
      };

      const res = await api.auth.updateProfile(payload);
      if (res.status === "success" || res.data) {
        const updatedUser = {
          ...currentUser,
          ...payload,
        };
        localStorage.setItem("user", JSON.stringify(updatedUser));
        setCurrentUser(updatedUser);
        window.dispatchEvent(new Event("user-updated"));
        showSuccess(tr("settings.msg_profile_ok", "Profil berhasil diperbarui!"));
      } else {
        showError(res.message || tr("settings.err_profile_fail", "Gagal memperbarui profil."));
      }
    } catch (err: any) {
      showError(err.message || tr("settings.err_profile_generic", "Terjadi kesalahan saat menyimpan profil."));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotifications = () => {
    try {
      let current = {};
      const raw = localStorage.getItem("appSettings");
      if (raw) current = JSON.parse(raw);

      const updated = {
        ...current,
        notifications: {
          push: pushNotif,
          borrowing: borrowingNotif,
          return: returnNotif,
          chat: chatNotif,
        },
      };

      localStorage.setItem("appSettings", JSON.stringify(updated));
      showSuccess(tr("settings.msg_notif_ok", "Preferensi notifikasi berhasil disimpan!"));
    } catch {
      showError(tr("settings.err_notif_fail", "Gagal menyimpan preferensi notifikasi."));
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      showError(tr("settings.err_pass_required", "Semua bidang kata sandi wajib diisi."));
      return;
    }

    if (newPassword !== confirmPassword) {
      showError(tr("settings.err_pass_mismatch", "Konfirmasi kata sandi baru tidak cocok."));
      return;
    }

    if (newPassword.length < 6) {
      showError(tr("settings.err_pass_short", "Kata sandi baru minimal 6 karakter."));
      return;
    }

    setSaving(true);
    try {
      const res = await api.auth.changePassword({
        currentPassword,
        newPassword,
      });

      if (res.status === "success") {
        showSuccess(tr("settings.msg_pass_ok", "Kata sandi berhasil diubah!"));
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        showError(res.message || tr("settings.err_pass_fail", "Gagal mengubah kata sandi."));
      }
    } catch (err: any) {
      showError(err.message || tr("settings.err_pass_generic", "Gagal memperbarui kata sandi."));
    } finally {
      setSaving(false);
    }
  };

  const handleSavePreferences = () => {
    try {
      setLang(language === "en" ? "en" : "id");
      setTheme(theme);
      let current = {};
      const raw = localStorage.getItem("appSettings");
      if (raw) current = JSON.parse(raw);

      const updated = {
        ...current,
        preferences: {
          language,
          dateFormat,
        },
      };

      localStorage.setItem("appSettings", JSON.stringify(updated));
      showSuccess(tr("settings.msg_pref_ok", "Preferensi tampilan berhasil disimpan!"));
    } catch {
      showError(tr("settings.err_pref_fail", "Gagal menyimpan preferensi."));
    }
  };

  const tabs = [
    { id: "profile" as SettingsTab, label: tr("settings.tab_profile", "Profil Akun"), icon: User },
    { id: "notifications" as SettingsTab, label: tr("settings.tab_notif", "Notifikasi"), icon: Bell },
    { id: "security" as SettingsTab, label: tr("settings.tab_security", "Keamanan & Sandi"), icon: Lock },
    { id: "preferences" as SettingsTab, label: tr("settings.tab_pref", "Preferensi"), icon: SlidersHorizontal },
  ];

  return (
    <UserLayout showSearch={false}>
      <div className="user-page-shell w-full min-w-0 space-y-6 pb-12">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            {tr("settings.header", "Pengaturan Akun")}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {tr("settings.header_sub", "Kelola profil identitas Anda, notifikasi peminjaman, serta keamanan akun.")}
          </p>
        </div>

        {/* Feedback Messages */}
        {successMsg && (
          <div className="flex items-center gap-2.5 px-4 py-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-semibold animate-fade-in">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="flex items-center gap-2.5 px-4 py-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold animate-fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          {/* Sidebar Tabs */}
          <div className="bg-white rounded-2xl border border-slate-100 p-2.5 shadow-xs flex lg:flex-col gap-1 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all text-left w-full cursor-pointer ${
                    isActive
                      ? "bg-[#0785BC] text-white shadow-xs shadow-[#0785BC]/25"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-white" : "text-slate-400"}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab Contents Area */}
          <div className="lg:col-span-3">
            {/* 1. Tab Profil */}
            {activeTab === "profile" && (
              <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs">
                <h2 className="text-base font-bold text-slate-900 mb-1">{tr("settings.profile_title", "Informasi Profil")}</h2>
                <p className="text-xs text-slate-400 mb-6">
                  {tr("settings.profile_sub", "Perbarui informasi pribadi dan foto profil Anda untuk verifikasi peminjaman.")}
                </p>

                <form onSubmit={handleSaveProfile} className="space-y-5">
                  {/* Foto Profil */}
                  <div className="flex items-center gap-4 pb-4 border-b border-slate-100">
                    <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-slate-200 bg-slate-100 shrink-0 flex items-center justify-center">
                      {foto ? (
                        <img src={foto} alt={name} className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-8 h-8 text-slate-400" />
                      )}
                    </div>
                    <div>
                      <label className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer transition-colors">
                        <Camera className="w-3.5 h-3.5" />
                        {uploadingPhoto ? tr("settings.uploading", "Mengunggah...") : tr("settings.change_photo", "Ganti Foto")}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoUpload}
                          className="hidden"
                          disabled={uploadingPhoto}
                        />
                      </label>
                      <p className="text-[11px] text-slate-400 mt-1">{tr("settings.photo_hint", "JPG, PNG atau WebP (Maks 2MB)")}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                        {tr("settings.name", "Nama Lengkap")}
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0785BC] transition-all"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                        {tr("settings.id_label", "NIP / NIM / Nomor Induk")}
                      </label>
                      <input
                        type="text"
                        value={nomorInduk}
                        onChange={(e) => setNomorInduk(e.target.value)}
                        placeholder={tr("settings.id_ph", "Contoh: 21010102")}
                        className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0785BC] transition-all"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                        {tr("settings.email", "Alamat Email")}
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0785BC] transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                        {tr("settings.phone", "Nomor HP / WhatsApp")}
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="tel"
                          value={noHp}
                          onChange={(e) => setNoHp(e.target.value)}
                          placeholder={tr("settings.phone_ph", "Contoh: 08123456789")}
                          className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0785BC] transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-3">
                    <button
                      type="submit"
                      disabled={saving}
                      className="inline-flex items-center gap-2 px-5 py-2 bg-[#0785BC] hover:bg-[#0672a0] text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      <Save className="w-3.5 h-3.5" />
                      {saving ? tr("settings.saving", "Menyimpan...") : tr("settings.save", "Simpan Perubahan")}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* 2. Tab Notifikasi */}
            {activeTab === "notifications" && (
              <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs">
                <h2 className="text-base font-bold text-slate-900 mb-1">{tr("settings.notif_title", "Pengaturan Notifikasi")}</h2>
                <p className="text-xs text-slate-400 mb-6">
                  {tr("settings.notif_sub", "Atur pemberitahuan yang ingin Anda terima saat proses peminjaman berjalan.")}
                </p>

                <div className="space-y-4 divide-y divide-slate-100">
                  <div className="flex items-center justify-between pt-3">
                    <div>
                      <p className="text-xs font-bold text-slate-800">{tr("settings.badge", "Tampilkan Badge Notifikasi")}</p>
                      <p className="text-[11px] text-slate-400">
                        {tr("settings.badge_sub", "Tampilkan lingkaran merah notifikasi belum dibaca pada lonceng navbar.")}
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={pushNotif}
                      onChange={(e) => setPushNotif(e.target.checked)}
                      className="w-4 h-4 accent-[#0785BC] rounded cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-3">
                    <div>
                      <p className="text-xs font-bold text-slate-800">{tr("settings.borrow_status", "Status Pengajuan Peminjaman")}</p>
                      <p className="text-[11px] text-slate-400">
                        {tr("settings.borrow_status_sub", "Dapatkan kabar saat permohonan disetujui, ditolak, atau diproses.")}
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={borrowingNotif}
                      onChange={(e) => setBorrowingNotif(e.target.checked)}
                      className="w-4 h-4 accent-[#0785BC] rounded cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-3">
                    <div>
                      <p className="text-xs font-bold text-slate-800">{tr("settings.return_rem", "Pengingat Pengembalian")}</p>
                      <p className="text-[11px] text-slate-400">
                        {tr("settings.return_rem_sub", "Terima pemberitahuan menjelang batas waktu pengembalian barang.")}
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={returnNotif}
                      onChange={(e) => setReturnNotif(e.target.checked)}
                      className="w-4 h-4 accent-[#0785BC] rounded cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-3">
                    <div>
                      <p className="text-xs font-bold text-slate-800">{tr("settings.chat_msg", "Pesan Masuk dari Admin")}</p>
                      <p className="text-[11px] text-slate-400">
                        {tr("settings.chat_msg_sub", "Notifikasi saat petugas/admin membalas percakapan Anda.")}
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={chatNotif}
                      onChange={(e) => setChatNotif(e.target.checked)}
                      className="w-4 h-4 accent-[#0785BC] rounded cursor-pointer"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-6">
                  <button
                    type="button"
                    onClick={handleSaveNotifications}
                    className="inline-flex items-center gap-2 px-5 py-2 bg-[#0785BC] hover:bg-[#0672a0] text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {tr("settings.save_pref", "Simpan Preferensi")}
                  </button>
                </div>
              </div>
            )}

            {/* 3. Tab Keamanan */}
            {activeTab === "security" && (
              <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs">
                <h2 className="text-base font-bold text-slate-900 mb-1">{tr("settings.sec_title", "Ubah Kata Sandi")}</h2>
                <p className="text-xs text-slate-400 mb-6">
                  {tr("settings.sec_sub", "Pastikan akun Anda tetap terlindungi dengan kata sandi yang aman dan tidak mudah ditebak.")}
                </p>

                <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                      {tr("settings.current", "Kata Sandi Saat Ini")}
                    </label>
                    <div className="relative">
                      <input
                        type={showPasswords ? "text" : "password"}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        required
                        className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0785BC] transition-all pr-9"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                      {tr("settings.new", "Kata Sandi Baru")}
                    </label>
                    <div className="relative">
                      <input
                        type={showPasswords ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0785BC] transition-all pr-9"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                      {tr("settings.confirm", "Konfirmasi Kata Sandi Baru")}
                    </label>
                    <div className="relative">
                      <input
                        type={showPasswords ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0785BC] transition-all pr-9"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowPasswords(!showPasswords)}
                      className="text-xs text-[#0785BC] font-semibold flex items-center gap-1 cursor-pointer hover:underline"
                    >
                      {showPasswords ? (
                        <>
                          <EyeOff className="w-3.5 h-3.5" /> {tr("settings.hide", "Sembunyikan Sandi")}
                        </>
                      ) : (
                        <>
                          <Eye className="w-3.5 h-3.5" /> {tr("settings.show", "Lihat Sandi")}
                        </>
                      )}
                    </button>
                  </div>

                  <div className="flex justify-end pt-4">
                    <button
                      type="submit"
                      disabled={saving}
                      className="inline-flex items-center gap-2 px-5 py-2 bg-[#0785BC] hover:bg-[#0672a0] text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      {saving ? tr("settings.saving", "Menyimpan...") : tr("settings.update", "Perbarui Kata Sandi")}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* 4. Tab Preferensi */}
            {activeTab === "preferences" && (
              <div className="bg-white dark:bg-[#111c30] rounded-2xl border border-slate-100 dark:border-slate-800 p-6 shadow-xs">
                <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1">{tr("settings.pref_title", "Preferensi Tampilan")}</h2>
                <p className="text-xs text-slate-400 mb-6">
                  {tr("settings.pref_sub", "Sesuaikan bahasa (EN/ID), tema gelap-terang, dan format tanggal.")}
                </p>

                <div className="space-y-4 max-w-md">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5 block">
                      {tr("settings.lang_label", "Bahasa Aplikasi")}
                    </label>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0785BC] transition-all"
                    >
                      <option value="id">{tr("settings.lang_id", "Bahasa Indonesia (ID)")}</option>
                      <option value="en">{tr("settings.lang_en", "English (US)")}</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5 block">
                      {tr("settings.theme_label", "Tema Tampilan")}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {(["light", "dark"] as const).map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setTheme(m)}
                          className={`px-3.5 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            theme === m
                              ? "bg-[#0785BC] text-white border-[#0785BC]"
                              : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                          }`}
                        >
                          {m === "light" ? tr("settings.theme_light", "☀️ Terang") : tr("settings.theme_dark", "🌙 Gelap")}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                      {tr("settings.date_label", "Format Tanggal")}
                    </label>
                    <select
                      value={dateFormat}
                      onChange={(e) => setDateFormat(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0785BC] transition-all"
                    >
                      <option value="DD/MM/YYYY">DD/MM/YYYY ({lang === "en" ? "Example" : "Contoh"}: 15/09/2026)</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD ({lang === "en" ? "Example" : "Contoh"}: 2026-09-15)</option>
                    </select>
                  </div>

                  <div className="flex justify-end pt-4">
                    <button
                      type="button"
                      onClick={handleSavePreferences}
                      className="inline-flex items-center gap-2 px-5 py-2 bg-[#0785BC] hover:bg-[#0672a0] text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      {tr("settings.save_pref", "Simpan Preferensi")}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </UserLayout>
  );
}
