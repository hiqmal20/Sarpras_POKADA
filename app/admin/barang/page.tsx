"use client";

import { useState } from "react";
import { AdminLayout } from "@/components/admin";
import { Plus, Edit, Trash2, X, Upload, Image as ImageIcon } from "lucide-react";

interface Item {
  id: string;
  name: string;
  code: string;
  category: string;
  quantity: number;
  condition: string;
  location: string;
  image?: string;
  notes?: string;
}

const mockItems: Item[] = [
  {
    id: "1",
    name: "Projector Epson EB-X51",
    code: "PRJ-001",
    category: "Elektronik",
    quantity: 5,
    condition: "Baik",
    location: "Gudang A-1",
  },
  {
    id: "2",
    name: "Kamera Canon 90D",
    code: "CAM-001",
    category: "Elektronik",
    quantity: 3,
    condition: "Baik",
    location: "Gudang A-2",
  },
];

export default function BarangPage() {
  const [items, setItems] = useState<Item[]>(mockItems);
  const [showModal, setShowModal] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [imagePreview, setImagePreview] = useState<string>("");
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    category: "",
    quantity: 1,
    condition: "Baik",
    location: "",
    notes: "",
  });

  const resetForm = () => {
    setFormData({
      name: "",
      code: "",
      category: "",
      quantity: 1,
      condition: "Baik",
      location: "",
      notes: "",
    });
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newItem: Item = {
      id: Date.now().toString(),
      ...formData,
      image: imagePreview || undefined,
    };

    setItems([...items, newItem]);
    setShowModal(false);
    resetForm();
  };

  const handleDelete = (id: string) => {
    if (confirm("Hapus barang ini?")) {
      setItems(items.filter((item) => item.id !== id));
    }
  };

  const handleRowClick = (item: Item) => {
    setSelectedItem(item);
    setShowDetail(true);
  };

  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AdminLayout
      showSearch
      searchValue={searchQuery}
      searchPlaceholder="Cari barang..."
      onSearchChange={setSearchQuery}
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Barang Per Item</h1>
            <p className="text-sm text-slate-500 mt-1">Kelola barang satuan</p>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#0785BC] text-white rounded-lg hover:bg-[#0672a0]"
          >
            <Plus className="w-4 h-4" />
            Tambah Barang
          </button>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Kode</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Nama Barang</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Kategori</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Jumlah</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Kondisi</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Lokasi</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredItems.map((item) => (
                <tr 
                  key={item.id} 
                  onClick={() => handleRowClick(item)}
                  className="hover:bg-slate-50 cursor-pointer"
                >
                  <td className="px-4 py-3 text-sm font-medium text-slate-900">{item.code}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="w-10 h-10 rounded object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded bg-slate-100 flex items-center justify-center">
                          <ImageIcon className="w-5 h-5 text-slate-400" />
                        </div>
                      )}
                      <span className="text-sm font-medium text-slate-900">{item.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">{item.category}</td>
                  <td className="px-4 py-3 text-sm text-slate-900 font-medium">{item.quantity}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-medium rounded ${
                        item.condition === "Baik"
                          ? "bg-green-100 text-green-700"
                          : item.condition === "Rusak Ringan"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {item.condition}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">{item.location}</td>
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
                          handleDelete(item.id);
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
                <h2 className="text-xl font-bold text-slate-900">Tambah Barang</h2>
                <p className="text-sm text-slate-500 mt-1">Tambahkan barang satuan ke inventory</p>
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
                  Foto Barang
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
                    <label className="w-32 h-32 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-[#0785BC] transition-colors">
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
                    Nama Barang *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0785BC]"
                    placeholder="Projector Epson EB-X51"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Kode Barang *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0785BC]"
                    placeholder="PRJ-001"
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
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0785BC]"
                    placeholder="Elektronik"
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
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0785BC]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Kondisi *
                  </label>
                  <select
                    value={formData.condition}
                    onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0785BC]"
                  >
                    <option value="Baik">Baik</option>
                    <option value="Rusak Ringan">Rusak Ringan</option>
                    <option value="Rusak Berat">Rusak Berat</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Lokasi *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0785BC]"
                    placeholder="Gudang A-1"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Catatan
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0785BC]"
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
                  className="px-4 py-2 bg-[#0785BC] text-white rounded-lg hover:bg-[#0672a0]"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetail && selectedItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Detail Barang</h2>
              <button
                onClick={() => setShowDetail(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {selectedItem.image && (
                <div className="flex justify-center">
                  <img 
                    src={selectedItem.image} 
                    alt={selectedItem.name} 
                    className="w-64 h-64 rounded-lg object-cover border border-slate-200" 
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-1">Kode Barang</label>
                  <p className="text-lg font-semibold text-slate-900">{selectedItem.code}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-1">Nama Barang</label>
                  <p className="text-lg font-semibold text-slate-900">{selectedItem.name}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-1">Kategori</label>
                  <p className="text-slate-900">{selectedItem.category}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-1">Jumlah</label>
                  <p className="text-slate-900">{selectedItem.quantity} unit</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-1">Kondisi</label>
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-medium rounded ${
                      selectedItem.condition === "Baik"
                        ? "bg-green-100 text-green-700"
                        : selectedItem.condition === "Rusak Ringan"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {selectedItem.condition}
                  </span>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-1">Lokasi</label>
                  <p className="text-slate-900">{selectedItem.location}</p>
                </div>

                {selectedItem.notes && (
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-500 mb-1">Catatan</label>
                    <p className="text-slate-900">{selectedItem.notes}</p>
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
