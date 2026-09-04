"use client";

import { useState, useEffect, useRef } from "react";
import {
  UserCircle2,
  Lock,
  TrendingUp,
  Eye,
  EyeOff,
  Upload,
  CheckCircle2,
} from "lucide-react";
import api, { getCurrentUser } from "@/lib/api";
import UserSidebar from "@/components/user/Sidebar";
import UserNavbar from "@/components/user/Navbar";

interface ProfileForm {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
}

interface PasswordForm {
  current: string;
  next: string;
  confirm: string;
}

function useMount() {
  const [m, setM] = useState(false);
  useEffect(() => { setM(true); }, []);
  return m;
}

export default function ProfilePage() {
  const mounted = useMount();
  const fileRef  = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<ProfileForm>({
    first_name: "", last_name: "", email: "", phone: "",
  });
  const [avatarSrc, setAvatarSrc]     = useState<string | null>(null);
  const [profileMsg, setProfileMsg]   = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  const [pwForm, setPwForm]   = useState<PasswordForm>({ current: "", next: "", confirm: "" });
  const [showPw, setShowPw]   = useState({ current: false, next: false, confirm: false });
  const [pwMsg, setPwMsg]     = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [savingPw, setSavingPw] = useState(false);

  // Load current user from localStorage / API
  useEffect(() => {
    const user = getCurrentUser();
    if (user) {
      const nameParts = (user.full_name ?? user.name ?? "").split(" ");
      setProfile({
        first_name: nameParts[0] ?? "",
        last_name:  nameParts.slice(1).join(" ") ?? "",
        email:      user.email ?? "",
        phone:      user.no_hp ?? user.phone ?? "",
      });
    } else {
      // Fallback: fetch from API
      api.auth.getProfile().then((res) => {
        if (res.status === "success" && res.data) {
          const u = (res.data as any).user ?? res.data;
          const parts = (u.full_name ?? u.name ?? "POKADA").split(" ");
          setProfile({
            first_name: parts[0] ?? "",
            last_name:  parts.slice(1).join(" ") ?? "",
            email:      u.email ?? "",
            phone:      u.no_hp ?? u.phone ?? "",
          });
        }
      });
    }
  }, []);

  // Avatar preview
  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setAvatarSrc(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg(null);
    const user = getCurrentUser();
    if (user?.id) {
      await api.users.update(user.id, {
        name: `${profile.first_name} ${profile.last_name}`.trim(),
        email: profile.email,
        no_hp: profile.phone,
      });
    }
    setSavingProfile(false);
    setProfileMsg({ type: "ok", text: "Perubahan berhasil disimpan." });
    setTimeout(() => setProfileMsg(null), 3000);
  }

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwMsg(null);
    if (pwForm.next.length < 8) {
      setPwMsg({ type: "err", text: "Password baru minimal 8 karakter." });
      return;
    }
    if (pwForm.next !== pwForm.confirm) {
      setPwMsg({ type: "err", text: "Konfirmasi password tidak cocok." });
      return;
    }
    setSavingPw(true);
    // API password update — endpoint varies; using users.update as placeholder
    const user = getCurrentUser();
    if (user?.id) {
      await api.users.update(user.id, { password: pwForm.next });
    }
    setSavingPw(false);
    setPwForm({ current: "", next: "", confirm: "" });
    setPwMsg({ type: "ok", text: "Password berhasil diperbarui." });
    setTimeout(() => setPwMsg(null), 3000);
  }

  const displayName = [profile.first_name, profile.last_name].filter(Boolean).join(" ") || "POKADA";

  return (
    <div className="flex h-screen overflow-hidden bg-[#eef2f9] text-slate-800">
      {/* ── Sidebar ── */}
      <UserSidebar />

      {/* ── Main ── */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar — di luar scroll area, selalu menetap */}
        <UserNavbar showSearch={false} />
        <div className="flex-1 overflow-y-auto">
          <div className="p-8 max-w-4xl">
          {/* Page header */}
          <div className={`mb-7 ${mounted ? "animate-fade-up" : "opacity-0"}`}>
            <h1 className="text-2xl font-bold text-slate-900">Profile Settings</h1>
            <p className="text-sm text-slate-500 mt-0.5">Manage your personal information and security preferences.</p>
          </div>

          <div className="flex gap-6 items-start">
            {/* ── Left: Avatar card + Trust Score ── */}
            <div className="w-64 shrink-0 space-y-4">
              {/* Avatar card */}
              <div className={`bg-white rounded-2xl border border-slate-100 shadow-sm p-6 text-center ${mounted ? "animate-fade-up delay-75" : "opacity-0"}`}>
                <div className="relative w-24 h-24 mx-auto mb-4">
                  {avatarSrc ? (
                    <img src={avatarSrc} alt="avatar" className="w-24 h-24 rounded-full object-cover border-2 border-slate-100" />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-[#0785BC]/20 flex items-center justify-center border-2 border-slate-100">
                      <UserCircle2 className="w-12 h-12 text-[#0785BC]/60" />
                    </div>
                  )}
                </div>
                <p className="text-base font-bold text-slate-900">{displayName.toUpperCase()}</p>
                <p className="text-xs text-slate-400 mt-0.5">{profile.email || "pokada.depok@example.com"}</p>

                <div className="flex justify-center gap-2 mt-3">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                    <CheckCircle2 className="w-3 h-3" /> Verified Lender
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                    Member since '23
                  </span>
                </div>

                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                <button
                  onClick={() => fileRef.current?.click()}
                  className="mt-4 w-full inline-flex items-center justify-center gap-2 py-2 text-sm font-semibold border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 active:scale-95 transition-all"
                >
                  <Upload className="w-3.5 h-3.5" /> Change Avatar
                </button>
              </div>

              {/* Trust Score */}
              <div className={`bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center justify-between ${mounted ? "animate-fade-up delay-150" : "opacity-0"}`}>
                <div>
                  <p className="text-[10px] font-bold text-[#0785BC] uppercase tracking-wider mb-1">Trust Score</p>
                  <p className="text-2xl font-bold text-slate-900">98/100</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-[#0785BC] flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
              </div>
            </div>

            {/* ── Right: Forms ── */}
            <div className="flex-1 space-y-5">
              {/* Personal Information */}
              <div className={`bg-white rounded-2xl border border-slate-100 shadow-sm p-6 ${mounted ? "animate-fade-up delay-100" : "opacity-0"}`}>
                <h2 className="flex items-center gap-2 text-base font-bold text-slate-900 mb-5">
                  <UserCircle2 className="w-4 h-4 text-[#0785BC]" />
                  Personal Information
                </h2>
                <form onSubmit={handleSaveProfile} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-600 mb-1.5 block">First Name</label>
                      <input
                        type="text"
                        value={profile.first_name}
                        onChange={(e) => setProfile((p) => ({ ...p, first_name: e.target.value }))}
                        className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0785BC] transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Last Name</label>
                      <input
                        type="text"
                        value={profile.last_name}
                        onChange={(e) => setProfile((p) => ({ ...p, last_name: e.target.value }))}
                        className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0785BC] transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Email Address</label>
                    <input
                      type="email"
                      value={profile.email}
                      onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
                      className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0785BC] transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Phone Number (Optional)</label>
                    <input
                      type="tel"
                      value={profile.phone}
                      onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
                      placeholder="+62 812 3456 7890"
                      className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0785BC] transition-all"
                    />
                  </div>

                  {profileMsg && (
                    <p className={`text-xs font-medium ${profileMsg.type === "ok" ? "text-emerald-600" : "text-red-500"}`}>
                      {profileMsg.text}
                    </p>
                  )}

                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      disabled={savingProfile}
                      className="px-5 py-2.5 text-sm font-bold text-white bg-[#0785BC] hover:bg-[#0672a0] active:scale-95 rounded-xl transition-all shadow-sm disabled:opacity-60"
                    >
                      {savingProfile ? "Menyimpan..." : "Simpan Perubahan"}
                    </button>
                  </div>
                </form>
              </div>

              {/* Ubah Password */}
              <div className={`bg-white rounded-2xl border border-slate-100 shadow-sm p-6 ${mounted ? "animate-fade-up delay-150" : "opacity-0"}`}>
                <h2 className="flex items-center gap-2 text-base font-bold text-slate-900 mb-5">
                  <Lock className="w-4 h-4 text-[#0785BC]" />
                  Ubah Password
                </h2>
                <form onSubmit={handleUpdatePassword} className="space-y-4">
                  {/* Current Password */}
                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Current Password</label>
                    <div className="relative">
                      <input
                        type={showPw.current ? "text" : "password"}
                        value={pwForm.current}
                        onChange={(e) => setPwForm((p) => ({ ...p, current: e.target.value }))}
                        className="w-full px-3 py-2.5 pr-10 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0785BC] transition-all"
                      />
                      <button type="button" onClick={() => setShowPw((s) => ({ ...s, current: !s.current }))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                        {showPw.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* New Password */}
                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1.5 block">New Password</label>
                    <div className="relative">
                      <input
                        type={showPw.next ? "text" : "password"}
                        value={pwForm.next}
                        onChange={(e) => setPwForm((p) => ({ ...p, next: e.target.value }))}
                        className="w-full px-3 py-2.5 pr-10 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0785BC] transition-all"
                      />
                      <button type="button" onClick={() => setShowPw((s) => ({ ...s, next: !s.next }))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                        {showPw.next ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">Must be at least 8 characters long.</p>
                  </div>

                  {/* Confirm */}
                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Confirm New Password</label>
                    <div className="relative">
                      <input
                        type={showPw.confirm ? "text" : "password"}
                        value={pwForm.confirm}
                        onChange={(e) => setPwForm((p) => ({ ...p, confirm: e.target.value }))}
                        className="w-full px-3 py-2.5 pr-10 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0785BC] transition-all"
                      />
                      <button type="button" onClick={() => setShowPw((s) => ({ ...s, confirm: !s.confirm }))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                        {showPw.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {pwMsg && (
                    <p className={`text-xs font-medium ${pwMsg.type === "ok" ? "text-emerald-600" : "text-red-500"}`}>
                      {pwMsg.text}
                    </p>
                  )}

                  <div className="flex justify-end gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => { setPwForm({ current: "", next: "", confirm: "" }); setPwMsg(null); }}
                      className="px-5 py-2.5 text-sm font-semibold border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 active:scale-95 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={savingPw}
                      className="px-5 py-2.5 text-sm font-bold text-white bg-[#0785BC] hover:bg-[#0672a0] active:scale-95 rounded-xl transition-all shadow-sm disabled:opacity-60"
                    >
                      {savingPw ? "Memperbarui..." : "Update Password"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
        </div>
      </main>
    </div>
  );
}

