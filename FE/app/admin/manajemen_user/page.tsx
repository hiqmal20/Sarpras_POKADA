"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  Pencil,
  Ban,
  RotateCcw as Restore,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  UserX,
  Users,
  Trash2,
  X,
  Loader2,
  Download,
  Upload,
  FileText,
  FileSpreadsheet,
} from "lucide-react";
import api from "@/lib/api";
import { AdminLayout } from "@/components/admin";
import ExportModal from "@/components/ExportModal";
import { toast } from "@/components/Toast";
import { useLanguage } from "@/lib/i18n";

interface User {
  id: string;
  name: string;
  email: string;
  nomor_induk?: string;
  no_hp?: string;
  role: string;
  foto?: string | null;
  status?: string;
}

function useMount() {
  const [m, setM] = useState(false);
  useEffect(() => { setM(true); }, []);
  return m;
}

// ── Role badge ──
function RoleBadge({ role }: { role: string }) {
  const isAdmin = role?.toLowerCase() === "admin";
  return (
    <span
      className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
        isAdmin ? "bg-blue-50 text-blue-700 border border-blue-100" : "bg-slate-100 text-slate-600"
      }`}
    >
      {role || "User"}
    </span>
  );
}

// ── Status badge ──
function StatusBadge({ status }: { status: string }) {
  const active = status !== "inactive" && status !== "Nonaktif";
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
        active
          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
          : "bg-red-50 text-red-500 border-red-200"
      }`}
    >
      {active ? <UserCheck className="w-3 h-3" /> : <UserX className="w-3 h-3" />}
      {active ? "Aktif" : "Nonaktif"}
    </span>
  );
}

// ── Avatar ──
function Avatar({ name, foto }: { name?: string; foto?: string | null }) {
  const safeName = (name || "").trim();
  const initials = safeName
    ? safeName
        .split(" ")
        .filter(Boolean)
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "U";

  if (foto) {
    return (
      <img
        src={foto}
        alt={safeName}
        className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0"
      />
    );
  }

  return (
    <div
      className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 bg-[#0785BC]"
    >
      {initials}
    </div>
  );
}

const PAGE_SIZE = 10;

export default function ManajemenUserPage() {
  const { t, lang } = useLanguage();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All Roles");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const mounted = useMount();

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    nomor_induk: "",
    no_hp: "",
    role: "Mahasiswa",
    password: "",
    status: "Aktif",
  });

  const [allUsersStats, setAllUsersStats] = useState({ total: 0, admins: 0, inactive: 0 });
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importSummary, setImportSummary] = useState<{ success: number; failed: number } | null>(null);

  const handleDownloadTemplate = () => {
    const csvContent = "name,email,nomor_induk,role,no_hp,password\nContoh Mahasiswa,mahasiswa@kampus.ac.id,202401001,Mahasiswa,08123456789,Password123\nContoh Dosen,dosen@kampus.ac.id,198501002,Dosen,08123456780,Password123";
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "template_import_user_pokada.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExecuteImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) return;
    setImporting(true);
    setImportSummary(null);
    try {
      const res = await api.users.importCSV(importFile);
      if (res.status === "success" || res.statusCode === 201 || res.statusCode === 207) {
        const succ = res.data?.success?.length || 0;
        const fail = res.data?.failed?.length || 0;
        setImportSummary({ success: succ, failed: fail });
        await fetchUsers();
        if (fail === 0) {
          toast.success(`Import selesai: seluruh ${succ} data pengguna berhasil ditambahkan!`, "Import Berhasil");
          setShowImportModal(false);
        } else {
          toast.warning(`Import selesai: ${succ} berhasil, ${fail} baris data gagal atau duplikat.`, "Sebagian Gagal");
        }
      } else {
        toast.error(res.message || "Gagal memproses import data CSV.", "Import Gagal");
      }
    } catch (err: any) {
      toast.error(err.message || "Terjadi kesalahan saat memproses berkas CSV.", "Gagal");
    } finally {
      setImporting(false);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const [res, allRes] = await Promise.all([
        api.users.getAll({ page, limit: PAGE_SIZE }),
        api.users.getAll({ limit: 500 }),
      ]);

      if (res.status === "success" && Array.isArray(res.data)) {
        setUsers(res.data as User[]);
        setTotal(res.total || res.data.length);
      } else {
        setUsers([]);
        setTotal(0);
      }

      if (allRes.status === "success" && Array.isArray(allRes.data)) {
        const all = allRes.data as User[];
        const admins = all.filter(
          (u) => (u.role?.toLowerCase() === "admin" || u.role?.toLowerCase() === "petugas") && u.status !== "Nonaktif"
        ).length;
        const inactive = all.filter((u) => u.status === "Nonaktif" || u.status === "inactive").length;
        setAllUsersStats({
          total: all.length,
          admins,
          inactive,
        });
      }
    } catch (err) {
      console.warn("Gagal memuat pengguna:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page]);

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      nomor_induk: "",
      no_hp: "",
      role: "Mahasiswa",
      password: "",
      status: "Aktif",
    });
    setEditingUser(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    setShowModal(true);
  };

  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.name || "",
      email: user.email || "",
      nomor_induk: user.nomor_induk || "",
      no_hp: user.no_hp || "",
      role: user.role || "Mahasiswa",
      password: "",
      status: user.status === "inactive" || user.status === "Nonaktif" ? "Nonaktif" : "Aktif",
    });
    setShowModal(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.warning("Nama lengkap pengguna wajib diisi.", "Validasi Input");
      return;
    }
    if (!formData.email.trim()) {
      toast.warning("Alamat email pengguna wajib diisi.", "Validasi Input");
      return;
    }
    if (!formData.nomor_induk.trim()) {
      toast.warning("Nomor Induk (NIM / NIP) wajib diisi untuk identitas sivitas kampus.", "Validasi Input");
      return;
    }

    setSaving(true);

    try {
      if (editingUser) {
        // Edit User
        const payload: any = {
          name: formData.name.trim(),
          nomor_induk: formData.nomor_induk.trim(),
          role: formData.role,
          no_hp: formData.no_hp.trim(),
          status: formData.status,
        };
        const res = await api.users.update(editingUser.id, payload);
        if (res.status === "success") {
          toast.success(`Data pengguna "${payload.name}" berhasil diperbarui!`, "Berhasil Disimpan");
          await fetchUsers();
          setShowModal(false);
          resetForm();
        } else {
          toast.error(res.message || "Gagal memperbarui data pengguna.", "Pembaruan Gagal");
        }
      } else {
        // Add New User
        const payload = {
          name: formData.name.trim(),
          email: formData.email.trim(),
          nomor_induk: formData.nomor_induk.trim(),
          role: formData.role,
          no_hp: formData.no_hp.trim(),
          password: formData.password || "Pokada@123",
          status: formData.status,
        };
        const res = await api.users.create(payload);
        if (res.status === "success") {
          toast.success(`Pengguna baru "${payload.name}" berhasil didaftarkan!`, "Pendaftaran Berhasil");
          await fetchUsers();
          setShowModal(false);
          resetForm();
        } else {
          toast.error(res.message || "Gagal menambahkan akun pengguna baru.", "Pendaftaran Gagal");
        }
      }
    } catch (err: any) {
      toast.error(err?.message || "Terjadi kesalahan saat menyimpan data pengguna.", "Error");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async (id: string, name: string) => {
    if (!confirm(`Hapus pengguna "${name}" dari sistem? Tindakan ini permanen.`)) return;

    try {
      const res = await api.users.delete(id);
      if (res.status === "success") {
        toast.success(`Pengguna "${name}" berhasil dihapus dari sistem.`, "Berhasil Dihapus");
        setUsers((prev) => prev.filter((u) => u.id !== id));
        setTotal((t) => Math.max(0, t - 1));
      } else {
        toast.error(res.message || "Gagal menghapus pengguna.", "Relasi Akun Terikat");
      }
    } catch (err: any) {
      toast.error(err.message || "Pengguna tidak dapat dihapus karena masih memiliki riwayat transaksi/peminjaman aktif.", "Relasi Akun Terikat");
    }
  };

  const handleDeactivate = async (id: string) => {
    await api.users.update(id, { status: "Nonaktif" });
    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, status: "Nonaktif" } : u))
    );
  };

  const handleRestore = async (id: string) => {
    await api.users.update(id, { status: "Aktif" });
    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, status: "Aktif" } : u))
    );
  };

  const filtered = users.filter((u) => {
    const userName = u.name || "";
    const userEmail = u.email || "";
    const userNomorInduk = u.nomor_induk || "";
    const matchSearch =
      !search ||
      userName.toLowerCase().includes(search.toLowerCase()) ||
      userEmail.toLowerCase().includes(search.toLowerCase()) ||
      userNomorInduk.toLowerCase().includes(search.toLowerCase());
    const matchRole =
      roleFilter === "All Roles" ||
      u.role?.toLowerCase() === roleFilter.toLowerCase();
    return matchSearch && matchRole;
  });

  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;

  // Real stats count
  const activeAdmins = users.filter(
    (u) => u.role?.toLowerCase() === "admin" && u.status !== "Nonaktif" && u.status !== "inactive"
  ).length;
  const inactiveUsers = users.filter(
    (u) => u.status === "Nonaktif" || u.status === "inactive"
  ).length;

  const stats = [
    {
      label: "Total Pengguna",
      value: total,
      icon: <Users className="w-6 h-6 text-blue-500" />,
      iconBg: "bg-blue-100",
    },
    {
      label: "Admin Aktif",
      value: activeAdmins,
      icon: <UserCheck className="w-6 h-6 text-teal-500" />,
      iconBg: "bg-teal-100",
    },
    {
      label: "Akun Nonaktif",
      value: inactiveUsers,
      icon: <UserX className="w-6 h-6 text-red-400" />,
      iconBg: "bg-red-100",
    },
  ];

  return (
    <AdminLayout
      showSearch={true}
      searchValue={search}
      searchPlaceholder={t("admin.users.search_ph", "Cari pengguna berdasarkan nama, email, nomor induk...")}
      onSearchChange={setSearch}
    >
      <div className="space-y-6">
        {/* Page header */}
        <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${mounted ? "animate-fade-up" : "opacity-0"}`}>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                {t("admin.users.title", "Manajemen Pengguna")}
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-slate-100 text-slate-600 border border-slate-200">
                USER DIRECTORY
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {t("admin.users.sub", "Kelola data pengguna, peran akses, dan status akun platform.")}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowExportModal(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200/90 hover:bg-slate-50 active:scale-95 rounded-lg transition-all shadow-2xs cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-[#0785BC]" />
              {t("admin.pkg.export_btn", "Ekspor Data")}
            </button>
            <button
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-[#0785BC] hover:bg-[#0672a0] active:scale-95 rounded-lg transition-all shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              {t("admin.users.add_btn", "Tambah Pengguna")}
            </button>
          </div>
        </div>

        {/* ── Stat Cards (n8n Node Style) ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="group bg-white rounded-xl border border-slate-200/90 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all duration-200 p-4.5 flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-50 text-sky-700 border border-sky-200 mb-1.5">
                  MEMBERS
                </span>
                <p className="text-xs font-medium text-slate-500">Total Pengguna</p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-sky-50 border border-sky-100 text-[#0785BC] flex items-center justify-center shrink-0">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-black text-slate-900 tabular-nums tracking-tight">
                {loading ? "..." : allUsersStats.total || total} <span className="text-xs text-slate-500 font-normal">akun terdaftar</span>
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">Mahasiswa, Dosen, & Staf Kampus</p>
            </div>
          </div>

          <div className="group bg-white rounded-xl border border-slate-200/90 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all duration-200 p-4.5 flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 mb-1.5">
                  PRIVILEGED
                </span>
                <p className="text-xs font-medium text-slate-500">Admin & Petugas</p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <UserCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-black text-emerald-600 tabular-nums tracking-tight">
                {loading ? "..." : allUsersStats.admins} <span className="text-xs text-emerald-700/60 font-normal">operator aktif</span>
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">Mengelola hak akses operasional sarpras</p>
            </div>
          </div>

          <div className="group bg-white rounded-xl border border-slate-200/90 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all duration-200 p-4.5 flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-50 text-rose-700 border border-rose-200 mb-1.5">
                  DEACTIVATED
                </span>
                <p className="text-xs font-medium text-slate-500">Akun Nonaktif</p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <UserX className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-black text-rose-600 tabular-nums tracking-tight">
                {loading ? "..." : allUsersStats.inactive} <span className="text-xs text-rose-700/60 font-normal">akun terkunci</span>
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">Dibekukan atau dinonaktifkan</p>
            </div>
          </div>
        </div>

        {/* ── User Directory ── */}
        <div className={`bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden ${mounted ? "animate-fade-up delay-200" : "opacity-0"}`}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-6 py-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900">{t("admin.users.list_title", "Daftar Pengguna")}</h2>
              <p className="text-xs text-slate-400">Total {filtered.length} {t("admin.users.title", "pengguna")}</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="text-xs font-semibold border border-slate-200 rounded-xl px-3 py-2 text-slate-600 bg-white focus:outline-none focus:ring-2 focus:ring-[#0785BC] transition-all cursor-pointer"
              >
                <option value="All Roles">{t("admin.users.all_roles", "Semua Peran")}</option>
                <option value="Admin">Admin</option>
                <option value="Mahasiswa">Mahasiswa</option>
                <option value="Dosen">Dosen</option>
                <option value="Petugas">Petugas</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left bg-slate-50/50">
                  <th className="px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">{t("admin.users.th_user", "Pengguna")}</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">{t("admin.users.th_id_num", "Nomor Induk")}</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">{t("admin.users.th_role", "Peran")}</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">{t("admin.users.th_status", "Status")}</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">{t("admin.items.th_action", "Aksi")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 5 }).map((_, j) => (
                        <td key={j} className="px-6 py-4">
                          <div className="h-4 bg-slate-100 rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-slate-400 text-xs">
                      Tidak ada pengguna ditemukan.
                    </td>
                  </tr>
                ) : (
                  filtered.map((user, i) => (
                    <tr
                      key={user.id}
                      className="hover:bg-slate-50/60 transition-colors group"
                    >
                      {/* User */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar name={user.name} foto={user.foto} />
                          <div>
                            <p className="font-semibold text-slate-800 text-xs">{user.name}</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">{user.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Nomor Induk */}
                      <td className="px-4 py-4 text-xs text-slate-600 font-mono">{user.nomor_induk || "—"}</td>

                      {/* Role */}
                      <td className="px-4 py-4">
                        <RoleBadge role={user.role} />
                      </td>

                      {/* Status */}
                      <td className="px-4 py-4">
                        <StatusBadge status={user.status ?? "Aktif"} />
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(user)}
                            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-[#0785BC] active:scale-90 transition-all"
                            title="Edit Pengguna"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          {user.status === "Nonaktif" || user.status === "inactive" ? (
                            <button
                              onClick={() => handleRestore(user.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 active:scale-90 transition-all"
                              title="Aktifkan Akun"
                            >
                              <Restore className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleDeactivate(user.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:bg-amber-50 hover:text-amber-600 active:scale-90 transition-all"
                              title="Nonaktifkan Akun"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteUser(user.id, user.name)}
                            className="p-1.5 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 active:scale-90 transition-all"
                            title="Hapus Pengguna"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Menampilkan {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} dari {total} data
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: Math.min(totalPages, 3) }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  className={`w-8 h-8 rounded-lg text-xs font-medium transition-all active:scale-95 ${
                    page === n ? "bg-[#0785BC] text-white" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {n}
                </button>
              ))}
              {totalPages > 3 && <span className="px-1 text-slate-400 text-xs">...</span>}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Tambah / Edit User */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[100] p-4 sm:p-6 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 my-auto animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h2 className="text-base font-bold text-slate-900">
                {editingUser ? "Edit Pengguna" : "Tambah Pengguna Baru"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Lengkap *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0785BC]"
                  placeholder="contoh: Ahmad Santoso"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Email *</label>
                <input
                  type="email"
                  required
                  disabled={!!editingUser}
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={`w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0785BC] ${
                    editingUser ? "bg-slate-50 text-slate-400 cursor-not-allowed" : ""
                  }`}
                  placeholder="ahmad@campus.ac.id"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nomor Induk (NIM/NIP)</label>
                  <input
                    type="text"
                    value={formData.nomor_induk}
                    onChange={(e) => setFormData({ ...formData, nomor_induk: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0785BC]"
                    placeholder="210403..."
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Peran *</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0785BC]"
                  >
                    <option value="Mahasiswa">Mahasiswa</option>
                    <option value="Dosen">Dosen</option>
                    <option value="Petugas">Petugas</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nomor WhatsApp / HP</label>
                  <input
                    type="tel"
                    value={formData.no_hp}
                    onChange={(e) => setFormData({ ...formData, no_hp: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0785BC]"
                    placeholder="081234..."
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Status Akun</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0785BC]"
                  >
                    <option value="Aktif">Aktif</option>
                    <option value="Nonaktif">Nonaktif</option>
                  </select>
                </div>
              </div>

              {!editingUser && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Password Sementara</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0785BC]"
                    placeholder="Default: Pokada@123"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-50 font-semibold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-5 py-2 bg-[#0785BC] text-white font-semibold rounded-xl hover:bg-[#0672a0] disabled:opacity-60 transition-all shadow-sm"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {editingUser ? "Simpan Perubahan" : "Buat Pengguna"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Unified Modal Ekspor & Impor Pengguna ── */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="Kelola Data Pengguna"
        description="Pilih tab untuk ekspor berkas terfilter tanggal atau impor berkas CSV pengguna."
        moduleName="Pengguna"
        filenamePrefix="SARPRAS_Pengguna"
        data={users}
        dateFieldGetter={(u) => (u as any).created_at}
        dataRowMapper={(u) => ({
          "Nomor Induk / NIM": u.nomor_induk || "-",
          "Nama Lengkap": u.name,
          Email: u.email,
          "No Telepon": u.no_hp || "-",
          Peran: u.role,
          Status: u.status || "Aktif",
        })}
        allowImport={true}
        importTitle="Template Berkas CSV Pengguna"
        importTemplateFilename="template_import_user_pokada.csv"
        importTemplateHeader="name, email, nomor_induk, role, no_hp, password"
        importTemplateContent="name,email,nomor_induk,role,no_hp,password\nContoh Mahasiswa,mahasiswa@kampus.ac.id,202401001,Mahasiswa,08123456789,Password123\nContoh Dosen,dosen@kampus.ac.id,198501002,Dosen,08123456780,Password123"
        onExecuteImport={async (file) => {
          const res = await api.users.importCSV(file);
          if (res.status === "success" || res.statusCode === 201 || res.statusCode === 207) {
            await fetchUsers();
            const succ = res.data?.success?.length || 0;
            const fail = res.data?.failed?.length || 0;
            if (fail === 0) {
              toast.success(`Import selesai: ${succ} data pengguna berhasil diimpor!`, "Import Berhasil");
            } else {
              toast.warning(`Import selesai: ${succ} berhasil, ${fail} baris gagal/duplikat.`, "Sebagian Berhasil");
            }
            return { success: succ, failed: fail };
          } else {
            toast.error(res.message || "Gagal impor CSV pengguna.", "Import Gagal");
            return { success: 0, failed: 1 };
          }
        }}
      />
    </AdminLayout>
  );
}
