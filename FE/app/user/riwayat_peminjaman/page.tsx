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
  ChevronRight,
  Clock,
  Package,
  RotateCcw,
  AlertTriangle,
} from "lucide-react";
import api from "@/lib/api";
import { UserLayout } from "@/components/user";
import { useLanguage } from "@/lib/i18n";

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

// â”€â”€ Status badge â”€â”€
function StatusBadge({ status }: { status: Rental["status"] }) {
  const { t } = useLanguage();
  const tr = (k: string, fb: string) => { const v = t(k); return v === k ? fb : v; };
  if (status === "pending")
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 shadow-sm">
        <Clock className="w-3 h-3 text-amber-500 animate-pulse" />
        {tr("history.status_pending", "Menunggu")}
      </span>
    );
  if (status === "approved")
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 shadow-sm">
        <CheckCircle2 className="w-3 h-3 text-blue-600" />
        {tr("history.status_approved", "Disetujui")}
      </span>
    );
  if (status === "active")
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold bg-blue-50 text-[#0785BC] border border-blue-200 shadow-sm">
        <span className="w-1.5 h-1.5 rounded-full bg-[#0785BC]" />
        {tr("history.status_active", "Dipinjam")}
      </span>
    );
  if (status === "returned")
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm">
        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
        {tr("history.status_returned", "Selesai")}
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold bg-red-50 text-red-500 border border-red-200 shadow-sm">
      <XCircle className="w-3 h-3" />
      {tr("history.status_rejected", "Ditolak")}
    </span>
  );
}

// â”€â”€ Rental Card (gaya katalog: medium, presisi) â”€â”€
function RentalCard({
  rental,
  mounted,
  delay,
}: {
  rental: Rental;
  mounted: boolean;
  delay: number;
}) {
  const { t, lang } = useLanguage();
  const tr = (k: string, fb: string) => { const v = t(k); return v === k ? fb : v; };
  const locale = lang === "en" ? "en-US" : "id-ID";
  const dateRange = rental.return_date
    ? `${rental.borrow_date} - ${rental.return_date}`
    : `${tr("history.borrow_date", "Tgl Pinjam")}: ${rental.borrow_date}`;

  return (
    <Link
      href={`/user/peminjaman/${rental.id}`}
      style={{ animationDelay: `${delay}ms` }}
      className={`group bg-[var(--card)] rounded-2xl border border-slate-200/70 shadow-[0_1px_2px_rgba(15,23,42,0.05)] overflow-hidden flex flex-col h-full hover:shadow-[0_10px_28px_-10px_rgba(7,133,188,0.25)] hover:-translate-y-[2px] hover:border-[#0785BC]/30 transition-all duration-200 ${
        mounted ? "animate-fade-up" : "opacity-0"
      }`}
    >
      <div className="relative w-full h-[152px] shrink-0 bg-slate-100 overflow-hidden flex items-center justify-center">
        {rental.image ? (
          <img
            src={rental.image}
            alt={rental.item_name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <Package className="w-8 h-8 text-slate-300" />
        )}
        {rental.category && (
          <span className="absolute top-2.5 left-2.5 px-2 py-1 rounded-lg text-[10px] font-bold bg-[var(--card)]/95 text-slate-600 shadow-sm backdrop-blur max-w-[55%] truncate">
            {rental.category}
          </span>
        )}
        <span className="absolute top-2.5 right-2.5">
          <StatusBadge status={rental.status} />
        </span>
      </div>

      <div className="flex-1 p-4 flex flex-col">
        <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#0785BC] truncate">
          {tr("history.list_label", "Riwayat Peminjaman")}
        </p>
        <h3 className="mt-1 text-[13px] font-bold text-slate-900 leading-[1.45] line-clamp-2 min-h-[2.6rem] group-hover:text-[#0785BC] transition-colors">
          {rental.item_name}
        </h3>
        {rental.borrow_code && (
          <p className="text-[11px] font-mono text-slate-400 mt-1 truncate">
            {rental.borrow_code}
          </p>
        )}
        <div className="space-y-1.5 mt-2">
          <p className="flex items-center gap-2 text-xs text-slate-500">
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{dateRange}</span>
          </p>
          <p className="flex items-center gap-2 text-xs text-slate-500 min-h-[1rem]">
            <UserCircle2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{rental.owner || `${tr("history.purpose", "Tujuan")}: -`}</span>
          </p>
        </div>

        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold text-slate-400">
            {tr("history.click_detail", "Klik untuk lihat isi")}
          </span>
          <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-[#0785BC] shrink-0">
            {tr("history.view_detail", "Lihat Detail")} <ChevronRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>
    </Link>
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
  const { t, lang } = useLanguage();
  const tr = (k: string, fb: string) => { const v = t(k); return v === k ? fb : v; };
  const locale = lang === "en" ? "en-US" : "id-ID";
  const searchParams = useSearchParams();
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("peminjaman");
  const [reports, setReports] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const pageSize = 6;
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
      ? new Date(b.borrow_date).toLocaleDateString(locale, {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "-";

    const returnDateFormatted = b.actual_return_date
      ? new Date(b.actual_return_date).toLocaleDateString(locale, {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : b.planned_return_date
      ? new Date(b.planned_return_date).toLocaleDateString(locale, {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : undefined;

    return {
      id: b.id,
      item_name: firstItem.name ? `${firstItem.name}${(b.borrowings_items?.length || 0) > 1 ? ` + ${(b.borrowings_items.length - 1)} ${tr("history.other_items", "item lain")}` : ""}` : b.purpose || `(${b.borrow_code || "-"})`,
      category: firstItem.code || "Sarpras",
      image: firstItem.image_url,
      borrow_date: borrowDateFormatted,
      return_date: returnDateFormatted,
      owner: b.purpose ? `${tr("history.purpose", "Tujuan")}: ${b.purpose}` : undefined,
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
    const interval = setInterval(fetchData, 30000);
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
    { key: "peminjaman", label: tr("history.tab_borrow_label", "Riwayat Peminjaman"), icon: ClipboardList },
    { key: "pengembalian", label: tr("history.tab_return_label", "Riwayat Pengembalian"), icon: RotateCcw },
    { key: "kerusakan", label: tr("history.tab_damage_label", "Riwayat Laporan Kerusakan"), icon: AlertTriangle },
  ];

  const countReturned = rentals.filter((r) => r.status === "returned").length;
  const countActive = rentals.filter((r) => r.status === "active").length;

  return (
    <UserLayout showSearch={false}>
      <div className="user-page-shell w-full min-w-0 space-y-6">
        <div className={`user-page-hero relative overflow-hidden rounded-[1.35rem] px-5 py-6 md:px-8 md:py-7 text-white shadow-[0_12px_32px_-12px_rgba(7,133,188,0.55)] bg-gradient-to-br from-[#0B3B60] via-[#0785BC] to-[#0785BC] ${mounted ? "animate-fade-up" : "opacity-0"}`}>
          <div className="absolute inset-0 bg-dot-grid-dark opacity-50" />
          <div className="absolute -right-14 -top-24 w-72 h-72 rounded-full bg-sky-400/30 blur-2xl" />
          <div className="absolute -left-16 -bottom-28 w-72 h-72 rounded-full bg-fuchsia-500/25 blur-2xl" />
          <div className="absolute right-24 top-1/2 -translate-y-1/2 hidden xl:block w-44 h-44 rounded-full border-[22px] border-white/10" />
          <div className="absolute right-10 bottom-[-1.8rem] hidden xl:block w-16 h-16 rounded-2xl bg-[var(--card)]/15 backdrop-blur rotate-12" />
          <div className="absolute right-6 top-6 hidden sm:flex items-center gap-1.5 rounded-full bg-[var(--card)]/15 border border-white/20 backdrop-blur px-2.5 py-1 text-[11px] font-bold text-white">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {tr("history.connected", "Terhubung")}
          </div>
          <div className="relative flex flex-col lg:flex-row lg:items-center gap-5">
            <div className="flex items-start gap-4 flex-1 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-[var(--card)] text-[#0785BC] flex items-center justify-center shadow-lg shrink-0">
                <ClipboardList className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-sky-200">{tr("history.mine", "Riwayat Saya")}</p>
                <h1 className="mt-1 text-2xl md:text-[26px] font-extrabold tracking-tight leading-tight">{tr("history.title", "Riwayat Peminjaman")}</h1>
                <p className="mt-1.5 text-sm text-white/80 max-w-xl leading-relaxed">
                  {tr("history.subtitle", "Lihat seluruh riwayat peminjaman, pengembalian, dan laporan kerusakan Anda.")}
                </p>
                <div className="mt-3.5 flex flex-wrap gap-2 text-xs font-bold">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--card)] px-3 py-1.5 text-slate-900 shadow-sm">
                    <ClipboardList className="w-3.5 h-3.5 text-[#0785BC]" /> {rentals.length} {tr("history.count_borrow", "Peminjaman")}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-[var(--card)]/10 px-3 py-1.5 text-white backdrop-blur">
                    <Clock className="w-3.5 h-3.5 text-sky-200" /> {countActive} {tr("history.count_active", "Dipinjam")}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-[var(--card)]/10 px-3 py-1.5 text-white backdrop-blur">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" /> {countReturned} {tr("history.count_done", "Selesai")}
                  </span>
                </div>
              </div>
            </div>
            <div className="hidden lg:grid grid-cols-3 gap-2.5 shrink-0 w-[300px]">
              <div className="rounded-xl border border-white/20 bg-[var(--card)]/10 backdrop-blur p-3 text-center">
                <p className="text-lg font-extrabold tabular-nums">{rentals.length}</p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/70 mt-0.5">{tr("history.total", "Total")}</p>
              </div>
              <div className="rounded-xl bg-[var(--card)] text-[#0785BC] p-3 text-center shadow-lg">
                <p className="text-lg font-extrabold tabular-nums">{countActive}</p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mt-0.5">{tr("history.active", "Aktif")}</p>
              </div>
              <div className="rounded-xl bg-emerald-400 text-emerald-950 p-3 text-center shadow-lg">
                <p className="text-lg font-extrabold tabular-nums">{countReturned}</p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-900/70 mt-0.5">{tr("history.done_label", "Selesai")}</p>
              </div>
            </div>
          </div>
        </div>

        <div
          className={`user-toolbar flex gap-2 sm:gap-6 overflow-x-auto px-3 sm:px-4 pt-3 border-b border-slate-200 ${
            mounted ? "animate-fade-up delay-75" : "opacity-0"
          }`}
        >
          {historyTabs.map((tab) => {
            const Icon = tab.icon;
            return <button
              key={tab.key}
               onClick={() => { setActiveTab(tab.key); setPage(1); }}
              className={`flex items-center gap-2 px-1 pb-3 text-sm font-semibold border-b-2 transition-all -mb-px cursor-pointer ${
                activeTab === tab.key
                  ? "border-[#0785BC] text-[#0785BC]"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              <Icon className="w-4 h-4" />{tab.label}
            </button>;
          })}
        </div>

        {activeTab === "kerusakan" ? (
          reports.length === 0 ? <div className="text-center py-12 text-slate-400 text-sm bg-[var(--card)] rounded-2xl border border-slate-200/70"><AlertTriangle className="w-9 h-9 mx-auto mb-3 text-slate-200" /><p className="text-sm font-bold text-slate-600">{tr("history.empty_damage_title", "Belum ada riwayat laporan kerusakan.")}</p><p className="text-xs text-slate-400 mt-1">{tr("history.empty_damage_sub", "Laporan kerusakan Anda akan tampil di sini.")}</p></div> :
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">{reports.map((report) => <Link key={report.id} href={report.borrowing_id ? `/user/peminjaman/${report.borrowing_id}` : "/user/laporan_kerusakan"} className="group bg-[var(--card)] rounded-2xl border border-slate-200/70 shadow-[0_1px_2px_rgba(15,23,42,0.05)] p-4 hover:shadow-[0_10px_28px_-10px_rgba(7,133,188,0.25)] hover:-translate-y-[2px] hover:border-[#0785BC]/30 transition-all flex flex-col h-full"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-[13px] font-bold text-slate-900 leading-snug line-clamp-2 min-h-[2.6rem] group-hover:text-[#0785BC] transition-colors">{report.title || tr("damage.report_fallback", "Laporan Kerusakan")}</p><p className="text-xs text-slate-500 mt-1 truncate">{report.items?.name || tr("history.related_item", "Barang terkait")}</p></div><span className="px-2 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-bold shrink-0">{report.status || tr("history.wait_review", "Menunggu Review")}</span></div><p className="text-xs text-slate-500 mt-2 leading-relaxed line-clamp-2 min-h-[2rem] flex-1">{report.description}</p><div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-2"><p className="text-[10px] text-slate-400 truncate">{report.created_at ? new Date(report.created_at).toLocaleString(locale) : "-"}</p><span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-[#0785BC] shrink-0">{tr("history.see", "Lihat")} <ChevronRight className="w-3.5 h-3.5" /></span></div></Link>)}</div>
        ) : loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="bg-[var(--card)] rounded-2xl border border-slate-200/70 overflow-hidden"
              >
                <div className="h-[152px] bg-slate-100 animate-pulse" />
                <div className="p-4 space-y-2">
                  <div className="h-3 bg-slate-100 rounded animate-pulse w-1/3" />
                  <div className="h-3.5 bg-slate-100 rounded animate-pulse w-2/3" />
                  <div className="h-3 bg-slate-100 rounded animate-pulse w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm bg-[var(--card)] rounded-2xl border border-slate-200/70">
            <ClipboardList className="w-9 h-9 mx-auto mb-3 text-slate-200" />
            <p className="text-sm font-bold text-slate-600">{tr("history.empty_tab_title", "Tidak ada riwayat peminjaman pada kategori ini.")}</p>
            <p className="text-xs text-slate-400 mt-1">{tr("history.empty_tab_sub", "Coba tab lain atau ajukan peminjaman baru.")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
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
             <button disabled={page === 1} onClick={() => setPage((current) => current - 1)} className="px-4 py-2 rounded-xl border border-slate-200 bg-[var(--card)] text-xs font-bold text-slate-600 disabled:opacity-40 hover:border-[#0785BC]/40 hover:text-[#0785BC] transition-colors cursor-pointer">{tr("history.prev", "Sebelumnya")}</button>
             <span className="text-xs text-slate-500">{tr("history.page", "Halaman")} {page} {tr("history.of", "dari")} {totalPages}</span>
             <button disabled={page === totalPages} onClick={() => setPage((current) => current + 1)} className="px-4 py-2 rounded-xl border border-slate-200 bg-[var(--card)] text-xs font-bold text-slate-600 disabled:opacity-40 hover:border-[#0785BC]/40 hover:text-[#0785BC] transition-colors cursor-pointer">{tr("history.next", "Berikutnya")}</button>
           </div>
         )}
       </div>
    </UserLayout>
  );
}
