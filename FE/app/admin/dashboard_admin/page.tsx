"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Download,
  Package,
  Clock,
  Search,
  CheckCircle2,
  ChevronRight,
  BookOpen,
  AlertTriangle,
  RotateCcw,
  Bell,
  Check,
  X,
} from "lucide-react";
import * as XLSX from "xlsx";
import api from "@/lib/api";
import { AdminLayout } from "@/components/admin";

interface DashboardStats {
  items: {
    total: number;
    tersedia: number;
    dipinjam: number;
    dalamPemeliharaan: number;
    rusak: number;
  };
  categoryDistribution?: Array<{ id: string; name: string; count: number }>;
  borrowings: {
    aktif: number;
    pending: number;
    terlambat: number;
    dikembalikan: number;
  };
  laporanKerusakan: {
    menungguReview: number;
  };
  users: {
    totalAktif: number;
  };
  recentBorrowings?: any[];
  recentActivities?: Array<{
    id: string;
    title: string;
    message: string;
    type: string;
    created_at: string;
  }>;
}

interface PendingBorrowing {
  id: string;
  borrow_code: string;
  item_name: string;
  borrower_name: string;
  borrower_email: string;
  purpose: string;
  borrow_date: string;
  status: string;
}

function useMount() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  return mounted;
}

// ── Donut / Pie Chart Component ──
interface PieSlice {
  label: string;
  value: number;
  color: string;
}

function PieChart({ data, total }: { data: PieSlice[]; total: number }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const size = 180;
  const strokeWidth = 28;
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  let accumulated = 0;
  const validTotal = total > 0 ? total : 1;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-2">
      <div className="relative w-44 h-44 shrink-0 flex items-center justify-center">
        <svg width={size} height={size} className="-rotate-90">
          {data.map((slice, i) => {
            const ratio = slice.value / validTotal;
            const strokeDasharray = `${ratio * circumference} ${circumference}`;
            const strokeDashoffset = -accumulated * circumference;
            accumulated += ratio;

            return (
              <circle
                key={slice.label}
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke={slice.color}
                strokeWidth={hovered === i ? strokeWidth + 4 : strokeWidth}
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-300 cursor-pointer"
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
              />
            );
          })}
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
          <span className="text-2xl font-bold text-slate-800 tabular-nums">
            {hovered !== null ? data[hovered].value : total}
          </span>
          <span className="text-[11px] font-medium text-slate-400">
            {hovered !== null ? data[hovered].label : "Total Unit"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs w-full max-w-xs">
        {data.map((slice, i) => {
          const pct = total > 0 ? Math.round((slice.value / total) * 100) : 0;
          return (
            <div
              key={slice.label}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              className={`flex items-center gap-2 p-1.5 rounded-lg transition-colors cursor-pointer ${
                hovered === i ? "bg-slate-50 font-semibold" : "text-slate-600"
              }`}
            >
              <span
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: slice.color }}
              />
              <div className="flex-1 min-w-0">
                <p className="truncate text-[11px] text-slate-500">{slice.label}</p>
                <p className="font-semibold text-slate-800">
                  {slice.value} <span className="text-slate-400 font-normal">({pct}%)</span>
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function DashboardAdminPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [pendingList, setPendingList] = useState<PendingBorrowing[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const mounted = useMount();

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [dashRes, borrowRes] = await Promise.all([
        api.dashboard.getStats(),
        api.borrowings.getAll({ status: "Pending", limit: 10 }),
      ]);

      if (dashRes.status === "success" && dashRes.data) {
        setStats(dashRes.data as DashboardStats);
      }

      if (borrowRes.status === "success" && Array.isArray(borrowRes.data)) {
        const mapped: PendingBorrowing[] = (borrowRes.data as any[]).map((b) => {
          const user = b.users || {};
          const firstItem = b.borrowings_items?.[0]?.items || {};
          return {
            id: b.id,
            borrow_code: b.borrow_code || "-",
            item_name: firstItem.name || b.purpose || "Barang Peminjaman",
            borrower_name: user.name || "Peminjam",
            borrower_email: user.email || "-",
            purpose: b.purpose || "-",
            borrow_date: b.borrow_date
              ? new Date(b.borrow_date).toLocaleDateString("id-ID")
              : "-",
            status: b.status || "Pending",
          };
        });
        setPendingList(mapped);
      }
    } catch (err) {
      console.error("Gagal mengambil data dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    try {
      await api.borrowings.updateStatus(id, { status: "Dipinjam", admin_notes: "Disetujui admin" });
      setPendingList((prev) => prev.filter((item) => item.id !== id));
      if (stats) {
        setStats({
          ...stats,
          borrowings: {
            ...stats.borrowings,
            pending: Math.max(0, stats.borrowings.pending - 1),
            aktif: stats.borrowings.aktif + 1,
          },
        });
      }
    } catch (err) {
      alert("Gagal menyetujui peminjaman: " + (err as Error).message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt("Masukkan alasan penolakan (opsional):") || "Ditolak oleh admin";
    setActionLoading(id);
    try {
      await api.borrowings.updateStatus(id, { status: "Ditolak", admin_notes: reason });
      setPendingList((prev) => prev.filter((item) => item.id !== id));
      if (stats) {
        setStats({
          ...stats,
          borrowings: {
            ...stats.borrowings,
            pending: Math.max(0, stats.borrowings.pending - 1),
          },
        });
      }
    } catch (err) {
      alert("Gagal menolak peminjaman: " + (err as Error).message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleExport = () => {
    const reportData = [
      { Kategori: "Total Aset", Nilai: stats?.items.total || 0 },
      { Kategori: "Aset Tersedia", Nilai: stats?.items.tersedia || 0 },
      { Kategori: "Aset Dipinjam", Nilai: stats?.items.dipinjam || 0 },
      { Kategori: "Dalam Pemeliharaan", Nilai: stats?.items.dalamPemeliharaan || 0 },
      { Kategori: "Aset Rusak", Nilai: stats?.items.rusak || 0 },
      { Kategori: "Peminjaman Aktif", Nilai: stats?.borrowings.aktif || 0 },
      { Kategori: "Persetujuan Tertunda", Nilai: stats?.borrowings.pending || 0 },
      { Kategori: "Laporan Kerusakan", Nilai: stats?.laporanKerusakan.menungguReview || 0 },
      { Kategori: "Pengguna Aktif", Nilai: stats?.users.totalAktif || 0 },
    ];

    const ws = XLSX.utils.json_to_sheet(reportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Ringkasan Admin");
    XLSX.writeFile(wb, `Laporan-Dashboard-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const totalItems = stats?.items.total || 0;
  const pieData: PieSlice[] = [
    { label: "Tersedia", value: stats?.items.tersedia || 0, color: "#10B981" },
    { label: "Dipinjam", value: stats?.items.dipinjam || 0, color: "#0785BC" },
    { label: "Pemeliharaan", value: stats?.items.dalamPemeliharaan || 0, color: "#F59E0B" },
    { label: "Rusak", value: stats?.items.rusak || 0, color: "#EF4444" },
  ];

  const totalUnitsDisplay = (stats?.items as any)?.totalUnits ?? stats?.items.total ?? 0;
  const totalTypesDisplay = (stats?.items as any)?.totalTypes ?? 2;

  const statCards = [
    {
      label: "Total Aset",
      value: totalUnitsDisplay,
      sub: `${totalTypesDisplay} jenis barang (${stats?.items.tersedia ?? 0} unit siap pinjam)`,
      icon: <Package className="w-5 h-5 text-[#0785BC]" />,
      bg: "bg-blue-50",
    },
    {
      label: "Peminjaman Aktif",
      value: stats?.borrowings.aktif ?? 0,
      sub: `${stats?.borrowings.dikembalikan ?? 0} telah selesai`,
      icon: <BookOpen className="w-5 h-5 text-emerald-600" />,
      bg: "bg-emerald-50",
    },
    {
      label: "Persetujuan Tertunda",
      value: stats?.borrowings.pending ?? 0,
      sub: "Perlu diverifikasi segera",
      icon: <Clock className="w-5 h-5 text-amber-500" />,
      bg: "bg-amber-50",
    },
    {
      label: "Laporan Kerusakan",
      value: stats?.laporanKerusakan.menungguReview ?? 0,
      sub: "Menunggu peninjauan admin",
      icon: <AlertTriangle className="w-5 h-5 text-rose-500" />,
      bg: "bg-rose-50",
    },
  ];

  const filteredPending = pendingList.filter(
    (item) =>
      !searchQuery ||
      item.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.borrower_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.borrow_code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${mounted ? "animate-fade-up" : "opacity-0"}`}>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Ringkasan Dashboard</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Pantau metrik aset, peminjaman aktif, dan persetujuan tertunda.
            </p>
          </div>
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-[#0785BC] hover:bg-[#0672a0] active:scale-95 rounded-xl transition-all shadow-sm self-start sm:self-auto"
          >
            <Download className="w-4 h-4" />
            Export Excel
          </button>
        </div>

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((card, i) => (
            <div
              key={card.label}
              style={{ animationDelay: `${i * 60}ms` }}
              className={`bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 ${mounted ? "animate-fade-up" : "opacity-0"}`}
            >
              <div className="flex items-start justify-between mb-3">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{card.label}</p>
                <div className={`w-9 h-9 rounded-xl ${card.bg} flex items-center justify-center`}>
                  {card.icon}
                </div>
              </div>
              <p className="text-3xl font-bold text-slate-900 tabular-nums">
                {loading ? (
                  <span className="inline-block w-16 h-8 bg-slate-100 rounded animate-pulse" />
                ) : (
                  card.value.toLocaleString("id-ID")
                )}
              </p>
              <p className="text-xs text-slate-500 mt-1">{card.sub}</p>
            </div>
          ))}
        </div>

        {/* ── Visualisasi Pie Chart & Aktivitas ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Pie Chart */}
          <div className={`lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-6 ${mounted ? "animate-fade-up delay-150" : "opacity-0"}`}>
            <div className="flex items-center justify-between mb-4 border-b border-slate-50 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">Distribusi Status Aset</h2>
                <p className="text-xs text-slate-400 mt-0.5">Proporsi kondisi seluruh inventaris sarana prasarana</p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg">
                Real-time
              </span>
            </div>

            {loading ? (
              <div className="h-48 flex items-center justify-center">
                <div className="w-32 h-32 rounded-full border-4 border-slate-100 border-t-[#0785BC] animate-spin" />
              </div>
            ) : (
              <PieChart data={pieData} total={totalItems} />
            )}
          </div>

          {/* Aktivitas Terbaru */}
          <div className={`bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col ${mounted ? "animate-fade-up delay-200" : "opacity-0"}`}>
            <div className="flex items-center justify-between mb-4 border-b border-slate-50 pb-3">
              <h2 className="text-base font-bold text-slate-900">Aktivitas Terbaru</h2>
              <Link href="/admin/messages" className="text-xs font-semibold text-[#0785BC] hover:underline">
                Lihat Log
              </Link>
            </div>

            <div className="flex-1 overflow-y-auto max-h-56 space-y-3.5 pr-1">
              {stats?.recentActivities && stats.recentActivities.length > 0 ? (
                stats.recentActivities.map((act) => (
                  <div key={act.id} className="flex items-start gap-3 text-xs">
                    <div className="w-7 h-7 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                      {act.type === "pengembalian" ? (
                        <RotateCcw className="w-3.5 h-3.5 text-blue-500" />
                      ) : act.type === "kerusakan" ? (
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                      ) : (
                        <Bell className="w-3.5 h-3.5 text-[#0785BC]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 leading-snug">{act.title}</p>
                      <p className="text-slate-500 line-clamp-2 mt-0.5">{act.message}</p>
                      <p className="text-[10px] text-slate-400 mt-1">
                        {new Date(act.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center py-6 text-slate-400">
                  <CheckCircle2 className="w-8 h-8 mb-2 text-slate-300" />
                  <p className="text-xs font-medium">Belum ada aktivitas baru tercatat.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Persetujuan Tertunda Table ── */}
        <div className={`bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden ${mounted ? "animate-fade-up delay-250" : "opacity-0"}`}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-6 py-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900">Persetujuan Tertunda</h2>
              <p className="text-xs text-slate-400 mt-0.5">Daftar pengajuan peminjaman yang menunggu konfirmasi admin</p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Cari peminjam / kode..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0785BC] transition-all"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-slate-100 bg-slate-50/50">
                  <th className="px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Kode / Barang</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Peminjam</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Keperluan</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Tanggal</th>
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
                ) : filteredPending.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-slate-400 text-xs">
                      Tidak ada permohonan peminjaman yang menunggu persetujuan.
                    </td>
                  </tr>
                ) : (
                  filteredPending.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#0785BC] flex items-center justify-center shrink-0">
                            <Package className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800 text-xs">{row.item_name}</p>
                            <p className="text-[11px] text-slate-400">{row.borrow_code}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-medium text-slate-700 text-xs">{row.borrower_name}</p>
                        <p className="text-[11px] text-slate-400">{row.borrower_email}</p>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-600 max-w-xs truncate">
                        {row.purpose}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-500">
                        {row.borrow_date}
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            disabled={actionLoading === row.id}
                            onClick={() => handleApprove(row.id)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 rounded-lg transition-all disabled:opacity-50"
                          >
                            <Check className="w-3.5 h-3.5" /> Setujui
                          </button>
                          <button
                            disabled={actionLoading === row.id}
                            onClick={() => handleReject(row.id)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 active:scale-95 rounded-lg transition-all disabled:opacity-50"
                          >
                            <X className="w-3.5 h-3.5" /> Tolak
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="px-6 py-3 border-t border-slate-50 flex justify-end">
            <Link
              href="/admin/manajemen_peminjaman"
              className="text-xs font-semibold text-[#0785BC] flex items-center gap-1 hover:underline"
            >
              Lihat seluruh peminjaman <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
