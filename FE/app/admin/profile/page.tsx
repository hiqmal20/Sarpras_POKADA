"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Briefcase,
  Edit,
  Save,
  X,
  Camera,
  Shield,
  Award,
  Activity
} from "lucide-react";
import { AdminLayout } from "@/components/admin";
import api, { getCurrentUser } from "@/lib/api";
import { useLanguage } from "@/lib/i18n";

export default function ProfilePage() {
  const { t } = useLanguage();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  
  // Editable fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [department, setDepartment] = useState("");
  const [bio, setBio] = useState("");
  const [address, setAddress] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string>("");

  useEffect(() => {
    async function loadProfile() {
      const cached = getCurrentUser();
      if (cached) {
        setCurrentUser(cached);
        setFullName(cached.name || cached.full_name || "");
        setEmail(cached.email || "");
        setPhone(cached.no_hp || cached.phone || "");
        setDepartment(cached.role || cached.department || "");
        setBio(cached.bio || "");
        setAddress(cached.address || "");
        setPhotoUrl(cached.foto || "");
      }

      try {
        const res = await api.auth.getProfile();
        if (res.status === "success" && res.data?.user) {
          const u = res.data.user;
          setCurrentUser(u);
          setFullName(u.name || u.full_name || "");
          setEmail(u.email || "");
          setPhone(u.no_hp || u.phone || "");
          setDepartment(u.role || u.department || "");
          setPhotoUrl(u.foto || "");
          localStorage.setItem("user", JSON.stringify(u));
        }
      } catch {
        // silent fallback
      }
    }
    loadProfile();
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
        alert(t("admin_profile.photo_ok", "Foto profil berhasil diperbarui!"));
      } else {
        // Simpan via DataURL base64 langsung ke users table jika bucket storage tidak aktif
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
          alert(t("admin_profile.photo_saved", "Foto profil berhasil disimpan!"));
        };
        reader.readAsDataURL(file);
      }
    } catch (err) {
      console.warn("Upload storage gagal, menyimpan sebagai data URL:", err);
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
        alert(t("admin_profile.photo_saved", "Foto profil berhasil disimpan!"));
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
        console.warn("Gagal simpan ke backend:", e);
      }
    }

    localStorage.setItem("user", JSON.stringify(updatedUser));
    setCurrentUser(updatedUser);
    window.dispatchEvent(new Event("user-updated"));
    setIsEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleCancel = () => {
    // Reset to original values
    if (currentUser) {
      setFullName(currentUser.full_name || "");
      setEmail(currentUser.email || "");
      setPhone(currentUser.phone || "");
      setDepartment(currentUser.department || "");
      setBio(currentUser.bio || "");
      setAddress(currentUser.address || "");
    }
    setIsEditing(false);
  };

  const stats = [
    { label: t("admin_profile.stat_active", "Peminjaman Aktif"), value: "12", icon: Activity, color: "blue" },
    { label: t("admin_profile.stat_total", "Total Peminjaman"), value: "48", icon: Briefcase, color: "green" },
    { label: t("admin_profile.stat_compliance", "Tingkat Kepatuhan"), value: "98%", icon: Award, color: "purple" },
  ];

  const activityLog = [
    { action: t("admin_profile.act_submit", "Mengajukan peminjaman"), item: "Projector Epson EB-X51", date: "24 Okt 2023, 10:30", href: "/admin/manajemen_peminjaman" },
    { action: t("admin_profile.act_return", "Mengembalikan"), item: "Kamera Canon 90D", date: "23 Okt 2023, 15:45", href: "/admin/pengembalian" },
    { action: t("admin_profile.act_update", "Update profil"), item: t("admin_profile.act_contact", "Informasi kontak"), date: "20 Okt 2023, 09:15", href: "/admin/settings" },
    { action: t("admin_profile.act_submit", "Mengajukan peminjaman"), item: "Laptop Thinkpad T14", date: "18 Okt 2023, 14:20", href: "/admin/manajemen_peminjaman" },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">{t("profile.title", "Profil Pengguna")}</h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-slate-100 text-slate-600 border border-slate-200">
                ADMIN ACCOUNT
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {t("admin_profile.subtitle", "Kelola informasi identitas akun, kredensial, dan riwayat aktivitas operasional.")}
            </p>
          </div>
          
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-[#0785BC] text-white text-xs font-semibold rounded-lg hover:bg-[#0672a0] active:scale-95 transition-all shadow-xs self-start sm:self-auto"
            >
              <Edit className="w-3.5 h-3.5" />
              {t("admin_profile.edit", "Edit Profil")}
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={handleCancel}
                className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 active:scale-95 transition-all"
              >
                <X className="w-3.5 h-3.5" />
                {t("admin_profile.cancel", "Batal")}
              </button>
              <button
                onClick={handleSave}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#0785BC] text-white text-xs font-semibold rounded-lg hover:bg-[#0672a0] active:scale-95 transition-all shadow-xs"
              >
                <Save className="w-3.5 h-3.5" />
                {t("admin_profile.save", "Simpan")}
              </button>
            </div>
          )}
        </div>

        {/* Success Message */}
        {saved && (
          <div className="flex items-center gap-2 p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 text-xs font-semibold">
            <Save className="w-4 h-4" />
            <span>{t("admin_profile.saved", "Profil berhasil diperbarui!")}</span>
          </div>
        )}

        {/* Profile Card */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
          {/* Header Background */}
          <div className="h-28 bg-gradient-to-r from-[#0785BC] to-[#0B3B60]"></div>
          
          {/* Profile Content */}
          <div className="px-4 sm:px-8 pb-6 sm:pb-8">
            {/* Avatar */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between -mt-12 sm:-mt-16 mb-6 gap-3">
              <div className="relative group self-start">
                <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-white p-1.5 sm:p-2 shadow-lg overflow-hidden flex items-center justify-center">
                  {photoUrl ? (
                    <img
                      src={photoUrl}
                      alt={fullName}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-[#0785BC] flex items-center justify-center text-white text-2xl sm:text-4xl font-bold">
                      {fullName.charAt(0) || "A"}
                    </div>
                  )}
                </div>

                <label className="absolute bottom-0 right-0 sm:bottom-1 sm:right-1 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#0785BC] text-white flex items-center justify-center shadow-lg hover:bg-[#0672a0] transition-colors cursor-pointer active:scale-95">
                  <Camera className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                    disabled={uploadingPhoto}
                  />
                </label>
              </div>
              
              <div className="flex items-center gap-2 mb-2 sm:mb-4">
                <div className="px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full flex items-center gap-2 border border-blue-100">
                  <Shield className="w-3.5 h-3.5" />
                  {currentUser?.role === "Admin" ? t("admin_profile.role_admin", "Administrator") : t("admin_profile.role_staff", "Petugas Sarpras")}
                </div>
              </div>
            </div>

            {/* Profile Information */}
            <div className="space-y-6">
              {/* Name & Bio */}
              <div>
                {isEditing ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        {t("admin_profile.name_label", "Nama Lengkap")}
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
                        {t("admin_profile.bio_label", "Bio")}
                      </label>
                      <textarea
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        rows={3}
                        placeholder={t("admin_profile.bio_ph", "Ceritakan sedikit tentang Anda...")}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0785BC]"
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <h2 className="text-2xl font-bold text-slate-900">{fullName || t("admin_profile.name_not_set", "Nama Belum Diatur")}</h2>
                    <p className="text-slate-600 mt-2">{bio || t("admin_profile.bio_not_set", "Bio belum diatur")}</p>
                  </>
                )}
              </div>

              {/* Contact Information Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Email */}
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-5 h-5 text-[#0785BC]" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-slate-500 mb-1">{t("admin_profile.email_label", "Email")}</p>
                    {isEditing ? (
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0785BC]"
                      />
                    ) : (
                      <p className="font-medium text-slate-900">{email || t("admin_profile.email_not_set", "Email belum diatur")}</p>
                    )}
                  </div>
                </div>

                {/* Phone */}
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                    <Phone className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-slate-500 mb-1">{t("admin_profile.phone_label", "Nomor Telepon")}</p>
                    {isEditing ? (
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder={t("admin_profile.phone_ph", "+62 812-3456-7890")}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0785BC]"
                      />
                    ) : (
                      <p className="font-medium text-slate-900">{phone || t("admin_profile.phone_not_set", "Nomor belum diatur")}</p>
                    )}
                  </div>
                </div>

                {/* Department */}
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <Briefcase className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-slate-500 mb-1">{t("admin_profile.dept_label", "Departemen")}</p>
                    {isEditing ? (
                      <input
                        type="text"
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        placeholder={t("admin_profile.dept_ph", "Departemen Anda")}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0785BC]"
                      />
                    ) : (
                      <p className="font-medium text-slate-900">{department || t("admin_profile.dept_not_set", "Departemen belum diatur")}</p>
                    )}
                  </div>
                </div>

                {/* Address */}
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5 text-red-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-slate-500 mb-1">{t("admin_profile.addr_label", "Alamat")}</p>
                    {isEditing ? (
                      <input
                        type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder={t("admin_profile.addr_ph", "Alamat lengkap")}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0785BC]"
                      />
                    ) : (
                      <p className="font-medium text-slate-900">{address || t("admin_profile.addr_not_set", "Alamat belum diatur")}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-lg bg-${stat.color}-100 flex items-center justify-center`}>
                    <Icon className={`w-6 h-6 text-${stat.color}-600`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                    <p className="text-sm text-slate-500">{stat.label}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Activity Log */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="text-lg font-bold text-slate-900">{t("admin_profile.activity", "Aktivitas Terbaru")}</h3>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {activityLog.map((activity, index) => (
                <Link
                  key={index}
                  href={activity.href}
                  className="flex items-start gap-4 p-3 rounded-xl border border-transparent hover:border-slate-100 hover:bg-slate-50/80 transition-all group cursor-pointer"
                >
                  <div className="w-2 h-2 rounded-full bg-[#0785BC] mt-2 flex-shrink-0 group-hover:scale-125 transition-transform"></div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-900 text-sm group-hover:text-[#0785BC] transition-colors">
                      {activity.action} <span className="text-[#0785BC] font-semibold">{activity.item}</span>
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <p className="text-xs text-slate-500">{activity.date}</p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-[#0785BC] opacity-0 group-hover:opacity-100 transition-opacity self-center">
                    {t("admin_profile.open", "Buka")} &rarr;
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
