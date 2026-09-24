"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ChevronDown, CheckCircle2 } from "lucide-react";
import api from "@/lib/api";
import { normalizeItem } from "@/lib/item";
import { useLanguage } from "@/lib/i18n";

// ── Types ──
interface ItemDetail {
  id: string;
  name: string;
  description: string;
  category: string;
  asset_id?: string;
  status: "available" | "busy";
  image?: string;
}

interface FormState {
  borrow_date: string;
  return_date: string;
  division: string;
  purpose: string;
}

const divisions = [
  "IT Support", "Marketing", "Operations", "HR", "Finance",
  "Academic", "Research", "Media & Dokumentasi",
];

// ── Mock fallback ──
const mockItem: ItemDetail = {
  id: "1",
  name: "Epson EB-X51 Projector",
  description: "High-brightness XGA projector, ideal for clear and sharp presentations in medium to large meeting rooms. Includes HDMI and VGA connectivity.",
  category: "Electronics",
  asset_id: "PRJ-2023-04",
  status: "available",
  image: "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=800&q=80",
};

function useMount() {
  const [m, setM] = useState(false);
  useEffect(() => { setM(true); }, []);
  return m;
}

export default function ItemDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();
  const mounted = useMount();
  const { t } = useLanguage();
  const tr = (k: string, fb: string) => {
    const v = t(k);
    return v === k ? fb : v;
  };

  const [item, setItem]       = useState<ItemDetail | null>(null);
  const [availableItems, setAvailableItems] = useState<ItemDetail[]>([]);
  const [selectedItems, setSelectedItems] = useState<ItemDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError]     = useState("");

  const [form, setForm] = useState<FormState>({
    borrow_date: "", return_date: "", division: "", purpose: "",
  });

  // Fetch item detail
  useEffect(() => {
    async function fetchItem() {
      setLoading(true);
       const [res, itemsRes] = await Promise.all([
         api.items.getById(id),
         api.items.getAll({ limit: 100 }),
       ]);
       if (res.status === "success" && res.data) {
         setItem(normalizeItem(res.data) as ItemDetail);
       } else {
         setItem({ ...mockItem, id });
       }
       if (itemsRes.status === "success" && Array.isArray(itemsRes.data)) {
         setAvailableItems(itemsRes.data.map(normalizeItem).filter((entry) => entry.status === "available" && entry.id !== id) as ItemDetail[]);
       }
       setLoading(false);
    }
    if (id) fetchItem();
  }, [id]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.borrow_date || !form.return_date || !form.purpose.trim()) {
      setError(tr("catdetail.err_required", "Semua field wajib diisi."));
      return;
    }
    if (form.return_date < form.borrow_date) {
      setError(tr("catdetail.err_date", "Tanggal selesai tidak boleh sebelum tanggal mulai."));
      return;
    }
    setSubmitting(true);
    const res = await api.borrowings.create({
      borrow_date: form.borrow_date,
      return_date: form.return_date,
      purpose: form.purpose,
      items: [{ item_id: id, quantity: 1 }, ...selectedItems.map((entry) => ({ item_id: entry.id, quantity: 1 }))],
    });
    setSubmitting(false);
    if (res.status === "success") {
      setSuccess(true);
    } else {
      const details = res.errors?.map((entry) => entry.message).join(", ");
      setError(details || res.message || tr("catdetail.err_fail", "Gagal mengirim permintaan."));
    }
  }

  // ── Success state ──
  if (success) {
    return (
      <div className={`min-h-screen bg-[#eef2f9] flex items-center justify-center ${mounted ? "animate-fade-in" : "opacity-0"}`}>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-10 max-w-sm w-full mx-4 text-center animate-scale-in">
          <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-7 h-7 text-emerald-500" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-1">{tr("catdetail.success_title", "Permintaan Terkirim!")}</h2>
          <p className="text-sm text-slate-500 mb-6">
            {tr("catdetail.success_prefix", "Permintaan peminjaman")} <span className="font-semibold text-slate-700">{item?.name}</span> {tr("catdetail.success_suffix", "sedang menunggu persetujuan admin.")}
          </p>
          <div className="flex gap-3">
            <Link
              href="/user/item_catalog"
              className="flex-1 py-2.5 text-sm font-semibold border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 active:scale-95 transition-all text-center"
            >
              {tr("catdetail.back", "Kembali ke Katalog")}
            </Link>
            <Link
              href="/user/riwayat_peminjaman"
              className="flex-1 py-2.5 text-sm font-semibold text-white bg-[#0785BC] hover:bg-[#0672a0] active:scale-95 rounded-xl transition-all text-center"
            >
              {tr("catdetail.view_history", "Lihat Riwayat")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#eef2f9] text-slate-800">
      {/* ── Minimal topbar ── */}
      <header className="bg-white border-b border-slate-100 px-8 py-4 sticky top-0 z-10">
        <Link
          href="/user/item_catalog"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0785BC] hover:text-[#0672a0] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {tr("catdetail.back", "Kembali ke Katalog")}
        </Link>
      </header>

      <div className={`max-w-[1120px] mx-auto px-5 sm:px-8 py-8 ${mounted ? "animate-fade-up" : "opacity-0"}`}>
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900">{tr("catdetail.title", "Detail Barang")}</h1>
          <p className="text-sm text-slate-500 mt-1">{tr("catdetail.subtitle", "Periksa barang dan lengkapi formulir pengajuan peminjaman.")}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[352px_minmax(0,1fr)] gap-5 items-start">
          {/* ── Item Card ── */}
          <div className="w-full bg-white rounded-3xl shadow-sm overflow-hidden">
            {loading ? (
              <div className="aspect-video bg-slate-100 animate-pulse" />
            ) : (
              <div className="relative h-[210px] bg-slate-100 overflow-hidden p-4">
                {item?.image ? (
                  <Image src={item.image} alt={item.name} fill className="object-cover rounded-lg" sizes="352px" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-slate-100">
                    <span className="text-slate-300 text-4xl">📦</span>
                  </div>
                )}
              </div>
            )}

            <div className="p-7">
              {loading ? (
                <div className="space-y-2">
                  <div className="h-4 bg-slate-100 rounded animate-pulse w-1/3" />
                  <div className="h-5 bg-slate-100 rounded animate-pulse w-2/3" />
                  <div className="h-3 bg-slate-100 rounded animate-pulse" />
                </div>
              ) : (
                <>
                  {/* Status badge */}
                  <p className="text-xs font-bold uppercase tracking-wider text-[#0785BC] mb-2">{item?.category || tr("catdetail.goods", "Barang")}</p>
                  <h2 className="text-2xl font-bold text-slate-900 mb-3">{item?.name}</h2>
                  <p className="text-sm text-slate-500 leading-relaxed mb-6">{item?.description}</p>

                  <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-5">
                    <div>
                       <p className="text-xs text-slate-400">{tr("catdetail.status", "Status")}</p>
                       <p className="font-semibold text-emerald-600 mt-1">{item?.status === "available" ? tr("catdetail.available", "Tersedia") : tr("catdetail.unavailable", "Tidak tersedia")}</p>
                    </div>
                    <div>
                       <p className="text-xs text-slate-400">{tr("catdetail.type", "Jenis")}</p>
                       <p className="font-semibold text-slate-800 mt-1">{tr("catdetail.per_item", "Per Item")}</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ── Request Form ── */}
          <div className="w-full bg-white rounded-3xl shadow-sm p-7">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-xs font-semibold text-[#0785BC] uppercase">{tr("catdetail.summary", "Ringkasan Peminjaman")}</p>
                <h2 className="text-xl font-bold text-slate-900 mt-1">{tr("catdetail.form_title", "Ajukan Peminjaman")}</h2>
              </div>
              <button type="button" onClick={() => router.back()} className="text-2xl text-slate-400 hover:text-slate-600" aria-label={tr("catdetail.close", "Tutup")}>×</button>
            </div>
            <div className="rounded-xl bg-blue-50 p-3 text-sm text-[#0785BC] mb-5">
              <b>{item?.category || item?.name}</b>
              <p className="text-xs mt-1">{tr("catdetail.unit", "1 unit barang")}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-1.5 block">{tr("catdetail.add_extra", "Tambahkan barang lain")}</label>
                <select
                  value=""
                  onChange={(event) => {
                    const selected = availableItems.find((entry) => entry.id === event.target.value);
                    if (selected && !selectedItems.some((entry) => entry.id === selected.id)) setSelectedItems((current) => [...current, selected]);
                  }}
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl text-slate-700 bg-white"
                >
                  <option value="">{tr("catdetail.pick_extra", "Pilih barang tambahan...")}</option>
                  {availableItems.filter((entry) => !selectedItems.some((selectedEntry) => selectedEntry.id === entry.id)).map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
                </select>
                {selectedItems.length > 0 && <div className="flex flex-wrap gap-2 mt-2">{selectedItems.map((entry) => <button type="button" key={entry.id} onClick={() => setSelectedItems((current) => current.filter((selectedEntry) => selectedEntry.id !== entry.id))} className="px-2.5 py-1 rounded-lg bg-slate-100 text-xs text-slate-700">{entry.name} ×</button>)}</div>}
              </div>

              {/* Tanggal Mulai & Selesai */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-slate-700 mb-1.5 block">
                    {tr("catdetail.start", "Tanggal Mulai")}
                  </label>
                  <input
                    type="date"
                    name="borrow_date"
                    value={form.borrow_date}
                    onChange={handleChange}
                    min={new Date().toISOString().split("T")[0]}
                    required
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0785BC] transition-all text-slate-700"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700 mb-1.5 block">
                    {tr("catdetail.end", "Tanggal Selesai")}
                  </label>
                  <input
                    type="date"
                    name="return_date"
                    value={form.return_date}
                    onChange={handleChange}
                    min={form.borrow_date || new Date().toISOString().split("T")[0]}
                    required
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0785BC] transition-all text-slate-700"
                  />
                </div>
              </div>

              {/* Divisi */}
              <div className="hidden">
                <label className="text-sm font-semibold text-slate-700 mb-1.5 block">Divisi</label>
                <div className="relative">
                  <select
                    name="division"
                    value={form.division}
                    onChange={handleChange}
                    className="w-full appearance-none px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0785BC] transition-all text-slate-700 bg-white pr-9"
                  >
                    <option value="" disabled>Pilih Divisi...</option>
                    {divisions.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Keperluan */}
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-1.5 block">
                  {tr("catdetail.purpose", "Keperluan Peminjaman")}
                </label>
                <textarea
                  name="purpose"
                  value={form.purpose}
                  onChange={handleChange}
                  placeholder={tr("catdetail.purpose_ph", "Jelaskan tujuan penggunaan barang...")}
                  rows={4}
                  required
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0785BC] transition-all resize-none text-slate-700"
                />
              </div>

              {/* Error */}
              {error && (
                <p className="text-xs text-red-500 font-medium">{error}</p>
              )}

              {/* Submit */}
              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={submitting || item?.status !== "available"}
                  className="px-6 py-2.5 text-sm font-bold text-white bg-[#0785BC] hover:bg-[#0672a0] active:scale-95 rounded-xl transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? tr("catdetail.sending", "Mengirim...") : tr("catdetail.submit", "Ajukan Peminjaman")}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
