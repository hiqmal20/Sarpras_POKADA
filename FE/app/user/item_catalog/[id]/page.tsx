"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Package,
  Layers,
  ShieldCheck,
  Calendar,
  CalendarDays,
  Sparkles,
  Plus,
  X,
  ChevronRight,
  Info,
  FileText,
  Send,
  Loader2,
  Tag,
  AlertCircle,
  Check,
  Boxes,
  HelpCircle,
} from "lucide-react";
import api from "@/lib/api";
import { normalizeItem, isItemEmptyStock } from "@/lib/item";
import { useLanguage } from "@/lib/i18n";
import { getSocket } from "@/lib/socket";

// â”€â”€ Types â”€â”€
interface ItemDetail {
  id: string;
  name: string;
  description: string;
  category: string;
  asset_id?: string;
  status: "available" | "busy";
  stock?: number;
  total_stock?: number;
  available_stock?: number;
  image?: string;
}

interface FormState {
  borrow_date: string;
  return_date: string;
  division: string;
  purpose: string;
}

const PURPOSE_PRESETS = [
  "Praktikum / Pembelajaran",
  "Rapat Organisasi",
  "Acara / Kegiatan Kampus",
  "Dokumentasi & Publikasi",
  "Tugas Proyek / Riset",
];

function useMount() {
  const [m, setM] = useState(false);
  useEffect(() => {
    setM(true);
  }, []);
  return m;
}

export default function ItemDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const mounted = useMount();
  const { t, lang } = useLanguage();
  const ui = (id: string, en: string, fallback: string) => lang === "en" ? en : t(id) === id ? fallback : t(id);
  const tr = (k: string, fb: string) => {
    const v = t(k);
    return v === k ? fb : v;
  };

  const [item, setItem] = useState<ItemDetail | null>(null);
  const [availableItems, setAvailableItems] = useState<ItemDetail[]>([]);
  const [selectedItems, setSelectedItems] = useState<ItemDetail[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState<FormState>({
    borrow_date: "",
    return_date: "",
    division: "",
    purpose: "",
  });

  const fetchItem = useCallback(async () => {
    if (!id) return;
    try {
      const [res, itemsRes] = await Promise.all([
        api.items.getById(id),
        api.items.getAll({ limit: 100 }),
      ]);
      if (res.status === "success" && res.data) {
        setItem(normalizeItem(res.data) as ItemDetail);
      } else {
        // If not found as item, check if it's a package
        try {
          const pkgRes = await api.packages.getById(id);
          if (pkgRes.status === "success" && pkgRes.data) {
            router.replace(`/user/item_catalog/package/${id}`);
            return;
          }
        } catch {}
        setItem(null);
        setError("Barang tidak ditemukan di database.");
      }
      if (itemsRes.status === "success" && Array.isArray(itemsRes.data)) {
        setAvailableItems(
          itemsRes.data
            .map(normalizeItem)
            .filter((entry) => entry.status === "available" && entry.id !== id) as ItemDetail[]
        );
      }
    } catch {
      setError("Gagal memuat barang.");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    fetchItem();
  }, [fetchItem]);

  // Real-time stock update via WebSocket
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleStockUpdate = (payload?: any) => {
      if (payload?.item && payload.item.id === id) {
        setItem(normalizeItem(payload.item) as ItemDetail);
      }
      fetchItem();
    };

    socket.on("stock_updated", handleStockUpdate);
    socket.on("item_updated", handleStockUpdate);

    return () => {
      socket.off("stock_updated", handleStockUpdate);
      socket.off("item_updated", handleStockUpdate);
    };
  }, [id, fetchItem]);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError("");
  }

  // Calculate duration in days
  const durationDays = useMemo(() => {
    if (!form.borrow_date || !form.return_date) return null;
    const start = new Date(form.borrow_date);
    const end = new Date(form.return_date);
    const diffTime = end.getTime() - start.getTime();
    if (isNaN(diffTime) || diffTime < 0) return null;
    const days = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return days;
  }, [form.borrow_date, form.return_date]);

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
    const availableStock = Number(item?.available_stock ?? item?.stock ?? 0);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > availableStock) {
      setError(`Jumlah harus berupa bilangan bulat antara 1 dan ${availableStock}.`);
      return;
    }
    if (item && isItemEmptyStock(item)) {
      setError("Barang ini sedang tidak dapat dipinjam karena stok kosong.");
      return;
    }

    setSubmitting(true);
    const res = await api.borrowings.create({
      borrow_date: form.borrow_date,
      return_date: form.return_date,
      purpose: form.purpose,
      items: [
        { item_id: id, quantity },
        ...selectedItems.map((entry) => ({ item_id: entry.id, quantity: 1 })),
      ],
    });
    setSubmitting(false);
    if (res.status === "success") {
      setSuccess(true);
    } else {
      const details = res.errors?.map((entry) => entry.message).join(", ");
      setError(details || res.message || tr("catdetail.err_fail", "Gagal mengirim permintaan."));
    }
  }

  const emptyStock = item ? isItemEmptyStock(item) : false;
  const currentStock = Number(item?.available_stock ?? item?.stock ?? 0);

  // â”€â”€ Success state â”€â”€
  if (success) {
    return (
      <div
        className={`min-h-screen bg-[#eef2f9] dark:bg-[#0b1220] flex items-center justify-center p-4 transition-colors ${
          mounted ? "animate-fade-in" : "opacity-0"
        }`}
      >
        <div className="bg-white dark:bg-[#111c30] rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xl p-8 sm:p-10 max-w-md w-full text-center animate-scale-in relative overflow-hidden">
          <div className="absolute -right-12 -top-12 w-40 h-40 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none" />
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center mx-auto mb-5 shadow-sm">
            <CheckCircle2 className="w-9 h-9 text-emerald-500" />
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mb-2">
            {tr("catdetail.success_title", "Permintaan Terkirim!")}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
            {tr("catdetail.success_prefix", "Permintaan peminjaman")}{" "}
            <span className="font-semibold text-slate-800 dark:text-slate-200">{item?.name}</span>{" "}
            {tr("catdetail.success_suffix", "sedang menunggu persetujuan admin sarpras.")}
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/user/item_catalog"
              className="flex-1 py-3 text-xs sm:text-sm font-semibold border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95 transition-all text-center"
            >
              {tr("catdetail.back", "Kembali ke Katalog")}
            </Link>
            <Link
              href="/user/riwayat_peminjaman"
              className="flex-1 py-3 text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-[#0785BC] to-[#0672a0] hover:from-[#0672a0] hover:to-[#055b80] active:scale-95 rounded-xl shadow-md shadow-[#0785BC]/25 transition-all text-center"
            >
              {tr("catdetail.view_history", "Lihat Riwayat")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#eef2f9] dark:bg-[#0b1220] text-slate-800 dark:text-slate-100 transition-colors">
      {/* â”€â”€ Modern Glass Topbar â”€â”€ */}
      <header className="bg-white/85 dark:bg-[#0b1220]/85 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 px-4 sm:px-8 py-3.5 sticky top-0 z-30 shadow-xs">
        <div className="max-w-[1240px] mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/user/item_catalog"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700/80 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-[#0785BC] transition-all shrink-0 active:scale-95"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{tr("catdetail.back", "Kembali")}</span>
            </Link>
            <span className="hidden sm:inline text-slate-300 dark:text-slate-700">|</span>
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 truncate">
              <span>{tr("catalog.title", "Katalog Barang")}</span>
              <ChevronRight className="w-3 h-3 text-slate-400" />
              <span className="text-[#0785BC] font-medium">{item?.category || "Barang"}</span>
              <ChevronRight className="w-3 h-3 text-slate-400" />
              <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                {item?.name || "Detail"}
              </span>
            </div>
          </div>

          {/* Quick status pill on topbar */}
          {item && (
            <div className="shrink-0">
              {emptyStock ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  {tr("common.stock_out", "Stok Habis")}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {currentStock} {tr("common.available", "Unit Tersedia")}
                </span>
              )}
            </div>
          )}
        </div>
      </header>

      {/* â”€â”€ Main Content â”€â”€ */}
      <main
        className={`max-w-[1240px] mx-auto px-4 sm:px-8 py-6 sm:py-8 ${
          mounted ? "animate-fade-up" : "opacity-0"
        }`}
      >
        {/* Page Title & Breadcrumb Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#0785BC]/10 text-[#0785BC] dark:text-sky-300 text-[10px] font-bold tracking-wider uppercase">
                <Sparkles className="w-3 h-3" />
                {tr("catdetail.badge", "Peminjaman Sarpras")}
              </span>
              <span className="text-xs text-slate-400 dark:text-slate-500">â€¢</span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {item?.category || "Fasilitas"}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-1.5 tracking-tight">
              {tr("catdetail.title", "Detail & Pengajuan Peminjaman")}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              {tr("catdetail.subtitle", "Periksa ketersediaan barang dan isi formulir pengajuan dengan lengkap.")}
            </p>
          </div>
        </div>

        {/* â”€â”€ 2-Column Responsive Grid â”€â”€ */}
        <div className="grid grid-cols-1 lg:grid-cols-[380px_minmax(0,1fr)] xl:grid-cols-[410px_minmax(0,1fr)] gap-6 items-start">
          {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
              LEFT: Modern Item Detail Card ([Image 1] Upgrade)
             â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
          <div className="w-full bg-white dark:bg-[#111c30] rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-[0_4px_24px_-4px_rgba(15,23,42,0.06)] dark:shadow-none overflow-hidden transition-all duration-300 hover:border-[#0785BC]/30">
            {/* Visual Media Showcase */}
            <div className="relative h-[250px] sm:h-[270px] bg-gradient-to-br from-slate-100 via-slate-50 to-sky-50/30 dark:from-[#0d1627] dark:via-[#111c30] dark:to-[#0f2238] flex items-center justify-center overflow-hidden group p-4 border-b border-slate-100 dark:border-slate-800/80">
              {/* Decorative background circle */}
              <div className="absolute w-44 h-44 rounded-full bg-[#0785BC]/10 dark:bg-sky-500/10 blur-2xl pointer-events-none" />

              {loading ? (
                <div className="w-full h-full bg-slate-200 dark:bg-slate-800 animate-pulse rounded-2xl" />
              ) : item?.image ? (
                <div className="relative w-full h-full">
                  <Image
                    src={item.image}
                    alt={item.name}
                    fill
                    className={`object-contain transition-transform duration-500 ${
                      emptyStock ? "grayscale opacity-60" : "group-hover:scale-105"
                    }`}
                    sizes="(max-width: 768px) 100vw, 410px"
                    priority
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-300 dark:text-slate-600 gap-2">
                  <Package className="w-16 h-16 stroke-[1.2]" />
                  <span className="text-xs font-semibold text-slate-400">Tidak ada foto barang</span>
                </div>
              )}

              {/* Badges Over Image */}
              <div className="absolute top-3.5 left-3.5 flex items-center gap-1.5">
                <span className="px-2.5 py-1 rounded-xl bg-white/95 dark:bg-slate-900/90 backdrop-blur text-[11px] font-bold text-[#0785BC] dark:text-sky-300 shadow-xs border border-slate-200/60 dark:border-slate-700 flex items-center gap-1">
                  <Tag className="w-3 h-3" />
                  {item?.category || tr("catdetail.goods", "Barang")}
                </span>
              </div>

              <div className="absolute top-3.5 right-3.5">
                {emptyStock ? (
                  <span className="px-2.5 py-1 rounded-xl bg-rose-600/90 backdrop-blur text-[11px] font-bold text-white shadow-sm flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {tr("common.stock_out", "Stok Habis")}
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-xl bg-emerald-600/90 backdrop-blur text-[11px] font-bold text-white shadow-sm flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    {tr("catdetail.available", "Tersedia")}
                  </span>
                )}
              </div>

              {/* Bottom stock badge */}
              {!loading && !emptyStock && (
                <div className="absolute bottom-3 left-3.5 right-3.5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-xl p-2 px-3 border border-slate-200/60 dark:border-slate-700/80 flex items-center justify-between text-xs shadow-xs">
                  <span className="text-slate-500 dark:text-slate-400 text-[11px] font-medium">
                    {ui("catdetail.stock_remaining", "Available Stock", "Sisa Stok Siap Pakai")}
                  </span>
                  <span className="font-extrabold text-[#0785BC] dark:text-sky-400">
                    {currentStock} Unit
                  </span>
                </div>
              )}
            </div>

            {/* Details Content */}
            <div className="p-5 sm:p-7 space-y-5">
              {loading ? (
                <div className="space-y-3">
                  <div className="h-5 bg-slate-100 dark:bg-slate-800 rounded animate-pulse w-3/4" />
                  <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
                  <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded animate-pulse w-5/6" />
                </div>
              ) : (
                <>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white leading-snug">
                      {item?.name}
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed mt-2.5">
                      {item?.description || "Barang fasilitas sarana & prasarana yang dapat diajukan untuk kegiatan resmi."}
                    </p>
                  </div>

                  {/* Modern 2x2 Feature Highlights */}
                  <div className="grid grid-cols-2 gap-2.5 pt-1">
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 dark:text-slate-400 mb-1">
                        <Boxes className="w-3.5 h-3.5 text-[#0785BC]" />
                        <span>{tr("admin.items.th_category", "Kategori")}</span>
                      </div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                        {item?.category || "Umum"}
                      </p>
                    </div>

                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 dark:text-slate-400 mb-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                        <span>{tr("admin.items.th_condition", "Kondisi")}</span>
                      </div>
                      <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        {lang === "en" ? "Good & Ready to Use" : "Baik & Siap Pakai"}
                      </p>
                    </div>

                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 dark:text-slate-400 mb-1">
                        <Package className="w-3.5 h-3.5 text-blue-500" />
                        <span>{lang === "en" ? "Borrow Type" : "Tipe Peminjaman"}</span>
                      </div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
                        {lang === "en" ? "Per Unit (Item)" : "Per Satuan (Item)"}
                      </p>
                    </div>

                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 dark:text-slate-400 mb-1">
                        <Clock className="w-3.5 h-3.5 text-amber-500" />
                        <span>{lang === "en" ? "Verification" : "Verifikasi"}</span>
                      </div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
                        {lang === "en" ? "Admin Approval" : "Persetujuan Admin"}
                      </p>
                    </div>
                  </div>

                  {/* Ketentuan Ringkas */}
                  <div className="rounded-2xl bg-blue-50/60 dark:bg-sky-950/30 border border-blue-100/80 dark:border-sky-900/50 p-4 space-y-2">
                    <p className="text-[11px] font-bold text-[#0785BC] dark:text-sky-300 uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      {lang === "en" ? "Borrowing Terms" : "Ketentuan Peminjaman"}
                    </p>
                    <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1.5">
                      <li className="flex items-start gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{lang === "en" ? "Must maintain cleanliness and physical condition during borrowing." : "Wajib menjaga kebersihan dan fisik barang selama peminjaman."}</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{lang === "en" ? "Return on time according to the planned return date." : "Kembalikan tepat waktu sesuai tanggal rencana pengembalian."}</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{lang === "en" ? "Report to admin if any issues occur during handover." : "Laporkan ke admin jika terjadi kendala saat serah terima barang."}</span>
                      </li>
                    </ul>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
              RIGHT: Modern Request Form ([Image 2] Upgrade)
             â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
          <div className="w-full bg-white dark:bg-[#111c30] rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-[0_4px_24px_-4px_rgba(15,23,42,0.06)] dark:shadow-none p-5 sm:p-8 animate-fade-up">
            {/* Form Header */}
            <div className="flex items-center justify-between pb-5 border-b border-slate-100 dark:border-slate-800 gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#0785BC] to-[#0aa5e0] text-white flex items-center justify-center shadow-md shadow-[#0785BC]/20 shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold tracking-widest text-[#0785BC] dark:text-sky-300 uppercase">
                    {tr("catdetail.summary", "Formulir Resmi")}
                  </p>
                  <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">
                    {tr("catdetail.form_title", "Pengajuan Peminjaman Barang")}
                  </h2>
                </div>
              </div>

              <button
                type="button"
                onClick={() => router.back()}
                className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                title="Tutup"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Hero Item Summary Card */}
            <div className="mt-5 p-4 rounded-2xl bg-gradient-to-br from-sky-50/90 via-blue-50/50 to-blue-50/40 dark:from-sky-950/40 dark:via-blue-950/30 dark:to-blue-950/20 border border-sky-100/80 dark:border-sky-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-white dark:bg-slate-800 border border-sky-100 dark:border-sky-900/80 flex items-center justify-center shrink-0 overflow-hidden shadow-xs">
                  {item?.image ? (
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <Package className="w-6 h-6 text-[#0785BC]" />
                  )}
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold text-[#0785BC] dark:text-sky-300 uppercase tracking-wide">
                    {lang === "en" ? "Primary Item (1 Unit)" : "Barang Utama (1 Unit)"}
                  </span>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {item?.name || (lang === "en" ? "Loading item..." : "Memuat barang...")}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {tr("admin.items.th_category", "Kategori")}: {item?.category || "-"}
                  </p>
                </div>
              </div>

              {/* Dynamic Duration Badge */}
              <div className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/90 dark:bg-slate-900/90 border border-sky-200/70 dark:border-sky-800 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-xs">
                <CalendarDays className="w-4 h-4 text-[#0785BC]" />
                {durationDays ? (
                  <span>
                    {lang === "en" ? "Duration:" : "Durasi:"} <b className="text-[#0785BC] dark:text-sky-300">{durationDays} {lang === "en" ? "Days" : "Hari"}</b>
                  </span>
                ) : (
                  <span className="text-slate-400">{lang === "en" ? "Select date range" : "Pilih rentang tanggal"}</span>
                )}
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mt-4 p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2.5 animate-shake">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span className="flex-1">{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              {/* Quantity */}
              <div>
                <label className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 mb-2 block">{lang === "en" ? "Item Quantity" : "Jumlah Barang"}</label>
                <input type="number" min={1} max={currentStock} step={1} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} className="w-full px-3.5 py-2.5 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-800/60" />
                <p className="text-[11px] text-slate-500 mt-1">{tr("admin.items.avail_stock", "Stok tersedia")}: {currentStock} {tr("common.units", "unit")}</p>
              </div>

              {/* Tanggal Mulai & Tanggal Selesai */}
              <div>
                <label className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 mb-2 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-[#0785BC]" />
                  <span>{lang === "en" ? "Borrowing Schedule" : "Jadwal Peminjaman Barang"} <span className="text-rose-500">*</span></span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="relative">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      {tr("catdetail.start", "Tanggal Mulai")}
                    </span>
                    <input
                      type="date"
                      name="borrow_date"
                      value={form.borrow_date}
                      onChange={handleChange}
                      min={new Date().toISOString().split("T")[0]}
                      required
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0785BC] bg-slate-50/50 dark:bg-slate-800/60 text-slate-800 dark:text-slate-100 transition-all"
                    />
                  </div>

                  <div className="relative">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      {tr("catdetail.end", "Tanggal Selesai")}
                    </span>
                    <input
                      type="date"
                      name="return_date"
                      value={form.return_date}
                      onChange={handleChange}
                      min={form.borrow_date || new Date().toISOString().split("T")[0]}
                      required
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0785BC] bg-slate-50/50 dark:bg-slate-800/60 text-slate-800 dark:text-slate-100 transition-all"
                    />
                  </div>
                </div>

                {durationDays !== null && (
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1.5 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Peminjaman dijadwalkan selama {durationDays} hari kalender.
                  </p>
                )}
              </div>

              {/* Tambahkan Barang Lain (Opsional) */}
              <div>
                <label className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Plus className="w-4 h-4 text-[#0785BC]" />
                    {tr("catdetail.add_extra", "Tambahkan Barang Lain")}
                  </span>
                  <span className="text-[11px] font-normal text-slate-400">Opsional</span>
                </label>
                <div className="relative">
                  <select
                    value=""
                    onChange={(event) => {
                      const selected = availableItems.find((entry) => entry.id === event.target.value);
                      if (selected && !selectedItems.some((entry) => entry.id === selected.id)) {
                        setSelectedItems((current) => [...current, selected]);
                      }
                    }}
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 bg-slate-50/50 dark:bg-slate-800/60 focus:outline-none focus:ring-2 focus:ring-[#0785BC] transition-all cursor-pointer"
                  >
                    <option value="">{tr("catdetail.pick_extra", "Pilih barang tambahan dari daftar...")}</option>
                    {availableItems
                      .filter((entry) => !selectedItems.some((selectedEntry) => selectedEntry.id === entry.id))
                      .map((entry) => (
                        <option key={entry.id} value={entry.id}>
                          {entry.name} ({entry.category}) - Stok: {entry.stock || 1}
                        </option>
                      ))}
                  </select>
                </div>

                {/* Selected Extra Items Tags */}
                {selectedItems.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2.5">
                    {selectedItems.map((entry) => (
                      <span
                        key={entry.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 text-xs font-semibold text-[#0785BC] dark:text-sky-300 shadow-2xs"
                      >
                        <Package className="w-3 h-3 text-[#0785BC]" />
                        <span className="max-w-[160px] truncate">{entry.name}</span>
                        <span className="text-[10px] text-slate-400">(1 unit)</span>
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedItems((current) =>
                              current.filter((selectedEntry) => selectedEntry.id !== entry.id)
                            )
                          }
                          className="hover:bg-rose-100 hover:text-rose-600 rounded-full p-0.5 transition-colors cursor-pointer"
                          title="Hapus barang tambahan"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Keperluan Peminjaman (Purpose) */}
              <div>
                <label className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-[#0785BC]" />
                    {tr("catdetail.purpose", "Keperluan Peminjaman")} <span className="text-rose-500">*</span>
                  </span>
                  <span className="text-[11px] text-slate-400 font-normal">
                    {form.purpose.length} karakter
                  </span>
                </label>

                {/* Quick Presets / Suggestion Chips */}
                <div className="flex flex-wrap items-center gap-1.5 mb-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">
                    Template:
                  </span>
                  {PURPOSE_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        setForm((prev) => ({
                          ...prev,
                          purpose: prev.purpose
                            ? `${prev.purpose.trim()}; ${preset}`
                            : preset,
                        }));
                      }}
                      className="px-2.5 py-1 text-[11px] rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-[#0785BC]/10 hover:text-[#0785BC] dark:hover:text-sky-300 border border-slate-200/60 dark:border-slate-700 transition-all cursor-pointer"
                    >
                      + {preset}
                    </button>
                  ))}
                </div>

                <textarea
                  name="purpose"
                  value={form.purpose}
                  onChange={handleChange}
                  rows={3}
                  required
                  placeholder={tr(
                    "catdetail.purpose_ph",
                    "Contoh: Keperluan presentasi tugas akhir di lab multimedia kampus..."
                  )}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0785BC] bg-slate-50/50 dark:bg-slate-800/60 text-slate-800 dark:text-slate-100 transition-all resize-none leading-relaxed"
                />
              </div>

              {/* Informative Note */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-[#0785BC] shrink-0 mt-0.5" />
                <span>
                  {lang === "en" ? "Your application will be forwarded to the sarpras admin for verification. You can track status directly on the " : "Pengajuan akan diteruskan ke admin sarpras untuk verifikasi. Anda dapat memantau status secara langsung di halaman "}
                  <Link href="/user/riwayat_peminjaman" className="text-[#0785BC] font-semibold hover:underline">
                    {tr("nav.history", "Riwayat Peminjaman")}
                  </Link>.
                </span>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting || emptyStock}
                  className={`w-full py-3.5 px-6 rounded-2xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer ${
                    emptyStock
                      ? "bg-slate-300 dark:bg-slate-700 text-slate-500 cursor-not-allowed"
                      : "bg-gradient-to-r from-[#0785BC] via-[#0672a0] to-[#045b80] hover:from-[#0672a0] hover:to-[#034d6e] shadow-lg shadow-[#0785BC]/25 hover:shadow-xl hover:shadow-[#0785BC]/35 hover:-translate-y-0.5 active:translate-y-0"
                  }`}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{lang === "en" ? "Submitting Application..." : "Mengirim Pengajuan..."}</span>
                    </>
                  ) : emptyStock ? (
                    <>
                      <Clock className="w-4 h-4" />
                      <span>{lang === "en" ? "Out of Stock / Unavailable" : "Stok Barang Habis / Tidak Tersedia"}</span>
                    </>
                  ) : (
                    <>
                      <span>{tr("catdetail.submit", "Kirim Pengajuan Peminjaman")}</span>
                      <Send className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
