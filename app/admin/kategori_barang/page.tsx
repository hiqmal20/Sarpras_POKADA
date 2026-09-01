"use client";

import { useState, useEffect } from "react";
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
  Plus,
  Search,
  Laptop,
  Wrench,
  Camera,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import api from "@/lib/api";

// ── Sidebar (same nav as dashboard) ──
const navItems = [
  { href: "/admin/dashboard_admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/manajemen_peminjaman", label: "Peminjaman", icon: BookOpen },
  { href: "/admin/pengembalian", label: "Pengembalian", icon: RotateCcw },
  { href: "/admin/manajemen_user", label: "Manage User", icon: Users },
  { href: "/admin/rekap_laporan", label: "Laporan Kerusakan", icon: AlertTriangle },
  { href: "/admin/kategori_barang", label: "Kategori Barang", icon: Tag },
];

// Icon & color per kategori (fallback ke Tag)
const iconMap: Record<string, { icon: React.ElementType; bg: string; color: string }> = {
  Elektronik:  { icon: Laptop,  bg: "bg-blue-500",   color: "text-white" },
  "Alat Kerja":{ icon: Wrench,  bg: "bg-teal-400",   color: "text-white" },
  Fotografi:   { icon: Camera,  bg: "bg-emerald-600", color: "text-white" },
  default:     { icon: Tag,     bg: "bg-slate-400",   color: "text-white" },
};

interface Category {
  id: string;
  name: string;
  description: string;
  item_count?: number;
}

// ── useMount: trigger enter animations after hydration ──
function useMount() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  return mounted;
}

// ── Modal Tambah / Edit ──
function CategoryModal({  initial,
  onClose,
  onSave,
}: {
  initial?: Category;
  onClose: () => void;
  onSave: (data: { name: string; description: string }) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [desc, setDesc] = useState(initial?.description ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    await onSave({ name: name.trim(), description: desc.trim() });
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6 animate-scale-in">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-slate-900">
            {initial ? "Edit Kategori" : "Tambah Kategori"}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
              Nama Kategori
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="contoh: Elektronik"
              required
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0785BC] transition-all"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
              Deskripsi
            </label>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Deskripsi singkat kategori..."
              rows={3}
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0785BC] resize-none transition-all"
            />
          </div>
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 text-sm font-semibold border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 active:scale-95 transition-all"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 text-sm font-semibold text-white bg-[#0785BC] hover:bg-[#0672a0] active:scale-95 rounded-xl transition-all disabled:opacity-60"
            >
              {saving ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Kategori Card ──
function KategoriCard({
  cat,
  onEdit,
  onDelete,
}: {
  cat: Category;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const meta = iconMap[cat.name] ?? iconMap.default;
  const Icon = meta.icon;

  return (
    <div className="group bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col gap-4 hover:shadow-lg hover:-translate-y-1 transition-all duration-200">
      {/* Icon + Actions */}
      <div className="flex items-start justify-between">
        <div className={`w-11 h-11 rounded-xl ${meta.bg} flex items-center justify-center transition-transform duration-200 hover:scale-110`}>
          <Icon className={`w-5 h-5 ${meta.color}`} />
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onEdit}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-[#0785BC] active:scale-90 transition-all"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 active:scale-90 transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Name + Desc */}
      <div>
        <h3 className="text-base font-bold text-slate-900">{cat.name}</h3>
        <p className="text-sm text-slate-500 mt-1 leading-relaxed line-clamp-3">
          {cat.description || "Belum ada deskripsi."}
        </p>
      </div>

      {/* Total Barang */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
        <span className="text-sm text-slate-500">Total Barang</span>
        <span className="text-xl font-bold text-[#0785BC]">
          {cat.item_count ?? 0}
        </span>
      </div>
    </div>
  );
}

// ── Page ──
export default function KategoriBarangPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ open: boolean; item?: Category }>({ open: false });
  const mounted = useMount();

  // Fallback data jika API kosong
  const fallback: Category[] = [
    { id: "1", name: "Elektronik",   description: "Laptop, Monitor, Proyektor, dan perangkat komputasi lainnya.", item_count: 142 },
    { id: "2", name: "Alat Kerja",   description: "Perkakas, alat ukur, dan perlengkapan teknis lapangan.",       item_count: 85  },
    { id: "3", name: "Fotografi",    description: "Kamera DSLR, lensa, tripod, dan perlengkapan studio lighting.",item_count: 34  },
  ];

  useEffect(() => {
    async function fetch() {
      setLoading(true);
      const res = await api.categories.getAll();
      if (res.status === "success" && res.data && res.data.length > 0) {
        setCategories(res.data as Category[]);
      } else {
        setCategories(fallback);
      }
      setLoading(false);
    }
    fetch();
  }, []);

  const filtered = categories.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  async function handleSave(data: { name: string; description: string }) {
    if (modal.item) {
      // Edit
      const res = await api.categories.update(modal.item.id, data);
      if (res.status === "success" && res.data) {
        setCategories((prev) =>
          prev.map((c) => (c.id === modal.item!.id ? { ...c, ...data } : c))
        );
      }
    } else {
      // Create
      const res = await api.categories.create(data);
      if (res.status === "success" && res.data) {
        setCategories((prev) => [...prev, res.data as Category]);
      } else {
        // optimistic fallback
        setCategories((prev) => [
          ...prev,
          { id: Date.now().toString(), ...data, item_count: 0 },
        ]);
      }
    }
    setModal({ open: false });
  }

  async function handleDelete(id: string) {
    if (!confirm("Hapus kategori ini?")) return;
    await api.categories.delete(id);
    setCategories((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <div className="flex min-h-screen bg-[#f8fafc] text-slate-800">
      {/* ── Sidebar ── */}
      <aside className="w-56 shrink-0 bg-white border-r border-slate-100 flex flex-col justify-between sticky top-0 h-screen">
        <div>
          <div className="px-6 py-6 border-b border-slate-100">
            <span className="text-lg font-extrabold text-[#0785BC] tracking-tight">
              PinjamBarang
            </span>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">
              Internal Lending Platform
            </p>
          </div>
          <nav className="px-3 py-4 space-y-0.5">
            {navItems.map(({ href, label, icon: Icon }) => {
              const isActive = href === "/admin/kategori_barang";
              return (
                <Link
                  key={href}
                  href={href}
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

      {/* ── Main ── */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="bg-white border-b border-slate-100 px-8 py-4 flex items-center gap-3 sticky top-0 z-10">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari kategori..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-full focus:outline-none focus:ring-2 focus:ring-[#0785BC] transition-all"
            />
          </div>
          <div className="ml-auto flex items-center gap-3">
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
          </div>
        </header>

        <div className="p-8">
          {/* Page header */}
          <div className={`flex items-start justify-between mb-8 ${mounted ? "animate-fade-up" : "opacity-0"}`}>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Kategori Barang</h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Kelola klasifikasi inventaris perusahaan.
              </p>
            </div>
            <button
              onClick={() => setModal({ open: true })}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-[#0785BC] hover:bg-[#0672a0] active:scale-95 rounded-xl transition-all shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Tambah Kategori
            </button>
          </div>

          {/* Cards */}
          {loading ? (
            <div className="grid grid-cols-3 gap-5">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4">
                  <div className="w-11 h-11 rounded-xl bg-slate-100 animate-pulse" />
                  <div className="h-4 bg-slate-100 rounded animate-pulse w-1/2" />
                  <div className="h-3 bg-slate-100 rounded animate-pulse" />
                  <div className="h-3 bg-slate-100 rounded animate-pulse w-3/4" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 text-slate-400 text-sm">
              Tidak ada kategori ditemukan.
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-5">
              {filtered.map((cat, i) => (
                <div
                  key={cat.id}
                  style={{ animationDelay: `${100 + i * 75}ms` }}
                  className={mounted ? "animate-fade-up" : "opacity-0"}
                >
                  <KategoriCard
                    cat={cat}
                    onEdit={() => setModal({ open: true, item: cat })}
                    onDelete={() => handleDelete(cat.id)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Modal */}
      {modal.open && (
        <CategoryModal
          initial={modal.item}
          onClose={() => setModal({ open: false })}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
