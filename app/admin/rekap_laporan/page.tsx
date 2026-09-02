"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  FileText,
  Wrench,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  AlertTriangle,
} from "lucide-react";
import api from "@/lib/api";
import { AdminLayout } from "@/components/admin";

type ReportStatus = "pending" | "in_progress" | "resolved";

interface DamageReport {
  id: string;
  item_code: string;
  item_name: string;
  reporter_name: string;
  description: string;
  reported_date: string;
  status: ReportStatus;
}

function useMount() {
  const [m, setM] = useState(false);
  useEffect(() => { setM(true); }, []);
  return m;
}

// ── Status Badge ──
function StatusBadge({ status }: { status: ReportStatus }) {
  if (status === "pending")
    return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-500">Menunggu</span>;
  if (status === "in_progress")
    return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-500 text-white">Proses</span>;
  return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">Selesai</span>;
}

// ── Avatar initials ──
function Avatar({ name, color }: { name: string; color: string }) {
  const initials = name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 ${color}`}>
      {initials}
    </div>
  );
}

const avatarColors = ["bg-orange-400", "bg-slate-400", "bg-blue-500", "bg-teal-500", "bg-purple-500"];

const mockData: DamageReport[] = [
  { id: "1", item_code: "BRG-001", item_name: "Proyektor Epson EB-X41",  reporter_name: "Budi Santoso", description: "Lensa buram dan panas berlebih setelah pemakaian 2 jam.",        reported_date: "12 Okt 2023", status: "pending"     },
  { id: "2", item_code: "BRG-045", item_name: "Kamera DSLR Canon 90D",   reporter_name: "Ani Rahayu",   description: "Tombol shutter terkadang tidak responsif saat ditekan.",        reported_date: "10 Okt 2023", status: "in_progress" },
  { id: "3", item_code: "BRG-112", item_name: "Laptop Thinkpad T14",     reporter_name: "Dodi P.",      description: "Layar berkedip saat baterai di bawah 20% dan charger terhubung.", reported_date: "08 Okt 2023", status: "resolved"    },
];

const PAGE_SIZE = 10;

const statusOptions = [
  { label: "Semua Status", value: "" },
  { label: "Menunggu",     value: "pending" },
  { label: "Proses",       value: "in_progress" },
  { label: "Selesai",      value: "resolved" },
];

export default function RekapLaporanPage() {
  const [reports, setReports]       = useState<DamageReport[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [statusFilter, setStatus]   = useState("");
  const [page, setPage]             = useState(1);
  const [total, setTotal]           = useState(124);
  const mounted = useMount();

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const res = await api.damageReports.getAll({
        status: statusFilter || undefined,
        page,
        limit: PAGE_SIZE,
      });
      if (res.status === "success" && res.data && (res.data as any[]).length > 0) {
        setReports(res.data as DamageReport[]);
        if (res.total) setTotal(res.total);
      } else {
        setReports(mockData);
        setTotal(124);
      }
      setLoading(false);
    }
    fetchData();
  }, [statusFilter, page]);

  const filtered = reports.filter(
    (r) =>
      !search ||
      r.item_name.toLowerCase().includes(search.toLowerCase()) ||
      r.reporter_name.toLowerCase().includes(search.toLowerCase()) ||
      r.item_code.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const stats = [
    { label: "Total Laporan",      value: 124, icon: <FileText className="w-5 h-5 text-blue-500" />,       iconBg: "bg-blue-100"    },
    { label: "Menunggu Perbaikan", value: 18,  icon: <Wrench className="w-5 h-5 text-red-400" />,          iconBg: "bg-red-100"     },
    { label: "Selesai Diperbaiki", value: 106, icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" />,iconBg: "bg-emerald-100" },
  ];

  async function handleUpdateStatus(id: string, status: string) {
    await api.damageReports.updateStatus(id, { status });
    setReports((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: status as ReportStatus } : r))
    );
  }

  return (
    <AdminLayout
      showSearch={true}
      searchValue={search}
      searchPlaceholder="Cari laporan..."
      onSearchChange={setSearch}
    >
      <div className="space-y-6">
        {/* Page header */}
        <div className={`flex items-start justify-between ${mounted ? "animate-fade-up" : "opacity-0"}`}>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Laporan Kerusakan & Kehilangan</h1>
            <p className="text-sm text-slate-500 mt-0.5">Rekapitulasi laporan barang yang mengalami masalah.</p>
          </div>
          <button className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-[#0785BC] hover:bg-[#0672a0] active:scale-95 rounded-xl transition-all shadow-sm">
            <Plus className="w-4 h-4" />
            Buat Laporan Baru
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
                  <p className={`text-3xl font-bold tabular-nums text-slate-900 ${mounted ? "animate-count-up" : ""}`}>
                    {s.value}
                  </p>
                </div>
                <div className={`w-11 h-11 rounded-full ${s.iconBg} flex items-center justify-center shrink-0`}>
                  {s.icon}
                </div>
              </div>
            ))}
          </div>

          {/* ── Daftar Laporan ── */}
          <div className={`bg-white rounded-2xl border border-slate-100 shadow-sm ${mounted ? "animate-fade-up delay-200" : "opacity-0"}`}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-6 py-4 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">Daftar Laporan</h2>
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => { setStatus(e.target.value); setPage(1); }}
                  className="appearance-none pl-3 pr-8 py-1.5 text-sm border border-slate-200 rounded-xl text-slate-600 bg-white focus:outline-none focus:ring-2 focus:ring-[#0785BC] transition-all"
                >
                  {statusOptions.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left">
                  <th className="px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">ID Barang</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Nama Barang</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Pelapor</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Deskripsi Kerusakan</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Tanggal</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading
                  ? Array.from({ length: 3 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 7 }).map((_, j) => (
                          <td key={j} className="px-4 py-4">
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
                        {/* ID */}
                        <td className="px-6 py-4 font-semibold text-slate-700">{row.item_code}</td>

                        {/* Nama Barang */}
                        <td className="px-4 py-4 text-slate-800 font-medium">{row.item_name}</td>

                        {/* Pelapor */}
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <Avatar name={row.reporter_name} color={avatarColors[i % avatarColors.length]} />
                            <span className="text-slate-700">{row.reporter_name}</span>
                          </div>
                        </td>

                        {/* Deskripsi */}
                        <td className="px-4 py-4 text-slate-500 max-w-xs">
                          <p className="line-clamp-2">{row.description}</p>
                        </td>

                        {/* Tanggal */}
                        <td className="px-4 py-4 text-slate-500 whitespace-nowrap">{row.reported_date}</td>

                        {/* Status */}
                        <td className="px-4 py-4">
                          <StatusBadge status={row.status} />
                        </td>

                        {/* Aksi */}
                        <td className="px-6 py-4 text-right">
                          {row.status === "pending" && (
                            <button
                              onClick={() => handleUpdateStatus(row.id, "in_progress")}
                              className="text-sm font-semibold text-[#0785BC] hover:text-[#0672a0] active:scale-95 transition-all"
                            >
                              Proses
                            </button>
                          )}
                          {row.status === "in_progress" && (
                            <button
                              onClick={() => handleUpdateStatus(row.id, "resolved")}
                              className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 active:scale-95 transition-all"
                            >
                              Selesaikan
                            </button>
                          )}
                          {row.status === "resolved" && (
                            <span className="text-xs text-slate-400">Selesai</span>
                          )}
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
            </div>

            {/* Pagination */}
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
              <p className="text-sm text-slate-500">
                Menampilkan {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} dari {total} laporan
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
      </AdminLayout>
    );
  }
