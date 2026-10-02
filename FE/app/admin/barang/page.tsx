"use client";

import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin";
import {
  Plus,
  Edit,
  Trash2,
  X,
  Upload,
  Image as ImageIcon,
  Loader2,
  Package,
  CheckCircle2,
  AlertTriangle,
  Download,
  FileSpreadsheet,
  Eye,
  Boxes,
  Tag,
  Clock,
  User,
  Layers,
  FileText,
  LayoutGrid,
  List,
} from "lucide-react";
import api from "@/lib/api";
import ExportModal from "@/components/ExportModal";
import { toast } from "@/components/Toast";

interface Category {
  id: string;
  name: string;
}

interface Item {
  id: string;
  name: string;
  code: string;
  category_id?: string;
  category?: string;
  stock: number;
  available_stock?: number;
  condition: string;
  status?: string;
  location?: string;
  image_url?: string;
  description?: string;
}

interface ItemDetailData extends Item {
  statistics?: {
    total_borrowings: number;
    active_borrowings: number;
    usage_percentage: number;
  };
  recent_borrowings?: Array<{
    id: string;
    quantity: number;
    condition_before?: string;
    condition_after?: string;
    note?: string;
    borrowings?: {
      id: string;
      borrow_code: string;
      borrow_date: string;
      status: string;
      users?: {
        id: string;
        name: string;
        email: string;
      };
    };
  }>;
  in_packages?: Array<{
    package_id: string;
    package_name: string;
    package_status: string;
    quantity_in_package: number;
  }>;
}

export default function BarangPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [richDetail, setRichDetail] = useState<ItemDetailData | null>(null);
  const [activeDetailTab, setActiveDetailTab] = useState<"info" | "history" | "packages">("info");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [imagePreview, setImagePreview] = useState<string>("");
  const [showExportModal, setShowExportModal] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    category_id: "",
    stock: 1,
    available_stock: 1,
    condition: "Baik",
    status: "Tersedia",
    location: "",
    description: "",
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [itemsRes, catRes] = await Promise.all([
        api.items.getAll({ limit: 100 }),
        api.categories.getAll(),
      ]);

      if (itemsRes.status === "success" && Array.isArray(itemsRes.data)) {
        const mapped: Item[] = (itemsRes.data as any[]).map((i) => ({
          id: i.id,
          name: i.name,
          code: i.code,
          category_id: i.category_id,
          category: i.categories?.name || "-",
          stock: i.stock ?? 0,
          available_stock: i.available_stock !== undefined && i.available_stock !== null ? i.available_stock : (i.stock ?? 0),
          condition: i.condition || "Baik",
          status: (i.available_stock !== undefined && i.available_stock === 0) ? "Stok Kosong" : (i.status || "Tersedia"),
          location: i.location || "-",
          image_url: i.image_url || "",
          description: i.description || "",
        }));
        setItems(mapped);
      }

      if (catRes.status === "success" && Array.isArray(catRes.data)) {
        setCategories(catRes.data as Category[]);
      }
    } catch (err) {
      console.error("Gagal memuat data barang:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const resetForm = () => {
    setFormData({
      name: "",
      code: "",
      category_id: categories[0]?.id || "",
      stock: 1,
      available_stock: 1,
      condition: "Baik",
      status: "Tersedia",
      location: "",
      description: "",
    });
    setImagePreview("");
    setEditingId(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    if (categories.length > 0) {
      setFormData((prev) => ({ ...prev, category_id: categories[0].id }));
    }
    setShowModal(true);
  };

  const handleOpenEdit = (item: Item) => {
    setEditingId(item.id);
    const stockVal = item.stock ?? 0;
    const availVal = item.available_stock !== undefined && item.available_stock !== null ? item.available_stock : stockVal;
    const computedStatus = availVal === 0 ? "Stok Kosong" : (item.status || "Tersedia");

    setFormData({
      name: item.name || "",
      code: item.code || "",
      category_id: item.category_id || "",
      stock: stockVal,
      available_stock: availVal,
      condition: item.condition || "Baik",
      status: computedStatus,
      location: item.location || "",
      description: item.description || "",
    });
    setImagePreview(item.image_url || "");
    setShowModal(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.warning("Nama barang wajib diisi sesuai inventaris fisik.", "Validasi Input");
      return;
    }
    if (!formData.code.trim()) {
      toast.warning("Kode inventaris barang wajib diisi untuk penomoran aset.", "Validasi Input");
      return;
    }
    if (!formData.category_id || formData.category_id.trim() === "") {
      toast.warning("Silakan pilih kategori barang terlebih dahulu sebelum menyimpan.", "Kategori Belum Dipilih");
      return;
    }

    setSaving(true);

    try {
      const numStock = Number(formData.stock) || 0;
      const numAvail = Number(formData.available_stock) ?? numStock;
      const finalStatus = numAvail === 0 && (formData.status === "Tersedia" || !formData.status)
        ? "Stok Kosong"
        : formData.status;

      const payload: any = {
        name: formData.name.trim(),
        code: formData.code.trim().toUpperCase(),
        category_id: formData.category_id,
        stock: numStock,
        available_stock: numAvail,
        condition: formData.condition,
        status: finalStatus,
        description: formData.description?.trim() || "",
        location: formData.location?.trim() || "",
        image_url: imagePreview || undefined,
      };

      if (editingId) {
        const res = await api.items.update(editingId, payload);
        if (res.status === "success") {
          toast.success(`Data barang "${payload.name}" berhasil diperbarui!`, "Berhasil Disimpan");
          await fetchData();
          setShowModal(false);
          resetForm();
        } else {
          toast.error(res.message || "Gagal memperbarui barang.", "Pembaruan Gagal");
        }
      } else {
        const res = await api.items.create(payload);
        if (res.status === "success") {
          toast.success(`Barang baru "${payload.name}" berhasil ditambahkan ke inventaris!`, "Berhasil Ditambahkan");
          await fetchData();
          setShowModal(false);
          resetForm();
        } else {
          toast.error(res.message || "Gagal menambah barang.", "Penyimpanan Gagal");
        }
      }
    } catch (err: any) {
      toast.error(err?.message || "Terjadi kesalahan pada sistem.", "Error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus barang ini?")) return;
    try {
      const res = await api.items.delete(id);
      if (res.status === "success") {
        toast.success("Barang berhasil dihapus dari inventaris.", "Berhasil Dihapus");
        setItems((prev) => prev.filter((item) => item.id !== id));
      } else {
        toast.error(res.message || "Gagal menghapus barang.", "Gagal Menghapus");
      }
    } catch (err: any) {
      toast.error(err.message || "Gagal menghapus barang dari inventaris.", "Gagal Menghapus");
    }
  };

  const handleRowClick = async (item: Item) => {
    setSelectedItem(item);
    setRichDetail(item as ItemDetailData);
    setActiveDetailTab("info");
    setShowDetail(true);
    setDetailLoading(true);

    try {
      const res = await api.items.getById(item.id);
      if (res.status === "success" && res.data) {
        setRichDetail((prev) => ({
          ...(prev || item),
          ...res.data,
          category: res.data.categories?.name || res.data.category || (prev ? prev.category : item.category),
        }));
      }
    } catch (err) {
      console.error("Gagal memuat detail lengkap barang:", err);
    } finally {
      setDetailLoading(false);
    }
  };

  const filteredItems = items.filter((item) => {
    const matchSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.category || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchCategory =
      categoryFilter === "all" ||
      item.category_id === categoryFilter ||
      item.category?.toLowerCase() === categoryFilter.toLowerCase();
    return matchSearch && matchCategory;
  });

  const totalStockCount = items.reduce((acc, curr) => acc + (curr.stock || 0), 0);
  const totalAvailableCount = items.reduce((acc, curr) => acc + (curr.available_stock ?? curr.stock ?? 0), 0);
  const damagedItemCount = items.filter((i) => i.condition !== "Baik").length;

  return (
    <AdminLayout
      showSearch
      searchValue={searchQuery}
      searchPlaceholder="Cari barang berdasarkan nama, kode, lokasi..."
      onSearchChange={setSearchQuery}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Katalog Inventaris Barang</h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-slate-100 text-slate-600 border border-slate-200">
                {items.length} ITEMS
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Kelola seluruh data aset fisik, kuantitas stok satuan, dan status operasional.</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowExportModal(true)}
              className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200/90 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 active:scale-95 transition-all shadow-2xs"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-[#0785BC]" />
              Ekspor Data
            </button>
            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-2 px-3.5 py-2 bg-[#0785BC] text-white text-xs font-semibold rounded-lg hover:bg-[#0672a0] active:scale-95 transition-all shadow-xs"
            >
              <Plus className="w-4 h-4" />
              Tambah Barang
            </button>
          </div>
        </div>

        {/* ── Stat Cards (n8n Node Style) ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="group bg-white rounded-xl border border-slate-200/90 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all duration-200 p-4.5 flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-50 text-sky-700 border border-sky-200 mb-1.5">
                  TOTAL ASET
                </span>
                <p className="text-xs font-medium text-slate-500">Total Jenis & Unit</p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-sky-50 border border-sky-100 text-[#0785BC] flex items-center justify-center shrink-0">
                <Package className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-black text-slate-900 tabular-nums tracking-tight">
                {loading ? "..." : items.length} <span className="text-xs text-slate-500 font-normal">jenis ({totalStockCount} unit)</span>
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">Seluruh unit fisik tercatat di sistem</p>
            </div>
          </div>

          <div className="group bg-white rounded-xl border border-slate-200/90 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all duration-200 p-4.5 flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 mb-1.5">
                  AVAILABLE
                </span>
                <p className="text-xs font-medium text-slate-500">Stok Siap Pinjam</p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-black text-emerald-600 tabular-nums tracking-tight">
                {loading ? "..." : totalAvailableCount} <span className="text-xs text-emerald-700/60 font-normal">unit tersedia</span>
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">Dapat langsung dipinjam civitas kampus</p>
            </div>
          </div>

          <div className="group bg-white rounded-xl border border-slate-200/90 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all duration-200 p-4.5 flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-50 text-rose-700 border border-rose-200 mb-1.5">
                  ATTENTION
                </span>
                <p className="text-xs font-medium text-slate-500">Perlu Penanganan</p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-black text-rose-600 tabular-nums tracking-tight">
                {loading ? "..." : damagedItemCount} <span className="text-xs text-rose-700/60 font-normal">item terkendala</span>
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">Kondisi rusak ringan atau dalam perbaikan</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-5 py-3.5 border-b border-slate-200/80 bg-slate-50/50">
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">Daftar Inventaris Barang</h2>
              <p className="text-[11px] text-slate-500 mt-0.5">Menampilkan {filteredItems.length} barang terdaftar</p>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-medium">Filter Kategori:</span>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="text-xs font-semibold border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#0785BC]/30 focus:border-[#0785BC] transition-all"
                >
                  <option value="all">Semua Kategori</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
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
                  title="Tampilan Tabel (List)"
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
                  title="Tampilan Grid (Kartu)"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {viewMode === "list" ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50/80 border-b border-slate-200/80 font-mono text-[10px] text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-2.5 text-left">Kode</th>
                    <th className="px-4 py-2.5 text-left">Nama Barang</th>
                    <th className="px-4 py-2.5 text-left">Kategori</th>
                    <th className="px-4 py-2.5 text-left">Stok / Tersedia</th>
                    <th className="px-4 py-2.5 text-left">Kondisi</th>
                    <th className="px-4 py-2.5 text-left">Status</th>
                    <th className="px-4 py-2.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 7 }).map((_, j) => (
                          <td key={j} className="px-4 py-4">
                            <div className="h-4 bg-slate-100 rounded animate-pulse" />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-slate-400 text-xs">
                        Belum ada data barang. Klik tombol "Tambah Barang" untuk membuat baru.
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item) => (
                      <tr
                        key={item.id}
                        onClick={() => handleRowClick(item)}
                        className="hover:bg-slate-50/70 cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-3.5 text-xs font-semibold text-slate-800">{item.code}</td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            {item.image_url ? (
                              <img src={item.image_url} alt={item.name} className="w-9 h-9 rounded-lg object-cover border border-slate-100" />
                            ) : (
                              <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                                <ImageIcon className="w-4 h-4 text-slate-400" />
                              </div>
                            )}
                            <span className="font-medium text-slate-900 text-xs">{item.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-600">{item.category}</td>
                        <td className="px-4 py-3.5 text-xs font-semibold text-slate-800">
                          {item.available_stock ?? item.stock} <span className="text-slate-400 font-normal">/ {item.stock}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`inline-flex px-2 py-0.5 text-[11px] font-semibold rounded-full ${
                              item.condition === "Baik"
                                ? "bg-emerald-50 text-emerald-700"
                                : item.condition === "Rusak Ringan"
                                ? "bg-amber-50 text-amber-700"
                                : "bg-rose-50 text-rose-700"
                            }`}
                          >
                            {item.condition}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`inline-flex px-2 py-0.5 text-[11px] font-semibold rounded-full ${
                              (item.available_stock ?? item.stock) === 0 || item.status === "Stok Kosong"
                                ? "bg-rose-50 text-rose-700 border border-rose-200"
                                : item.status === "Tersedia"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : item.status === "Dipinjam"
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : "bg-slate-100 text-slate-600 border border-slate-200"
                            }`}
                          >
                            {(item.available_stock ?? item.stock) === 0 ? "Stok Kosong" : item.status}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRowClick(item);
                              }}
                              title="Lihat Detail Barang"
                              className="p-1.5 text-slate-400 hover:text-[#0785BC] hover:bg-blue-50 rounded-lg transition-colors"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenEdit(item);
                              }}
                              title="Edit Barang"
                              className="p-1.5 text-slate-400 hover:text-[#0785BC] hover:bg-slate-100 rounded-lg transition-colors"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(item.id);
                              }}
                              title="Hapus Barang"
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
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
            /* ── Grid View Tampilan Kartu ── */
            <div className="p-5">
              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="bg-slate-50 border border-slate-200 rounded-xl p-4 animate-pulse space-y-3">
                      <div className="h-32 bg-slate-200 rounded-lg" />
                      <div className="h-4 bg-slate-200 rounded w-3/4" />
                      <div className="h-3 bg-slate-200 rounded w-1/2" />
                    </div>
                  ))}
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  Belum ada data barang. Klik tombol "Tambah Barang" untuk membuat baru.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredItems.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleRowClick(item)}
                      className="group bg-white rounded-xl border border-slate-200/90 shadow-2xs hover:border-[#0785BC]/50 hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden cursor-pointer"
                    >
                      {/* Image / Thumbnail */}
                      <div className="relative aspect-video w-full bg-slate-100 overflow-hidden flex items-center justify-center border-b border-slate-100">
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center text-slate-400">
                            <ImageIcon className="w-8 h-8 stroke-[1.5]" />
                            <span className="text-[10px] mt-1 font-medium text-slate-400">Tanpa Foto</span>
                          </div>
                        )}

                        {/* Badges on top */}
                        <div className="absolute top-2 left-2 flex items-center gap-1.5">
                          <span
                            className={`inline-flex px-2 py-0.5 text-[10px] font-bold rounded-md shadow-xs ${
                              item.condition === "Baik"
                                ? "bg-emerald-600 text-white"
                                : item.condition === "Rusak Ringan"
                                ? "bg-amber-600 text-white"
                                : "bg-rose-600 text-white"
                            }`}
                          >
                            {item.condition}
                          </span>
                        </div>

                        <div className="absolute top-2 right-2">
                          <span
                            className={`inline-flex px-2 py-0.5 text-[10px] font-bold rounded-md shadow-xs ${
                              (item.available_stock ?? item.stock) === 0 || item.status === "Stok Kosong"
                                ? "bg-rose-600 text-white"
                                : item.status === "Tersedia"
                                ? "bg-emerald-600 text-white"
                                : item.status === "Dipinjam"
                                ? "bg-amber-600 text-white"
                                : "bg-slate-700 text-white"
                            }`}
                          >
                            {(item.available_stock ?? item.stock) === 0 ? "Stok Kosong" : item.status}
                          </span>
                        </div>
                      </div>

                      {/* Card Content */}
                      <div className="p-4 flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono mb-1">
                            <span className="font-semibold text-slate-600">{item.code}</span>
                            <span className="truncate max-w-[120px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">
                              {item.category || "Umum"}
                            </span>
                          </div>
                          <h3 className="text-sm font-bold text-slate-900 line-clamp-1 group-hover:text-[#0785BC] transition-colors mt-0.5">
                            {item.name}
                          </h3>
                          {item.description && (
                            <p className="text-[11px] text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                              {item.description}
                            </p>
                          )}
                        </div>

                        {/* Card Footer */}
                        <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between">
                          <div>
                            <span className="text-[10px] text-slate-400 block font-medium">Stok Tersedia</span>
                            <span className="text-xs font-bold text-slate-800">
                              {item.available_stock ?? item.stock} <span className="text-slate-400 font-normal">/ {item.stock}</span>
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRowClick(item);
                              }}
                              title="Lihat Detail Barang"
                              className="p-1.5 text-slate-400 hover:text-[#0785BC] hover:bg-blue-50 rounded-lg transition-colors"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenEdit(item);
                              }}
                              title="Edit Barang"
                              className="p-1.5 text-slate-400 hover:text-[#0785BC] hover:bg-slate-100 rounded-lg transition-colors"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(item.id);
                              }}
                              title="Hapus Barang"
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
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

      {/* Modal Form Tambah / Edit */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[100] p-4 sm:p-6 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col border border-slate-200 my-auto animate-scale-in">
            {/* Header */}
            <div className="bg-slate-50/80 border-b border-slate-100 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#0785BC]/10 text-[#0785BC] flex items-center justify-center shadow-2xs">
                  <Boxes className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    {editingId ? "Edit Barang Inventaris" : "Tambah Barang Inventaris Baru"}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">Kelola spesifikasi aset satuan, stok, dan kondisi fisik</p>
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
                
                {/* ── SISI KIRI: Foto, Status & Kondisi (5 kolom) ── */}
                <div className="md:col-span-5 space-y-4">
                  <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/40 space-y-4">
                    <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider text-[#0785BC]">
                      1. Visual & Status Aset
                    </h3>

                    {/* Upload Foto Barang */}
                    <div>
                      <label className="block font-semibold text-slate-700 mb-2">Foto Barang</label>
                      <div className="flex items-center gap-3.5">
                        {imagePreview ? (
                          <div className="relative w-24 h-24 rounded-2xl overflow-hidden border border-slate-200 shadow-2xs shrink-0 group">
                            <img
                              src={imagePreview}
                              alt="Preview"
                              className="w-full h-full object-cover"
                            />
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
                          <p className="font-medium text-slate-600">Unggah foto fisik barang</p>
                          <p>Format: JPG, PNG, WEBP</p>
                          <p>Maksimal ukuran: 5MB</p>
                        </div>
                      </div>
                    </div>

                    {/* Status Barang */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block font-semibold text-slate-700">
                          Status Ketersediaan *
                        </label>
                        {formData.available_stock === 0 && (
                          <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                            Stok Habis
                          </span>
                        )}
                      </div>
                      <select
                        value={formData.status}
                        onChange={(e) => {
                          const newStatus = e.target.value;
                          let newAvail = formData.available_stock;
                          if (newStatus === "Stok Kosong") {
                            newAvail = 0;
                          } else if (newStatus === "Tersedia" && newAvail === 0) {
                            newAvail = formData.stock > 0 ? formData.stock : 1;
                          }
                          setFormData({ ...formData, status: newStatus, available_stock: newAvail });
                        }}
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#0785BC] text-xs font-medium text-slate-800 transition-all"
                      >
                        <option value="Tersedia">Tersedia (Siap Dipinjam)</option>
                        <option value="Stok Kosong">Stok Kosong / Habis (Tidak Bisa Dipinjam)</option>
                        <option value="Dipinjam">Dipinjam (Sedang Digunakan)</option>
                        <option value="Dalam Pemeliharaan">Dalam Pemeliharaan / Perbaikan</option>
                      </select>
                    </div>

                    {/* Kondisi Fisik */}
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1.5">
                        Kondisi Fisik Barang *
                      </label>
                      <select
                        value={formData.condition}
                        onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#0785BC] text-xs font-medium text-slate-800 transition-all"
                      >
                        <option value="Baik">Baik (Berfungsi Normal)</option>
                        <option value="Rusak Ringan">Rusak Ringan (Bisa Digunakan)</option>
                        <option value="Rusak Berat">Rusak Berat (Tidak Berfungsi)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* ── SISI KANAN: Data Spesifikasi & Stok (7 kolom) ── */}
                <div className="md:col-span-7 space-y-4">
                  <div className="p-4.5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-4">
                    <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider text-[#0785BC]">
                      2. Identitas & Spesifikasi Barang
                    </h3>

                    {/* Nama Barang */}
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Nama Barang *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#0785BC] text-xs font-medium text-slate-800 transition-all"
                        placeholder="contoh: Projector Epson EB-X51"
                      />
                    </div>

                    {/* Grid Kode & Kategori */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          Kode Inventaris *
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.code}
                          onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                          className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-white font-mono uppercase focus:outline-none focus:ring-2 focus:ring-[#0785BC] text-xs font-medium text-slate-800 transition-all"
                          placeholder="cth: PRJ-001"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          Kategori Barang *
                        </label>
                        <select
                          required
                          value={formData.category_id}
                          onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                          className={`w-full px-3.5 py-2.5 border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#0785BC] text-xs font-medium transition-all ${
                            !formData.category_id
                              ? "border-amber-300 text-slate-500 bg-amber-50/20"
                              : "border-slate-200 text-slate-800"
                          }`}
                        >
                          <option value="">-- Pilih Kategori Barang --</option>
                          {categories.map((c) => (
                            <option key={c.id} value={c.id} className="text-slate-800">
                              {c.name}
                            </option>
                          ))}
                        </select>
                        {!formData.category_id && (
                          <p className="text-[10px] text-amber-600 mt-1 font-medium">
                            * Wajib dipilih agar data barang terhubung ke kategori yang tepat
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Grid Stok: Total Stok & Stok Tersedia */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          Total Stok Gudang *
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            required
                            min="0"
                            value={formData.stock}
                            onChange={(e) => {
                              const newStock = Math.max(0, parseInt(e.target.value) || 0);
                              let newAvail = formData.available_stock;
                              if (newAvail === 0 && newStock > 0) {
                                newAvail = newStock;
                              } else if (newAvail > newStock) {
                                newAvail = newStock;
                              }
                              const autoStatus = newAvail === 0 ? "Stok Kosong" : "Tersedia";
                              setFormData({
                                ...formData,
                                stock: newStock,
                                available_stock: newAvail,
                                status: autoStatus,
                              });
                            }}
                            className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#0785BC] text-xs font-bold text-slate-800 transition-all"
                          />
                          <span className="text-xs font-medium text-slate-400">unit</span>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block font-semibold text-slate-700">
                            Stok Tersedia (Siap Pinjam) *
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              setFormData({
                                ...formData,
                                available_stock: formData.stock,
                                status: formData.stock > 0 ? "Tersedia" : "Stok Kosong",
                              });
                            }}
                            className="text-[10px] font-bold text-[#0785BC] hover:underline"
                          >
                            Set = Total Stok
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            required
                            min="0"
                            max={formData.stock}
                            value={formData.available_stock}
                            onChange={(e) => {
                              const newAvail = Math.max(0, parseInt(e.target.value) || 0);
                              const autoStatus = newAvail === 0 ? "Stok Kosong" : (formData.status === "Stok Kosong" ? "Tersedia" : formData.status);
                              setFormData({
                                ...formData,
                                available_stock: newAvail,
                                status: autoStatus,
                              });
                            }}
                            className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#0785BC] text-xs font-bold text-emerald-700 transition-all"
                          />
                          <span className="text-xs font-medium text-slate-400">unit</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Lokasi Penyimpanan
                      </label>
                      <input
                        type="text"
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#0785BC] text-xs font-medium text-slate-800 transition-all"
                        placeholder="cth: Ruang Sarpras Pusat / Lemari B"
                      />
                    </div>

                    {/* Deskripsi */}
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Deskripsi & Spesifikasi Tambahan
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={3}
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#0785BC] resize-none text-xs text-slate-700 transition-all"
                        placeholder="Spesifikasi teknis, kelengkapan bawaan, atau catatan kondisi barang..."
                      />
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
                  {editingId ? "Simpan Perubahan Barang" : "Tambah Barang"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modern Detail Modal Barang ── */}
      {showDetail && selectedItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[100] p-4 sm:p-6 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-2xl max-w-3xl w-full overflow-hidden border border-slate-200 shadow-2xl flex flex-col max-h-[90vh] my-auto animate-scale-in">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#0785BC]/10 text-[#0785BC] flex items-center justify-center shadow-2xs">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 text-base">Detail Barang Per Item</h3>
                    <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-200/70 text-slate-700">
                      {selectedItem.code}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">Spesifikasi aset, stok, dan riwayat peminjaman</p>
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
                {(richDetail?.image_url || selectedItem.image_url) ? (
                  <>
                    <img
                      src={richDetail?.image_url || selectedItem.image_url}
                      alt={selectedItem.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                  </>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-100 via-blue-50/40 to-slate-200/50 p-6 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-white/80 border border-slate-200/80 shadow-xs flex items-center justify-center text-[#0785BC] mb-2 group-hover:scale-110 transition-transform">
                      <ImageIcon className="w-7 h-7 text-slate-400" />
                    </div>
                    <p className="text-xs font-bold text-slate-600">Tidak Ada Foto Barang</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Foto aset dapat diunggah melalui formulir edit barang</p>
                  </div>
                )}

                {/* Badges on Hero */}
                <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-white/90 backdrop-blur-md text-[#0785BC] shadow-sm">
                    {selectedItem.category || "Sarana"}
                  </span>
                  <span
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold backdrop-blur-md shadow-sm ${
                      selectedItem.condition === "Baik"
                        ? "bg-emerald-500/90 text-white"
                        : selectedItem.condition === "Rusak Ringan"
                        ? "bg-amber-500/90 text-white"
                        : "bg-rose-500/90 text-white"
                    }`}
                  >
                    {selectedItem.condition}
                  </span>
                </div>

                <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
                  <div className="text-white drop-shadow-md">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-200 block">Nama Barang</span>
                    <h2 className="text-lg sm:text-xl font-black text-white leading-tight">{selectedItem.name}</h2>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-extrabold shadow-sm ${
                      selectedItem.status === "Tersedia"
                        ? "bg-emerald-500 text-white"
                        : "bg-slate-700 text-white"
                    }`}
                  >
                    {selectedItem.status || "Tersedia"}
                  </span>
                </div>
              </div>

              {/* Key Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
                  <div className="flex items-center gap-2 text-slate-400 mb-1">
                    <Boxes className="w-4 h-4 text-slate-500" />
                    <span className="text-[11px] font-semibold uppercase tracking-wider">Total Stok</span>
                  </div>
                  <p className="text-base font-extrabold text-slate-800">{selectedItem.stock} <span className="text-xs font-normal text-slate-500">unit</span></p>
                </div>

                <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-100 flex flex-col justify-between">
                  <div className="flex items-center gap-2 text-emerald-600 mb-1">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="text-[11px] font-semibold uppercase tracking-wider">Tersedia</span>
                  </div>
                  <p className="text-base font-extrabold text-emerald-700">
                    {selectedItem.available_stock ?? selectedItem.stock} <span className="text-xs font-normal text-emerald-600">unit</span>
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-100 flex flex-col justify-between">
                  <div className="flex items-center gap-2 text-blue-600 mb-1">
                    <Clock className="w-4 h-4" />
                    <span className="text-[11px] font-semibold uppercase tracking-wider">Dipinjam</span>
                  </div>
                  <p className="text-base font-extrabold text-blue-700">
                    {richDetail?.statistics?.total_borrowings !== undefined
                      ? `${richDetail.statistics.total_borrowings} kali`
                      : `${Math.max(0, selectedItem.stock - (selectedItem.available_stock ?? selectedItem.stock))} unit`}
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
                  <div className="flex items-center gap-2 text-slate-400 mb-1">
                    <Tag className="w-4 h-4 text-[#0785BC]" />
                    <span className="text-[11px] font-semibold uppercase tracking-wider">Status</span>
                  </div>
                  <div className="mt-0.5">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold ${
                        selectedItem.status === "Tersedia"
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                          : selectedItem.status === "Dipinjam"
                          ? "bg-amber-100 text-amber-800 border border-amber-200"
                          : "bg-slate-200 text-slate-700 border border-slate-300"
                      }`}
                    >
                      {selectedItem.status || "Tersedia"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Detail Navigation Tabs */}
              <div className="border-b border-slate-100 flex gap-2">
                <button
                  type="button"
                  onClick={() => setActiveDetailTab("info")}
                  className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
                    activeDetailTab === "info"
                      ? "border-[#0785BC] text-[#0785BC]"
                      : "border-transparent text-slate-400 hover:text-slate-600"
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  Informasi Lengkap
                </button>
                <button
                  type="button"
                  onClick={() => setActiveDetailTab("history")}
                  className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
                    activeDetailTab === "history"
                      ? "border-[#0785BC] text-[#0785BC]"
                      : "border-transparent text-slate-400 hover:text-slate-600"
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  Riwayat User
                  {richDetail?.recent_borrowings && richDetail.recent_borrowings.length > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-100 text-blue-700 font-bold">
                      {richDetail.recent_borrowings.length}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveDetailTab("packages")}
                  className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
                    activeDetailTab === "packages"
                      ? "border-[#0785BC] text-[#0785BC]"
                      : "border-transparent text-slate-400 hover:text-slate-600"
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  Paket Terkait
                  {richDetail?.in_packages && richDetail.in_packages.length > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-100 text-blue-700 font-bold">
                      {richDetail.in_packages.length}
                    </span>
                  )}
                </button>
              </div>

              {/* Tab 1: Info */}
              {activeDetailTab === "info" && (
                <div className="space-y-4 animate-fade-in">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl border border-slate-100 bg-slate-50/40">
                    <div>
                      <p className="text-[11px] font-semibold text-slate-400">Kode Inventaris</p>
                      <p className="text-xs font-mono font-bold text-slate-800 mt-0.5">{selectedItem.code}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-slate-400">Kategori Barang</p>
                      <p className="text-xs font-bold text-slate-800 mt-0.5">{selectedItem.category || "-"}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-slate-400">Kondisi Fisik</p>
                      <p className="text-xs font-bold text-slate-800 mt-0.5">{selectedItem.condition}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-slate-400">Status Operasional</p>
                      <p className="text-xs font-bold text-slate-800 mt-0.5">{selectedItem.status || "Tersedia"}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-slate-400">Total Unit Terdaftar</p>
                      <p className="text-xs font-bold text-slate-800 mt-0.5">{selectedItem.stock} unit</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-slate-400">Rasio Ketersediaan</p>
                      <p className="text-xs font-bold text-emerald-600 mt-0.5">
                        {selectedItem.available_stock ?? selectedItem.stock} dari {selectedItem.stock} unit siap pinjam
                      </p>
                    </div>
                  </div>

                  {/* Deskripsi */}
                  <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/40">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Deskripsi & Catatan Aset</p>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {selectedItem.description || "Tidak ada deskripsi rinci untuk barang ini."}
                    </p>
                  </div>
                </div>
              )}

              {/* Tab 2: Riwayat Peminjaman User */}
              {activeDetailTab === "history" && (
                <div className="space-y-3 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-700">Riwayat Peminjaman oleh Mahasiswa / User</p>
                    {detailLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0785BC]" />}
                  </div>

                  {richDetail?.recent_borrowings && richDetail.recent_borrowings.length > 0 ? (
                    <div className="border border-slate-100 rounded-2xl divide-y divide-slate-100 bg-slate-50/30 overflow-hidden">
                      {richDetail.recent_borrowings.map((rb, idx) => (
                        <div key={rb.id || idx} className="p-3.5 flex items-center justify-between gap-3 text-xs">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-100 text-[#0785BC] flex items-center justify-center font-bold text-xs shrink-0">
                              {(rb.borrowings?.users?.name || (rb as any).borrowings?.user?.name || (rb as any).user?.name || "U")[0]?.toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-slate-800">
                                {rb.borrowings?.users?.name || (rb as any).borrowings?.user?.name || (rb as any).user?.name || "User Peminjam"}
                              </p>
                              <p className="text-[11px] text-slate-400">
                                {rb.borrowings?.users?.email || (rb as any).borrowings?.user?.email || (rb as any).user?.email || "-"}
                              </p>
                              <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                                <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200">
                                  {rb.borrowings?.borrow_code || "-"}
                                </span>
                                <span>• {rb.borrowings?.borrow_date ? new Date(rb.borrowings.borrow_date).toLocaleDateString("id-ID") : "-"}</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                              {rb.borrowings?.status || "Dipinjam"}
                            </span>
                            <p className="text-[11px] font-bold text-slate-700 mt-1">{rb.quantity} unit</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-100">
                      <User className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs font-bold text-slate-600">Belum Ada Riwayat Peminjaman</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Barang ini belum pernah diajukan pinjam oleh mahasiswa atau staf.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: Paket Bundling */}
              {activeDetailTab === "packages" && (
                <div className="space-y-3 animate-fade-in">
                  <p className="text-xs font-bold text-slate-700">Paket Bundling yang Memuat Barang Ini</p>

                  {richDetail?.in_packages && richDetail.in_packages.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {richDetail.in_packages.map((pkg, idx) => (
                        <div key={pkg.package_id || idx} className="p-3.5 rounded-2xl border border-slate-100 bg-slate-50/50 flex items-start gap-3">
                          <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#0785BC] flex items-center justify-center shrink-0">
                            <Layers className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-xs text-slate-800 truncate">{pkg.package_name}</p>
                            <p className="text-[11px] text-slate-500 mt-0.5">Termasuk: <span className="font-bold text-[#0785BC]">{pkg.quantity_in_package} unit</span></p>
                            <span className="inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600">
                              Status: {pkg.package_status || "Aktif"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-100">
                      <Layers className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs font-bold text-slate-600">Tidak Tergabung dalam Paket</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Barang ini belum dimasukkan ke dalam bundel paket manapun.</p>
                    </div>
                  )}
                </div>
              )}
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
              <button
                type="button"
                onClick={() => {
                  setShowDetail(false);
                  handleOpenEdit(selectedItem);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0785BC] text-white text-xs font-bold rounded-xl hover:bg-[#0672a0] transition-colors shadow-2xs"
              >
                <Edit className="w-3.5 h-3.5" />
                Edit Barang
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Export Inventaris Barang ── */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="Ekspor Data Inventaris Barang"
        description="Unduh berkas inventaris aset sarpras berdasarkan rentang waktu."
        moduleName="Inventaris_Barang"
        filenamePrefix="SARPRAS_Inventaris_Barang"
        data={items}
        dateFieldGetter={(i) => (i as any).created_at}
        dataRowMapper={(i) => ({
          "Kode Barang": i.code,
          "Nama Barang": i.name,
          Kategori: i.category || "-",
          "Total Stok": i.stock,
          "Stok Tersedia": i.available_stock ?? i.stock,
          Kondisi: i.condition,
          Status: i.status || "Tersedia",
          Lokasi: i.location || "-",
          Deskripsi: i.description || "-",
        })}
      />
    </AdminLayout>
  );
}
