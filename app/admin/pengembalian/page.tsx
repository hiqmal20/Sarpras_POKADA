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
  Filter,
  Clock,
  CheckCircle2,
  Package,
  ChevronLeft,
  ChevronRight,
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

interface ReturnItem {
  id: string;
  item_name: string;
  item_code: string;
  borrower_name: string;
  due_date: string;        // "23 Okt 2023" | "Hari Ini 17:00 WIB" | ...
  status: "overdue" | "due_today" | "active";
  fine?: string;           // "Rp 50.000"
  overdue_days?: number;
}

function useMount() {
  const [m, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  return m;
}

// ── Status Badge ──
function StatusBadge({ status }: { status: ReturnItem["status"] }) {
  if (status === "overdue")
    return (
      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-500 text-white uppercase tracking-wide">
        Overdue
      </span>
    );
  if (status === "due_today")
    return (
      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500 text-white uppercase tracking-wide">
        Due Today
      </span>
    );
  return (
    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500 text-white uppercase tracking-wide">
      Active
    </span>
  );
}

// ── Avatar initials ──
function Avatar({ name, color }: { name: string; color: string }) {
  const initials = name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${color}`}>
      {initials}
    </div>
  );
}

const avatarColors = ["bg-teal-500", "bg-blue-500", "bg-purple-500", "bg-amber-500", "bg-rose-500"];

const mockData: ReturnItem[] = [
  { id: "1", item_name: "Projector Epson EB-X51", item_code: "INV-PRJ-004", borrower_name: "Ahmad Subarjo", due_date: "23 Okt 2023",        status: "overdue",   fine: "Rp 50.000", overdue_days: 2 },
  { id: "2", item_name: "Kamera Canon 90D",       item_code: "INV-CAM-012", borrower_name: "Budi Waseso",   due_date: "Hari Ini 17:00 WIB", status: "due_today"  },
  { id: "3", item_name: "Logitech Presenter R400", item_code: "INV-ACC-045", borrower_name: "Citra Dewi",   due_date: "27 Okt 2023",        status: "active"     },
];

const PAGE_SIZE = 10;

export default function PengembalianPage() {
  const [returns, setReturns]   = useState<ReturnItem[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [page, setPage]         = useState(1);
  const [total, setTotal]       = useState(24);
  const mounted = useMount();

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const res = await api.returns.getAll();
      if (res.status === "success" && res.data && (res.data as any[]).length > 0) {
        setReturns(res.data as ReturnItem[]);
        if (res.total) setTotal(res.total);
      } else {
        setReturns(mockData);
        setTotal(24);
      }
      setLoading(false);
    }
    fetchData();
  }, [page]);

  const filtered = returns.filter(
    (r) =>
      !search ||
      r.item_name.toLowerCase().includes(search.toLowerCase()) ||
      r.borrower_name.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const stats = [
    { label: "Menunggu Pengembalian", value: 24, valueColor: "text-slate-900",   icon: <Clock className="w-5 h-5 text-blue-500" />,       iconBg: "bg-blue-50"    },
    { label: "Terlambat",             value: 5,  valueColor: "text-red-500",     icon: <AlertTriangle className="w-5 h-5 text-red-500" />, iconBg: "bg-red-50"     },
    { label: "Dikembalikan Hari Ini", value: 12, valueColor: "text-slate-900",   icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" />, iconBg: "bg-emerald-50" },
  ];

  async function handleConfirm(id: string) {
    await api.returns.create({ borrowing_id: id, notes: "Dikonfirmasi admin" });
    setReturns((prev) => prev.filter((r) => r.id !== id));
    setTotal((t) => Math.max(0, t - 1));
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
                  href === "/admin/pengembalian"
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
              placeholder="Cari data pengembalian..."
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
          <div className={mounted ? "animate-fade-up" : "opacity-0"}>
            <h1 className="text-2xl font-bold text-slate-900">Manajemen Pengembalian</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Daftar barang yang perlu dikembalikan atau melewati batas waktu peminjaman.
            </p>
          </div>

          {/* ── Stat Cards ── */}
          <div className="grid grid-cols-3 gap-4">
            {stats.map((s, i) => (
              <div
                key={s.label}
                style={{ animationDelay: `${i * 75}ms` }}
                className={`bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 ${mounted ? "animate-fade-up" : "opacity-0"}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider leading-snug">
                    {s.label}
                  </p>
                  <div className={`w-9 h-9 rounded-xl ${s.iconBg} flex items-center justify-center shrink-0`}>
                    {s.icon}
                  </div>
                </div>
                <p className={`text-3xl font-bold tabular-nums ${s.valueColor} ${mounted ? "animate-count-up" : ""}`}>
                  {s.value}
                </p>
              </div>
            ))}
          </div>

          {/* ── Daftar Aktif Table ── */}
          <div className={`bg-white rounded-2xl border border-slate-100 shadow-sm ${mounted ? "animate-fade-up delay-200" : "opacity-0"}`}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">Daftar Aktif</h2>
              <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors">
                <Filter className="w-3.5 h-3.5" /> Filter
              </button>
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left">
                  <th className="px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Barang</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Peminjam</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Jatuh Tempo</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Status / Denda</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">Aksi</th>
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
                  : filtered.map((row, i) => (
                      <tr
                        key={row.id}
                        style={{ animationDelay: `${250 + i * 60}ms` }}
                        className={`hover:bg-slate-50/60 transition-colors group ${mounted ? "animate-fade-up" : "opacity-0"}`}
                      >
                        {/* Barang */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 group-hover:bg-[#0785BC]/10 transition-colors">
                              <Package className="w-4 h-4 text-slate-400 group-hover:text-[#0785BC] transition-colors" />
                            </div>
                            <div>
                              <p className="font-semibold text-slate-800">{row.item_name}</p>
                              <p className="text-xs text-slate-400 mt-0.5">ID: {row.item_code}</p>
                            </div>
                          </div>
                        </td>

                        {/* Peminjam */}
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2.5">
                            <Avatar name={row.borrower_name} color={avatarColors[i % avatarColors.length]} />
                            <span className="font-medium text-slate-700">{row.borrower_name}</span>
                          </div>
                        </td>

                        {/* Jatuh Tempo */}
                        <td className="px-4 py-4">
                          {row.status === "overdue" ? (
                            <div>
                              <p className="font-semibold text-red-500">{row.due_date}</p>
                              <p className="text-xs text-red-400 mt-0.5">Terlambat {row.overdue_days} Hari</p>
                            </div>
                          ) : (
                            <p className="text-slate-600">{row.due_date}</p>
                          )}
                        </td>

                        {/* Status / Denda */}
                        <td className="px-4 py-4">
                          <div className="space-y-1">
                            <StatusBadge status={row.status} />
                            {row.fine && (
                              <p className="text-xs font-semibold text-slate-600 mt-1">{row.fine}</p>
                            )}
                            {!row.fine && <p className="text-xs text-slate-300">-</p>}
                          </div>
                        </td>

                        {/* Aksi */}
                        <td className="px-6 py-4 text-right">
                          {row.status !== "active" ? (
                            <button
                              onClick={() => handleConfirm(row.id)}
                              className="px-4 py-2 text-xs font-bold text-white bg-[#0785BC] hover:bg-[#0672a0] active:scale-95 rounded-xl transition-all shadow-sm"
                            >
                              Konfirmasi Kembali
                            </button>
                          ) : (
                            <button className="text-sm font-semibold text-slate-500 hover:text-[#0785BC] transition-colors">
                              Lihat Detail
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
              <p className="text-sm text-slate-500">
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
