"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ClipboardList,
  Calendar,
  UserCircle2,
  XCircle,
  CheckCircle2,
  Clock,
  Package,
  RotateCcw,
  AlertTriangle,
} from "lucide-react";
import api from "@/lib/api";
import { UserLayout } from "@/components/user";

type TabKey = "peminjaman" | "pengembalian" | "kerusakan";

interface Rental {
  id: string;
  item_name: string;
  category?: string;
  image?: string;
  borrow_date: string;
  return_date?: string;
  owner?: string;
  borrow_code?: string;
  status: "active" | "approved" | "pending" | "returned" | "rejected";
}

function useMount() {
  const [m, setM] = useState(false);
  useEffect(() => {
    setM(true);
  }, []);
  return m;
}

// ── Status badge ──
function StatusBadge({ status }: { status: Rental["status"] }) {
  if (status === "pending")
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
        <Clock className="w-3 h-3 text-amber-500 animate-pulse" />
        Menunggu
      </span>
    );
  if (status === "approved")
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
        <CheckCircle2 className="w-3 h-3 text-indigo-600" />
        Disetujui
      </span>
    );
  if (status === "active")
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-[#0785BC] border border-blue-200">
        <span className="w-1.5 h-1.5 rounded-full bg-[#0785BC]" />
        Dipinjam
      </span>
    );
  if (status === "returned")
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
        Selesai
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-500 border border-red-200">
      <XCircle className="w-3 h-3" />
      Ditolak
    </span>
  );
}

// ── Rental Card ──
function RentalCard({
  rental,
  mounted,
  delay,
}: {
  rental: Rental;
  mounted: boolean;
  delay: number;
}) {
  const dateRange = rental.return_date
    ? `${rental.borrow_date} - ${rental.return_date}`
    : `Tgl Pinjam: ${rental.borrow_date}`;

  return (
    <div
      style={{ animationDelay: `${delay}ms` }}
      className={`bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-all duration-200 h-full min-h-[380px] ${
        mounted ? "animate-fade-up" : "opacity-0"
      }`}
    >
      {/* Image */}
      <div className="relative w-full h-44 shrink-0 bg-slate-100 overflow-hidden flex items-center justify-center">
        {rental.image ? (
          <img
            src={rental.image}
            alt={rental.item_name}
            className="w-full h-full object-cover"
          />
        ) : (
          <Package className="w-8 h-8 text-slate-300" />
        )}
        {rental.category && (
          <span className="absolute top-3 left-3 px-2 py-0.5 rounded text-[10px] font-semibold bg-white/90 text-slate-700 backdrop-blur-xs max-w-[60%] truncate">
            {rental.category}
          </span>
        )}
        <span className="absolute top-3 right-3">
          <StatusBadge status={rental.status} />
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 flex flex-col">
        <h3 className="text-sm font-bold text-slate-900 leading-snug line-clamp-2 min-h-[2.5rem]">
          {rental.item_name}
        </h3>
        {rental.borrow_code && (
          <p className="text-[11px] font-mono text-slate-400 mt-1 truncate">
            {rental.borrow_code}
          </p>
        )}
        <div className="space-y-1.5 text-sm text-slate-500 mt-2">
          <p className="flex items-center gap-2 text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{dateRange}</span>
          </p>
          <p className="flex items-center gap-2 text-xs min-h-[1rem]">
            <UserCircle2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{rental.owner || "Tujuan: -"}</span>
          </p>
        </div>

        <div className="mt-auto pt-4">
          <div className="border-t border-slate-100 pt-3">
            <Link
              href={`/user/peminjaman/${rental.id}`}
              className="w-full px-4 py-2 text-xs font-semibold border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 hover:border-[#0785BC]/40 hover:text-[#0785BC] active:scale-95 transition-all inline-block text-center"
            >
              Lihat Detail Peminjaman
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RiwayatPeminjamanPage() {
  return (
    <Suspense
      fallback={
        <UserLayout showSearch={false}>
          <div className="max-w-6xl mx-auto p-12 text-center text-sm text-slate-400">
            Memuat riwayat peminjaman...
          </div>
        </UserLayout>
      }
    >
      <RiwayatPeminjamanContent />
    </Suspense>
  );
}

function RiwayatPeminjamanContent() {
  const searchParams = useSearchParams();
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("peminjaman");
  const [reports, setReports] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const pageSize = 4;
  const mounted = useMount();

  // Sync tab & status from searchParams
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam && ["peminjaman", "pengembalian", "kerusakan"].includes(tabParam)) {
      setActiveTab(tabParam as TabKey);
    }
    const statusParam = searchParams.get("status");
    if (statusParam) {
      setStatusFilter(statusParam.toLowerCase());
    }
  }, [searchParams]);

  const mapBorrowing = (b: any): Rental => {
    const firstItem = b.borrowings_items?.[0]?.items || {};
    const statusNorm = (b.status || "").toLowerCase();
    let mappedStatus: "active" | "approved" | "pending" | "returned" | "rejected" = "pending";
    if (statusNorm.includes("pending") || statusNorm.includes("menunggu")) {
      mappedStatus = "pending";
    } else if (statusNorm.includes("setuju") || statusNorm.includes("approved")) {
      mappedStatus = "approved";
    } else if (
      statusNorm.includes("dipinjam") ||
      statusNorm.includes("aktif")
    ) {
      mappedStatus = "active";
    } else if (
      statusNorm.includes("kembali") ||
      statusNorm.includes("selesai") ||
      statusNorm.includes("returned")
    ) {
      mappedStatus = "returned";
    } else {
      mappedStatus = "rejected";
    }

    const borrowDateFormatted = b.borrow_date
      ? new Date(b.borrow_date).toLocaleDateString("id-ID", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "-";

    const returnDateFormatted = b.actual_return_date
      ? new Date(b.actual_return_date).toLocaleDateString("id-ID", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : b.planned_return_date
      ? new Date(b.planned_return_date).toLocaleDateString("id-ID", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : undefined;

    return {
      id: b.id,
      item_name: firstItem.name ? `${firstItem.name}${(b.borrowings_items?.length || 0) > 1 ? ` + ${(b.borrowings_items.length - 1)} item lain` : ""}` : b.purpose || `Peminjaman (${b.borrow_code || "-"})`,
      category: firstItem.code || "Sarpras",
      image: firstItem.image_url,
      borrow_date: borrowDateFormatted,
      return_date: returnDateFormatted,
      owner: b.purpose ? `Tujuan: ${b.purpose}` : undefined,
      borrow_code: b.borrow_code,
      status: mappedStatus,
    };
  };

  const fetchData = useCallback(async () => {
    try {
      const [res, reportRes] = await Promise.all([
        api.borrowings.getAll({ limit: 50 }),
        api.damageReports.getAll({ limit: 50 }),
      ]);
      if (res.status === "success" && Array.isArray(res.data)) setRentals(res.data.map(mapBorrowing));
      if (reportRes.status === "success" && Array.isArray(reportRes.data)) setReports(reportRes.data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 8000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const searchCode = (searchParams.get("code") || "").toLowerCase();

  const filtered = rentals.filter((r) => {
    if (searchCode && r.borrow_code && !r.borrow_code.toLowerCase().includes(searchCode)) {
      return false;
    }
    if (statusFilter !== "all" && r.status !== statusFilter) {
      return false;
    }
    if (activeTab === "peminjaman") return true;
    if (activeTab === "pengembalian") return r.status === "returned";
    return false;
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const historyTabs: { key: TabKey; label: string; icon: React.ElementType }[] = [
    { key: "peminjaman", label: "Riwayat Peminjaman", icon: ClipboardList },
    { key: "pengembalian", label: "Riwayat Pengembalian", icon: RotateCcw },
    { key: "kerusakan", label: "Riwayat Laporan Kerusakan", icon: AlertTriangle },
  ];

  return (
    <UserLayout showSearch={false}>
      <div className="max-w-6xl mx-auto space-y-5 pb-10">
        {/* Page header */}
        <div className={mounted ? "animate-fade-up" : "opacity-0"}>
          <h1 className="text-2xl font-bold text-slate-900">Riwayat</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Lihat seluruh riwayat peminjaman, pengembalian, dan laporan kerusakan Anda.
          </p>
        </div>

        {/* Tabs */}
        <div
          className={`flex gap-0 border-b border-slate-200 ${
            mounted ? "animate-fade-up delay-75" : "opacity-0"
          }`}
        >
          {historyTabs.map((tab) => {
            const Icon = tab.icon;
            return <button
              key={tab.key}
               onClick={() => { setActiveTab(tab.key); setPage(1); }}
              className={`flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-all -mb-px ${
                activeTab === tab.key
                  ? "border-[#0785BC] text-[#0785BC]"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              <Icon className="w-4 h-4" />{tab.label}
            </button>;
          })}
        </div>

        {/* History Details */}
        {activeTab === "kerusakan" ? (
          reports.length === 0 ? <div className="text-center py-20 text-slate-400 text-sm bg-white rounded-2xl border border-slate-100"><AlertTriangle className="w-10 h-10 mx-auto mb-2 text-slate-200" />Belum ada riwayat laporan kerusakan.</div> :
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">{reports.map((report) => <Link key={report.id} href={report.borrowing_id ? `/user/peminjaman/${report.borrowing_id}` : "/user/laporan_kerusakan"} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition-shadow flex flex-col h-full min-h-[220px]"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-sm font-bold text-slate-800 line-clamp-2 min-h-[2.5rem]">{report.title || "Laporan Kerusakan"}</p><p className="text-xs text-slate-500 mt-1 truncate">{report.items?.name || "Barang terkait"}</p></div><span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-[10px] font-semibold shrink-0">{report.status || "Menunggu Review"}</span></div><p className="text-sm text-slate-600 mt-3 line-clamp-3 flex-1">{report.description}</p><p className="text-[10px] text-slate-400 mt-4 pt-3 border-t border-slate-100">{report.created_at ? new Date(report.created_at).toLocaleString("id-ID") : "-"}</p></Link>)}</div>
        ) : loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-slate-100 flex overflow-hidden h-40"
              >
                <div className="w-44 bg-slate-100 animate-pulse shrink-0" />
                <div className="flex-1 p-5 space-y-3">
                  <div className="h-4 bg-slate-100 rounded animate-pulse w-2/3" />
                  <div className="h-3 bg-slate-100 rounded animate-pulse w-1/2" />
                  <div className="h-3 bg-slate-100 rounded animate-pulse w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-slate-400 text-sm bg-white rounded-2xl border border-slate-100">
            <ClipboardList className="w-10 h-10 mx-auto mb-2 text-slate-200" />
            Tidak ada riwayat peminjaman pada kategori ini.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
             {paginated.map((rental, i) => (

              <RentalCard
                key={rental.id}
                rental={rental}
                mounted={mounted}
                delay={100 + i * 50}
              />
            ))}
           </div>
         )}

         {activeTab !== "kerusakan" && filtered.length > pageSize && (
           <div className="flex items-center justify-center gap-3">
             <button disabled={page === 1} onClick={() => setPage((current) => current - 1)} className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold disabled:opacity-40">Sebelumnya</button>
             <span className="text-xs text-slate-500">Halaman {page} dari {totalPages}</span>
             <button disabled={page === totalPages} onClick={() => setPage((current) => current + 1)} className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold disabled:opacity-40">Berikutnya</button>
           </div>
         )}
       </div>
    </UserLayout>
  );
}
