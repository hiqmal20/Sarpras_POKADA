"use client";

import { useState, useEffect } from "react";
import {
  Filter,
  Clock,
  CheckCircle2,
  Package,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Eye,
  X,
  Calendar,
  User,
  FileText,
  Check,
  RefreshCw,
  Download,
  FileSpreadsheet,
} from "lucide-react";
import api from "@/lib/api";
import { AdminLayout } from "@/components/admin";
import ExportModal from "@/components/ExportModal";

interface ReturnItemDetail {
  id: string;
  item_id: string;
  quantity: number;
  condition_before?: string;
  condition_after?: string;
  note?: string;
  items?: {
    id: string;
    name: string;
    code: string;
    image_url?: string;
  };
}

interface ReturnItem {
  id: string; // return record id OR borrowing id
  borrowing_id: string;
  borrow_code: string;
  item_name: string;
  item_code: string;
  borrower_name: string;
  borrower_email: string;
  borrower_phone?: string;
  borrower_foto?: string | null;
  raw_date?: string | null;
  borrow_date: string;
  due_date: string;
  return_date?: string;
  status: "overdue" | "due_today" | "active" | "returned";
  raw_status: string;
  condition?: string;
  note?: string;
  receiver_name?: string;
  fine?: string;
  overdue_days?: number;
  items: ReturnItemDetail[];
  purpose?: string;
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
      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-500 text-white uppercase tracking-wide inline-flex items-center gap-1">
        <AlertTriangle className="w-3 h-3" />
        Terlambat
      </span>
    );
  if (status === "due_today")
    return (
      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500 text-white uppercase tracking-wide">
        Jatuh Tempo Hari Ini
      </span>
    );
  if (status === "returned")
    return (
      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500 text-white uppercase tracking-wide inline-flex items-center gap-1">
        <Check className="w-3 h-3" />
        Dikembalikan
      </span>
    );
  return (
    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500 text-white uppercase tracking-wide">
      Sedang Dipinjam
    </span>
  );
}

// ── Avatar initials ──
function Avatar({ name, foto }: { name?: string; foto?: string | null }) {
  const safeName = (name || "").trim();
  const initials = safeName
    ? safeName
        .split(" ")
        .filter(Boolean)
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "P";

  if (foto) {
    return (
      <img
        src={foto}
        alt={safeName}
        className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
      />
    );
  }

  return (
    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 bg-[#0785BC]">
      {initials}
    </div>
  );
}
const PAGE_SIZE = 10;

export default function PengembalianPage() {
  const [returns, setReturns] = useState<ReturnItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedItem, setSelectedItem] = useState<ReturnItem | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [confirmNote, setConfirmNote] = useState("");
  const [confirmCondition, setConfirmCondition] = useState("Baik");
  const [actionLoading, setActionLoading] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  // Real Stat Counts
  const [realStats, setRealStats] = useState({
    active: 0,
    overdue: 0,
    returnedToday: 0,
    totalReturned: 0,
  });

  const mounted = useMount();

  const fetchData = async () => {
    setLoading(true);
    try {
      // Ambil peminjaman aktif & data return riil bersamaan
      const [borrowRes, retRes, dashRes] = await Promise.all([
        api.borrowings.getAll({ limit: 100 }),
        api.returns.getAll(),
        api.dashboard.getStats(),
      ]);

      const now = new Date();
      const todayStr = now.toISOString().slice(0, 10);

      const itemsCombined: ReturnItem[] = [];

      // 1. Data yang sudah tercatat di tabel returns (riwayat pengembalian)
      if (retRes.status === "success" && Array.isArray(retRes.data)) {
        retRes.data.forEach((r: any) => {
          const b = r.borrowings || {};
          const u = b.users || {};
          const firstBItem = r.borrowing_items?.[0]?.items || {};
          const rDateStr = r.return_date || r.created_at;
          const rDate = rDateStr ? new Date(rDateStr) : null;

          itemsCombined.push({
            id: r.id,
            borrowing_id: r.borrowing_id || b.id || "",
            borrow_code: b.borrow_code || "-",
            item_name: firstBItem.name || b.purpose || "Barang Pengembalian",
            item_code: firstBItem.code || b.borrow_code || "-",
            borrower_name: u.name || "Peminjam",
            borrower_email: u.email || "-",
            borrower_phone: u.no_hp || "-",
            borrower_foto: u.foto || null,
            raw_date: rDateStr || r.created_at || null,
            borrow_date: b.borrow_date ? new Date(b.borrow_date).toLocaleDateString("id-ID") : "-",
            due_date: b.planned_return_date ? new Date(b.planned_return_date).toLocaleDateString("id-ID") : "-",
            return_date: rDate ? rDate.toLocaleDateString("id-ID") : "-",
            status: "returned",
            raw_status: "Dikembalikan",
            condition: r.condition || "Baik",
            note: r.note || "-",
            receiver_name: r.receiver?.name || "-",
            items: (r.borrowing_items || []).map((bi: any) => ({
              id: bi.id,
              item_id: bi.item_id,
              quantity: bi.quantity,
              condition_before: bi.condition_before,
              condition_after: bi.condition_after,
              note: bi.note,
              items: bi.items,
            })),
            purpose: b.purpose || "-",
          });
        });
      }

      // 2. Data dari borrowings yang sedang aktif / menunggu pengembalian
      if (borrowRes.status === "success" && Array.isArray(borrowRes.data)) {
        borrowRes.data.forEach((b: any) => {
          const rawSt = (b.status || "").toLowerCase();
          // Hanya masukkan yang sedang dipinjam atau terlambat dan belum ada di itemsCombined
          if (["dipinjam", "terlambat"].includes(rawSt)) {
            const u = b.users || {};
            const firstBItem = b.borrowings_items?.[0]?.items || {};
            const planned = b.planned_return_date ? new Date(b.planned_return_date) : null;
            let currentSt: ReturnItem["status"] = "active";
            let overdueDays = 0;

            if (planned) {
              const diffTime = now.getTime() - planned.getTime();
              const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
              const isToday = planned.toISOString().slice(0, 10) === todayStr;

              if (diffDays > 0) {
                currentSt = "overdue";
                overdueDays = diffDays;
              } else if (isToday) {
                currentSt = "due_today";
              }
            }

            itemsCombined.push({
              id: b.id,
              borrowing_id: b.id,
              borrow_code: b.borrow_code || "-",
              item_name: firstBItem.name || b.purpose || "Barang Peminjaman",
              item_code: firstBItem.code || b.borrow_code || "-",
              borrower_name: u.name || "Peminjam",
              borrower_email: u.email || "-",
              borrower_phone: u.no_hp || "-",
              borrower_foto: u.foto || null,
              raw_date: b.borrow_date || b.created_at || null,
              borrow_date: b.borrow_date ? new Date(b.borrow_date).toLocaleDateString("id-ID") : "-",
              due_date: b.planned_return_date ? new Date(b.planned_return_date).toLocaleDateString("id-ID") : "-",
              status: currentSt,
              raw_status: b.status || "Dipinjam",
              overdue_days: overdueDays > 0 ? overdueDays : undefined,
              fine: overdueDays > 0 ? `Rp ${(overdueDays * 10000).toLocaleString("id-ID")}` : undefined,
              items: (b.borrowings_items || []).map((bi: any) => ({
                id: bi.id,
                item_id: bi.item_id,
                quantity: bi.quantity,
                condition_before: bi.condition_before,
                note: bi.note,
                items: bi.items,
              })),
              purpose: b.purpose || "-",
            });
          }
        });
      }

      setReturns(itemsCombined);
      setTotal(itemsCombined.length);

      // Auto-select pengembalian jika diarahkan dari shortcut notifikasi
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        const targetCode = params.get("code") || params.get("search");
        const targetId = params.get("id");
        if (targetCode || targetId) {
          const found = itemsCombined.find(
            (r) =>
              (targetId && (r.id === targetId || r.borrowing_id === targetId)) ||
              (targetCode && r.borrow_code.toLowerCase() === targetCode.toLowerCase())
          );
          if (found) {
            setSelectedItem(found);
          }
        }
      }

      // Hitung real stat cards
      const activeCount = itemsCombined.filter((r) => r.status === "active" || r.status === "due_today").length;
      const overdueCount = itemsCombined.filter((r) => r.status === "overdue").length;
      const returnedTodayCount = itemsCombined.filter(
        (r) => r.status === "returned" && r.return_date === new Date().toLocaleDateString("id-ID")
      ).length;
      const totalReturnedCount = itemsCombined.filter((r) => r.status === "returned").length;

      setRealStats({
        active: dashRes?.data?.borrowings?.aktif ?? activeCount,
        overdue: dashRes?.data?.borrowings?.terlambat ?? overdueCount,
        returnedToday: returnedTodayCount,
        totalReturned: dashRes?.data?.borrowings?.dikembalikan ?? totalReturnedCount,
      });
    } catch (err) {
      console.warn("Gagal mengambil data pengembalian:", err);
      setReturns([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  // Inisialisasi search dari URL query parameter (shortcut notifikasi)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const targetSearch = params.get("search") || params.get("code");
    if (targetSearch) {
      setSearch(targetSearch);
      setStatusFilter("all");
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [page]);

  const filtered = returns.filter((r) => {
    const matchSearch =
      !search ||
      (r.item_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (r.item_code || "").toLowerCase().includes(search.toLowerCase()) ||
      (r.borrow_code || "").toLowerCase().includes(search.toLowerCase()) ||
      (r.borrower_name || "").toLowerCase().includes(search.toLowerCase());

    const matchStatus =
      statusFilter === "all" ||
      r.status === statusFilter ||
      (statusFilter === "active" && (r.status === "active" || r.status === "due_today"));

    return matchSearch && matchStatus;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
  const paginatedData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const stats = [
    {
      label: "Menunggu Pengembalian",
      value: realStats.active,
      valueColor: "text-slate-900",
      icon: <Clock className="w-5 h-5 text-blue-500" />,
      iconBg: "bg-blue-50",
      filterKey: "active",
    },
    {
      label: "Melewati Batas (Terlambat)",
      value: realStats.overdue,
      valueColor: "text-red-500",
      icon: <AlertTriangle className="w-5 h-5 text-red-500" />,
      iconBg: "bg-red-50",
      filterKey: "overdue",
    },
    {
      label: "Selesai Dikembalikan",
      value: realStats.totalReturned,
      valueColor: "text-emerald-600",
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" />,
      iconBg: "bg-emerald-50",
      filterKey: "returned",
    },
  ];

  async function handleConfirmSubmit() {
    if (!confirmingId) return;
    try {
      setActionLoading(true);
      await api.returns.create({
        borrowing_id: confirmingId,
        notes: confirmNote || "Dikonfirmasi admin",
        condition: confirmCondition,
      });
      setConfirmingId(null);
      setConfirmNote("");
      await fetchData();
    } catch (err: any) {
      alert("Gagal memproses pengembalian: " + (err.message || err));
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <AdminLayout
      showSearch={true}
      searchValue={search}
      searchPlaceholder="Cari data pengembalian..."
      onSearchChange={setSearch}
    >
      <div className="space-y-6">
        {/* Page header */}
        <div className={`flex items-start justify-between ${mounted ? "animate-fade-up" : "opacity-0"}`}>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Manajemen Pengembalian</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Pantau jadwal jatuh tempo, proses konfirmasi pengembalian barang, dan telusuri riwayat riil.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchData}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 active:scale-95 transition-all shadow-2xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <button
              onClick={() => setShowExportModal(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 active:scale-95 rounded-xl transition-all shadow-2xs"
            >
              <FileSpreadsheet className="w-4 h-4 text-[#0785BC]" />
              Ekspor Pengembalian
            </button>
          </div>
        </div>

        {/* ── Stat Cards Realtime (Modern Design) ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4.5">
          {stats.map((s, i) => (
            <div
              key={s.label}
              onClick={() => {
                setStatusFilter(statusFilter === s.filterKey ? "all" : s.filterKey);
                setPage(1);
              }}
              style={{ animationDelay: `${i * 75}ms` }}
              className={`group bg-white rounded-2xl border p-5 flex flex-col justify-between cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${
                statusFilter === s.filterKey
                  ? "border-[#0785BC] ring-2 ring-[#0785BC]/20 shadow-md bg-gradient-to-br from-white via-blue-50/20 to-white"
                  : "border-slate-100 shadow-sm hover:border-slate-200"
              } ${mounted ? "animate-fade-up" : "opacity-0"}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200/60 mb-2">
                    {s.filterKey === "active" ? "Aktif" : s.filterKey === "overdue" ? "Peringatan" : "Selesai"}
                  </span>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider leading-snug">
                    {s.label}
                  </p>
                </div>
                <div className={`w-11 h-11 rounded-2xl ${s.iconBg} border border-slate-100 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
                  {s.icon}
                </div>
              </div>
              <div className="mt-3">
                <p className={`text-3xl font-extrabold tabular-nums ${s.valueColor} ${mounted ? "animate-count-up" : ""}`}>
                  {s.value}
                </p>
                <div className="pt-3 mt-2 border-t border-slate-50 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-400">
                    {s.filterKey === "active" ? "Barang di tangan peminjam" : s.filterKey === "overdue" ? "Perlu peneguran segera" : "Aset kembali ke gudang"}
                  </span>
                  <span className={`text-[11px] font-semibold transition-colors ${
                    statusFilter === s.filterKey ? "text-[#0785BC]" : "text-slate-400 group-hover:text-[#0785BC]"
                  }`}>
                    {statusFilter === s.filterKey ? "• Aktif" : "Filter"}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Daftar Pengembalian Table ── */}
        <div className={`bg-white rounded-2xl border border-slate-100 shadow-sm ${mounted ? "animate-fade-up delay-200" : "opacity-0"}`}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-6 py-4 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-900">Daftar Status Pengembalian</h2>
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="text-xs font-semibold border border-slate-200 rounded-xl px-3 py-1.5 text-slate-600 bg-white focus:outline-none focus:ring-2 focus:ring-[#0785BC] transition-all"
              >
                <option value="all">Semua Status</option>
                <option value="active">Sedang Dipinjam / Due</option>
                <option value="overdue">Overdue (Terlambat)</option>
                <option value="returned">Dikembalikan (Selesai)</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left">
                  <th className="px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Barang & Kode</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Peminjam</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Jatuh Tempo / Kembali</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
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
                  : paginatedData.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-slate-400 text-sm">
                          Tidak ada data pengembalian yang cocok.
                        </td>
                      </tr>
                    )
                  : paginatedData.map((row, i) => (
                      <tr
                        key={row.id + i}
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
                              <p className="text-xs text-slate-400 mt-0.5 font-mono">{row.borrow_code || row.item_code}</p>
                            </div>
                          </div>
                        </td>

                        {/* Peminjam */}
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2.5">
                            <Avatar name={row.borrower_name} foto={row.borrower_foto} />
                            <div>
                              <p className="font-medium text-slate-700">{row.borrower_name}</p>
                              <p className="text-xs text-slate-400">{row.borrower_email}</p>
                            </div>
                          </div>
                        </td>

                        {/* Jatuh Tempo */}
                        <td className="px-4 py-4">
                          {row.status === "returned" ? (
                            <div>
                              <p className="font-semibold text-emerald-600">{row.return_date || "-"}</p>
                              <p className="text-xs text-slate-400 mt-0.5">Telah dikembalikan</p>
                            </div>
                          ) : row.status === "overdue" ? (
                            <div>
                              <p className="font-semibold text-red-500">{row.due_date}</p>
                              <p className="text-xs text-red-400 mt-0.5">Terlambat {row.overdue_days || "-"} Hari</p>
                            </div>
                          ) : (
                            <div>
                              <p className="text-slate-600">{row.due_date}</p>
                              <p className="text-xs text-slate-400 mt-0.5">Pinjam: {row.borrow_date}</p>
                            </div>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-4">
                          <div className="space-y-1">
                            <StatusBadge status={row.status} />
                            {row.fine && (
                              <p className="text-xs font-semibold text-red-500 mt-1">Denda: {row.fine}</p>
                            )}
                          </div>
                        </td>

                        {/* Aksi */}
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setSelectedItem(row)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 active:scale-95 transition-all"
                              title="Lihat Detail"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Detail
                            </button>

                            {row.status !== "returned" ? (
                              <button
                                onClick={() => {
                                  setConfirmingId(row.borrowing_id);
                                  setConfirmCondition("Baik");
                                  setConfirmNote("");
                                }}
                                className="px-3 py-1.5 text-xs font-bold text-white bg-[#0785BC] hover:bg-[#0672a0] active:scale-95 rounded-xl transition-all shadow-sm"
                              >
                                Konfirmasi Kembali
                              </button>
                            ) : (
                              <span className="text-xs px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 font-medium">
                                Selesai
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Menampilkan {filtered.length > 0 ? (page - 1) * PAGE_SIZE + 1 : 0}–{Math.min(page * PAGE_SIZE, filtered.length)} dari {filtered.length} data
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

      {/* ── Modal Detail Pengembalian (Sama Seperti Peminjaman + Info Pengembalian) ── */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#0785BC]/10 text-[#0785BC] flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">Detail Pengembalian Barang</h3>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">{selectedItem.borrow_code}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              {/* Status Header */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-100">
                <div>
                  <p className="text-xs text-slate-500 font-medium">Status Saat Ini</p>
                  <div className="mt-1">
                    <StatusBadge status={selectedItem.status} />
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500 font-medium">
                    {selectedItem.status === "returned" ? "Tanggal Pengembalian" : "Jatuh Tempo"}
                  </p>
                  <p className="text-xs font-semibold text-slate-700 mt-1">
                    {selectedItem.status === "returned" ? selectedItem.return_date : selectedItem.due_date}
                  </p>
                </div>
              </div>

              {/* Data Peminjam */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                  <User className="w-4 h-4 text-slate-500" /> Informasi Peminjam
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl border border-slate-100 bg-slate-50/30">
                  <div>
                    <p className="text-xs text-slate-400">Nama Peminjam</p>
                    <p className="text-sm font-semibold text-slate-800 mt-0.5">{selectedItem.borrower_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Email</p>
                    <p className="text-sm font-semibold text-slate-800 mt-0.5">{selectedItem.borrower_email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">No. HP</p>
                    <p className="text-sm font-semibold text-slate-800 mt-0.5">{selectedItem.borrower_phone || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Penerima Pengembalian</p>
                    <p className="text-sm font-semibold text-slate-800 mt-0.5">{selectedItem.receiver_name || "Petugas / Admin"}</p>
                  </div>
                </div>
              </div>

              {/* Jadwal & Kondisi */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-slate-500" /> Riwayat Jadwal & Catatan
                </h4>
                <div className="space-y-3 p-4 rounded-xl border border-slate-100 bg-slate-50/30">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-slate-400">Tanggal Pinjam</p>
                      <p className="text-sm font-semibold text-slate-800 mt-0.5">{selectedItem.borrow_date}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Estimasi / Jatuh Tempo</p>
                      <p className="text-sm font-semibold text-slate-800 mt-0.5">{selectedItem.due_date}</p>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-slate-100">
                    <p className="text-xs text-slate-400">Tujuan Peminjaman</p>
                    <p className="text-sm text-slate-700 mt-0.5">{selectedItem.purpose || "-"}</p>
                  </div>
                  {selectedItem.note && (
                    <div className="pt-2 border-t border-slate-100">
                      <p className="text-xs text-slate-400">Catatan Pengembalian</p>
                      <p className="text-sm text-slate-700 mt-0.5">{selectedItem.note}</p>
                    </div>
                  )}
                  {selectedItem.condition && (
                    <div className="pt-2 border-t border-slate-100">
                      <p className="text-xs text-slate-400">Kondisi Barang Saat Kembali</p>
                      <span className="inline-block mt-1 px-2.5 py-1 rounded-md bg-slate-100 text-xs font-semibold text-slate-800">
                        {selectedItem.condition}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Rincian Barang yang Dikembalikan */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-slate-500" /> Barang yang Terkait ({selectedItem.items.length})
                </h4>
                <div className="space-y-2 max-h-52 overflow-y-auto">
                  {selectedItem.items.length > 0 ? (
                    selectedItem.items.map((it, idx) => (
                      <div
                        key={it.id || idx}
                        className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-white hover:bg-slate-50/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                            <Package className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{it.items?.name || "Barang"}</p>
                            <p className="text-xs text-slate-400 font-mono">{it.items?.code || it.item_id}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="inline-flex items-center px-2 py-1 rounded-md bg-slate-100 text-xs font-bold text-slate-700">
                            {it.quantity} Unit
                          </span>
                          {it.condition_before && (
                            <p className="text-[11px] text-slate-400 mt-0.5">Kondisi: {it.condition_before}</p>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 rounded-xl border border-slate-100 text-center text-xs text-slate-400">
                      Tidak ada detail barang individual
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <button
                onClick={() => setSelectedItem(null)}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200/70 rounded-xl transition-all"
              >
                Tutup
              </button>
              {selectedItem.status !== "returned" && (
                <button
                  onClick={() => {
                    const borrowId = selectedItem.borrowing_id;
                    setSelectedItem(null);
                    setConfirmingId(borrowId);
                    setConfirmCondition("Baik");
                    setConfirmNote("");
                  }}
                  className="px-4 py-2 text-sm font-bold text-white bg-[#0785BC] hover:bg-[#0672a0] rounded-xl transition-all shadow-sm active:scale-95"
                >
                  Konfirmasi Pengembalian Ini
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Konfirmasi Pengembalian ── */}
      {confirmingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-bold text-slate-800 text-base">Konfirmasi Barang Kembali</h3>
              <button
                onClick={() => setConfirmingId(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Kondisi Barang Saat Dikembalikan
                </label>
                <select
                  value={confirmCondition}
                  onChange={(e) => setConfirmCondition(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#0785BC]"
                >
                  <option value="Baik">Baik (Lengkap tanpa kerusakan)</option>
                  <option value="Rusak Ringan">Rusak Ringan</option>
                  <option value="Rusak Berat">Rusak Berat</option>
                  <option value="Hilang">Hilang</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Catatan Pengembalian (Opsional)
                </label>
                <textarea
                  rows={3}
                  value={confirmNote}
                  onChange={(e) => setConfirmNote(e.target.value)}
                  placeholder="Contoh: Barang dikembalikan tepat waktu dalam kondisi bersih..."
                  className="w-full text-sm border border-slate-200 rounded-xl p-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0785BC]"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-2">
              <button
                onClick={() => setConfirmingId(null)}
                disabled={actionLoading}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200/70 rounded-xl transition-all"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmSubmit}
                disabled={actionLoading}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-white bg-[#0785BC] hover:bg-[#0672a0] rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                {actionLoading ? "Memproses..." : "Konfirmasi Selesai"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Export Pengembalian dengan Filter Tanggal ── */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="Ekspor Data Pengembalian"
        description="Unduh data riil riwayat dan jadwal pengembalian berdasarkan rentang waktu."
        moduleName="Pengembalian"
        filenamePrefix="SARPRAS_Pengembalian"
        data={returns}
        dateFieldGetter={(r) => (r as any).raw_date || r.return_date || r.due_date || r.borrow_date}
        dataRowMapper={(r) => ({
          "Kode Peminjaman": r.borrow_code,
          "Kode Barang": r.item_code,
          "Nama Barang": r.item_name,
          "Nama Peminjam": r.borrower_name,
          Email: r.borrower_email,
          "No HP": r.borrower_phone || "-",
          "Tanggal Pinjam": r.borrow_date,
          "Batas Waktu": r.due_date,
          "Tanggal Pengembalian": r.return_date || "-",
          Status: r.status.toUpperCase(),
          "Kondisi Fisik": r.condition || "Baik",
          "Keterlambatan (Hari)": r.overdue_days || 0,
          "Denda (Rp)": r.fine || "Rp 0",
          Catatan: r.note || "-",
        })}
      />
    </AdminLayout>
  );
}
