"use client";

import { useState, useEffect, useRef } from "react";
import {
  Plus,
  FileText,
  Wrench,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  Loader2,
  Check,
  Eye,
  AlertTriangle,
  Clock,
  RefreshCw,
  Search,
  DollarSign,
  User,
  Package,
  Boxes,
  ArrowUpRight,
  Download,
  FileSpreadsheet,
  Image as ImageIcon,
  UploadCloud,
  Trash2,
  ZoomIn,
} from "lucide-react";
import api, { getCurrentUser } from "@/lib/api";
import { AdminLayout } from "@/components/admin";
import ExportModal from "@/components/ExportModal";
import { toast } from "@/components/Toast";
import { useLanguage } from "@/lib/i18n";

type ReportStatus = "pending" | "in_progress" | "resolved";

interface DamageReport {
  id: string;
  report_code: string;
  item_code: string;
  item_name: string;
  reporter_name: string;
  reporter_role?: string;
  reporter_email?: string;
  reporter_foto?: string | null;
  title: string;
  description: string;
  image_url?: string | null;
  reported_date: string;
  raw_created_at?: string | null;
  status: ReportStatus;
  raw_status: string;
  fine_amount: number;
  fine_reason: string;
  fine_status: string;
  admin_note?: string;
  damage_type?: string;
}

interface ItemOption {
  id: string;
  name: string;
  code: string;
  category?: string;
  condition?: string;
}

interface PackageOption {
  id: string;
  name: string;
  code?: string;
  description?: string;
  status?: string;
  item_count?: number;
  components_text?: string;
}

interface UserOption {
  id: string;
  name: string;
  email: string;
  role: string;
  nomor_induk?: string;
  foto?: string | null;
}

interface BorrowingItemData {
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
    condition?: string;
    status?: string;
  };
}

interface BorrowingData {
  id: string;
  borrow_code: string;
  user_id: string;
  purpose?: string;
  status: string;
  borrow_date?: string;
  expected_return_date?: string;
  actual_return_date?: string;
  users?: {
    id: string;
    name: string;
    nomor_induk?: string;
    email?: string;
    role?: string;
    foto?: string | null;
  };
  borrowings_items?: BorrowingItemData[];
}

function useMount() {
  const [m, setM] = useState(false);
  useEffect(() => { setM(true); }, []);
  return m;
}

// â”€â”€ Modern Status Badge â”€â”€
function StatusBadge({ status }: { status: ReportStatus }) {
  if (status === "pending") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200/80 shadow-2xs">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
        Menunggu Review
      </span>
    );
  }
  if (status === "in_progress") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/80 shadow-2xs">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
        Sedang Diperbaiki
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs">
      <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
      Selesai
    </span>
  );
}

// â”€â”€ Avatar initials â”€â”€
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
    : "U";

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
    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0 bg-[#0785BC]">
      {initials}
    </div>
  );
}

const PAGE_SIZE = 10;

export default function RekapLaporanPage() {
  const { t, lang } = useLanguage();
  const [reports, setReports]             = useState<DamageReport[]>([]);
  const [items, setItems]                 = useState<ItemOption[]>([]);
  const [packagesList, setPackagesList]   = useState<PackageOption[]>([]);
  const [usersList, setUsersList]         = useState<UserOption[]>([]);
  const [borrowingsList, setBorrowingsList] = useState<BorrowingData[]>([]);
  const [loading, setLoading]             = useState(true);
  const [search, setSearch]               = useState("");
  const [statusFilter, setStatusFilter]   = useState("");
  const [fineFilter, setFineFilter]       = useState<"all" | "unpaid" | "paid">("all");
  const [page, setPage]                   = useState(1);
  const [total, setTotal]                 = useState(0);
  const hasHandledUrlRef                  = useRef(false);

  // Stats across database
  const [globalStats, setGlobalStats]     = useState({
    pending: 0,
    in_progress: 0,
    resolved: 0,
    total: 0,
    totalFine: 0,
    unpaidFine: 0,
    paidFineCount: 0,
    unpaidFineCount: 0,
  });

  // Modal Create
  const [showModal, setShowModal]         = useState(false);
  const [saving, setSaving]               = useState(false);
  const [formData, setFormData]           = useState({
    user_id: "",
    borrowing_id: "",
    item_id: "",
    package_id: "",
    damage_type: "per_item" as "per_item" | "per_package",
    report_type: "Kerusakan",
    title: "",
    description: "",
    image_url: "",
    fine_amount: "",
    fine_reason: "",
  });

  const [previewImage, setPreviewImage]           = useState<string | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.warning("Hanya file gambar yang diperbolehkan (JPG, PNG, WEBP).", "Format Tidak Valid");
      e.target.value = "";
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      toast.warning("Ukuran gambar melebihi batas maksimal 3MB.", "Ukuran Terlalu Besar");
      e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setFormData((prev) => ({ ...prev, image_url: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  // Modal Mode: "by_transaction" (per transaksi peminjaman) atau "manual" (katalog langsung)
  const [modalMode, setModalMode]                 = useState<"by_transaction" | "manual">("by_transaction");
  const [borrowingSearch, setBorrowingSearch]     = useState("");

  // User search in modal (manual mode)
  const [userSearch, setUserSearch]               = useState("");
  const [userDropdownOpen, setUserDropdownOpen]   = useState(false);
  const userDropdownRef                           = useRef<HTMLDivElement>(null);

  // Item/Package filter & search in modal (manual mode)
  const [itemTypeTab, setItemTypeTab]             = useState<"all" | "item" | "package">("all");
  const [itemSearch, setItemSearch]               = useState("");
  const [itemDropdownOpen, setItemDropdownOpen]   = useState(false);
  const itemDropdownRef                           = useRef<HTMLDivElement>(null);

  // Modal Action & Denda
  const [actionReport, setActionReport]   = useState<DamageReport | null>(null);
  const [actionStatus, setActionStatus]   = useState("Sedang Diperbaiki");
  const [fineAmount, setFineAmount]       = useState<number | string>("");
  const [fineReason, setFineReason]       = useState("");
  const [fineStatus, setFineStatus]       = useState("Tidak Ada Denda");
  const [adminNote, setAdminNote]         = useState("");
  const [submittingAction, setSubmittingAction] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  // Modal Riwayat Read-Only
  const [historyReport, setHistoryReport] = useState<DamageReport | null>(null);

  const mounted = useMount();

  // Handle click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false);
      }
      if (itemDropdownRef.current && !itemDropdownRef.current.contains(e.target as Node)) {
        setItemDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleOpenCreateModal = () => {
    setFormData({
      user_id: "",
      borrowing_id: "",
      item_id: "",
      package_id: "",
      damage_type: "per_item",
      report_type: "Kerusakan",
      title: "",
      description: "",
      image_url: "",
      fine_amount: "",
      fine_reason: "",
    });
    setModalMode("by_transaction");
    setBorrowingSearch("");
    setUserSearch("");
    setUserDropdownOpen(false);
    setItemSearch("");
    setItemTypeTab("all");
    setItemDropdownOpen(false);
    setShowModal(true);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [res, itemsRes, usersRes, packagesRes, borrowingsRes] = await Promise.all([
        api.damageReports.getAll({
          ...(statusFilter === "pending"
            ? { status: "Menunggu Review" }
            : statusFilter === "in_progress"
            ? { status: "Sedang Diperbaiki" }
            : statusFilter === "resolved"
            ? { status: "Selesai" }
            : {}),
          ...(fineFilter === "unpaid"
            ? { fine_status: "Belum Dibayar" }
            : fineFilter === "paid"
            ? { fine_status: "Sudah Dibayar" }
            : {}),
          page,
          limit: PAGE_SIZE,
        }),
        api.items.getAll({ limit: 100 }),
        api.users.getAll({ limit: 100 }),
        api.packages.getAll(),
        api.borrowings.getAll({ limit: 100 }),
      ]);

      if (itemsRes.status === "success" && Array.isArray(itemsRes.data)) {
        setItems(
          itemsRes.data.map((i: any) => ({
            id: i.id,
            name: i.name,
            code: i.code,
            category: i.categories?.name || i.category,
            condition: i.condition,
          }))
        );
      }

      if (packagesRes && packagesRes.status === "success" && Array.isArray(packagesRes.data)) {
        setPackagesList(
          packagesRes.data.map((p: any) => ({
            id: p.id,
            name: p.name,
            code: p.code || p.package_code || "PAKET",
            description: p.description,
            status: p.status,
            item_count: p.packages_items?.length || 0,
          }))
        );
      }

      if (usersRes.status === "success" && Array.isArray(usersRes.data)) {
        setUsersList(
          usersRes.data.map((u: any) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role,
            nomor_induk: u.nomor_induk,
            foto: u.foto,
          }))
        );
      }

      if (borrowingsRes && borrowingsRes.status === "success" && Array.isArray(borrowingsRes.data)) {
        setBorrowingsList(borrowingsRes.data as BorrowingData[]);
      }

      // Update global stats from BE response meta counts if available
      if ((res as any).counts) {
        setGlobalStats((res as any).counts);
      }

      if (res.status === "success" && Array.isArray(res.data)) {
        const mapped: DamageReport[] = res.data.map((raw: any) => {
          let st: ReportStatus = "pending";
          const rawStatus = (raw.status || "").toLowerCase();
          const fineStatus = raw.fine_status || "Tidak Ada Denda";
          const isResolved =
            rawStatus.includes("selesai") ||
            rawStatus === "resolved" ||
            fineStatus === "Sudah Dibayar";

          if (isResolved) {
            st = "resolved";
          } else if (
            rawStatus.includes("perbaik") ||
            rawStatus.includes("proses") ||
            rawStatus === "in_progress" ||
            rawStatus === "sedang diperbaiki"
          ) {
            st = "in_progress";
          }

          const userObj = raw.users || {};
          const itemObj = raw.items || {};
          const packageObj = raw.packages || {};
          const isPackage = raw.damage_type === "per_package" || (!raw.item_id && Boolean(raw.package_id));

          return {
            id: raw.id,
            report_code: raw.report_code || (raw.id ? `LPR-${String(raw.id).substring(0, 8).toUpperCase()}` : "-"),
            item_name: isPackage
              ? (packageObj.name || raw.package_name || raw.title || "Paket Barang")
              : (itemObj.name || raw.item_name || raw.title || "Barang SARPRAS"),
            item_code: isPackage ? (packageObj.code || "PAKET") : (itemObj.code || raw.item_code || "-"),
            reporter_name: userObj.name || raw.reporter_name || "Pengguna",
            reporter_role: userObj.role || "Mahasiswa",
            reporter_email: userObj.email || "-",
            reporter_foto: userObj.foto || null,
            title: raw.title || "Laporan Kerusakan",
            description: raw.description || raw.damage_description || "-",
            image_url: raw.image_url || raw.photo_url || null,
            reported_date: raw.created_at
              ? new Date(raw.created_at).toLocaleDateString("id-ID", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })
              : "-",
            raw_created_at: raw.created_at || null,
            status: st,
            raw_status: isResolved ? "Selesai" : (raw.status || "Menunggu Review"),
            fine_amount: Number(raw.fine_amount) || 0,
            fine_reason: raw.fine_reason || "",
            fine_status: isResolved && raw.fine_amount > 0 && fineStatus === "Belum Dibayar" ? "Sudah Dibayar" : fineStatus,
            admin_note: raw.admin_note || "",
            damage_type: raw.damage_type || (isPackage ? "per_package" : "per_item"),
          };
        });

        setReports(mapped);
        setTotal(res.total || mapped.length);

        // Fallback stats if BE counts was not provided
        if (!(res as any).counts) {
          const pending = mapped.filter((r) => r.status === "pending").length;
          const inProg = mapped.filter((r) => r.status === "in_progress").length;
          const resvd = mapped.filter((r) => r.status === "resolved").length;
          const totalFine = mapped.reduce((acc, r) => acc + r.fine_amount, 0);
          const unpaidFine = mapped.filter((r) => r.fine_status === "Belum Dibayar").reduce((acc, r) => acc + r.fine_amount, 0);
          const paidFineCount = mapped.filter((r) => (r.fine_status === "Sudah Dibayar" || r.status === "resolved") && r.fine_amount > 0).length;
          const unpaidFineCount = mapped.filter((r) => r.fine_status === "Belum Dibayar" && r.fine_amount > 0).length;

          setGlobalStats((prev) => ({
            ...prev,
            pending: statusFilter === "pending" ? res.total || pending : prev.pending || pending,
            in_progress: statusFilter === "in_progress" ? res.total || inProg : prev.in_progress || inProg,
            resolved: statusFilter === "resolved" ? res.total || resvd : prev.resolved || resvd,
            total: res.total || mapped.length,
            totalFine: totalFine || prev.totalFine,
            unpaidFine: unpaidFine || prev.unpaidFine,
            paidFineCount: paidFineCount || prev.paidFineCount,
            unpaidFineCount: unpaidFineCount || prev.unpaidFineCount,
          }));
        }
      } else {
        setReports([]);
        setTotal(0);
      }
    } catch (err) {
      console.warn("Gagal memuat laporan kerusakan:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter, fineFilter, page]);

  const handleCreateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.user_id) {
      toast.warning("Silakan pilih peminjam / pelapor terlebih dahulu.", "Pelapor Belum Dipilih");
      return;
    }
    if (!formData.item_id && !formData.package_id) {
      toast.warning("Silakan pilih barang atau paket yang mengalami kerusakan.", "Aset Belum Dipilih");
      return;
    }
    if (!formData.title.trim()) {
      toast.warning("Judul laporan / ringkasan masalah wajib diisi.", "Validasi Input");
      return;
    }

    setSaving(true);
    try {
      const currentUser = getCurrentUser();
      const payload = {
        user_id: formData.user_id || currentUser?.id,
        borrowing_id: formData.borrowing_id || undefined,
        item_id: formData.item_id || undefined,
        package_id: formData.package_id || undefined,
        damage_type: formData.damage_type || (formData.package_id ? "per_package" : "per_item"),
        report_type: formData.report_type,
        title: formData.title.trim(),
        description: formData.description.trim(),
        image_url: formData.image_url || undefined,
        fine_amount: formData.fine_amount ? Number(formData.fine_amount) : 0,
        fine_reason: formData.fine_reason || "",
      };

      const res = await api.damageReports.create(payload);

      if (res.status === "success") {
        await fetchData();
        setShowModal(false);
        setFormData({
          user_id: "",
          borrowing_id: "",
          item_id: "",
          package_id: "",
          damage_type: "per_item",
          report_type: "Kerusakan",
          title: "",
          description: "",
          image_url: "",
          fine_amount: "",
          fine_reason: "",
        });
        setBorrowingSearch("");
        setUserSearch("");
        setItemSearch("");
        toast.success("Laporan kerusakan berhasil dicatat dalam rekapitulasi sarpras.", "Laporan Dibuat");
      } else {
        toast.error(res.message || "Gagal mencatat laporan kerusakan.", "Penyimpanan Gagal");
      }
    } catch (err: any) {
      toast.error(err?.message || "Terjadi kesalahan saat memproses laporan.", "Error");
    } finally {
      setSaving(false);
    }
  };

  const handleOpenActionModal = (row: DamageReport) => {
    setActionReport(row);
    setActionStatus(row.status === "pending" ? "Sedang Diperbaiki" : "Selesai");
    setFineAmount(row.fine_amount && row.fine_amount > 0 ? row.fine_amount : "");
    setFineReason(row.fine_reason || "");
    setFineStatus(row.fine_status || (row.fine_amount > 0 ? "Belum Dibayar" : "Tidak Ada Denda"));
    setAdminNote(row.admin_note || "");
  };

  // Auto-open modal jika URL berisi query parameter code / search / report_id dari shortcut notifikasi (hanya sekali)
  useEffect(() => {
    if (hasHandledUrlRef.current || typeof window === "undefined" || reports.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const targetCode = params.get("code") || params.get("search");
    const targetId = params.get("id") || params.get("report_id");
    if (targetCode || targetId) {
      hasHandledUrlRef.current = true;
      // Bersihkan parameter query dari URL agar tidak memicu auto-open berulang atau mengunci filter
      window.history.replaceState({}, "", window.location.pathname);

      const found = reports.find(
        (r) =>
          (targetId && r.id === targetId) ||
          (targetCode && r.report_code.toLowerCase() === targetCode.toLowerCase())
      );
      if (found && !actionReport) {
        handleOpenActionModal(found);
      }
    }
  }, [reports]);

  const handleDirectResolve = async (row: DamageReport) => {
    if (!confirm(`Tandai laporan "${row.title}" langsung Selesai (tuntas)?`)) return;

    try {
      const payload: any = {
        status: "Selesai",
        fine_status: row.fine_amount > 0 ? "Sudah Dibayar" : "Tidak Ada Denda",
        admin_note: row.admin_note || "Laporan telah diselesaikan dan ditutup oleh Admin SARPRAS.",
      };

      const res = await api.damageReports.updateStatus(row.id, payload);
      if (res.status === "success" || res.data) {
        await fetchData();
        toast.success(`Laporan "${row.title}" berhasil diselesaikan dan ditutup!`, "Status Selesai");
      } else {
        toast.error(res.message || "Gagal menyelesaikan laporan.", "Gagal");
      }
    } catch (err: any) {
      toast.error(err?.message || "Terjadi kesalahan saat menyelesaikan status laporan.", "Error");
    }
  };

  const handleSubmitAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionReport) return;

    setSubmittingAction(true);
    try {
      const numericFine = Number(fineAmount) || 0;
      let finalStatus = actionStatus;
      let finalFineStatus =
        numericFine > 0
          ? fineStatus === "Tidak Ada Denda"
            ? "Belum Dibayar"
            : fineStatus
          : "Tidak Ada Denda";

      // Aturan: Jika denda sudah dibayar, status penanganan otomatis Selesai
      if (finalFineStatus === "Sudah Dibayar") {
        finalStatus = "Selesai";
      } else if (actionStatus === "Selesai" && numericFine > 0 && finalFineStatus === "Belum Dibayar") {
        finalFineStatus = "Sudah Dibayar";
      }

      const payload = {
        status: finalStatus,
        fine_amount: numericFine,
        fine_reason: fineReason,
        fine_status: finalFineStatus,
        admin_note: adminNote,
      };

      const res = await api.damageReports.updateStatus(actionReport.id, payload);
      if (res.status === "success") {
        await fetchData();
        setActionReport(null);
        toast.success("Status penanganan dan rincian denda berhasil diperbarui!", "Data Disimpan");
      } else {
        toast.error(res.message || "Gagal memperbarui data laporan.", "Pembaruan Gagal");
      }
    } catch (err: any) {
      toast.error(err?.message || "Terjadi kesalahan saat menyimpan perubahan laporan.", "Error");
    } finally {
      setSubmittingAction(false);
    }
  };

  const unpaidFineCount =
    globalStats.unpaidFineCount ||
    reports.filter(
      (r) =>
        (r.fine_status === "Belum Dibayar" ||
          (r.fine_amount > 0 && r.status !== "resolved")) &&
        r.fine_amount > 0
    ).length;

  const paidFineCount =
    globalStats.paidFineCount ||
    reports.filter(
      (r) =>
        (r.fine_status === "Sudah Dibayar" || r.status === "resolved") &&
        r.fine_amount > 0
    ).length;

  const filtered = reports.filter((r) => {
    const isFullyResolved = r.status === "resolved" || r.fine_status === "Sudah Dibayar";
    const currentFineStatus = isFullyResolved && r.fine_amount > 0 ? "Sudah Dibayar" : r.fine_status;
    const fineSearchTerms =
      currentFineStatus === "Sudah Dibayar"
        ? "lunas sudah lunas sudah dibayar"
        : r.fine_amount > 0
        ? "belum lunas belum dibayar denda"
        : "bebas denda tanpa denda";

    const matchSearch =
      !search ||
      r.item_name.toLowerCase().includes(search.toLowerCase()) ||
      r.reporter_name.toLowerCase().includes(search.toLowerCase()) ||
      r.item_code.toLowerCase().includes(search.toLowerCase()) ||
      r.report_code.toLowerCase().includes(search.toLowerCase()) ||
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      fineSearchTerms.includes(search.toLowerCase());

    let matchFine = true;
    if (fineFilter === "unpaid") {
      matchFine = currentFineStatus === "Belum Dibayar" && r.fine_amount > 0;
    } else if (fineFilter === "paid") {
      matchFine = currentFineStatus === "Sudah Dibayar" && r.fine_amount > 0;
    }

    return matchSearch && matchFine;
  });

  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;

  // Derived state for Create Modal (User & Item/Package selection)
  const selectedUser = usersList.find((u) => u.id === formData.user_id) || null;
  const filteredUsers = usersList.filter((u) => {
    if (!userSearch.trim()) return true;
    const q = userSearch.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      (u.nomor_induk && u.nomor_induk.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.role && u.role.toLowerCase().includes(q))
    );
  });

  const selectedItem = items.find((i) => i.id === formData.item_id) || null;
  const selectedPackage = packagesList.find((p) => p.id === formData.package_id) || null;
  const hasSelectedItemOrPackage = Boolean(selectedItem || selectedPackage);

  // Transaksi peminjaman derived state
  const selectedBorrowing = borrowingsList.find((b) => b.id === formData.borrowing_id) || null;
  const selectedBorrowingItem = selectedBorrowing?.borrowings_items?.find(
    (bi) => bi.item_id === formData.item_id || bi.items?.id === formData.item_id
  ) || null;

  const qBorrow = borrowingSearch.toLowerCase().trim();
  const filteredBorrowings = borrowingsList.filter((b) => {
    if (!qBorrow) return true;
    const userName = b.users?.name?.toLowerCase() || "";
    const userNim = b.users?.nomor_induk?.toLowerCase() || "";
    const userEmail = b.users?.email?.toLowerCase() || "";
    const code = b.borrow_code?.toLowerCase() || "";
    const purpose = b.purpose?.toLowerCase() || "";
    const hasItem = (b.borrowings_items || []).some(
      (bi) =>
        bi.items?.name?.toLowerCase().includes(qBorrow) ||
        bi.items?.code?.toLowerCase().includes(qBorrow)
    );
    return (
      userName.includes(qBorrow) ||
      userNim.includes(qBorrow) ||
      userEmail.includes(qBorrow) ||
      code.includes(qBorrow) ||
      purpose.includes(qBorrow) ||
      hasItem
    );
  });

  const qItem = itemSearch.toLowerCase().trim();
  const filteredItems = (itemTypeTab === "package" ? [] : items).filter((it) => {
    if (!qItem) return true;
    return (
      it.name.toLowerCase().includes(qItem) ||
      (it.code && it.code.toLowerCase().includes(qItem)) ||
      (it.category && it.category.toLowerCase().includes(qItem))
    );
  });

  const filteredPackages = (itemTypeTab === "item" ? [] : packagesList).filter((pkg) => {
    if (!qItem) return true;
    return (
      pkg.name.toLowerCase().includes(qItem) ||
      (pkg.code && pkg.code.toLowerCase().includes(qItem)) ||
      (pkg.description && pkg.description.toLowerCase().includes(qItem))
    );
  });

  const totalItemPackageResults = filteredItems.length + filteredPackages.length;

  return (
    <AdminLayout
      showSearch={true}
      searchValue={search}
      searchPlaceholder={t("admin.damage.search_ph", "Cari laporan, kode, nama barang...")}
      onSearchChange={setSearch}
    >
      <div className="space-y-6">
        {/* â”€â”€ Page Header â”€â”€ */}
        <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${mounted ? "animate-fade-up" : "opacity-0"}`}>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                {t("admin.damage.title", "Laporan Kerusakan & Insiden Aset")}
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-slate-100 text-slate-600 border border-slate-200">
                INCIDENT DESK
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {t("admin.damage.sub", "Rekapitulasi komprehensif penanganan aset bermasalah, klaim denda, dan status perbaikan sarpras.")}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => fetchData()}
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all border border-slate-200 cursor-pointer"
              title={t("admin.dash.refresh", "Perbarui data")}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[#0785BC]" : ""}`} />
            </button>
            <button
              onClick={() => setShowExportModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200/90 hover:bg-slate-50 rounded-lg transition-all shadow-2xs cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-[#0785BC]" />
              {t("admin.items.export_btn", "Ekspor Laporan")}
            </button>
            <button
              onClick={handleOpenCreateModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#0785BC] hover:bg-[#0672a0] active:scale-95 rounded-lg transition-all shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              {t("admin.damage.create_btn", "Tambah Laporan")}
            </button>
          </div>
        </div>

        {/* â”€â”€ 3 Stat Cards (n8n Node Style) â”€â”€ */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Menunggu Tindak Lanjut */}
          <div
            onClick={() => {
              setStatusFilter(statusFilter === "pending" ? "" : "pending");
              setPage(1);
            }}
            className={`group bg-white rounded-xl border p-4.5 flex flex-col justify-between cursor-pointer transition-all duration-200 hover:shadow-sm ${
              statusFilter === "pending"
                ? "border-rose-400 ring-2 ring-rose-400/20 bg-rose-50/20 shadow-xs"
                : "border-slate-200/90 shadow-xs hover:border-slate-300"
            } ${mounted ? "animate-fade-up delay-75" : "opacity-0"}`}
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-50 text-rose-700 border border-rose-200 mb-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  REVIEW REQUIRED
                </span>
                <p className="text-xs font-medium text-slate-500">Menunggu Tindak Lanjut</p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4" />
              </div>
            </div>

            <div className="mt-3">
              <h3 className="text-2xl font-black tracking-tight tabular-nums text-slate-900">
                {globalStats.pending} <span className="text-xs text-slate-500 font-normal font-sans">laporan</span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Butuh review & konfirmasi admin</p>
            </div>
          </div>

          {/* Card 2: Sedang Dalam Perbaikan */}
          <div
            onClick={() => {
              setStatusFilter(statusFilter === "in_progress" ? "" : "in_progress");
              setPage(1);
            }}
            className={`group bg-white rounded-xl border p-4.5 flex flex-col justify-between cursor-pointer transition-all duration-200 hover:shadow-sm ${
              statusFilter === "in_progress"
                ? "border-[#0785BC] ring-2 ring-[#0785BC]/20 bg-sky-50/20 shadow-xs"
                : "border-slate-200/90 shadow-xs hover:border-slate-300"
            } ${mounted ? "animate-fade-up delay-150" : "opacity-0"}`}
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-50 text-sky-700 border border-sky-200 mb-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                  IN REPAIR
                </span>
                <p className="text-xs font-medium text-slate-500">Sedang Dikerjakan</p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-sky-50 border border-sky-100 text-[#0785BC] flex items-center justify-center shrink-0">
                <Wrench className="w-4 h-4" />
              </div>
            </div>

            <div className="mt-3">
              <h3 className="text-2xl font-black tracking-tight tabular-nums text-slate-900">
                {globalStats.in_progress} <span className="text-xs text-slate-500 font-normal font-sans">laporan</span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Dalam proses perbaikan teknisi</p>
            </div>
          </div>

          {/* Card 3: Selesai Diperbaiki */}
          <div
            onClick={() => {
              setStatusFilter(statusFilter === "resolved" ? "" : "resolved");
              setPage(1);
            }}
            className={`group bg-white rounded-xl border p-4.5 flex flex-col justify-between cursor-pointer transition-all duration-200 hover:shadow-sm ${
              statusFilter === "resolved"
                ? "border-emerald-400 ring-2 ring-emerald-400/20 bg-emerald-50/20 shadow-xs"
                : "border-slate-200/90 shadow-xs hover:border-slate-300"
            } ${mounted ? "animate-fade-up delay-200" : "opacity-0"}`}
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 mb-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  RESOLVED
                </span>
                <p className="text-xs font-medium text-slate-500">Tuntas / Diganti</p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>

            <div className="mt-3">
              <h3 className="text-2xl font-black tracking-tight tabular-nums text-slate-900">
                {globalStats.resolved} <span className="text-xs text-slate-500 font-normal font-sans">laporan</span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Aset telah tuntas diselesaikan</p>
            </div>
          </div>
        </div>

        {/* â”€â”€ Filter Bar & Quick Stats â”€â”€ */}
        <div className={`bg-white rounded-2xl border border-slate-100 p-4 shadow-sm flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3.5 ${mounted ? "animate-fade-up delay-200" : "opacity-0"}`}>
          {/* Status & Fine Filters */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Quick Segmented Status Filter */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <button
                onClick={() => { setStatusFilter(""); setPage(1); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                  statusFilter === ""
                    ? "bg-[#0785BC] text-white shadow-xs"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                }`}
              >
                Semua Status ({globalStats.total || total})
              </button>
              <button
                onClick={() => { setStatusFilter("pending"); setPage(1); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                  statusFilter === "pending"
                    ? "bg-rose-500 text-white shadow-xs"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                }`}
              >
                Menunggu ({globalStats.pending})
              </button>
              <button
                onClick={() => { setStatusFilter("in_progress"); setPage(1); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                  statusFilter === "in_progress"
                    ? "bg-[#0785BC] text-white shadow-xs"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                }`}
              >
                Perbaikan ({globalStats.in_progress})
              </button>
              <button
                onClick={() => { setStatusFilter("resolved"); setPage(1); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                  statusFilter === "resolved"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                }`}
              >
                Selesai ({globalStats.resolved})
              </button>
            </div>

            {/* Separator */}
            <div className="hidden sm:block h-6 w-px bg-slate-200 mx-0.5" />

            {/* Filter Denda (Lunas vs Belum Lunas) */}
            <div className="flex items-center gap-1 p-1 bg-slate-100/90 rounded-xl">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 hidden sm:inline">
                Status Denda:
              </span>
              <button
                onClick={() => { setFineFilter("all"); setPage(1); }}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                  fineFilter === "all"
                    ? "bg-white text-slate-900 shadow-2xs font-bold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Semua
              </button>
              <button
                onClick={() => { setFineFilter(fineFilter === "unpaid" ? "all" : "unpaid"); setPage(1); }}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0 ${
                  fineFilter === "unpaid"
                    ? "bg-rose-500 text-white shadow-2xs font-bold"
                    : "text-rose-600 hover:bg-white/60"
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${fineFilter === "unpaid" ? "bg-white" : "bg-rose-500 animate-pulse"}`} />
                Belum Lunas {unpaidFineCount > 0 ? `(${unpaidFineCount})` : ""}
              </button>
              <button
                onClick={() => { setFineFilter(fineFilter === "paid" ? "all" : "paid"); setPage(1); }}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0 ${
                  fineFilter === "paid"
                    ? "bg-emerald-600 text-white shadow-2xs font-bold"
                    : "text-emerald-600 hover:bg-white/60"
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${fineFilter === "paid" ? "bg-white" : "bg-emerald-500"}`} />
                Sudah Lunas {paidFineCount > 0 ? `(${paidFineCount})` : ""}
              </button>
            </div>
          </div>

          {/* Denda Summary Badge */}
          {globalStats.totalFine > 0 && (
            <div className="flex items-center gap-2 bg-amber-50/70 border border-amber-200/60 px-3 py-1.5 rounded-xl text-xs text-amber-800 shrink-0 self-start xl:self-auto">
              <DollarSign className="w-3.5 h-3.5 text-amber-600" />
              <span>Total Denda: <strong className="font-bold">Rp {globalStats.totalFine.toLocaleString("id-ID")}</strong></span>
              {globalStats.unpaidFine > 0 && (
                <button
                  type="button"
                  onClick={() => { setFineFilter(fineFilter === "unpaid" ? "all" : "unpaid"); setPage(1); }}
                  className={`ml-1 text-[10px] px-2 py-0.5 rounded font-bold transition-all cursor-pointer ${
                    fineFilter === "unpaid"
                      ? "bg-rose-600 text-white ring-2 ring-rose-400"
                      : "bg-rose-500 hover:bg-rose-600 text-white"
                  }`}
                  title="Klik untuk filter laporan denda belum lunas"
                >
                  Belum Lunas: Rp {globalStats.unpaidFine.toLocaleString("id-ID")}
                </button>
              )}
            </div>
          )}
        </div>

        {/* â”€â”€ Tabel Rekap Laporan â”€â”€ */}
        <div className={`bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden ${mounted ? "animate-fade-up delay-300" : "opacity-0"}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50/75 border-b border-slate-100">
                <tr className="text-slate-500 text-xs font-semibold uppercase">
                  <th className="px-4 py-3 text-left">{t("admin.damage.th_item", "Kode & Barang")}</th>
                  <th className="px-4 py-3 text-left">{t("admin.damage.th_reporter", "Pelapor")}</th>
                  <th className="px-4 py-3 text-left">{t("admin.damage.th_chronology", "Masalah")}</th>
                  <th className="px-4 py-3 text-left">{t("admin.damage.th_date", "Tanggal Lapor")}</th>
                  <th className="px-4 py-3 text-left">{t("admin.items.th_status", "Status")}</th>
                  <th className="px-4 py-3 text-left">{t("admin.damage.th_fine", "Denda")}</th>
                  <th className="px-4 py-3 text-right">{t("admin.items.th_action", "Aksi")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <td key={j} className="px-4 py-3.5">
                          <div className="h-4 bg-slate-100 rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-slate-400 text-xs">
                      <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      <p className="font-semibold text-slate-600">Tidak ada laporan kerusakan ditemukan.</p>
                      <p className="text-slate-400 text-[11px] mt-0.5">
                        Coba sesuaikan kata kunci pencarian atau filter status.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filtered.map((row, i) => {
                    const isFullyResolved =
                      row.status === "resolved" ||
                      row.raw_status === "Selesai" ||
                      row.fine_status === "Sudah Dibayar";

                    return (
                      <tr
                        key={row.id}
                        className="hover:bg-slate-50/70 transition-colors group"
                      >
                        {/* Kode & Barang */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2.5">
                            {row.image_url ? (
                              <button
                                type="button"
                                onClick={() => setPreviewImage(row.image_url || null)}
                                className="w-8 h-8 rounded-lg overflow-hidden shrink-0 border border-slate-200 relative group cursor-pointer hover:ring-2 hover:ring-[#0785BC]/50 transition-all bg-slate-100"
                                title="Klik untuk memperbesar foto kerusakan"
                              >
                                <img src={row.image_url} alt="Foto Kerusakan" className="w-full h-full object-cover" />
                                <span className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                                  <Eye className="w-3 h-3" />
                                </span>
                              </button>
                            ) : (
                              <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 border border-slate-200/60">
                                <Package className="w-4 h-4 text-slate-500" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-900 text-xs truncate max-w-[160px]">
                                {row.item_name}
                              </p>
                              <div className="flex items-center gap-1.5 mt-0.5 text-[10px]">
                                <span className="font-mono px-1 py-0.2 bg-slate-100 text-slate-600 rounded">
                                  {row.item_code}
                                </span>
                                <span className="text-slate-400 truncate max-w-[90px]">
                                  {row.report_code}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Pelapor */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <Avatar name={row.reporter_name} foto={row.reporter_foto} />
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-800 text-xs truncate max-w-[130px]">
                                {row.reporter_name}
                              </p>
                              <p className="text-[10px] text-slate-400 truncate max-w-[130px]">
                                {row.reporter_role}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Deskripsi */}
                        <td className="px-4 py-3.5 max-w-xs">
                          <p className="font-semibold text-slate-800 text-xs truncate">
                            {row.title}
                          </p>
                          <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                            {row.description}
                          </p>
                          {row.image_url && (
                            <button
                              type="button"
                              onClick={() => setPreviewImage(row.image_url || null)}
                              className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold text-[#0785BC] bg-blue-50 hover:bg-blue-100 px-1.5 py-0.5 rounded transition-colors cursor-pointer"
                            >
                              <ImageIcon className="w-3 h-3" />
                              <span>Lihat Foto Kerusakan</span>
                            </button>
                          )}
                        </td>

                        {/* Tanggal */}
                        <td className="px-4 py-3.5 text-xs text-slate-500 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>{row.reported_date}</span>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <StatusBadge status={isFullyResolved ? "resolved" : row.status} />
                        </td>

                        {/* Denda */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          {row.fine_amount > 0 ? (
                            <div>
                              <p className="font-bold text-xs text-rose-600">
                                Rp {row.fine_amount.toLocaleString("id-ID")}
                              </p>
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold mt-0.5 ${
                                  row.fine_status === "Sudah Dibayar" || isFullyResolved
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : "bg-rose-50 text-rose-700 border border-rose-200"
                                }`}
                              >
                                {row.fine_status === "Sudah Dibayar" || isFullyResolved ? (
                                  <Check className="w-3 h-3 text-emerald-600" />
                                ) : (
                                  <AlertTriangle className="w-3 h-3 text-amber-600" />
                                )}
                                {row.fine_status === "Sudah Dibayar" || isFullyResolved ? "Sudah Dibayar" : row.fine_status}
                              </span>
                            </div>
                          ) : (
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] font-semibold">
                              Bebas Denda
                            </span>
                          )}
                        </td>

                        {/* Tindakan */}
                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                          {isFullyResolved ? (
                            <button
                              type="button"
                              onClick={() => setHistoryReport(row)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 active:scale-95 rounded-xl transition-all shadow-2xs"
                              title="Lihat Detail Riwayat Kasus"
                            >
                              <Eye className="w-3.5 h-3.5 text-[#0785BC]" />
                              <span>Detail Riwayat</span>
                            </button>
                          ) : (
                            <div className="inline-flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleDirectResolve(row)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 rounded-xl transition-all shadow-2xs"
                                title="Atur Langsung Selesai (Denda otomatis lunas)"
                              >
                                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                                <span>Selesai</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenActionModal(row)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 active:scale-95 rounded-xl transition-all shadow-2xs"
                                title="Tindak Lanjut & Atur Denda"
                              >
                                <Wrench className="w-3.5 h-3.5 text-[#0785BC]" />
                                <span>Tindak Lanjut</span>
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Menampilkan {total > 0 ? (page - 1) * PAGE_SIZE + 1 : 0}â€“{Math.min(page * PAGE_SIZE, total)} dari {total} data
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all active:scale-95 ${
                    page === n
                      ? "bg-[#0785BC] text-white shadow-xs"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {n}
                </button>
              ))}
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

      {/* â”€â”€ Modal Tindak Lanjut & Atur Denda (Modern Card Layout) â”€â”€ */}
      {actionReport && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[100] p-4 sm:p-6 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto my-auto animate-scale-in">
            {/* Header Modal */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#0785BC] bg-blue-50 px-2 py-0.5 rounded-md">
                  Update Penanganan Aset
                </span>
                <h2 className="text-base font-bold text-slate-900 mt-1">
                  Tindak Lanjut & Penetapan Denda
                </h2>
                <p className="text-xs text-slate-400">
                  {actionReport.item_name} ({actionReport.item_code})
                </p>
              </div>
              <button
                onClick={() => setActionReport(null)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Info Box Pelapor & Masalah */}
            <div className="bg-slate-50 border border-slate-200/70 rounded-2xl p-4 mb-4 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-400">Peminjam / Pelapor:</span>
                <span className="font-bold text-slate-800">{actionReport.reporter_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Judul Kerusakan:</span>
                <span className="font-semibold text-slate-700">{actionReport.title}</span>
              </div>
              <div className="pt-1.5 border-t border-slate-200/60">
                <span className="text-slate-400 block mb-0.5">Kronologi Masalah:</span>
                <p className="text-slate-600 bg-white p-2 rounded-xl border border-slate-200/50">
                  {actionReport.description}
                </p>
              </div>
              {actionReport.image_url && (
                <div className="pt-2 border-t border-slate-200/60">
                  <span className="text-slate-400 block mb-1 font-semibold text-[11px]">Foto Bukti Kerusakan:</span>
                  <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-900/5 group max-h-48 flex items-center justify-center">
                    <img
                      src={actionReport.image_url}
                      alt="Foto Kerusakan"
                      className="max-h-48 w-full object-contain cursor-pointer transition-transform group-hover:scale-[1.02]"
                      onClick={() => setPreviewImage(actionReport.image_url || null)}
                    />
                    <button
                      type="button"
                      onClick={() => setPreviewImage(actionReport.image_url || null)}
                      className="absolute bottom-2 right-2 px-2.5 py-1 bg-slate-900/75 hover:bg-slate-900 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 backdrop-blur-xs transition-colors cursor-pointer"
                    >
                      <ZoomIn className="w-3 h-3" /> Perbesar
                    </button>
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={handleSubmitAction} className="space-y-4 text-xs">
              {/* Status Pilihan */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  Status Penanganan Aset *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { val: "Sedang Diperbaiki", label: "Sedang Diperbaiki", desc: "Proses servis teknisi" },
                    { val: "Selesai", label: "Selesai", desc: "Barang beres / diganti" },
                    { val: "Menunggu Review", label: "Menunggu Review", desc: "Perlu pengecekan" },
                    { val: "Ditolak", label: "Ditolak", desc: "Klaim dibatalkan" },
                  ].map((s) => (
                    <button
                      key={s.val}
                      type="button"
                      onClick={() => setActionStatus(s.val)}
                      className={`p-2.5 rounded-xl text-left border transition-all ${
                        actionStatus === s.val
                          ? "border-[#0785BC] bg-blue-50/50 ring-2 ring-[#0785BC]/20 text-[#0785BC]"
                          : "border-slate-200 hover:bg-slate-50 text-slate-700"
                      }`}
                    >
                      <p className="font-bold text-xs">{s.label}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{s.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Denda */}
              <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/70 space-y-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Nominal Denda Penggantian (Rp)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400">
                      Rp
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      value={fineAmount}
                      onChange={(e) => setFineAmount(e.target.value === "" ? "" : Number(e.target.value))}
                      className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0785BC] text-slate-800 font-semibold text-xs"
                      placeholder="0 (Bebas denda)"
                    />
                  </div>
                  {/* Preset quick buttons */}
                  <div className="flex gap-1.5 mt-2">
                    {[50000, 100000, 250000, 500000].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setFineAmount(preset)}
                        className="px-2 py-1 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg text-[10px] font-semibold text-slate-600 transition-colors"
                      >
                        +{preset.toLocaleString("id-ID")}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setFineAmount("")}
                      className="px-2 py-1 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg text-[10px] font-semibold text-slate-400 transition-colors"
                    >
                      Reset
                    </button>
                  </div>
                </div>

                {Number(fineAmount) > 0 && (
                  <>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Alasan / Rincian Denda
                      </label>
                      <input
                        type="text"
                        value={fineReason}
                        onChange={(e) => setFineReason(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0785BC] text-xs"
                        placeholder="contoh: Biaya servis optik lensa & modul tombol"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Status Pembayaran Denda
                      </label>
                      <select
                        value={fineStatus}
                        onChange={(e) => setFineStatus(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0785BC] text-xs"
                      >
                        <option value="Belum Dibayar">Belum Dibayar (Menunggu Mahasiswa)</option>
                        <option value="Sudah Dibayar">Sudah Dibayar (Lunas / Diterima)</option>
                        <option value="Tidak Ada Denda">Tidak Ada Denda (Dimaafkan)</option>
                      </select>
                    </div>
                  </>
                )}
              </div>

              {/* Catatan Admin */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Catatan Tindak Lanjut Admin</label>
                <textarea
                  rows={2}
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0785BC] resize-none text-xs"
                  placeholder="Instruksi perbaikan, no bukti nota servis, atau info penggantian..."
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActionReport(null)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 font-bold rounded-xl transition-colors text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingAction}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-[#0785BC] hover:bg-[#0672a0] text-white font-bold rounded-xl shadow-sm transition-all disabled:opacity-50 text-xs active:scale-95"
                >
                  {submittingAction && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Simpan & Perbarui Status
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* â”€â”€ Modal Riwayat / Detail (Read-Only Case File) â”€â”€ */}
      {historyReport && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[100] p-4 sm:p-6 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 my-auto animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-mono font-bold text-[#0785BC] bg-blue-50 px-2 py-0.5 rounded">
                  {historyReport.report_code}
                </span>
                <h2 className="text-base font-bold text-slate-900 mt-1">Detail Riwayat Laporan</h2>
              </div>
              <button
                onClick={() => setHistoryReport(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-50 p-3.5 rounded-2xl space-y-2 border border-slate-100">
                <div className="flex justify-between">
                  <span className="text-slate-400">Nama Barang:</span>
                  <span className="font-bold text-slate-900">{historyReport.item_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Kode Barang:</span>
                  <span className="font-mono font-semibold text-slate-700">{historyReport.item_code}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Pelapor:</span>
                  <span className="font-semibold text-slate-800">{historyReport.reporter_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Tanggal Selesai:</span>
                  <span className="text-slate-600">{historyReport.reported_date}</span>
                </div>
              </div>

              {historyReport.image_url && (
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <span className="text-slate-400 font-semibold block text-[10px] uppercase mb-1.5">
                    Foto Bukti Kerusakan:
                  </span>
                  <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-900/5 group max-h-48 flex items-center justify-center">
                    <img
                      src={historyReport.image_url}
                      alt="Foto Kerusakan"
                      className="max-h-48 w-full object-contain cursor-pointer transition-transform group-hover:scale-[1.02]"
                      onClick={() => setPreviewImage(historyReport.image_url || null)}
                    />
                    <button
                      type="button"
                      onClick={() => setPreviewImage(historyReport.image_url || null)}
                      className="absolute bottom-2 right-2 px-2.5 py-1 bg-slate-900/75 hover:bg-slate-900 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 backdrop-blur-xs transition-colors cursor-pointer"
                    >
                      <ZoomIn className="w-3 h-3" /> Perbesar
                    </button>
                  </div>
                </div>
              )}

              <div className="p-3 bg-emerald-50/70 border border-emerald-200/70 rounded-2xl flex items-center justify-between">
                <span className="text-emerald-800 font-medium">Status Aset:</span>
                <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                  <Check className="w-4 h-4 stroke-[3]" /> Selesai Diperbaiki
                </span>
              </div>

              {historyReport.fine_amount > 0 ? (
                <div className="p-3.5 bg-rose-50/60 border border-rose-200/60 rounded-2xl space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-rose-800 font-medium">Kewajiban Denda:</span>
                    <span className="font-extrabold text-rose-700 text-sm">
                      Rp {historyReport.fine_amount.toLocaleString("id-ID")}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-500">Status Pembayaran:</span>
                    <span className="font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded">
                      {historyReport.fine_status}
                    </span>
                  </div>
                  {historyReport.fine_reason && (
                    <p className="text-[11px] text-slate-600 pt-1 border-t border-rose-100">
                      Rincian: {historyReport.fine_reason}
                    </p>
                  )}
                </div>
              ) : (
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl text-slate-500 text-center text-xs">
                  Tidak ada denda yang dikenakan untuk laporan ini.
                </div>
              )}

              {historyReport.admin_note && (
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl">
                  <span className="text-slate-400 font-semibold block text-[10px] uppercase mb-1">
                    Catatan Petugas SARPRAS:
                  </span>
                  <p className="text-slate-700 leading-relaxed">{historyReport.admin_note}</p>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  const target = historyReport;
                  setHistoryReport(null);
                  handleOpenActionModal(target);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-600 hover:text-[#0785BC] hover:bg-blue-50 rounded-xl transition-colors border border-slate-200"
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>Ubah Status / Denda</span>
              </button>
              <button
                onClick={() => setHistoryReport(null)}
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* â”€â”€ Modal Buat Laporan Baru (Lengkap Terelasi User & Item) â”€â”€ */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[100] p-4 sm:p-6 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto my-auto animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">Buat Laporan Kerusakan Baru</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Hubungkan dengan peminjaman/barang dan data mahasiswa/pengguna.
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateReport} className="space-y-3.5 text-xs">
              {/* Mode Switcher: Per Transaksi Peminjaman vs Manual Katalog */}
              <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setModalMode("by_transaction")}
                  className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    modalMode === "by_transaction"
                      ? "bg-white text-slate-900 shadow-2xs font-extrabold"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Clock className="w-3.5 h-3.5 text-[#0785BC]" />
                  <span>Dari Transaksi Peminjaman (Rekomendasi)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setModalMode("manual")}
                  className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    modalMode === "manual"
                      ? "bg-white text-slate-900 shadow-2xs font-extrabold"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Package className="w-3.5 h-3.5 text-sky-600" />
                  <span>Katalog Langsung (Non-Peminjaman)</span>
                </button>
              </div>

              {modalMode === "by_transaction" ? (
                /* â”€â”€ FLOW 1: BERDASARKAN TRANSAKSI PEMINJAMAN â”€â”€ */
                <div className="space-y-3">
                  {selectedBorrowing && (formData.item_id || formData.package_id) ? (
                    /* Card Transaksi & Barang Terpilih */
                    <div className="p-3.5 bg-gradient-to-r from-blue-50/90 to-blue-50/90 border border-blue-200 rounded-2xl shadow-2xs space-y-2.5">
                      <div className="flex items-center justify-between border-b border-blue-200/60 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#0785BC] text-white">
                            Transaksi: {selectedBorrowing.borrow_code}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                              selectedBorrowing.status === "Dipinjam"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-slate-200 text-slate-700"
                            }`}
                          >
                            {selectedBorrowing.status}
                          </span>
                          <span className="text-[10px] text-slate-400 hidden sm:inline">
                            {selectedBorrowing.borrow_date
                              ? new Date(selectedBorrowing.borrow_date).toLocaleDateString("id-ID")
                              : ""}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setFormData((prev) => ({
                              ...prev,
                              borrowing_id: "",
                              user_id: "",
                              item_id: "",
                              package_id: "",
                              title: "",
                            }));
                            setBorrowingSearch("");
                          }}
                          className="px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:text-rose-600 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-slate-200"
                        >
                          Ganti Transaksi / Barang
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {/* Peminjam Terhubung */}
                        <div className="flex items-center gap-2.5 p-2 bg-white/90 rounded-xl border border-blue-100">
                          <Avatar
                            name={selectedBorrowing.users?.name || selectedUser?.name}
                            foto={selectedBorrowing.users?.foto || selectedUser?.foto}
                          />
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 truncate">
                              {selectedBorrowing.users?.name || selectedUser?.name}
                            </p>
                            <p className="text-[10px] text-slate-500 truncate">
                              {selectedBorrowing.users?.nomor_induk
                                ? `NIM: ${selectedBorrowing.users.nomor_induk}`
                                : selectedBorrowing.users?.email}
                            </p>
                          </div>
                        </div>

                        {/* Barang Rusak Terhubung */}
                        <div className="flex items-center gap-2.5 p-2 bg-white/90 rounded-xl border border-blue-100">
                          <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                            <Package className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 truncate">
                              {selectedBorrowingItem?.items?.name || selectedItem?.name || "Barang Terpilih"}
                            </p>
                            <p className="text-[10px] text-slate-500 font-mono">
                              Kode: {selectedBorrowingItem?.items?.code || selectedItem?.code || "-"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Pencarian Transaksi & List Barang Sekaligus */
                    <div className="space-y-2">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          Cari Transaksi Peminjaman / Nama Peminjam <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <input
                            type="text"
                            value={borrowingSearch}
                            onChange={(e) => setBorrowingSearch(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") e.preventDefault();
                            }}
                            placeholder="Ketik nama peminjam (contoh: Fathir), NIM, kode transaksi (PJ-...), atau nama barang..."
                            className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0785BC] text-xs transition-all"
                          />
                          {borrowingSearch && (
                            <button
                              type="button"
                              onClick={() => setBorrowingSearch("")}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1">
                          Menampilkan transaksi peminjaman aktif. Seluruh barang yang dipinjam bersamaan langsung terdeteksi di bawah.
                        </p>
                      </div>

                      {/* List Transaksi Peminjaman */}
                      <div className="max-h-72 overflow-y-auto space-y-2.5 pr-1">
                        {filteredBorrowings.length === 0 ? (
                          <div className="p-5 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-slate-200">
                            <p>Tidak ditemukan transaksi peminjaman yang cocok dengan &quot;{borrowingSearch}&quot;.</p>
                            <button
                              type="button"
                              onClick={() => setModalMode("manual")}
                              className="mt-2 text-[11px] text-[#0785BC] font-bold hover:underline"
                            >
                              Gunakan pemilihan katalog manual tanpa transaksi &rarr;
                            </button>
                          </div>
                        ) : (
                          filteredBorrowings.map((b) => {
                            const itemsCount = b.borrowings_items?.length || 0;
                            return (
                              <div
                                key={b.id}
                                className="p-3 bg-slate-50/70 hover:bg-blue-50/20 rounded-2xl border border-slate-200/90 transition-all space-y-2"
                              >
                                {/* Header Transaksi */}
                                <div className="flex items-start justify-between gap-2 border-b border-slate-200/60 pb-2">
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <Avatar name={b.users?.name} foto={b.users?.foto} />
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2">
                                        <span className="font-bold text-slate-900 text-xs truncate">
                                          {b.users?.name || "Peminjam"}
                                        </span>
                                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-200 text-slate-700">
                                          {b.users?.role || "Mahasiswa"}
                                        </span>
                                      </div>
                                      <p className="text-[10px] text-slate-400 truncate">
                                        {b.users?.nomor_induk ? `NIM: ${b.users.nomor_induk}` : b.users?.email}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="text-right shrink-0">
                                    <div className="flex items-center justify-end gap-1.5">
                                      <span className="font-mono text-[11px] font-bold text-[#0785BC]">
                                        {b.borrow_code}
                                      </span>
                                      <span
                                        className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                                          b.status === "Dipinjam"
                                            ? "bg-blue-100 text-blue-700"
                                            : b.status === "Pending"
                                            ? "bg-amber-100 text-amber-700"
                                            : "bg-slate-200 text-slate-700"
                                        }`}
                                      >
                                        {b.status}
                                      </span>
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-0.5">
                                      {b.borrow_date
                                        ? new Date(b.borrow_date).toLocaleDateString("id-ID", {
                                            day: "2-digit",
                                            month: "short",
                                            year: "numeric",
                                          })
                                        : "-"}
                                    </p>
                                  </div>
                                </div>

                                {b.purpose && (
                                  <p className="text-[11px] text-slate-500 line-clamp-1 italic">
                                    Keperluan: &quot;{b.purpose}&quot;
                                  </p>
                                )}

                                {/* Barang dalam transaksi ini (dipinjam sekaligus) */}
                                <div className="pt-1">
                                  <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                      Barang dipinjam sekaligus ({itemsCount} item):
                                    </span>
                                    <span className="text-[10px] text-slate-400">
                                      Klik barang yang mengalami kerusakan
                                    </span>
                                  </div>

                                  {!b.borrowings_items || b.borrowings_items.length === 0 ? (
                                    <div className="p-2 text-center text-[10px] text-slate-400 bg-white rounded-xl border border-slate-100">
                                      Tidak ada item barang spesifik terlampir.
                                    </div>
                                  ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                      {b.borrowings_items.map((bi) => {
                                        const itm = bi.items;
                                        const isMatch =
                                          qBorrow && itm?.name?.toLowerCase().includes(qBorrow);

                                        return (
                                          <div
                                            key={bi.id || bi.item_id}
                                            className={`flex items-center justify-between p-2 rounded-xl border bg-white transition-all ${
                                              isMatch
                                                ? "border-[#0785BC] ring-1 ring-[#0785BC]/20 bg-blue-50/30"
                                                : "border-slate-200 hover:border-slate-300"
                                            }`}
                                          >
                                            <div className="min-w-0 pr-2">
                                              <div className="flex items-center gap-1.5">
                                                <span className="font-bold text-slate-800 text-xs truncate">
                                                  {itm?.name || "Barang"}
                                                </span>
                                                <span className="font-mono text-[9px] px-1 py-0.2 rounded bg-slate-100 text-slate-600">
                                                  {itm?.code || "-"}
                                                </span>
                                              </div>
                                              <p className="text-[10px] text-slate-400 mt-0.5">
                                                Jumlah: {bi.quantity || 1} unit â€¢ Kondisi awal: {bi.condition_before || "Baik"}
                                              </p>
                                            </div>

                                            <button
                                              type="button"
                                              onClick={() => {
                                                setFormData((prev) => ({
                                                  ...prev,
                                                  user_id: b.users?.id || b.user_id,
                                                  borrowing_id: b.id,
                                                  item_id: itm?.id || bi.item_id,
                                                  package_id: "",
                                                  damage_type: "per_item",
                                                  title: `Kerusakan: ${itm?.name || "Barang"} (${b.borrow_code})`,
                                                }));
                                              }}
                                              className="px-2.5 py-1 text-[10px] font-bold bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 hover:border-rose-600 rounded-lg transition-all shrink-0 active:scale-95 shadow-2xs"
                                            >
                                              Pilih Rusak
                                            </button>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* â”€â”€ FLOW 2: MANUAL / KATALOG LANGSUNG (TANPA TRANSAKSI) â”€â”€ */
                <div className="space-y-3.5">
                  {/* Pilih Barang / Paket (Filter Per Item / Paket & Auto-Detect Search) */}
                  <div ref={itemDropdownRef} className="relative">
                    <div className="flex items-center justify-between mb-1">
                      <label className="block font-bold text-slate-700">
                        Barang atau Paket yang Rusak <span className="text-rose-500">*</span>
                      </label>
                      {!hasSelectedItemOrPackage && (
                        <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-[10px]">
                          <button
                            type="button"
                            onClick={() => setItemTypeTab("all")}
                            className={`px-2 py-0.5 rounded-md font-semibold transition-all ${
                              itemTypeTab === "all"
                                ? "bg-white text-slate-900 shadow-2xs font-bold"
                                : "text-slate-500 hover:text-slate-800"
                            }`}
                          >
                            Semua ({items.length + packagesList.length})
                          </button>
                          <button
                            type="button"
                            onClick={() => setItemTypeTab("item")}
                            className={`px-2 py-0.5 rounded-md font-semibold transition-all ${
                              itemTypeTab === "item"
                                ? "bg-[#0785BC] text-white shadow-2xs font-bold"
                                : "text-slate-500 hover:text-slate-800"
                            }`}
                          >
                            Per Item ({items.length})
                          </button>
                          <button
                            type="button"
                            onClick={() => setItemTypeTab("package")}
                            className={`px-2 py-0.5 rounded-md font-semibold transition-all ${
                              itemTypeTab === "package"
                                ? "bg-sky-600 text-white shadow-2xs font-bold"
                                : "text-slate-500 hover:text-slate-800"
                            }`}
                          >
                            Paket ({packagesList.length})
                          </button>
                        </div>
                      )}
                    </div>

                    {hasSelectedItemOrPackage ? (
                      /* Selected Item / Package Preview Card */
                      <div
                        className={`flex items-center justify-between p-2.5 rounded-xl border ${
                          formData.damage_type === "per_package"
                            ? "bg-sky-50/70 border-sky-200"
                            : "bg-blue-50/70 border-blue-200"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                              formData.damage_type === "per_package"
                                ? "bg-sky-600 text-white"
                                : "bg-[#0785BC] text-white"
                            }`}
                          >
                            {formData.damage_type === "per_package" ? (
                              <Boxes className="w-4 h-4" />
                            ) : (
                              <Package className="w-4 h-4" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 text-xs truncate">
                                {formData.damage_type === "per_package"
                                  ? selectedPackage?.name
                                  : selectedItem?.name}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide ${
                                  formData.damage_type === "per_package"
                                    ? "bg-sky-100 text-sky-700"
                                    : "bg-sky-100 text-[#0785BC]"
                                }`}
                              >
                                {formData.damage_type === "per_package" ? "Paket Barang" : "Item Tunggal"}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 truncate mt-0.5">
                              {formData.damage_type === "per_package"
                                ? `Paket Berisi ${selectedPackage?.item_count || 0} unit komponen`
                                : `Kode: ${selectedItem?.code || "-"} ${
                                    selectedItem?.category ? `| Kat: ${selectedItem.category}` : ""
                                  }`}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setFormData((prev) => ({
                              ...prev,
                              item_id: "",
                              package_id: "",
                              damage_type: "per_item",
                            }));
                            setItemSearch("");
                            setItemDropdownOpen(true);
                          }}
                          className="px-2 py-1 text-[11px] font-semibold text-slate-600 hover:text-rose-600 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-slate-200 shrink-0 ml-2"
                        >
                          Ganti
                        </button>
                      </div>
                    ) : (
                      /* Search Input + Live Filtered Auto-Detect Results */
                      <div className="relative">
                        <div className="relative">
                          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <input
                            type="text"
                            value={itemSearch}
                            onChange={(e) => {
                              setItemSearch(e.target.value);
                              setItemDropdownOpen(true);
                            }}
                            onFocus={() => setItemDropdownOpen(true)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") e.preventDefault();
                            }}
                            placeholder={
                              itemTypeTab === "item"
                                ? "Ketik nama atau kode barang..."
                                : itemTypeTab === "package"
                                ? "Ketik nama paket barang..."
                                : "Ketik nama barang / paket (terdeteksi otomatis)..."
                            }
                            className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0785BC] text-xs transition-all"
                          />
                          {itemSearch && (
                            <button
                              type="button"
                              onClick={() => setItemSearch("")}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {itemDropdownOpen && (
                          <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl z-30 max-h-56 overflow-y-auto divide-y divide-slate-100 animate-in fade-in slide-in-from-top-1 duration-150">
                            {totalItemPackageResults === 0 ? (
                              <div className="p-4 text-center text-xs text-slate-400">
                                Tidak ada barang atau paket yang cocok dengan &quot;{itemSearch}&quot;
                              </div>
                            ) : (
                              <>
                                {/* Packages group */}
                                {filteredPackages.length > 0 && (
                                  <div>
                                    <div className="px-3 py-1.5 bg-sky-50/70 text-sky-700 text-[10px] font-bold uppercase tracking-wider flex items-center justify-between">
                                      <span className="flex items-center gap-1.5">
                                        <Boxes className="w-3 h-3" />
                                        Paket Barang ({filteredPackages.length})
                                      </span>
                                      <span className="text-[9px] font-normal text-sky-600">Otomatis terdeteksi Paket</span>
                                    </div>
                                    {filteredPackages.map((pkg) => (
                                      <button
                                        key={pkg.id}
                                        type="button"
                                        onClick={() => {
                                          setFormData((prev) => ({
                                            ...prev,
                                            item_id: "",
                                            package_id: pkg.id,
                                            damage_type: "per_package",
                                            title: prev.title ? prev.title : `Kerusakan pada Paket ${pkg.name}`,
                                          }));
                                          setItemSearch("");
                                          setItemDropdownOpen(false);
                                        }}
                                        className="w-full flex items-center justify-between p-2.5 hover:bg-sky-50/40 text-left transition-colors group"
                                      >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                          <div className="w-7 h-7 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
                                            <Boxes className="w-3.5 h-3.5" />
                                          </div>
                                          <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                              <span className="font-semibold text-slate-800 text-xs truncate group-hover:text-sky-700">
                                                {pkg.name}
                                              </span>
                                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-sky-100 text-sky-700">
                                                PAKET
                                              </span>
                                            </div>
                                            <p className="text-[11px] text-slate-400 truncate">
                                              Berisi {pkg.item_count || 0} item komponen
                                              {pkg.description ? ` â€¢ ${pkg.description}` : ""}
                                            </p>
                                          </div>
                                        </div>
                                        <span className="text-[11px] text-sky-600 font-semibold opacity-0 group-hover:opacity-100 shrink-0 ml-2">
                                          Pilih Paket
                                        </span>
                                      </button>
                                    ))}
                                  </div>
                                )}

                                {/* Items group */}
                                {filteredItems.length > 0 && (
                                  <div>
                                    <div className="px-3 py-1.5 bg-sky-50/70 text-[#0785BC] text-[10px] font-bold uppercase tracking-wider flex items-center justify-between">
                                      <span className="flex items-center gap-1.5">
                                        <Package className="w-3 h-3" />
                                        Barang / Per Item ({filteredItems.length})
                                      </span>
                                      <span className="text-[9px] font-normal text-sky-600">Otomatis terdeteksi Item</span>
                                    </div>
                                    {filteredItems.map((item) => (
                                      <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => {
                                          setFormData((prev) => ({
                                            ...prev,
                                            item_id: item.id,
                                            package_id: "",
                                            damage_type: "per_item",
                                            title: prev.title ? prev.title : `Kerusakan pada ${item.name}`,
                                          }));
                                          setItemSearch("");
                                          setItemDropdownOpen(false);
                                        }}
                                        className="w-full flex items-center justify-between p-2.5 hover:bg-sky-50/40 text-left transition-colors group"
                                      >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                          <div className="w-7 h-7 rounded-lg bg-sky-100 text-[#0785BC] flex items-center justify-center shrink-0">
                                            <Package className="w-3.5 h-3.5" />
                                          </div>
                                          <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                              <span className="font-semibold text-slate-800 text-xs truncate group-hover:text-[#0785BC]">
                                                {item.name}
                                              </span>
                                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-100 text-slate-600">
                                                {item.code}
                                              </span>
                                            </div>
                                            <p className="text-[11px] text-slate-400 truncate">
                                              {item.category ? `Kategori: ${item.category}` : "Barang SARPRAS"}
                                              {item.condition ? ` â€¢ Kondisi: ${item.condition}` : ""}
                                            </p>
                                          </div>
                                        </div>
                                        <span className="text-[11px] text-[#0785BC] font-semibold opacity-0 group-hover:opacity-100 shrink-0 ml-2">
                                          Pilih Item
                                        </span>
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Pilih Pengguna / Pelapor (Searchable User) */}
                  <div ref={userDropdownRef} className="relative">
                    <label className="block font-bold text-slate-700 mb-1">
                      Peminjam / Pelapor Terkait <span className="text-rose-500">*</span>
                    </label>

                    {selectedUser ? (
                      /* Selected User Preview Card */
                      <div className="flex items-center justify-between p-2.5 bg-blue-50/70 border border-blue-200 rounded-xl">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Avatar name={selectedUser.name} foto={selectedUser.foto} />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 text-xs truncate">{selectedUser.name}</span>
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#0785BC]/15 text-[#0785BC]">
                                {selectedUser.role}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 truncate">
                              {selectedUser.nomor_induk ? `NIM/NIP: ${selectedUser.nomor_induk}` : selectedUser.email}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setFormData((prev) => ({ ...prev, user_id: "" }));
                            setUserSearch("");
                            setUserDropdownOpen(true);
                          }}
                          className="px-2 py-1 text-[11px] font-semibold text-slate-600 hover:text-rose-600 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-slate-200 shrink-0"
                        >
                          Ganti
                        </button>
                      </div>
                    ) : (
                      /* User Search Input + Dropdown */
                      <div className="relative">
                        <div className="relative">
                          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <input
                            type="text"
                            value={userSearch}
                            onChange={(e) => {
                              setUserSearch(e.target.value);
                              setUserDropdownOpen(true);
                            }}
                            onFocus={() => setUserDropdownOpen(true)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") e.preventDefault();
                            }}
                            placeholder="Ketik nama mahasiswa/user, NIM, atau email..."
                            className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0785BC] text-xs transition-all"
                          />
                          {userSearch && (
                            <button
                              type="button"
                              onClick={() => setUserSearch("")}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {userDropdownOpen && (
                          <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl z-30 max-h-52 overflow-y-auto divide-y divide-slate-100 animate-in fade-in slide-in-from-top-1 duration-150">
                            {filteredUsers.length === 0 ? (
                              <div className="p-3.5 text-center text-xs text-slate-400">
                                Tidak ditemukan user dengan kata kunci &quot;{userSearch}&quot;
                              </div>
                            ) : (
                              filteredUsers.map((u) => (
                                <button
                                  key={u.id}
                                  type="button"
                                  onClick={() => {
                                    setFormData((prev) => ({ ...prev, user_id: u.id }));
                                    setUserSearch("");
                                    setUserDropdownOpen(false);
                                  }}
                                  className="w-full flex items-center justify-between p-2.5 hover:bg-blue-50/50 text-left transition-colors group"
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <Avatar name={u.name} foto={u.foto} />
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2">
                                        <span className="font-semibold text-slate-800 text-xs truncate group-hover:text-[#0785BC]">
                                          {u.name}
                                        </span>
                                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-600">
                                          {u.role}
                                        </span>
                                      </div>
                                      <p className="text-[11px] text-slate-400 truncate">
                                        {u.nomor_induk ? `NIM: ${u.nomor_induk}` : u.email}
                                      </p>
                                    </div>
                                  </div>
                                  <span className="text-[11px] text-[#0785BC] font-semibold opacity-0 group-hover:opacity-100 shrink-0 ml-2">
                                    Pilih
                                  </span>
                                </button>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tipe Laporan */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Jenis Insiden</label>
                <div className="grid grid-cols-3 gap-2">
                  {["Kerusakan", "Kehilangan", "Cacat Fungsi"].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFormData({ ...formData, report_type: type })}
                      className={`py-2 px-1 text-center rounded-xl font-bold border transition-all text-xs ${
                        formData.report_type === type
                          ? "bg-[#0785BC] text-white border-[#0785BC] shadow-2xs"
                          : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Judul */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Judul Masalah *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0785BC] text-xs"
                  placeholder="contoh: Layar LCD retak, engsel patah, dll"
                />
              </div>

              {/* Deskripsi */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Deskripsi & Kronologi *</label>
                <textarea
                  required
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0785BC] resize-none text-xs"
                  placeholder="Jelaskan kondisi kerusakan dan kronologi kejadian..."
                />
              </div>

              {/* Foto Bukti Kerusakan (Maks 3MB) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-slate-700">Foto Bukti Kerusakan (Opsional)</label>
                  <span className="text-[10px] text-slate-400 font-medium">Maks. 3 MB</span>
                </div>

                {!formData.image_url ? (
                  <label className="group flex flex-col items-center justify-center p-3.5 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 hover:bg-blue-50/50 hover:border-[#0785BC]/60 transition-all cursor-pointer">
                    <div className="w-8 h-8 rounded-lg bg-white shadow-xs border border-slate-200 flex items-center justify-center text-[#0785BC] group-hover:scale-105 transition-transform">
                      <UploadCloud className="w-4 h-4" />
                    </div>
                    <p className="mt-1.5 text-xs font-semibold text-slate-700">Pilih atau letakkan foto barang rusak</p>
                    <p className="text-[10px] text-slate-400">JPG, PNG, atau WEBP (Maksimal 3MB)</p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                ) : (
                  <div className="relative rounded-xl border border-slate-200 bg-slate-50 p-2 flex items-center gap-3">
                    <img
                      src={formData.image_url}
                      alt="Foto Kerusakan"
                      className="w-14 h-14 rounded-lg object-cover border border-slate-200 cursor-pointer hover:opacity-90"
                      onClick={() => setPreviewImage(formData.image_url)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">Foto kerusakan terlampir</p>
                      <button
                        type="button"
                        onClick={() => setPreviewImage(formData.image_url)}
                        className="text-[11px] text-[#0785BC] hover:underline font-semibold inline-flex items-center gap-1 mt-0.5 cursor-pointer"
                      >
                        <Eye className="w-3 h-3" /> Lihat pratinjau
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, image_url: "" })}
                      className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Hapus foto"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Denda Awal (Opsional) */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Denda Awal (Opsional)</label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={formData.fine_amount}
                    onChange={(e) => setFormData({ ...formData, fine_amount: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0785BC] text-xs"
                    placeholder="Rp 0"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Alasan Denda</label>
                  <input
                    type="text"
                    value={formData.fine_reason}
                    onChange={(e) => setFormData({ ...formData, fine_reason: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0785BC] text-xs"
                    placeholder="Alasan denda..."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 font-bold rounded-xl text-xs transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-5 py-2 bg-[#0785BC] text-white font-bold rounded-xl hover:bg-[#0672a0] disabled:opacity-60 transition-all shadow-sm text-xs active:scale-95"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Catat Laporan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* â”€â”€ Modal Export Kerusakan & Denda dengan Filter Tanggal â”€â”€ */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="Ekspor Laporan Kerusakan & Denda"
        description="Unduh data kasus kerusakan, penggantian, dan denda berdasarkan rentang waktu."
        moduleName="Laporan_Kerusakan"
        filenamePrefix="SARPRAS_Laporan_Kerusakan"
        data={reports}
        dateFieldGetter={(r) => (r as any).raw_created_at || r.reported_date}
        dataRowMapper={(r) => ({
          "Kode Laporan": r.report_code,
          "Kode Barang": r.item_code,
          "Nama Barang": r.item_name,
          "Nama Pelapor": r.reporter_name,
          "Role Pelapor": r.reporter_role || "-",
          Email: r.reporter_email || "-",
          "Tanggal Lapor": r.reported_date,
          "Judul Masalah": r.title,
          "Deskripsi / Kronologi": r.description,
          Status: r.raw_status,
          "Nominal Denda (Rp)": r.fine_amount,
          "Alasan Denda": r.fine_reason || "-",
          "Status Denda": r.fine_status,
          "Catatan Petugas": r.admin_note || "-",
        })}
      />

      {/* ── Modal Lightbox Pratinjau Foto Kerusakan ── */}
      {previewImage && (
        <div
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-[120] p-4 animate-fade-in"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative max-w-3xl w-full max-h-[90vh] flex flex-col items-center justify-center animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute top-2 right-2 z-10 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="p-2 bg-slate-900/80 hover:bg-slate-900 text-white rounded-full transition-colors cursor-pointer shadow-lg"
                aria-label="Tutup pratinjau"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <img
              src={previewImage}
              alt="Pratinjau Foto Kerusakan"
              className="max-h-[82vh] w-auto max-w-full rounded-2xl object-contain shadow-2xl border border-white/20 bg-slate-900/50"
            />
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
