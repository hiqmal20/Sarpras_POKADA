"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  BookOpen,
  MessageSquare,
  Package,
  Clock,
  CheckCircle2,
  ClipboardList,
  AlertTriangle,
  ArrowRight,
  User,
  Box,
  Layers,
  ChevronRight,
} from "lucide-react";
import api, { getCurrentUser } from "@/lib/api";
import { UserLayout } from "@/components/user";
import { useLanguage } from "@/lib/i18n";
import { getSocket } from "@/lib/socket";

interface BorrowingItem {
  id: string;
  borrow_code: string;
  purpose: string;
  borrow_date: string;
  planned_return_date?: string;
  actual_return_date?: string;
  status: string;
  created_at: string;
  borrowings_items?: Array<{
    id: string;
    items?: {
      id: string;
      name: string;
      code: string;
      image_url?: string;
    };
  }>;
}

interface CatalogItem {
  id: string;
  name: string;
  category?: { name: string } | string;
  categories?: { name: string };
  image_url?: string;
  available_stock?: number;
  stock?: number;
}

interface PieSlice {
  label: string;
  value: number;
  color: string;
}

// ── Interactive Pie / Donut Chart ──
function StatusPieChart({ data, total }: { data: PieSlice[]; total: number }) {
  const { t } = useLanguage();
  const tr = (key: string, fallback: string) => {
    const v = t(key);
    return v === key ? fallback : v;
  };
  const [hovered, setHovered] = useState<number | null>(null);
  const size = 180;
  const strokeWidth = 26;
  const pad = 6;
  const radius = (size - strokeWidth) / 2 - pad;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  const validTotal = total > 0 ? total : 1;

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-center">
        <div className="w-24 h-24 rounded-full border-4 border-dashed border-slate-200 flex items-center justify-center mb-3">
          <Layers className="w-8 h-8 text-slate-300" />
        </div>
        <p className="text-sm font-semibold text-slate-700">{tr("dash.no_activity", "Belum Ada Peminjaman")}</p>
        <p className="text-xs text-slate-400 mt-1 max-w-xs">
          {tr("dash.no_activity_sub", "Anda belum memiliki pengajuan peminjaman barang. Silakan ajukan dari katalog.")}
        </p>
        <Link
          href="/user/item_catalog"
          className="mt-4 px-4 py-2 text-xs font-semibold bg-[#0785BC] text-white rounded-xl hover:bg-[#0672a0] transition-colors inline-flex items-center gap-1.5"
        >
          <BookOpen className="w-3.5 h-3.5" />
          {tr("dash.open_catalog", "Buka Katalog Barang")}
        </Link>
      </div>
    );
  }

  const GAP = data.filter((s) => s.value > 0).length > 1 ? 3 : 0;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-2">
      {/* SVG Donut Circle */}
      <div
        className="relative shrink-0 flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        <svg width={size} height={size} className="-rotate-90 block overflow-visible">
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="#eef2f7"
            strokeWidth={strokeWidth}
          />
          {data.map((slice, i) => {
            if (slice.value === 0) return null;
            const ratio = slice.value / validTotal;
            const segLen = Math.max(ratio * circumference - GAP, 0.5);
            const strokeDasharray = `${segLen} ${circumference - segLen}`;
            const accumulated = data.slice(0, i).reduce((sum, entry) => sum + entry.value / validTotal, 0);
            const strokeDashoffset = -accumulated * circumference + GAP / 2;

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
                strokeLinecap="butt"
                className="transition-all duration-300 cursor-pointer"
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
              />
            );
          })}
        </svg>

        {/* Center Label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
          <span className="text-2xl font-bold text-slate-800 tabular-nums">
            {hovered !== null ? data[hovered].value : total}
          </span>
          <span className="text-[11px] font-medium text-slate-400 px-2 truncate max-w-[110px]">
            {hovered !== null ? data[hovered].label : tr("dash.total", "Total Pengajuan")}
          </span>
        </div>
      </div>

      {/* Legend Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2.5 text-xs w-full max-w-xs">
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

// ── Status Pill ──
function StatusPill({ status }: { status: string }) {
  const { t } = useLanguage();
  const tr = (key: string, fallback: string) => {
    const v = t(key);
    return v === key ? fallback : v;
  };
  const norm = (status || "").toLowerCase();
  if (norm.includes("pending") || norm.includes("menunggu")) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
        {tr("dash.st_pending", "Menunggu")}
      </span>
    );
  }
  if (norm.includes("dipinjam") || norm.includes("aktif")) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
        <span className="w-1.5 h-1.5 rounded-full bg-[#0785BC]" />
        {tr("dash.st_active", "Dipinjam")}
      </span>
    );
  }
  if (norm.includes("setuju") || norm.includes("approved")) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
        {tr("dash.st_approved", "Disetujui")}
      </span>
    );
  }
  if (norm.includes("kembali") || norm.includes("selesai") || norm.includes("returned")) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        {tr("dash.st_done", "Selesai")}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-600 border border-rose-200">
      <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
      {tr("dash.st_rejected", "Ditolak")}
    </span>
  );
}

export default function UserDashboardPage() {
  const { t, lang } = useLanguage();
  const tr = (key: string, fallback: string) => {
    const v = t(key);
    return v === key ? fallback : v;
  };
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [borrowings, setBorrowings] = useState<BorrowingItem[]>([]);
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Time-based greeting (EN/ID)
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 11) return tr("dash.greeting_morning", "Selamat Pagi");
    if (hour >= 11 && hour < 15) return tr("dash.greeting_noon", "Selamat Siang");
    if (hour >= 15 && hour < 18) return tr("dash.greeting_evening", "Selamat Sore");
    return tr("dash.greeting_night", "Selamat Malam");
  };

  const syncUser = useCallback(() => {
    const user = getCurrentUser();
    if (user) setCurrentUser(user);
  }, []);

  // Fetch real-time dashboard data
  const loadDashboardData = useCallback(async () => {
    try {
      const [borrowRes, itemRes] = await Promise.all([
        api.borrowings.getAll({ limit: 50 }),
        api.items.getAll({ limit: 4 }),
      ]);

      if (borrowRes.status === "success" && Array.isArray(borrowRes.data)) {
        setBorrowings(borrowRes.data as BorrowingItem[]);
      }

      if (itemRes.status === "success" && Array.isArray(itemRes.data)) {
        setCatalogItems(itemRes.data as CatalogItem[]);
      }
    } catch (err) {
      console.warn("Gagal memuat data real-time dashboard user:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    syncUser();
    loadDashboardData();

    window.addEventListener("user-updated", syncUser);
    window.addEventListener("storage", syncUser);

    // Real-time socket updates for items, stock, and borrowings
    const socket = getSocket();
    const handleUpdate = () => {
      loadDashboardData();
    };

    if (socket) {
      socket.on("stock_updated", handleUpdate);
      socket.on("item_updated", handleUpdate);
      socket.on("item_created", handleUpdate);
      socket.on("borrowing_updated", handleUpdate);
      socket.on("borrowing_created", handleUpdate);
    }

    // Polling real-time updates every 30 seconds (like admin)
    const interval = setInterval(() => {
      loadDashboardData();
    }, 30000);

    return () => {
      clearInterval(interval);
      window.removeEventListener("user-updated", syncUser);
      window.removeEventListener("storage", syncUser);
      if (socket) {
        socket.off("stock_updated", handleUpdate);
        socket.off("item_updated", handleUpdate);
        socket.off("item_created", handleUpdate);
        socket.off("borrowing_updated", handleUpdate);
        socket.off("borrowing_created", handleUpdate);
      }
    };
  }, [syncUser, loadDashboardData]);

  // Derived real-time metrics
  const totalCount = borrowings.length;
  const pendingCount = borrowings.filter((b) => {
    const s = (b.status || "").toLowerCase();
    return s.includes("pending") || s.includes("menunggu");
  }).length;
  const activeCount = borrowings.filter((b) => {
    const s = (b.status || "").toLowerCase();
    return s.includes("dipinjam") || s.includes("aktif") || s.includes("approved") || s.includes("disetujui") || s.includes("setuju");
  }).length;
  const returnedCount = borrowings.filter((b) => {
    const s = (b.status || "").toLowerCase();
    return s.includes("kembali") || s.includes("selesai") || s.includes("returned");
  }).length;
  const rejectedCount = borrowings.filter((b) => {
    const s = (b.status || "").toLowerCase();
    return s.includes("tolak") || s.includes("batal") || s.includes("rejected");
  }).length;
  // Pie chart data
  const pieData: PieSlice[] = [
    { label: tr("dash.pie_pending", "Menunggu Persetujuan"), value: pendingCount, color: "#F59E0B" },
    { label: tr("dash.pie_active", "Sedang Dipinjam"), value: activeCount, color: "#0785BC" },
    { label: tr("dash.pie_done", "Selesai Dikembalikan"), value: returnedCount, color: "#10B981" },
    { label: tr("dash.pie_rejected", "Ditolak / Batal"), value: rejectedCount, color: "#EF4444" },
  ];

  // KPI cards mengikuti gaya admin, tetapi seluruh nilainya berasal dari data user real-time
  const statCards = [
    { badge: "AKTIVITAS SAYA", label: "Total Pengajuan", value: loading ? "..." : totalCount, footer: `${totalCount} pengajuan peminjaman`, icon: Package, color: "sky", href: "/user/riwayat_peminjaman" },
    { badge: "SEDANG BERJALAN", label: "Sedang Dipinjam", value: loading ? "..." : activeCount, footer: `${activeCount} barang sedang Anda pinjam`, icon: BookOpen, color: "emerald", href: "/user/riwayat_peminjaman?status=active" },
    { badge: "PERLU DITUNGGU", label: "Menunggu Persetujuan", value: loading ? "..." : pendingCount, footer: "Pengajuan menunggu verifikasi admin", icon: Clock, color: "amber", href: "/user/riwayat_peminjaman?status=pending" },
    { badge: "SELESAI", label: "Selesai Dikembalikan", value: loading ? "..." : returnedCount, footer: `${returnedCount} peminjaman telah selesai`, icon: CheckCircle2, color: "rose", href: "/user/riwayat_peminjaman?status=returned" },
  ];

  const recentBorrowings = borrowings.slice(0, 5);

  const displayName = currentUser?.name || currentUser?.full_name || "Peminjam";

  return (
    <UserLayout showSearch={true}>
      <div className="space-y-5 sm:space-y-6 max-w-7xl mx-auto pb-16 md:pb-10">
        {/* ── Hero Greeting ala ChatGPT/n8n ── */}
        <div className="relative overflow-hidden rounded-3xl border border-[#0785BC]/15 dark:border-[#023b55] bg-gradient-to-br from-white via-[#eef7fc] to-[#e3f1f9] dark:from-[#111c30] dark:via-[#0f2740] dark:to-[#0b1a30] p-5 sm:p-8">
          <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-[#0785BC]/10 dark:bg-[#0785BC]/10 blur-2xl pointer-events-none" />
          <div className="absolute right-10 bottom-0 w-40 h-40 rounded-full bg-[#0785BC]/5 dark:bg-[#0785BC]/5 blur-xl pointer-events-none" />
          <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-[#0785BC] dark:text-[#8ed8f5] bg-white/70 dark:bg-white/5 border border-[#0785BC]/20 rounded-full px-3 py-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {tr("dash.live", "Terhubung real-time")}
              </p>
              <h1 className="mt-2 text-xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
                {getGreeting()}, <span className="text-[#0785BC] dark:text-[#8ed8f5]">{displayName}</span>
              </h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1.5 text-xs sm:text-sm max-w-xl">
                {tr("dash.subtitle", "Pantau status peminjaman aset fasilitas Anda secara real-time.")}
              </p>
            </div>
            <div className="flex items-center gap-2.5 shrink-0 w-full md:w-auto">
              <Link
                href="/user/item_catalog"
                className="flex-1 md:flex-none justify-center px-4 py-2.5 rounded-xl bg-[#0785BC] hover:bg-[#0672a0] text-white text-xs font-semibold flex items-center gap-2 shadow-sm shadow-[#0785BC]/25 transition-all active:scale-[0.98]"
              >
                <BookOpen className="w-4 h-4" />
                {tr("dash.borrow_item", "Pinjam Barang")}
              </Link>
              <Link
                href="/user/riwayat_peminjaman"
                className="flex-1 md:flex-none justify-center px-4 py-2.5 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-white/10 text-slate-700 dark:text-slate-100 text-xs font-semibold flex items-center gap-2 transition-all active:scale-[0.98]"
              >
                <ClipboardList className="w-4 h-4" />
                {tr("dash.my_history", "Riwayat Saya")}
              </Link>
            </div>
          </div>
        </div>

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            const tone = stat.color === "emerald" ? "text-emerald-600 bg-emerald-50 border-emerald-200" : stat.color === "amber" ? "text-amber-600 bg-amber-50 border-amber-200" : stat.color === "rose" ? "text-rose-600 bg-rose-50 border-rose-200" : "text-[#0785BC] bg-[#eef7fc] border-[#bfeeff]";
            return <Link href={stat.href} key={stat.label} className="bg-white dark:bg-[#111c30] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-5 hover:shadow-md hover:-translate-y-0.5 transition-all min-w-0">
              <div className="flex items-start justify-between gap-3"><span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${tone}`}>{stat.badge}</span><div className={`w-11 h-11 rounded-xl flex items-center justify-center ${tone}`}><Icon className="w-5 h-5" /></div></div>
              <p className="mt-4 text-sm text-slate-500 dark:text-slate-400 font-medium">{stat.label}</p><p className="text-3xl font-bold text-slate-900 dark:text-white tabular-nums">{stat.value}</p>
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-400 flex justify-between"><span className="truncate">{stat.footer}</span><ChevronRight className="w-4 h-4 shrink-0" /></div>
            </Link>;
          })}
        </div>

        {/* ── Main Section: Pie Chart & Recent Borrowings ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Pie Chart Card (1 column on lg) */}
          <div className="bg-white dark:bg-[#111c30] rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs p-5 sm:p-6 flex flex-col justify-between">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3 mb-2 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                  {tr("dash.chart_title", "Grafik Status Peminjaman")}
                </h2>
                <p className="text-[11px] text-slate-400 truncate">{tr("dash.chart_sub", "Distribusi pengajuan aset Anda")}</p>
              </div>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping shrink-0" title="Real-time" />
            </div>

            <div className="flex-1 flex items-center justify-center my-2 min-w-0">
              <StatusPieChart data={pieData} total={totalCount} />
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
              <span>{tr("dash.auto_refresh", "Auto-refresh real-time")}</span>
              <span className="font-semibold text-[#0785BC] dark:text-[#8ed8f5]">{totalCount} {tr("dash.requests", "Pengajuan")}</span>
            </div>
          </div>

          {/* Status Peminjaman Real-time List (2 columns on lg) */}
          <div className="lg:col-span-2 bg-white dark:bg-[#111c30] rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs flex flex-col min-w-0 overflow-hidden">
            <div className="flex items-center justify-between gap-2 px-5 sm:px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white truncate">{tr("dash.recent", "Status Peminjaman Terkini")}</h2>
                <p className="text-[11px] text-slate-400 truncate">{tr("dash.recent_sub", "Daftar peminjaman barang Anda saat ini")}</p>
              </div>
              <Link
                href="/user/riwayat_peminjaman"
                className="shrink-0 text-xs font-semibold text-[#0785BC] dark:text-[#8ed8f5] hover:underline flex items-center gap-1"
              >
                {tr("dash.view_all", "Lihat Semua")}
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="flex-1 divide-y divide-slate-50">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 px-6 py-4 animate-pulse">
                    <div className="w-10 h-10 rounded-xl bg-slate-100" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-slate-100 rounded w-1/3" />
                      <div className="h-2.5 bg-slate-100 rounded w-1/4" />
                    </div>
                  </div>
                ))
              ) : recentBorrowings.length === 0 ? (
                <div className="p-10 text-center text-slate-400">
                  <ClipboardList className="w-10 h-10 mx-auto mb-2 text-slate-200" />
                  <p className="text-xs font-medium text-slate-500">{tr("dash.no_activity", "Belum ada aktivitas peminjaman")}</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {tr("dash.no_activity_sub", "Ajukan peminjaman pertama Anda melalui katalog barang.")}
                  </p>
                  <Link
                    href="/user/item_catalog"
                    className="inline-block mt-3 text-xs font-semibold text-[#0785BC] hover:underline"
                  >
                    {tr("dash.open_catalog", "Buka Katalog")} &rarr;
                  </Link>
                </div>
              ) : (
                recentBorrowings.map((b) => {
                  const firstItem = b.borrowings_items?.[0]?.items;
                  const itemName = firstItem?.name || b.purpose || tr("dash.facility", "Peminjaman Fasilitas");
                  const borrowDate = b.borrow_date
                    ? new Date(b.borrow_date).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : "-";

                  return (
                    <div
                      key={b.id}
                      className="flex items-center gap-4 px-6 py-3.5 hover:bg-slate-50/70 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 text-[#0785BC]">
                        <Package className="w-5 h-5" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-slate-800 truncate">
                            {itemName}
                          </p>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {b.borrow_code}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {tr("dash.borrow_date", "Tgl Pinjam")}: {borrowDate}
                          {b.purpose && ` • ${tr("dash.purpose", "Tujuan")}: ${b.purpose}`}
                        </p>
                      </div>

                      <StatusPill status={b.status} />

                      <Link
                        href={`/user/peminjaman/${b.id}`}
                        className="p-1 text-slate-300 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                        title={tr("dash.view_detail", "Lihat Detail Peminjaman")}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* ── Bottom Row: Rekomendasi Barang & Aksi Cepat ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Rekomendasi Barang Tersedia (2 cols) */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-xs p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  {tr("dash.recommend", "Rekomendasi Barang Tersedia")}
                </h2>
                <p className="text-[11px] text-slate-400">{tr("dash.recommend_sub", "Aset sarpras yang siap Anda pinjam hari ini")}</p>
              </div>
              <Link
                href="/user/item_catalog"
                className="text-xs font-semibold text-[#0785BC] hover:underline flex items-center gap-1"
              >
                {tr("dash.view_catalog", "Lihat Katalog")}
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {catalogItems.length > 0
                ? catalogItems.map((item) => {
                    const catName =
                      typeof item.category === "object"
                        ? item.category?.name
                        : item.categories?.name || item.category || tr("dash.general", "Umum");
                    const stockVal = Number(item.available_stock ?? item.stock ?? 0);
                    const emptyDash = stockVal <= 0;
                    return (
                      <Link
                        key={item.id}
                        href={`/user/item_catalog/${item.id}`}
                        className={`group border rounded-xl p-3 transition-all flex flex-col ${emptyDash ? "border-rose-200 bg-rose-50/40" : "border-slate-100 hover:border-[#0785BC]/30 hover:shadow-md"}`}
                      >
                        <div className="relative aspect-square w-full rounded-lg bg-slate-50 mb-2 overflow-hidden flex items-center justify-center">
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={item.name}
                              className={`w-full h-full object-cover transition-transform ${emptyDash ? "grayscale opacity-60" : "group-hover:scale-105"}`}
                            />
                          ) : (
                            <Box className="w-8 h-8 text-slate-300" />
                          )}
                          <span className="absolute top-1.5 left-1.5 px-2 py-0.5 bg-white/90 backdrop-blur-xs rounded text-[9px] font-semibold text-slate-600">
                            {catName}
                          </span>
                          {emptyDash && (
                            <span className="absolute top-1.5 right-1.5 px-2 py-0.5 bg-rose-600 rounded text-[9px] font-extrabold text-white shadow">
                              {tr("dash.out_short", "Habis")}
                            </span>
                          )}
                        </div>
                        <h3 className="text-xs font-bold text-slate-800 truncate group-hover:text-[#0785BC] transition-colors">
                          {item.name}
                        </h3>
                        <div className="flex items-center justify-between mt-auto pt-2 text-[10px] text-slate-400">
                          <span>{tr("dash.stock", "Stok:")}</span>
                          {emptyDash ? (
                            <span className="font-bold text-rose-600">{tr("common.stock_out", "Stok Habis")}</span>
                          ) : (
                            <span className="font-semibold text-emerald-600">
                              {stockVal} {tr("common.available", "Tersedia")}
                            </span>
                          )}
                         </div>
                        </Link>
                      );
                   })
                : Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="border border-slate-100 rounded-xl p-3 animate-pulse">
                      <div className="aspect-square w-full bg-slate-100 rounded-lg mb-2" />
                      <div className="h-3 bg-slate-100 rounded w-3/4 mb-1" />
                      <div className="h-2 bg-slate-100 rounded w-1/2" />
                    </div>
                  ))}
            </div>
          </div>

          {/* Quick Actions (1 col) */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-6 flex flex-col justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 mb-1">{tr("dash.quick", "Aksi Cepat")}</h2>
              <p className="text-[11px] text-slate-400 mb-4">{tr("dash.quick_sub", "Akses menu penting dalam satu klik")}</p>

              <div className="space-y-2">
                {[
                  {
                    href: "/user/item_catalog",
                    label: tr("dash.search_borrow", "Cari & Pinjam Barang"),
                    desc: tr("dash.search_borrow_desc", "Jelajahi seluruh aset dan fasilitas"),
                    icon: BookOpen,
                    color: "bg-blue-50 text-[#0785BC]",
                  },
                  {
                    href: "/user/riwayat_peminjaman",
                    label: tr("dash.manage_borrow", "Kelola Peminjaman"),
                    desc: tr("dash.manage_borrow_desc", "Cek status & tanggal pengembalian"),
                    icon: ClipboardList,
                    color: "bg-emerald-50 text-emerald-600",
                  },
                  {
                    href: "/user/messages",
                    label: tr("dash.chat_admin", "Chat Admin Sarpras"),
                    desc: tr("dash.chat_admin_desc", "Konsultasi & bantuan peminjaman"),
                    icon: MessageSquare,
                    color: "bg-[#eef7fc] text-[#0672a0]",
                  },
                  {
                    href: "/user/profile",
                    label: tr("dash.account", "Pengaturan Akun"),
                    desc: tr("dash.account_desc", "Ubah profil dan nomor kontak"),
                    icon: User,
                    color: "bg-slate-100 text-slate-700",
                  },
                ].map(({ href, label, desc, icon: Icon, color }) => (
                  <Link
                    key={href}
                    href={href}
                    className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors group"
                  >
                    <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center shrink-0`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800 group-hover:text-[#0785BC] transition-colors">
                        {label}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">{desc}</p>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-[#0785BC] group-hover:translate-x-0.5 transition-all" />
                  </Link>
                ))}
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
              <span>{tr("dash.need_help", "Butuh bantuan segera?")}</span>
              <Link href="/user/messages" className="text-[#0785BC] font-semibold hover:underline">
                {tr("dash.contact_us", "Hubungi Kami")}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </UserLayout>
  );
}
