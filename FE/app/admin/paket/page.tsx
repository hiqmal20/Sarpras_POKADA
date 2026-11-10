"use client";

import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin";
import {
  Plus,
  Trash2,
  X,
  Package,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Upload,
  Image as ImageIcon,
  Pencil,
  Download,
  FileSpreadsheet,
  Eye,
  Layers,
  Boxes,
  Clock,
  AlertTriangle,
  Info,
  Tag,
  LayoutGrid,
  List,
} from "lucide-react";
import api from "@/lib/api";
import ExportModal from "@/components/ExportModal";
import { getSocket } from "@/lib/socket";
import { useLanguage } from "@/lib/i18n";

interface AvailableItem {
  id: string;
  name: string;
  code: string;
  available_stock: number;
  category?: string;
  category_id?: string;
}

interface PackageItemDetail {
  id: string;
  quantity: number;
  item_id?: string;
  items?: {
    id: string;
    name: string;
    code: string;
    available_stock: number;
    stock?: number;
    condition?: string;
    image_url?: string;
    status: string;
    category?: string;
    categories?: { id: string; name: string };
  };
}

interface PackageData {
  id: string;
  name: string;
  description?: string;
  status: string;
  effective_status?: string;
  has_empty_item?: boolean;
  image_url?: string;
  is_available?: boolean;
  categories?: string[];
  category?: string;
  unavailable_items?: Array<{
    item_id: string;
    name: string;
    needed: number;
    available: number;
    status: string;
  }>;
  individual_borrow_suggestion?: {
    message: string;
    available_items: Array<{
      item_id: string;
      name: string;
      available_stock: number;
    }>;
  } | null;
  packages_items?: PackageItemDetail[];
  stock?: number;
  available_stock?: number;
  created_at?: string;
}

interface PackageComponentItem {
  item_id?: string;
  code: string;
  name: string;
  quantity: number;
  category?: string;
  source_type: "per_item" | "kode_paket";
}

export default function PaketPage() {
  const { t, lang } = useLanguage();
  const [packages, setPackages] = useState<PackageData[]>([]);
  const [availableItems, setAvailableItems] = useState<AvailableItem[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [packageCategoryFilter, setPackageCategoryFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<PackageData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [richPackageDetail, setRichPackageDetail] = useState<PackageData | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [availabilityFilter, setAvailabilityFilter] = useState("all");
  const [imagePreview, setImagePreview] = useState<string>("");

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    status: "Aktif",
  });

  const [selectedItems, setSelectedItems] = useState<PackageComponentItem[]>([]);
  const [addItemMode, setAddItemMode] = useState<"per_item" | "kode_paket">("per_item");
  const [selectedItemId, setSelectedItemId] = useState("");
  const [selectedItemQty, setSelectedItemQty] = useState(1);
  const [modalItemCategory, setModalItemCategory] = useState("all");
  const [modalItemSearch, setModalItemSearch] = useState("");
  const [customItemCode, setCustomItemCode] = useState("");
  const [customItemName, setCustomItemName] = useState("");
  const [customItemQty, setCustomItemQty] = useState(1);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [importSummary, setImportSummary] = useState<{ success: number; failed: number } | null>(null);

  const [replenishModal, setReplenishModal] = useState<{
    open: boolean;
    item_id?: string;
    item_name?: string;
    item_code?: string;
    current_stock?: number;
    current_avail?: number;
    add_qty: number;
  }>({ open: false, add_qty: 5 });

  const handleOpenReplenish = (item: any) => {
    setReplenishModal({
      open: true,
      item_id: item.id || item.item_id,
      item_name: item.name || "Barang",
      item_code: item.code || "-",
      current_stock: item.stock ?? item.available_stock ?? 0,
      current_avail: item.available_stock ?? 0,
      add_qty: 5,
    });
  };

  const handleSaveReplenish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replenishModal.item_id) return;
    const addQty = Number(replenishModal.add_qty) || 0;
    if (addQty <= 0) {
      alert("Masukkan jumlah unit yang ingin ditambahkan");
      return;
    }

    try {
      const newAvail = (replenishModal.current_avail || 0) + addQty;
      const newTotal = (replenishModal.current_stock || 0) + addQty;
      const res = await api.items.update(replenishModal.item_id, {
        stock: newTotal,
        available_stock: newAvail,
        status: "Tersedia",
      });

      if (res.status === "success" || res.data) {
        setReplenishModal({ open: false, add_qty: 5 });
        await fetchData();
        if (selectedPackage) {
          const updatedPkg = await api.packages.getById(selectedPackage.id);
          if (updatedPkg.status === "success" && updatedPkg.data) {
            setSelectedPackage(updatedPkg.data);
            setRichPackageDetail(updatedPkg.data);
          }
        }
        alert(`Stok "${replenishModal.item_name}" berhasil ditambah +${addQty} unit! Kesiapan paket diperbarui otomatis.`);
      } else {
        alert("Gagal menambah stok: " + (res.message || "Error"));
      }
    } catch (err: any) {
      alert("Terjadi kesalahan: " + (err?.message || "Error"));
    }
  };

  // Modal Kelola / Tambah / Kurangi Stok Paket
  const [packageStockModal, setPackageStockModal] = useState<{
    open: boolean;
    package_id?: string;
    package_name?: string;
    current_stock: number;
    current_avail: number;
    action: "add" | "reduce";
    quantity: number;
    items: PackageItemDetail[];
  }>({
    open: false,
    current_stock: 0,
    current_avail: 0,
    action: "add",
    quantity: 1,
    items: [],
  });

  const handleOpenPackageStock = (pkg: PackageData) => {
    setPackageStockModal({
      open: true,
      package_id: pkg.id,
      package_name: pkg.name,
      current_stock: pkg.stock ?? 0,
      current_avail: pkg.available_stock ?? (pkg.is_available ? 1 : 0),
      action: "add",
      quantity: 1,
      items: pkg.packages_items || [],
    });
  };

  const handleSavePackageStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!packageStockModal.package_id) return;
    const qty = Number(packageStockModal.quantity) || 1;
    if (qty <= 0) {
      alert("Masukkan jumlah paket yang valid (minimal 1).");
      return;
    }

    try {
      setSaving(true);
      const res = await api.packages.adjustStock(packageStockModal.package_id, {
        action: packageStockModal.action,
        quantity: qty,
      });

      if (res.status === "success") {
        alert(
          `Stok "${packageStockModal.package_name}" berhasil ${
            packageStockModal.action === "add" ? "ditambahkan +" : "dikurangi -"
          }${qty} set paket! Stok komponen barang gudang otomatis disinkronkan.`
        );
        setPackageStockModal((prev) => ({ ...prev, open: false }));
        await fetchData();
        if (selectedPackage && selectedPackage.id === packageStockModal.package_id) {
          const updated = await api.packages.getById(packageStockModal.package_id);
          if (updated.status === "success" && updated.data) {
            setSelectedPackage(updated.data);
            setRichPackageDetail(updated.data);
          }
        }
      } else {
        alert("Gagal menyesuaikan stok paket: " + (res.message || "Error"));
      }
    } catch (err: any) {
      alert("Terjadi kesalahan: " + (err.message || err));
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadTemplate = () => {
    const csvContent = "name,description,status,item_code,quantity\nPaket Seminar,Paket bundling proyektor dan perlengkapan audio,Aktif,BRG-PRJ-001,1\nPaket Seminar,Paket bundling proyektor dan perlengkapan audio,Aktif,BRG-002,2";
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "template_import_paket_sarpras.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExecuteImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) return;
    setImporting(true);
    setImportSummary(null);
    try {
      const res = await api.packages.importCSV(importFile);
      if (res.status === "success" || res.statusCode === 201 || res.statusCode === 207) {
        const succ = res.data?.success?.length || 0;
        const fail = res.data?.failed?.length || 0;
        setImportSummary({ success: succ, failed: fail });
        await fetchData();
        alert(res.message || `Import selesai: ${succ} paket berhasil, ${fail} gagal`);
        if (fail === 0) setShowImportModal(false);
      } else {
        alert("Gagal memproses import CSV paket: " + (res.message || "Error"));
      }
    } catch (err: any) {
      alert("Terjadi kesalahan: " + (err.message || err));
    } finally {
      setImporting(false);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pkgRes, itemsRes, catRes] = await Promise.all([
        api.packages.getAll(),
        api.items.getAll({ limit: 150 }),
        api.categories.getAll(),
      ]);

      if (catRes.status === "success" && Array.isArray(catRes.data)) {
        setCategories(catRes.data);
      }

      if (pkgRes.status === "success" && Array.isArray(pkgRes.data)) {
        setPackages(pkgRes.data as PackageData[]);
      }

      if (itemsRes.status === "success" && Array.isArray(itemsRes.data)) {
        setAvailableItems(
          (itemsRes.data as any[]).map((i) => ({
            id: i.id,
            name: i.name,
            code: i.code,
            available_stock: i.available_stock ?? i.stock ?? 0,
            category: i.categories?.name || i.category || "Tanpa Kategori",
            category_id: i.category_id || i.categories?.id || "",
          }))
        );
      }
    } catch (err) {
      console.error("Gagal memuat data paket:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const socket = getSocket();
    const handleUpdate = () => {
      fetchData();
    };

    if (socket) {
      socket.on("stock_updated", handleUpdate);
      socket.on("package_updated", handleUpdate);
      socket.on("package_created", handleUpdate);
      socket.on("package_deleted", handleUpdate);
      socket.on("item_updated", handleUpdate);
    }

    return () => {
      if (socket) {
        socket.off("stock_updated", handleUpdate);
        socket.off("package_updated", handleUpdate);
        socket.off("package_created", handleUpdate);
        socket.off("package_deleted", handleUpdate);
        socket.off("item_updated", handleUpdate);
      }
    };
  }, []);

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      status: "Aktif",
    });
    setSelectedItems([]);
    setAddItemMode("per_item");
    setSelectedItemId("");
    setSelectedItemQty(1);
    setCustomItemCode("");
    setCustomItemName("");
    setCustomItemQty(1);
    setImagePreview("");
    setEditingId(null);
  };

  const handleOpenEdit = (pkg: PackageData) => {
    setEditingId(pkg.id);
    setFormData({
      name: pkg.name || "",
      description: pkg.description || "",
      status: pkg.status || "Aktif",
    });
    setImagePreview(pkg.image_url || "");
    const currentItems: PackageComponentItem[] = (pkg.packages_items || []).map((pi) => {
      const isCustom = pi.items?.code?.toUpperCase().startsWith("PKT-") || !availableItems.some((ai) => ai.id === pi.items?.id);
      return {
        item_id: pi.items?.id || (pi as any).item_id || "",
        code: pi.items?.code || "-",
        name: pi.items?.name || "Barang",
        category: pi.items?.category || pi.items?.categories?.name || (isCustom ? "Khusus Paket" : "Umum"),
        quantity: pi.quantity || 1,
        source_type: isCustom ? "kode_paket" : "per_item",
      };
    });
    setSelectedItems(currentItems);
    setShowModal(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 3 * 1024 * 1024) {
        alert("Ukuran foto paket melebihi batas maksimal 3MB.");
        e.target.value = "";
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddItemFromInventory = () => {
    if (!selectedItemId) return;
    const invItem = availableItems.find((i) => i.id === selectedItemId);
    if (!invItem) return;

    const existing = selectedItems.find((i) => i.item_id === selectedItemId);
    if (existing) {
      setSelectedItems(
        selectedItems.map((i) =>
          i.item_id === selectedItemId ? { ...i, quantity: i.quantity + selectedItemQty } : i
        )
      );
    } else {
      setSelectedItems([
        ...selectedItems,
        {
          item_id: invItem.id,
          code: invItem.code,
          name: invItem.name,
          category: invItem.category,
          quantity: selectedItemQty,
          source_type: "per_item",
        },
      ]);
    }
    setSelectedItemId("");
    setSelectedItemQty(1);
  };

  const handleAddCustomPackageItem = () => {
    if (!customItemName.trim()) {
      alert("Nama barang khusus paket wajib diisi.");
      return;
    }
    const code = customItemCode.trim()
      ? customItemCode.trim().toUpperCase()
      : `PKT-${Date.now().toString().slice(-4)}`;

    const existing = selectedItems.find((i) => i.code.toUpperCase() === code);
    if (existing) {
      setSelectedItems(
        selectedItems.map((i) =>
          i.code.toUpperCase() === code ? { ...i, quantity: i.quantity + customItemQty } : i
        )
      );
    } else {
      setSelectedItems([
        ...selectedItems,
        {
          code,
          name: customItemName.trim(),
          quantity: customItemQty,
          source_type: "kode_paket",
        },
      ]);
    }
    setCustomItemCode("");
    setCustomItemName("");
    setCustomItemQty(1);
  };

  const handleRemoveItemFromPackage = (index: number) => {
    setSelectedItems(selectedItems.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedItems.length === 0) {
      alert("Harap tambahkan minimal 1 item ke dalam paket.");
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
        name: formData.name,
        description: formData.description,
        status: formData.status,
        items: selectedItems.map((i) => ({
          item_id: i.item_id || undefined,
          code: i.code,
          name: i.name,
          quantity: i.quantity,
        })),
      };

      if (imagePreview) {
        payload.image_url = imagePreview;
      }

      if (editingId) {
        const res = await api.packages.update(editingId, payload);
        if (res.status === "success") {
          await fetchData();
          setShowModal(false);
          resetForm();
        } else {
          alert("Gagal memperbarui paket: " + (res.message || "Error"));
        }
      } else {
        const res = await api.packages.create(payload);
        if (res.status === "success") {
          await fetchData();
          setShowModal(false);
          resetForm();
        } else {
          alert("Gagal membuat paket: " + (res.message || "Error"));
        }
      }
    } catch (err: any) {
      alert("Terjadi kesalahan: " + (err?.message || "Error"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus paket sarpras ini?")) return;
    try {
      const res = await api.packages.delete(id);
      if (res.status === "success") {
        setPackages((prev) => prev.filter((pkg) => pkg.id !== id));
      } else {
        alert("Gagal menghapus: " + (res.message || "Error"));
      }
    } catch (err: any) {
      alert("Gagal menghapus paket: " + err.message);
    }
  };

  const handleRowClick = async (pkg: PackageData) => {
    setSelectedPackage(pkg);
    setRichPackageDetail(pkg);
    setShowDetail(true);
    setDetailLoading(true);

    try {
      const res = await api.packages.getById(pkg.id);
      if (res.status === "success" && res.data) {
        setRichPackageDetail(res.data);
      }
    } catch (err) {
      console.error("Gagal memuat detail lengkap paket:", err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleToggleStatus = async (pkg: PackageData) => {
    const isCurrentlyActive = pkg.status === "Aktif";
    const nextStatus = isCurrentlyActive ? "Non-Aktif" : "Aktif";
    const confirmMsg = isCurrentlyActive
      ? `Ubah status paket "${pkg.name}" menjadi Non-Aktif? Calon peminjam tidak akan bisa meminjam paket ini.`
      : `Aktifkan paket "${pkg.name}" kembali?`;

    if (!confirm(confirmMsg)) return;

    try {
      const res = await api.packages.update(pkg.id, {
        name: pkg.name,
        description: pkg.description,
        status: nextStatus,
        items: (pkg.packages_items || []).map((pi) => ({
          item_id: pi.items?.id || (pi as any).item_id || "",
          quantity: pi.quantity || 1,
        })),
      });

      if (res.status === "success" || res.data) {
        setPackages((prev) =>
          prev.map((p) => (p.id === pkg.id ? { ...p, status: nextStatus } : p))
        );
        if (selectedPackage?.id === pkg.id) {
          setSelectedPackage((prev) => (prev ? { ...prev, status: nextStatus } : null));
        }
        if (richPackageDetail?.id === pkg.id) {
          setRichPackageDetail((prev) => (prev ? { ...prev, status: nextStatus } : null));
        }
      } else {
        alert("Gagal mengubah status: " + (res.message || "Error"));
      }
    } catch (err: any) {
      alert("Terjadi kesalahan: " + (err?.message || "Error"));
    }
  };

  const filteredPackages = packages.filter((pkg) => {
    const pkgCats = (pkg.categories || []).map((c) => c.toLowerCase());
    const matchSearch =
      pkg.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (pkg.description || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      pkgCats.some((c) => c.includes(searchQuery.toLowerCase())) ||
      (pkg.packages_items || []).some(
        (pi) =>
          pi.items?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          pi.items?.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          pi.items?.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          pi.items?.categories?.name?.toLowerCase().includes(searchQuery.toLowerCase())
      );

    const matchAvailability =
      availabilityFilter === "all"
        ? true
        : availabilityFilter === "ready"
        ? pkg.is_available
        : !pkg.is_available;

    const matchCategory =
      packageCategoryFilter === "all" ||
      pkgCats.includes(packageCategoryFilter.toLowerCase()) ||
      (pkg.packages_items || []).some(
        (pi) =>
          (pi.items?.category || pi.items?.categories?.name)?.toLowerCase() ===
          packageCategoryFilter.toLowerCase()
      );

    return matchSearch && matchAvailability && matchCategory;
  });

  const filteredAvailableItems = availableItems.filter((item) => {
    const matchCat =
      modalItemCategory === "all" ||
      item.category_id === modalItemCategory ||
      item.category === modalItemCategory;
    const matchQuery =
      !modalItemSearch ||
      item.name.toLowerCase().includes(modalItemSearch.toLowerCase()) ||
      item.code.toLowerCase().includes(modalItemSearch.toLowerCase()) ||
      item.category?.toLowerCase().includes(modalItemSearch.toLowerCase());
    return matchCat && matchQuery;
  });

  const readyPackagesCount = packages.filter((p) => p.is_available).length;
  const limitedPackagesCount = packages.filter((p) => !p.is_available).length;

  return (
    <AdminLayout
      showSearch
      searchValue={searchQuery}
      searchPlaceholder={t("admin.pkg.search_ph", "Cari paket sarpras...")}
      onSearchChange={setSearchQuery}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                {t("admin.pkg.title", "Paket Bundling Sarpras")}
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-slate-100 text-slate-600 border border-slate-200">
                {packages.length} BUNDLES
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {t("admin.pkg.sub", "Kelola paket set peralatan siap pakai untuk kegiatan perkuliahan dan acara.")}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowExportModal(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200/90 hover:bg-slate-50 active:scale-95 rounded-lg transition-all shadow-2xs cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-[#0785BC]" />
              {t("admin.pkg.export_btn", "Ekspor Data")}
            </button>
            <button
              onClick={() => {
                resetForm();
                setShowModal(true);
              }}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-[#0785BC] text-white text-xs font-semibold rounded-lg hover:bg-[#0672a0] active:scale-95 transition-all shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              {t("admin.pkg.add_btn", "Tambah Paket")}
            </button>
          </div>
        </div>

        {/* ── Stat Cards (n8n Node Style) ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="group bg-white rounded-xl border border-slate-200/90 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all duration-200 p-4.5 flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-50 text-sky-700 border border-sky-200 mb-1.5">
                  {t("admin.pkg.kpi_total_tag", "BUNDLES")}
                </span>
                <p className="text-xs font-medium text-slate-500">{t("admin.pkg.kpi_total_title", "Total Paket Sarpras")}</p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-sky-50 border border-sky-100 text-[#0785BC] flex items-center justify-center shrink-0">
                <Package className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-black text-slate-900 tabular-nums tracking-tight">
                {loading ? "..." : packages.length} <span className="text-xs text-slate-500 font-normal">{t("admin.pkg.kpi_total_sub", "paket terdaftar")}</span>
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">{t("admin.items.kpi_total_desc", "Kombinasi multi-item terintegrasi")}</p>
            </div>
          </div>

          <div className="group bg-white rounded-xl border border-slate-200/90 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all duration-200 p-4.5 flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 mb-1.5">
                  {t("admin.pkg.kpi_ready_tag", "READY")}
                </span>
                <p className="text-xs font-medium text-slate-500">{t("admin.pkg.kpi_ready_title", "Siap Dipinjam (Komplit)")}</p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-black text-emerald-600 tabular-nums tracking-tight">
                {loading ? "..." : readyPackagesCount} <span className="text-xs text-emerald-700/60 font-normal">{t("admin.pkg.kpi_ready_sub", "paket siap pakai")}</span>
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">{lang === "en" ? "All components available in adequate quantity" : "Semua komponen barang berstatus cukup"}</p>
            </div>
          </div>

          <div className="group bg-white rounded-xl border border-slate-200/90 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all duration-200 p-4.5 flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-50 text-amber-700 border border-amber-200 mb-1.5">
                  {t("admin.pkg.kpi_limited_tag", "PARTIAL")}
                </span>
                <p className="text-xs font-medium text-slate-500">{t("admin.pkg.kpi_limited_title", "Komponen Terbatas")}</p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-black text-amber-600 tabular-nums tracking-tight">
                {loading ? "..." : limitedPackagesCount} <span className="text-xs text-amber-700/60 font-normal">{t("admin.pkg.kpi_limited_sub", "paket menunggu stok")}</span>
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">{lang === "en" ? "Some items currently borrowed separately" : "Sebagian item sedang dipinjam terpisah"}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-6 py-4 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900">{t("admin.pkg.list_title", "Daftar Paket Sarpras")}</h2>
              <p className="text-xs text-slate-400">{lang === "en" ? `Total ${filteredPackages.length} packages match filter` : `Total ${filteredPackages.length} paket sesuai filter`}</p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-xs text-slate-400 font-medium">{t("admin.pkg.th_category", "Kategori")}:</span>
                <select
                  value={packageCategoryFilter}
                  onChange={(e) => setPackageCategoryFilter(e.target.value)}
                  className="text-xs font-semibold border border-slate-200 rounded-xl px-3 py-1.5 text-slate-600 bg-white focus:outline-none focus:ring-2 focus:ring-[#0785BC] transition-all cursor-pointer"
                >
                  <option value="all">{t("admin.items.all_categories", "Semua Kategori")}</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-400 font-medium">{t("admin.pkg.th_availability", "Ketersediaan")}:</span>
                <select
                  value={availabilityFilter}
                  onChange={(e) => setAvailabilityFilter(e.target.value)}
                  className="text-xs font-semibold border border-slate-200 rounded-xl px-3 py-1.5 text-slate-600 bg-white focus:outline-none focus:ring-2 focus:ring-[#0785BC] transition-all cursor-pointer"
                >
                  <option value="all">{lang === "en" ? "All Availability" : "Semua Ketersediaan"}</option>
                  <option value="ready">{lang === "en" ? "Ready (Complete)" : "Siap Dipinjam (Lengkap)"}</option>
                  <option value="limited">{lang === "en" ? "Limited / Incomplete" : "Stok Terbatas / Tidak Lengkap"}</option>
                </select>
              </div>

              {/* View Mode Toggle (List / Grid) */}
              <div className="flex items-center bg-slate-200/60 p-0.5 rounded-lg border border-slate-200">
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={`p-1.5 rounded-md transition-all ${
                    viewMode === "list"
                      ? "bg-white text-[#0785BC] shadow-xs font-semibold"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                  title={t("admin.items.view_list", "Tampilan Tabel (List)")}
                >
                  <List className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={`p-1.5 rounded-md transition-all ${
                    viewMode === "grid"
                      ? "bg-white text-[#0785BC] shadow-xs font-semibold"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                  title={t("admin.items.view_grid", "Tampilan Grid (Kartu)")}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {viewMode === "list" ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50/75 border-b border-slate-100">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{t("admin.pkg.th_name", "Paket Barang")}</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{t("admin.pkg.th_components", "Item Termasuk")}</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{t("admin.pkg.th_availability", "Ketersediaan")}</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{t("admin.pkg.th_status", "Status")}</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase">{t("admin.items.th_action", "Aksi")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 5 }).map((_, j) => (
                          <td key={j} className="px-5 py-4">
                            <div className="h-4 bg-slate-100 rounded animate-pulse" />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : filteredPackages.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-10 text-center text-slate-400 text-xs">
                        Belum ada paket sarpras. Klik tombol &quot;Tambah Paket&quot; untuk membuat bundel baru.
                      </td>
                    </tr>
                  ) : (
                    filteredPackages.map((pkg) => (
                      <tr
                        key={pkg.id}
                        onClick={() => handleRowClick(pkg)}
                        className="hover:bg-slate-50/70 cursor-pointer transition-colors"
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            {pkg.image_url ? (
                              <img
                                src={pkg.image_url}
                                alt={pkg.name}
                                className="w-10 h-10 rounded-xl object-cover border border-slate-100 shrink-0"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0785BC] flex items-center justify-center shrink-0">
                                <Package className="w-5 h-5" />
                              </div>
                            )}
                            <div>
                              <p className="font-semibold text-slate-900 text-xs">{pkg.name}</p>
                              <p className="text-[11px] text-slate-400 max-w-xs truncate">{pkg.description || "-"}</p>
                              <div className="flex items-center gap-1 flex-wrap mt-1">
                                {(pkg.categories || []).length > 0 ? (
                                  (pkg.categories || []).map((cat, idx) => (
                                    <span
                                      key={idx}
                                      className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-semibold bg-blue-50 text-[#0785BC] border border-blue-100"
                                    >
                                      <Tag className="w-2.5 h-2.5" />
                                      {cat}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-[10px] text-slate-400">Umum</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-xs font-semibold text-slate-700 block">
                            {pkg.packages_items?.length || 0} macam barang
                          </span>
                          <p className="text-[10px] text-slate-400 max-w-xs truncate mt-0.5">
                            {(pkg.packages_items || [])
                              .slice(0, 3)
                              .map((pi) => `${pi.items?.name || "Barang"} (${pi.items?.category || "Umum"})`)
                              .join(", ")}
                            {(pkg.packages_items || []).length > 3 && "..."}
                          </p>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-slate-800">
                                {pkg.available_stock ?? (pkg.is_available ? 1 : 0)} Paket
                              </span>
                              <span className="text-[10px] text-slate-400">
                                / {pkg.stock ?? 0} total
                              </span>
                            </div>
                            {pkg.is_available && (pkg.available_stock ?? (pkg.is_available ? 1 : 0)) > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 w-fit">
                                <CheckCircle2 className="w-2.5 h-2.5" /> Siap Dipinjam
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 w-fit">
                                <AlertCircle className="w-2.5 h-2.5" /> Stok Kosong
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleStatus(pkg);
                            }}
                            title="Klik untuk mengubah status Aktif / Non-Aktif"
                            className="group/st transition-transform active:scale-95"
                          >
                            {pkg.status !== "Aktif" ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-rose-50 text-rose-700 border border-rose-200 group-hover/st:bg-rose-100 transition-colors">
                                Non-Aktif (Manual)
                              </span>
                            ) : (pkg.packages_items || []).some(
                                (pi) => (pi.items?.available_stock ?? 0) < pi.quantity || pi.items?.status !== "Tersedia"
                              ) ? (
                              <span
                                className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-amber-50 text-amber-700 border border-amber-200 group-hover/st:bg-amber-100 transition-colors"
                                title="Ada item di paket ini yang kosong/kurang, otomatis dianggap kosong/tidak aktif"
                              >
                                Non-Aktif (Item Kosong)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 group-hover/st:bg-emerald-100 transition-colors">
                                Aktif
                              </span>
                            )}
                          </button>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenPackageStock(pkg);
                              }}
                              className="p-1.5 text-slate-500 hover:text-[#0785BC] hover:bg-blue-50 rounded-lg transition-colors"
                              title="Kelola Stok Paket (+ / - Paket)"
                            >
                              <Layers className="w-4 h-4 text-[#0785BC]" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRowClick(pkg);
                              }}
                              className="p-1.5 text-slate-400 hover:text-[#0785BC] hover:bg-blue-50 rounded-lg transition-colors"
                              title="Lihat Detail Paket"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenEdit(pkg);
                              }}
                              className="p-1.5 text-slate-400 hover:text-[#0785BC] hover:bg-slate-100 rounded-lg transition-colors"
                              title="Edit Paket"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(pkg.id);
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Hapus Paket"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            /* ΓöÇΓöÇ Grid View Tampilan Kartu Paket ΓöÇΓöÇ */
            <div className="p-6">
              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="bg-slate-50 border border-slate-200 rounded-xl p-4 animate-pulse space-y-3">
                      <div className="h-36 bg-slate-200 rounded-lg" />
                      <div className="h-4 bg-slate-200 rounded w-3/4" />
                      <div className="h-3 bg-slate-200 rounded w-1/2" />
                    </div>
                  ))}
                </div>
              ) : filteredPackages.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  Belum ada paket sarpras. Klik tombol &quot;Tambah Paket&quot; untuk membuat bundel baru.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filteredPackages.map((pkg) => (
                    <div
                      key={pkg.id}
                      onClick={() => handleRowClick(pkg)}
                      className="group bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:border-[#0785BC]/50 hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden cursor-pointer"
                    >
                      {/* Image / Thumbnail Header */}
                      <div className="relative aspect-video w-full bg-slate-100 overflow-hidden flex items-center justify-center border-b border-slate-100">
                        {pkg.image_url ? (
                          <img
                            src={pkg.image_url}
                            alt={pkg.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center text-[#0785BC]">
                            <Package className="w-10 h-10 stroke-[1.5]" />
                            <span className="text-[10px] mt-1 font-semibold text-slate-400">Paket Sarpras</span>
                          </div>
                        )}

                        {/* Top Badges */}
                        <div className="absolute top-2.5 left-2.5">
                          {pkg.is_available && (pkg.available_stock ?? (pkg.is_available ? 1 : 0)) > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold bg-emerald-600 text-white shadow-xs">
                              <CheckCircle2 className="w-3 h-3" /> Siap Dipinjam
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold bg-amber-600 text-white shadow-xs">
                              <AlertCircle className="w-3 h-3" /> Stok Kosong
                            </span>
                          )}
                        </div>

                        <div className="absolute top-2.5 right-2.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleStatus(pkg);
                            }}
                            title="Klik untuk mengubah status"
                            className="transition-transform active:scale-95"
                          >
                            {pkg.status !== "Aktif" ? (
                              <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-md bg-rose-600 text-white shadow-xs">
                                Non-Aktif
                              </span>
                            ) : (pkg.packages_items || []).some(
                                (pi) => (pi.items?.available_stock ?? 0) < pi.quantity || pi.items?.status !== "Tersedia"
                              ) ? (
                              <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-md bg-amber-600 text-white shadow-xs">
                                Item Kosong
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-md bg-[#0785BC] text-white shadow-xs">
                                Aktif
                              </span>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-4 flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center gap-1 flex-wrap mb-1.5">
                            {(pkg.categories || []).length > 0 ? (
                              (pkg.categories || []).map((cat, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[9px] font-semibold bg-blue-50 text-[#0785BC] border border-blue-100"
                                >
                                  <Tag className="w-2.5 h-2.5" />
                                  {cat}
                                </span>
                              ))
                            ) : (
                              <span className="text-[10px] text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">Umum</span>
                            )}
                          </div>

                          <h3 className="text-sm font-bold text-slate-900 group-hover:text-[#0785BC] transition-colors line-clamp-1">
                            {pkg.name}
                          </h3>

                          {pkg.description && (
                            <p className="text-[11px] text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                              {pkg.description}
                            </p>
                          )}

                          {/* Components Preview */}
                          <div className="mt-3 p-2.5 rounded-xl bg-slate-50/80 border border-slate-100 text-xs">
                            <span className="text-[11px] font-bold text-slate-600 block mb-1">
                              Komponen Paket ({pkg.packages_items?.length || 0} item)
                            </span>
                            <div className="space-y-1 max-h-20 overflow-y-auto pr-1">
                              {(pkg.packages_items || []).slice(0, 3).map((pi, idx) => (
                                <div key={pi.id || idx} className="flex items-center justify-between text-[11px] text-slate-600">
                                  <span className="truncate max-w-[170px]">{pi.items?.name || "Barang"}</span>
                                  <span className="font-semibold text-slate-700 bg-white px-1.5 py-0.2 rounded border border-slate-200 shrink-0">
                                    {pi.quantity} unit
                                  </span>
                                </div>
                              ))}
                              {(pkg.packages_items || []).length > 3 && (
                                <p className="text-[10px] text-slate-400 italic pt-0.5">
                                  +{(pkg.packages_items || []).length - 3} item lainnya
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Card Footer */}
                        <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between">
                          <div>
                            <span className="text-[10px] text-slate-400 block font-medium">Stok Paket</span>
                            <span className="text-xs font-bold text-slate-800">
                              {pkg.available_stock ?? (pkg.is_available ? 1 : 0)}{" "}
                              <span className="text-slate-400 font-normal">/ {pkg.stock ?? 0}</span>
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenPackageStock(pkg);
                              }}
                              className="p-1.5 text-slate-500 hover:text-[#0785BC] hover:bg-blue-50 rounded-lg transition-colors"
                              title="Kelola Stok Paket"
                            >
                              <Layers className="w-4 h-4 text-[#0785BC]" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRowClick(pkg);
                              }}
                              className="p-1.5 text-slate-400 hover:text-[#0785BC] hover:bg-blue-50 rounded-lg transition-colors"
                              title="Lihat Detail Paket"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenEdit(pkg);
                              }}
                              className="p-1.5 text-slate-400 hover:text-[#0785BC] hover:bg-slate-100 rounded-lg transition-colors"
                              title="Edit Paket"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(pkg.id);
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Hapus Paket"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal Tambah / Edit Paket */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[100] p-4 sm:p-6 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col border border-slate-200 my-auto animate-scale-in">
            {/* Header */}
            <div className="bg-slate-50/80 border-b border-slate-100 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#0785BC]/10 text-[#0785BC] flex items-center justify-center shadow-2xs">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    {editingId ? (lang === "en" ? "Edit Sarpras Package" : "Edit Paket Sarpras") : (lang === "en" ? "Add New Sarpras Package" : "Tambah Paket Sarpras Baru")}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {lang === "en" ? "Manage package identity and component combinations inside" : "Kelola identitas paket dan kombinasi komponen barang di dalamnya"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Body - 2 Columns Grid */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                
                {/* ΓöÇΓöÇ SISI KIRI: Identitas Paket (5 kolom) ΓöÇΓöÇ */}
                <div className="md:col-span-5 space-y-4">
                  <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/40 space-y-4">
                    <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider text-[#0785BC]">
                      1. Informasi & Foto Paket
                    </h3>

                    {/* Foto Paket */}
                    <div>
                      <label className="block font-semibold text-slate-700 mb-2">Foto Paket Sarpras</label>
                      <div className="flex items-center gap-3.5">
                        {imagePreview ? (
                          <div className="relative w-24 h-24 rounded-2xl overflow-hidden border border-slate-200 shadow-2xs shrink-0 group">
                            <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => setImagePreview("")}
                              className="absolute top-1.5 right-1.5 p-1 bg-rose-500 text-white rounded-full hover:bg-rose-600 transition-colors shadow-xs"
                              title="Hapus foto"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <label className="w-24 h-24 rounded-2xl border-2 border-dashed border-slate-200 hover:border-[#0785BC] flex flex-col items-center justify-center text-slate-400 hover:text-[#0785BC] cursor-pointer transition-all bg-white hover:bg-blue-50/20 shrink-0">
                            <Upload className="w-5 h-5 mb-1" />
                            <span className="text-[10px] font-bold">Upload Foto</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleImageChange}
                              className="hidden"
                            />
                          </label>
                        )}
                        <div className="text-[11px] text-slate-400 leading-relaxed">
                          <p className="font-medium text-slate-600">Unggah foto bundel paket</p>
                          <p>Format: JPG, PNG, WEBP</p>
                          <p>Maks. ukuran 3MB</p>
                        </div>
                      </div>
                    </div>

                    {/* Nama Paket */}
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Nama Paket *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#0785BC] text-xs font-medium text-slate-800 transition-all"
                        placeholder="contoh: Paket Seminar & Sound System"
                      />
                    </div>

                    {/* Status Paket */}
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1.5">
                        {lang === "en" ? "Package Availability Status *" : "Status Ketersediaan Paket *"}
                      </label>
                      <div className="grid grid-cols-2 gap-2.5">
                        <label
                          className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                            formData.status === "Aktif"
                              ? "border-emerald-500 bg-emerald-50/70 text-emerald-900 shadow-2xs font-bold"
                              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          <input
                            type="radio"
                            name="status"
                            value="Aktif"
                            checked={formData.status === "Aktif"}
                            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                            className="text-emerald-600 focus:ring-emerald-500"
                          />
                          <div>
                            <p className="text-xs font-bold text-slate-800">Aktif</p>
                            <p className="text-[10px] text-slate-400 font-normal">Siap dipinjam</p>
                          </div>
                        </label>

                        <label
                          className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                            formData.status !== "Aktif"
                              ? "border-rose-400 bg-rose-50/70 text-rose-900 shadow-2xs font-bold"
                              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          <input
                            type="radio"
                            name="status"
                            value="Non-Aktif"
                            checked={formData.status === "Non-Aktif" || formData.status === "Nonaktif"}
                            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                            className="text-rose-600 focus:ring-rose-500"
                          />
                          <div>
                            <p className="text-xs font-bold text-slate-800">Non-Aktif</p>
                            <p className="text-[10px] text-slate-400 font-normal">Tutup peminjaman</p>
                          </div>
                        </label>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed">
                        Jika ada 1 barang dalam paket yang habis stoknya, sistem otomatis menganggap paket tidak aktif/kosong.
                      </p>
                    </div>

                    {/* Deskripsi Paket */}
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Deskripsi Paket
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={3}
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#0785BC] resize-none text-xs text-slate-700 transition-all"
                        placeholder="Rincian acara atau perlengkapan yang didukung oleh paket ini..."
                      />
                    </div>
                  </div>
                </div>

                {/* ΓöÇΓöÇ SISI KANAN: Komponen Barang (Mix) (7 kolom) ΓöÇΓöÇ */}
                <div className="md:col-span-7 space-y-4">
                  <div className="p-4.5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3.5 flex flex-col h-full">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider text-[#0785BC]">
                          2. Komponen Barang Paket
                        </h3>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Gabungkan barang inventaris per item & barang khusus paket
                        </p>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#0785BC]/10 text-[#0785BC] border border-[#0785BC]/20">
                        {selectedItems.length} Item
                      </span>
                    </div>

                    {/* Mode Selector Tabs */}
                    <div className="flex p-1 bg-slate-200/70 rounded-xl gap-1">
                      <button
                        type="button"
                        onClick={() => setAddItemMode("per_item")}
                        className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                          addItemMode === "per_item"
                            ? "bg-white text-[#0785BC] shadow-xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        <Boxes className="w-3.5 h-3.5" />
                        Dari Barang Per Item
                      </button>
                      <button
                        type="button"
                        onClick={() => setAddItemMode("kode_paket")}
                        className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                          addItemMode === "kode_paket"
                            ? "bg-white text-[#0785BC] shadow-xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        <Tag className="w-3.5 h-3.5" />
                        Input Khusus Kode Paket
                      </button>
                    </div>

                    {/* Input Area */}
                    <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2.5">
                      {addItemMode === "per_item" ? (
                        <div className="space-y-2.5">
                          {/* Filter Kategori & Search Barang untuk Paket */}
                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                            <div className="sm:col-span-5">
                              <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">
                                Filter Kategori Barang:
                              </label>
                              <select
                                value={modalItemCategory}
                                onChange={(e) => setModalItemCategory(e.target.value)}
                                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0785BC]"
                              >
                                <option value="all">Semua Kategori ({availableItems.length})</option>
                                {categories.map((c) => {
                                  const count = availableItems.filter((i) => i.category_id === c.id || i.category === c.name).length;
                                  return (
                                    <option key={c.id} value={c.name}>
                                      {c.name} ({count})
                                    </option>
                                  );
                                })}
                              </select>
                            </div>
                            <div className="sm:col-span-7">
                              <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">
                                Cari Nama / Kode Barang:
                              </label>
                              <input
                                type="text"
                                placeholder="Cari nama atau kode..."
                                value={modalItemSearch}
                                onChange={(e) => setModalItemSearch(e.target.value)}
                                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white text-xs focus:outline-none focus:ring-2 focus:ring-[#0785BC]"
                              />
                            </div>
                          </div>

                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="block text-[11px] font-semibold text-slate-700">
                                Pilih Barang ({filteredAvailableItems.length} opsi tersedia):
                              </label>
                              {(modalItemCategory !== "all" || modalItemSearch) && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setModalItemCategory("all");
                                    setModalItemSearch("");
                                  }}
                                  className="text-[10px] text-[#0785BC] font-semibold hover:underline"
                                >
                                  Reset Filter
                                </button>
                              )}
                            </div>
                            <select
                              value={selectedItemId}
                              onChange={(e) => setSelectedItemId(e.target.value)}
                              className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs focus:outline-none focus:ring-2 focus:ring-[#0785BC]"
                            >
                              <option value="">-- Pilih Barang Per Item --</option>
                              {filteredAvailableItems.map((item) => (
                                <option key={item.id} value={item.id}>
                                  [{item.category || "Umum"}] {item.name} ({item.code})  Sisa Stok: {item.available_stock} unit
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="flex items-center justify-between gap-3 pt-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-slate-600">Jumlah:</span>
                              <input
                                type="number"
                                min="1"
                                value={selectedItemQty}
                                onChange={(e) => setSelectedItemQty(Math.max(1, parseInt(e.target.value) || 1))}
                                className="w-20 px-3 py-1.5 border border-slate-200 rounded-xl text-center text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#0785BC]"
                              />
                              <span className="text-xs text-slate-400">unit</span>
                            </div>
                            <button
                              type="button"
                              onClick={handleAddItemFromInventory}
                              className="px-4 py-2 bg-[#0785BC] text-white text-xs font-bold rounded-xl hover:bg-[#0672a0] transition-colors shadow-2xs"
                            >
                              + Masukkan ke Paket
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                            <div className="sm:col-span-5">
                              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                Kode Barang Paket:
                              </label>
                              <input
                                type="text"
                                value={customItemCode}
                                onChange={(e) => setCustomItemCode(e.target.value.toUpperCase())}
                                placeholder="cth: PKT-MIC-01"
                                className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono uppercase text-xs focus:outline-none focus:ring-2 focus:ring-[#0785BC]"
                              />
                            </div>
                            <div className="sm:col-span-7">
                              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                Nama Barang Khusus Paket:
                              </label>
                              <input
                                type="text"
                                value={customItemName}
                                onChange={(e) => setCustomItemName(e.target.value)}
                                placeholder="cth: Mic Wireless UHF Shure"
                                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#0785BC]"
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-3 pt-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-slate-600">Jumlah:</span>
                              <input
                                type="number"
                                min="1"
                                value={customItemQty}
                                onChange={(e) => setCustomItemQty(Math.max(1, parseInt(e.target.value) || 1))}
                                className="w-20 px-3 py-1.5 border border-slate-200 rounded-xl text-center text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#0785BC]"
                              />
                              <span className="text-xs text-slate-400">unit</span>
                            </div>
                            <button
                              type="button"
                              onClick={handleAddCustomPackageItem}
                              className="px-4 py-2 bg-[#0785BC] text-white text-xs font-bold rounded-xl hover:bg-[#0672a0] transition-colors shadow-2xs"
                            >
                              + Masukkan ke Paket
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* List Komponen Terpilih */}
                    <div className="flex-1 flex flex-col min-h-[160px]">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          Daftar Komponen Terdaftar:
                        </span>
                        <span className="text-[11px] text-slate-400">
                          Total: {selectedItems.reduce((acc, i) => acc + (i.quantity || 1), 0)} unit
                        </span>
                      </div>

                      {selectedItems.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-200 rounded-2xl bg-white text-slate-400 text-center">
                          <Package className="w-8 h-8 text-slate-300 mb-1.5" />
                          <p className="font-bold text-slate-600 text-xs">Belum ada barang dimasukkan</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Gunakan salah satu form di atas untuk memasukkan komponen paket
                          </p>
                        </div>
                      ) : (
                        <div className="flex-1 max-h-56 overflow-y-auto space-y-1.5 pr-1 border border-slate-200/80 rounded-2xl bg-white p-2 divide-y divide-slate-100">
                          {selectedItems.map((item, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-xl transition-colors gap-2"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span
                                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0 ${
                                    item.source_type === "kode_paket"
                                      ? "bg-sky-50 text-sky-700 border border-sky-200"
                                      : "bg-blue-50 text-blue-700 border border-blue-200"
                                  }`}
                                >
                                  {item.source_type === "kode_paket" ? "Khusus Paket" : "Per Item"}
                                </span>
                                <div className="truncate">
                                  <p className="font-bold text-slate-800 truncate text-xs">{item.name}</p>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <p className="text-[10px] font-mono text-slate-400">{item.code}</p>
                                    {item.category && (
                                      <span className="text-[9px] px-1.5 py-0.2 rounded font-semibold bg-blue-50 text-[#0785BC] border border-blue-100">
                                        {item.category}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2.5 shrink-0 ml-2">
                                <span className="font-extrabold text-[#0785BC] bg-blue-50/80 px-2.5 py-0.5 rounded-lg border border-blue-100">
                                  {item.quantity} unit
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveItemFromPackage(idx)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                  title="Hapus komponen"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end gap-2.5 pt-4 mt-6 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 font-bold rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#0785BC] text-white font-bold rounded-xl hover:bg-[#0672a0] disabled:opacity-60 transition-all shadow-sm active:scale-95"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingId ? "Simpan Perubahan Paket" : "Buat Paket Sarpras"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ΓöÇΓöÇ Modern Detail Modal Paket ΓöÇΓöÇ */}
      {showDetail && selectedPackage && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[100] p-4 sm:p-6 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-2xl max-w-3xl w-full overflow-hidden border border-slate-200 shadow-2xl flex flex-col max-h-[90vh] my-auto animate-scale-in">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#0785BC]/10 text-[#0785BC] flex items-center justify-center shadow-2xs">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 text-base">Detail Paket Sarpras</h3>
                    <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                      Bundling
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">Spesifikasi bundel aset dan kesiapan komponen</p>
                </div>
              </div>
              <button
                onClick={() => setShowDetail(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Hero Image Showcase */}
              <div className="relative w-full h-56 sm:h-64 rounded-2xl overflow-hidden border border-slate-100 shadow-sm bg-slate-900/5 group">
                {(richPackageDetail?.image_url || selectedPackage.image_url) ? (
                  <>
                    <img
                      src={richPackageDetail?.image_url || selectedPackage.image_url}
                      alt={selectedPackage.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                  </>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-100 via-blue-50/40 to-slate-200/50 p-6 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-white/80 border border-slate-200/80 shadow-xs flex items-center justify-center text-[#0785BC] mb-2 group-hover:scale-110 transition-transform">
                      <Layers className="w-7 h-7 text-slate-400" />
                    </div>
                    <p className="text-xs font-bold text-slate-600">Tidak Ada Foto Paket</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Foto paket dapat diunggah melalui formulir edit paket</p>
                  </div>
                )}

                {/* Badges on Hero */}
                <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-white/90 backdrop-blur-md text-[#0785BC] shadow-sm">
                    Paket Inventaris
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-800/80 backdrop-blur-md text-white shadow-sm">
                    Status: {selectedPackage.status || "Aktif"}
                  </span>
                </div>

                <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
                  <div className="text-white drop-shadow-md">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-200 block">Nama Paket</span>
                    <h2 className="text-lg sm:text-xl font-black text-white leading-tight">{selectedPackage.name}</h2>
                  </div>
                  {(richPackageDetail?.is_available ?? selectedPackage.is_available) ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-500 text-white shadow-sm">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Siap Dipinjam
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-extrabold bg-amber-500 text-white shadow-sm">
                      <AlertCircle className="w-3.5 h-3.5" /> Stok Terbatas
                    </span>
                  )}
                </div>
              </div>

              {/* Key Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-2 text-slate-400 mb-1">
                    <Boxes className="w-4 h-4 text-slate-500" />
                    <span className="text-[11px] font-semibold uppercase tracking-wider">Jenis Barang</span>
                  </div>
                  <p className="text-base font-extrabold text-slate-800">
                    {(richPackageDetail?.packages_items || selectedPackage.packages_items || []).length}{" "}
                    <span className="text-xs font-normal text-slate-500">macam</span>
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-100">
                  <div className="flex items-center gap-2 text-blue-600 mb-1">
                    <Layers className="w-4 h-4" />
                    <span className="text-[11px] font-semibold uppercase tracking-wider">Total Item</span>
                  </div>
                  <p className="text-base font-extrabold text-blue-700">
                    {(richPackageDetail?.packages_items || selectedPackage.packages_items || []).reduce(
                      (acc, pi) => acc + (pi.quantity || 1),
                      0
                    )}{" "}
                    <span className="text-xs font-normal text-blue-600">unit</span>
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-100">
                  <div className="flex items-center justify-between text-emerald-600 mb-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider">Stok Paket</span>
                    <Layers className="w-4 h-4" />
                  </div>
                  <p className="text-base font-extrabold text-emerald-700 mt-0.5">
                    {richPackageDetail?.available_stock ?? selectedPackage.available_stock ?? (selectedPackage.is_available ? 1 : 0)}{" "}
                    <span className="text-xs font-normal text-emerald-600">Siap Pinjam</span>
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Total Kapasitas: {richPackageDetail?.stock ?? selectedPackage.stock ?? 0} Paket
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-slate-400 mb-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider">Status Paket</span>
                    <Clock className="w-4 h-4 text-slate-500" />
                  </div>
                  <div className="flex items-center justify-between gap-1 mt-1">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-md text-xs font-bold ${
                        (richPackageDetail?.status || selectedPackage.status) === "Aktif"
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                          : "bg-rose-100 text-rose-800 border border-rose-200"
                      }`}
                    >
                      {richPackageDetail?.status || selectedPackage.status || "Aktif"}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(richPackageDetail || selectedPackage)}
                      className="text-[10px] font-bold text-[#0785BC] hover:underline"
                    >
                      Ubah
                    </button>
                  </div>
                </div>
              </div>

              {/* Quick Action: Kelola Stok Paket */}
              <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#0785BC]" />
                    <p className="text-xs font-bold text-slate-800">Manajemen Stok Paket Sarpras</p>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Tambah atau kurangi kapasitas paket secara langsung. Perubahan akan otomatis menyinkronkan stok seluruh komponen barang.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenPackageStock(richPackageDetail || selectedPackage)}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-[#0785BC] hover:bg-[#0672a0] text-white text-xs font-bold rounded-xl active:scale-95 transition-all shadow-xs shrink-0 cursor-pointer"
                >
                  <Layers className="w-3.5 h-3.5" /> Kelola Stok (+ / - Paket)
                </button>
              </div>

              {/* Warning Alert if Unavailable / Empty Items */}
              {(!(richPackageDetail?.is_available ?? selectedPackage.is_available) ||
                (richPackageDetail?.packages_items || selectedPackage.packages_items || []).some(
                  (pi) => (pi.items?.available_stock ?? 0) < pi.quantity || pi.items?.status !== "Tersedia"
                )) && (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3 text-xs text-amber-800 animate-fade-in">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-amber-900">Otomatis Non-Aktif: Ada Komponen Barang yang Kosong / Kurang</p>
                    <p className="mt-0.5 text-amber-700 leading-relaxed">
                      Sesuai aturan sistem, jika salah satu barang di dalam paket stoknya kosong atau tidak mencukupi, maka paket ini otomatis dianggap <strong>Kosong / Non-Aktif</strong> bagi calon peminjam dan tidak dapat diajukan per paket sampai stok dipenuhi.
                    </p>
                  </div>
                </div>
              )}

              {/* Deskripsi Paket */}
              <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/40">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Deskripsi & Tujuan Paket</p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {selectedPackage.description || "Tidak ada keterangan tertulis untuk paket ini."}
                </p>
              </div>

              {/* Rincian Komponen Barang */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-800 flex items-center gap-2">
                    <span>Komponen Barang dalam Paket</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-600 font-bold">
                      {(richPackageDetail?.packages_items || selectedPackage.packages_items || []).length} Barang
                    </span>
                  </p>
                  {detailLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0785BC]" />}
                </div>

                <div className="border border-slate-100 rounded-2xl divide-y divide-slate-100 bg-slate-50/30 overflow-hidden">
                  {(richPackageDetail?.packages_items || selectedPackage.packages_items || []).length > 0 ? (
                    (richPackageDetail?.packages_items || selectedPackage.packages_items || []).map((pi) => {
                      const availStock = pi.items?.available_stock ?? 0;
                      const isStockEnough = availStock >= pi.quantity;

                      return (
                        <div key={pi.id} className="p-3.5 flex items-center justify-between gap-3 text-xs">
                          <div className="flex items-center gap-3 min-w-0">
                            {pi.items?.image_url ? (
                              <img
                                src={pi.items.image_url}
                                alt={pi.items?.name || "Barang"}
                                className="w-10 h-10 rounded-xl object-cover border border-slate-100 shrink-0"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0785BC] flex items-center justify-center shrink-0">
                                <Package className="w-5 h-5" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="font-bold text-slate-800 truncate">{pi.items?.name || "Barang Sarpras"}</p>
                                {pi.items?.code?.toUpperCase().startsWith("PKT-") ? (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-sky-50 text-sky-700 border border-sky-200 shrink-0">
                                    Khusus Paket
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                                    Per Item
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                                <span className="font-mono bg-white px-1.5 py-0.2 rounded border border-slate-200">
                                  {pi.items?.code || "-"}
                                </span>
                                {(pi.items?.category || pi.items?.categories?.name) && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-blue-50 text-[#0785BC] border border-blue-100">
                                    {pi.items?.category || pi.items?.categories?.name}
                                  </span>
                                )}
                                <span>Kondisi: <strong className="text-slate-600">{pi.items?.condition || "Baik"}</strong></span>
                              </div>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="inline-block px-2.5 py-0.5 rounded-lg text-xs font-extrabold bg-[#0785BC]/10 text-[#0785BC] border border-[#0785BC]/20">
                              Dibutuhkan: {pi.quantity} unit
                            </span>
                            <div className="flex items-center gap-1.5 mt-1 justify-end">
                              {isStockEnough ? (
                                <span className="text-[10px] font-bold text-emerald-600">
                                  Tersedia ({availStock} unit)
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold text-rose-500">
                                  Stok Kurang ({availStock} tersisa)
                                </span>
                              )}
                              {(pi.items?.id || pi.item_id) && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenReplenish(pi.items || { id: pi.item_id, name: "Barang", code: "-" })}
                                  className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-[#0785BC] hover:bg-blue-100 border border-blue-200 transition-colors"
                                  title="Tambah stok barang ini agar paket otomatis siap dipinjam"
                                >
                                  + Tambah Stok
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-8 text-center bg-slate-50">
                      <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs font-bold text-slate-600">Belum Ada Rincian Barang</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Paket ini belum memiliki komponen barang terdaftar.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
              <button
                type="button"
                onClick={() => setShowDetail(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 text-xs font-bold rounded-xl transition-colors"
              >
                Tutup
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleStatus(richPackageDetail || selectedPackage)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl border transition-all active:scale-95 ${
                    (richPackageDetail?.status || selectedPackage.status) === "Aktif"
                      ? "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                      : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                  }`}
                >
                  {(richPackageDetail?.status || selectedPackage.status) === "Aktif"
                    ? "Ubah ke Non-Aktif"
                    : "Aktifkan Paket"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDetail(false);
                    handleOpenEdit(selectedPackage);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0785BC] text-white text-xs font-bold rounded-xl hover:bg-[#0672a0] transition-colors shadow-2xs"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit Paket
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ΓöÇΓöÇ Unified Modal Ekspor & Impor Paket Sarpras ΓöÇΓöÇ */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="Kelola Data Paket Sarpras"
        description="Pilih tab untuk ekspor berkas terfilter tanggal atau impor berkas CSV paket."
        moduleName="Paket_Sarpras"
        filenamePrefix="SARPRAS_Paket"
        data={packages}
        dateFieldGetter={(p) => (p as any).created_at}
        dataRowMapper={(p) => ({
          "Nama Paket": p.name,
          Deskripsi: p.description || "-",
          Status: p.status,
          "Ketersediaan Stok": p.is_available ? "Lengkap / Siap Pakai" : "Terbatas / Sebagian Dipinjam",
          "Jumlah Jenis Komponen": p.packages_items?.length || 0,
          "Rincian Barang": (p.packages_items || [])
            .map((pi: any) => `${pi.items?.name || "Barang"} (${pi.quantity} unit)`)
            .join("; "),
        })}
        allowImport={true}
        importTitle="Template Berkas CSV Paket"
        importTemplateFilename="template_import_paket_sarpras.csv"
        importTemplateHeader="name, description, status, item_code, quantity"
        importTemplateContent="name,description,status,item_code,quantity\nPaket Seminar,Paket bundling proyektor dan perlengkapan audio,Aktif,BRG-PRJ-001,1\nPaket Seminar,Paket bundling proyektor dan perlengkapan audio,Aktif,BRG-002,2"
        onExecuteImport={async (file) => {
          const res = await api.packages.importCSV(file);
          if (res.status === "success" || res.statusCode === 201 || res.statusCode === 207) {
            await fetchData();
            const succ = res.data?.success?.length || 0;
            const fail = res.data?.failed?.length || 0;
            alert(res.message || `Import paket selesai: ${succ} berhasil, ${fail} gagal`);
            return { success: succ, failed: fail };
          } else {
            alert("Gagal impor CSV paket: " + (res.message || "Error"));
            return { success: 0, failed: 1 };
          }
        }}
      />

      {/* ΓöÇΓöÇ Dialog Cepat Tambah Stok Barang (Agar Paket Otomatis Aktif Kembali) ΓöÇΓöÇ */}
      {replenishModal.open && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[100] p-4 sm:p-6 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4 my-auto animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Boxes className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Tambah Stok Barang</h3>
                  <p className="text-[11px] text-slate-400">Pulihkan ketersediaan paket bundling</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReplenishModal({ ...replenishModal, open: false })}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200/60 rounded-2xl text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-400">Nama Barang:</span>
                <span className="font-bold text-slate-800">{replenishModal.item_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Kode Barang:</span>
                <span className="font-mono font-semibold text-slate-700">{replenishModal.item_code}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Sisa Tersedia Saat Ini:</span>
                <span className="font-bold text-rose-600">{replenishModal.current_avail} unit</span>
              </div>
            </div>

            <form onSubmit={handleSaveReplenish} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Jumlah Stok yang Ingin Ditambahkan
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    required
                    value={replenishModal.add_qty}
                    onChange={(e) => setReplenishModal({ ...replenishModal, add_qty: Math.max(1, parseInt(e.target.value) || 1) })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-center text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
                  />
                  <span className="text-slate-500 font-medium">unit</span>
                </div>
                <div className="flex gap-1.5 mt-2">
                  {[2, 5, 10, 20].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setReplenishModal({ ...replenishModal, add_qty: preset })}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 rounded-lg text-[10px] font-bold text-slate-600 transition-colors"
                    >
                      +{preset}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setReplenishModal({ ...replenishModal, open: false })}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 font-bold rounded-xl text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors shadow-sm"
                >
                  Simpan & Tambah Stok
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ΓöÇΓöÇ Dialog Manajemen Stok Paket (Tambah / Kurangi Stok Paket) ΓöÇΓöÇ */}
      {packageStockModal.open && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[100] p-4 sm:p-6 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 my-auto animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#0785BC] flex items-center justify-center">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Kelola Stok Paket</h3>
                  <p className="text-[11px] text-slate-400">Atur kapasitas ketersediaan set paket</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPackageStockModal((prev) => ({ ...prev, open: false }))}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Info Paket Saat Ini */}
            <div className="p-3.5 bg-slate-50 border border-slate-200/60 rounded-2xl text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-400">Nama Paket:</span>
                <span className="font-bold text-slate-800">{packageStockModal.package_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Stok Siap Pinjam:</span>
                <span className="font-bold text-emerald-600">{packageStockModal.current_avail} Paket</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Total Kapasitas Gudang:</span>
                <span className="font-bold text-slate-700">{packageStockModal.current_stock} Paket</span>
              </div>
            </div>

            <form onSubmit={handleSavePackageStock} className="space-y-4 text-xs">
              {/* Pilihan Aksi: Tambah atau Kurang */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Pilih Aksi Penyesuaian</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPackageStockModal((prev) => ({ ...prev, action: "add" }))}
                    className={`py-2 px-3 rounded-xl font-bold border text-center transition-all flex items-center justify-center gap-1.5 ${
                      packageStockModal.action === "add"
                        ? "bg-emerald-50 border-emerald-500 text-emerald-700 shadow-2xs"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <span>+ Tambah Stok</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPackageStockModal((prev) => ({ ...prev, action: "reduce" }))}
                    className={`py-2 px-3 rounded-xl font-bold border text-center transition-all flex items-center justify-center gap-1.5 ${
                      packageStockModal.action === "reduce"
                        ? "bg-rose-50 border-rose-500 text-rose-700 shadow-2xs"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <span>- Kurangi Stok</span>
                  </button>
                </div>
              </div>

              {/* Jumlah Paket */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Jumlah Set Paket yang Ingin {packageStockModal.action === "add" ? "Ditambahkan" : "Dikurangi"}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    required
                    value={packageStockModal.quantity}
                    onChange={(e) =>
                      setPackageStockModal({
                        ...packageStockModal,
                        quantity: Math.max(1, parseInt(e.target.value) || 1),
                      })
                    }
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-center text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#0785BC] text-slate-800 bg-white"
                  />
                  <span className="text-slate-500 font-medium shrink-0">Paket</span>
                </div>
                <div className="flex gap-1.5 mt-2">
                  {[1, 2, 5, 10].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setPackageStockModal((prev) => ({ ...prev, quantity: preset }))}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 hover:text-[#0785BC] rounded-lg text-[10px] font-bold text-slate-600 transition-colors"
                    >
                      {preset} Paket
                    </button>
                  ))}
                </div>
              </div>

              {/* Dampak Perubahan Barang Komponen */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5">
                <p className="font-bold text-slate-700 text-[11px]">
                  Dampak pada stok barang fisik ({packageStockModal.action === "add" ? "+" : "-"}{packageStockModal.quantity} Paket):
                </p>
                <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                  {(packageStockModal.items || []).map((pi: any, idx: number) => {
                    const delta = (Number(pi.quantity) || 1) * packageStockModal.quantity;
                    const sign = packageStockModal.action === "add" ? "+" : "-";
                    return (
                      <div key={idx} className="flex justify-between items-center text-[11px] text-slate-600 py-0.5 border-b border-slate-200/50 last:border-b-0">
                        <span className="truncate max-w-[180px]">
                        {pi.items?.name || "Barang"}
                        </span>
                        <span className={`font-bold ${packageStockModal.action === "add" ? "text-emerald-600" : "text-rose-600"}`}>
                          {sign}{delta} unit
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPackageStockModal((prev) => ({ ...prev, open: false }))}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 font-bold rounded-xl text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className={`px-4 py-2 text-white font-bold rounded-xl text-xs transition-colors shadow-sm disabled:opacity-60 ${
                    packageStockModal.action === "add"
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-rose-600 hover:bg-rose-700"
                  }`}
                >
                  {saving
                    ? "Menyinkronkan..."
                    : packageStockModal.action === "add"
                    ? "Simpan & Tambah Stok"
                    : "Simpan & Kurangi Stok"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
