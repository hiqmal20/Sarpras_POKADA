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
  Activity,
  Layers,
  Sparkles,
  RefreshCw,
  Terminal,
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

// ── Donut / Pie Chart Component (n8n Node Visualizer Aesthetic) ──
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
  const size = 240;
  const strokeWidth = 24;
  const center = 120;
  const radius = 80;
  const circumference = 2 * Math.PI * radius;

  const validTotal = total > 0 ? total : 1;
  let accumulated = 0;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-around gap-6 lg:gap-10 py-4 px-2 w-full">
      {/* ── Symmetrical Donut Canvas (Clean Flat Joins, No Overlap) ── */}
      <div className="relative w-48 h-48 sm:w-56 sm:h-56 shrink-0 flex items-center justify-center p-2">
        <svg
          viewBox="0 0 240 240"
          className="w-full h-full -rotate-90 overflow-visible"
        >
          {/* Background Track */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="#f1f5f9"
            strokeWidth={strokeWidth}
          />
          {/* Dynamic Data Slices */}
          {data.map((slice, i) => {
            const ratio = validTotal > 0 ? slice.value / validTotal : 0;
            if (ratio <= 0) return null;
            const strokeDasharray = `${ratio * circumference} ${circumference}`;
            const strokeDashoffset = -accumulated * circumference;
            accumulated += ratio;
            const isHovered = hovered === i;
            const isAnyHovered = hovered !== null;

            return (
              <circle
                key={slice.label}
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke={slice.color}
                strokeWidth={isHovered ? strokeWidth + 2 : strokeWidth}
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="butt"
                style={{
                  opacity: isAnyHovered ? (isHovered ? 1 : 0.45) : 1,
                  filter: isHovered ? "drop-shadow(0 0 6px rgba(0,0,0,0.18))" : "none",
                  transition: "all 0.2s ease",
                  transformOrigin: "center",
                }}
                className="cursor-pointer"
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
              />
            );
          })}
        </svg>

        {/* Center Label Metric */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-4">
          <span className="text-3xl font-black text-slate-900 tabular-nums tracking-tight transition-transform duration-200">
            {hovered !== null ? data[hovered].value : total}
          </span>
          <span className="text-[11px] font-mono font-semibold text-slate-400 uppercase tracking-wider truncate max-w-[130px] mt-0.5">
            {hovered !== null ? data[hovered].label : unitLabel}
          </span>
        </div>
      </div>

      {/* ── Legend Breakdown Grid ── */}
      <div className="grid grid-cols-2 gap-2.5 text-xs w-full max-w-sm shrink-0">
        {data.map((slice, i) => {
          const pct = validTotal > 0 && slice.value > 0 ? Math.round((slice.value / validTotal) * 100) : 0;
          return (
            <div
              key={slice.label}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              className={`flex items-center gap-2.5 p-2.5 rounded-xl transition-all cursor-pointer border ${
                hovered === i
                  ? "bg-slate-100/90 border-slate-300 font-semibold shadow-2xs scale-[1.02]"
                  : "border-slate-200/80 bg-slate-50/50 text-slate-600 hover:bg-slate-100/60"
              }`}
            >
              <span
                className="w-3 h-3 rounded-full shrink-0 ring-2 ring-white shadow-2xs"
                style={{ backgroundColor: slice.color }}
              />
              <div className="flex-1 min-w-0">
                <p className="truncate text-[11px] text-slate-500 font-medium">{slice.label}</p>
                <p className="font-mono font-bold text-slate-900 text-xs">
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

  // Modern structured stat cards with Pokada campus colors & clean layout
  const statCards = [
    {
      label: "Total Inventaris",
      tag: "ASET KAMPUS",
      tagColor: "bg-sky-50 text-sky-700 border-sky-200",
      value: totalUnitsDisplay,
      sub: `${totalTypesDisplay} jenis barang • ${stats?.items.tersedia ?? 0} unit siap pinjam`,
      link: "/admin/barang",
      icon: <Package className="w-4 h-4 text-[#0785BC]" />,
      accentColor: "#0785BC",
    },
    {
      label: "Peminjaman Aktif",
      tag: "SEDANG BERJALAN",
      tagColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
      value: stats?.borrowings.aktif ?? 0,
      sub: `${stats?.borrowings.dikembalikan ?? 0} transaksi pengembalian tuntas`,
      link: "/admin/manajemen_peminjaman",
      icon: <BookOpen className="w-4 h-4 text-emerald-600" />,
      accentColor: "#10B981",
    },
    {
      label: "Persetujuan Tertunda",
      tag: "PERLU TINDAKAN",
      tagColor: "bg-amber-50 text-amber-700 border-amber-200",
      value: stats?.borrowings.pending ?? 0,
      sub: "Menunggu verifikasi admin laboratorium",
      link: "/admin/manajemen_peminjaman",
      icon: <Clock className="w-4 h-4 text-amber-600" />,
      accentColor: "#F59E0B",
    },
    {
      label: "Laporan Kerusakan",
      tag: "INSIDEN ASET",
      tagColor: "bg-rose-50 text-rose-700 border-rose-200",
      value: stats?.laporanKerusakan.menungguReview ?? 0,
      sub: `${stats?.laporanKerusakan.sedangDiperbaiki ?? 0} sedang proses perbaikan teknisi`,
      link: "/admin/rekap_laporan",
      icon: <AlertTriangle className="w-4 h-4 text-rose-600" />,
      accentColor: "#EF4444",
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
        {/* ── Top Header Banner (Rapi & Terstruktur Kampus) ── */}
        <div className={`bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${mounted ? "animate-fade-up" : "opacity-0"}`}>
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-100 text-[#0785BC] flex items-center justify-center font-bold shadow-2xs">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-900 tracking-tight">Ringkasan Dashboard Sarpras</h1>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Sistem Aktif
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Pantau metrik aset inventaris, pengajuan peminjaman, dan operasional kampus secara real-time.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={fetchDashboardData}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-all active:scale-95 shadow-2xs"
              title="Perbarui Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loading ? "animate-spin" : ""}`} />
              Segarkan
            </button>
            <button
              onClick={() => setShowExportModal(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-[#0785BC] hover:bg-[#0671a0] active:scale-95 rounded-xl transition-all shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              Ekspor Master Data
            </button>
          </div>
        </div>

        {/* ── 4 Structured Stat Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((card, i) => (
            <Link
              href={card.link}
              key={card.label}
              style={{ animationDelay: `${i * 60}ms` }}
              className={`group bg-white rounded-2xl p-4.5 border border-slate-200 shadow-2xs hover:border-slate-300 hover:shadow-md transition-all duration-200 flex flex-col justify-between ${mounted ? "animate-fade-up" : "opacity-0"}`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${card.tagColor}`}>
                    {card.tag}
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center group-hover:scale-105 transition-transform">
                    {card.icon}
                  </div>
                </div>

                <p className="text-xs font-medium text-slate-500 mt-2.5">{card.label}</p>
                <p className="text-2xl font-black text-slate-900 tabular-nums tracking-tight mt-0.5">
                  {loading ? (
                    <span className="inline-block w-16 h-7 bg-slate-100 rounded animate-pulse" />
                  ) : (
                    card.value.toLocaleString("id-ID")
                  )}
                </p>
              </div>

              <div className="pt-2.5 mt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-400 truncate max-w-[200px]">{card.sub}</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-[#0785BC] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0" />
              </div>
            </Link>
          ))}
        </div>

        {/* ── Central Visualization & Live Activity Stream ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Donut Distribution Card */}
          <div className={`lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 flex flex-col justify-between ${mounted ? "animate-fade-up delay-150" : "opacity-0"}`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                    {chartView === "status" ? "Distribusi Status Unit Inventaris" : "Distribusi Kategori Inventaris"}
                  </h2>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Proporsi kuantitas dan ketersediaan sarana prasarana kampus.
                </p>
              </div>

              {/* Segmented control toggle like n8n node settings */}
              <div className="inline-flex p-0.5 bg-slate-100 rounded-lg border border-slate-200 text-xs font-medium self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setChartView("status")}
                  className={`px-3 py-1 rounded-md transition-all text-xs font-semibold ${
                    chartView === "status"
                      ? "bg-white text-slate-900 shadow-2xs"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  Status
                </button>
                <button
                  type="button"
                  onClick={() => setChartView("category")}
                  className={`px-3 py-1 rounded-md transition-all text-xs font-semibold ${
                    chartView === "category"
                      ? "bg-white text-slate-900 shadow-2xs"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  Kategori
                </button>
              </div>
            </div>

            {loading ? (
              <div className="h-52 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full border-3 border-slate-200 border-t-[#0785BC] animate-spin" />
              </div>
            ) : (
              <PieChart
                data={activePieData}
                total={activePieTotal}
                unitLabel={chartView === "status" ? "Total Unit" : "Total Item"}
              />
            )}
          </div>

          {/* Real-time Activity Stream */}
          <div className={`bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 flex flex-col ${mounted ? "animate-fade-up delay-200" : "opacity-0"}`}>
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900 tracking-tight">Aktivitas Realtime</h2>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <Link href="/admin/manajemen_peminjaman" className="text-[11px] font-semibold text-[#0785BC] hover:underline flex items-center gap-0.5">
                Log Transaksi &rarr;
              </Link>
            </div>

            <div className="flex-1 overflow-y-auto max-h-56 space-y-2.5 pr-1">
              {stats?.recentActivities && stats.recentActivities.length > 0 ? (
                stats.recentActivities.map((act) => {
                  const targetUrl = getNotificationTargetUrl(act, true);
                  return (
                    <div
                      key={act.id}
                      onClick={() => router.push(targetUrl)}
                      className="flex items-start gap-2.5 text-xs p-2 rounded-lg cursor-pointer hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all group"
                      title="Klik untuk membuka detail transaksi"
                    >
                      <div className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-sky-50 transition-colors">
                        {act.type === "pengembalian" ? (
                          <RotateCcw className="w-3.5 h-3.5 text-blue-600" />
                        ) : act.type === "kerusakan" ? (
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                        ) : (
                          <Bell className="w-3.5 h-3.5 text-[#0785BC]" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p className="font-semibold text-slate-900 text-xs truncate group-hover:text-[#0785BC] transition-colors">{act.title}</p>
                          <span className="text-[9px] font-mono text-slate-400 shrink-0">
                            {new Date(act.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB
                          </span>
                        </div>
                        <p className="text-slate-500 line-clamp-2 mt-0.5 text-[11px] leading-snug">{act.message}</p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center py-8 text-slate-400">
                  <CheckCircle2 className="w-7 h-7 mb-1.5 text-slate-300" />
                  <p className="text-xs font-medium">Belum ada aktivitas baru hari ini.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Persetujuan Tertunda Table (Structured Linear/ChatGPT Table) ── */}
        <div className={`bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden ${mounted ? "animate-fade-up delay-250" : "opacity-0"}`}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-5 py-3.5 border-b border-slate-200/80 bg-slate-50/50">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900 tracking-tight">Antrean Persetujuan Tertunda</h2>
                {pendingList.length > 0 && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-50 text-amber-700 border border-amber-200">
                    {pendingList.length} WAITING
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">Pengajuan peminjaman yang membutuhkan otorisasi admin</p>
            </div>
            <div className="relative w-full sm:w-60">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Cari peminjam / kode..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0785BC]/30 focus:border-[#0785BC] transition-all"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left border-b border-slate-200/80 bg-slate-50/80 text-slate-500 font-mono text-[10px] uppercase tracking-wider">
                  <th className="px-5 py-2.5">Barang & Kode</th>
                  <th className="px-4 py-2.5">Peminjam</th>
                  <th className="px-4 py-2.5">Keperluan</th>
                  <th className="px-4 py-2.5">Tanggal</th>
                  <th className="px-5 py-2.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 5 }).map((_, j) => (
                        <td key={j} className="px-5 py-3">
                          <div className="h-4 bg-slate-100 rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : filteredPending.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-slate-400 text-xs">
                      <CheckCircle2 className="w-7 h-7 mx-auto mb-1 text-slate-300" />
                      Tidak ada antrean pengajuan tertunda saat ini.
                    </td>
                  </tr>
                ) : (
                  filteredPending.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-sky-50 text-[#0785BC] flex items-center justify-center shrink-0 border border-sky-100">
                            <Package className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 text-xs">{row.item_name}</p>
                            <span className="font-mono text-[10px] text-slate-400">{row.borrow_code}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-900 text-xs">{row.borrower_name}</p>
                        <p className="text-[10px] text-slate-400 font-mono truncate">{row.borrower_email}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-600 max-w-xs truncate text-[11px]">
                        {row.purpose}
                      </td>
                      <td className="px-4 py-3 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                        {row.borrow_date}
                      </td>
                      <td className="px-5 py-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            disabled={actionLoading === row.id}
                            onClick={() => handleApprove(row.id)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 rounded-lg transition-all disabled:opacity-50 shadow-2xs"
                          >
                            <Check className="w-3.5 h-3.5" /> Setujui
                          </button>
                          <button
                            disabled={actionLoading === row.id}
                            onClick={() => handleReject(row.id)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 active:scale-95 rounded-lg transition-all border border-rose-200 disabled:opacity-50"
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

          <div className="px-5 py-2.5 border-t border-slate-100 flex justify-end bg-slate-50/50">
            <Link
              href="/admin/manajemen_peminjaman"
              className="text-xs font-semibold text-[#0785BC] flex items-center gap-1 hover:underline"
            >
              Lihat Seluruh Peminjaman <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* ── Modal Master Export ── */}
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
