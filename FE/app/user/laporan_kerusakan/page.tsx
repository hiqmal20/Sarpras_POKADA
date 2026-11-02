"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ImagePlus,
  Loader2,
  Package,
  Send,
  ShieldCheck,
  Wrench,
  X,
  ChevronDown,
  FileWarning,
  Info,
} from "lucide-react";
import api from "@/lib/api";
import { UserLayout } from "@/components/user";
import { useLanguage } from "@/lib/i18n";

export default function UserDamageReportsPage() {
  const { t, lang } = useLanguage();
  const ui = (id: string, en: string, fallback: string) => lang === "en" ? en : t(id) === id ? fallback : t(id);
  const tr = (key: string, fallback: string) => {
    const value = t(key);
    return value === key ? fallback : value;
  };

  const [borrowings, setBorrowings] = useState<any[]>([]);
  const [borrowingId, setBorrowingId] = useState("");
  const [itemId, setItemId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    const loadBorrowings = async () => {
      try {
        const response = await api.borrowings.getAll({ limit: 100 });
        if (response.status === "success" && Array.isArray(response.data)) {
          setBorrowings(
            response.data.filter((borrowing: any) => {
              const status = String(borrowing.status || "").toLowerCase();
              return ["dipinjam", "disetujui", "setuju", "kembali", "returned", "aktif"].some((value) =>
                status.includes(value)
              );
            })
          );
        }
      } finally {
        setLoading(false);
      }
    };
    loadBorrowings();
  }, []);

  const selectedBorrowing = borrowings.find((borrowing) => borrowing.id === borrowingId);
  const selectedItems = selectedBorrowing?.borrowings_items || selectedBorrowing?.borrowing_items || [];
  const selectedItemName = selectedItems.find(
    (row: any) => (row.item_id || row.items?.id || row.item?.id) === itemId
  )?.items?.name || selectedItems.find(
    (row: any) => (row.item_id || row.items?.id || row.item?.id) === itemId
  )?.item?.name;

  const handleBorrowingChange = (value: string) => {
    setBorrowingId(value);
    const borrowing = borrowings.find((item) => item.id === value);
    const rows = borrowing?.borrowings_items || borrowing?.borrowing_items || [];
    setItemId(rows.length === 1 ? rows[0].item_id || rows[0].items?.id || rows[0].item?.id || "" : "");
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!description.trim()) return;

    setSending(true);
    setFeedback(null);

    try {
      const result = await api.damageReports.create({
        borrowing_id: borrowingId || undefined,
        item_id: itemId || undefined,
        title: title.trim() || tr("damage.default_title", "Laporan Kerusakan Barang"),
        description: description.trim(),
        image_url: photoUrl || undefined,
        photo_url: photoUrl || undefined,
      });

      if (result.status !== "success") {
        setFeedback({ type: "error", text: result.message || tr("damage.fail_msg", "Laporan gagal dikirim.") });
        return;
      }

      setFeedback({
        type: "success",
        text: tr("damage.success_msg", "Laporan kerusakan berhasil dikirim dan menunggu pemeriksaan admin."),
      });
      setTitle("");
      setDescription("");
      setBorrowingId("");
      setItemId("");
      setPhotoUrl("");
    } catch {
      setFeedback({ type: "error", text: "Terjadi kesalahan saat mengirim laporan." });
    } finally {
      setSending(false);
    }
  };

  return (
    <UserLayout showSearch={false}>
      <div className="mx-auto w-full max-w-5xl space-y-6 pb-12">
        {/* Header */}
        <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#073452] via-[#087faf] to-[#10add8] px-6 py-7 text-white shadow-[0_20px_45px_-20px_rgba(7,133,188,0.65)] sm:px-9 sm:py-9">
          <div className="pointer-events-none absolute -right-12 -top-20 h-64 w-64 rounded-full border-[22px] border-white/10" />
          <div className="pointer-events-none absolute -bottom-20 left-1/3 h-48 w-48 rounded-full bg-cyan-300/15 blur-3xl" />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/15 shadow-inner ring-1 ring-white/30 backdrop-blur-md">
              <Wrench className="h-8 w-8 text-cyan-100" />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-cyan-100">Sarpras Pokada · Pusat Bantuan</p>
              <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">{tr("damage.title", "Laporan Kerusakan")}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-cyan-50/90">
                Laporkan barang yang mengalami kerusakan atau kendala agar dapat segera diperiksa oleh petugas.
              </p>
            </div>
          </div>
        </section>

        {feedback && (
          <div className={`flex items-start justify-between gap-3 rounded-2xl border p-4 text-sm shadow-sm ${feedback.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>
            <div className="flex items-center gap-3">
              {feedback.type === "success" ? <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" /> : <AlertTriangle className="h-5 w-5 shrink-0 text-rose-600" />}
              <span className="font-medium">{feedback.text}</span>
            </div>
            <button type="button" onClick={() => setFeedback(null)} className="rounded-lg p-1 text-slate-400 hover:bg-white/60 cursor-pointer"><X className="h-4 w-4" /></button>
          </div>
        )}

        {/* Form only */}
        <form onSubmit={submit} className="overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white shadow-[0_14px_40px_-20px_rgba(15,23,42,0.3)] dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-cyan-50/60 px-6 py-5 dark:border-slate-800 dark:from-slate-900 dark:to-cyan-950/20 sm:px-8">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:text-rose-300"><FileWarning className="h-5 w-5" /></div>
              <div>
                <h2 className="text-base font-black text-slate-900 dark:text-white">{ui("damage.new_title", "Create New Report", "Buat Laporan Baru")}</h2>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Lengkapi informasi berikut agar petugas dapat membantu dengan tepat.</p>
              </div>
            </div>
          </div>

          <div className="space-y-6 p-6 sm:p-8">
            <div className="flex items-start gap-3 rounded-2xl border border-cyan-100 bg-gradient-to-r from-cyan-50 to-blue-50 p-4 text-xs text-slate-600 dark:border-cyan-900/50 dark:from-cyan-950/40 dark:to-blue-950/40 dark:text-slate-300">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#0785BC]" />
              <p><span className="font-black text-slate-800 dark:text-white">Tips pengisian:</span> pilih peminjaman terkait, sebutkan kerusakan dengan jelas, dan tambahkan foto jika tersedia.</p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">{ui("damage.related_borrowing", "Related Borrowing", "Peminjaman Terkait")} <span className="font-normal normal-case text-slate-400">(opsional)</span></label>
                <div className="relative">
                  <Package className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#0785BC]" />
                  <select value={borrowingId} onChange={(e) => handleBorrowingChange(e.target.value)} disabled={loading} className="h-12 w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50 pl-10 pr-10 text-sm font-semibold text-slate-700 outline-none transition focus:border-[#0785BC] focus:bg-white focus:ring-4 focus:ring-[#0785BC]/10 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:focus:bg-slate-900">
                    <option value="">{loading ? ui("damage.loading_borrowings", "Loading borrowings...", "Memuat peminjaman...") : ui("damage.select_borrowing", "Select borrowing", "Pilih peminjaman")}</option>
                    {borrowings.map((b) => <option key={b.id} value={b.id}>{b.borrow_code} · {b.purpose || "Peminjaman"}</option>)}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">Barang yang Bermasalah <span className="font-normal normal-case text-slate-400">(opsional)</span></label>
                <div className="relative">
                  <Package className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#0785BC]" />
                  <select value={itemId} onChange={(e) => setItemId(e.target.value)} disabled={!selectedBorrowing} className="h-12 w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50 pl-10 pr-10 text-sm font-semibold text-slate-700 outline-none transition focus:border-[#0785BC] focus:bg-white focus:ring-4 focus:ring-[#0785BC]/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:focus:bg-slate-900">
                    <option value="">{selectedBorrowing ? ui("damage.select_item", "Select item", "Pilih barang") : ui("damage.select_borrowing_first", "Select a borrowing first", "Pilih peminjaman dahulu")}</option>
                    {selectedItems.map((row: any) => <option key={row.item_id || row.items?.id || row.item?.id} value={row.item_id || row.items?.id || row.item?.id}>{row.items?.name || row.item?.name || "Barang"}</option>)}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>
                {selectedItemName && <p className="mt-2 flex items-center gap-1 text-[11px] font-bold text-emerald-600"><CheckCircle2 className="h-3.5 w-3.5" /> {selectedItemName} terpilih</p>}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">Judul Laporan <span className="font-normal normal-case text-slate-400">(opsional)</span></label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Contoh: Kabel proyektor tidak menyala" className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#0785BC] focus:bg-white focus:ring-4 focus:ring-[#0785BC]/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:bg-slate-900" />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between"><label className="text-xs font-black uppercase tracking-wide text-slate-500">Deskripsi Kerusakan <span className="text-rose-500">*</span></label><span className="text-[11px] text-slate-400">{description.length}/500</span></div>
              <textarea required maxLength={500} value={description} onChange={(e) => setDescription(e.target.value)} rows={6} placeholder="Jelaskan bagian yang rusak, gejala yang muncul, kapan mulai terjadi, dan kronologinya..." className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#0785BC] focus:bg-white focus:ring-4 focus:ring-[#0785BC]/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:bg-slate-900" />
            </div>

            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">Foto Kerusakan <span className="font-normal normal-case text-slate-400">(opsional)</span></label>
              {!photoUrl ? (
                <label className="group flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/70 px-5 text-center transition hover:border-[#0785BC]/60 hover:bg-cyan-50/50 dark:border-slate-700 dark:bg-slate-800/50 dark:hover:border-cyan-700">
                  <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[#0785BC] shadow-sm transition group-hover:scale-105 dark:bg-slate-700"><ImagePlus className="h-5 w-5" /></div>
                  <span className="text-xs font-black text-slate-700 dark:text-slate-200">Klik untuk unggah foto</span>
                  <span className="mt-1 text-[11px] text-slate-400">Format JPG, PNG atau WEBP (Maksimal 3MB)</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      if (file.size > 3 * 1024 * 1024) {
                        setFeedback({ type: "error", text: "Ukuran gambar melebihi batas maksimal 3MB." });
                        event.target.value = "";
                        return;
                      }
                      const reader = new FileReader();
                      reader.onload = () => setPhotoUrl(reader.result as string);
                      reader.readAsDataURL(file);
                    }}
                  />
                </label>
              ) : (
                <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-700"><img src={photoUrl} alt="Preview kerusakan" className="max-h-64 w-full object-contain" /><button type="button" onClick={() => setPhotoUrl("")} className="absolute right-3 top-3 rounded-xl bg-slate-950/70 p-2 text-white shadow-lg hover:bg-rose-600 cursor-pointer"><X className="h-4 w-4" /></button></div>
              )}
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
              <div className="flex items-center gap-2 text-[11px] text-slate-400"><ShieldCheck className="h-4 w-4 text-emerald-500" /> Data laporan akan diperiksa oleh admin.</div>
              <button disabled={sending} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#0785BC] to-[#0aa5e0] px-7 text-sm font-black text-white shadow-lg shadow-cyan-700/20 transition hover:-translate-y-0.5 hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {sending ? "Mengirim laporan..." : "Kirim Laporan"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </UserLayout>
  );
}
