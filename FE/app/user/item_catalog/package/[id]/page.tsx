"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
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
  Layers2,
  CheckCheck,
} from "lucide-react";
import api from "@/lib/api";
import { normalizeItem, isPackageEmptyStock } from "@/lib/item";
import { useLanguage } from "@/lib/i18n";
import { getSocket } from "@/lib/socket";

interface PackageDetail {
  id: string;
  name: string;
  description?: string;
  image_url?: string;
  status?: string;
  is_available?: boolean;
  stock_total?: number;
  stock_available?: number;
  stock_borrowed?: number;
  has_empty_item?: boolean;
  packages_items?: Array<{
    item_id?: string;
    quantity?: number;
    items?: {
      id?: string;
      name?: string;
      stock?: number;
      available_stock?: number;
      status?: string;
      category?: string;
      image_url?: string;
    };
  }>;
}

interface FormState {
  borrow_date: string;
  return_date: string;
  purpose: string;
}

const PURPOSE_PRESETS = [
  "Kegiatan Praktikum / Lab",
  "Pelaksanaan Ujian / Workshop",
  "Acara Sekolah / Event",
  "Rapat Organisasi Kampus",
  "Dokumentasi & Multimedia",
];

function useMount() {
  const [m, setM] = useState(false);
  useEffect(() => {
    setM(true);
  }, []);
  return m;
}

export default function PackageDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const mounted = useMount();
  const { t } = useLanguage();
  const tr = (k: string, fb: string) => {
    const v = t(k);
    return v === k ? fb : v;
  };

  const [pkg, setPkg] = useState<PackageDetail | null>(null);
  const [availableItems, setAvailableItems] = useState<any[]>([]);
  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState<FormState>({
    borrow_date: "",
    return_date: "",
    purpose: "",
  });

  const fetchPackageData = useCallback(async () => {
    if (!id) return;
    try {
      const [res, itemsRes] = await Promise.all([
        api.packages.getById(id),
        api.items.getAll({ limit: 100 }),
      ]);
      if (res.status === "success" && res.data) {
        setPkg(res.data);
      } else {
        setPkg(null);
        setError("Paket barang tidak ditemukan di database.");
      }
      if (itemsRes.status === "success" && Array.isArray(itemsRes.data)) {
        setAvailableItems(
          itemsRes.data
            .map(normalizeItem)
            .filter((entry: any) => entry.status === "available")
        );
      }
    } catch {
      setError("Gagal memuat detail paket barang.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchPackageData();
  }, [fetchPackageData]);

  // Real-time stock / item updates via WebSocket
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleStockUpdate = () => {
      fetchPackageData();
    };

    socket.on("stock_updated", handleStockUpdate);
    socket.on("package_updated", handleStockUpdate);
    socket.on("item_updated", handleStockUpdate);

    return () => {
      socket.off("stock_updated", handleStockUpdate);
      socket.off("package_updated", handleStockUpdate);
      socket.off("item_updated", handleStockUpdate);
    };
  }, [fetchPackageData]);

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
    if (!pkg) return;

    const availablePackages = Number(pkg.stock_available ?? 0);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > availablePackages) {
      setError(`Jumlah paket harus berupa bilangan bulat antara 1 dan ${availablePackages}.`);
      return;
    }
    if (isPackageEmptyStock(pkg) || availablePackages <= 0) {
      setError("Paket ini sedang tidak tersedia karena stok habis atau salah satu item di dalamnya tidak mencukupi.");
      return;
    }

    setSubmitting(true);
    setError("");

    const packageItems = (pkg.packages_items || [])
      .map((row: any) => ({
        item_id: row.item_id || row.items?.id,
        quantity: (row.quantity || 1) * quantity,
      }))
      .filter((row: any) => row.item_id);

    const extras = selectedItems.map((entry: any) => ({
      item_id: entry.id,
      quantity: 1,
    }));

    const uniqueItems = [...packageItems, ...extras].filter(
      (it, idx, arr) => arr.findIndex((x) => x.item_id === it.item_id) === idx
    );

    const validItems = uniqueItems.filter((it) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        it.item_id
      )
    );

    if (validItems.length === 0) {
      setError("Paket ini belum memiliki item database yang valid.");
      setSubmitting(false);
      return;
    }

    const res = await api.borrowings.create({
      borrow_date: form.borrow_date,
      return_date: form.return_date,
      package_id: pkg.id,
      package_quantity: quantity,
      purpose: `[Paket: ${pkg.name}] ${form.purpose.trim()}`,
      items: validItems,
    });

    setSubmitting(false);

    if (res.status === "success") {
      setSuccess(true);
    } else {
      const details = res.errors?.map((entry: any) => entry.message).join(", ");
      setError(details || res.message || tr("catdetail.err_fail", "Gagal mengirim permintaan."));
    }
  }

  const isAvailable = pkg ? !isPackageEmptyStock(pkg) : false;
  const packageItems = pkg?.packages_items || [];

  // ── Success state ──
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
            <span className="font-semibold text-slate-800 dark:text-slate-200">{pkg?.name}</span>{" "}
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
      {/* ── Modern Glass Topbar ── */}
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
              <span className="text-[#0672a0] font-medium">Paket Bundling</span>
              <ChevronRight className="w-3 h-3 text-slate-400" />
              <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                {pkg?.name || "Detail Paket"}
              </span>
            </div>
          </div>

          {/* Quick status pill on topbar */}
          {pkg && (
            <div className="shrink-0">
              {!isAvailable ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  Sebagian Item Habis
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Paket Lengkap Tersedia
                </span>
              )}
            </div>
          )}
        </div>
      </header>

      {/* ── Main Content ── */}
      <main
        className={`max-w-[1240px] mx-auto px-4 sm:px-8 py-6 sm:py-8 ${
          mounted ? "animate-fade-up" : "opacity-0"
        }`}
      >
        {/* Page Title & Breadcrumb Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#0785BC]/10 text-[#0672a0] dark:text-[#35b8e8] text-[10px] font-bold tracking-wider uppercase">
                <Layers className="w-3 h-3" />
                {tr("catalog.package_label", "Paket Barang Bundling")}
              </span>
              <span className="text-xs text-slate-400 dark:text-slate-500">•</span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {packageItems.length} Item Termasuk
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-1.5 tracking-tight">
              {tr("catdetail.package_title", "Detail Paket & Pengajuan Peminjaman")}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              {tr("catdetail.package_sub", "Periksa seluruh isi komponen paket dan lengkapi jadwal peminjaman.")}
            </p>
          </div>
        </div>

        {/* ── 2-Column Responsive Grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[380px_minmax(0,1fr)] xl:grid-cols-[410px_minmax(0,1fr)] gap-6 items-start">
          {/* ══════════════════════════════════════════════════════════
              LEFT: Modern Package Detail Card ([Image 1] Upgrade)
             ══════════════════════════════════════════════════════════ */}
          <div className="w-full bg-white dark:bg-[#111c30] rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-[0_4px_24px_-4px_rgba(15,23,42,0.06)] dark:shadow-none overflow-hidden transition-all duration-300 hover:border-[#0785BC]/30">
            {/* Visual Media Showcase */}
            <div className="relative h-[250px] sm:h-[270px] bg-gradient-to-br from-[#eef7fc]/50 via-slate-50 to-[#eef7fc]/30 dark:from-[#102338] dark:via-[#111c30] dark:to-[#0f2238] flex items-center justify-center overflow-hidden group p-4 border-b border-slate-100 dark:border-slate-800/80">
              {/* Decorative background glow */}
              <div className="absolute w-44 h-44 rounded-full bg-[#0785BC]/10 dark:bg-[#0785BC]/15 blur-2xl pointer-events-none" />

              {loading ? (
                <div className="w-full h-full bg-slate-200 dark:bg-slate-800 animate-pulse rounded-2xl" />
              ) : pkg?.image_url ? (
                <div className="relative w-full h-full">
                  <img
                    src={pkg.image_url}
                    alt={pkg.name}
                    className={`w-full h-full object-contain transition-transform duration-500 ${
                      !isAvailable ? "grayscale opacity-60" : "group-hover:scale-105"
                    }`}
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-300 dark:text-slate-600 gap-2">
                  <Layers className="w-16 h-16 stroke-[1.2] text-[#35b8e8]" />
                  <span className="text-xs font-semibold text-slate-400">Paket Sarpras Pokada</span>
                </div>
              )}

              {/* Badges Over Image */}
              <div className="absolute top-3.5 left-3.5 flex items-center gap-1.5">
                <span className="px-2.5 py-1 rounded-xl bg-white/95 dark:bg-slate-900/90 backdrop-blur text-[11px] font-bold text-[#0672a0] dark:text-[#35b8e8] shadow-xs border border-slate-200/60 dark:border-slate-700 flex items-center gap-1">
                  <Layers className="w-3 h-3" />
                  {tr("catalog.package_label", "Paket Barang")}
                </span>
              </div>

              <div className="absolute top-3.5 right-3.5">
                {!isAvailable ? (
                  <span className="px-2.5 py-1 rounded-xl bg-rose-600/90 backdrop-blur text-[11px] font-bold text-white shadow-sm flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Sebagian Habis
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-xl bg-emerald-600/90 backdrop-blur text-[11px] font-bold text-white shadow-sm flex items-center gap-1">
                    <CheckCheck className="w-3 h-3" />
                    Paket Tersedia
                  </span>
                )}
              </div>

              {/* Bottom component count pill */}
              {!loading && (
                <div className="absolute bottom-3 left-3.5 right-3.5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-xl p-2 px-3 border border-slate-200/60 dark:border-slate-700/80 flex items-center justify-between text-xs shadow-xs">
                  <span className="text-slate-500 dark:text-slate-400 text-[11px] font-medium">
                    Total Komponen Paket
                  </span>
                  <span className="font-extrabold text-[#0672a0] dark:text-[#35b8e8]">
                    {packageItems.length} Macam Barang
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
                      {pkg?.name}
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed mt-2.5">
                      {pkg?.description ||
                        "Paket bundling fasilitas sarpras yang mencakup seperangkat alat pendukung kegiatan."}
                    </p>
                  </div>

                  {/* Daftar Komponen Isi Paket (Interactive Component Breakdown) */}
                  <div className="rounded-2xl bg-slate-50/90 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                        <Boxes className="w-3.5 h-3.5 text-[#0672a0]" />
                        Rincian Komponen Paket
                      </p>
                      <span className="text-[10px] font-bold text-slate-400">
                        {packageItems.length} Item
                      </span>
                    </div>

                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                      {packageItems.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">Belum ada item dalam paket ini.</p>
                      ) : (
                        packageItems.map((entry, idx) => {
                          const itemName = entry.items?.name || "Barang";
                          const qty = entry.quantity || 1;
                          const avail = Number(entry.items?.available_stock ?? entry.items?.stock ?? 0);
                          const isItemEmpty = avail < qty;

                          return (
                            <div
                              key={entry.item_id || idx}
                              className={`flex items-center justify-between p-2.5 rounded-xl border text-xs transition-colors ${
                                isItemEmpty
                                  ? "bg-rose-50/60 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/60"
                                  : "bg-white dark:bg-slate-800/80 border-slate-200/60 dark:border-slate-700/60"
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-7 h-7 rounded-lg bg-[#d9effa] dark:bg-[#062b40]/60 text-[#0672a0] dark:text-[#8ed8f5] flex items-center justify-center shrink-0">
                                  <Package className="w-3.5 h-3.5" />
                                </div>
                                <div className="min-w-0">
                                  <p className="font-bold text-slate-800 dark:text-slate-200 truncate leading-snug">
                                    {itemName}
                                  </p>
                                  <p className="text-[10px] text-slate-400">
                                    Jumlah: <b>{qty} Unit</b>
                                  </p>
                                </div>
                              </div>

                              <div className="shrink-0 text-right">
                                {isItemEmpty ? (
                                  <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-100/70 dark:bg-rose-950/60 px-2 py-0.5 rounded-md">
                                    Stok Habis
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100/70 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md">
                                    Stok: {avail}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Modern 2x2 Feature Highlights */}
                  <div className="grid grid-cols-2 gap-2.5 pt-1">
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 mb-1">
                        <Layers2 className="w-3.5 h-3.5 text-[#0672a0]" />
                        <span>Format Aset</span>
                      </div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                        Paket Lengkap
                      </p>
                    </div>

                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 mb-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Kondisi Paket</span>
                      </div>
                      <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        Terverifikasi Bagus
                      </p>
                    </div>

                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 mb-1">
                        <Boxes className="w-3.5 h-3.5 text-blue-500" />
                        <span>Peminjaman</span>
                      </div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
                        1 Pengajuan Serentak
                      </p>
                    </div>

                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 mb-1">
                        <Clock className="w-3.5 h-3.5 text-amber-500" />
                        <span>Proses Admin</span>
                      </div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
                        Cepat & Terpantau
                      </p>
                    </div>
                  </div>

                  {/* Ketentuan Ringkas */}
                  <div className="rounded-2xl bg-[#eef7fc]/60 dark:bg-[#062b40]/30 border border-[#d9effa]/80 dark:border-[#023b55]/50 p-4 space-y-2">
                    <p className="text-[11px] font-bold text-[#055b80] dark:text-[#8ed8f5] uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Ketentuan Peminjaman Paket
                    </p>
                    <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1.5">
                      <li className="flex items-start gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        <span>Pengajuan berlaku untuk semua komponen barang dalam paket.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        <span>Seluruh komponen wajib dikembalikan serentak sesuai batas waktu.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        <span>Cek kelengkapan fisik paket saat serah terima barang di admin sarpras.</span>
                      </li>
                    </ul>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════
              RIGHT: Modern Request Form ([Image 2] Upgrade)
             ══════════════════════════════════════════════════════════ */}
          <div className="w-full bg-white dark:bg-[#111c30] rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-[0_4px_24px_-4px_rgba(15,23,42,0.06)] dark:shadow-none p-5 sm:p-8">
            {/* Form Header */}
            <div className="flex items-center justify-between pb-5 border-b border-slate-100 dark:border-slate-800 gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#0672a0] to-[#0785BC] text-white flex items-center justify-center shadow-md shadow-#eef7fc0/20 shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold tracking-widest text-[#0672a0] dark:text-[#35b8e8] uppercase">
                    Formulir Resmi Paket
                  </p>
                  <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">
                    Pengajuan Peminjaman Paket
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
            <div className="mt-5 p-4 rounded-2xl bg-gradient-to-br from-[#eef7fc]/90 via-[#eef7fc]/50 to-blue-50/40 dark:from-[#062b40]/40 dark:via-[#062b40]/30 dark:to-blue-950/20 border border-[#d9effa]/80 dark:border-[#023b55]/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-white dark:bg-slate-800 border border-[#d9effa] dark:border-[#023b55]/80 flex items-center justify-center shrink-0 overflow-hidden shadow-xs">
                  {pkg?.image_url ? (
                    <img src={pkg.image_url} alt={pkg.name} className="w-full h-full object-cover" />
                  ) : (
                    <Layers className="w-6 h-6 text-[#0672a0]" />
                  )}
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold text-[#0672a0] dark:text-[#35b8e8] uppercase tracking-wide">
                    Paket Terpilih ({packageItems.length} Komponen)
                  </span>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {pkg?.name || "Memuat paket..."}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    Termasuk: {packageItems.map((r: any) => r.items?.name).filter(Boolean).join(", ") || "Item paket"}
                  </p>
                </div>
              </div>

              {/* Dynamic Duration Badge */}
              <div className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/90 dark:bg-slate-900/90 border border-[#bfeeff]/70 dark:border-[#034d6e] text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-xs">
                <CalendarDays className="w-4 h-4 text-[#0672a0]" />
                {durationDays ? (
                  <span>
                    Durasi: <b className="text-[#0672a0] dark:text-[#35b8e8]">{durationDays} Hari</b>
                  </span>
                ) : (
                  <span className="text-slate-400">Pilih rentang tanggal</span>
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
              {/* Quantity Paket */}
              <div>
                <label className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 mb-2 block">Jumlah Paket</label>
                <input type="number" min={1} max={Number(pkg?.stock_available ?? 0)} step={1} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} className="w-full px-3.5 py-2.5 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-800/60" />
                <p className="text-[11px] text-slate-500 mt-1">Stok paket tersedia: {Number(pkg?.stock_available ?? 0)} unit</p>
              </div>

              {/* Tanggal Mulai & Tanggal Selesai */}
              <div>
                <label className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 mb-2 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-[#0672a0]" />
                  <span>Jadwal Peminjaman Paket <span className="text-rose-500">*</span></span>
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
                    Peminjaman paket dijadwalkan selama {durationDays} hari kalender.
                  </p>
                )}
              </div>

              {/* Tambahkan Barang Lain di Luar Paket (Opsional) */}
              <div>
                <label className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Plus className="w-4 h-4 text-[#0672a0]" />
                    Tambahkan Barang Tambahan (Di luar paket)
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
                    <option value="">Pilih barang tambahan jika butuh perlengkapan ekstra...</option>
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
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#eef7fc] dark:bg-[#062b40]/60 border border-[#bfeeff] dark:border-[#034d6e] text-xs font-semibold text-[#055b80] dark:text-[#8ed8f5] shadow-2xs"
                      >
                        <Package className="w-3 h-3 text-[#0672a0]" />
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
                    <FileText className="w-4 h-4 text-[#0672a0]" />
                    {tr("catdetail.purpose", "Keperluan Peminjaman Paket")} <span className="text-rose-500">*</span>
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
                      className="px-2.5 py-1 text-[11px] rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-[#0785BC]/10 hover:text-[#0672a0] dark:hover:text-[#8ed8f5] border border-slate-200/60 dark:border-slate-700 transition-all cursor-pointer"
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
                  placeholder="Contoh: Keperluan pelaksanaan workshop praktikum mahasiswa di laboratorium..."
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0785BC] bg-slate-50/50 dark:bg-slate-800/60 text-slate-800 dark:text-slate-100 transition-all resize-none leading-relaxed"
                />
              </div>

              {/* Informative Note */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-[#0672a0] shrink-0 mt-0.5" />
                <span>
                  Pengajuan paket ini akan mencakup seluruh komponen barang sekaligus. Status dapat dipantau di halaman{" "}
                  <Link href="/user/riwayat_peminjaman" className="text-[#0672a0] font-semibold hover:underline">
                    Riwayat Peminjaman
                  </Link>.
                </span>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting || !isAvailable}
                  className={`w-full py-3.5 px-6 rounded-2xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer ${
                    !isAvailable
                      ? "bg-slate-300 dark:bg-slate-700 text-slate-500 cursor-not-allowed"
                      : "bg-gradient-to-r from-[#0672a0] via-[#0785BC] to-[#056794] hover:from-[#055b80] hover:to-[#045277] shadow-lg shadow-#eef7fc0/20 hover:shadow-xl hover:shadow-#eef7fc0/30 hover:-translate-y-0.5 active:translate-y-0"
                  }`}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Mengirim Pengajuan Paket...</span>
                    </>
                  ) : !isAvailable ? (
                    <>
                      <Clock className="w-4 h-4" />
                      <span>Paket Tidak Tersedia (Sebagian Item Habis)</span>
                    </>
                  ) : (
                    <>
                      <span>Ajukan Peminjaman Paket</span>
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
