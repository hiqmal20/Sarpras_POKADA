"use client";

import { useState } from "react";
import { AdminLayout } from "@/components/admin";
import { Plus, Edit, Trash2, X, Package, Upload, Image as ImageIcon } from "lucide-react";

interface PackageItem {
  id: string;
  name: string;
  code: string;
  category: string;
  quantity: number;
  items: string[];
  location: string;
  image?: string;
  notes?: string;
}

const mockPackages: PackageItem[] = [
  {
    id: "1",
    name: "Paket Presentasi Standard",
    code: "PKT-001",
    category: "Paket Presentasi",
    quantity: 3,
    items: ["Projector Epson", "Layar Portable", "Pointer Wireless", "Kabel HDMI"],
    location: "Gudang B-1",
  },
  {
    id: "2",
    name: "Paket Dokumentasi",
    code: "PKT-002",
    category: "Paket Fotografi",
    quantity: 2,
    items: ["Kamera Canon 90D", "Tripod", "Memory Card 64GB", "Battery Extra"],
    location: "Gudang B-2",
  },
];

export default function PaketPage() {
  const [packages, setPackages] = useState<PackageItem[]>(mockPackages);
  const [showModal, setShowModal] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<PackageItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [imagePreview, setImagePreview] = useState<string>("");
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    category: "",
    quantity: 1,
    location: "",
    notes: "",
  });
  const [items, setItems] = useState<string[]>([]);
  const [currentItem, setCurrentItem] = useState("");

  const resetForm = () => {
    setFormData({
      name: "",
      code: "",
      category: "",
      quantity: 1,
      location: "",
      notes: "",
    });
    setItems([]);
    setCurrentItem("");
    setImagePreview("");
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

  const handleAddItem = () => {
    if (currentItem.trim()) {
      setItems([...items, currentItem.trim()]);
      setCurrentItem("");
    }
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newPackage: PackageItem = {
      id: Date.now().toString(),
      ...formData,
      items,
      image: imagePreview || undefined,
    };

    setPackages([...packages, newPackage]);
    setShowModal(false);
    resetForm();
  };

  const handleDelete = (id: string) => {
    if (confirm("Hapus paket ini?")) {
      setPackages(packages.filter((pkg) => pkg.id !== id));
    }
  };

  const handleRowClick = (pkg: PackageItem) => {
    setSelectedPackage(pkg);
    setShowDetail(true);
  };

  const filteredPackages = packages.filter((pkg) =>
    pkg.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AdminLayout
      showSearch
      searchValue={searchQuery}
      searchPlaceholder="Cari paket..."
      onSearchChange={setSearchQuery}
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Paket Barang</h1>
            <p className="text-sm text-slate-500 mt-1">Kelola paket yang berisi beberapa item</p>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
          >
            <Plus className="w-4 h-4" />
            Tambah Paket
          </button>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Kode</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Nama Paket</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Kategori</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Isi Paket</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Jumlah</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Lokasi</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredPackages.map((pkg) => (
                <tr 
                  key={pkg.id} 
                  onClick={() => handleRowClick(pkg)}
                  className="hover:bg-slate-50 cursor-pointer"
                >
                  <td className="px-4 py-3 text-sm font-medium text-slate-900">{pkg.code}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {pkg.image ? (
                        <img src={pkg.image} alt={pkg.name} className="w-10 h-10 rounded object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded bg-emerald-100 flex items-center justify-center">
                          <Package className="w-5 h-5 text-emerald-600" />
                        </div>
                      )}
                      <span className="text-sm font-medium text-slate-900">{pkg.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">{pkg.category}</td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-slate-600">
                      {pkg.items.length} item
                      <div className="text-xs text-slate-400 mt-1">
                        {pkg.items.slice(0, 2).join(", ")}
                        {pkg.items.length > 2 && ` +${pkg.items.length - 2} lainnya`}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-900 font-medium">{pkg.quantity}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{pkg.location}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(pkg.id);
                        }}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Tambah Paket</h2>
                <p className="text-sm text-slate-500 mt-1">Buat paket yang berisi beberapa item</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Foto Paket
                </label>
                <div className="flex items-start gap-4">
                  {imagePreview ? (
                    <div className="relative">
                      <img src={imagePreview} alt="Preview" className="w-32 h-32 rounded-lg object-cover border border-slate-200" />
                      <button
                        type="button"
                        onClick={() => setImagePreview("")}
                        className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="w-32 h-32 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-emerald-600 transition-colors">
                      <Upload className="w-8 h-8 text-slate-400 mb-2" />
                      <span className="text-xs text-slate-500">Upload foto</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                    </label>
                  )}
                  <div className="flex-1 text-sm text-slate-500">
                    <p>Format: JPG, PNG, atau GIF</p>
                    <p>Ukuran maksimal: 2MB</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Nama Paket *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    placeholder="Paket Presentasi Standard"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Kode Paket *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    placeholder="PKT-001"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Kategori *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    placeholder="Paket Presentasi"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Jumlah *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Lokasi *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    placeholder="Gudang B-1"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Item dalam Paket *
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={currentItem}
                    onChange={(e) => setCurrentItem(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddItem();
                      }
                    }}
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    placeholder="Nama item (Enter untuk tambah)"
                  />
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                {items.length > 0 && (
                  <div className="space-y-2 mt-3">
                    {items.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between px-3 py-2 bg-emerald-50 rounded-lg"
                      >
                        <span className="text-sm text-slate-700">{item}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          className="text-red-600 hover:bg-red-50 p-1 rounded"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Catatan
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  placeholder="Catatan tambahan..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetail && selectedPackage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Detail Paket</h2>
              <button
                onClick={() => setShowDetail(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {selectedPackage.image && (
                <div className="flex justify-center">
                  <img 
                    src={selectedPackage.image} 
                    alt={selectedPackage.name} 
                    className="w-64 h-64 rounded-lg object-cover border border-slate-200" 
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-1">Kode Paket</label>
                  <p className="text-lg font-semibold text-slate-900">{selectedPackage.code}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-1">Nama Paket</label>
                  <p className="text-lg font-semibold text-slate-900">{selectedPackage.name}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-1">Kategori</label>
                  <p className="text-slate-900">{selectedPackage.category}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-1">Jumlah</label>
                  <p className="text-slate-900">{selectedPackage.quantity} paket</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-1">Lokasi</label>
                  <p className="text-slate-900">{selectedPackage.location}</p>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-500 mb-2">Isi Paket</label>
                  <div className="space-y-2">
                    {selectedPackage.items.map((item, index) => (
                      <div key={index} className="flex items-center gap-2 px-3 py-2 bg-emerald-50 rounded-lg">
                        <Package className="w-4 h-4 text-emerald-600" />
                        <span className="text-sm text-slate-900">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {selectedPackage.notes && (
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-500 mb-1">Catatan</label>
                    <p className="text-slate-900">{selectedPackage.notes}</p>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-200">
                <button
                  onClick={() => setShowDetail(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
