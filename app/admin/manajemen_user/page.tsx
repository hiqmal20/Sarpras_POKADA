"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  BookOpen,
  RotateCcw,
  Users,
  AlertTriangle,
  Tag,
  Bell,
  Settings,
  Search,
  Plus,
  Pencil,
  Ban,
  RotateCcw as Restore,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  UserX,
} from "lucide-react";
import api from "@/lib/api";

const navItems = [
  { href: "/admin/dashboard_admin",      label: "Dashboard",         icon: LayoutDashboard },
  { href: "/admin/manajemen_peminjaman", label: "Peminjaman",        icon: BookOpen },
  { href: "/admin/pengembalian",         label: "Pengembalian",      icon: RotateCcw },
  { href: "/admin/manajemen_user",       label: "Manage User",       icon: Users },
  { href: "/admin/rekap_laporan",        label: "Laporan Kerusakan", icon: AlertTriangle },
  { href: "/admin/kategori_barang",      label: "Kategori Barang",   icon: Tag },
];

interface User {
  id: string;
  full_name: string;
  email: string;
  department?: string;
  role: string;       // "admin" | "user"
  status?: string;    // "active" | "inactive"
}

function useMount() {
  const [m, setM] = useState(false);
  useEffect(() => { setM(true); }, []);
  return m;
}

// ── Role badge ──
function RoleBadge({ role }: { role: string }) {
  const isAdmin = role === "admin";
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${isAdmin ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"}`}>
      {isAdmin ? "Admin" : "User"}
    </span>
  );
}

// ── Status badge ──
function StatusBadge({ status }: { status: string }) {
  const active = status !== "inactive";
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
      active ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-500 border-red-200"
    }`}>
      {active ? <UserCheck className="w-3 h-3" /> : <UserX className="w-3 h-3" />}
      {active ? "Active" : "Inactive"}
    </span>
  );
}

// ── Avatar ──
function Avatar({ name, color }: { name: string; color: string }) {
  const initials = name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${color}`}>
      {initials}
    </div>
  );
}

const avatarColors = ["bg-teal-500", "bg-blue-500", "bg-purple-500", "bg-amber-500", "bg-rose-500", "bg-cyan-500"];

const mockUsers: User[] = [
  { id: "1", full_name: "Sarah Jenkins", email: "sarah.j@company.com", department: "IT Support",  role: "admin", status: "active"   },
  { id: "2", full_name: "Michael Chen",  email: "m.chen@company.com",  department: "Marketing",   role: "user",  status: "active"   },
  { id: "3", full_name: "Amanda Lee",    email: "a.lee@company.com",   department: "Operations",  role: "user",  status: "inactive" },
];

const PAGE_SIZE = 10;

export default function ManajemenUserPage() {
  const [users, setUsers]           = useState<User[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [roleFilter, setRoleFilter] = useState("All Roles");
  const [page, setPage]             = useState(1);
  const [total, setTotal]           = useState(124);
  const mounted = useMount();

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const res = await api.users.getAll({ page, limit: PAGE_SIZE });
      if (res.status === "success" && res.data && (res.data as any[]).length > 0) {
        setUsers(res.data as User[]);
        if (res.total) setTotal(res.total);
      } else {
        setUsers(mockUsers);
        setTotal(124);
      }
      setLoading(false);
    }
    fetchData();
  }, [page]);

  const filtered = users.filter((u) => {
    const matchSearch = !search ||
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.department?.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "All Roles" || u.role === roleFilter.toLowerCase();
    return matchSearch && matchRole;
  });

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const stats = [
    { label: "Total Users",        value: 124, icon: <Users className="w-6 h-6 text-blue-500" />,    iconBg: "bg-blue-100"    },
    { label: "Active Admins",      value: 8,   icon: <UserCheck className="w-6 h-6 text-teal-500" />, iconBg: "bg-teal-100"   },
    { label: "Inactive Accounts",  value: 3,   icon: <UserX className="w-6 h-6 text-red-400" />,      iconBg: "bg-red-100"    },
  ];

  async function handleDeactivate(id: string) {
    await api.users.update(id, { status: "inactive" });
    setUsers((prev) => prev.map((u) => u.id === id ? { ...u, status: "inactive" } : u));
  }

  async function handleRestore(id: string) {
    await api.users.update(id, { status: "active" });
    setUsers((prev) => prev.map((u) => u.id === id ? { ...u, status: "active" } : u));
  }

  return (
    <div className="flex min-h-screen bg-[#f8fafc] text-slate-800">
      {/* ── Sidebar ── */}
      <aside className="w-56 shrink-0 bg-white border-r border-slate-100 flex flex-col justify-between sticky top-0 h-screen">
        <div>
          <div className="px-6 py-6 border-b border-slate-100">
            <span className="text-lg font-extrabold text-[#0785BC] tracking-tight">PinjamBarang</span>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">Internal Lending Platform</p>
          </div>
          <nav className="px-3 py-4 space-y-0.5">
            {navItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  href === "/admin/manajemen_user"
                    ? "bg-[#0785BC] text-white"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="px-4 py-4 border-t border-slate-100 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#0785BC]/20 flex items-center justify-center text-[#0785BC] font-bold text-sm shrink-0">A</div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-800 truncate">Admin User</p>
            <p className="text-[11px] text-slate-400 truncate">System Administrator</p>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="bg-white border-b border-slate-100 px-8 py-4 flex items-center gap-3 sticky top-0 z-10">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search users, departments..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-full focus:outline-none focus:ring-2 focus:ring-[#0785BC] transition-all"
            />
          </div>
          <div className="ml-auto flex items-center gap-3">
            <button className="relative p-2 rounded-xl text-slate-500 hover:bg-slate-50 transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
            </button>
            <button className="p-2 rounded-xl text-slate-500 hover:bg-slate-50 transition-colors">
              <Settings className="w-5 h-5" />
            </button>
            <div className="w-8 h-8 rounded-full bg-[#0785BC]/20 flex items-center justify-center text-[#0785BC] font-bold text-sm">A</div>
          </div>
        </header>

        <div className="p-8 space-y-6 overflow-y-auto">
          {/* Page header */}
          <div className={`flex items-start justify-between ${mounted ? "animate-fade-up" : "opacity-0"}`}>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Manage Users</h1>
              <p className="text-sm text-slate-500 mt-0.5">Manage platform users, roles, and access status.</p>
            </div>
            <button className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-[#0785BC] hover:bg-[#0672a0] active:scale-95 rounded-xl transition-all shadow-sm">
              <Plus className="w-4 h-4" />
              Add New User
            </button>
          </div>

          {/* ── Stat Cards ── */}
          <div className="grid grid-cols-3 gap-4">
            {stats.map((s, i) => (
              <div
                key={s.label}
                style={{ animationDelay: `${i * 75}ms` }}
                className={`bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center justify-between hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 ${mounted ? "animate-fade-up" : "opacity-0"}`}
              >
                <div>
                  <p className="text-sm text-slate-500 font-medium mb-1">{s.label}</p>
                  <p className={`text-3xl font-bold tabular-nums ${mounted ? "animate-count-up" : ""} ${
                    i === 0 ? "text-blue-600" : i === 1 ? "text-teal-600" : "text-red-500"
                  }`}>
                    {s.value}
                  </p>
                </div>
                <div className={`w-12 h-12 rounded-full ${s.iconBg} flex items-center justify-center`}>
                  {s.icon}
                </div>
              </div>
            ))}
          </div>

          {/* ── User Directory ── */}
          <div className={`bg-white rounded-2xl border border-slate-100 shadow-sm ${mounted ? "animate-fade-up delay-200" : "opacity-0"}`}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">User Directory</h2>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="text-sm border border-slate-200 rounded-xl px-3 py-1.5 text-slate-600 bg-white focus:outline-none focus:ring-2 focus:ring-[#0785BC] transition-all"
              >
                <option>All Roles</option>
                <option>Admin</option>
                <option>User</option>
              </select>
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left">
                  <th className="px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">User</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Department</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Role</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading
                  ? Array.from({ length: 3 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 5 }).map((_, j) => (
                          <td key={j} className="px-6 py-4">
                            <div className="h-4 bg-slate-100 rounded animate-pulse" />
                          </td>
                        ))}
                      </tr>
                    ))
                  : filtered.map((user, i) => (
                      <tr
                        key={user.id}
                        style={{ animationDelay: `${250 + i * 60}ms` }}
                        className={`hover:bg-slate-50/60 transition-colors group ${mounted ? "animate-fade-up" : "opacity-0"}`}
                      >
                        {/* User */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <Avatar name={user.full_name} color={avatarColors[i % avatarColors.length]} />
                            <div>
                              <p className="font-semibold text-slate-800">{user.full_name}</p>
                              <p className="text-xs text-slate-400 mt-0.5">{user.email}</p>
                            </div>
                          </div>
                        </td>

                        {/* Department */}
                        <td className="px-4 py-4 text-slate-600">{user.department ?? "—"}</td>

                        {/* Role */}
                        <td className="px-4 py-4">
                          <RoleBadge role={user.role} />
                        </td>

                        {/* Status */}
                        <td className="px-4 py-4">
                          <StatusBadge status={user.status ?? "active"} />
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-[#0785BC] active:scale-90 transition-all">
                              <Pencil className="w-4 h-4" />
                            </button>
                            {user.status === "inactive" ? (
                              <button
                                onClick={() => handleRestore(user.id)}
                                className="p-1.5 rounded-lg text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 active:scale-90 transition-all"
                              >
                                <Restore className="w-4 h-4" />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleDeactivate(user.id)}
                                className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 active:scale-90 transition-all"
                              >
                                <Ban className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
              <p className="text-sm text-slate-500">
                Showing {(page - 1) * PAGE_SIZE + 1} to {Math.min(page * PAGE_SIZE, total)} of {total} entries
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
                    className={`w-8 h-8 rounded-lg text-sm font-medium transition-all active:scale-95 ${
                      page === n ? "bg-[#0785BC] text-white" : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {n}
                  </button>
                ))}
                {totalPages > 3 && <span className="px-1 text-slate-400 text-sm">...</span>}
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
      </main>
    </div>
  );
}
