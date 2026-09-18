"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  Package,
  RotateCcw,
  User,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

function StatusBadge({ status }: { status: string }) {
  const s = (status || "").toLowerCase();
  if (s.includes("pending") || s.includes("menunggu") || s.includes("validasi")) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-700 border border-amber-200">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
        Perlu Divalidasi
      </span>
    );
  }
  if (s.includes("dipinjam") || s === "active") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-sky-100 text-sky-700 border border-sky-200">
        <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
        Sedang Dipinjam
      </span>
    );
  }
  if (s.includes("terlambat") || s.includes("overdue")) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-100 text-red-600 border border-red-200">
        <AlertTriangle className="w-3 h-3" />
        Terlambat
      </span>
    );
  }
  if (s.includes("kembali") || s.includes("selesai") || s.includes("completed") || s.includes("returned") || s.includes("dikembalikan")) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
        <Check className="w-3 h-3" />
        Selesai
      </span>
    );
  }
  if (s.includes("setuju") || s.includes("approved")) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-200">
        <Check className="w-3 h-3" />
        Disetujui
      </span>
    );
  }
  if (s.includes("tolak") || s.includes("batal") || s.includes("rejected")) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-600 border border-rose-200">
        <X className="w-3 h-3" />
        Ditolak
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600">
      {status || "-"}
    </span>
  );
}

function Stepper({ status }: { status: string }) {
  const s = (status || "").toLowerCase();
  const rejected = s.includes("tolak") || s.includes("batal") || s.includes("rejected");
  if (rejected) {
    return (
      <div className="mt-3 flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-100 px-3 py-2">
        <X className="w-4 h-4 text-rose-500 shrink-0" />
        <p className="text-[11px] font-semibold text-rose-600">Pengajuan ditolak / dibatalkan. Hubungi admin untuk info lanjut.</p>
      </div>
    );
  }
  let step = 0;
  if (s.includes("setuju") || s.includes("approved") || s.includes("dipinjam") || s === "active") step = 1;
  if (s.includes("kembali") || s.includes("selesai") || s.includes("completed") || s.includes("returned") || s.includes("dikembalikan")) step = 2;

  const steps = [
    { label: "Diajukan", icon: FileText },
    { label: "Dipinjam", icon: Package },
    { label: "Selesai", icon: CheckCircle2 },
  ];
  return (
    <div className="mt-3 flex items-center">
      {steps.map((st, i) => {
        const Icon = st.icon;
        const done = i <= step;
        const current = i === step;
        return (
          <div key={st.label} className="flex items-center flex-1 last:flex-none">
            <div className="flex items-center gap-1.5">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                  done ? "bg-[#0785BC] text-white" : "bg-slate-100 text-slate-400"
                } ${current ? "ring-4 ring-[#0785BC]/15" : ""}`}
              >
                <Icon className="w-3 h-3" />
              </div>
              <span className={`text-[10px] font-bold whitespace-nowrap ${done ? "text-slate-800" : "text-slate-400"}`}>
                {st.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`h-[2px] flex-1 mx-2 rounded-full ${i < step ? "bg-[#0785BC]" : "bg-slate-150 bg-slate-200"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

const fmtDateTime = (v?: string) =>
  v
    ? new Date(v).toLocaleString("id-ID", {
        day: "numeric",
        month: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "-";

const fmtDate = (v?: string) =>
  v
    ? new Date(v).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "-";

interface Props {
  borrowingId: string | null;
  onClose: () => void;
}

export default function BorrowingDetailModal({ borrowingId, onClose }: Props) {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!borrowingId) {
      setData(null);
      return;
    }
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const res = await api.borrowings.getById(borrowingId as string);
        if (active && res.status === "success") setData(res.data);
      } catch {
        if (active) setData(null);
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [borrowingId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (borrowingId) {
      document.addEventListener("keydown", onKey);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [borrowingId, onClose]);

  if (!borrowingId) return null;

  const rows = data?.borrowings_items || data?.borrowing_items || [];
  const borrower = data?.users || data?.user || {};
  const borrowerName = borrower.name || borrower.full_name || data?.borrower_name || "Saya";
  const borrowerEmail = borrower.email || data?.borrower_email || "-";
  const borrowerPhone = borrower.no_hp || borrower.phone || data?.borrower_phone || "-";
  const borrowerRole = borrower.role || data?.borrower_role || "Peminjam";
  const borrowerFoto = borrower.foto || data?.borrower_foto || null;
  const initials = String(borrowerName).split(" ").filter(Boolean).map((w: string) => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center p-3 sm:p-6 bg-slate-950/60 backdrop-blur-sm overflow-y-auto animate-fade-in"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-[560px] my-4 sm:my-auto overflow-hidden rounded-[20px] bg-[#f4f7fb] shadow-2xl animate-scale-in flex flex-col max-h-[92vh]">
        <div className="relative shrink-0 bg-gradient-to-br from-[#0785BC] via-[#0a97d4] to-[#0fb5e6] px-5 pt-5 pb-12 overflow-hidden">
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10" />
          <div className="absolute top-8 right-24 w-16 h-16 rounded-full bg-white/10" />
          <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-black/10" />
          <div className="relative flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur border border-white/20 text-white flex items-center justify-center shrink-0">
                <Package className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="font-extrabold text-white text-[15px] leading-tight tracking-tight">Detail Peminjaman</h3>
                <span className="mt-1 inline-flex items-center px-2 py-0.5 rounded-full bg-black/20 border border-white/15 text-[11px] font-mono text-white/90 truncate max-w-[220px] sm:max-w-none">
                  {data?.borrow_code || "Memuat..."}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-white/15 hover:bg-white/25 text-white transition-colors cursor-pointer shrink-0"
              aria-label="Tutup"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="relative px-4 sm:px-5 pb-4 -mt-8 overflow-y-auto">
          {loading ? (
            <div className="bg-white rounded-2xl shadow-lg border border-slate-100 py-14 text-center">
              <Loader2 className="w-7 h-7 animate-spin text-[#0785BC] mx-auto" />
              <p className="text-xs text-slate-400 mt-3 font-medium">Memuat detail peminjaman...</p>
            </div>
          ) : !data ? (
            <div className="bg-white rounded-2xl shadow-lg border border-slate-100 py-14 text-center">
              <AlertTriangle className="w-7 h-7 mx-auto text-slate-300" />
              <p className="text-sm font-bold text-slate-700 mt-3">Detail tidak ditemukan</p>
              <p className="text-xs text-slate-400 mt-1">Data peminjaman tidak tersedia.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="bg-white rounded-2xl shadow-[0_8px_24px_-8px_rgba(7,133,188,0.25)] border border-slate-100 p-4">
                <div className="flex items-center justify-between gap-3">
                  <StatusBadge status={data.status} />
                  <div className="text-right">
                    <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Dibuat</p>
                    <p className="text-xs font-bold text-slate-700 tabular-nums mt-0.5">{fmtDateTime(data.created_at)}</p>
                  </div>
                </div>
                <Stepper status={data.status} />
              </div>

              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="flex items-center gap-2.5 px-4 pt-3.5 pb-3 border-b border-slate-50">
                  {borrowerFoto ? (
                    <img src={borrowerFoto} alt={borrowerName} className="w-9 h-9 rounded-full object-cover ring-2 ring-[#0785BC]/15 shrink-0" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#0785BC] to-[#0aa5e0] text-white flex items-center justify-center font-extrabold text-xs shrink-0">
                      {initials}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-extrabold text-slate-900 truncate leading-tight">{borrowerName}</p>
                    <p className="text-[11px] text-slate-400 truncate">{borrowerEmail}</p>
                  </div>
                  <span className="px-2 py-1 rounded-lg bg-slate-100 text-[10px] font-bold text-slate-600 shrink-0">{borrowerRole}</span>
                </div>
                <div className="grid grid-cols-2">
                  <div className="px-4 py-3 border-r border-slate-50">
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <User className="w-3 h-3" />
                      <p className="text-[10px] font-bold uppercase tracking-wider">Nama</p>
                    </div>
                    <p className="text-xs font-bold text-slate-800 mt-1 truncate">{borrowerName}</p>
                  </div>
                  <div className="px-4 py-3">
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <Clock className="w-3 h-3" />
                      <p className="text-[10px] font-bold uppercase tracking-wider">Telepon</p>
                    </div>
                    <p className="text-xs font-bold text-slate-800 mt-1">{borrowerPhone}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="flex items-center gap-2.5 rounded-xl bg-sky-50/70 border border-sky-100/70 p-2.5">
                    <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-[#0785BC] shrink-0">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold text-slate-400 leading-none">Pinjam</p>
                      <p className="text-xs font-extrabold text-slate-800 mt-1">{fmtDate(data.borrow_date)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 rounded-xl bg-emerald-50/70 border border-emerald-100/70 p-2.5">
                    <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-emerald-600 shrink-0">
                      <RotateCcw className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold text-slate-400 leading-none">Kembali</p>
                      <p className="text-xs font-extrabold text-slate-800 mt-1">
                        {fmtDate(data.planned_return_date || data.return_date || data.actual_return_date)}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mt-2.5 rounded-xl bg-slate-50 border border-slate-100 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tujuan / Keperluan</p>
                  <p className="text-xs text-slate-700 mt-1 leading-relaxed whitespace-pre-wrap">{data.purpose || "-"}</p>
                  {data.admin_note && (
                    <div className="mt-2 pt-2 border-t border-slate-200/70 flex gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#0785BC] shrink-0 mt-0.5" />
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        <span className="font-bold">Respon admin: </span>{data.admin_note}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                <div className="flex items-center justify-between mb-2.5">
                  <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-[#0785BC]" /> Isi Pinjaman
                  </p>
                  <span className="px-2 py-0.5 rounded-full bg-[#0785BC]/10 text-[#0785BC] text-[10px] font-extrabold">
                    {rows.length} item
                  </span>
                </div>
                <div className="space-y-2">
                  {rows.length > 0 ? (
                    rows.map((it: any, idx: number) => (
                      <div key={it.id || idx} className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-50/80 border border-slate-100">
                        <div className="w-10 h-10 rounded-lg bg-white border border-slate-100 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                          {it.items?.image_url ? (
                            <img src={it.items.image_url} alt={it.items?.name} className="w-full h-full object-cover" />
                          ) : (
                            <Package className="w-4 h-4 text-slate-300" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-800 truncate">{it.items?.name || "Barang"}</p>
                          <p className="text-[10px] text-slate-400 font-mono truncate">{it.items?.code || it.item_id}</p>
                        </div>
                        <span className="px-2 py-1 rounded-lg bg-white border border-slate-200 text-[10px] font-extrabold text-slate-700 shrink-0 shadow-sm">
                          {it.quantity || 1}x
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-[11px] text-slate-400 text-center py-3">Tidak ada rincian barang</p>
                  )}
                </div>
                <div className="mt-2.5 flex items-start gap-1.5 text-[10px] text-slate-400 leading-relaxed">
                  <FileText className="w-3 h-3 mt-0.5 shrink-0" />
                  <span>Status & info di atas sama dengan data admin, diperbarui otomatis.</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="shrink-0 px-4 sm:px-5 py-3.5 bg-white border-t border-slate-100 flex items-center justify-between gap-2">
          <button
            onClick={onClose}
            className="px-3 py-2 text-[13px] font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            Tutup
          </button>
          {data && (
            <button
              onClick={() => {
                onClose();
                router.push(`/user/peminjaman/${data.id}`);
              }}
              className="inline-flex items-center gap-1.5 pl-4 pr-3 py-2.5 text-[13px] font-extrabold text-white bg-gradient-to-r from-[#0785BC] to-[#0aa5e0] hover:brightness-110 rounded-xl shadow-[0_6px_16px_-6px_rgba(7,133,188,0.6)] transition-all active:scale-95 cursor-pointer"
            >
              Buka Detail Lengkap <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
