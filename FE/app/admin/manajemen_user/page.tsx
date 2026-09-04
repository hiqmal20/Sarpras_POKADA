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
} from "lucide-react";
import api from "@/lib/api";
import { AdminLayout } from "@/components/admin";

interface User {
  id: string;
  name: string;
  email: string;
  nomor_induk?: string;
  no_hp?: string;
  role: string;
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
function Avatar({ name, color }: { name?: string; color: string }) {
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
  return (
    <div
      className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${color}`}
    >
      {initials}
    </div>
  );
}

const avatarColors = [
  "bg-teal-500",
  "bg-blue-500",
  "bg-purple-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-cyan-500",
];

const PAGE_SIZE = 10;

export default function ManajemenUserPage() {
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

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.users.getAll({ page, limit: PAGE_SIZE });
      if (res.status === "success" && Array.isArray(res.data)) {
        setUsers(res.data as User[]);
        setTotal(res.total || res.data.length);
      } else {
        setUsers([]);
        setTotal(0);
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
    setSaving(true);

    try {
      if (editingUser) {
        // Edit User
        const payload: any = {
          name: formData.name,
          nomor_induk: formData.nomor_induk,
          role: formData.role,
          no_hp: formData.no_hp,
          status: formData.status,
        };
        const res = await api.users.update(editingUser.id, payload);
        if (res.status === "success") {
          await fetchUsers();
          setShowModal(false);
          resetForm();
        } else {
          alert("Gagal memperbarui pengguna: " + (res.message || "Error"));
        }
      } else {
        // Add New User
        const payload = {
          name: formData.name,
          email: formData.email,
          nomor_induk: formData.nomor_induk,
          role: formData.role,
          no_hp: formData.no_hp,
          password: formData.password || "Pokada@123",
          status: formData.status,
        };
        const res = await api.users.create(payload);
        if (res.status === "success") {
          await fetchUsers();
          setShowModal(false);
          resetForm();
        } else {
          alert("Gagal menambahkan pengguna: " + (res.message || "Error"));
        }
      }
    } catch (err: any) {
      alert("Terjadi kesalahan: " + (err?.message || "Error"));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async (id: string, name: string) => {
    if (!confirm(`Hapus pengguna "${name}" dari sistem? Tindakan ini permanen.`)) return;

    try {
      const res = await api.users.delete(id);
      if (res.status === "success") {
        setUsers((prev) => prev.filter((u) => u.id !== id));
        setTotal((t) => Math.max(0, t - 1));
      } else {
        alert("Gagal menghapus pengguna: " + (res.message || "Error"));
      }
    } catch (err: any) {
      alert("Gagal menghapus pengguna: " + err.message);
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
      searchPlaceholder="Cari pengguna berdasarkan nama, email, nomor induk..."
      onSearchChange={setSearch}
    >
      <div className="space-y-6">
        {/* Page header */}
        <div className={`flex items-start justify-between ${mounted ? "animate-fade-up" : "opacity-0"}`}>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Manajemen Pengguna</h1>
            <p className="text-sm text-slate-500 mt-0.5">Kelola data pengguna, peran akses, dan status akun platform.</p>
          </div>
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-[#0785BC] hover:bg-[#0672a0] active:scale-95 rounded-xl transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Tambah Pengguna Baru
          </button>
        </div>

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {stats.map((s, i) => (
            <div
              key={s.label}
              style={{ animationDelay: `${i * 75}ms` }}
              className={`bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center justify-between hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 ${mounted ? "animate-fade-up" : "opacity-0"}`}
            >
              <div>
                <p className="text-sm text-slate-500 font-medium mb-1">{s.label}</p>
                <p
                  className={`text-3xl font-bold tabular-nums ${
                    i === 0 ? "text-blue-600" : i === 1 ? "text-teal-600" : "text-red-500"
                  }`}
                >
                  {s.value}
                </p>
              </div>
              <div className={`w-12 h-12 rounded-xl ${s.iconBg} flex items-center justify-center`}>
                {s.icon}
              </div>
            </div>
          ))}
        </div>

        {/* ── User Directory ── */}
        <div className={`bg-white rounded-2xl border border-slate-100 shadow-sm ${mounted ? "animate-fade-up delay-200" : "opacity-0"}`}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-6 py-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900">Daftar Pengguna</h2>
              <p className="text-xs text-slate-400">Total {filtered.length} pengguna sesuai filter</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="text-xs font-semibold border border-slate-200 rounded-xl px-3 py-2 text-slate-600 bg-white focus:outline-none focus:ring-2 focus:ring-[#0785BC] transition-all"
              >
                <option value="All Roles">Semua Peran</option>
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
                  <th className="px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Pengguna</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Nomor Induk</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Peran</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">Aksi</th>
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
                          <Avatar name={user.name} color={avatarColors[i % avatarColors.length]} />
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
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
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
    </AdminLayout>
  );
}
