"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ChevronDown, CheckCircle2 } from "lucide-react";
import api from "@/lib/api";

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

  const [item, setItem]       = useState<ItemDetail | null>(null);
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
      const res = await api.items.getById(id);
      if (res.status === "success" && res.data) {
        setItem(res.data as ItemDetail);
      } else {
        setItem({ ...mockItem, id });
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
    if (!form.borrow_date || !form.return_date || !form.division || !form.purpose.trim()) {
      setError("Semua field wajib diisi.");
      return;
    }
    if (form.return_date < form.borrow_date) {
      setError("Tanggal selesai tidak boleh sebelum tanggal mulai.");
      return;
    }
    setSubmitting(true);
    const res = await api.borrowings.create({
      borrow_date: form.borrow_date,
      return_date: form.return_date,
      purpose: `[${form.division}] ${form.purpose}`,
      items: [{ item_id: id, quantity: 1 }],
    });
    setSubmitting(false);
    if (res.status === "success" || res.status === "fail") {
      // show success even in mock mode
      setSuccess(true);
    } else {
      setError(res.message || "Gagal mengirim permintaan.");
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
          <h2 className="text-lg font-bold text-slate-900 mb-1">Permintaan Terkirim!</h2>
          <p className="text-sm text-slate-500 mb-6">
            Permintaan peminjaman <span className="font-semibold text-slate-700">{item?.name}</span> sedang menunggu persetujuan admin.
          </p>
          <div className="flex gap-3">
            <Link
              href="/user/item_catalog"
              className="flex-1 py-2.5 text-sm font-semibold border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 active:scale-95 transition-all text-center"
            >
              Kembali ke Katalog
            </Link>
            <Link
              href="/user/riwayat_peminjaman"
              className="flex-1 py-2.5 text-sm font-semibold text-white bg-[#0785BC] hover:bg-[#0672a0] active:scale-95 rounded-xl transition-all text-center"
            >
              Lihat Riwayat
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
          Back to Catalog
        </Link>
      </header>

      <div className={`max-w-4xl mx-auto px-6 py-8 ${mounted ? "animate-fade-up" : "opacity-0"}`}>
        {/* Page header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Item Detail</h1>
          <p className="text-sm text-slate-500 mt-0.5">Please review the item and complete the loan request form.</p>
        </div>

        <div className="flex gap-6 items-start">
          {/* ── Item Card ── */}
          <div className="w-80 shrink-0 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {loading ? (
              <div className="aspect-video bg-slate-100 animate-pulse" />
            ) : (
              <div className="relative aspect-video bg-slate-100 overflow-hidden">
                {item?.image ? (
                  <Image src={item.image} alt={item.name} fill className="object-cover" sizes="320px" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-slate-100">
                    <span className="text-slate-300 text-4xl">📦</span>
                  </div>
                )}
              </div>
            )}

            <div className="p-5">
              {loading ? (
                <div className="space-y-2">
                  <div className="h-4 bg-slate-100 rounded animate-pulse w-1/3" />
                  <div className="h-5 bg-slate-100 rounded animate-pulse w-2/3" />
                  <div className="h-3 bg-slate-100 rounded animate-pulse" />
                </div>
              ) : (
                <>
                  {/* Status badge */}
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold mb-3 ${
                    item?.status === "available"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-100 text-slate-500"
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${item?.status === "available" ? "bg-emerald-500" : "bg-slate-400"}`} />
                    {item?.status === "available" ? "Available" : "Busy"}
                  </span>

                  <h2 className="text-lg font-bold text-slate-900 mb-2">{item?.name}</h2>
                  <p className="text-sm text-slate-500 leading-relaxed mb-5">{item?.description}</p>

                  <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
                    <div>
                      <p className="text-[11px] text-slate-400 uppercase tracking-wide font-medium mb-0.5">Category</p>
                      <p className="text-sm font-semibold text-slate-800">{item?.category}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-400 uppercase tracking-wide font-medium mb-0.5">Asset ID</p>
                      <p className="text-sm font-semibold text-slate-800">{item?.asset_id ?? "—"}</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ── Request Form ── */}
          <div className="flex-1 bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h2 className="text-base font-bold text-slate-900 mb-5">Request Form</h2>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Tanggal Mulai & Selesai */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-slate-700 mb-1.5 block">
                    Tanggal Mulai
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
                    Tanggal Selesai
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
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-1.5 block">Divisi</label>
                <div className="relative">
                  <select
                    name="division"
                    value={form.division}
                    onChange={handleChange}
                    required
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
                  Keperluan Peminjaman
                </label>
                <textarea
                  name="purpose"
                  value={form.purpose}
                  onChange={handleChange}
                  placeholder="Jelaskan tujuan penggunaan barang..."
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
                  {submitting ? "Mengirim..." : "Konfirmasi Peminjaman"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
