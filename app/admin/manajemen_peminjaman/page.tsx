"use client";

import { useState, useEffect } from "react";
import {
  AlertTriangle,
  Filter,
  Download,
  Clock,
  CheckCircle2,
  Package,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import api from "@/lib/api";
import { AdminLayout } from "@/components/admin";

type StatusFilter = "semua" | "pending" | "active" | "overdue";

interface Borrowing {
  id: string;
  item_name: string;
  item_code: string;
  borrower_name: string;
  borrower_email: string;
  borrow_date: string;
  return_date: string;
  status: string; // "pending" | "active" | "overdue" | "returned"
}

function useMount() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  return mounted;
}

// ── Status Badge ──
function StatusBadge({ status }: { status: string }) {
  if (status === "pending")
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        Menunggu Validasi
      </span>
    );
  if (status === "active")
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
        Aktif (Dipinjam)
      </span>
    );
  if (status === "overdue")
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-red-50 text-red-600 border border-red-200">
        <AlertTriangle className="w-3 h-3" />
        Terlambat 6 Hari
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
      {status}
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

// ── Fallback mock data ──
const mockData: Borrowing[] = [
  { id: "1", item_name: "MacBook Pro M2",     item_code: "INV-2023-001", borrower_name: "Ahmad Santoso", borrower_email: "ahmad@company.com",  borrow_date: "24 Okt 2023", return_date: "31 Okt 2023", status: "pending"  },
  { id: "2", item_name: "Proyektor Epson G500",item_code: "PRJ-2022-045", borrower_name: "Budi Wijaya",   borrower_email: "budi.w@company.com",  borrow_date: "20 Okt 2023", return_date: "25 Okt 2023", status: "active"   },
  { id: "3", item_name: "Lensa Canon 50mm",   item_code: "CAM-2021-012", borrower_name: "Citra Kirana",  borrower_email: "citra@company.com",   borrow_date: "15 Okt 2023", return_date: "18 Okt 2023", status: "overdue"  },
];

const PAGE_SIZE = 10;

export default function ManajemenPeminjamanPage() {
  const [borrowings, setBorrowings] = useState<Borrowing[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<StatusFilter>("semua");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(45);
  const mounted = useMount();

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const statusMap: Record<StatusFilter, string | undefined> = {
        semua: undefined, pending: "pending", active: "active", overdue: "overdue",
      };
      const res = await api.borrowings.getAll({
        status: statusMap[activeFilter],
        page,
        limit: PAGE_SIZE,
      });
      if (res.status === "success" && res.data && (res.data as any[]).length > 0) {
        setBorrowings(res.data as Borrowing[]);
        if (res.total) setTotal(res.total);
      } else {
        setBorrowings(mockData);
        setTotal(45);
      }
      setLoading(false);
    }
    fetchData();
  }, [activeFilter, page]);

  // Stats derived from mock when loading is done
  const stats = [
    { label: "Perlu Divalidasi", value: 12, badge: "Menunggu",  badgeColor: "bg-emerald-100 text-emerald-700", icon: <Clock className="w-6 h-6 text-emerald-500" />, iconBg: "bg-emerald-50" },
    { label: "Sedang Dipinjam",  value: 45, badge: "Aktif",     badgeColor: "bg-blue-100 text-blue-700",       icon: <CheckCircle2 className="w-6 h-6 text-blue-500" />, iconBg: "bg-blue-50" },
    { label: "Melewati Batas Waktu", value: 3,  badge: "Terlambat", badgeColor: "bg-red-100 text-red-600",     icon: <AlertTriangle className="w-6 h-6 text-red-500" />, iconBg: "bg-red-50" },
  ];

  const filterTabs: { key: StatusFilter; label: string }[] = [
    { key: "semua",   label: "Semua" },
    { key: "pending", label: "Menunggu Validasi" },
    { key: "active",  label: "Aktif" },
    { key: "overdue", label: "Terlambat" },
  ];

  const filtered = borrowings.filter((b) =>
    !search ||
    b.item_name?.toLowerCase().includes(search.toLowerCase()) ||
    b.borrower_name?.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(total / PAGE_SIZE);

  async function handleApprove(id: string) {
    await api.borrowings.updateStatus(id, { status: "active" });
    setBorrowings((prev) => prev.map((b) => b.id === id ? { ...b, status: "active" } : b));
  }

  return (
    <AdminLayout
      showSearch={true}
      searchValue={search}
      searchPlaceholder="Cari peminjaman..."
      onSearchChange={setSearch}
    >
      <div className="space-y-6">
          {/* Page header */}
          <div className={`flex items-start justify-between ${mounted ? "animate-fade-up" : "opacity-0"}`}>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Manajemen Peminjaman</h1>
              <p className="text-sm text-slate-500 mt-0.5">Kelola dan pantau seluruh transaksi peminjaman barang.</p>
            </div>
            <button className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-[#0785BC] hover:bg-[#0672a0] active:scale-95 rounded-xl transition-all shadow-sm">
              <CheckCircle2 className="w-4 h-4" />
              Validasi Peminjaman Baru
            </button>
          </div>

          {/* ── Stat Cards ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {stats.map((s, i) => (
              <div
                key={s.label}
                style={{ animationDelay: `${i * 75}ms` }}
                className={`bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 ${mounted ? "animate-fade-up" : "opacity-0"}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-11 h-11 rounded-xl ${s.iconBg} flex items-center justify-center`}>
                    {s.icon}
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${s.badgeColor}`}>
                    {s.badge}
                  </span>
                </div>
                <p className={`text-3xl font-bold text-slate-900 tabular-nums ${mounted ? "animate-count-up" : ""}`}>
                  {s.value}
                </p>
                <p className="text-sm text-slate-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          {/* ── Table Card ── */}
          <div className={`bg-white rounded-2xl border border-slate-100 shadow-sm ${mounted ? "animate-fade-up delay-200" : "opacity-0"}`}>
            {/* Filter tabs + actions */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                {filterTabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => { setActiveFilter(tab.key); setPage(1); }}
                    className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-all active:scale-95 ${
                      activeFilter === tab.key
                        ? "bg-[#0785BC] text-white shadow-sm"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors">
                  <Filter className="w-3.5 h-3.5" /> Filter
                </button>
                <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors">
                  <Download className="w-3.5 h-3.5" /> Export
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left">
                  <th className="px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Barang</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Peminjam</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Tanggal Pinjam</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Estimasi Kembali</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading
                  ? Array.from({ length: 3 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 6 }).map((_, j) => (
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
                              <p className="text-xs text-slate-400 mt-0.5">{row.item_code}</p>
                            </div>
                          </div>
                        </td>

                        {/* Peminjam */}
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2.5">
                            <Avatar name={row.borrower_name} color={avatarColors[i % avatarColors.length]} />
                            <div>
                              <p className="font-medium text-slate-800 text-sm">{row.borrower_name}</p>
                              <p className="text-xs text-slate-400">{row.borrower_email}</p>
                            </div>
                          </div>
                        </td>

                        {/* Tanggal Pinjam */}
                        <td className="px-4 py-4 text-sm text-slate-600">{row.borrow_date}</td>

                        {/* Estimasi Kembali */}
                        <td className={`px-4 py-4 text-sm font-medium ${row.status === "overdue" ? "text-red-500" : "text-slate-600"}`}>
                          {row.return_date}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-4">
                          <StatusBadge status={row.status} />
                        </td>

                        {/* Aksi */}
                        <td className="px-6 py-4 text-right">
                          {row.status === "pending" && (
                            <button
                              onClick={() => handleApprove(row.id)}
                              className="text-sm font-semibold text-[#0785BC] hover:text-[#0672a0] active:scale-95 transition-all"
                            >
                              Validasi
                            </button>
                          )}
                          {row.status === "active" && (
                            <span className="text-xs text-slate-400">Dipinjam</span>
                          )}
                          {row.status === "overdue" && (
                            <button className="text-sm font-semibold text-red-500 hover:text-red-600 active:scale-95 transition-all">
                              Ingatkan
                            </button>
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
    </AdminLayout>
  );
}
