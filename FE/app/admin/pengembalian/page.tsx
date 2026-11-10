"use client";

import { useState, useEffect, useRef } from "react";
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
  ShieldAlert,
  Info,
} from "lucide-react";
import api from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { AdminLayout } from "@/components/admin";
import ExportModal from "@/components/ExportModal";
import { toast } from "@/components/Toast";
import { useLanguage } from "@/lib/i18n";

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

// Kondisi per item saat konfirmasi pengembalian
interface ItemConditionEntry {
  borrowings_item_id: string;
  item_name: string;
  item_code: string;
  quantity: number;
  source: "paket" | "tambahan"; // label asal item
  condition_after: string;      // "Baik" | "Rusak Ringan" | "Rusak Berat" | "Hilang"
  damage_description: string;
  fine_amount: string;
  fine_reason: string;
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
  package_id?: string | null;        // ada jika peminjaman paket
  package_name?: string | null;      // nama paket jika ada
  package_item_ids?: string[];       // item_id yang termasuk komponen paket
}

function useMount() {
  const [m, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  return m;
}

// ── Status Badge ──
function StatusBadge({ status }: { status: ReturnItem["status"] }) {
  const { t, lang } = useLanguage();
  if (status === "overdue")
    return (
      <span className="inline-flex w-max min-w-max items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-500 text-white uppercase tracking-wide whitespace-nowrap shadow-xs">
        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
        {t("modal.st_late", "Terlambat")}
      </span>
    );
  if (status === "due_today")
    return (
      <span className="inline-flex w-max min-w-max items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500 text-white uppercase tracking-wide whitespace-nowrap shadow-xs">
        <Clock className="w-3.5 h-3.5 shrink-0" />
        {lang === "en" ? "Due Today" : "Jatuh Tempo Hari Ini"}
      </span>
    );
  if (status === "returned")
    return (
      <span className="inline-flex w-max min-w-max items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500 text-white uppercase tracking-wide whitespace-nowrap shadow-xs">
        <Check className="w-3.5 h-3.5 shrink-0" />
        {t("modal.st_done", "Dikembalikan")}
      </span>
    );
  return (
    <span className="inline-flex w-max min-w-max items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-500 text-white uppercase tracking-wide whitespace-nowrap shadow-xs">
      <Clock className="w-3.5 h-3.5 shrink-0" />
      {t("modal.st_borrowed", "Sedang Dipinjam")}
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

// ── Sub-komponen: satu baris kondisi item dalam modal konfirmasi ──
function ItemConditionRow({
  ic,
  idx,
  onUpdate,
}: {
  ic: ItemConditionEntry;
  idx: number;
  onUpdate: (idx: number, field: keyof ItemConditionEntry, value: string) => void;
}) {
  const isRusak = ic.condition_after !== "Baik";
  return (
    <div className={`rounded-xl border p-4 space-y-3 transition-all ${
      isRusak ? "border-red-200 bg-red-50/40" : "border-slate-200 bg-white"
    }`}>
      {/* Baris atas: nama + pilih kondisi */}
      <div className="flex items-center gap-3">
        {/* Icon */}
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
          isRusak ? "bg-red-100" : "bg-slate-100"
        }`}>
          <Package className={`w-4 h-4 ${isRusak ? "text-red-400" : "text-slate-400"}`} />
        </div>
        {/* Nama + kode */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800 truncate">{ic.item_name}</p>
          <p className="text-[11px] text-slate-400 font-mono">{ic.item_code} · {ic.quantity} unit</p>
        </div>
        {/* Select kondisi */}
        <select
          value={ic.condition_after}
          onChange={(e) => onUpdate(idx, "condition_after", e.target.value)}
          className={`text-xs font-bold border rounded-lg px-2 py-1.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#0785BC] shrink-0 ${
            isRusak
              ? ic.condition_after === "Hilang"
                ? "border-red-300 bg-red-50 text-red-700"
                : ic.condition_after === "Rusak Berat"
                ? "border-orange-300 bg-orange-50 text-orange-700"
                : "border-yellow-300 bg-yellow-50 text-yellow-800"
              : "border-slate-200 bg-slate-50 text-slate-700"
          }`}
        >
          <option value="Baik">Baik</option>
          <option value="Rusak Ringan">Rusak Ringan</option>
          <option value="Rusak Berat">Rusak Berat</option>
          <option value="Hilang">Hilang</option>
        </select>
      </div>

      {/* Form detail kerusakan — muncul jika bukan "Baik" */}
      {isRusak && (
        <div className="space-y-2.5 pt-1 pl-12">
          {/* Detail kerusakan */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Detail kerusakan / kehilangan
            </label>
            <textarea
              rows={2}
              value={ic.damage_description}
              onChange={(e) => onUpdate(idx, "damage_description", e.target.value)}
              placeholder="Jelaskan kondisi barang secara detail..."
              className="w-full text-xs border border-slate-200 rounded-lg p-2.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0785BC]"
            />
          </div>
          {/* Denda */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Nominal Denda <span className="font-normal text-slate-400">(opsional)</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500">Rp</span>
              <input
                type="text"
                inputMode="numeric"
                value={ic.fine_amount ? Number(ic.fine_amount.replace(/\D/g, "")).toLocaleString("id-ID") : ""}
                onChange={(e) => onUpdate(idx, "fine_amount", e.target.value.replace(/\D/g, ""))}
                placeholder="0"
                className="w-full text-xs border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0785BC]"
              />
            </div>
          </div>
          {/* Alasan denda */}
          {Number(ic.fine_amount.replace(/\D/g, "") || 0) > 0 && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Alasan denda</label>
              <textarea
                rows={1}
                value={ic.fine_reason}
                onChange={(e) => onUpdate(idx, "fine_reason", e.target.value)}
                placeholder="Alasan penetapan denda..."
                className="w-full text-xs border border-slate-200 rounded-lg p-2.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0785BC]"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const PAGE_SIZE = 10;

export default function PengembalianPage() {
  const { t, lang } = useLanguage();
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
  const [damageDescription, setDamageDescription] = useState("");
  const [fineAmount, setFineAmount] = useState("");
  const [fineReason, setFineReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  // State untuk kondisi per item (diisi dari items milik peminjaman yang dikonfirmasi)
  const [itemConditions, setItemConditions] = useState<ItemConditionEntry[]>([]);
  const [confirmingBorrowItems, setConfirmingBorrowItems] = useState<ReturnItemDetail[]>([]);

  // Real Stat Counts
  const [realStats, setRealStats] = useState({
    active: 0,
    overdue: 0,
    returnedToday: 0,
    totalReturned: 0,
  });

  const hasHandledUrlRef = useRef(false);
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
              items: (b.borrowings_items || []).map((bi: any) => ({
                id: bi.id,
                item_id: bi.item_id,
                quantity: bi.quantity,
                condition_before: bi.condition_before,
                note: bi.note,
                items: bi.items,
              })),
              purpose: b.purpose || "-",
              package_id: b.package_id || null,
              package_name: b.packages?.name || null,
              // item_id yang termasuk komponen paket (dari packages_items)
              package_item_ids: (b.packages?.packages_items || []).map((pi: any) => pi.item_id),
            });
          }
        });
      }

      const newestFirst = [...itemsCombined].sort((a, b) => {
        const aTime = a.raw_date ? new Date(a.raw_date).getTime() : 0;
        const bTime = b.raw_date ? new Date(b.raw_date).getTime() : 0;
        return bTime - aTime;
      });
      setReturns(newestFirst);
      setTotal(itemsCombined.length);

      // Auto-select pengembalian jika diarahkan dari shortcut notifikasi (hanya sekali saat pertama buka)
      if (!hasHandledUrlRef.current && typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        const targetCode = params.get("code") || params.get("search");
        const targetId = params.get("id");
        if (targetCode || targetId) {
          hasHandledUrlRef.current = true;
          // Bersihkan parameter query dari URL agar tidak memicu auto-open berulang atau mengunci filter
          window.history.replaceState({}, "", window.location.pathname);

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

  useEffect(() => {
    fetchData();
  }, [page]);

  // Real-time: auto-refresh saat ada pengembalian / return request baru via Socket.IO
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleRefresh = () => {
      fetchData();
    };

    socket.on('return_created', handleRefresh);
    socket.on('return_request_created', handleRefresh);
    socket.on('return_request_updated', handleRefresh);
    socket.on('borrowing_updated', handleRefresh);

    return () => {
      socket.off('return_created', handleRefresh);
      socket.off('return_request_created', handleRefresh);
      socket.off('return_request_updated', handleRefresh);
      socket.off('borrowing_updated', handleRefresh);
    };
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
      label: lang === "en" ? "Awaiting Return" : "Menunggu Pengembalian",
      value: realStats.active,
      valueColor: "text-slate-900",
      icon: <Clock className="w-5 h-5 text-blue-500" />,
      iconBg: "bg-blue-50",
      filterKey: "active",
    },
    {
      label: lang === "en" ? "Overdue Deadline" : "Melewati Batas (Terlambat)",
      value: realStats.overdue,
      valueColor: "text-red-500",
      icon: <AlertTriangle className="w-5 h-5 text-red-500" />,
      iconBg: "bg-red-50",
      filterKey: "overdue",
    },
    {
      label: lang === "en" ? "Returned / Completed" : "Selesai Dikembalikan",
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

      // Hitung kondisi global dari seluruh item:
      // jika ada yang Hilang → global = Hilang, Rusak Berat → Rusak Berat, dst.
      const conditionPriority: Record<string, number> = {
        "Baik": 0,
        "Rusak Ringan": 1,
        "Rusak Berat": 2,
        "Hilang": 3,
      };
      let globalCondition = "Baik";
      let totalFine = 0;
      const allFineReasons: string[] = [];
      const allDamageDesc: string[] = [];

      const items_condition = itemConditions.map((ic) => {
        // Tentukan kondisi global (ambil yang terparah)
        if ((conditionPriority[ic.condition_after] ?? 0) > (conditionPriority[globalCondition] ?? 0)) {
          globalCondition = ic.condition_after;
        }
        const fineNum = Number(ic.fine_amount.replace(/\D/g, "") || 0);
        totalFine += fineNum;
        if (ic.damage_description) allDamageDesc.push(`[${ic.item_name}] ${ic.damage_description}`);
        if (fineNum > 0 && ic.fine_reason) allFineReasons.push(`[${ic.item_name}] ${ic.fine_reason}`);
        return {
          borrowings_item_id: ic.borrowings_item_id,
          condition_after: ic.condition_after,
          damage_description: ic.damage_description || "",
          fine_amount: fineNum,
          fine_reason: ic.fine_reason || "",
          quantity_returned: ic.quantity,
        };
      });

      await api.returns.create({
        borrowing_id: confirmingId,
        notes: confirmNote || "Dikonfirmasi admin",
        condition: itemConditions.length > 0 ? globalCondition : confirmCondition,
        items_condition: items_condition.length > 0 ? items_condition : undefined,
        damage_description: allDamageDesc.join(" | ") || damageDescription || undefined,
        fine_amount: totalFine > 0 ? totalFine : (fineAmount === "" ? 0 : Number(fineAmount)),
        fine_reason: allFineReasons.join(" | ") || fineReason || undefined,
      });
      setConfirmingId(null);
      setConfirmNote("");
      setDamageDescription("");
      setFineAmount("");
      setFineReason("");
      setItemConditions([]);
      setConfirmingBorrowItems([]);
      toast.success("Pengembalian fisik berhasil diverifikasi dan stok telah dipulihkan!", "Barang Kembali");
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || "Gagal memproses verifikasi pengembalian.", "Gagal");
    } finally {
      setActionLoading(false);
    }
  }

  // Helper: buka modal konfirmasi dan inisialisasi kondisi per item
  function openConfirmModal(
    borrowingId: string,
    borrowItems: ReturnItemDetail[],
    packageItemIds: string[] = []
  ) {
    setConfirmingId(borrowingId);
    setConfirmCondition("Baik");
    setConfirmNote("");
    setDamageDescription("");
    setFineAmount("");
    setFineReason("");
    setConfirmingBorrowItems(borrowItems);
    // Inisialisasi kondisi per item → default "Baik"
    // Tandai source: "paket" jika item_id ada di packageItemIds, "tambahan" jika tidak
    setItemConditions(
      borrowItems.map((bi) => ({
        borrowings_item_id: bi.id,
        item_name: bi.items?.name || "Barang",
        item_code: bi.items?.code || bi.item_id,
        quantity: bi.quantity,
        source: (packageItemIds || []).includes(bi.item_id) ? "paket" : "tambahan",
        condition_after: "Baik",
        damage_description: "",
        fine_amount: "",
        fine_reason: "",
      }))
    );
  }

  function updateItemCondition(idx: number, field: keyof ItemConditionEntry, value: string) {
    setItemConditions((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      // Reset field denda/kerusakan jika kondisi kembali "Baik"
      if (field === "condition_after" && value === "Baik") {
        updated[idx].damage_description = "";
        updated[idx].fine_amount = "";
        updated[idx].fine_reason = "";
      }
      return updated;
    });
  }

  return (
    <AdminLayout
      showSearch={true}
      searchValue={search}
      searchPlaceholder={t("admin.borrow.search_ph", "Cari data pengembalian...")}
      onSearchChange={setSearch}
    >
      <div className="space-y-6">
        {/* Page header */}
        <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${mounted ? "animate-fade-up" : "opacity-0"}`}>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                {t("admin.return.title", "Manajemen Pengembalian")}
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-slate-100 text-slate-600 border border-slate-200">
                PENGEMBALIAN ASET
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {t("admin.return.sub", "Pantau jadwal jatuh tempo, proses konfirmasi pengembalian barang, dan telusuri riwayat riil.")}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={fetchData}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200/90 rounded-lg hover:bg-slate-50 active:scale-95 transition-all shadow-2xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              {t("admin.dash.refresh", "Segarkan")}
            </button>
            <button
              onClick={() => setShowExportModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200/90 hover:bg-slate-50 active:scale-95 rounded-lg transition-all shadow-2xs cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-[#0785BC]" />
              {lang === "en" ? "Export Data" : "Ekspor Data"}
            </button>
          </div>
        </div>

        {/* ── Stat Cards Realtime (n8n Node Style) ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {stats.map((s, i) => (
            <div
              key={s.label}
              onClick={() => {
                setStatusFilter(statusFilter === s.filterKey ? "all" : s.filterKey);
                setPage(1);
              }}
              style={{ animationDelay: `${i * 60}ms` }}
              className={`group bg-white rounded-xl border p-4.5 flex flex-col justify-between cursor-pointer transition-all duration-200 hover:shadow-sm ${
                statusFilter === s.filterKey
                  ? "border-[#0785BC] ring-2 ring-[#0785BC]/20 shadow-xs bg-sky-50/20"
                  : "border-slate-200/90 shadow-xs hover:border-slate-300"
              } ${mounted ? "animate-fade-up" : "opacity-0"}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200 mb-1.5">
                    {s.filterKey === "active" ? "ACTIVE RUN" : s.filterKey === "overdue" ? "OVERDUE" : "COMPLETED"}
                  </span>
                  <p className="text-xs font-medium text-slate-500 leading-snug">
                    {s.label}
                  </p>
                </div>
                <div className={`w-8 h-8 rounded-lg ${s.iconBg} border border-slate-100 flex items-center justify-center shrink-0`}>
                  {s.icon}
                </div>
              </div>
              <div className="mt-3">
                <p className={`text-2xl font-black tabular-nums tracking-tight ${s.valueColor} ${mounted ? "animate-count-up" : ""}`}>
                  {s.value}
                </p>
                <div className="pt-2.5 mt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-400">
                    {s.filterKey === "active"
                      ? (lang === "en" ? "Items in borrower possession" : "Barang di tangan peminjam")
                      : s.filterKey === "overdue"
                      ? (lang === "en" ? "Immediate reminder required" : "Perlu peneguran segera")
                      : (lang === "en" ? "Assets returned to storage" : "Aset kembali ke gudang")}
                  </span>
                  <span className={`text-[10px] font-mono font-semibold transition-colors ${
                    statusFilter === s.filterKey ? "text-[#0785BC]" : "text-slate-400 group-hover:text-[#0785BC]"
                  }`}>
                    {statusFilter === s.filterKey ? (lang === "en" ? "• ACTIVE" : "• AKTIF") : "FILTER"}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Daftar Pengembalian Table ── */}
        <div className={`bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden ${mounted ? "animate-fade-up delay-200" : "opacity-0"}`}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-5 py-3.5 border-b border-slate-200/80 bg-slate-50/50">
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">{t("admin.return.list_title", "Daftar Status Pengembalian")}</h2>
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="text-xs font-semibold border border-slate-200 rounded-xl px-3 py-1.5 text-slate-600 bg-white focus:outline-none focus:ring-2 focus:ring-[#0785BC] transition-all cursor-pointer"
              >
                <option value="all">{lang === "en" ? "All Statuses" : "Semua Status"}</option>
                <option value="active">{lang === "en" ? "Borrowed / Due" : "Sedang Dipinjam / Due"}</option>
                <option value="overdue">{lang === "en" ? "Overdue" : "Overdue (Terlambat)"}</option>
                <option value="returned">{lang === "en" ? "Returned (Done)" : "Dikembalikan (Selesai)"}</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left">
                  <th className="px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">{t("admin.dash.th_item_code", "Barang & Kode")}</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">{t("admin.dash.th_borrower", "Peminjam")}</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">{t("admin.borrow.th_return_date", "Jatuh Tempo / Kembali")}</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">{t("admin.items.th_status", "Status")}</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">{t("admin.items.th_action", "Aksi")}</th>
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
                              <p className="text-xs text-slate-400 mt-0.5">{lang === "en" ? "Successfully returned" : "Telah dikembalikan"}</p>
                            </div>
                          ) : row.status === "overdue" ? (
                            <div>
                              <p className="font-semibold text-red-500">{row.due_date}</p>
                              <p className="text-xs text-red-400 mt-0.5">{lang === "en" ? `Overdue ${row.overdue_days || "-"} Days` : `Terlambat ${row.overdue_days || "-"} Hari`}</p>
                            </div>
                          ) : (
                            <div>
                              <p className="text-slate-600">{row.due_date}</p>
                              <p className="text-xs text-slate-400 mt-0.5">{lang === "en" ? "Borrow:" : "Pinjam:"} {row.borrow_date}</p>
                            </div>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-4 whitespace-nowrap">
                          <StatusBadge status={row.status} />
                        </td>

                        {/* Aksi */}
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setSelectedItem(row)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 active:scale-95 transition-all cursor-pointer"
                              title={t("admin.borrow.detail_heading", "Lihat Detail")}
                            >
                              <Eye className="w-3.5 h-3.5" />
                              {t("common.detail", "Detail")}
                            </button>

                            {row.status !== "returned" ? (
                              <button
                                onClick={() => {
                                  openConfirmModal(row.borrowing_id, row.items, row.package_item_ids || []);
                                }}
                                className="px-3 py-1.5 text-xs font-bold text-white bg-[#0785BC] hover:bg-[#0672a0] active:scale-95 rounded-xl transition-all shadow-sm cursor-pointer"
                              >
                                {lang === "en" ? "Confirm Return" : "Konfirmasi Kembali"}
                              </button>
                            ) : (
                              <span className="text-xs px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 font-medium">
                                {t("modal.st_done", "Selesai")}
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh] my-auto animate-scale-in">
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
                    const borrowItems = selectedItem.items;
                    const pkgItemIds = selectedItem.package_item_ids || [];
                    setSelectedItem(null);
                    openConfirmModal(borrowId, borrowItems, pkgItemIds);
                  }}
                  className="px-4 py-2 text-sm font-bold text-white bg-[#0785BC] hover:bg-[#0672a0] rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer"
                >
                  {t("admin.return.confirm_return_btn", "Konfirmasi Pengembalian Ini")}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Konfirmasi Pengembalian (Per Item) ── */}
      {confirmingId && (() => {
        const paketItems   = itemConditions.filter(ic => ic.source === "paket");
        const tambahanItems = itemConditions.filter(ic => ic.source === "tambahan");
        const totalDenda   = itemConditions.reduce((s, ic) => s + Number(ic.fine_amount.replace(/\D/g,"") || 0), 0);
        const adaYangRusak = itemConditions.some(ic => ic.condition_after !== "Baik");

        return (
          <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl border border-slate-200 my-6 animate-scale-in flex flex-col">

              {/* ── Header ── */}
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60 rounded-t-2xl shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#0785BC]/10 text-[#0785BC] flex items-center justify-center">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-base">Konfirmasi Pengembalian Barang</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Periksa kondisi tiap barang — yang rusak tidak akan masuk stok
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => { setConfirmingId(null); setItemConditions([]); setConfirmingBorrowItems([]); }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* ── Info legend ── */}
              <div className="px-6 pt-4 pb-0 flex items-start gap-2">
                <Info className="w-3.5 h-3.5 text-[#0785BC] mt-0.5 shrink-0" />
                <p className="text-xs text-slate-500 leading-relaxed">
                  Semua barang di-set <span className="font-semibold text-emerald-600">Baik</span> secara default.
                  Ubah kondisi hanya pada barang yang rusak atau hilang — stoknya <span className="font-semibold text-red-500">tidak akan dikembalikan</span>.
                  Barang yang kondisinya Baik akan otomatis masuk kembali ke stok.
                </p>
              </div>

              {/* ── Body scrollable ── */}
              <div className="overflow-y-auto px-6 py-4 space-y-5 max-h-[60vh]">

                {/* Kelompok: Barang Paket */}
                {paketItems.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-100 text-blue-700 border border-blue-200">
                        <Package className="w-3 h-3" /> DARI PAKET
                      </span>
                      <span className="text-xs text-slate-400">{paketItems.length} barang</span>
                    </div>
                    <div className="space-y-2">
                      {paketItems.map((ic) => {
                        const idx = itemConditions.findIndex(x => x.borrowings_item_id === ic.borrowings_item_id);
                        return (
                          <ItemConditionRow
                            key={ic.borrowings_item_id}
                            ic={ic}
                            idx={idx}
                            onUpdate={updateItemCondition}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Kelompok: Barang Tambahan */}
                {tambahanItems.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-green-100 text-purple-700 border border-purple-200">
                        <Package className="w-3 h-3" /> BARANG TAMBAHAN
                      </span>
                      <span className="text-xs text-slate-400">{tambahanItems.length} barang</span>
                    </div>
                    <div className="space-y-2">
                      {tambahanItems.map((ic) => {
                        const idx = itemConditions.findIndex(x => x.borrowings_item_id === ic.borrowings_item_id);
                        return (
                          <ItemConditionRow
                            key={ic.borrowings_item_id}
                            ic={ic}
                            idx={idx}
                            onUpdate={updateItemCondition}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Fallback: semua item tanpa group */}
                {paketItems.length === 0 && tambahanItems.length === 0 && itemConditions.length > 0 && (
                  <div className="space-y-2">
                    {itemConditions.map((ic, idx) => (
                      <ItemConditionRow
                        key={ic.borrowings_item_id}
                        ic={ic}
                        idx={idx}
                        onUpdate={updateItemCondition}
                      />
                    ))}
                  </div>
                )}

                {/* Ringkasan denda */}
                {totalDenda > 0 && (
                  <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-amber-50 border border-amber-200">
                    <div className="flex items-center gap-2 text-amber-700">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span className="text-xs font-semibold">Total Denda dari seluruh barang rusak</span>
                    </div>
                    <span className="text-sm font-bold text-amber-800">
                      Rp {totalDenda.toLocaleString("id-ID")}
                    </span>
                  </div>
                )}

                {/* Ringkasan stok */}
                {itemConditions.length > 0 && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 space-y-1.5">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Ringkasan Stok</p>
                    {itemConditions.map(ic => (
                      <div key={ic.borrowings_item_id} className="flex items-center justify-between text-xs">
                        <span className="text-slate-600 truncate max-w-[65%]">{ic.item_name}</span>
                        {ic.condition_after === "Baik" ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                            <Check className="w-3 h-3" /> +{ic.quantity} kembali ke stok
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-red-500 font-semibold">
                            <X className="w-3 h-3" /> tidak masuk stok ({ic.condition_after})
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Catatan umum */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Catatan Pengembalian <span className="font-normal text-slate-400">(Opsional)</span>
                  </label>
                  <textarea
                    rows={2}
                    value={confirmNote}
                    onChange={(e) => setConfirmNote(e.target.value)}
                    placeholder="Contoh: Barang dikembalikan tepat waktu..."
                    className="w-full text-sm border border-slate-200 rounded-xl p-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0785BC]"
                  />
                </div>
              </div>

              {/* ── Footer ── */}
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl flex items-center justify-between gap-2 shrink-0">
                <div className="text-xs text-slate-400">
                  {adaYangRusak
                    ? <span className="text-red-500 font-semibold">⚠ Ada barang rusak/hilang — tidak masuk stok</span>
                    : <span className="text-emerald-600 font-semibold">✓ Semua barang dalam kondisi baik</span>
                  }
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setConfirmingId(null); setItemConditions([]); setConfirmingBorrowItems([]); }}
                    disabled={actionLoading}
                    className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200/70 rounded-xl transition-all cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleConfirmSubmit}
                    disabled={actionLoading}
                    className="inline-flex items-center gap-1.5 px-5 py-2 text-sm font-bold text-white bg-[#0785BC] hover:bg-[#0672a0] rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    {actionLoading ? "Memproses..." : "Konfirmasi Selesai"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

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
