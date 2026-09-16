"use client";

import { useEffect, useState } from "react";
import { Package, CheckCircle2, AlertTriangle, Loader2, X } from "lucide-react";
import api from "@/lib/api";
import { UserLayout } from "@/components/user";

export default function UserReturnPage() {
  const [borrowings, setBorrowings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [condition, setCondition] = useState("Baik");
  const [notes, setNotes] = useState("");
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const load = async () => {
    const res = await api.borrowings.getAll({ limit: 50 });
    if (res.status === "success" && Array.isArray(res.data)) {
      setBorrowings(
        res.data.filter((b: any) => {
          const s = (b.status || "").toLowerCase();
          return (
            s.includes("dipinjam") ||
            s.includes("setuju") ||
            s.includes("approved") ||
            s.includes("aktif")
          );
        })
      );
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    const timer = setInterval(load, 8000);
    return () => clearInterval(timer);
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setSending(true);
    setFeedback(null);
    const res = await api.returns.create({
      borrowing_id: selected.id,
      condition,
      note: notes.trim(),
      notes: notes.trim(),
    });
    setSending(false);
    if (res.status === "success") {
      setFeedback({ type: "success", text: "Pengajuan pengembalian berhasil dicatat." });
      setSelected(null);
      setNotes("");
      load();
    } else {
      setFeedback({ type: "error", text: res.message || "Pengembalian gagal diproses." });
    }
  };

  return (
    <UserLayout showSearch={false}>
      <div className="max-w-6xl mx-auto space-y-6 pb-12">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pengembalian Barang</h1>
          <p className="text-sm text-slate-500 mt-1">Pilih peminjaman aktif yang ingin Anda kembalikan.</p>
        </div>
        {feedback && (
          <div
            className={`p-4 rounded-xl border text-sm flex items-center justify-between gap-2 ${
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
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        {loading ? (
          <Loader2 className="w-7 h-7 text-[#0785BC] animate-spin" />
        ) : (
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="space-y-3">
              {borrowings.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-100 p-10 text-center text-slate-400">
                  Tidak ada barang yang perlu dikembalikan.
                </div>
              ) : (
                borrowings.map((b) => {
                  const firstItem = b.borrowings_items?.[0]?.items;
                  const extraCount = (b.borrowings_items?.length || 1) - 1;
                  const title = firstItem?.name
                    ? `${firstItem.name}${extraCount > 0 ? ` + ${extraCount} item lain` : ""}`
                    : b.purpose || "Barang Peminjaman";
                  return (
                    <button
                      key={b.id}
                      onClick={() => setSelected(b)}
                      className={`w-full text-left bg-white rounded-2xl border p-5 flex gap-4 items-center transition-all cursor-pointer ${
                        selected?.id === b.id
                          ? "border-[#0785BC] ring-2 ring-[#0785BC]/10"
                          : "border-slate-100 hover:border-[#0785BC]/40"
                      }`}
                    >
                      <div className="w-11 h-11 rounded-xl bg-blue-50 text-[#0785BC] flex items-center justify-center shrink-0">
                        <Package className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-800 truncate">{title}</p>
                        <p className="text-xs text-slate-400 mt-1">
                          {b.borrow_code} · Dipinjam {b.borrow_date ? new Date(b.borrow_date).toLocaleDateString("id-ID") : "-"}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
            {selected && (
              <form onSubmit={submit} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5 h-fit">
                <h2 className="font-bold text-slate-900">Form Pengembalian</h2>
                <div className="rounded-xl bg-blue-50 p-3 text-xs text-[#0785BC]">
                  <b>Peminjaman Terpilih:</b> {selected.borrow_code}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-2">Kondisi Barang</label>
                  <select
                    value={condition}
                    onChange={(e) => setCondition(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                  >
                    <option>Baik</option>
                    <option>Rusak Ringan</option>
                    <option>Rusak Berat</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-2">Catatan</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={4}
                    placeholder="Tambahkan catatan pengembalian..."
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm resize-none"
                  />
                </div>
                <button
                  disabled={sending}
                  className="w-full rounded-xl bg-[#0785BC] hover:bg-[#0672a0] text-white font-semibold py-3 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {sending ? "Mengirim..." : "Ajukan Pengembalian"}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </UserLayout>
  );
}
