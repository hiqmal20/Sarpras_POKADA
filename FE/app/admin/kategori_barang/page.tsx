"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  Laptop,
  Wrench,
  Camera,
  Pencil,
  Trash2,
  X,
  Boxes,
  Layers,
  LayoutGrid,
  List,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  FolderPlus,
  Headphones,
  Trophy,
  FlaskConical,
  Armchair,
  Package,
  SlidersHorizontal,
  FolderKanban,
  Check,
} from "lucide-react";
import api from "@/lib/api";
import { AdminLayout } from "@/components/admin";
import { toast } from "@/components/Toast";
import { useLanguage } from "@/lib/i18n";

interface Category {
  id: string;
  name: string;
  description: string;
  item_count?: number;
}

function getCategoryMeta(name: string) {
  const lower = (name || "").toLowerCase();
  if (
    lower.includes("elektronik") ||
    lower.includes("komputer") ||
    lower.includes("it") ||
    lower.includes("laptop") ||
    lower.includes("gadget")
  ) {
    return {
      icon: Laptop,
      bg: "bg-blue-50/80 text-[#0785BC] border-blue-100",
      iconBg: "bg-[#0785BC] text-white shadow-xs shadow-[#0785BC]/30",
      badgeBg: "bg-blue-50 text-[#0785BC] border-blue-200",
      barBg: "bg-[#0785BC]",
      tag: "Teknologi & Komputasi",
    };
  }
  if (
    lower.includes("alat") ||
    lower.includes("kerja") ||
    lower.includes("bengkel") ||
    lower.includes("perkakas") ||
    lower.includes("teknik")
  ) {
    return {
      icon: Wrench,
      bg: "bg-amber-50/80 text-amber-700 border-amber-100",
      iconBg: "bg-amber-500 text-white shadow-xs shadow-amber-500/30",
      badgeBg: "bg-amber-50 text-amber-700 border-amber-200",
      barBg: "bg-amber-500",
      tag: "Perkakas & Utilitas",
    };
  }
  if (
    lower.includes("foto") ||
    lower.includes("kamera") ||
    lower.includes("video") ||
    lower.includes("multimedia") ||
    lower.includes("lensa")
  ) {
    return {
      icon: Camera,
      bg: "bg-purple-50/80 text-purple-700 border-purple-100",
      iconBg: "bg-purple-600 text-white shadow-xs shadow-purple-600/30",
      badgeBg: "bg-purple-50 text-purple-700 border-purple-200",
      barBg: "bg-purple-600",
      tag: "Multimedia & Studio",
    };
  }
  if (
    lower.includes("audio") ||
    lower.includes("sound") ||
    lower.includes("musik") ||
    lower.includes("mic")
  ) {
    return {
      icon: Headphones,
      bg: "bg-rose-50/80 text-rose-700 border-rose-100",
      iconBg: "bg-rose-500 text-white shadow-xs shadow-rose-500/30",
      badgeBg: "bg-rose-50 text-rose-700 border-rose-200",
      barBg: "bg-rose-500",
      tag: "Audio & Suara",
    };
  }
  if (
    lower.includes("olahraga") ||
    lower.includes("sport") ||
    lower.includes("senam") ||
    lower.includes("lapangan")
  ) {
    return {
      icon: Trophy,
      bg: "bg-emerald-50/80 text-emerald-700 border-emerald-100",
      iconBg: "bg-emerald-600 text-white shadow-xs shadow-emerald-600/30",
      badgeBg: "bg-emerald-50 text-emerald-700 border-emerald-200",
      barBg: "bg-emerald-600",
      tag: "Fasilitas Olahraga",
    };
  }
  if (
    lower.includes("lab") ||
    lower.includes("kimia") ||
    lower.includes("medis") ||
    lower.includes("kesehatan") ||
    lower.includes("sains")
  ) {
    return {
      icon: FlaskConical,
      bg: "bg-teal-50/80 text-teal-700 border-teal-100",
      iconBg: "bg-teal-600 text-white shadow-xs shadow-teal-600/30",
      badgeBg: "bg-teal-50 text-teal-700 border-teal-200",
      barBg: "bg-teal-600",
      tag: "Praktikum & Laboratorium",
    };
  }
  if (
    lower.includes("furnitur") ||
    lower.includes("mebel") ||
    lower.includes("kursi") ||
    lower.includes("meja") ||
    lower.includes("lemari")
  ) {
    return {
      icon: Armchair,
      bg: "bg-indigo-50/80 text-indigo-700 border-indigo-100",
      iconBg: "bg-indigo-600 text-white shadow-xs shadow-indigo-600/30",
      badgeBg: "bg-indigo-50 text-indigo-700 border-indigo-200",
      barBg: "bg-indigo-600",
      tag: "Perabot & Ruangan",
    };
  }
  return {
    icon: Boxes,
    bg: "bg-slate-50/80 text-slate-700 border-slate-100",
    iconBg: "bg-slate-700 text-white shadow-xs shadow-slate-700/30",
    badgeBg: "bg-slate-50 text-slate-700 border-slate-200",
    barBg: "bg-slate-700",
    tag: "Inventaris Umum",
  };
}

const QUICK_SUGGESTIONS = [
  "Elektronik & IT",
  "Multimedia & Fotografi",
  "Alat Kerja & Teknik",
  "Audio & Sound System",
  "Laboratorium & Riset",
  "Perabot & Ruangan",
  "Olahraga & Rekreasi",
];

// ── Modal Tambah / Edit ──
function CategoryModal({
  initial,
  onClose,
  onSave,
}: {
  initial?: Category;
  onClose: () => void;
  onSave: (data: { name: string; description: string }) => Promise<void>;
}) {
  const { t } = useLanguage();
  const [name, setName] = useState(initial?.name || "");
  const [desc, setDesc] = useState(initial?.description || "");
  const [saving, setSaving] = useState(false);

  const previewMeta = getCategoryMeta(name || "Default");
  const PreviewIcon = previewMeta.icon;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    await onSave({ name: name.trim(), description: desc.trim() });
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 sm:p-7 my-auto border border-slate-200 animate-scale-in">
        <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0785BC]/10 text-[#0785BC] flex items-center justify-center">
              <FolderPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {initial ? t("admin.cat.modal_edit", "Perbarui Kategori") : t("admin.cat.modal_create", "Buat Kategori Baru")}
              </h2>
              <p className="text-xs text-slate-500">
                {t("admin.cat.modal_sub", "Atur klasifikasi untuk memudahkan inventarisasi sarpras")}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live Preview Card */}
        <div className="mb-5 p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${previewMeta.iconBg}`}>
            <PreviewIcon className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-xs font-bold text-slate-900 truncate">
                {name || "Nama Kategori Preview"}
              </p>
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium border ${previewMeta.badgeBg}`}>
                {previewMeta.tag}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 truncate mt-0.5">
              {desc || "Deskripsi ringkas kategori akan tampil di sini..."}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
              {t("admin.cat.field_name", "Nama Kategori")} <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="contoh: Elektronik & Komputer"
              required
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0785BC]/30 focus:border-[#0785BC] transition-all"
            />
          </div>

          {/* Quick Suggestions Chips */}
          {!initial && (
            <div>
              <span className="text-[11px] font-medium text-slate-400 mb-1.5 block">
                Pilih rekomendasi nama cepat:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_SUGGESTIONS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setName(item)}
                    className="px-2 py-1 text-[11px] rounded-lg bg-slate-100 hover:bg-slate-200/80 text-slate-600 transition-colors cursor-pointer"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
              {t("admin.cat.field_desc", "Deskripsi / Ruang Lingkup")}
            </label>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Jelaskan jenis atau spesifikasi barang yang masuk ke dalam kategori ini..."
              rows={3}
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0785BC]/30 focus:border-[#0785BC] resize-none transition-all"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 text-xs sm:text-sm font-semibold border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 active:scale-95 transition-all cursor-pointer"
            >
              {t("common.cancel", "Batal")}
            </button>
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="flex-1 py-2.5 text-xs sm:text-sm font-semibold text-white bg-[#0785BC] hover:bg-[#0672a0] active:scale-95 rounded-xl transition-all shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {saving ? t("common.loading", "Menyimpan...") : initial ? t("common.save", "Simpan Perubahan") : t("admin.cat.add_btn", "Buat Kategori")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Delete Confirmation Modal ──
function DeleteConfirmModal({
  category,
  onClose,
  onConfirm,
}: {
  category: Category;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [deleting, setDeleting] = useState(false);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 border border-slate-200 animate-scale-in">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4 mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <div className="text-center mb-5">
          <h3 className="text-base font-bold text-slate-900">Hapus Kategori?</h3>
          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
            Anda akan menghapus kategori{" "}
            <span className="font-semibold text-slate-800">&quot;{category.name}&quot;</span>.
            {category.item_count && category.item_count > 0 ? (
              <span className="block mt-1 text-rose-600 font-medium">
                Peringatan: Kategori ini masih memiliki {category.item_count} unit barang terkait!
              </span>
            ) : (
              <span className="block mt-1 text-slate-400">
                Tindakan ini tidak dapat dibatalkan.
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 text-xs font-semibold border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 active:scale-95 transition-all"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={deleting}
            onClick={async () => {
              setDeleting(true);
              await onConfirm();
              setDeleting(false);
            }}
            className="flex-1 py-2.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 active:scale-95 rounded-xl transition-all shadow-xs disabled:opacity-50"
          >
            {deleting ? "Menghapus..." : "Ya, Hapus"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page Component ──
export default function KategoriBarangPage() {
  const { t, lang } = useLanguage();
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"name_asc" | "name_desc" | "items_desc" | "items_asc">("items_desc");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ open: boolean; item?: Category }>({ open: false });
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);

  useEffect(() => {
    async function fetchCategories() {
      setLoading(true);
      try {
        const [catRes, itemsRes] = await Promise.all([
          api.categories.getAll(),
          api.items.getAll({ limit: 500 }),
        ]);

        const allItems = itemsRes.status === "success" && Array.isArray(itemsRes.data) ? itemsRes.data : [];

        if (catRes.status === "success" && Array.isArray(catRes.data)) {
          const enriched: Category[] = (catRes.data as any[]).map((c) => ({
            id: c.id,
            name: c.name,
            description: c.description || "",
            item_count: allItems.filter((i: any) => i.category_id === c.id || i.category === c.name).length,
          }));
          setCategories(enriched);
        } else {
          setCategories([]);
        }
      } catch (err) {
        console.warn("Gagal memuat kategori:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchCategories();
  }, []);

  // Summary Metrics
  const stats = useMemo(() => {
    const totalCategories = categories.length;
    const totalItems = categories.reduce((sum, c) => sum + (c.item_count || 0), 0);
    const sortedByItems = [...categories].sort((a, b) => (b.item_count || 0) - (a.item_count || 0));
    const topCategory = sortedByItems[0] || null;
    const emptyCategories = categories.filter((c) => !c.item_count || c.item_count === 0).length;

    return {
      totalCategories,
      totalItems,
      topCategory,
      emptyCategories,
    };
  }, [categories]);

  // Filtered & Sorted Categories
  const filtered = useMemo(() => {
    const list = categories.filter((c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.description.toLowerCase().includes(search.toLowerCase())
    );

    list.sort((a, b) => {
      if (sortBy === "name_asc") return a.name.localeCompare(b.name);
      if (sortBy === "name_desc") return b.name.localeCompare(a.name);
      if (sortBy === "items_desc") return (b.item_count || 0) - (a.item_count || 0);
      if (sortBy === "items_asc") return (a.item_count || 0) - (b.item_count || 0);
      return 0;
    });

    return list;
  }, [categories, search, sortBy]);

  async function handleSave(data: { name: string; description: string }) {
    if (!data.name.trim()) {
      toast.warning("Nama kategori wajib diisi.", "Validasi Input");
      return;
    }

    if (modal.item) {
      const res = await api.categories.update(modal.item.id, data);
      if (res.status === "success") {
        toast.success(`Kategori "${data.name}" berhasil diperbarui!`, "Berhasil Disimpan");
        setCategories((prev) =>
          prev.map((c) => (c.id === modal.item!.id ? { ...c, ...data } : c))
        );
      } else {
        toast.error(res.message || "Gagal memperbarui data kategori.", "Pembaruan Gagal");
      }
    } else {
      const res = await api.categories.create(data);
      if (res.status === "success" && res.data) {
        toast.success(`Kategori "${data.name}" berhasil ditambahkan!`, "Berhasil Dibuat");
        setCategories((prev) => [
          ...prev,
          { ...(res.data as Category), item_count: 0 },
        ]);
      } else {
        toast.error(res.message || "Gagal menambahkan kategori.", "Pembuatan Gagal");
      }
    }
    setModal({ open: false });
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    try {
      const res = await api.categories.delete(deleteTarget.id);
      if (res.status === "success") {
        toast.success(`Kategori "${deleteTarget.name}" berhasil dihapus.`, "Berhasil Dihapus");
        setCategories((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      } else {
        toast.error(res.message || "Gagal menghapus kategori.", "Relasi Kategori Terikat");
      }
    } catch (err: any) {
      toast.error(err.message || "Kategori tidak dapat dihapus karena masih digunakan oleh barang aktif.", "Relasi Kategori Terikat");
    } finally {
      setDeleteTarget(null);
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-6 pb-12">
        {/* ── Page Header & Action Banner ── */}
        <div className="relative overflow-hidden rounded-2xl bg-white border border-slate-200/90 shadow-2xs p-5 sm:p-6">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-gradient-to-br from-[#0785BC]/10 to-transparent rounded-full blur-2xl pointer-events-none" />

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
            <div>
              <div className="flex items-center gap-2.5 mb-1.5">
                <div className="w-8 h-8 rounded-lg bg-[#0785BC]/10 text-[#0785BC] flex items-center justify-center">
                  <FolderKanban className="w-4 h-4" />
                </div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  {t("admin.cat.title", "Kategori Inventaris")}
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-blue-50 text-[#0785BC] border border-blue-200/60">
                  {categories.length} {t("admin.nav.categories", "Kategori").toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-slate-500 max-w-xl leading-relaxed">
                {t("admin.cat.sub", "Kelola taksonomi dan klasifikasi fasilitas kampus. Kategori digunakan untuk pengelompokan unit, filter peminjaman, dan penentuan paket barang.")}
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <Link
                href="/admin/barang"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all active:scale-95 cursor-pointer"
              >
                <Boxes className="w-3.5 h-3.5 text-slate-500" />
                {t("admin.cat.items_list", "Daftar Barang")}
              </Link>
              <button
                type="button"
                onClick={() => setModal({ open: true })}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#0785BC] hover:bg-[#0672a0] active:scale-95 rounded-xl transition-all shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                {t("admin.cat.add_btn", "Tambah Kategori")}
              </button>
            </div>
          </div>
        </div>

        {/* ── Summary KPI Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
          {/* Card 1: Total Kategori */}
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-4 flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-[#0785BC] flex items-center justify-center shrink-0 border border-blue-100">
              <Layers className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">{t("admin.cat.kpi_total", "Total Kategori")}</p>
              <h3 className="text-lg font-bold font-mono text-slate-900 mt-0.5">
                {loading ? "..." : stats.totalCategories}
              </h3>
              <p className="text-[10px] text-slate-500 truncate">{t("admin.cat.title", "Klasifikasi inventaris aktif")}</p>
            </div>
          </div>

          {/* Card 2: Total Unit Terdata */}
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-4 flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
              <Boxes className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">{t("admin.cat.kpi_units", "Unit Terdistribusi")}</p>
              <h3 className="text-lg font-bold font-mono text-slate-900 mt-0.5">
                {loading ? "..." : stats.totalItems}
              </h3>
              <p className="text-[10px] text-slate-500 truncate">{t("admin.items.registered_items", "Total unit barang terdaftar")}</p>
            </div>
          </div>

          {/* Card 3: Kategori Dominan */}
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-4 flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">{t("admin.cat.kpi_top", "Kategori Terbanyak")}</p>
              <h3 className="text-xs font-bold text-slate-900 truncate mt-0.5">
                {loading ? "..." : stats.topCategory?.name || "-"}
              </h3>
              <p className="text-[10px] font-mono text-purple-700 truncate font-semibold">
                {stats.topCategory?.item_count ?? 0} {t("admin.items.units", "Unit Barang")}
              </p>
            </div>
          </div>

          {/* Card 4: Kategori Tanpa Item */}
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-4 flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">{t("admin.cat.kpi_empty", "Kategori Kosong")}</p>
              <h3 className="text-lg font-bold font-mono text-slate-900 mt-0.5">
                {loading ? "..." : stats.emptyCategories}
              </h3>
              <p className="text-[10px] text-slate-500 truncate">{t("admin.cat.kpi_empty", "Belum memiliki unit barang")}</p>
            </div>
          </div>
        </div>

        {/* ── Filter Bar & View Toggle ── */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder={t("admin.cat.search_ph", "Cari nama atau deskripsi...")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0785BC]/20 focus:border-[#0785BC] transition-all"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-2.5">
            {/* Sort Dropdown */}
            <div className="flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400 hidden sm:inline" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-2.5 py-1.5 text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0785BC]/20 cursor-pointer"
              >
                <option value="items_desc">{t("admin.cat.sort_most", "Unit Terbanyak")}</option>
                <option value="items_asc">{t("admin.cat.sort_least", "Unit Paling Sedikit")}</option>
                <option value="name_asc">{t("admin.cat.sort_name_az", "Nama (A - Z)")}</option>
                <option value="name_desc">{t("admin.cat.sort_name_za", "Nama (Z - A)")}</option>
              </select>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200/80">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                title="Tampilan Kartu (Grid)"
                className={`p-1.5 rounded-md transition-all ${
                  viewMode === "grid"
                    ? "bg-white text-[#0785BC] shadow-2xs font-bold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                title="Tampilan Tabel (List)"
                className={`p-1.5 rounded-md transition-all ${
                  viewMode === "table"
                    ? "bg-white text-[#0785BC] shadow-2xs font-bold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* ── Content View (Grid vs Table) ── */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-slate-200/80 p-5 space-y-3.5 animate-pulse"
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-slate-100" />
                  <div className="w-16 h-5 rounded-full bg-slate-100" />
                </div>
                <div className="h-4 bg-slate-100 rounded w-2/3" />
                <div className="h-3 bg-slate-100 rounded w-full" />
                <div className="h-3 bg-slate-100 rounded w-4/5" />
                <div className="pt-3 border-t border-slate-100 flex justify-between">
                  <div className="h-4 bg-slate-100 rounded w-1/3" />
                  <div className="h-4 bg-slate-100 rounded w-1/4" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/90 p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <Boxes className="w-7 h-7" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">
              {search ? "Kategori tidak ditemukan" : "Belum ada kategori"}
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {search
                ? `Tidak ada kategori yang sesuai dengan kata kunci "${search}".`
                : "Mulai tambahkan kategori pertama Anda untuk mengelompokkan sarana dan prasarana kampus."}
            </p>
            {search ? (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="mt-4 px-3 py-1.5 text-xs font-semibold text-[#0785BC] bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
              >
                Reset Pencarian
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setModal({ open: true })}
                className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-[#0785BC] rounded-xl hover:bg-[#0672a0] transition-colors"
              >
                Tambah Kategori Sekarang
              </button>
            )}
          </div>
        ) : viewMode === "grid" ? (
          /* ── GRID CARD VIEW ── */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {filtered.map((cat, idx) => {
              const meta = getCategoryMeta(cat.name);
              const Icon = meta.icon;
              const count = cat.item_count || 0;
              const percent = stats.totalItems > 0 ? Math.round((count / stats.totalItems) * 100) : 0;

              return (
                <div
                  key={cat.id}
                  className="group bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-slate-300 transition-all duration-200 flex flex-col p-5 relative overflow-hidden"
                >
                  {/* Category Accent Stripe Top */}
                  <div
                    className={`absolute top-0 left-0 right-0 h-1 ${meta.barBg} opacity-80 group-hover:opacity-100 transition-opacity`}
                  />

                  {/* Header: Icon + Category Tag + Actions */}
                  <div className="flex items-start justify-between gap-2 mb-3.5">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-11 h-11 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 duration-200 ${meta.iconBg}`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${meta.badgeBg}`}>
                          {meta.tag}
                        </span>
                        <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                          KODE: KAT-{String(idx + 1).padStart(2, "0")}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => setModal({ open: true, item: cat })}
                        title="Edit Kategori"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(cat)}
                        title="Hapus Kategori"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Title & Description */}
                  <div className="mb-4">
                    <Link
                      href={`/admin/barang?category_id=${encodeURIComponent(cat.id)}&kategori=${encodeURIComponent(cat.name)}`}
                      className="text-sm font-bold text-slate-900 group-hover:text-[#0785BC] transition-colors leading-snug inline-block"
                      title={`Lihat Barang Kategori ${cat.name}`}
                    >
                      {cat.name}
                    </Link>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed line-clamp-2 min-h-[2rem]">
                      {cat.description || "Tidak ada deskripsi rinci untuk kategori ini."}
                    </p>
                  </div>

                  {/* Inventory Distribution Bar */}
                  <div className="mt-auto pt-3.5 border-t border-slate-100/90 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[11px] text-slate-500 font-medium">Unit Terdaftar</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold font-mono text-slate-900">{count}</span>
                        <span className="text-[10px] text-slate-400">({percent}%)</span>
                      </div>
                    </div>

                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${meta.barBg}`}
                        style={{ width: `${Math.max(percent, count > 0 ? 6 : 0)}%` }}
                      />
                    </div>

                    {/* Bottom Link to Inventory */}
                    <div className="pt-2 flex justify-end">
                      <Link
                        href={`/admin/barang?category_id=${encodeURIComponent(cat.id)}&kategori=${encodeURIComponent(cat.name)}`}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0785BC] hover:text-[#0672a0] group/link"
                      >
                        {t("admin.cat.view_items", "Lihat Barang")}
                        <ArrowRight className="w-3 h-3 group-hover/link:translate-x-0.5 transition-transform" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ── TABLE / LIST VIEW ── */
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-mono text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4 font-semibold">{t("admin.cat.th_category", "Kategori")}</th>
                    <th className="py-3.5 px-4 font-semibold">{t("admin.cat.th_group", "Kelompok")}</th>
                    <th className="py-3.5 px-4 font-semibold text-center">{t("admin.cat.th_registered_units", "Unit Terdaftar")}</th>
                    <th className="py-3.5 px-4 font-semibold">{t("admin.cat.th_share", "Porsi Inventaris")}</th>
                    <th className="py-3.5 px-4 font-semibold text-right">{t("admin.items.th_action", "Aksi")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((cat, idx) => {
                    const meta = getCategoryMeta(cat.name);
                    const Icon = meta.icon;
                    const count = cat.item_count || 0;
                    const percent = stats.totalItems > 0 ? Math.round((count / stats.totalItems) * 100) : 0;

                    return (
                      <tr
                        key={cat.id}
                        className="hover:bg-slate-50/60 transition-colors group"
                      >
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${meta.iconBg}`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div>
                              <Link
                                href={`/admin/barang?category_id=${encodeURIComponent(cat.id)}&kategori=${encodeURIComponent(cat.name)}`}
                                className="font-bold text-slate-900 hover:text-[#0785BC] transition-colors inline-block"
                                title={`Lihat Barang Kategori ${cat.name}`}
                              >
                                {cat.name}
                              </Link>
                              <p className="text-[11px] text-slate-400 line-clamp-1 max-w-xs mt-0.5">
                                {cat.description || "-"}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${meta.badgeBg}`}>
                            {meta.tag}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 font-mono font-bold text-xs">
                            {count}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="w-36">
                            <div className="flex justify-between text-[10px] text-slate-500 mb-1 font-mono">
                              <span>{percent}%</span>
                              <span>dari {stats.totalItems} unit</span>
                            </div>
                            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${meta.barBg}`}
                                style={{ width: `${Math.max(percent, count > 0 ? 6 : 0)}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Link
                              href={`/admin/barang?category_id=${encodeURIComponent(cat.id)}&kategori=${encodeURIComponent(cat.name)}`}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-[#0785BC] hover:bg-blue-50 transition-colors"
                              title={`Lihat Daftar Barang ${cat.name}`}
                            >
                              <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                            <button
                              type="button"
                              onClick={() => setModal({ open: true, item: cat })}
                              title="Edit Kategori"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(cat)}
                              title="Hapus Kategori"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ── Modal Create / Edit ── */}
      {modal.open && (
        <CategoryModal
          initial={modal.item}
          onClose={() => setModal({ open: false })}
          onSave={handleSave}
        />
      )}

      {/* ── Modal Confirm Delete ── */}
      {deleteTarget && (
        <DeleteConfirmModal
          category={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDeleteConfirm}
        />
      )}
    </AdminLayout>
  );
}
