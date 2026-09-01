"use client";

import { useState, useEffect, useRef } from "react";
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
  Download,
  TrendingUp,
  Package,
  Clock,
  Search,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";
import api from "@/lib/api";

// --- Types ---
interface StatCard {
  label: string;
  value: number | string;
  change: string;
  changeType: "up" | "down" | "neutral";
  icon: React.ReactNode;
}

interface PendingItem {
  id: string;
  item_name: string;
  borrower: string;
  category: string;
  request_date: string;
  status: string;
}

interface ActivityLog {
  id: string;
  message: string;
  time: string;
  type: "approved" | "user" | "damage" | "return";
}

// --- Sidebar nav items ---
const navItems = [
  { href: "/admin/dashboard_admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/manajemen_peminjaman", label: "Peminjaman", icon: BookOpen, active: false },
  { href: "/admin/pengembalian", label: "Pengembalian", icon: RotateCcw },
  { href: "/admin/manajemen_user", label: "Manage User", icon: Users },
  { href: "/admin/rekap_laporan", label: "Laporan Kerusakan", icon: AlertTriangle },
  { href: "/admin/kategori_barang", label: "Kategori Barang", icon: Tag },
];

// --- Category badge color map ---
const categoryColor: Record<string, string> = {
  Electronics: "bg-blue-100 text-blue-700",
  Outdoors: "bg-amber-100 text-amber-700",
  Mobility: "bg-purple-100 text-purple-700",
  Audio: "bg-green-100 text-green-700",
  Default: "bg-slate-100 text-slate-600",
};

function CategoryBadge({ name }: { name: string }) {
  const cls = categoryColor[name] ?? categoryColor.Default;
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${cls}`}>
      {name}
    </span>
  );
}

// --- Simple sparkline-style chart (SVG) ---
// Weekly data: [week1, week2, week3, week4]
function TrendChart({
  newData,
  doneData,
}: {
  newData: number[];
  doneData: number[];
}) {
  const W = 480;
  const H = 180;
  const weeks = 4;
  const xStep = W / (weeks - 1);
  const maxVal = Math.max(...newData, ...doneData, 1);

  const toPath = (data: number[]) =>
    data
      .map((v, i) => {
        const x = i * xStep;
        const y = H - (v / maxVal) * (H - 20);
        return `${i === 0 ? "M" : "L"} ${x} ${y}`;
      })
      .join(" ");

  const toArea = (data: number[]) => {
    const line = toPath(data);
    const lastX = (weeks - 1) * xStep;
    const lastY = H - (data[weeks - 1] / maxVal) * (H - 20);
    return `${line} L ${lastX} ${H} L 0 ${H} Z`;
  };

  const yTicks = [0, 50, 100, 150, 200, 250];

  return (
    <svg viewBox={`0 0 ${W} ${H + 30}`} className="w-full h-full">
      {/* Y grid lines */}
      {yTicks.map((t) => {
        const y = H - (t / 250) * (H - 20);
        return (
          <g key={t}>
            <line
              x1={0}
              y1={y}
              x2={W}
              y2={y}
              stroke="#f1f5f9"
              strokeWidth={1}
            />
            <text x={0} y={y - 4} className="fill-slate-400" fontSize={10}>
              {t}
            </text>
          </g>
        );
      })}

      {/* X labels */}
      {["Week 1", "Week 2", "Week 3", "Week 4"].map((label, i) => (
        <text
          key={label}
          x={i * xStep}
          y={H + 20}
          textAnchor="middle"
          className="fill-slate-400"
          fontSize={10}
        >
          {label}
        </text>
      ))}

      {/* Done area */}
      <path d={toArea(doneData)} fill="#0785BC" fillOpacity={0.08} />
      {/* New area */}
      <path d={toArea(newData)} fill="#0785BC" fillOpacity={0.04} />

      {/* Done line */}
      <path
        d={toPath(doneData)}
        fill="none"
        stroke="#10B981"
        strokeWidth={2}
        strokeDasharray="6 4"
      />
      {/* New line */}
      <path
        d={toPath(newData)}
        fill="none"
        stroke="#0785BC"
        strokeWidth={2.5}
      />

      {/* Dots - New */}
      {newData.map((v, i) => (
        <circle
          key={i}
          cx={i * xStep}
          cy={H - (v / maxVal) * (H - 20)}
          r={4}
          fill="white"
          stroke="#0785BC"
          strokeWidth={2}
        />
      ))}

      {/* Dots - Done */}
      {doneData.map((v, i) => (
        <circle
          key={i}
          cx={i * xStep}
          cy={H - (v / maxVal) * (H - 20)}
          r={4}
          fill="white"
          stroke="#10B981"
          strokeWidth={2}
        />
      ))}
    </svg>
  );
}

// ── useAnimateOnMount: resolves a "mounted" flag after first render ──
function useMount() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  return mounted;
}

// ============================================================
export default function DashboardAdminPage() {
  const [stats, setStats] = useState<any>(null);
  const [pendingList, setPendingList] = useState<PendingItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeNav, setActiveNav] = useState("/admin/dashboard_admin");
  const mounted = useMount();

  // Mock activity log (from real app would come from notifications / activity endpoint)
  const activities: ActivityLog[] = [
    { id: "1", type: "approved", message: "Loan #8902 approved for Makita Power Drill.", time: "2 menit lalu" },
    { id: "2", type: "user", message: "Pengguna baru Sarah J. terdaftar dan menambahkan 3 barang.", time: "45 menit lalu" },
    { id: "3", type: "damage", message: "Kerusakan dilaporkan pada pinjaman #8850 (Sony A7III).", time: "2 jam lalu" },
    { id: "4", type: "return", message: "Pengembalian senilai Rp145.000 diproses untuk Mike T.", time: "5 jam lalu" },
  ];

  const activityIcon = (type: ActivityLog["type"]) => {
    if (type === "approved") return <CheckCircle2 className="w-4 h-4 text-[#0785BC]" />;
    if (type === "user") return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    if (type === "damage") return <AlertTriangle className="w-4 h-4 text-amber-500" />;
    return <RotateCcw className="w-4 h-4 text-slate-400" />;
  };

  // Mock weekly trend data
  const trendNew = [120, 190, 150, 220];
  const trendDone = [90, 130, 120, 180];

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [dashRes, borrowRes] = await Promise.all([
          api.dashboard.getStats(),
          api.borrowings.getAll({ status: "pending", limit: 10 }),
        ]);

        if (dashRes.status === "success") setStats(dashRes.data);
        if (borrowRes.status === "success" && borrowRes.data) {
          setPendingList(borrowRes.data as PendingItem[]);
        }
      } catch {
        // silently handle — UI will fallback to skeleton/mock
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const statCards: StatCard[] = [
    {
      label: "Total Aset",
      value: stats?.total_items ?? 12450,
      change: "+5.2% dari bulan lalu",
      changeType: "up",
      icon: <Package className="w-5 h-5 text-[#0785BC]" />,
    },
    {
      label: "Peminjaman Aktif",
      value: stats?.active_borrowings ?? 3892,
      change: "+12% dari bulan lalu",
      changeType: "up",
      icon: <BookOpen className="w-5 h-5 text-emerald-500" />,
    },
    {
      label: "Persetujuan Tertunda",
      value: stats?.pending_approvals ?? 145,
      change: "Perlu tinjauan hari ini",
      changeType: "neutral",
      icon: <Clock className="w-5 h-5 text-amber-500" />,
    },
    {
      label: "Laporan Kerusakan",
      value: stats?.damage_reports ?? 28,
      change: "+2 sejak kemarin",
      changeType: "down",
      icon: <AlertTriangle className="w-5 h-5 text-red-500" />,
    },
  ];

  const filtered = pendingList.filter(
    (item) =>
      !searchQuery ||
      item.item_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.borrower?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  async function handleApprove(id: string) {
    await api.borrowings.updateStatus(id, { status: "approved" });
    setPendingList((prev) => prev.filter((p) => p.id !== id));
  }

  async function handleReject(id: string) {
    await api.borrowings.updateStatus(id, { status: "rejected" });
    setPendingList((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <div className="flex min-h-screen bg-[#f8fafc] text-slate-800">
      {/* ── Sidebar ── */}
      <aside className="w-56 shrink-0 bg-white border-r border-slate-100 flex flex-col justify-between sticky top-0 h-screen">
        {/* Logo */}
        <div>
          <div className="px-6 py-6 border-b border-slate-100">
            <span className="text-lg font-extrabold text-[#0785BC] tracking-tight">
              SARPRAS POKADA
            </span>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">
              Internal Lending Platform
            </p>
          </div>

          {/* Nav */}
          <nav className="px-3 py-4 space-y-0.5">
            {navItems.map(({ href, label, icon: Icon }) => {
              const isActive = activeNav === href;
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setActiveNav(href)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-[#0785BC] text-white"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Admin profile */}
        <div className="px-4 py-4 border-t border-slate-100 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#0785BC]/20 flex items-center justify-center text-[#0785BC] font-bold text-sm shrink-0">
            A
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-800 truncate">Admin User</p>
            <p className="text-[11px] text-slate-400 truncate">System Administrator</p>
          </div>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="bg-white border-b border-slate-100 px-8 py-4 flex items-center justify-end gap-3 sticky top-0 z-10">
          <button className="relative p-2 rounded-xl text-slate-500 hover:bg-slate-50 transition-colors">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
          </button>
          <button className="p-2 rounded-xl text-slate-500 hover:bg-slate-50 transition-colors">
            <Settings className="w-5 h-5" />
          </button>
          <div className="w-8 h-8 rounded-full bg-[#0785BC]/20 flex items-center justify-center text-[#0785BC] font-bold text-sm">
            A
          </div>
        </header>

        <div className="p-8 space-y-8 overflow-y-auto">
          {/* Page header */}
          <div className={`flex items-start justify-between ${mounted ? "animate-fade-up" : "opacity-0"}`}>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Ringkasan</h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Metrik platform dan aktivitas terbaru.
              </p>
            </div>
            <button className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-[#0785BC] hover:bg-[#0672a0] active:scale-95 rounded-xl transition-all shadow-sm">
              <Download className="w-4 h-4" />
              Export Report
            </button>
          </div>

          {/* ── Stat Cards ── */}
          <div className="grid grid-cols-4 gap-4">
            {statCards.map((card, i) => (
              <div
                key={card.label}
                style={{ animationDelay: `${i * 75}ms` }}
                className={`bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 ${mounted ? "animate-fade-up" : "opacity-0"}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <p className="text-sm text-slate-500 font-medium">{card.label}</p>
                  <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center">
                    {card.icon}
                  </div>
                </div>
                <p className="text-3xl font-bold text-slate-900 tabular-nums">
                  {loading ? (
                    <span className="inline-block w-20 h-8 bg-slate-100 rounded animate-pulse" />
                  ) : (
                    <span className="animate-count-up inline-block">
                      {Number(card.value).toLocaleString("id-ID")}
                    </span>
                  )}
                </p>
                <p
                  className={`text-xs font-medium mt-2 flex items-center gap-1 ${
                    card.changeType === "up"
                      ? "text-emerald-600"
                      : card.changeType === "down"
                      ? "text-red-500"
                      : "text-slate-400"
                  }`}
                >
                  {card.changeType === "up" && <TrendingUp className="w-3 h-3" />}
                  {card.changeType === "down" && <TrendingUp className="w-3 h-3 rotate-180" />}
                  {card.changeType === "neutral" && <Clock className="w-3 h-3" />}
                  {card.change}
                </p>
              </div>
            ))}
          </div>

          {/* ── Trend Chart + Activity ── */}
          <div className="grid grid-cols-3 gap-6">
            {/* Chart */}
            <div className={`col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-6 ${mounted ? "animate-fade-up delay-200" : "opacity-0"}`}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-slate-900">Tren Peminjaman</h2>
                <span className="text-xs font-medium px-3 py-1.5 border border-slate-200 rounded-lg text-slate-500">
                  30 Hari Terakhir
                </span>
              </div>
              {/* Legend */}
              <div className="flex items-center gap-5 text-xs text-slate-500 mb-4">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-[#0785BC] inline-block rounded" />
                  Daftar Baru
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-emerald-500 inline-block rounded border-dashed border" />
                  Peminjaman Selesai
                </span>
              </div>
              <div className="h-48">
                <TrendChart newData={trendNew} doneData={trendDone} />
              </div>
            </div>

            {/* Activity */}
            <div className={`bg-white rounded-2xl border border-slate-100 shadow-sm p-6 ${mounted ? "animate-fade-up delay-300" : "opacity-0"}`}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-slate-900">Aktivitas Terbaru</h2>
                <button className="text-xs font-semibold text-[#0785BC] hover:underline">
                  Lihat Semua
                </button>
              </div>
              <ul className="space-y-4">
                {activities.map((act, i) => (
                  <li
                    key={act.id}
                    style={{ animationDelay: `${300 + i * 60}ms` }}
                    className={`flex gap-3 ${mounted ? "animate-fade-up" : "opacity-0"}`}
                  >
                    <div className="mt-0.5 w-7 h-7 rounded-full bg-slate-50 flex items-center justify-center shrink-0">
                      {activityIcon(act.type)}
                    </div>
                    <div>
                      <p className="text-xs text-slate-700 leading-snug">{act.message}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{act.time}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* ── Pending Approvals Table ── */}
          <div className={`bg-white rounded-2xl border border-slate-100 shadow-sm ${mounted ? "animate-fade-up delay-350" : "opacity-0"}`}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">Persetujuan Tertunda</h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0785BC] w-52 transition-all"
                />
              </div>
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-slate-100">
                  <th className="px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Nama Barang
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Peminjam
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Kategori
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Tanggal Pengajuan
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">
                    Aksi
                  </th>
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
                  // Fallback mock data when API returns empty
                  [
                    { id: "m1", item_name: "Canon EOS R5", borrower: "Alex M.", category: "Electronics", request_date: "Oct 24, 2024" },
                    { id: "m2", item_name: "North Face 4-Person Tent", borrower: "Jamie L.", category: "Outdoors", request_date: "Oct 24, 2024" },
                    { id: "m3", item_name: "Segway Ninebot Max", borrower: "Chris W.", category: "Mobility", request_date: "Oct 23, 2024" },
                  ].map((row) => (
                    <TableRow
                      key={row.id}
                      row={row}
                      onApprove={() => {}}
                      onReject={() => {}}
                    />
                  ))
                ) : (
                  filtered.map((row) => (
                    <TableRow
                      key={row.id}
                      row={row}
                      onApprove={() => handleApprove(row.id)}
                      onReject={() => handleReject(row.id)}
                    />
                  ))
                )}
              </tbody>
            </table>

            {filtered.length > 0 && (
              <div className="px-6 py-3 border-t border-slate-50 flex justify-end">
                <Link
                  href="/admin/manajemen_peminjaman"
                  className="text-xs font-semibold text-[#0785BC] flex items-center gap-1 hover:underline"
                >
                  Lihat semua peminjaman <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

// ── Sub-component: Table Row ──
function TableRow({
  row,
  onApprove,
  onReject,
}: {
  row: { id: string; item_name: string; borrower: string; category: string; request_date: string };
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <tr className="hover:bg-slate-50/60 transition-colors group">
      <td className="px-6 py-3.5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 group-hover:bg-[#0785BC]/10 transition-colors">
            <Package className="w-4 h-4 text-slate-400 group-hover:text-[#0785BC] transition-colors" />
          </div>
          <span className="font-medium text-slate-800">{row.item_name}</span>
        </div>
      </td>
      <td className="px-4 py-3.5 text-slate-600">{row.borrower}</td>
      <td className="px-4 py-3.5">
        <CategoryBadge name={row.category} />
      </td>
      <td className="px-4 py-3.5 text-slate-500">{row.request_date}</td>
      <td className="px-6 py-3.5 text-right space-x-3">
        <button
          onClick={onApprove}
          className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 active:scale-95 transition-all"
        >
          Setujui
        </button>
        <button
          onClick={onReject}
          className="text-sm font-semibold text-red-500 hover:text-red-600 active:scale-95 transition-all"
        >
          Tolak
        </button>
      </td>
    </tr>
  );
}
