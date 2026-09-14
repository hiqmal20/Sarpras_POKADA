"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  ArrowUpRight,
  TrendingUp,
  Activity,
  Layers,
} from "lucide-react";
import * as XLSX from "xlsx";
import api from "@/lib/api";
import { AdminLayout } from "@/components/admin";
import ExportModal from "@/components/ExportModal";
import { getNotificationTargetUrl } from "@/lib/notificationHelper";

interface DashboardStats {
  items: {
    total: number;
    tersedia: number;
    dipinjam: number;
    dalamPemeliharaan: number;
    rusak: number;
    rusakRingan?: number;
    totalUnits?: number;
    totalTypes?: number;
  };
  categoryDistribution?: Array<{
    id: string;
    name: string;
    count: number;
    totalUnits?: number;
  }>;
  borrowings: {
    aktif: number;
    pending: number;
    terlambat: number;
    dikembalikan: number;
  };
  laporanKerusakan: {
    menungguReview: number;
    sedangDiperbaiki?: number;
    selesai?: number;
    total?: number;
  };
  users: {
    totalAktif: number;
  };
  recentBorrowings?: any[];
  recentActivities?: Array<{
    id: string | number;
    title: string;
    message: string;
    type: string;
    created_at: string;
    action_url?: string;
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

function PieChart({
  data,
  total,
  unitLabel = "Total Unit",
}: {
  data: PieSlice[];
  total: number;
  unitLabel?: string;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const size = 180;
  const strokeWidth = 26;
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  const validTotal = total > 0 ? total : 1;
  let accumulated = 0;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-2">
      <div className="relative w-44 h-44 shrink-0 flex items-center justify-center">
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="#f1f5f9"
            strokeWidth={strokeWidth}
          />
          {data.map((slice, i) => {
            const ratio = validTotal > 0 ? slice.value / validTotal : 0;
            if (ratio <= 0) return null;
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

        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-2">
          <span className="text-2xl font-extrabold text-slate-900 tabular-nums">
            {hovered !== null ? data[hovered].value : total}
          </span>
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider truncate max-w-[120px]">
            {hovered !== null ? data[hovered].label : unitLabel}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs w-full max-w-xs">
        {data.map((slice, i) => {
          const pct = validTotal > 0 && slice.value > 0 ? Math.round((slice.value / validTotal) * 100) : 0;
          return (
            <div
              key={slice.label}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              className={`flex items-center gap-2 p-2 rounded-xl transition-all cursor-pointer border ${
                hovered === i
                  ? "bg-slate-50 border-slate-200 font-semibold shadow-2xs"
                  : "border-transparent text-slate-600 hover:bg-slate-50/70"
              }`}
            >
              <span
                className="w-3 h-3 rounded-full shrink-0 ring-2 ring-white shadow-2xs"
                style={{ backgroundColor: slice.color }}
              />
              <div className="flex-1 min-w-0">
                <p className="truncate text-[11px] text-slate-400 font-medium">{slice.label}</p>
                <p className="font-bold text-slate-800 text-xs">
                  {slice.value} <span className="text-slate-400 font-normal text-[10px]">({pct}%)</span>
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
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [pendingList, setPendingList] = useState<PendingBorrowing[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [chartView, setChartView] = useState<"status" | "category">("status");
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
              ? new Date(b.borrow_date).toLocaleDateString("id-ID", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })
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
      { Kategori: "Total Aset", Nilai: stats?.items.totalUnits ?? stats?.items.total ?? 0 },
      { Kategori: "Aset Tersedia", Nilai: stats?.items.tersedia || 0 },
      { Kategori: "Aset Dipinjam", Nilai: stats?.items.dipinjam || 0 },
      { Kategori: "Dalam Pemeliharaan", Nilai: stats?.items.dalamPemeliharaan || 0 },
      { Kategori: "Aset Rusak Berat", Nilai: stats?.items.rusak || 0 },
      { Kategori: "Aset Rusak Ringan", Nilai: stats?.items.rusakRingan || 0 },
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

  const totalUnitsDisplay = stats?.items.totalUnits ?? stats?.items.total ?? 0;
  const totalTypesDisplay = stats?.items.totalTypes ?? stats?.items.total ?? 0;

  const statusPieData: PieSlice[] = [
    { label: "Tersedia", value: stats?.items.tersedia || 0, color: "#10B981" },
    { label: "Dipinjam", value: stats?.items.dipinjam || 0, color: "#0785BC" },
    { label: "Pemeliharaan", value: stats?.items.dalamPemeliharaan || 0, color: "#F59E0B" },
    { label: "Rusak", value: stats?.items.rusak || 0, color: "#EF4444" },
  ];

  const categoryColors = ["#0785BC", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899", "#3B82F6", "#14B8A6", "#F97316"];
  const categoryPieData: PieSlice[] = (stats?.categoryDistribution || []).map((cat, i) => ({
    label: cat.name,
    value: cat.totalUnits ?? cat.count ?? 0,
    color: categoryColors[i % categoryColors.length],
  }));

  const activePieData = chartView === "status" ? statusPieData : (categoryPieData.length > 0 ? categoryPieData : statusPieData);
  const activePieTotal = chartView === "status"
    ? totalUnitsDisplay
    : (stats?.categoryDistribution || []).reduce((acc, c) => acc + (c.totalUnits ?? c.count ?? 0), 0) || totalUnitsDisplay;

  const statCards = [
    {
      label: "Total Inventaris",
      badge: "Aset Kampus",
      badgeColor: "bg-blue-50 text-blue-700 border-blue-100",
      value: totalUnitsDisplay,
      sub: `${totalTypesDisplay} jenis barang (${stats?.items.tersedia ?? 0} siap pinjam)`,
      link: "/admin/barang",
      icon: <Package className="w-5 h-5 text-[#0785BC]" />,
      bg: "bg-blue-500/10 border-blue-500/20 text-[#0785BC]",
    },
    {
      label: "Peminjaman Aktif",
      badge: "Sedang Berjalan",
      badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-100",
      value: stats?.borrowings.aktif ?? 0,
      sub: `${stats?.borrowings.dikembalikan ?? 0} pengembalian sukses`,
      link: "/admin/manajemen_peminjaman",
      icon: <BookOpen className="w-5 h-5 text-emerald-600" />,
      bg: "bg-emerald-500/10 border-emerald-500/20 text-emerald-600",
    },
    {
      label: "Persetujuan Tertunda",
      badge: "Perlu Tindakan",
      badgeColor: "bg-amber-50 text-amber-700 border-amber-100",
      value: stats?.borrowings.pending ?? 0,
      sub: "Menunggu verifikasi admin",
      link: "/admin/manajemen_peminjaman",
      icon: <Clock className="w-5 h-5 text-amber-600" />,
      bg: "bg-amber-500/10 border-amber-500/20 text-amber-600",
    },
    {
      label: "Laporan Kerusakan",
      badge: "Insiden Aset",
      badgeColor: "bg-rose-50 text-rose-700 border-rose-100",
      value: stats?.laporanKerusakan.menungguReview ?? 0,
      sub: `${stats?.laporanKerusakan.sedangDiperbaiki ?? 0} sedang dalam pemeliharaan teknisi`,
      link: "/admin/rekap_laporan",
      icon: <AlertTriangle className="w-5 h-5 text-rose-600" />,
      bg: "bg-rose-500/10 border-rose-500/20 text-rose-600",
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
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-[#0785BC]/10 border border-[#0785BC]/20 flex items-center justify-center text-[#0785BC]">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Ringkasan Dashboard</h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Pantau metrik aset sarpras, peminjaman aktif, dan persetujuan tertunda secara real-time.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowExportModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-gradient-to-r from-[#0785BC] to-[#0672a0] hover:from-[#0672a0] hover:to-[#055c82] active:scale-95 rounded-xl transition-all shadow-sm hover:shadow self-start sm:self-auto"
          >
            <Download className="w-4 h-4" />
            Ekspor Master Data (XLSX / CSV)
          </button>
        </div>

        {/* ── 4 Modern Stat Cards (Desain Konsisten Seperti Rekap Laporan) ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4.5">
          {statCards.map((card, i) => (
            <Link
              href={card.link}
              key={card.label}
              style={{ animationDelay: `${i * 60}ms` }}
              className={`group bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:border-slate-200 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between ${mounted ? "animate-fade-up" : "opacity-0"}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border mb-2 ${card.badgeColor}`}>
                    {card.badge}
                  </span>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{card.label}</p>
                </div>
                <div className={`w-11 h-11 rounded-2xl ${card.bg} border flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
                  {card.icon}
                </div>
              </div>

              <div className="mt-3">
                <p className="text-3xl font-extrabold text-slate-900 tabular-nums">
                  {loading ? (
                    <span className="inline-block w-16 h-8 bg-slate-100 rounded animate-pulse" />
                  ) : (
                    card.value.toLocaleString("id-ID")
                  )}
                </p>
                <div className="pt-3 mt-2 border-t border-slate-50 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-400 truncate">{card.sub}</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-[#0785BC] shrink-0 transition-colors" />
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* ── Visualisasi Pie Chart & Aktivitas ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Pie Chart */}
          <div className={`lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col justify-between ${mounted ? "animate-fade-up delay-150" : "opacity-0"}`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 border-b border-slate-50 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  {chartView === "status" ? "Distribusi Status Inventaris" : "Distribusi Kategori Inventaris"}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {chartView === "status"
                    ? "Proporsi status unit inventaris sarana prasarana"
                    : "Distribusi total unit aset sarpras berdasarkan kategori"}
                </p>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <div className="inline-flex p-1 bg-slate-100 rounded-xl text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setChartView("status")}
                    className={`px-3 py-1 rounded-lg transition-all text-xs ${
                      chartView === "status"
                        ? "bg-white text-slate-900 shadow-2xs font-bold"
                        : "text-slate-500 hover:text-slate-800 font-medium"
                    }`}
                  >
                    Status
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartView("category")}
                    className={`px-3 py-1 rounded-lg transition-all text-xs ${
                      chartView === "category"
                        ? "bg-white text-slate-900 shadow-2xs font-bold"
                        : "text-slate-500 hover:text-slate-800 font-medium"
                    }`}
                  >
                    Kategori
                  </button>
                </div>
                <span className="hidden sm:flex text-[11px] font-bold px-2.5 py-1 bg-blue-50 text-[#0785BC] rounded-lg border border-blue-100 items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0785BC] animate-pulse" />
                  Live Sync
                </span>
              </div>
            </div>

            {loading ? (
              <div className="h-48 flex items-center justify-center">
                <div className="w-24 h-24 rounded-full border-4 border-slate-100 border-t-[#0785BC] animate-spin" />
              </div>
            ) : (
              <PieChart
                data={activePieData}
                total={activePieTotal}
                unitLabel={chartView === "status" ? "Total Unit" : "Total Item"}
              />
            )}
          </div>

          {/* Aktivitas Terbaru */}
          <div className={`bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col ${mounted ? "animate-fade-up delay-200" : "opacity-0"}`}>
            <div className="flex items-center justify-between mb-4 border-b border-slate-50 pb-3">
              <h2 className="text-base font-bold text-slate-900">Aktivitas Terbaru</h2>
              <Link href="/admin/manajemen_peminjaman" className="text-xs font-semibold text-[#0785BC] hover:underline flex items-center gap-0.5">
                Lihat Log <ChevronRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="flex-1 overflow-y-auto max-h-56 space-y-2 pr-1">
              {stats?.recentActivities && stats.recentActivities.length > 0 ? (
                stats.recentActivities.map((act) => {
                  const targetUrl = getNotificationTargetUrl(act, true);
                  return (
                    <div
                      key={act.id}
                      onClick={() => router.push(targetUrl)}
                      className="flex items-start gap-3 text-xs p-2 rounded-xl cursor-pointer hover:bg-slate-50 transition-all group"
                      title="Klik untuk melihat transaksi"
                    >
                      <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 group-hover:bg-blue-50 transition-all">
                        {act.type === "pengembalian" ? (
                          <RotateCcw className="w-4 h-4 text-blue-500" />
                        ) : act.type === "kerusakan" ? (
                          <AlertTriangle className="w-4 h-4 text-rose-500" />
                        ) : (
                          <Bell className="w-4 h-4 text-[#0785BC]" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p className="font-semibold text-slate-800 leading-snug group-hover:text-[#0785BC] transition-colors">{act.title}</p>
                          <span className="text-[10px] font-semibold text-[#0785BC] opacity-0 group-hover:opacity-100 transition-opacity flex items-center shrink-0">
                            Buka <ChevronRight className="w-3 h-3" />
                          </span>
                        </div>
                        <p className="text-slate-500 line-clamp-2 mt-0.5 text-[11px] leading-relaxed">{act.message}</p>
                        <p className="text-[10px] text-slate-400 mt-1">
                          {new Date(act.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center py-6 text-slate-400">
                  <CheckCircle2 className="w-8 h-8 mb-2 text-slate-300" />
                  <p className="text-xs font-medium">Belum ada aktivitas baru tercatat.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Persetujuan Tertunda Table (Modern Table Card) ── */}
        <div className={`bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden ${mounted ? "animate-fade-up delay-250" : "opacity-0"}`}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-6 py-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">Persetujuan Tertunda</h2>
                {pendingList.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                    {pendingList.length} perlu review
                  </span>
                )}
              </div>
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
                <tr className="text-left border-b border-slate-100 bg-slate-50/60 text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                  <th className="px-6 py-3.5">Kode & Barang</th>
                  <th className="px-4 py-3.5">Peminjam</th>
                  <th className="px-4 py-3.5">Keperluan</th>
                  <th className="px-4 py-3.5">Tanggal Pengajuan</th>
                  <th className="px-6 py-3.5 text-right">Aksi Tindakan</th>
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
                      <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      Semua peminjaman telah disetujui / tidak ada pengajuan tertunda.
                    </td>
                  </tr>
                ) : (
                  filteredPending.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#0785BC] flex items-center justify-center shrink-0 border border-blue-100">
                            <Package className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 text-xs">{row.item_name}</p>
                            <p className="text-[10px] font-mono text-slate-400 mt-0.5">{row.borrow_code}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-slate-800 text-xs">{row.borrower_name}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{row.borrower_email}</p>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-600 max-w-xs truncate">
                        {row.purpose}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-500 whitespace-nowrap">
                        {row.borrow_date}
                      </td>
                      <td className="px-6 py-3.5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          <button
                            disabled={actionLoading === row.id}
                            onClick={() => handleApprove(row.id)}
                            className="inline-flex items-center gap-1 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 rounded-xl transition-all shadow-2xs disabled:opacity-50"
                          >
                            <Check className="w-3.5 h-3.5 stroke-[2.5]" /> Setujui
                          </button>
                          <button
                            disabled={actionLoading === row.id}
                            onClick={() => handleReject(row.id)}
                            className="inline-flex items-center gap-1 px-3.5 py-1.5 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 active:scale-95 rounded-xl transition-all border border-rose-200/60 disabled:opacity-50"
                          >
                            <X className="w-3.5 h-3.5 stroke-[2.5]" /> Tolak
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="px-6 py-3.5 border-t border-slate-50 flex justify-end bg-slate-50/30">
            <Link
              href="/admin/manajemen_peminjaman"
              className="text-xs font-bold text-[#0785BC] flex items-center gap-1 hover:underline"
            >
              Lihat Seluruh Data Peminjaman <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* ── Modal Master Export (Seluruh Modul & Kategori Tanggal) ── */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        isMasterArchive={true}
        title="Ekspor Rekapitulasi Master SARPRAS"
        description="Unduh berkas arsip lengkap seluruh modul operasional kampus."
        moduleName="Master_Archive"
      />
    </AdminLayout>
  );
}
