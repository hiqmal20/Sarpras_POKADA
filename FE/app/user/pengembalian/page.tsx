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
  ChevronRight,
  RotateCcw,
  ShieldCheck,
  MessageSquare,
  IdCard,
  Info,
  CalendarDays,
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
  if (!b.planned_return_date) return false;
  return new Date(b.planned_return_date).getTime() < Date.now() - 12 * 60 * 60 * 1000;
}

export default function UserReturnPage() {
  const { t, lang } = useLanguage();
  const tr = (k: string, fb: string) => { const v = t(k); return v === k ? fb : v; };
  const [borrowings, setBorrowings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [condition, setCondition] = useState("Baik");
  const [notes, setNotes] = useState("");
  const [planDate, setPlanDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [sending, setSending] = useState(false);
  const [requests, setRequests] = useState<ReturnRequest[]>([]);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [serverRequests, setServerRequests] = useState<any[]>([]);
  const locale = lang === "en" ? "en-US" : "id-ID";

  const load = async () => {
    const [res, requestRes] = await Promise.all([
      api.borrowings.getAll({ limit: 50 }),
      api.returnRequests.getAll(),
    ]);
    if (requestRes.status === "success" && Array.isArray(requestRes.data)) setServerRequests(requestRes.data);
    if (res.status === "success" && Array.isArray(res.data)) {
      const active = res.data.filter((b: any) => {
        const s = (b.status || "").toLowerCase();
        return s.includes("dipinjam") || s.includes("setuju") || s.includes("approved") || s.includes("aktif");
      });
      setBorrowings(active);
      setSelected((prev: any) => (prev ? active.find((b: any) => b.id === prev.id) || null : prev));
    }
    setLoading(false);
  };

  useEffect(() => {
    setRequests(loadRequests());
    load();
    const timer = setInterval(load, 30000);
    return () => clearInterval(timer);
  }, []);

  const stats = useMemo(() => {
    const late = borrowings.filter(isOverdue).length;
    const returned = serverRequests.filter((r) => ["returned", "completed", "selesai", "dikembalikan"].some((s) => String(r.status || "").toLowerCase().includes(s))).length;
    return { active: borrowings.length, late, returned };
  }, [borrowings, serverRequests]);

  /* Pengembalian dilakukan langsung di loket Sarpras; halaman ini hanya informasi. */
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
      // offline: pengajuan lokal tetap tersimpan
    }
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setSending(true);
    setFeedback(null);
    const payload = { planned: planDate, cond: condition, note: notes.trim() };
    const result = await api.returnRequests.create({
      borrowing_id: selected.id,
      planned_return_date: planDate,
      condition,
      note: notes.trim(),
    });
    if (result.status !== "success") {
      setSending(false);
      setFeedback({ type: "error", text: result.message || tr("return.fail_msg", "Permintaan gagal dikirim.") });
      return;
    }
    await notifyPetugas(selected, payload);
    const entry: ReturnRequest = {
      borrowing_id: selected.id,
      borrow_code: selected.borrow_code || "-",
      planned_date: payload.planned,
      condition: payload.cond,
      note: payload.note,
      created_at: new Date().toISOString(),
    };
    const next = [entry, ...requests.filter((r) => r.borrowing_id !== selected.id)];
    setRequests(next);
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(next));
    } catch {}
    setSending(false);
    setNotes("");
    setFeedback({
      type: "success",
      text: `${tr("return.success_msg", "Pengajuan terkirim ke petugas. Bawa KTM + kode")} ${selected.borrow_code || ""} ${tr("return.success_msg2", "ke loket untuk verifikasi fisik. Status Selesai hanya diterbitkan petugas.")}`,
    });
  };

  return (
    <UserLayout showSearch={false}>
      <div className="user-page-shell w-full min-w-0 space-y-6">
        <div className="user-page-hero relative overflow-hidden rounded-[1.35rem] px-5 py-6 md:px-8 md:py-7 text-white shadow-[0_16px_38px_-18px_rgba(7,133,188,0.65)] bg-gradient-to-br from-[#0b3b60] via-[#0785BC] to-[#0aa5e0]">
          <div className="absolute -right-14 top-1/2 -translate-y-1/2 hidden md:block w-52 h-52 rounded-full bg-[var(--card)]/15" />
          <div className="absolute right-28 top-1/2 -translate-y-1/2 hidden md:block w-32 h-32 rounded-full bg-[var(--card)]/10" />
          <div className="absolute -left-16 -bottom-24 w-64 h-64 rounded-full bg-[var(--card)]/10 blur-2xl" />
          <div className="relative flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[var(--card)] text-[#0785BC] flex items-center justify-center shrink-0 shadow-lg">
              <RotateCcw className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/80">{tr("return.brand", "Sarpras Pokada")}</p>
              <h1 className="mt-1 text-xl md:text-2xl font-extrabold tracking-tight">{tr("return.title", "Pengembalian Barang")}</h1>
              <p className="text-sm text-white/85 mt-1 max-w-xl">
                {tr("return.subtitle", "Lihat barang yang perlu dikembalikan dan riwayat pengembalian Anda. Barang dikembalikan langsung ke bagian Sarpras.")}
              </p>
            </div>
            <div className="flex gap-2 shrink-0 text-xs font-bold">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--card)] px-3 py-1.5 text-slate-900 shadow-sm">
                <Package className="w-3.5 h-3.5 text-[#0785BC]" /> {stats.active} {tr("return.active", "Aktif")}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-[var(--card)]/15 px-3 py-1.5 text-white backdrop-blur">
                <Clock className="w-3.5 h-3.5" /> {stats.late} {tr("return.late_short", "Terlambat")}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-[var(--card)]/15 px-3 py-1.5 text-white backdrop-blur">
                <ShieldCheck className="w-3.5 h-3.5" /> {stats.returned} {tr("return.completed_short", "Selesai")}
              </span>
            </div>
          </div>
          <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-white/70 via-white/30 to-transparent" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          {[
            { n: "1", t: tr("return.step1", "Pilih peminjaman aktif"), icon: Package },
            { n: "2", t: tr("return.step2", "Isi kesiapan & kondisi"), icon: CalendarDays },
            { n: "3", t: tr("return.step3", "Kirim ke petugas"), icon: MessageSquare },
            { n: "4", t: tr("return.step4", "Verifikasi di loket"), icon: IdCard },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.n} className="bg-[var(--card)] rounded-2xl border border-slate-200/70 shadow-[0_1px_2px_rgba(15,23,42,0.05)] p-3.5 flex items-center gap-3">
                <span className="w-8 h-8 rounded-xl bg-[#0785BC]/10 text-[#0785BC] text-xs font-extrabold flex items-center justify-center shrink-0">{s.n}</span>
                <Icon className="w-4 h-4 text-slate-400 shrink-0" />
                <p className="text-xs font-bold text-slate-700 leading-snug">{s.t}</p>
              </div>
            );
          })}
        </div>

        {feedback && (
          <div
            className={`p-4 rounded-2xl border text-sm flex items-center justify-between gap-2 ${
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
        {loading ? (
          <div className="bg-[var(--card)] rounded-2xl border border-slate-200/70 p-14 text-center">
            <Loader2 className="w-7 h-7 text-[#0785BC] animate-spin mx-auto" />
            <p className="text-xs text-slate-400 mt-3">{tr("return.loading", "Memuat peminjaman aktif...")}</p>
          </div>
        ) : (
          <div className="grid lg:grid-cols-[minmax(0,1fr)_380px] gap-4 items-start">
            <div className="space-y-3 min-w-0">
              <h2 className="text-[13px] font-extrabold text-slate-900">
                {tr("return.active_list", "Peminjaman Aktif")} <span className="text-slate-400 font-semibold">({borrowings.length})</span>
              </h2>
              {borrowings.length === 0 ? (
                <div className="bg-[var(--card)] rounded-2xl border border-slate-200/70 p-10 text-center">
                  <Package className="w-9 h-9 mx-auto text-slate-200 mb-3" />
                  <p className="text-sm font-bold text-slate-600">{tr("return.empty_title", "Tidak ada barang yang perlu dikembalikan.")}</p>
                  <p className="text-xs text-slate-400 mt-1">{tr("return.empty_sub", "Peminjaman aktif Anda akan tampil di sini.")}</p>
                </div>
              ) : (
                borrowings.map((b) => {
                  const firstItem = b.borrowings_items?.[0]?.items;
                  const extraCount = (b.borrowings_items?.length || 1) - 1;
                  const title = firstItem?.name
                    ? `${firstItem.name}${extraCount > 0 ? ` + ${extraCount} ${tr("return.other_items", "item lain")}` : ""}`
                    : b.purpose || tr("damage.borrow_fallback", "Peminjaman");
                  const requested = requests.some((r) => r.borrowing_id === b.id);
                  const late = isOverdue(b);
                  return (
                    <button
                      key={b.id}
                      onClick={() => { setSelected(b); setFeedback(null); }}
                      className={`w-full text-left bg-[var(--card)] rounded-2xl border p-4 flex gap-3.5 items-center transition-all cursor-pointer hover:shadow-[0_10px_28px_-10px_rgba(7,133,188,0.25)] ${
                        selected?.id === b.id
                          ? "border-[#0785BC] ring-2 ring-[#0785BC]/15"
                          : "border-slate-200/70 hover:border-[#0785BC]/40"
                      }`}
                    >
                      <div className="w-11 h-11 rounded-xl bg-[#0785BC]/10 text-[#0785BC] flex items-center justify-center shrink-0">
                        <Package className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-bold text-slate-900 truncate">{title}</p>
                        <p className="text-[11px] text-slate-400 mt-1 truncate">
                          {b.borrow_code} · {tr("return.borrowed", "Dipinjam")} {b.borrow_date ? new Date(b.borrow_date).toLocaleDateString(locale) : "-"}
                        </p>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {late && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-600 border border-red-200">
                              <AlertTriangle className="w-3 h-3" /> {tr("return.late", "Terlambat — hubungi petugas")}
                            </span>
                          )}
                          {requested && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              <Clock className="w-3 h-3" /> {tr("return.waiting_verify", "Menunggu verifikasi loket")}
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                    </button>
                  );
                })
              )}

              {requests.length > 0 && (
                <div className="bg-[var(--card)] rounded-2xl border border-slate-200/70 p-4">
                  <h3 className="text-[13px] font-extrabold text-slate-900 mb-3">{tr("return.my_requests", "Pengajuan Saya")}</h3>
                  <div className="space-y-2">
                    {requests.map((r) => {
                      const stillActive = borrowings.some((b) => b.id === r.borrowing_id);
                      return (
                        <div key={r.borrowing_id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50/80 border border-slate-100 p-3">
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-800 font-mono truncate">{r.borrow_code}</p>
                            <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                              {tr("return.plan", "Rencana")}: {r.planned_date} · {tr("return.condition", "Kondisi")}: {r.condition}
                            </p>
                          </div>
                          {stillActive ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                              <Clock className="w-3 h-3" /> {tr("return.waiting_verify_short", "Menunggu verifikasi")}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                              <CheckCircle2 className="w-3 h-3" /> {tr("return.done_by_staff", "Selesai oleh petugas")}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4 min-w-0 lg:sticky lg:top-6">
              {selected ? (
                <form onSubmit={submit} className="bg-[var(--card)] rounded-2xl border border-slate-200/70 shadow-[0_1px_2px_rgba(15,23,42,0.05)] p-5 space-y-4">
                  <h2 className="text-[13px] font-extrabold text-slate-900">{tr("return.form_title", "Form Kesiapan Kembali")}</h2>
                  <div className="rounded-xl bg-[#0785BC]/5 border border-[#0785BC]/15 p-3 text-xs text-slate-600">
                    <b className="text-slate-900 font-mono">{selected.borrow_code}</b>
                    <span className="text-slate-400"> {tr("return.form_note", "— pengajuan ini memberitahu petugas dan menyiapkan verifikasi.")}</span>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">{tr("return.plan_date", "Rencana Tanggal Kembali")}</label>
                    <input
                      type="date"
                      value={planDate}
                      onChange={(e) => setPlanDate(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:bg-[var(--card)] focus:outline-none focus:ring-2 focus:ring-[#0785BC]/30 focus:border-[#0785BC]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">{tr("return.cond_label", "Kondisi Menurut Anda")}</label>
                    <select
                      value={condition}
                      onChange={(e) => setCondition(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:bg-[var(--card)] focus:outline-none focus:ring-2 focus:ring-[#0785BC]/30 focus:border-[#0785BC]"
                    >
                      <option value="Baik">{tr("return.cond_good", "Baik")}</option>
                      <option value="Rusak Ringan">{tr("return.cond_light", "Rusak Ringan")}</option>
                      <option value="Rusak Berat">{tr("return.cond_heavy", "Rusak Berat")}</option>
                    </select>
                    <p className="text-[11px] text-slate-400 mt-1.5">{tr("return.cond_hint", "Kondisi final ditentukan petugas saat cek fisik di loket.")}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">{tr("return.note_label", "Catatan untuk Petugas")}</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      placeholder={tr("return.note_ph", "Contoh: kabel sudah digulung, tas ada, siap dicek jam 10.00...")}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm resize-none placeholder:text-slate-400 focus:bg-[var(--card)] focus:outline-none focus:ring-2 focus:ring-[#0785BC]/30 focus:border-[#0785BC]"
                    />
                  </div>
                  <button
                    disabled={sending}
                    className="w-full rounded-xl bg-[#0785BC] hover:bg-[#0672a0] text-white text-sm font-bold py-3 disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    {sending ? tr("return.sending", "Mengirim...") : tr("return.submit", "Kirim Pengajuan ke Petugas")}
                  </button>
                </form>
              ) : (
                <div className="bg-[var(--card)] rounded-2xl border border-slate-200/70 shadow-sm p-5 space-y-4">
                  <h2 className="text-[13px] font-extrabold text-slate-900">Petunjuk Pengembalian</h2>
                  <div className="rounded-xl bg-[#0785BC]/5 border border-[#0785BC]/15 p-4 text-sm text-slate-600">
                    <div className="flex gap-2">
                      <Info className="w-4 h-4 text-[#0785BC] shrink-0 mt-0.5" />
                      <p>Pilih salah satu barang aktif di samping untuk mengajukan rencana pengembalian ke petugas.</p>
                    </div>
                  </div>
                  <ol className="space-y-3 text-xs text-slate-600">
                    <li><b>1. Pilih peminjaman aktif</b><br />Klik kartu barang yang ingin dikembalikan.</li>
                    <li><b>2. Isi kesiapan & kondisi</b><br />Tentukan rencana tanggal dan estimasi kondisi barang.</li>
                    <li><b>3. Datang ke loket Sarpras</b><br />Tunjukkan identitas (KTM) dan kode peminjaman.</li>
                    <li><b>4. Verifikasi fisik</b><br />Petugas akan mengecek kondisi barang dan menyelesaikan status.</li>
                  </ol>
                </div>
              )}
              <div className="bg-slate-900 rounded-2xl p-5 text-white overflow-hidden relative">
                <div className="absolute -right-10 -top-10 w-36 h-36 rounded-full bg-[var(--card)]/10" />
                <div className="relative">
                  <h3 className="text-[13px] font-extrabold flex items-center gap-2">
                    <IdCard className="w-4 h-4 text-emerald-300" /> {tr("return.counter_title", "Wajib di Loket")}
                  </h3>
                  <ul className="mt-2.5 space-y-1.5 text-xs text-white/80 leading-relaxed">
                    <li>· {tr("return.counter_li1", "Tunjukkan KTM / identitas + kode peminjaman.")}</li>
                    <li>· {tr("return.counter_li2", "Petugas cek kelengkapan & fungsi barang.")}</li>
                    <li>· {tr("return.counter_li3", "Status Selesai + stok pulih oleh petugas.")}</li>
                  </ul>
                  <Link href="/user/messages" className="mt-3.5 inline-flex items-center gap-1.5 rounded-xl bg-[var(--card)] px-3.5 py-2 text-xs font-bold text-slate-900 hover:bg-slate-100 transition-colors">
                    <MessageSquare className="w-3.5 h-3.5 text-[#0785BC]" /> {tr("return.chat_staff", "Chat Petugas")}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </UserLayout>
  );
}


