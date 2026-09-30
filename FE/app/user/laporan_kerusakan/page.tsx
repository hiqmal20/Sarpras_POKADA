"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock,
  ImagePlus,
  Loader2,
  Package,
  Send,
  ShieldCheck,
  Wrench,
  X,
} from "lucide-react";
import api from "@/lib/api";
import { UserLayout } from "@/components/user";
import { useLanguage } from "@/lib/i18n";

function statusStyle(status: string) {
  const s = status.toLowerCase();
  if (s.includes("selesai") || s.includes("diperbaiki")) {
    return {
      wrap: "bg-emerald-50 text-emerald-700 border-emerald-200",
      dot: "bg-emerald-500",
      icon: <CheckCircle2 className="w-3.5 h-3.5" />,
      label: status,
    };
  }
  if (s.includes("proses") || s.includes("perbaiki") || s.includes("diperiksa")) {
    return {
      wrap: "bg-blue-50 text-[#0785BC] border-blue-200",
      dot: "bg-[#0785BC]",
      icon: <Wrench className="w-3.5 h-3.5" />,
      label: status,
    };
  }
  if (s.includes("tolak")) {
    return {
      wrap: "bg-rose-50 text-rose-600 border-rose-200",
      dot: "bg-rose-500",
      icon: <X className="w-3.5 h-3.5" />,
      label: status,
    };
  }
  return {
    wrap: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
    icon: <Clock className="w-3.5 h-3.5" />,
    label: status,
  };
}

export default function UserDamageReportsPage() {
  const { t, lang } = useLanguage();
  const tr = (k: string, fb: string) => {
    const v = t(k);
    return v === k ? fb : v;
  };
  const dateLocale = lang === "en" ? "en-US" : "id-ID";
  const [borrowings, setBorrowings] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [borrowingId, setBorrowingId] = useState("");
  const [itemId, setItemId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const load = async () => {
    const [borrowingRes, reportRes] = await Promise.all([
      api.borrowings.getAll({ limit: 100 }),
      api.damageReports.getAll({ limit: 100 }),
    ]);
    if (borrowingRes.status === "success" && Array.isArray(borrowingRes.data)) {
      setBorrowings(
        borrowingRes.data.filter((b: any) => {
          const s = (b.status || "").toLowerCase();
          return (
            s.includes("dipinjam") ||
            s.includes("disetujui") ||
            s.includes("setuju") ||
            s.includes("kembali") ||
            s.includes("returned")
          );
        })
      );
    }
    if (reportRes.status === "success" && Array.isArray(reportRes.data)) setReports(reportRes.data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const selectedBorrowing = borrowings.find((b) => b.id === borrowingId);
  const selectedItems = selectedBorrowing?.borrowings_items || [];
  const selectedItemName = selectedItems.find(
    (row: any) => (row.item_id || row.items?.id) === itemId
  )?.items?.name;

  const stats = useMemo(() => {
    const waiting = reports.filter((r) => (r.status || "").toLowerCase().includes("tunggu")).length;
    const progress = reports.filter((r) => {
      const s = (r.status || "").toLowerCase();
      return s.includes("proses") || s.includes("perbaik");
    }).length;
    const done = reports.filter((r) => (r.status || "").toLowerCase().includes("selesai")).length;
    return { total: reports.length, waiting, progress, done };
  }, [reports]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!description.trim()) return;
    setSending(true);
    setFeedback(null);
    const result = await api.damageReports.create({
      borrowing_id: borrowingId || undefined,
      item_id: itemId || undefined,
      title: title.trim() || tr("damage.default_title", "Laporan Kerusakan Barang"),
      description: description.trim(),
      image_url: photoUrl || undefined,
      photo_url: photoUrl || undefined,
    });
    setSending(false);
    if (result.status === "success") {
      setFeedback({
        type: "success",
        text: tr("damage.success_msg", "Laporan kerusakan berhasil dikirim dan menunggu pemeriksaan admin."),
      });
      setTitle("");
      setDescription("");
      setBorrowingId("");
      setItemId("");
      setPhotoUrl("");
      load();
    } else {
      setFeedback({ type: "error", text: result.message || tr("damage.fail_msg", "Laporan gagal dikirim.") });
    }
  };

  return (
    <UserLayout showSearch={false}>
      <div className="user-page-shell w-full min-w-0 space-y-5">
        <div className="user-page-hero relative overflow-hidden rounded-[1.35rem] px-5 py-6 md:px-8 md:py-7 text-white shadow-[0_16px_38px_-18px_rgba(7,133,188,0.65)] bg-gradient-to-br from-[#0b3b60] via-[#0785BC] to-[#0aa5e0]">
          <div className="absolute inset-0 bg-[var(--card)]/10 [mask-image:radial-gradient(ellipse_at_top_right,black,transparent_65%)]" />
          <div className="absolute -right-14 top-1/2 -translate-y-1/2 hidden md:block w-52 h-52 rounded-full bg-[var(--card)]/15" />
          <div className="absolute right-28 top-1/2 -translate-y-1/2 hidden md:block w-32 h-32 rounded-full bg-[var(--card)]/10" />
          <div className="absolute -left-16 -bottom-24 w-64 h-64 rounded-full bg-[var(--card)]/10 blur-2xl" />
          <div className="relative flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[var(--card)] text-[#0785BC] flex items-center justify-center shrink-0 shadow-lg">
              <Wrench className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/80">Sarpras Pokada</p>
              <h1 className="mt-1 text-xl md:text-2xl font-extrabold tracking-tight">{tr("damage.title", "Laporan Kerusakan")}</h1>
              <p className="text-sm text-white/85 mt-1 max-w-xl">
                {tr("damage.subtitle", "Laporkan kondisi barang yang rusak atau bermasalah agar segera ditindaklanjuti admin.")}
              </p>
            </div>
            <div className="flex gap-2 shrink-0 text-xs font-bold">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--card)] px-3 py-1.5 text-slate-900 shadow-sm">
                {stats.total} {tr("damage.total", "Laporan")}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-[var(--card)]/15 px-3 py-1.5 text-white backdrop-blur">
                {stats.done} {tr("damage.done_label", "Selesai")}
              </span>
            </div>
          </div>
          <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-white/70 via-white/30 to-transparent" />
        </div>

        {feedback && (
          <div
            className={`rounded-2xl border p-4 text-sm flex items-center justify-between gap-2 ${
              feedback.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                : "bg-rose-50 border-rose-200 text-rose-700"
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.type === "success" ? (
                <CheckCircle2 className="w-5 h-5 shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 shrink-0" />
              )}
              <span>{feedback.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          {[
            { label: tr("damage.total", "Total Laporan"), value: stats.total, icon: Package, bg: "bg-blue-50 text-[#0785BC]" },
            { label: tr("damage.wait_review", "Menunggu Review"), value: stats.waiting, icon: Clock, bg: "bg-amber-50 text-amber-600" },
            { label: tr("damage.in_progress", "Sedang Diproses"), value: stats.progress, icon: Wrench, bg: "bg-violet-50 text-violet-600" },
            { label: tr("damage.done_label", "Selesai"), value: stats.done, icon: ShieldCheck, bg: "bg-emerald-50 text-emerald-600" },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.label}
                className="bg-[var(--card)] rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${s.bg}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xl font-extrabold text-slate-900 tabular-nums">{s.value}</p>
                  <p className="text-[11px] text-slate-500 font-medium truncate">{s.label}</p>
                </div>
              </div>
            );
          })}
        </div>

        {loading ? (
          <div className="bg-[var(--card)] rounded-3xl border border-slate-100 p-14 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-[#0785BC] mx-auto" />
            <p className="text-xs text-slate-400 mt-3">{tr("damage.loading", "Memuat data laporan...")}</p>
          </div>
        ) : (
          <div className="grid lg:grid-cols-[380px_minmax(0,1fr)] gap-5 items-start">
            <form
              onSubmit={submit}
              className="bg-[var(--card)] rounded-3xl border border-slate-100 shadow-sm overflow-hidden lg:sticky lg:top-6"
            >
              <div className="px-4 sm:px-6 py-4 border-b border-slate-100 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#0785BC]/10 text-[#0785BC] flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-extrabold text-slate-900">{tr("damage.form_title", "Buat Laporan Baru")}</h2>
                  <p className="text-[11px] text-slate-400">{tr("damage.form_sub", "Isi detail kerusakan dengan lengkap")}</p>
                </div>
              </div>

              <div className="p-4 sm:p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    {tr("damage.related_borrowing", "Peminjaman Terkait")}
                  </label>
                  <select
                    value={borrowingId}
                    onChange={(e) => {
                      const bId = e.target.value;
                      setBorrowingId(bId);
                      const bObj = borrowings.find((b) => b.id === bId);
                      const bItems = bObj?.borrowings_items || [];
                      if (bItems.length === 1) {
                        setItemId(bItems[0].item_id || bItems[0].items?.id || "");
                      } else {
                        setItemId("");
                      }
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 focus:bg-[var(--card)] focus:outline-none focus:ring-2 focus:ring-[#0785BC]/30 focus:border-[#0785BC] transition-all"
                  >
                    <option value="">{tr("damage.select_borrowing", "Pilih peminjaman (opsional)")}</option>
                    {borrowings.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.borrow_code} - {b.purpose || tr("damage.borrow_fallback", "Peminjaman")}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">{tr("damage.damaged_item", "Barang Rusak")}</label>
                  <select
                    value={itemId}
                    onChange={(e) => setItemId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 focus:bg-[var(--card)] focus:outline-none focus:ring-2 focus:ring-[#0785BC]/30 focus:border-[#0785BC] transition-all"
                  >
                    <option value="">{tr("damage.select_item", "Pilih barang")}</option>
                    {selectedItems.map((row: any) => (
                      <option key={row.item_id || row.items?.id} value={row.item_id || row.items?.id}>
                        {row.items?.name || tr("damage.item_fallback", "Barang")}
                      </option>
                    ))}
                  </select>
                  {selectedItemName && (
                    <p className="mt-1.5 text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> {selectedItemName} {tr("damage.selected_suffix", "terpilih")}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">{tr("damage.report_title", "Judul Laporan")}</label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={tr("damage.title_ph", "Contoh: Kabel projector rusak")}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:bg-[var(--card)] focus:outline-none focus:ring-2 focus:ring-[#0785BC]/30 focus:border-[#0785BC] transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    {tr("damage.desc_label", "Deskripsi Kerusakan")}
                  </label>
                  <textarea
                    required
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    placeholder={tr("damage.desc_ph", "Jelaskan kerusakan secara detail: bagian mana, sejak kapan, dan kronologinya...")}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 resize-none focus:bg-[var(--card)] focus:outline-none focus:ring-2 focus:ring-[#0785BC]/30 focus:border-[#0785BC] transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">{tr("damage.photo_label", "Foto Kerusakan")}</label>
                  <label className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 hover:border-[#0785BC]/50 hover:bg-blue-50/30 p-5 text-sm text-slate-500 cursor-pointer transition-all">
                    <ImagePlus className="w-5 h-5 text-[#0785BC]" />
                    <span className="font-semibold">{tr("damage.photo_cta", "Klik untuk pilih foto")}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = () => setPhotoUrl(reader.result as string);
                        reader.readAsDataURL(file);
                      }}
                    />
                  </label>
                  {photoUrl && (
                    <div className="relative mt-2 rounded-xl overflow-hidden border border-slate-200">
                      <img src={photoUrl} alt={tr("damage.photo_alt", "Preview kerusakan")} className="w-full h-40 object-cover" />
                      <button
                        type="button"
                        onClick={() => setPhotoUrl("")}
                        className="absolute top-2 right-2 rounded-full bg-[var(--card)]/95 p-1.5 text-slate-600 hover:text-rose-600 shadow cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                <button
                  disabled={sending}
                  className="w-full rounded-xl bg-[#0785BC] hover:bg-[#0672a0] active:scale-[0.99] text-white py-3 text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-all cursor-pointer shadow-sm"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {sending ? tr("damage.sending", "Mengirim...") : tr("damage.submit", "Kirim Laporan")}
                </button>
              </div>
            </form>

            <div className="space-y-4 min-w-0">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-extrabold text-slate-900">
                  {tr("damage.history_title", "Riwayat Laporan")} <span className="text-slate-400 font-semibold">({reports.length})</span>
                </h2>
              </div>

              {reports.length === 0 ? (
                <div className="bg-[var(--card)] rounded-3xl border border-slate-100 p-14 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-3">
                    <Package className="w-7 h-7 text-slate-300" />
                  </div>
                  <p className="text-sm font-bold text-slate-600">{tr("damage.empty_title", "Belum ada laporan kerusakan")}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {tr("damage.empty_sub", "Laporan yang Anda kirim akan tampil di sini.")}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reports.map((report) => {
                    const st = statusStyle(report.status || tr("damage.wait_review", "Menunggu Review"));
                    const img = report.image_url || report.photo_url;
                    return (
                      <article
                        key={report.id}
                        className="bg-[var(--card)] rounded-3xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                      >
                        <div className="p-5">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 min-w-0">
                              <div className="w-10 h-10 rounded-xl bg-[#0785BC]/10 text-[#0785BC] flex items-center justify-center shrink-0">
                                <AlertTriangle className="w-5 h-5" />
                              </div>
                              <div className="min-w-0">
                                <h3 className="text-sm font-extrabold text-slate-900 leading-snug">
                                  {report.title || tr("damage.report_fallback", "Laporan Kerusakan")}
                                </h3>
                                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                                  <Package className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  <span className="truncate">{report.items?.name || tr("damage.related_borrowing", "Barang terkait")}</span>
                                </p>
                              </div>
                            </div>
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border shrink-0 ${st.wrap}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                              {st.icon}
                              {st.label}
                            </span>
                          </div>

                          <p className="text-[13px] leading-relaxed text-slate-600 mt-3">
                            {report.description || tr("damage.no_desc", "Tidak ada deskripsi.")}
                          </p>

                          {img && (
                            <div className="mt-3 rounded-2xl overflow-hidden border border-slate-100 bg-slate-50">
                              <img
                                src={img}
                                alt={tr("damage.photo_damage_alt", "Foto kerusakan")}
                                className="w-full h-48 object-cover"
                              />
                            </div>
                          )}

                          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                            <span className="inline-flex items-center gap-1.5">
                              <CalendarDays className="w-3.5 h-3.5" />
                              {report.created_at
                                ? new Date(report.created_at).toLocaleString(dateLocale, {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : "-"}
                            </span>
                            {report.borrowing_id && (
                              <span className="inline-flex items-center gap-0.5 font-bold text-[#0785BC]">
                                {tr("damage.detail", "Detail")} <ChevronRight className="w-3.5 h-3.5" />
                              </span>
                            )}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </UserLayout>
  );
}
