"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, Package, AlertTriangle, RotateCcw, Loader2 } from "lucide-react";
import api from "@/lib/api";
import { UserLayout } from "@/components/user";

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

  if (loading) return <UserLayout showSearch={false}><Loader2 className="w-8 h-8 text-[#0785BC] animate-spin" /></UserLayout>;
  if (!borrowing) return <UserLayout showSearch={false}><div className="text-slate-500">Data peminjaman tidak ditemukan.</div></UserLayout>;

  const itemRows = borrowing.borrowings_items || borrowing.borrowing_items || [];
  const itemNames = itemRows.map((row: any) => row.items?.name || row.item?.name).filter(Boolean).join(", ") || borrowing.purpose || "Barang peminjaman";
  const itemImages = itemRows.map((row: any) => ({
    name: row.items?.name || row.item?.name || "Barang peminjaman",
    image: row.items?.image_url || row.items?.image || row.items?.foto || row.item?.image_url || row.item?.image || row.item?.foto,
  })).filter((entry: any) => entry.image);
  const plannedReturnDate = borrowing.planned_return_date || borrowing.return_date;
  const returnData = Array.isArray(borrowing.returns) ? borrowing.returns[0] : borrowing.returns || borrowing.return;
  const status = borrowing.status || "Pending";

  return <UserLayout showSearch={false}><div className="max-w-5xl mx-auto space-y-6 pb-12">
    <Link href="/user/peminjaman" className="inline-flex items-center gap-2 text-sm font-semibold text-[#0785BC]"><ArrowLeft className="w-4 h-4" />Kembali ke Peminjaman</Link>
    <div><h1 className="text-2xl font-bold text-slate-900">Detail Peminjaman</h1><p className="text-sm text-slate-500 mt-1">Informasi ini bersifat read-only dan hanya dapat dilihat oleh Anda.</p></div>
    <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6"><div className="flex items-center gap-3 mb-5"><Package className="w-5 h-5 text-[#0785BC]" /><h2 className="font-bold text-slate-900">Detail Peminjaman Barang</h2><span className="ml-auto px-3 py-1 rounded-full bg-blue-50 text-[#0785BC] text-xs font-semibold">{status}</span></div><div className="grid sm:grid-cols-2 gap-5 text-sm"><div><p className="text-xs text-slate-400">Kode Peminjaman</p><p className="font-semibold text-slate-800 mt-1">{borrowing.borrow_code || "-"}</p></div><div><p className="text-xs text-slate-400">Barang / Paket</p><p className="font-semibold text-slate-800 mt-1">{itemNames}</p></div><div><p className="text-xs text-slate-400">Tanggal Peminjaman</p><p className="font-semibold text-slate-800 mt-1 flex gap-2 items-center"><Calendar className="w-4 h-4 text-slate-400" />{borrowing.borrow_date ? new Date(borrowing.borrow_date).toLocaleDateString("id-ID") : "-"}</p></div><div><p className="text-xs text-slate-400">Tanggal Pengembalian</p><p className="font-semibold text-slate-800 mt-1">{plannedReturnDate ? new Date(plannedReturnDate).toLocaleDateString("id-ID") : "-"}</p></div><div><p className="text-xs text-slate-400">Tujuan</p><p className="font-semibold text-slate-800 mt-1">{borrowing.purpose || "-"}</p></div></div></section>
         <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6"><div className="flex items-center gap-3 mb-4"><Package className="w-5 h-5 text-[#0785BC]" /><h2 className="font-bold text-slate-900">Foto Barang yang Dipinjam</h2></div>{itemImages.length === 0 ? <p className="text-sm text-slate-400">Belum ada foto barang.</p> : <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">{itemImages.map((entry: any) => <div key={`${entry.name}-${entry.image}`} className="space-y-2"><div className="aspect-square rounded-xl overflow-hidden bg-slate-100 border border-slate-100 flex items-center justify-center"><img src={entry.image} alt={entry.name} className="w-full h-full object-contain" /></div><p className="text-xs font-semibold text-slate-700 truncate">{entry.name}</p></div>)}</div>}</section>
     <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6"><div className="flex items-center gap-3 mb-4"><AlertTriangle className="w-5 h-5 text-orange-500" /><h2 className="font-bold text-slate-900">Detail Laporan Kerusakan</h2></div>{reports.length === 0 ? <p className="text-sm text-slate-400">Belum ada laporan kerusakan untuk peminjaman ini.</p> : reports.map((report) => <div key={report.id} className="border-t border-slate-100 pt-4 mt-4"><div className="flex justify-between"><p className="font-semibold text-slate-800">{report.title || "Laporan Kerusakan"}</p><span className="text-xs text-amber-600">{report.status}</span></div><p className="text-sm text-slate-600 mt-2">{report.description}</p>{(report.image_url || report.photo_url) && <img src={report.image_url || report.photo_url} alt="Foto kerusakan" className="mt-3 w-full max-h-80 object-contain rounded-xl border border-slate-100 bg-slate-50" />}</div>)}</section>
    <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6"><div className="flex items-center gap-3 mb-4"><RotateCcw className="w-5 h-5 text-emerald-600" /><h2 className="font-bold text-slate-900">Detail Pengembalian</h2></div>{returnData ? <div className="grid sm:grid-cols-2 gap-4 text-sm"><div><p className="text-xs text-slate-400">Tanggal Pengembalian</p><p className="font-semibold mt-1">{returnData.return_date ? new Date(returnData.return_date).toLocaleDateString("id-ID") : "-"}</p></div><div><p className="text-xs text-slate-400">Kondisi</p><p className="font-semibold mt-1">{returnData.condition || "-"}</p></div><div className="sm:col-span-2"><p className="text-xs text-slate-400">Catatan</p><p className="font-semibold mt-1">{returnData.note || returnData.notes || "-"}</p></div></div> : <p className="text-sm text-slate-400">Belum ada data pengembalian.</p>}</section>
  </div></UserLayout>;
}
