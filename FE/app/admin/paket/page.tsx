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
} from "lucide-react";
import api from "@/lib/api";

interface AvailableItem {
  id: string;
  name: string;
  code: string;
  available_stock: number;
}

interface PackageItemDetail {
  id: string;
  quantity: number;
  items?: {
    id: string;
    name: string;
    code: string;
    available_stock: number;
    status: string;
  };
}

interface PackageData {
  id: string;
  name: string;
  description?: string;
  status: string;
  image_url?: string;
  is_available?: boolean;
  packages_items?: PackageItemDetail[];
}

export default function PaketPage() {
  const [packages, setPackages] = useState<PackageData[]>([]);
  const [availableItems, setAvailableItems] = useState<AvailableItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<PackageData | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [availabilityFilter, setAvailabilityFilter] = useState("all");
  const [imagePreview, setImagePreview] = useState<string>("");

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    status: "Aktif",
  });

  const [selectedItems, setSelectedItems] = useState<Array<{ item_id: string; quantity: number }>>([]);
  const [selectedItemId, setSelectedItemId] = useState("");
  const [selectedItemQty, setSelectedItemQty] = useState(1);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pkgRes, itemsRes] = await Promise.all([
        api.packages.getAll(),
        api.items.getAll({ limit: 100 }),
      ]);

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
  }, []);

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      status: "Aktif",
    });
    setSelectedItems([]);
    setSelectedItemId("");
    setSelectedItemQty(1);
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
    const currentItems = (pkg.packages_items || []).map((pi) => ({
      item_id: pi.items?.id || (pi as any).item_id || "",
      quantity: pi.quantity || 1,
    }));
    setSelectedItems(currentItems);
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

  const handleAddItemToPackage = () => {
    if (!selectedItemId) return;
    const existing = selectedItems.find((i) => i.item_id === selectedItemId);
    if (existing) {
      setSelectedItems(
        selectedItems.map((i) =>
          i.item_id === selectedItemId ? { ...i, quantity: i.quantity + selectedItemQty } : i
        )
      );
    } else {
      setSelectedItems([...selectedItems, { item_id: selectedItemId, quantity: selectedItemQty }]);
    }
    setSelectedItemId("");
    setSelectedItemQty(1);
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
        items: selectedItems,
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

  const handleRowClick = (pkg: PackageData) => {
    setSelectedPackage(pkg);
    setShowDetail(true);
  };

  const filteredPackages = packages.filter((pkg) => {
    const matchSearch =
      pkg.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (pkg.description || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchAvailability =
      availabilityFilter === "all"
        ? true
        : availabilityFilter === "ready"
        ? pkg.is_available
        : !pkg.is_available;
    return matchSearch && matchAvailability;
  });

  const readyPackagesCount = packages.filter((p) => p.is_available).length;
  const limitedPackagesCount = packages.filter((p) => !p.is_available).length;

  return (
    <AdminLayout
      showSearch
      searchValue={searchQuery}
      searchPlaceholder="Cari paket sarpras..."
      onSearchChange={setSearchQuery}
    >
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Paket Sarana & Prasarana</h1>
            <p className="text-sm text-slate-500 mt-1">Kelola bundle peminjaman peralatan lengkap</p>
          </div>

          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#0785BC] text-white text-sm font-semibold rounded-xl hover:bg-[#0672a0] active:scale-95 transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Tambah Paket
          </button>
        </div>

        {/* ── Stat Cards Real Data ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Total Paket Bundel</p>
              <p className="text-3xl font-bold text-slate-900 tabular-nums">
                {loading ? "..." : packages.length} <span className="text-xs text-slate-400 font-normal">paket</span>
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#0785BC] flex items-center justify-center shrink-0">
              <Package className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Siap Dipinjam (Lengkap)</p>
              <p className="text-3xl font-bold text-emerald-600 tabular-nums">
                {loading ? "..." : readyPackagesCount} <span className="text-xs text-slate-400 font-normal">paket</span>
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Stok Terbatas / Parsial</p>
              <p className="text-3xl font-bold text-amber-500 tabular-nums">
                {loading ? "..." : limitedPackagesCount} <span className="text-xs text-slate-400 font-normal">paket</span>
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
              <AlertCircle className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* ── Table Card ── */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-6 py-4 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Daftar Paket Sarpras</h2>
              <p className="text-xs text-slate-400">Total {filteredPackages.length} paket sesuai filter</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">Ketersediaan:</span>
              <select
                value={availabilityFilter}
                onChange={(e) => setAvailabilityFilter(e.target.value)}
                className="text-xs font-semibold border border-slate-200 rounded-xl px-3 py-1.5 text-slate-600 bg-white focus:outline-none focus:ring-2 focus:ring-[#0785BC] transition-all"
              >
                <option value="all">Semua Ketersediaan</option>
                <option value="ready">Siap Dipinjam (Lengkap)</option>
                <option value="limited">Stok Terbatas / Tidak Lengkap</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50/75 border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Paket Barang</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Item Termasuk</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Ketersediaan</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Aksi</th>
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
                      Belum ada paket sarpras. Klik tombol "Tambah Paket" untuk membuat bundel baru.
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
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-xs font-semibold text-slate-700">
                          {pkg.packages_items?.length || 0} macam barang
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        {pkg.is_available ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700">
                            <CheckCircle2 className="w-3 h-3" /> Siap Dipinjam
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700">
                            <AlertCircle className="w-3 h-3" /> Stok Terbatas
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex px-2 py-0.5 text-[11px] font-semibold rounded-full ${
                            pkg.status === "Aktif" ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {pkg.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
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
        </div>
      </div>

      {/* Modal Tambah Paket */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  {editingId ? "Edit Paket Sarpras" : "Tambah Paket Sarpras"}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Gabungkan beberapa item barang menjadi satu paket</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
              {/* Upload Foto Paket */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">Foto Paket Barang</label>
                <div className="flex items-center gap-4">
                  {imagePreview ? (
                    <div className="relative w-24 h-24 rounded-xl overflow-hidden border border-slate-200 group">
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setImagePreview("")}
                        className="absolute top-1 right-1 p-1 bg-rose-500 text-white rounded-full hover:bg-rose-600 transition-colors"
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

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Paket *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0785BC]"
                  placeholder="contoh: Paket Presentasi Lengkap"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Deskripsi Paket</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0785BC] resize-none"
                  placeholder="Deskripsi peruntukan paket..."
                />
              </div>

              {/* Pilih Item Barang */}
              <div className="border border-slate-100 bg-slate-50/50 p-3.5 rounded-xl space-y-3">
                <label className="block font-semibold text-slate-700">Daftar Barang dalam Paket *</label>
                <div className="flex gap-2">
                  <select
                    value={selectedItemId}
                    onChange={(e) => setSelectedItemId(e.target.value)}
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#0785BC]"
                  >
                    <option value="">Pilih Barang...</option>
                    {availableItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({item.code}) - Sisa: {item.available_stock}
                      </option>
                    ))}
                  </select>

                  <input
                    type="number"
                    min="1"
                    value={selectedItemQty}
                    onChange={(e) => setSelectedItemQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-20 px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#0785BC]"
                  />

                  <button
                    type="button"
                    onClick={handleAddItemToPackage}
                    className="px-3 py-2 bg-slate-800 text-white rounded-xl hover:bg-slate-900 font-semibold"
                  >
                    Tambah
                  </button>
                </div>

                {/* List item yang sudah dipilih */}
                <div className="space-y-1.5 pt-1">
                  {selectedItems.map((item, idx) => {
                    const itemData = availableItems.find((ai) => ai.id === item.item_id);
                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between bg-white border border-slate-200 px-3 py-1.5 rounded-lg"
                      >
                        <span className="text-slate-800 font-medium">
                          {itemData?.name || item.item_id} <span className="text-slate-400">({item.quantity} unit)</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveItemFromPackage(idx)}
                          className="text-rose-500 hover:text-rose-700 p-0.5"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
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
                  Simpan Paket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Detail Paket */}
      {showDetail && selectedPackage && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900">Detail Paket</h2>
              <button onClick={() => setShowDetail(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            {selectedPackage.image_url && (
              <div className="w-full h-44 rounded-xl overflow-hidden border border-slate-100">
                <img
                  src={selectedPackage.image_url}
                  alt={selectedPackage.name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <p className="text-slate-400 font-medium">Nama Paket:</p>
                <p className="text-sm font-bold text-slate-800">{selectedPackage.name}</p>
              </div>

              <div>
                <p className="text-slate-400 font-medium">Keterangan:</p>
                <p className="text-slate-600">{selectedPackage.description || "-"}</p>
              </div>

              <div>
                <p className="text-slate-400 font-medium mb-1.5">Isi Paket Sarpras:</p>
                <div className="border border-slate-100 rounded-xl divide-y divide-slate-50 bg-slate-50/50 overflow-hidden">
                  {selectedPackage.packages_items && selectedPackage.packages_items.length > 0 ? (
                    selectedPackage.packages_items.map((pi) => (
                      <div key={pi.id} className="p-2.5 flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-slate-800">{pi.items?.name || "Barang"}</p>
                          <p className="text-[10px] text-slate-400">Kode: {pi.items?.code || "-"}</p>
                        </div>
                        <span className="font-bold text-slate-700 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                          {pi.quantity} unit
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="p-3 text-slate-400 text-center">Belum ada rincian barang.</p>
                  )}
                </div>
              </div>
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
