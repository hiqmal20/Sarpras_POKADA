"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ClipboardList,
  Calendar,
  UserCircle2,
  XCircle,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Wrench,
  DollarSign,
  Plus,
  X,
  Loader2,
  Check,
  Package,
} from "lucide-react";
import api, { getCurrentUser } from "@/lib/api";
import UserSidebar from "@/components/user/Sidebar";
import UserNavbar from "@/components/user/Navbar";

type TabKey = "semua" | "active" | "returned" | "rejected" | "damage";

interface Rental {
  id: string;
  borrow_code?: string;
  item_name: string;
  category?: string;
  image?: string;
  borrow_date: string;
  return_date?: string;
  owner?: string;
  status: "active" | "pending" | "returned" | "rejected";
}

interface UserDamageReport {
  id: string;
  report_code: string;
  item_name: string;
  item_code: string;
  title: string;
  description: string;
  reported_date: string;
  status: "pending" | "in_progress" | "resolved";
  raw_status: string;
  fine_amount: number;
  fine_reason: string;
  fine_status: string;
  admin_note?: string;
}

function useMount() {
  const [m, setM] = useState(false);
  useEffect(() => { setM(true); }, []);
  return m;
}

// ── Status badge ──
function StatusBadge({ status }: { status: Rental["status"] }) {
  if (status === "active" || status === "pending")
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500 text-white">
        <span className="w-1.5 h-1.5 rounded-full bg-white" />
        Aktif
      </span>
    );
  if (status === "returned")
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
        <CheckCircle2 className="w-3 h-3" />
        Selesai
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-500 border border-red-200">
      <XCircle className="w-3 h-3" />
      Dibatalkan
    </span>
  );
}

// ── Rental Card ──
function RentalCard({
  rental,
  mounted,
  delay,
  highlighted,
}: {
  rental: Rental;
  mounted: boolean;
  delay: number;
  highlighted?: boolean;
}) {
  const dateRange = rental.return_date
    ? `${rental.borrow_date} - ${rental.return_date}`
    : `Rencana: ${rental.borrow_date}`;

  return (
    <div
      style={{ animationDelay: `${delay}ms` }}
      className={`bg-white rounded-2xl border shadow-sm overflow-hidden flex hover:shadow-md transition-all duration-200 ${
        highlighted
          ? "border-[#0785BC] ring-2 ring-[#0785BC]/30 shadow-md bg-gradient-to-br from-blue-50/20 to-white"
          : "border-slate-100"
      } ${mounted ? "animate-fade-up" : "opacity-0"}`}
    >
      {/* Image */}
      <div className="relative w-44 shrink-0 bg-slate-100 overflow-hidden">
        {rental.image ? (
          <Image src={rental.image} alt={rental.item_name} fill className="object-cover" sizes="176px" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ClipboardList className="w-8 h-8 text-slate-300" />
          </div>
        )}
        {rental.category && (
          <span className="absolute top-3 left-3 px-2 py-0.5 rounded text-[10px] font-semibold bg-white/90 text-slate-700">
            {rental.category}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 p-5 flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              {rental.borrow_code && (
                <span className="text-[10px] font-mono font-bold text-[#0785BC] bg-blue-50 border border-blue-100 px-2 py-0.5 rounded mb-1 inline-block">
                  {rental.borrow_code}
                </span>
              )}
              <h3 className="text-base font-bold text-slate-900 leading-snug">{rental.item_name}</h3>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {highlighted && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#0785BC] text-white">
                  Dipilih
                </span>
              )}
              <StatusBadge status={rental.status} />
            </div>
          </div>
          <div className="space-y-1.5 text-sm text-slate-500">
            <p className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              {dateRange}
            </p>
            {rental.owner && (
              <p className="flex items-center gap-2">
                <UserCircle2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                Pemilik: {rental.owner}
              </p>
            )}
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-100">
          <Link
            href={`/user/item_catalog/${rental.id}`}
            className="px-4 py-1.5 text-sm font-semibold border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 active:scale-95 transition-all inline-block"
          >
            Detail
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── Mock data ──
const mockRentals: Rental[] = [
  {
    id: "1", item_name: "Kamera DSLR Canon 5D Mark IV", category: "Elektronik",
    image: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=600&q=80",
    borrow_date: "12 Okt 2023", return_date: "15 Okt 2023", owner: "Budi Santoso", status: "active",
  },
  {
    id: "2", item_name: "Bor Listrik Bosch GSB 120-LI",
    image: "https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=600&q=80",
    borrow_date: "01 Sep 2023", return_date: "03 Sep 2023", owner: "Toko Perkakas Jaya", status: "returned",
  },
];

const tabs: { key: TabKey; label: string }[] = [
  { key: "semua",    label: "Semua Peminjaman" },
  { key: "active",   label: "Aktif" },
  { key: "returned", label: "Selesai" },
  { key: "rejected", label: "Dibatalkan" },
  { key: "damage",   label: "Laporan Kerusakan & Denda" },
];

export default function RiwayatPeminjamanPage() {
  const [rentals, setRentals]                 = useState<Rental[]>([]);
  const [damageReports, setDamageReports]     = useState<UserDamageReport[]>([]);
  const [loading, setLoading]                 = useState(true);
  const [loadingDamage, setLoadingDamage]     = useState(false);
  const [activeTab, setActiveTab]             = useState<TabKey>("semua");
  const [highlightCode, setHighlightCode]     = useState<string>("");
  const [showReportModal, setShowReportModal] = useState(false);
  const [submittingReport, setSubmittingReport] = useState(false);

  // New report form state
  const [reportForm, setReportForm]           = useState({
    title: "",
    description: "",
    borrowing_id: "",
    item_id: "",
  });

  const mounted = useMount();

  // Inisialisasi tab dan kode yang disorot dari URL query parameter (shortcut notifikasi)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get("tab") as TabKey | null;
    const codeParam = params.get("code") || params.get("search");

    if (codeParam) {
      setHighlightCode(codeParam);
      if (
        codeParam.startsWith("ITM-") ||
        codeParam.startsWith("PKG-") ||
        codeParam.startsWith("LPR-")
      ) {
        setActiveTab("damage");
      }
    }

    if (tabParam && ["semua", "active", "returned", "rejected", "damage"].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, []);

  // Load rentals
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const res = await api.borrowings.getAll({ limit: 50 });
        if (res.status === "success" && Array.isArray(res.data) && res.data.length > 0) {
          const mapped: Rental[] = res.data.map((raw: any) => {
            const firstBItem = raw.borrowings_items?.[0]?.items || raw.borrowings_items?.[0] || {};
            const rawStatus = (raw.status || "pending").toLowerCase();
            let st: Rental["status"] = "pending";
            if (rawStatus === "dipinjam" || rawStatus === "active") st = "active";
            else if (rawStatus === "selesai" || rawStatus === "dikembalikan" || rawStatus === "returned") st = "returned";
            else if (rawStatus === "ditolak" || rawStatus === "dibatalkan" || rawStatus === "rejected") st = "rejected";
            else st = "pending";

            return {
              id: raw.id,
              borrow_code: raw.borrow_code || "-",
              item_name: firstBItem.name || raw.purpose || "Barang Peminjaman",
              category: firstBItem.categories?.name || firstBItem.category || "Sarpras",
              image: firstBItem.image_url || null,
              borrow_date: raw.borrow_date ? new Date(raw.borrow_date).toLocaleDateString("id-ID") : "-",
              return_date: raw.actual_return_date
                ? new Date(raw.actual_return_date).toLocaleDateString("id-ID")
                : raw.planned_return_date
                ? new Date(raw.planned_return_date).toLocaleDateString("id-ID")
                : undefined,
              owner: raw.users?.name || "Admin Sarpras",
              status: st,
            };
          });
          setRentals(mapped);
        } else {
          setRentals(mockRentals);
        }
      } catch {
        setRentals(mockRentals);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Load damage reports when damage tab is clicked
  const fetchDamageReports = async () => {
    setLoadingDamage(true);
    try {
      const res = await api.damageReports.getAll({ limit: 50 });
      if (res.status === "success" && Array.isArray(res.data)) {
        const mapped: UserDamageReport[] = res.data.map((raw: any) => {
          let st: "pending" | "in_progress" | "resolved" = "pending";
          const rawStatus = (raw.status || "").toLowerCase();
          if (rawStatus.includes("selesai") || rawStatus === "resolved") {
            st = "resolved";
          } else if (
            rawStatus.includes("perbaik") ||
            rawStatus.includes("proses") ||
            rawStatus === "in_progress" ||
            rawStatus === "sedang diperbaiki"
          ) {
            st = "in_progress";
          }

          const item = raw.items || {};
          return {
            id: raw.id,
            report_code: raw.report_code || `LPR-${String(raw.id).substring(0, 8).toUpperCase()}`,
            item_name: item.name || raw.item_name || raw.title || "Barang",
            item_code: item.code || raw.item_code || "-",
            title: raw.title || "Laporan Kerusakan",
            description: raw.description || "-",
            reported_date: raw.created_at
              ? new Date(raw.created_at).toLocaleDateString("id-ID", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })
              : "-",
            status: st,
            raw_status: raw.status || "Menunggu Review",
            fine_amount: Number(raw.fine_amount) || 0,
            fine_reason: raw.fine_reason || "",
            fine_status: raw.fine_status || "Tidak Ada Denda",
            admin_note: raw.admin_note || "",
          };
        });
        setDamageReports(mapped);
      }
    } catch (err) {
      console.warn("Gagal memuat laporan kerusakan user:", err);
    } finally {
      setLoadingDamage(false);
    }
  };

  useEffect(() => {
    if (activeTab === "damage") {
      fetchDamageReports();
    }
  }, [activeTab]);

  const handleUserCreateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingReport(true);
    try {
      const user = getCurrentUser();
      const res = await api.damageReports.create({
        user_id: user?.id,
        title: reportForm.title,
        description: reportForm.description,
        borrowing_id: reportForm.borrowing_id || undefined,
        item_id: reportForm.item_id || undefined,
      });

      if (res.status === "success") {
        setShowReportModal(false);
        setReportForm({ title: "", description: "", borrowing_id: "", item_id: "" });
        await fetchDamageReports();
        alert("Laporan kerusakan berhasil dikirimkan ke tim SARPRAS!");
      } else {
        alert("Gagal mengirim laporan: " + (res.message || "Error"));
      }
    } catch (err: any) {
      alert("Terjadi kesalahan: " + (err?.message || "Error"));
    } finally {
      setSubmittingReport(false);
    }
  };

  const filtered = rentals.filter((r) => {
    if (activeTab === "semua")    return true;
    if (activeTab === "active")   return r.status === "active" || r.status === "pending";
    if (activeTab === "returned") return r.status === "returned";
    if (activeTab === "rejected") return r.status === "rejected";
    return true;
  });

  return (
    <div className="flex h-screen overflow-hidden bg-[#eef2f9] text-slate-800">
      {/* ── Sidebar ── */}
      <UserSidebar />

      {/* ── Main ── */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <UserNavbar />
        <div className="flex-1 overflow-y-auto">
          <div className="p-8 max-w-7xl mx-auto">
            {/* Page header */}
            <div className={`mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${mounted ? "animate-fade-up" : "opacity-0"}`}>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Riwayat Peminjaman & Kerusakan</h1>
                <p className="text-sm text-slate-500 mt-0.5">Kelola barang yang Anda pinjam dan pantau status laporan aset.</p>
              </div>

              {activeTab === "damage" && (
                <button
                  onClick={() => setShowReportModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-[#0785BC] hover:bg-[#0672a0] rounded-xl shadow-sm hover:shadow transition-all shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  Laporkan Kerusakan Barang
                </button>
              )}
            </div>

            {/* Tabs */}
            <div className={`flex gap-1 border-b border-slate-200 mb-6 overflow-x-auto ${mounted ? "animate-fade-up delay-75" : "opacity-0"}`}>
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition-all -mb-px whitespace-nowrap ${
                    activeTab === tab.key
                      ? "border-[#0785BC] text-[#0785BC]"
                      : "border-transparent text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {tab.label}
                  {tab.key === "damage" && damageReports.length > 0 && (
                    <span className="ml-2 px-1.5 py-0.5 rounded-full text-[10px] bg-rose-500 text-white font-bold">
                      {damageReports.length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Content for Rentals Tab */}
            {activeTab !== "damage" ? (
              loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {[1, 2].map((i) => (
                    <div key={i} className="bg-white rounded-2xl border border-slate-100 flex overflow-hidden h-40">
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
                <div className="text-center py-20 text-slate-400 text-sm">
                  Tidak ada riwayat peminjaman pada kategori ini.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {filtered.map((rental, i) => (
                    <RentalCard
                      key={rental.id}
                      rental={rental}
                      mounted={mounted}
                      delay={100 + i * 75}
                      highlighted={Boolean(
                        highlightCode &&
                          (rental.borrow_code?.toLowerCase() === highlightCode.toLowerCase() ||
                            rental.id === highlightCode)
                      )}
                    />
                  ))}
                </div>
              )
            ) : (
              /* Content for Damage Reports Tab */
              loadingDamage ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-28 bg-white rounded-2xl border border-slate-100 animate-pulse" />
                  ))}
                </div>
              ) : damageReports.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center border border-slate-100 shadow-sm">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-emerald-500" />
                  <h3 className="text-base font-bold text-slate-900">Kondisi Peminjaman Aman</h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                    Anda tidak memiliki catatan laporan kerusakan atau denda penalti saat ini.
                  </p>
                  <button
                    onClick={() => setShowReportModal(true)}
                    className="mt-4 px-4 py-2 text-xs font-semibold text-[#0785BC] bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors"
                  >
                    Laporkan Kerusakan Jika Terjadi Kendala
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {damageReports.map((report) => {
                    const isHighlighted = Boolean(
                      highlightCode &&
                        (report.report_code?.toLowerCase() === highlightCode.toLowerCase() ||
                          report.id === highlightCode)
                    );
                    return (
                      <div
                        key={report.id}
                        className={`bg-white rounded-2xl p-5 border shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                          isHighlighted
                            ? "border-[#0785BC] ring-2 ring-[#0785BC]/30 shadow-md bg-gradient-to-br from-blue-50/20 to-white"
                            : "border-slate-100"
                        }`}
                      >
                        <div className="flex items-start gap-3.5">
                          <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100 mt-0.5">
                            <AlertTriangle className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                {report.report_code}
                              </span>
                              <span className="text-xs font-bold text-slate-900">{report.item_name}</span>
                              <span className="text-[11px] text-slate-400">({report.item_code})</span>
                              {isHighlighted && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#0785BC] text-white">
                                  Dipilih
                                </span>
                              )}
                            </div>
                            <p className="text-xs font-semibold text-slate-800 mt-1">{report.title}</p>
                            <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">{report.description}</p>
                            {report.admin_note && (
                              <p className="text-[11px] text-[#0785BC] bg-blue-50 p-2 rounded-xl border border-blue-100 mt-2">
                                <strong>Tanggapan Admin:</strong> {report.admin_note}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Status & Denda */}
                      <div className="flex flex-row md:flex-col items-end gap-2 shrink-0 self-stretch md:self-auto justify-between md:justify-start pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                        <div>
                          {report.status === "pending" && (
                            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                              Menunggu Review
                            </span>
                          )}
                          {report.status === "in_progress" && (
                            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                              Sedang Diperbaiki
                            </span>
                          )}
                          {report.status === "resolved" && (
                            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Selesai
                            </span>
                          )}
                        </div>

                        {report.fine_amount > 0 && (
                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 block">Denda:</span>
                            <span className="text-sm font-bold text-rose-600">
                              Rp {report.fine_amount.toLocaleString("id-ID")}
                            </span>
                            <span className="text-[10px] font-bold block text-amber-700">
                              {report.fine_status}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                </div>
              )
            )}
          </div>
        </div>

        {/* ── Modal Laporkan Kerusakan oleh Mahasiswa ── */}
        {showReportModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Laporkan Kerusakan Barang</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Kirim laporan kerusakan ke admin untuk tindak lanjut.</p>
                </div>
                <button
                  onClick={() => setShowReportModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleUserCreateReport} className="space-y-3.5 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Pilih Barang yang Dipinjam</label>
                  <select
                    value={reportForm.item_id}
                    onChange={(e) => setReportForm({ ...reportForm, item_id: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0785BC]"
                  >
                    <option value="">Pilih barang terkait (jika ada)...</option>
                    {rentals.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.item_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Judul Kerusakan *</label>
                  <input
                    type="text"
                    required
                    value={reportForm.title}
                    onChange={(e) => setReportForm({ ...reportForm, title: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0785BC]"
                    placeholder="contoh: Kabel proyektor terbakar / Layar LCD buram"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Kronologi Kerusakan *</label>
                  <textarea
                    required
                    rows={3}
                    value={reportForm.description}
                    onChange={(e) => setReportForm({ ...reportForm, description: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0785BC] resize-none"
                    placeholder="Ceritakan kejadian saat barang mengalami masalah..."
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowReportModal(false)}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 font-semibold rounded-xl"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={submittingReport}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#0785BC] hover:bg-[#0672a0] text-white font-semibold rounded-xl shadow-sm transition-all disabled:opacity-50"
                  >
                    {submittingReport && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Kirim Laporan
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
