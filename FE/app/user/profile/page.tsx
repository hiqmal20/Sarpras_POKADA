"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  User,
  Mail,
  Phone,
  Hash,
  Shield,
  Camera,
  CheckCircle2,
  Lock,
  Eye,
  EyeOff,
  Save,
  Sparkles,
  AlertCircle,
  Loader2,
} from "lucide-react";
import api, { getCurrentUser } from "@/lib/api";
import { UserLayout } from "@/components/user";
import { useLanguage } from "@/lib/i18n";

export default function UserProfilePage() {
  const { t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<"profile" | "security">("profile");
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Profile Form States
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [nomorInduk, setNomorInduk] = useState("");
  const [role, setRole] = useState("Peminjam");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  // Security Form States
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  // Status & Feedback States
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [pwFeedback, setPwFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Stats
  const [totalBorrowings, setTotalBorrowings] = useState(0);

  // Load User Data & Sync with Server
  const loadProfile = useCallback(async () => {
    // 1. Initial load from localStorage
    const local = getCurrentUser();    if (local) {
      setCurrentUser(local);
      setFullName(local.name || local.full_name || "");
      setEmail(local.email || "");
      setPhone(local.no_hp || local.phone || "");
      setNomorInduk(local.nomor_induk || "");
      setRole(local.role || "Peminjam");
      if (local.foto) setPhotoUrl(local.foto);
    }

    // 2. Fresh fetch from server API
    try {
      const res = await api.auth.getProfile();
      if (res.status === "success" && res.data) {
        const u = (res.data as any).user || res.data;
        setCurrentUser(u);
        setFullName(u.name || u.full_name || "");
        setEmail(u.email || "");
        setPhone(u.no_hp || u.phone || "");
        setNomorInduk(u.nomor_induk || "");
        setRole(u.role || "Peminjam");
        if (u.foto) setPhotoUrl(u.foto);

        localStorage.setItem("user", JSON.stringify(u));
        window.dispatchEvent(new Event("user-updated"));
      }
    } catch (err) {
      console.warn("Gagal memuat profil terbaru dari server:", err);
    }

    // 3. Load user borrowings count
    try {
      const bRes = await api.borrowings.getAll({ limit: 100 });
      if (bRes.status === "success" && Array.isArray(bRes.data)) {
        setTotalBorrowings(bRes.data.length);
      }
    } catch {}
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // Handle Photo Upload
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    setFeedback(null);

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setPhotoUrl(base64);

      const user = getCurrentUser() || currentUser;
      let finalPhotoUrl = base64;

      if (user?.id) {
        try {
          const res = await api.users.uploadPhoto(user.id, file);
          if (res.status === "success" && res.data?.foto) {
            finalPhotoUrl = res.data.foto;
            setPhotoUrl(finalPhotoUrl);
          }
        } catch {
          // Fallback to base64
        }

        try {
          await api.users.update(user.id, { foto: finalPhotoUrl });
        } catch {}

        const updated = { ...user, foto: finalPhotoUrl };
        setCurrentUser(updated);
        localStorage.setItem("user", JSON.stringify(updated));
        window.dispatchEvent(new Event("user-updated"));
        window.dispatchEvent(new Event("storage"));

        setFeedback({
          type: "success",
          message: t("profile.msg_photo_ok"),
        });
        setTimeout(() => setFeedback(null), 4000);
      }
      setUploadingPhoto(false);
    };

    reader.readAsDataURL(file);
  };

  // Handle Save Profile Information (Name, Email, Phone, Nomor Induk)
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setFeedback(null);

    if (!fullName.trim()) {
      setFeedback({ type: "error", message: t("profile.err_name_empty") });
      setSavingProfile(false);
      return;
    }

    if (!email.trim() || !email.includes("@")) {
      setFeedback({ type: "error", message: t("profile.err_email") });
      setSavingProfile(false);
      return;
    }

    const user = getCurrentUser() || currentUser;
    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPhone = phone.trim();
    const trimmedNomorInduk = nomorInduk.trim();

    const updatePayload: any = {
      name: trimmedName,
      full_name: trimmedName,
      email: trimmedEmail,
      no_hp: trimmedPhone,
      phone: trimmedPhone,
      nomor_induk: trimmedNomorInduk,
      ...(photoUrl ? { foto: photoUrl } : {}),
    };

    try {
      // 1. Update via Backend Auth Profile Endpoint
      try {
        await api.auth.updateProfile(updatePayload);
      } catch {}

      // 2. Direct user update by ID
      if (user?.id) {
        try {
          await api.users.update(user.id, updatePayload);
        } catch {}
      }

      // 3. Update localStorage and broadcast event to all components (Navbar, Sidebar, Dashboard)
      const updatedUser = {
        ...user,
        ...updatePayload,
      };
      setCurrentUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
      window.dispatchEvent(new Event("user-updated"));
      window.dispatchEvent(new Event("storage"));

      setFeedback({
        type: "success",
        message: t("profile.msg_profile_ok"),
      });
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err.message || t("profile.err_profile_fail"),
      });
    } finally {
      setSavingProfile(false);
    }
  };

  // Handle Save Password
  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPassword(true);
    setPwFeedback(null);

    if (newPassword.length < 8) {
      setPwFeedback({
        type: "error",
        message: t("profile.err_pass_short"),
      });
      setSavingPassword(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setPwFeedback({
        type: "error",
        message: t("profile.err_pass_mismatch"),
      });
      setSavingPassword(false);
      return;
    }

    const user = getCurrentUser() || currentUser;
    if (user?.id) {
      try {
        const result = await api.auth.changePassword({ currentPassword, newPassword });
        if (result.status !== "success") throw new Error(result.message || t("profile.err_pass_fail"));
        setPwFeedback({
          type: "success",
          message: t("profile.msg_pass_ok"),
        });
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => setPwFeedback(null), 4000);
      } catch (err: any) {
        setPwFeedback({
          type: "error",
          message: err.message || t("profile.err_pass_fail"),
        });
      }
    }
    setSavingPassword(false);
  };

  const displayName = fullName || currentUser?.name || "User Sarpras";
  const userInitials =
    displayName
      .split(" ")
      .filter(Boolean)
      .map((w: string) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "U";

  return (
    <UserLayout showSearch={false}>
      <div className="w-full min-w-0 space-y-6 pb-16 animate-fade-in">
        {/* ── Page Header ── */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {t("profile.title")}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {t("profile.subtitle")}
          </p>
        </div>

        {/* ── Hero Profile Card with Clean Banner ── */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-xs overflow-hidden">
          {/* Top Banner */}
          <div className="h-32 sm:h-40 bg-gradient-to-r from-[#0785BC] via-[#05638c] to-[#0a2f4c] relative p-6 flex justify-end items-start">
            <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-white/10 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute left-10 top-0 w-40 h-40 bg-[#0785BC]/30 rounded-full blur-xl pointer-events-none" />
            <span className="relative z-10 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              {t("profile.verified")}
            </span>
          </div>

          {/* Profile Identity Bar - Fully White Background */}
          <div className="px-6 sm:px-8 pb-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              {/* Left Column: Avatar (negative margin) + Name & Badges */}
              <div className="flex flex-col sm:flex-row sm:items-end gap-5">
                {/* Avatar with negative margin */}
                <div className="relative group shrink-0 -mt-14 sm:-mt-16">
                  <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-white p-1.5 shadow-lg shadow-slate-900/10 border-4 border-white overflow-hidden relative">
                    {photoUrl ? (
                      <img
                        src={photoUrl}
                        alt={displayName}
                        className="w-full h-full rounded-2xl object-cover"
                      />
                    ) : (
                      <div className="w-full h-full rounded-2xl bg-gradient-to-br from-[#0785BC] to-[#05638c] text-white flex items-center justify-center text-3xl font-extrabold shadow-inner">
                        {userInitials}
                      </div>
                    )}

                    {/* Upload Overlay Button */}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingPhoto}
                      className="absolute inset-1.5 bg-black/40 hover:bg-black/60 rounded-2xl flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all cursor-pointer backdrop-blur-[2px]"
                      title={t("profile.change_photo_title")}
                    >
                      {uploadingPhoto ? (
                        <Loader2 className="w-6 h-6 animate-spin text-white" />
                      ) : (
                        <>
                          <Camera className="w-6 h-6 mb-1" />
                          <span className="text-[10px] font-semibold">{t("profile.change_photo")}</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Floating Camera Button for Mobile/Touch */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="sm:hidden absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-[#0785BC] text-white flex items-center justify-center shadow-md border-2 border-white cursor-pointer"
                    title={t("profile.change_photo")}
                  >
                    <Camera className="w-4 h-4" />
                  </button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </div>

                {/* Name & Badges - Safely sits on white background */}
                <div className="pt-2 sm:pt-0 sm:pb-1">
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight">
                    {displayName}
                  </h2>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className="px-3 py-1 rounded-xl text-xs font-semibold bg-blue-50 text-[#0785BC] border border-blue-100">
                      {role === "Admin"
                        ? t("profile.role_admin")
                        : role === "Petugas"
                        ? t("profile.role_staff")
                        : t("profile.role_borrower")}
                    </span>
                    <span className="px-3 py-1 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      {t("profile.active")}
                    </span>
                    {nomorInduk && (
                      <span className="px-3 py-1 rounded-xl text-xs font-mono font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                        ID: {nomorInduk}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Total Peminjaman Card */}
              <div className="flex items-center gap-3 pt-3 sm:pt-0 sm:pb-1">
                <div className="w-full sm:w-auto px-6 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-center shadow-xs">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    {t("profile.total")}
                  </p>
                  <p className="text-2xl font-extrabold text-slate-900 tabular-nums mt-0.5">
                    {totalBorrowings}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Navigation Tabs ── */}
        <div className="flex gap-2 border-b border-slate-200/80 pb-px">
          <button
            onClick={() => setActiveTab("profile")}
            className={`flex items-center gap-2 px-5 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === "profile"
                ? "border-[#0785BC] text-[#0785BC]"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            }`}
          >
            <User className="w-4 h-4" />
            {t("profile.tab_profile")}
          </button>
          <button
            onClick={() => setActiveTab("security")}
            className={`flex items-center gap-2 px-5 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === "security"
                ? "border-[#0785BC] text-[#0785BC]"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            }`}
          >
            <Lock className="w-4 h-4" />
            {t("profile.tab_security")}
          </button>
        </div>

        {/* ── Tab Content ── */}
        {activeTab === "profile" && (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-xs p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {t("profile.personal_title")}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {t("profile.personal_sub")}
                </p>
              </div>
            </div>

            {/* Notification Alert */}
            {feedback && (
              <div
                className={`p-4 rounded-2xl flex items-center gap-3 text-xs sm:text-sm font-medium ${
                  feedback.type === "success"
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-rose-50 text-rose-800 border border-rose-200"
                }`}
              >
                {feedback.type === "success" ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                )}
                <span>{feedback.message}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    {t("profile.name_label")}
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder={t("profile.name_ph")}
                      required
                      className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0785BC] transition-all"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {t("profile.name_hint")}
                  </p>
                </div>

                {/* Email Address */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    {t("profile.email_label")}
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={t("profile.email_ph")}
                      required
                      className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0785BC] transition-all"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {t("profile.email_hint")}
                  </p>
                </div>

                {/* Phone / WhatsApp */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    {t("profile.phone_label")}
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder={t("profile.phone_ph")}
                      className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0785BC] transition-all"
                    />
                  </div>
                </div>

                {/* Nomor Induk (NIM / NIP) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    {t("profile.id_label")}
                  </label>
                  <div className="relative">
                    <Hash className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={nomorInduk}
                      onChange={(e) => setNomorInduk(e.target.value)}
                      placeholder={t("profile.id_ph")}
                      className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0785BC] transition-all font-mono"
                    />
                  </div>
                </div>

                {/* Role */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    {t("profile.role_label")}
                  </label>
                  <div className="relative">
                    <Shield className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={role}
                      disabled
                      className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-slate-100/80 border border-slate-200 rounded-xl text-slate-500 cursor-not-allowed font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={loadProfile}
                  className="px-4 py-2.5 text-xs sm:text-sm font-semibold border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  {t("profile.reset")}
                </button>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="px-6 py-2.5 text-xs sm:text-sm font-bold bg-[#0785BC] hover:bg-[#0672a0] text-white rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {savingProfile ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {t("profile.saving")}
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      {t("profile.save")}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── Tab Security / Password ── */}
        {activeTab === "security" && (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-xs p-6 sm:p-8 space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-base font-bold text-slate-900">
                {t("profile.pass_title")}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {t("profile.pass_sub")}
              </p>
            </div>

            {/* Notification Alert */}
            {pwFeedback && (
              <div
                className={`p-4 rounded-2xl flex items-center gap-3 text-xs sm:text-sm font-medium ${
                  pwFeedback.type === "success"
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-rose-50 text-rose-800 border border-rose-200"
                }`}
              >
                {pwFeedback.type === "success" ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                )}
                <span>{pwFeedback.message}</span>
              </div>
            )}

            <form onSubmit={handleSavePassword} className="space-y-5 max-w-lg">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">{t("profile.current_pass")}</label>
                <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder={t("profile.current_ph")} required className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0785BC] transition-all" />
              </div>

              {/* New Password */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {t("profile.new_pass")}
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showNewPw ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder={t("profile.new_ph")}
                    required
                    className="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0785BC] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPw(!showNewPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm New Password */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {t("profile.confirm_pass")}
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showConfirmPw ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={t("profile.confirm_ph")}
                    required
                    className="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0785BC] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPw(!showConfirmPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showConfirmPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="px-6 py-2.5 text-xs sm:text-sm font-bold bg-[#0785BC] hover:bg-[#0672a0] text-white rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {savingPassword ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {t("profile.updating")}
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      {t("profile.update")}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </UserLayout>
  );
}
