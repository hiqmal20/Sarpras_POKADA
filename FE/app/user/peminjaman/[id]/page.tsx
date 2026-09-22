"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, Package, AlertTriangle, RotateCcw, Loader2, FileText, ChevronRight } from "lucide-react";
import api from "@/lib/api";
import { UserLayout } from "@/components/user";

function StatusBadge({ status }: { status: string }) {
  const s = (status || "").toLowerCase();
  if (s.includes("pending") || s.includes("menunggu"))
    return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 shadow-sm">Menunggu</span>;
  if (s.includes("setuju") || s.includes("approved"))
    return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-sm">Disetujui</span>;
  if (s.includes("dipinjam") || s.includes("aktif"))
    return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-[#0785BC] border border-blue-200 shadow-sm">Dipinjam</span>;
  if (s.includes("kembali") || s.includes("selesai") || s.includes("returned"))
    return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm">Selesai</span>;
  return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-600 border border-rose-200 shadow-sm">Ditolak</span>;
}

export default function BorrowingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [borrowing, setBorrowing] = useState<any>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [borrowingRes, reportRes] = await Promise.all([
          api.borrowings.getById(id),
          api.damageReports.getAll({ limit: 100 }),
        ]);
        let data = borrowingRes.status === "success" ? borrowingRes.data : null;
        if (!data) {
          const listRes = await api.borrowings.getAll({ limit: 100 });
          data = listRes.status === "success" && Array.isArray(listRes.data) ? listRes.data.find((entry: any) => entry.id === id) : null;
        }
        if (active) {
          setBorrowing(data);
          if (reportRes.status === "success" && Array.isArray(reportRes.data)) setReports(reportRes.data.filter((r: any) => r.borrowing_id === id));
        }
      } catch {
        if (active) setBorrowing(null);
      } finally {
        if (active) setLoading(false);
      }
    }
    if (id) load();
    return () => { active = false; };
  }, [id]);

  if (loading) return <UserLayout showSearch={false}><div className="w-full min-w-0 py-16 flex flex-col items-center gap-3"><Loader2 className="w-8 h-8 text-[#0785BC] animate-spin" /><p className="text-xs text-slate-400 font-medium">Memuat detail peminjaman...</p></div></UserLayout>;
  if (!borrowing) return <UserLayout showSearch={false}><div className="w-full min-w-0 py-16 text-center"><div className="bg-white rounded-2xl border border-slate-200/70 p-12"><Package className="w-9 h-9 mx-auto text-slate-200 mb-3" /><p className="text-sm font-bold text-slate-600">Data peminjaman tidak ditemukan.</p><Link href="/user/peminjaman" className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-[#0785BC]">Kembali ke Peminjaman <ChevronRight className="w-3.5 h-3.5" /></Link></div></div></UserLayout>;

  const itemRows = borrowing.borrowings_items || borrowing.borrowing_items || [];
  const itemNames = itemRows.map((row: any) => row.items?.name || row.item?.name).filter(Boolean).join(", ") || borrowing.purpose || "Barang peminjaman";
  const itemImages = itemRows.map((row: any) => ({
    name: row.items?.name || row.item?.name || "Barang peminjaman",
    code: row.items?.code || row.item?.code || "",
    qty: row.quantity || 1,
    image: row.items?.image_url || row.items?.image || row.items?.foto || row.item?.image_url || row.item?.image || row.item?.foto,
  })).filter((entry: any) => entry.image);
  const plannedReturnDate = borrowing.planned_return_date || borrowing.return_date;
  const returnData = Array.isArray(borrowing.returns) ? borrowing.returns[0] : borrowing.returns || borrowing.return;
  const status = borrowing.status || "Pending";

  return <UserLayout showSearch={false}><div className="w-full min-w-0 space-y-6 pb-10">
    <button type="button" onClick={() => window.history.back()} className="inline-flex items-center gap-2 text-[13px] font-bold text-slate-500 hover:text-[#0785BC] transition-colors cursor-pointer">
      <ArrowLeft className="w-4 h-4" /> Kembali
    </button>

    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0785BC] to-[#0aa5e0] px-5 py-6 md:px-7 text-white shadow-sm">
      <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-white/10" />
      <div className="absolute right-20 bottom-[-3rem] w-32 h-32 rounded-full bg-white/10" />
      <div className="relative flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-white/15 border border-white/20 backdrop-blur flex items-center justify-center shrink-0">
          <Package className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/70">Detail Peminjaman</p>
          <h1 className="mt-1 text-xl md:text-2xl font-extrabold tracking-tight truncate">{borrowing.borrow_code || "Peminjaman"}</h1>
          <p className="mt-1 text-[13px] text-white/80 line-clamp-1">Informasi ini bersifat read-only dan hanya dapat dilihat oleh Anda.</p>
        </div>
        <div className="shrink-0">
          <StatusBadge status={status} />
        </div>
      </div>
    </div>

    <section className="bg-white rounded-2xl border border-slate-200/70 shadow-[0_1px_2px_rgba(15,23,42,0.05)] p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-[#0785BC]/10 text-[#0785BC] flex items-center justify-center shrink-0">
          <FileText className="w-4 h-4" />
        </div>
        <h2 className="text-[13px] font-extrabold text-slate-900">Detail Peminjaman Barang</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div className="rounded-xl bg-slate-50/80 border border-slate-100 p-3.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">Kode Peminjaman</p>
          <p className="text-[13px] font-bold text-slate-900 mt-1 font-mono truncate">{borrowing.borrow_code || "-"}</p>
        </div>
        <div className="rounded-xl bg-slate-50/80 border border-slate-100 p-3.5 sm:col-span-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">Barang / Paket</p>
          <p className="text-[13px] font-bold text-slate-900 mt-1 leading-snug line-clamp-2">{itemNames}</p>
        </div>
        <div className="rounded-xl bg-sky-50/60 border border-sky-100/70 p-3.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400 flex items-center gap-1.5"><Calendar className="w-3 h-3" /> Tanggal Pinjam</p>
          <p className="text-[13px] font-bold text-slate-900 mt-1">{borrowing.borrow_date ? new Date(borrowing.borrow_date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "-"}</p>
        </div>
        <div className="rounded-xl bg-emerald-50/60 border border-emerald-100/70 p-3.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400 flex items-center gap-1.5"><Calendar className="w-3 h-3" /> Estimasi Kembali</p>
          <p className="text-[13px] font-bold text-slate-900 mt-1">{plannedReturnDate ? new Date(plannedReturnDate).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "-"}</p>
        </div>
        <div className="rounded-xl bg-slate-50/80 border border-slate-100 p-3.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">Tujuan</p>
          <p className="text-[13px] text-slate-800 mt-1 leading-relaxed line-clamp-2">{borrowing.purpose || "-"}</p>
        </div>
      </div>
    </section>

    <section className="bg-white rounded-2xl border border-slate-200/70 shadow-[0_1px_2px_rgba(15,23,42,0.05)] p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#0785BC]/10 text-[#0785BC] flex items-center justify-center shrink-0">
            <Package className="w-4 h-4" />
          </div>
          <h2 className="text-[13px] font-extrabold text-slate-900">Foto Barang yang Dipinjam</h2>
        </div>
        <span className="px-2.5 py-1 rounded-full bg-[#0785BC]/10 text-[#0785BC] text-[11px] font-bold">{itemImages.length} foto</span>
      </div>
      {itemImages.length === 0 ? <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 py-10 text-center"><Package className="w-8 h-8 mx-auto text-slate-200 mb-2" /><p className="text-xs text-slate-400 font-medium">Belum ada foto barang.</p></div> : <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">{itemImages.map((entry: any) => <div key={`${entry.name}-${entry.image}`} className="group bg-white rounded-2xl border border-slate-200/70 overflow-hidden hover:shadow-[0_10px_28px_-10px_rgba(7,133,188,0.25)] hover:border-[#0785BC]/30 transition-all"><div className="h-[148px] bg-slate-100 overflow-hidden flex items-center justify-center"><img src={entry.image} alt={entry.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" /></div><div className="p-3"><p className="text-xs font-bold text-slate-800 truncate">{entry.name}</p><div className="mt-1.5 flex items-center justify-between"><span className="text-[10px] font-mono text-slate-400 truncate">{entry.code || "Sarpras"}</span><span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-[10px] font-bold text-slate-600 shrink-0 ml-2">{entry.qty}x</span></div></div></div>)}</div>}
    </section>

    <section className="bg-white rounded-2xl border border-slate-200/70 shadow-[0_1px_2px_rgba(15,23,42,0.05)] p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shrink-0">
          <AlertTriangle className="w-4 h-4" />
        </div>
        <h2 className="text-[13px] font-extrabold text-slate-900">Laporan Kerusakan</h2>
        <span className="ml-auto px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-[11px] font-bold">{reports.length} laporan</span>
      </div>
      {reports.length === 0 ? <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 py-10 text-center"><AlertTriangle className="w-8 h-8 mx-auto text-slate-200 mb-2" /><p className="text-xs text-slate-400 font-medium">Belum ada laporan kerusakan untuk peminjaman ini.</p></div> : <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{reports.map((report) => <div key={report.id} className="rounded-2xl border border-slate-200/70 overflow-hidden flex flex-col"><div className="p-4 flex-1"><div className="flex items-start justify-between gap-2"><p className="text-[13px] font-bold text-slate-900 leading-snug line-clamp-2">{report.title || "Laporan Kerusakan"}</p><span className="px-2 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-bold shrink-0">{report.status}</span></div><p className="text-xs text-slate-500 mt-2 leading-relaxed line-clamp-3">{report.description}</p></div>{(report.image_url || report.photo_url) && <div className="h-[148px] bg-slate-100 border-t border-slate-100 overflow-hidden"><img src={report.image_url || report.photo_url} alt="Foto kerusakan" className="w-full h-full object-cover" /></div>}</div>)}</div>}
    </section>

    <section className="bg-white rounded-2xl border border-slate-200/70 shadow-[0_1px_2px_rgba(15,23,42,0.05)] p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
          <RotateCcw className="w-4 h-4" />
        </div>
        <h2 className="text-[13px] font-extrabold text-slate-900">Detail Pengembalian</h2>
      </div>
      {returnData ? <div className="grid grid-cols-1 sm:grid-cols-3 gap-3"><div className="rounded-xl bg-slate-50/80 border border-slate-100 p-3.5"><p className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">Tanggal Kembali</p><p className="text-[13px] font-bold text-slate-900 mt-1">{returnData.return_date ? new Date(returnData.return_date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "-"}</p></div><div className="rounded-xl bg-slate-50/80 border border-slate-100 p-3.5"><p className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">Kondisi</p><p className="text-[13px] font-bold text-slate-900 mt-1">{returnData.condition || "-"}</p></div><div className="rounded-xl bg-slate-50/80 border border-slate-100 p-3.5"><p className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">Catatan</p><p className="text-[13px] text-slate-800 mt-1 leading-relaxed line-clamp-2">{returnData.note || returnData.notes || "-"}</p></div></div> : <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 py-10 text-center"><RotateCcw className="w-8 h-8 mx-auto text-slate-200 mb-2" /><p className="text-xs text-slate-400 font-medium">Belum ada data pengembalian.</p></div>}
    </section>

    <div className="flex items-center justify-between gap-3 rounded-2xl bg-white border border-slate-200/70 px-4 py-3.5 shadow-sm">
      <Link href="/user/riwayat_peminjaman" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-[#0785BC] transition-colors">Lihat Riwayat Saya</Link>
      <Link href="/user/item_catalog" className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#0785BC] hover:bg-[#0672a0] text-white text-xs font-bold transition-colors">Pinjam Lagi <ChevronRight className="w-3.5 h-3.5" /></Link>
    </div>
  </div></UserLayout>;
}
