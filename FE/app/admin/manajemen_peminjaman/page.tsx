"use client";

import { useState, useEffect, useRef } from "react";
import {
  AlertTriangle,
  Download,
  Clock,
  CheckCircle2,
  Package,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Eye,
  Calendar,
  User,
  FileText,
  Tag,
  Hash,
  FileSpreadsheet,
} from "lucide-react";
import * as XLSX from "xlsx";
import api from "@/lib/api";
import { AdminLayout } from "@/components/admin";
import ExportModal from "@/components/ExportModal";

type StatusFilter = "semua" | "pending" | "active" | "overdue" | "completed";

interface BorrowingItemDetail {
  id: string;
  item_id: string;
  quantity: number;
  condition_before?: string;
  note?: string;
  items?: {
    id: string;
    name: string;
    code: string;
    image_url?: string;
    condition?: string;
    status?: string;
  };
}

interface Borrowing {
  id: string;
  borrow_code: string;
  item_name: string;
  item_code: string;
  borrower_name: string;
  borrower_email: string;
  borrower_phone?: string;
  borrower_role?: string;
  borrower_foto?: string | null;
  borrow_date: string;
  planned_return_date?: string;
  return_date: string;
  status: string; // "pending" | "active" | "overdue" | "completed"
  raw_status: string;
  purpose?: string;
  admin_note?: string;
  created_at?: string;
  items: BorrowingItemDetail[];
}

function useMount() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  return mounted;
}

// ── Status Badge ──
function StatusBadge({ status }: { status: string }) {
  const s = status?.toLowerCase();
  if (s === "pending")
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
        Perlu Divalidasi
      </span>
    );
  if (s === "active" || s === "dipinjam")
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
        Sedang Dipinjam
      </span>
    );
  if (s === "overdue" || s === "terlambat")
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-red-50 text-red-600 border border-red-200">
        <AlertTriangle className="w-3 h-3" />
        Melewati Batas Waktu
      </span>
    );
  if (s === "completed" || s === "selesai" || s === "dikembalikan")
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <Check className="w-3 h-3 text-emerald-600" />
        Selesai
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
      {status}
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

// ── Fallback mock data ──
const mockData: Borrowing[] = [];

const PAGE_SIZE = 10;

export default function ManajemenPeminjamanPage() {
  const [borrowings, setBorrowings] = useState<Borrowing[]>([]);
  const [realStats, setRealStats] = useState({
    pending: 0,
    active: 0,
    overdue: 0,
    completed: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<StatusFilter>("semua");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedBorrowing, setSelectedBorrowing] = useState<Borrowing | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const hasHandledUrlRef = useRef(false);
  const mounted = useMount();

  const fetchData = async () => {
    setLoading(true);
    const statusMap: Record<StatusFilter, string | undefined> = {
      semua: undefined,
      pending: "Pending",
      active: "Dipinjam",
      overdue: "Terlambat",
      completed: "Selesai",
    };

    try {
      const [res, dashRes] = await Promise.all([
        api.borrowings.getAll({
          status: statusMap[activeFilter],
          page,
          limit: PAGE_SIZE,
        }),
        api.dashboard.getStats(),
      ]);

      if (dashRes.status === "success" && dashRes.data?.borrowings) {
        setRealStats({
          pending: dashRes.data.borrowings.pending || 0,
          active: dashRes.data.borrowings.aktif || 0,
          overdue: dashRes.data.borrowings.terlambat || 0,
          completed: dashRes.data.borrowings.dikembalikan || 0,
        });
      }

      if (res.status === "success" && Array.isArray(res.data)) {
        const mapped: Borrowing[] = (res.data as any[]).map((raw: any) => {
          const user = raw.users || {};
          const itemsList: BorrowingItemDetail[] = Array.isArray(raw.borrowings_items)
            ? raw.borrowings_items.map((bi: any) => ({
                id: bi.id,
                item_id: bi.item_id,
                quantity: bi.quantity,
                condition_before: bi.condition_before,
                note: bi.note,
                items: bi.items || null,
              }))
            : [];

          const firstItem = itemsList[0]?.items as { name?: string; code?: string } | undefined;
          const rawStatus = raw.status || "Pending";
          let normalizedStatus = "pending";
          const lower = rawStatus.toLowerCase();
          if (lower === "dipinjam") normalizedStatus = "active";
          else if (lower === "terlambat") normalizedStatus = "overdue";
          else if (lower === "selesai" || lower === "dikembalikan") normalizedStatus = "completed";
          else if (lower === "pending" || lower === "menunggu") normalizedStatus = "pending";

          return {
            id: raw.id,
            borrow_code: raw.borrow_code || "-",
            item_name: firstItem?.name || raw.purpose || "Barang Peminjaman",
            item_code: firstItem?.code || raw.borrow_code || "-",
            borrower_name: user.name || "Peminjam",
            borrower_email: user.email || "-",
            borrower_phone: user.no_hp || "-",
            borrower_role: user.role || "-",
            borrower_foto: user.foto || null,
            raw_borrow_date: raw.borrow_date || raw.created_at || null,
            borrow_date: raw.borrow_date ? new Date(raw.borrow_date).toLocaleDateString("id-ID") : "-",
            planned_return_date: raw.planned_return_date ? new Date(raw.planned_return_date).toLocaleDateString("id-ID") : "-",
            return_date: raw.actual_return_date
              ? new Date(raw.actual_return_date).toLocaleDateString("id-ID")
              : raw.planned_return_date
              ? new Date(raw.planned_return_date).toLocaleDateString("id-ID")
              : "-",
            status: normalizedStatus,
            raw_status: rawStatus,
            purpose: raw.purpose || "-",
            admin_note: raw.admin_note || "",
            created_at: raw.created_at ? new Date(raw.created_at).toLocaleString("id-ID") : "-",
            items: itemsList,
          };
        });
        setBorrowings(mapped);
        setTotal(res.total || mapped.length);

        // Auto-select borrowing jika diarahkan dari shortcut notifikasi (hanya sekali saat pertama buka)
        if (!hasHandledUrlRef.current && typeof window !== "undefined") {
          const params = new URLSearchParams(window.location.search);
          const targetCode = params.get("code") || params.get("search");
          const targetId = params.get("id");
          if (targetCode || targetId) {
            hasHandledUrlRef.current = true;
            // Bersihkan parameter query dari URL agar tidak memicu auto-open berulang atau mengunci filter
            window.history.replaceState({}, "", window.location.pathname);

            const found = mapped.find(
              (b) =>
                (targetId && b.id === targetId) ||
                (targetCode && b.borrow_code.toLowerCase() === targetCode.toLowerCase())
            );
            if (found) {
              setSelectedBorrowing(found);
            } else if (targetCode) {
              // Jika belum ada di list halaman pertama, fetch spesifik agar modal langsung terbuka
              (api.borrowings.getAll as any)({ search: targetCode, limit: 1 }).then((resDetail: any) => {
                if (resDetail.status === "success" && Array.isArray(resDetail.data) && resDetail.data[0]) {
                  const raw = resDetail.data[0];
                  const user = raw.users || {};
                  const itemsList = Array.isArray(raw.borrowings_items)
                    ? raw.borrowings_items.map((bi: any) => ({
                        id: bi.id,
                        item_id: bi.item_id,
                        quantity: bi.quantity,
                        condition_before: bi.condition_before,
                        note: bi.note,
                        items: bi.items || null,
                      }))
                    : [];
                  const firstItem = itemsList[0]?.items;
                  const rawStatus = raw.status || "Pending";
                  let normalizedStatus = "pending";
                  const lower = rawStatus.toLowerCase();
                  if (lower === "dipinjam") normalizedStatus = "active";
                  else if (lower === "terlambat") normalizedStatus = "overdue";
                  else if (lower === "selesai" || lower === "dikembalikan") normalizedStatus = "completed";
                  else if (lower === "pending" || lower === "menunggu") normalizedStatus = "pending";

                  setSelectedBorrowing({
                    id: raw.id,
                    borrow_code: raw.borrow_code || "-",
                    item_name: firstItem?.name || raw.purpose || "Barang Peminjaman",
                    item_code: firstItem?.code || raw.borrow_code || "-",
                    borrower_name: user.name || "Peminjam",
                    borrower_email: user.email || "-",
                    borrower_phone: user.no_hp || "-",
                    borrower_role: user.role || "-",
                    borrower_foto: user.foto || null,
                    borrow_date: raw.borrow_date ? new Date(raw.borrow_date).toLocaleDateString("id-ID") : "-",
                    planned_return_date: raw.planned_return_date ? new Date(raw.planned_return_date).toLocaleDateString("id-ID") : "-",
                    return_date: raw.actual_return_date
                      ? new Date(raw.actual_return_date).toLocaleDateString("id-ID")
                      : raw.planned_return_date
                      ? new Date(raw.planned_return_date).toLocaleDateString("id-ID")
                      : "-",
                    status: normalizedStatus,
                    raw_status: rawStatus,
                    purpose: raw.purpose || "-",
                    admin_note: raw.admin_note || "",
                    created_at: raw.created_at ? new Date(raw.created_at).toLocaleString("id-ID") : "-",
                    items: itemsList,
                  });
                }
              });
            }
          }
        }
      } else {
        setBorrowings([]);
        setTotal(0);
      }
    } catch (err) {
      console.warn("Gagal memuat peminjaman:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeFilter, page]);

  // Real stats from API
  const stats = [
    {
      label: "Perlu Divalidasi",
      value: realStats.pending,
      badge: "Menunggu",
      badgeColor: "bg-amber-100 text-amber-700",
      icon: <Clock className="w-6 h-6 text-amber-500" />,
      iconBg: "bg-amber-50",
      filterKey: "pending" as StatusFilter,
    },
    {
      label: "Sedang Dipinjam",
      value: realStats.active,
      badge: "Aktif",
      badgeColor: "bg-blue-100 text-blue-700",
      icon: <CheckCircle2 className="w-6 h-6 text-blue-500" />,
      iconBg: "bg-blue-50",
      filterKey: "active" as StatusFilter,
    },
    {
      label: "Melewati Batas Waktu",
      value: realStats.overdue,
      badge: "Terlambat",
      badgeColor: "bg-red-100 text-red-600",
      icon: <AlertTriangle className="w-6 h-6 text-red-500" />,
      iconBg: "bg-red-50",
      filterKey: "overdue" as StatusFilter,
    },
    {
      label: "Selesai",
      value: realStats.completed,
      badge: "Selesai",
      badgeColor: "bg-emerald-100 text-emerald-700",
      icon: <Check className="w-6 h-6 text-emerald-500" />,
      iconBg: "bg-emerald-50",
      filterKey: "completed" as StatusFilter,
    },
  ];

  const filterTabs: { key: StatusFilter; label: string }[] = [
    { key: "semua", label: "Semua" },
    { key: "pending", label: "Perlu Divalidasi" },
    { key: "active", label: "Sedang Dipinjam" },
    { key: "overdue", label: "Melewati Batas Waktu" },
    { key: "completed", label: "Selesai" },
  ];

  const filtered = borrowings.filter(
    (b) =>
      !search ||
      b.item_name?.toLowerCase().includes(search.toLowerCase()) ||
      b.item_code?.toLowerCase().includes(search.toLowerCase()) ||
      b.borrow_code?.toLowerCase().includes(search.toLowerCase()) ||
      b.borrower_name?.toLowerCase().includes(search.toLowerCase()) ||
      b.borrower_email?.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;

  async function handleApprove(id: string, note?: string) {
    try {
      setActionLoading(true);
      await api.borrowings.updateStatus(id, { status: "Dipinjam", admin_notes: note || "Disetujui admin" });
      await fetchData();
      if (selectedBorrowing?.id === id) {
        setSelectedBorrowing((prev) => prev ? { ...prev, status: "active", raw_status: "Dipinjam", admin_note: note || prev.admin_note } : null);
      }
    } catch (err: any) {
      alert("Gagal menyetujui: " + err.message);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReject(id: string) {
    const reason = prompt("Masukkan alasan penolakan peminjaman:");
    if (reason === null) return;
    try {
      setActionLoading(true);
      await api.borrowings.updateStatus(id, { status: "Ditolak", admin_notes: reason });
      await fetchData();
      if (selectedBorrowing?.id === id) {
        setSelectedBorrowing((prev) => prev ? { ...prev, status: "rejected", raw_status: "Ditolak", admin_note: reason } : null);
      }
    } catch (err: any) {
      alert("Gagal menolak: " + err.message);
    } finally {
      setActionLoading(false);
    }
  }

  // Bulk approve or quick filter to pending
  async function handleHeaderAction() {
    if (activeFilter !== "pending") {
      setActiveFilter("pending");
      setPage(1);
      return;
    }

    const pendingItems = borrowings.filter((b) => b.status === "pending");
    if (pendingItems.length === 0) {
      alert("Tidak ada peminjaman berstatus pending yang perlu divalidasi.");
      return;
    }

    if (confirm(`Setujui sekaligus ${pendingItems.length} peminjaman yang menunggu validasi?`)) {
      for (const item of pendingItems) {
        await api.borrowings.updateStatus(item.id, { status: "Dipinjam" });
      }
      await fetchData();
    }
  }

  // Functional Export to Excel
  function handleExport() {
    if (borrowings.length === 0) {
      alert("Tidak ada data peminjaman untuk diekspor.");
      return;
    }

    const exportRows = borrowings.map((b) => ({
      "Kode Barang": b.item_code,
      "Nama Barang": b.item_name,
          "Nama Peminjam": b.borrower_name,
          Email: b.borrower_email,
          "Tanggal Pinjam": b.borrow_date,
          "Estimasi Kembali": b.planned_return_date && b.planned_return_date !== "-" ? b.planned_return_date : b.return_date,
          Status: b.status.toUpperCase(),
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Peminjaman");
    XLSX.writeFile(wb, `Peminjaman-${activeFilter}-${new Date().toISOString().slice(0, 10)}.xlsx`);
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
          <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${mounted ? "animate-fade-up" : "opacity-0"}`}>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">Manajemen Peminjaman</h1>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-slate-100 text-slate-600 border border-slate-200">
                  {borrowings.length} TRANSAKSI
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">Kelola dan pantau seluruh sirkulasi dan otorisasi peminjaman barang sarpras.</p>
            </div>
            <button
              onClick={handleHeaderAction}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-[#0785BC] hover:bg-[#0672a0] active:scale-95 rounded-lg transition-all shadow-xs self-start sm:self-auto"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {activeFilter === "pending" ? "Validasi Semua Pending" : "Filter Menunggu Validasi"}
            </button>
          </div>

          {/* ── Stat Cards (n8n Node Style) ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((s, i) => (
              <div
                key={s.label}
                onClick={() => {
                  setActiveFilter(activeFilter === s.filterKey ? "semua" : s.filterKey);
                  setPage(1);
                }}
                style={{ animationDelay: `${i * 60}ms` }}
                className={`group bg-white rounded-xl border p-4.5 flex flex-col justify-between cursor-pointer transition-all duration-200 hover:shadow-sm ${
                  activeFilter === s.filterKey
                    ? "border-[#0785BC] ring-2 ring-[#0785BC]/20 shadow-xs bg-sky-50/20"
                    : "border-slate-200/90 shadow-xs hover:border-slate-300"
                } ${mounted ? "animate-fade-up" : "opacity-0"}`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold border mb-1.5 ${s.badgeColor}`}>
                      {s.badge}
                    </span>
                    <p className="text-xs font-medium text-slate-500">{s.label}</p>
                  </div>
                  <div className={`w-8 h-8 rounded-lg ${s.iconBg} border border-slate-100 flex items-center justify-center shrink-0`}>
                    {s.icon}
                  </div>
                </div>
                <div className="mt-3">
                  <p className={`text-2xl font-black text-slate-900 tabular-nums tracking-tight ${mounted ? "animate-count-up" : ""}`}>
                    {s.value}
                  </p>
                  <div className="pt-2.5 mt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-slate-400">
                      {s.filterKey === "pending"
                        ? "Perlu verifikasi admin"
                        : s.filterKey === "active"
                        ? "Peminjaman berjalan"
                        : s.filterKey === "overdue"
                        ? "Lewat estimasi kembali"
                        : "Aset telah kembali"}
                    </span>
                    <span className={`text-[10px] font-mono font-semibold transition-colors ${
                      activeFilter === s.filterKey ? "text-[#0785BC]" : "text-slate-400 group-hover:text-[#0785BC]"
                    }`}>
                      {activeFilter === s.filterKey ? "• AKTIF" : "FILTER"}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* ── Table Card ── */}
          <div className={`bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden ${mounted ? "animate-fade-up delay-200" : "opacity-0"}`}>
            {/* Filter tabs + actions */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200/80 bg-slate-50/50 gap-4 flex-wrap">
              <div className="flex items-center gap-1.5 flex-wrap">
                {filterTabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => { setActiveFilter(tab.key); setPage(1); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-95 ${
                      activeFilter === tab.key
                        ? "bg-[#0785BC] text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowExportModal(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs active:scale-95 bg-white"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-[#0785BC]" /> Ekspor Peminjaman (CSV / XLSX)
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
                            <Avatar name={row.borrower_name} foto={row.borrower_foto} />
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
                          {row.planned_return_date && row.planned_return_date !== "-" ? row.planned_return_date : row.return_date}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-4">
                          <StatusBadge status={row.status} />
                        </td>

                        {/* Aksi */}
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setSelectedBorrowing(row)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 active:scale-95 transition-all"
                              title="Lihat Detail Peminjaman"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Detail
                            </button>

                            {row.status === "pending" && (
                              <>
                                <button
                                  onClick={() => handleApprove(row.id)}
                                  disabled={actionLoading}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#0785BC] hover:bg-[#0672a0] active:scale-95 transition-all disabled:opacity-50 shadow-2xs"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  Validasi
                                </button>
                                <button
                                  onClick={() => handleReject(row.id)}
                                  disabled={actionLoading}
                                  className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 active:scale-95 transition-all disabled:opacity-50"
                                  title="Tolak Pengajuan"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                            {row.status === "active" && (
                              <span className="text-xs px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 font-medium">Dipinjam</span>
                            )}
                            {row.status === "overdue" && (
                              <button className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 active:scale-95 transition-all">
                                Ingatkan
                              </button>
                            )}
                            {row.status === "completed" && (
                              <span className="text-xs px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 font-medium">Selesai</span>
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

      {/* ── Modal Detail Peminjaman (Sebelum/Sesudah Validasi) ── */}
      {selectedBorrowing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh] my-auto animate-scale-in">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#0785BC]/10 text-[#0785BC] flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">Detail Peminjaman</h3>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">{selectedBorrowing.borrow_code}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedBorrowing(null)}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Status Banner */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-100">
                <div>
                  <p className="text-xs text-slate-500 font-medium">Status Pengajuan</p>
                  <div className="mt-1">
                    <StatusBadge status={selectedBorrowing.status} />
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500 font-medium">Dibuat Pada</p>
                  <p className="text-xs font-semibold text-slate-700 mt-1">{selectedBorrowing.created_at}</p>
                </div>
              </div>

              {/* Data Peminjam */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                  <User className="w-4 h-4 text-slate-500" /> Informasi Peminjam
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl border border-slate-100 bg-slate-50/30">
                  <div className="sm:col-span-2 flex items-center gap-3 pb-2 border-b border-slate-100">
                    <Avatar name={selectedBorrowing.borrower_name} foto={selectedBorrowing.borrower_foto} />
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{selectedBorrowing.borrower_name}</p>
                      <p className="text-xs text-slate-400">{selectedBorrowing.borrower_email}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Nama Lengkap</p>
                    <p className="text-sm font-semibold text-slate-800 mt-0.5">{selectedBorrowing.borrower_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Email</p>
                    <p className="text-sm font-semibold text-slate-800 mt-0.5">{selectedBorrowing.borrower_email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">No. Telepon</p>
                    <p className="text-sm font-semibold text-slate-800 mt-0.5">{selectedBorrowing.borrower_phone}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Peran</p>
                    <p className="text-sm font-semibold text-slate-800 mt-0.5">{selectedBorrowing.borrower_role}</p>
                  </div>
                </div>
              </div>

              {/* Jadwal & Keperluan */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-slate-500" /> Jadwal & Keperluan
                </h4>
                <div className="space-y-3 p-4 rounded-xl border border-slate-100 bg-slate-50/30">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-slate-400">Tanggal Pinjam</p>
                      <p className="text-sm font-semibold text-slate-800 mt-0.5">{selectedBorrowing.borrow_date}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Estimasi Kembali</p>
                      <p className="text-sm font-semibold text-slate-800 mt-0.5">
                        {selectedBorrowing.planned_return_date && selectedBorrowing.planned_return_date !== "-"
                          ? selectedBorrowing.planned_return_date
                          : selectedBorrowing.return_date}
                      </p>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-slate-100">
                    <p className="text-xs text-slate-400">Tujuan / Keperluan</p>
                    <p className="text-sm text-slate-700 mt-0.5 whitespace-pre-wrap">{selectedBorrowing.purpose || "-"}</p>
                  </div>
                  {selectedBorrowing.admin_note && (
                    <div className="pt-2 border-t border-slate-100">
                      <p className="text-xs text-slate-400">Catatan Admin</p>
                      <p className="text-sm text-slate-700 mt-0.5">{selectedBorrowing.admin_note}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Daftar Barang yang Dipinjam */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-slate-500" /> Barang yang Dipinjam ({selectedBorrowing.items.length})
                </h4>
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {selectedBorrowing.items.length > 0 ? (
                    selectedBorrowing.items.map((it, idx) => (
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
                      Tidak ada rincian barang individual
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer (Action Buttons) */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between gap-3">
              <button
                onClick={() => setSelectedBorrowing(null)}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200/70 rounded-xl transition-all"
              >
                Tutup
              </button>

              <div className="flex items-center gap-2">
                {selectedBorrowing.status === "pending" && (
                  <>
                    <button
                      onClick={() => handleReject(selectedBorrowing.id)}
                      disabled={actionLoading}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-all active:scale-95 disabled:opacity-50"
                    >
                      <X className="w-4 h-4" /> Tolak
                    </button>
                    <button
                      onClick={() => handleApprove(selectedBorrowing.id)}
                      disabled={actionLoading}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-[#0785BC] hover:bg-[#0672a0] rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-50"
                    >
                      <Check className="w-4 h-4" /> Validasi & Setujui
                    </button>
                  </>
                )}
                {selectedBorrowing.status === "active" && (
                  <span className="text-xs text-slate-500 font-medium px-3 py-1.5 rounded-lg bg-slate-100">
                    Peminjaman sudah divalidasi dan sedang berlangsung
                  </span>
                )}
                {selectedBorrowing.status === "completed" && (
                  <span className="text-xs text-emerald-700 font-medium px-3 py-1.5 rounded-lg bg-emerald-50">
                    Peminjaman telah selesai dikembalikan
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Export Peminjaman dengan Filter Tanggal ── */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="Ekspor Data Peminjaman"
        description="Unduh data riil transaksi peminjaman berdasarkan rentang waktu."
        moduleName="Peminjaman"
        filenamePrefix="SARPRAS_Peminjaman"
        data={borrowings}
        dateFieldGetter={(b) => (b as any).raw_borrow_date || b.borrow_date || b.created_at}
        dataRowMapper={(b) => ({
          "Kode Peminjaman": b.borrow_code,
          "Kode Barang": b.item_code,
          "Nama Barang": b.item_name,
          "Nama Peminjam": b.borrower_name,
          Email: b.borrower_email,
          "Tanggal Pinjam": b.borrow_date,
      "Estimasi Kembali": b.planned_return_date && b.planned_return_date !== "-" ? b.planned_return_date : b.return_date,
          Status: b.status.toUpperCase(),
          Keperluan: b.purpose || "-",
          Catatan: b.admin_note || "-",
        })}
      />
    </AdminLayout>
  );
}
