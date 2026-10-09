"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Package,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  X,
  Clock,
  RotateCcw,
  ShieldCheck,
  MessageSquare,
  IdCard,
  CalendarDays,
  Search,
  ExternalLink,
  ChevronRight,
  Sparkles,
  ClipboardCheck,
  AlertCircle,
  HelpCircle,
  Calendar,
  Layers,
  Send,
  Eye,
  Check,
} from "lucide-react";
import api from "@/lib/api";
import { UserLayout } from "@/components/user";
import { useLanguage } from "@/lib/i18n";

interface ReturnRequest {
  borrowing_id: string;
  borrow_code: string;
  planned_date: string;
  condition: string;
  note: string;
  created_at: string;
}

const LS_KEY = "return_requests_v1";

function loadRequests(): ReturnRequest[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function isOverdue(b: any) {
  if (!b.planned_return_date && !b.return_date) return false;
  const dateStr = b.planned_return_date || b.return_date;
  return new Date(dateStr).getTime() < Date.now() - 12 * 60 * 60 * 1000;
}

function getDaysRemaining(b: any) {
  const targetDate = b.planned_return_date || b.return_date;
  if (!targetDate) return null;
  const target = new Date(targetDate).getTime();
  const now = Date.now();
  const diffDays = Math.ceil((target - now) / (1000 * 60 * 60 * 24));
  return diffDays;
}

export default function UserReturnPage() {
  const { t, lang } = useLanguage();
  const tr = (k: string, fb: string) => {
    const v = t(k);
    return v === k ? fb : v;
  };

  const [borrowings, setBorrowings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [serverRequests, setServerRequests] = useState<any[]>([]);
  const [localRequests, setLocalRequests] = useState<ReturnRequest[]>([]);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "unrequested" | "waiting" | "overdue">("all");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBorrowing, setSelectedBorrowing] = useState<any>(null);
  const [condition, setCondition] = useState<"Baik" | "Rusak Ringan" | "Rusak Berat">("Baik");
  const [notes, setNotes] = useState("");
  const [planDate, setPlanDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);

  const locale = lang === "en" ? "en-US" : "id-ID";

  const load = async () => {
    try {
      const [res, requestRes] = await Promise.all([
        api.borrowings.getAll({ limit: 50 }),
        api.returnRequests.getAll(),
      ]);

      if (requestRes.status === "success" && Array.isArray(requestRes.data)) {
        setServerRequests(requestRes.data);
      }

      if (res.status === "success" && Array.isArray(res.data)) {
        const active = res.data.filter((b: any) => {
          const s = (b.status || "").toLowerCase();
          return (
            s.includes("dipinjam") ||
            s.includes("setuju") ||
            s.includes("approved") ||
            s.includes("aktif")
          );
        });
        setBorrowings(active);
      }
      setLoading(false);
    } catch (error) {
      console.error("Gagal memuat halaman pengembalian:", error);
      setLoading(false);
      setFeedback({
        type: "error",
        text: "Data pengembalian belum dapat dimuat dari server.",
      });
    }
  };

  useEffect(() => {
    setLocalRequests(loadRequests());
    load();
    const timer = setInterval(load, 30000);
    return () => clearInterval(timer);
  }, []);

  // Map pengajuan kembali yang aktif berdasarkan borrowing_id
  const returnRequestsMap = useMemo(() => {
    const map = new Map<string, any>();
    // Gabungkan serverRequests dan localRequests
    serverRequests.forEach((req) => {
      if (req.borrowing_id) map.set(req.borrowing_id, req);
    });
    localRequests.forEach((req) => {
      if (!map.has(req.borrowing_id)) {
        map.set(req.borrowing_id, req);
      }
    });
    return map;
  }, [serverRequests, localRequests]);

  const stats = useMemo(() => {
    const active = borrowings.length;
    const late = borrowings.filter(isOverdue).length;
    const waiting = borrowings.filter((b) => returnRequestsMap.has(b.id)).length;
    const returned = serverRequests.filter((r) =>
      ["returned", "completed", "selesai", "dikembalikan"].some((s) =>
        String(r.status || "").toLowerCase().includes(s)
      )
    ).length;
    return { active, late, waiting, returned };
  }, [borrowings, serverRequests, returnRequestsMap]);

  // Filtered borrowings list
  const filteredBorrowings = useMemo(() => {
    return borrowings.filter((b) => {
      const firstItem = b.borrowings_items?.[0]?.items || b.borrowings_items?.[0]?.item;
      const itemName = firstItem?.name || "";
      const purpose = b.purpose || "";
      const code = b.borrow_code || "";

      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        itemName.toLowerCase().includes(query) ||
        purpose.toLowerCase().includes(query) ||
        code.toLowerCase().includes(query);

      if (!matchesSearch) return false;

      const hasRequest = returnRequestsMap.has(b.id);
      const late = isOverdue(b);

      if (activeTab === "unrequested") return !hasRequest;
      if (activeTab === "waiting") return hasRequest;
      if (activeTab === "overdue") return late;
      return true;
    });
  }, [borrowings, searchQuery, activeTab, returnRequestsMap]);

  // Buka modal untuk peminjaman tertentu
  const handleOpenModal = (b: any) => {
    setSelectedBorrowing(b);
    setFeedback(null);

    // Jika sudah ada data pengajuan sebelumnya, prefill form
    const existingReq = returnRequestsMap.get(b.id);
    if (existingReq) {
      setPlanDate(existingReq.planned_date || existingReq.planned_return_date || new Date().toISOString().slice(0, 10));
      setCondition((existingReq.condition as any) || "Baik");
      setNotes(existingReq.note || "");
    } else {
      setPlanDate(new Date().toISOString().slice(0, 10));
      setCondition("Baik");
      setNotes("");
    }

    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (submitting) return;
    setIsModalOpen(false);
    setSelectedBorrowing(null);
  };

  // Helper kirim chat notifikasi ke petugas loket
  async function notifyPetugas(b: any, payload: { planned: string; cond: string; note: string }) {
    const text =
      `Pengajuan Siap Kembali\n` +
      `Kode: ${b.borrow_code || "-"}\n` +
      `Barang: ${(b.borrowings_items?.[0]?.items?.name) || b.purpose || "-"}\n` +
      `Rencana kembali: ${payload.planned}\n` +
      `Kondisi menurut peminjam: ${payload.cond}\n` +
      (payload.note ? `Catatan: ${payload.note}\n` : "") +
      `Mohon verifikasi fisik di loket (REQ-RET-02).`;

    try {
      const list = await api.chats.getAll();
      let chatId: string | null = null;
      if (list.status === "success" && Array.isArray(list.data) && list.data.length > 0) {
        chatId = list.data[0].id;
      } else {
        const created = await api.chats.create({ subject: "Pengajuan Pengembalian Barang" });
        if (created.status === "success" && created.data?.id) chatId = created.data.id;
      }
      if (chatId) await api.chats.sendMessage(chatId, { message: text });
    } catch {
      // offline/abaikan error chat
    }
  }

  // Submit pengajuan via modal
  const handleSubmitReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBorrowing) return;

    setSubmitting(true);
    setFeedback(null);

    const payload = { planned: planDate, cond: condition, note: notes.trim() };

    try {
      const result = await api.returnRequests.create({
        borrowing_id: selectedBorrowing.id,
        planned_return_date: planDate,
        condition,
        note: notes.trim(),
      });

      if (result.status !== "success") {
        setSubmitting(false);
        setFeedback({
          type: "error",
          text: result.message || tr("return.fail_msg", "Permintaan gagal dikirim ke server."),
        });
        setIsModalOpen(false);
        return;
      }

      await notifyPetugas(selectedBorrowing, payload);

      const entry: ReturnRequest = {
        borrowing_id: selectedBorrowing.id,
        borrow_code: selectedBorrowing.borrow_code || "-",
        planned_date: payload.planned,
        condition: payload.cond,
        note: payload.note,
        created_at: new Date().toISOString(),
      };

      const next = [entry, ...localRequests.filter((r) => r.borrowing_id !== selectedBorrowing.id)];
      setLocalRequests(next);
      try {
        localStorage.setItem(LS_KEY, JSON.stringify(next));
      } catch {}

      setSubmitting(false);
      setIsModalOpen(false);
      setFeedback({
        type: "success",
        text: `Pengajuan kesiapan kembali untuk kode ${selectedBorrowing.borrow_code} berhasil dikirim! Silakan bawa barang dan KTM Anda ke loket Sarpras untuk verifikasi fisik.`,
      });

      // Reload data
      load();
    } catch (err: any) {
      setSubmitting(false);
      setFeedback({
        type: "error",
        text: err?.message || "Terjadi kesalahan saat memproses pengajuan.",
      });
      setIsModalOpen(false);
    }
  };

  // Quick preset helper tanggal
  const setQuickDate = (daysFromNow: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysFromNow);
    setPlanDate(d.toISOString().slice(0, 10));
  };

  return (
    <UserLayout showSearch={false}>
      <div className="user-page-shell w-full min-w-0 space-y-6 pb-12">
        {/* ── HERO BANNER ── */}
        <div className="relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-[#072d4a] via-[#095782] to-[#0284c7] p-6 text-white shadow-[0_20px_50px_-20px_rgba(2,132,199,0.5)] md:p-8">
          <div className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" />
          <div className="pointer-events-none absolute right-40 -bottom-20 h-64 w-64 rounded-full bg-blue-500/15 blur-2xl" />
          <div className="pointer-events-none absolute -left-12 -bottom-16 h-48 w-48 rounded-full bg-white/10 blur-xl" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4 md:items-center">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-white shadow-inner backdrop-blur-md ring-1 ring-white/30">
                <RotateCcw className="h-7 w-7 text-cyan-200" />
              </div>
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-0.5 text-[11px] font-bold tracking-widest text-cyan-200 uppercase backdrop-blur-sm">
                  <Sparkles className="h-3 w-3" />
                  <span>SARPRAS POKADA</span>
                </div>
                <h1 className="text-2xl font-black tracking-tight text-white md:text-3xl">
                  {tr("return.title", "Pengembalian Barang")}
                </h1>
                <p className="max-w-xl text-xs text-cyan-100/90 md:text-sm">
                  {tr(
                    "return.subtitle",
                    "Ajukan kesiapan pengembalian secara online, lalu selesaikan pengecekan fisik langsung di loket Sarpras."
                  )}
                </p>
              </div>
            </div>

            {/* Metrics pills */}
            <div className="grid grid-cols-2 gap-2.5 sm:flex sm:flex-wrap sm:items-center">
              <div className="flex items-center gap-2.5 rounded-2xl bg-white/90 px-4 py-2.5 text-slate-900 shadow-md backdrop-blur dark:bg-slate-900/90 dark:text-white">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-100 text-[#0785BC] dark:bg-cyan-950 dark:text-cyan-300">
                  <Package className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                    Aktif
                  </p>
                  <p className="text-sm font-extrabold leading-none">{stats.active}</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 rounded-2xl border border-white/20 bg-white/10 px-4 py-2.5 text-white backdrop-blur">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-400/20 text-amber-300">
                  <Clock className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-white/70">Menunggu Loket</p>
                  <p className="text-sm font-extrabold leading-none">{stats.waiting}</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 rounded-2xl border border-white/20 bg-white/10 px-4 py-2.5 text-white backdrop-blur">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-400/20 text-rose-300">
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-white/70">Terlambat</p>
                  <p className="text-sm font-extrabold leading-none">{stats.late}</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 rounded-2xl border border-white/20 bg-white/10 px-4 py-2.5 text-white backdrop-blur">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-400/20 text-emerald-300">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-white/70">Selesai</p>
                  <p className="text-sm font-extrabold leading-none">{stats.returned}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── STEPPER ALUR PENGEMBALIAN ── */}
        <div className="relative rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <ClipboardCheck className="h-4 w-4 text-[#0785BC]" />
              Alur Pengembalian Barang
            </h2>
            <span className="text-[11px] font-semibold text-[#0785BC]">
              4 Langkah Mudah
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                step: "01",
                title: "Pilih Peminjaman",
                desc: "Pilih barang aktif yang ingin dikembalikan dari daftar di bawah.",
                icon: Package,
              },
              {
                step: "02",
                title: "Isi Modal Kesiapan",
                desc: "Klik tombol 'Ajukan', isi estimasi kondisi dan tanggal rencana.",
                icon: CalendarDays,
              },
              {
                step: "03",
                title: "Kirim ke Petugas",
                desc: "Data pengajuan tersimpan & notifikasi otomatis dikirim ke loket.",
                icon: MessageSquare,
              },
              {
                step: "04",
                title: "Cek Fisik di Loket",
                desc: "Bawa KTM & unit ke loket Sarpras. Petugas memverifikasi status selesai.",
                icon: IdCard,
              },
            ].map((s, idx) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.step}
                  className="group relative flex items-start gap-3.5 rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 transition-all hover:border-[#0785BC]/30 hover:bg-[#0785BC]/5 dark:border-slate-800 dark:bg-slate-800/50 dark:hover:bg-slate-800"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white font-mono text-xs font-black text-[#0785BC] shadow-sm ring-1 ring-slate-200/60 dark:bg-slate-700 dark:text-cyan-300 dark:ring-slate-600">
                    {s.step}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                      <Icon className="h-3.5 w-3.5 text-[#0785BC]" />
                      {s.title}
                    </p>
                    <p className="mt-1 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                      {s.desc}
                    </p>
                  </div>
                  {idx < 3 && (
                    <div className="pointer-events-none absolute -right-2 top-1/2 hidden -translate-y-1/2 lg:block">
                      <ChevronRight className="h-4 w-4 text-slate-300 dark:text-slate-600" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── NOTIFIKASI FEEDBACK ── */}
        {feedback && (
          <div
            className={`flex items-start justify-between gap-3 rounded-2xl border p-4 text-sm shadow-sm transition-all ${
              feedback.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300"
                : "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300"
            }`}
          >
            <div className="flex items-center gap-3">
              {feedback.type === "success" ? (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
              ) : (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600 dark:bg-rose-900">
                  <AlertTriangle className="h-5 w-5" />
                </div>
              )}
              <span className="font-medium">{feedback.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-200/50 hover:text-slate-600 dark:hover:bg-slate-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* ── TOOLBAR PENCARIAN & FILTER TAB ── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Tab Filter */}
          <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-slate-200/80 bg-white p-1.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <button
              onClick={() => setActiveTab("all")}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                activeTab === "all"
                  ? "bg-[#0785BC] text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              Semua ({borrowings.length})
            </button>
            <button
              onClick={() => setActiveTab("unrequested")}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                activeTab === "unrequested"
                  ? "bg-[#0785BC] text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              Belum Diajukan ({borrowings.filter((b) => !returnRequestsMap.has(b.id)).length})
            </button>
            <button
              onClick={() => setActiveTab("waiting")}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                activeTab === "waiting"
                  ? "bg-[#0785BC] text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              Menunggu Loket ({stats.waiting})
            </button>
            <button
              onClick={() => setActiveTab("overdue")}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                activeTab === "overdue"
                  ? "bg-rose-600 text-white shadow-sm"
                  : "text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
              }`}
            >
              Terlambat ({stats.late})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari kode, nama barang..."
              className="h-10 w-full rounded-2xl border border-slate-200/80 bg-white pl-9 pr-8 text-xs font-medium text-slate-800 placeholder:text-slate-400 shadow-sm transition-all focus:border-[#0785BC] focus:outline-none focus:ring-2 focus:ring-[#0785BC]/20 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* ── DAFTAR PEMINJAMAN AKTIF (MODERN CARDS) ── */}
        {loading ? (
          <div className="rounded-3xl border border-slate-200/80 bg-white p-16 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#0785BC]" />
            <p className="mt-3 text-xs font-bold text-slate-500 dark:text-slate-400">
              Memuat data peminjaman aktif...
            </p>
          </div>
        ) : filteredBorrowings.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white/60 p-12 text-center backdrop-blur dark:border-slate-800 dark:bg-slate-900/60">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
              <Package className="h-7 w-7" />
            </div>
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
              {searchQuery
                ? "Tidak ada peminjaman yang cocok dengan pencarian"
                : activeTab !== "all"
                ? "Tidak ada data pada kategori filter ini"
                : "Tidak ada peminjaman aktif saat ini"}
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              {searchQuery
                ? "Coba gunakan kata kunci lain atau bersihkan pencarian."
                : "Semua peminjaman Anda sudah dikembalikan atau belum diajukan."}
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
              >
                Reset Pencarian
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {filteredBorrowings.map((b) => {
              const itemRows = b.borrowings_items || b.borrowing_items || [];
              const firstItemObj = itemRows[0]?.items || itemRows[0]?.item;
              const extraCount = Math.max(0, itemRows.length - 1);
              const title = firstItemObj?.name
                ? `${firstItemObj.name}${
                    extraCount > 0 ? ` + ${extraCount} item lain` : ""
                  }`
                : b.purpose || "Peminjaman Barang";

              const itemImage =
                firstItemObj?.foto ||
                firstItemObj?.image ||
                firstItemObj?.image_url ||
                b.packages?.foto ||
                null;

              const existingReq = returnRequestsMap.get(b.id);
              const isWaiting = !!existingReq;
              const late = isOverdue(b);
              const daysRem = getDaysRemaining(b);

              const borrowDateFormatted = b.borrow_date
                ? new Date(b.borrow_date).toLocaleDateString(locale, {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })
                : "-";

              const plannedDateFormatted = (b.planned_return_date || b.return_date)
                ? new Date(b.planned_return_date || b.return_date).toLocaleDateString(locale, {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })
                : "-";

              return (
                <div
                  key={b.id}
                  className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all hover:border-[#0785BC]/40 hover:shadow-[0_12px_30px_-10px_rgba(7,133,188,0.18)] dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="space-y-4">
                    {/* Header Card: Code & Status Badges */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold tracking-tight text-slate-800 dark:text-slate-200">
                          {b.borrow_code}
                        </span>
                        {b.packages && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-700 ring-1 ring-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:ring-purple-800">
                            <Layers className="h-2.5 w-2.5" />
                            Paket
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        {late && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-[11px] font-extrabold text-rose-700 ring-1 ring-rose-200/80 dark:bg-rose-950/60 dark:text-rose-300 dark:ring-rose-800">
                            <AlertTriangle className="h-3 w-3" />
                            Terlambat
                          </span>
                        )}

                        {isWaiting ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-700 ring-1 ring-amber-200/80 dark:bg-amber-950/60 dark:text-amber-300 dark:ring-amber-800">
                            <Clock className="h-3 w-3 animate-spin-slow" />
                            Menunggu Verifikasi
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-bold text-[#0785BC] ring-1 ring-[#0785BC]/20 dark:bg-blue-950/60 dark:text-cyan-300 dark:ring-blue-800">
                            <CheckCircle2 className="h-3 w-3" />
                            Aktif
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Body Card: Thumbnail, Title, Details */}
                    <div className="flex items-start gap-4">
                      <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-50 dark:border-slate-800 dark:bg-slate-800">
                        {itemImage ? (
                          <img
                            src={itemImage}
                            alt={title}
                            className="h-full w-full object-cover transition-transform group-hover:scale-105"
                          />
                        ) : (
                          <Package className="h-8 w-8 text-[#0785BC]" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="line-clamp-1 text-sm font-black text-slate-900 group-hover:text-[#0785BC] dark:text-white">
                          {title}
                        </h3>
                        {b.purpose && (
                          <p className="mt-0.5 line-clamp-1 text-xs text-slate-500 dark:text-slate-400">
                            Keperluan: {b.purpose}
                          </p>
                        )}

                        <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-slate-400" />
                            Pinjam: {borrowDateFormatted}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3 w-3 text-slate-400" />
                            Batas: {plannedDateFormatted}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Jika sudah mengajukan kesiapan kembali, tampilkan ringkasan status pengajuan */}
                    {isWaiting && (
                      <div className="rounded-2xl border border-amber-200/80 bg-amber-50/70 p-3 text-xs dark:border-amber-900/50 dark:bg-amber-950/30">
                        <div className="flex items-center justify-between text-amber-900 dark:text-amber-200">
                          <span className="font-bold flex items-center gap-1.5">
                            <CalendarDays className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                            Rencana Kembali: {existingReq.planned_date || existingReq.planned_return_date}
                          </span>
                          <span className="font-semibold rounded-md bg-amber-100 px-2 py-0.5 text-[10px] text-amber-800 dark:bg-amber-900 dark:text-amber-300">
                            Kondisi: {existingReq.condition}
                          </span>
                        </div>
                        {existingReq.note && (
                          <p className="mt-1.5 text-[11px] text-amber-800/90 dark:text-amber-300/80 italic">
                            &ldquo;{existingReq.note}&rdquo;
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Footer Card: Actions Button */}
                  <div className="mt-5 flex items-center justify-between gap-2 border-t border-slate-100 pt-3.5 dark:border-slate-800">
                    <Link
                      href={`/user/peminjaman/${b.id}`}
                      className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-[#0785BC] dark:text-slate-400 dark:hover:text-cyan-300"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Detail
                    </Link>

                    <button
                      onClick={() => handleOpenModal(b)}
                      className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-extrabold shadow-sm transition-all cursor-pointer ${
                        isWaiting
                          ? "border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-200"
                          : "bg-gradient-to-r from-[#0785BC] to-[#0aa5e0] text-white hover:brightness-105 hover:shadow-md"
                      }`}
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      {isWaiting ? "Ubah Rencana Kembali" : "Ajukan Pengembalian"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── RIWAYAT PENGAJUAN KESIAPAN SAYA ── */}
        {localRequests.length > 0 && (
          <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  Riwayat Pengajuan Kesiapan Kembali
                </h3>
                <p className="text-xs text-slate-400">
                  Daftar kesiapan pengembalian yang pernah Anda kirimkan ke petugas.
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {localRequests.length} Pengajuan
              </span>
            </div>

            <div className="space-y-2.5">
              {localRequests.map((r) => {
                const stillActive = borrowings.some((b) => b.id === r.borrowing_id);
                const matchingBorrowing = borrowings.find((b) => b.id === r.borrowing_id);

                return (
                  <div
                    key={r.borrowing_id}
                    className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-800/40"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200/60 dark:bg-slate-800 dark:ring-slate-700">
                        <Package className="h-5 w-5 text-[#0785BC]" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-mono text-xs font-black text-slate-900 dark:text-white">
                          {r.borrow_code}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Rencana Kembali:{" "}
                          <span className="font-bold text-slate-700 dark:text-slate-300">
                            {r.planned_date}
                          </span>{" "}
                          · Kondisi:{" "}
                          <span className="font-bold text-slate-700 dark:text-slate-300">
                            {r.condition}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {stillActive ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-[11px] font-bold text-amber-700 ring-1 ring-amber-200/80 dark:bg-amber-950/60 dark:text-amber-300 dark:ring-amber-800">
                          <Clock className="h-3 w-3" />
                          Menunggu Verifikasi Loket
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-700 ring-1 ring-emerald-200/80 dark:bg-emerald-950/60 dark:text-emerald-300 dark:ring-emerald-800">
                          <CheckCircle2 className="h-3 w-3" />
                          Selesai Diverifikasi
                        </span>
                      )}

                      {stillActive && matchingBorrowing && (
                        <button
                          onClick={() => handleOpenModal(matchingBorrowing)}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
                        >
                          Ubah
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── CARD INFORMASI & TATA CARA LOKET SARPRAS ── */}
        <div className="relative overflow-hidden rounded-3xl bg-slate-900 p-6 text-white shadow-lg dark:bg-[#0b1220]">
          <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-[#0785BC]/20 blur-2xl" />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-emerald-400">
                <IdCard className="h-5 w-5" />
                <h3 className="text-sm font-black uppercase tracking-wider">
                  Verifikasi Fisik Wajib di Loket Sarpras
                </h3>
              </div>
              <p className="max-w-2xl text-xs text-slate-300 leading-relaxed">
                Pengisian form online ini bertujuan memudahkan pendataan kesiapan Anda dan antrean petugas.
                Status peminjaman resmi berubah menjadi <b>Selesai</b> setelah unit dicek fisiknya secara langsung di loket Sarpras (bawa KTM asli & kelengkapan unit).
              </p>
            </div>

            <Link
              href="/user/messages"
              className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-white px-5 py-3 text-xs font-black text-slate-900 shadow transition-transform hover:scale-105 active:scale-95"
            >
              <MessageSquare className="h-4 w-4 text-[#0785BC]" />
              Chat Petugas Loket
            </Link>
          </div>
        </div>

        {/* ── MODAL FORMULIR KESIAPAN KEMBALI ── */}
        {isModalOpen && selectedBorrowing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            {/* Backdrop blur */}
            <div
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-md transition-opacity animate-fade-in"
              onClick={handleCloseModal}
            />

            {/* Modal Dialog Card */}
            <div className="relative z-10 my-4 max-h-[86vh] w-full max-w-lg overflow-hidden rounded-3xl border border-white/20 bg-white shadow-2xl transition-all dark:border-slate-800 dark:bg-slate-900">
              {/* Modal Top Header */}
              <div className="relative overflow-hidden bg-gradient-to-r from-[#0785BC] to-[#0aa5e0] px-6 py-5 text-white">
                <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/10 blur-lg" />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/20 shadow-inner backdrop-blur ring-1 ring-white/30">
                      <RotateCcw className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-base font-black leading-tight text-white">
                        Form Kesiapan Pengembalian
                      </h3>
                      <p className="font-mono text-xs font-bold text-cyan-100">
                        {selectedBorrowing.borrow_code}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleCloseModal}
                    disabled={submitting}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/25 active:scale-95 cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Modal Form Content */}
              <form onSubmit={handleSubmitReturn} className="max-h-[calc(86vh-86px)] overflow-y-auto p-6 space-y-5">
                {/* Snapshot barang yang dipilih */}
                <div className="flex items-center gap-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-800/60">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-[#0785BC] shadow-sm dark:bg-slate-700">
                    <Package className="h-6 w-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-xs font-black text-slate-900 dark:text-white">
                      {selectedBorrowing.borrowings_items?.[0]?.items?.name ||
                        selectedBorrowing.purpose ||
                        "Item Peminjaman"}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Dipinjam sejak:{" "}
                      {selectedBorrowing.borrow_date
                        ? new Date(selectedBorrowing.borrow_date).toLocaleDateString(locale)
                        : "-"}
                    </p>
                  </div>
                </div>

                {/* 1. Rencana Tanggal Kembali */}
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                      Rencana Tanggal Pengembalian
                    </label>
                    <span className="text-[11px] font-semibold text-slate-400">
                      Pilih Estimasi
                    </span>
                  </div>

                  <input
                    type="date"
                    required
                    value={planDate}
                    onChange={(e) => setPlanDate(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-800 shadow-sm transition-all focus:border-[#0785BC] focus:outline-none focus:ring-2 focus:ring-[#0785BC]/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />

                  {/* Preset quick buttons */}
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setQuickDate(0)}
                      className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:bg-[#0785BC]/10 hover:text-[#0785BC] dark:bg-slate-800 dark:text-slate-300 cursor-pointer"
                    >
                      Hari Ini
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickDate(1)}
                      className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:bg-[#0785BC]/10 hover:text-[#0785BC] dark:bg-slate-800 dark:text-slate-300 cursor-pointer"
                    >
                      Besok
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickDate(2)}
                      className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:bg-[#0785BC]/10 hover:text-[#0785BC] dark:bg-slate-800 dark:text-slate-300 cursor-pointer"
                    >
                      Lusa
                    </button>
                  </div>
                </div>

                {/* 2. Estimasi Kondisi Barang (Modern 3 Card Selector) */}
                <div>
                  <label className="mb-2 block text-xs font-extrabold text-slate-800 dark:text-slate-200">
                    Estimasi Kondisi Barang Saat Ini
                  </label>

                  <div className="grid grid-cols-3 gap-2.5">
                    {[
                      {
                        val: "Baik",
                        label: "Baik",
                        sub: "Normal & Utuh",
                        color: "emerald",
                        icon: CheckCircle2,
                      },
                      {
                        val: "Rusak Ringan",
                        label: "Rusak Ringan",
                        sub: "Lecet / Minor",
                        color: "amber",
                        icon: AlertTriangle,
                      },
                      {
                        val: "Rusak Berat",
                        label: "Rusak Berat",
                        sub: "Mati / Patah",
                        color: "rose",
                        icon: AlertCircle,
                      },
                    ].map((item) => {
                      const isSelected = condition === item.val;
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.val}
                          type="button"
                          onClick={() => setCondition(item.val as any)}
                          className={`relative flex flex-col items-center justify-center rounded-2xl border p-3 text-center transition-all cursor-pointer ${
                            isSelected
                              ? item.color === "emerald"
                                ? "border-emerald-500 bg-emerald-50/80 text-emerald-900 ring-2 ring-emerald-500/20 dark:bg-emerald-950/50 dark:text-emerald-200"
                                : item.color === "amber"
                                ? "border-amber-500 bg-amber-50/80 text-amber-900 ring-2 ring-amber-500/20 dark:bg-amber-950/50 dark:text-amber-200"
                                : "border-rose-500 bg-rose-50/80 text-rose-900 ring-2 ring-rose-500/20 dark:bg-rose-950/50 dark:text-rose-200"
                              : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                          }`}
                        >
                          <Icon
                            className={`mb-1.5 h-5 w-5 ${
                              isSelected
                                ? item.color === "emerald"
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : item.color === "amber"
                                  ? "text-amber-600 dark:text-amber-400"
                                  : "text-rose-600 dark:text-rose-400"
                                : "text-slate-400"
                            }`}
                          />
                          <span className="text-xs font-black">{item.label}</span>
                          <span className="text-[10px] opacity-75">{item.sub}</span>
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-1.5 text-[11px] text-slate-400">
                    *Penetapan kondisi final dilakukan bersama petugas saat cek fisik di loket.
                  </p>
                </div>

                {/* 3. Catatan untuk Petugas Loket */}
                <div>
                  <label className="mb-2 block text-xs font-extrabold text-slate-800 dark:text-slate-200">
                    Catatan untuk Petugas (Opsional)
                  </label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Contoh: Kabel sudah digulung rapi, tas lengkap, siap dicek pukul 10.00..."
                    className="w-full resize-none rounded-2xl border border-slate-200 bg-white p-3 text-xs text-slate-800 placeholder:text-slate-400 shadow-sm transition-all focus:border-[#0785BC] focus:outline-none focus:ring-2 focus:ring-[#0785BC]/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {[
                      "Kabel & aksesoris lengkap",
                      "Siap dicek pagi hari",
                      "Kondisi mulus",
                    ].map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        onClick={() =>
                          setNotes((prev) => (prev ? `${prev}, ${chip}` : chip))
                        }
                        className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 cursor-pointer"
                      >
                        + {chip}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Info Note Loket */}
                <div className="rounded-2xl border border-cyan-200/80 bg-cyan-50/70 p-3 text-[11px] text-cyan-900 dark:border-cyan-900/60 dark:bg-cyan-950/40 dark:text-cyan-200">
                  <p className="flex items-start gap-2">
                    <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#0785BC]" />
                    <span>
                      Pengajuan ini memberi notifikasi kesiapan kepada petugas loket Sarpras. Jangan lupa membawa KTM & barang ke loket saat jam operasional.
                    </span>
                  </p>
                </div>

                {/* Modal Action Buttons */}
                <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleCloseModal}
                    className="rounded-xl px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    Batal
                  </button>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#0785BC] to-[#0aa5e0] px-5 py-2.5 text-xs font-black text-white shadow-md transition-all hover:brightness-105 active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Mengirim Pengajuan...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        Kirim Pengajuan ke Petugas
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </UserLayout>
  );
}
