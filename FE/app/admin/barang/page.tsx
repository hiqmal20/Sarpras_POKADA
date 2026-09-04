"use client";

import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin";
import { Plus, Edit, Trash2, X, Upload, Image as ImageIcon, Loader2, Package, CheckCircle2, AlertTriangle } from "lucide-react";
import api from "@/lib/api";

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

export default function BarangPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [imagePreview, setImagePreview] = useState<string>("");

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    category_id: "",
    stock: 1,
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
          available_stock: i.available_stock ?? i.stock ?? 0,
          condition: i.condition || "Baik",
          status: i.status || "Tersedia",
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
    setFormData({
      name: item.name,
      code: item.code,
      category_id: item.category_id || "",
      stock: item.stock,
      condition: item.condition,
      status: item.status || "Tersedia",
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
    setSaving(true);

    try {
      const payload: any = {
        name: formData.name,
        code: formData.code,
        stock: Number(formData.stock),
        condition: formData.condition,
        status: formData.status,
        description: formData.description,
        location: formData.location,
        image_url: imagePreview || undefined,
      };

      if (formData.category_id) {
        payload.category_id = formData.category_id;
      }

      if (editingId) {
        const res = await api.items.update(editingId, payload);
        if (res.status === "success") {
          await fetchData();
          setShowModal(false);
          resetForm();
        } else {
          alert("Gagal memperbarui barang: " + (res.message || "Error"));
        }
      } else {
        const res = await api.items.create(payload);
        if (res.status === "success") {
          await fetchData();
          setShowModal(false);
          resetForm();
        } else {
          alert("Gagal menambah barang: " + (res.message || "Error"));
        }
      }
    } catch (err: any) {
      alert("Terjadi kesalahan: " + (err?.message || "Error"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus barang ini?")) return;
    try {
      const res = await api.items.delete(id);
      if (res.status === "success") {
        setItems((prev) => prev.filter((item) => item.id !== id));
      } else {
        alert("Gagal menghapus: " + (res.message || "Error"));
      }
    } catch (err: any) {
      alert("Gagal menghapus barang: " + err.message);
    }
  };

  const handleRowClick = (item: Item) => {
    setSelectedItem(item);
    setShowDetail(true);
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
      searchPlaceholder="Cari barang..."
      onSearchChange={setSearchQuery}
    >
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Barang Per Item</h1>
            <p className="text-sm text-slate-500 mt-1">Kelola barang satuan dan inventaris</p>
          </div>

          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#0785BC] text-white text-sm font-semibold rounded-xl hover:bg-[#0672a0] active:scale-95 transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Tambah Barang
          </button>
        </div>

        {/* ── Stat Cards Real Data ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Total Aset Fisik</p>
              <p className="text-3xl font-bold text-slate-900 tabular-nums">
                {loading ? "..." : items.length} <span className="text-xs text-slate-400 font-normal">jenis ({totalStockCount} unit)</span>
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#0785BC] flex items-center justify-center shrink-0">
              <Package className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Stok Siap Pinjam</p>
              <p className="text-3xl font-bold text-emerald-600 tabular-nums">
                {loading ? "..." : totalAvailableCount} <span className="text-xs text-slate-400 font-normal">unit</span>
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Perlu Perbaikan / Rusak</p>
              <p className="text-3xl font-bold text-rose-500 tabular-nums">
                {loading ? "..." : damagedItemCount} <span className="text-xs text-slate-400 font-normal">item</span>
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-6 py-4 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Daftar Inventaris Barang</h2>
              <p className="text-xs text-slate-400">Total {filteredItems.length} unit terdaftar</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">Kategori:</span>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="text-xs font-semibold border border-slate-200 rounded-xl px-3 py-1.5 text-slate-600 bg-white focus:outline-none focus:ring-2 focus:ring-[#0785BC] transition-all"
              >
                <option value="all">Semua Kategori</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50/75 border-b border-slate-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Kode</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Nama Barang</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Kategori</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Stok / Tersedia</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Kondisi</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Aksi</th>
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
                            item.status === "Tersedia"
                              ? "bg-blue-50 text-blue-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEdit(item);
                            }}
                            className="p-1.5 text-slate-400 hover:text-[#0785BC] hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(item.id);
                            }}
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
        </div>
      </div>

      {/* Modal Form Tambah / Edit */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  {editingId ? "Edit Barang" : "Tambah Barang"}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Kelola informasi barang inventaris</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
              {/* Upload Foto Barang */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Foto Barang
                </label>
                <div className="flex items-center gap-4">
                  {imagePreview ? (
                    <div className="relative w-24 h-24 rounded-xl overflow-hidden border border-slate-200 group">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setImagePreview("")}
                        className="absolute top-1 right-1 p-1 bg-rose-500 text-white rounded-full hover:bg-rose-600 transition-colors shadow-xs"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <label className="w-24 h-24 rounded-xl border-2 border-dashed border-slate-200 hover:border-[#0785BC] flex flex-col items-center justify-center text-slate-400 hover:text-[#0785BC] cursor-pointer transition-colors bg-slate-50/50">
                      <Upload className="w-5 h-5 mb-1" />
                      <span className="text-[10px] font-medium">Upload Foto</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                    </label>
                  )}
                  <div className="text-[11px] text-slate-400 leading-relaxed">
                    <p>Format: JPG, PNG, WEBP</p>
                    <p>Maksimal ukuran file: 5MB</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Nama Barang *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0785BC]"
                    placeholder="Projector Epson EB-X51"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Kode Barang *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0785BC]"
                    placeholder="PRJ-001"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Kategori *
                  </label>
                  <select
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0785BC]"
                  >
                    <option value="">Pilih Kategori</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Total Stok *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0785BC]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Kondisi *
                  </label>
                  <select
                    value={formData.condition}
                    onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0785BC]"
                  >
                    <option value="Baik">Baik</option>
                    <option value="Rusak Ringan">Rusak Ringan</option>
                    <option value="Rusak Berat">Rusak Berat</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Status *
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0785BC]"
                  >
                    <option value="Tersedia">Tersedia</option>
                    <option value="Dipinjam">Dipinjam</option>
                    <option value="Dalam Pemeliharaan">Dalam Pemeliharaan</option>
                  </select>
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
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0785BC]"
                  placeholder="contoh: Gudang A-1 / Lemari B"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Deskripsi / Catatan
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0785BC] resize-none"
                  placeholder="Catatan spesifikasi atau kondisi..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-50 font-semibold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-5 py-2 bg-[#0785BC] text-white font-semibold rounded-xl hover:bg-[#0672a0] disabled:opacity-60 transition-all shadow-sm"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetail && selectedItem && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900">Detail Barang</h2>
              <button
                onClick={() => setShowDetail(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400 font-medium">Nama:</span>
                <span className="font-semibold text-slate-800">{selectedItem.name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400 font-medium">Kode:</span>
                <span className="font-semibold text-slate-800">{selectedItem.code}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400 font-medium">Kategori:</span>
                <span className="text-slate-700">{selectedItem.category}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400 font-medium">Stok Total:</span>
                <span className="font-semibold text-slate-800">{selectedItem.stock} unit</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400 font-medium">Tersedia:</span>
                <span className="font-semibold text-emerald-600">{selectedItem.available_stock} unit</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400 font-medium">Kondisi:</span>
                <span className="font-semibold text-slate-800">{selectedItem.condition}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400 font-medium">Lokasi:</span>
                <span className="text-slate-700">{selectedItem.location || "-"}</span>
              </div>
              {selectedItem.description && (
                <div className="py-1">
                  <span className="text-slate-400 font-medium block mb-1">Deskripsi:</span>
                  <p className="text-slate-600 bg-slate-50 p-2.5 rounded-lg">{selectedItem.description}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowDetail(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-200 transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
