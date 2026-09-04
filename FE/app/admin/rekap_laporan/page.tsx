"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  FileText,
  Wrench,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  Loader2,
  Check,
  Eye,
} from "lucide-react";
import api from "@/lib/api";
import { AdminLayout } from "@/components/admin";

type ReportStatus = "pending" | "in_progress" | "resolved";

interface DamageReport {
  id: string;
  item_code: string;
  item_name: string;
  reporter_name: string;
  description: string;
  reported_date: string;
  status: ReportStatus;
  raw_status: string;
  fine_amount: number;
  fine_reason: string;
  fine_status: string;
  admin_note?: string;
}

interface ItemOption {
  id: string;
  name: string;
  code: string;
}

function useMount() {
  const [m, setM] = useState(false);
  useEffect(() => { setM(true); }, []);
  return m;
}

// ── Status Badge ──
function StatusBadge({ status }: { status: ReportStatus }) {
  if (status === "pending")
    return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-600">Menunggu</span>;
  if (status === "in_progress")
    return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">Sedang Diperbaiki</span>;
  return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">Selesai</span>;
}

// ── Avatar initials ──
function Avatar({ name, color }: { name?: string; color: string }) {
  const safeName = (name || "").trim();
  const initials = safeName
    ? safeName
        .split(" ")
        .filter(Boolean)
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "P";
  return (
    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 ${color}`}>
      {initials}
    </div>
  );
}

const avatarColors = ["bg-orange-400", "bg-slate-400", "bg-blue-500", "bg-teal-500", "bg-purple-500"];

const PAGE_SIZE = 10;

const statusOptions = [
  { label: "Semua Status", value: "" },
  { label: "Menunggu Tindak Lanjut", value: "pending" },
  { label: "Sedang Dalam Perbaikan", value: "in_progress" },
  { label: "Selesai", value: "resolved" },
];

export default function RekapLaporanPage() {
  const [reports, setReports]       = useState<DamageReport[]>([]);
  const [items, setItems]           = useState<ItemOption[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [statusFilter, setStatus]   = useState("");
  const [page, setPage]             = useState(1);
  const [total, setTotal]           = useState(0);

  // Modal Create
  const [showModal, setShowModal]   = useState(false);
  const [saving, setSaving]         = useState(false);
  const [formData, setFormData]     = useState({
    item_id: "",
    title: "",
    description: "",
  });

  // Modal Action & Denda
  const [actionReport, setActionReport] = useState<DamageReport | null>(null);
  const [actionStatus, setActionStatus] = useState("Sedang Diperbaiki");
  const [fineAmount, setFineAmount]     = useState<number | string>("");
  const [fineReason, setFineReason]     = useState("");
  const [fineStatus, setFineStatus]     = useState("Tidak Ada Denda");
  const [adminNote, setAdminNote]       = useState("");
  const [submittingAction, setSubmittingAction] = useState(false);

  // Modal Riwayat Read-Only
  const [historyReport, setHistoryReport] = useState<DamageReport | null>(null);

  const mounted = useMount();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [res, itemsRes] = await Promise.all([
        api.damageReports.getAll({
          status: statusFilter === "pending"
            ? "Menunggu Review"
            : statusFilter === "in_progress"
            ? "Sedang Diperbaiki"
            : statusFilter === "resolved"
            ? "Selesai"
            : undefined,
          page,
          limit: PAGE_SIZE,
        }),
        api.items.getAll({ limit: 100 }),
      ]);

      if (itemsRes.status === "success" && Array.isArray(itemsRes.data)) {
        setItems(itemsRes.data.map((i: any) => ({ id: i.id, name: i.name, code: i.code })));
      }

      if (res.status === "success" && res.data && (res.data as any[]).length > 0) {
        const mapped: DamageReport[] = (res.data as any[]).map((raw: any) => {
          let st: ReportStatus = "pending";
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
          return {
            id: raw.id,
            item_name: raw.item_name || raw.items?.name || raw.title || "Barang",
            item_code: raw.item_code || raw.items?.code || raw.report_code || "-",
            reporter_name: raw.reporter_name || raw.users?.name || "Petugas",
            description: raw.description || raw.damage_description || "-",
            reported_date: raw.reported_date || (raw.created_at ? new Date(raw.created_at).toLocaleDateString("id-ID") : "-"),
            status: st,
            raw_status: raw.status || "Menunggu Review",
            fine_amount: Number(raw.fine_amount) || 0,
            fine_reason: raw.fine_reason || "",
            fine_status: raw.fine_status || "Tidak Ada Denda",
            admin_note: raw.admin_note || "",
          };
        });
        setReports(mapped);
        setTotal(res.total || mapped.length);
      } else {
        setReports([]);
        setTotal(0);
      }
    } catch (err) {
      console.warn("Gagal memuat laporan kerusakan:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter, page]);

  const handleCreateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.damageReports.create({
        item_id: formData.item_id || undefined,
        title: formData.title,
        description: formData.description,
      });

      if (res.status === "success") {
        await fetchData();
        setShowModal(false);
        setFormData({ item_id: "", title: "", description: "" });
        alert("Laporan kerusakan berhasil dibuat!");
      } else {
        alert("Gagal membuat laporan: " + (res.message || "Error"));
      }
    } catch (err: any) {
      alert("Terjadi kesalahan: " + (err?.message || "Error"));
    } finally {
      setSaving(false);
    }
  };

  const handleOpenActionModal = (row: DamageReport) => {
    setActionReport(row);
    setActionStatus(row.status === "pending" ? "Sedang Diperbaiki" : "Selesai");
    setFineAmount(row.fine_amount && row.fine_amount > 0 ? row.fine_amount : "");
    setFineReason(row.fine_reason || "");
    setFineStatus(row.fine_status || (row.fine_amount > 0 ? "Belum Dibayar" : "Tidak Ada Denda"));
    setAdminNote(row.admin_note || "");
  };

  const handleSubmitAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionReport) return;

    setSubmittingAction(true);
    try {
      const numericFine = Number(fineAmount) || 0;
      const payload = {
        status: actionStatus,
        fine_amount: numericFine,
        fine_reason: fineReason,
        fine_status: numericFine > 0 ? (fineStatus === "Tidak Ada Denda" ? "Belum Dibayar" : fineStatus) : "Tidak Ada Denda",
        admin_note: adminNote,
      };

      const res = await api.damageReports.updateStatus(actionReport.id, payload);
      if (res.status === "success") {
        await fetchData();
        setActionReport(null);
        alert("Status dan denda laporan berhasil diperbarui!");
      } else {
        alert("Gagal memperbarui laporan: " + (res.message || "Error"));
      }
    } catch (err: any) {
      alert("Terjadi kesalahan: " + (err?.message || "Error"));
    } finally {
      setSubmittingAction(false);
    }
  };

  const filtered = reports.filter(
    (r) =>
      !search ||
      r.item_name.toLowerCase().includes(search.toLowerCase()) ||
      r.reporter_name.toLowerCase().includes(search.toLowerCase()) ||
      r.item_code.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;

  // Real stats calculation
  const inProgressCount = reports.filter((r) => r.status === "in_progress").length;
  const resolvedCount = reports.filter((r) => r.status === "resolved").length;
  const pendingCount = reports.filter((r) => r.status === "pending").length;

  return (
    <AdminLayout
      showSearch={true}
      searchValue={search}
      searchPlaceholder="Cari laporan..."
      onSearchChange={setSearch}
    >
      <div className="space-y-6">
        {/* Page header */}
        <div className={`flex items-start justify-between ${mounted ? "animate-fade-up" : "opacity-0"}`}>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Laporan Kerusakan & Kehilangan</h1>
            <p className="text-sm text-slate-500 mt-0.5">Rekapitulasi laporan barang yang mengalami masalah dan denda.</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-[#0785BC] hover:bg-[#0672a0] active:scale-95 rounded-xl transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Buat Laporan Baru
          </button>
        </div>

        {/* ── Stat Cards: Menunggu Tindak Lanjut & Selesai Diperbaiki Aktif untuk Filter ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Menunggu Tindak Lanjut (Aktif Filter) */}
          <div
            onClick={() => {
              setStatus(statusFilter === "pending" ? "" : "pending");
              setPage(1);
            }}
            className={`bg-white rounded-2xl border p-5 flex items-center justify-between cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${
              statusFilter === "pending" ? "border-[#0785BC] ring-2 ring-[#0785BC]/20" : "border-slate-100 shadow-sm"
            } ${mounted ? "animate-fade-up" : "opacity-0"}`}
          >
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Menunggu Tindak Lanjut {statusFilter === "pending" && "• Aktif"}
              </p>
              <p className="text-3xl font-bold tabular-nums text-slate-900">{pendingCount}</p>
              <p className="text-[11px] text-[#0785BC] mt-1">Klik untuk filter</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-red-50 text-red-500 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
          </div>

          {/* Card 2: Sedang Dalam Perbaikan (Non-aktif / Info proses) */}
          <div
            className={`bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center justify-between opacity-85 select-none ${
              mounted ? "animate-fade-up" : "opacity-0"
            }`}
          >
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Sedang Dalam Perbaikan
              </p>
              <p className="text-3xl font-bold tabular-nums text-slate-900">{inProgressCount}</p>
              <p className="text-[11px] text-slate-400 mt-1">Laporan dalam penanganan</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center shrink-0">
              <Wrench className="w-5 h-5" />
            </div>
          </div>

          {/* Card 3: Selesai Diperbaiki (Aktif Filter) */}
          <div
            onClick={() => {
              setStatus(statusFilter === "resolved" ? "" : "resolved");
              setPage(1);
            }}
            className={`bg-white rounded-2xl border p-5 flex items-center justify-between cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${
              statusFilter === "resolved" ? "border-[#0785BC] ring-2 ring-[#0785BC]/20" : "border-slate-100 shadow-sm"
            } ${mounted ? "animate-fade-up" : "opacity-0"}`}
          >
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Selesai Diperbaiki {statusFilter === "resolved" && "• Aktif"}
              </p>
              <p className="text-3xl font-bold tabular-nums text-slate-900">{resolvedCount}</p>
              <p className="text-[11px] text-emerald-600 mt-1">Klik untuk filter</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* ── Daftar Laporan ── */}
        <div className={`bg-white rounded-2xl border border-slate-100 shadow-sm ${mounted ? "animate-fade-up delay-200" : "opacity-0"}`}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-6 py-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900">Daftar Laporan Kerusakan</h2>
              <p className="text-xs text-slate-400">Total {filtered.length} laporan sesuai filter</p>
            </div>
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => { setStatus(e.target.value); setPage(1); }}
                className="appearance-none text-xs font-semibold border border-slate-200 rounded-xl px-3 py-2 pr-8 text-slate-600 bg-white focus:outline-none focus:ring-2 focus:ring-[#0785BC] transition-all"
              >
                {statusOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left bg-slate-50/50">
                  <th className="px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Barang</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Pelapor</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Deskripsi Masalah</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Tanggal Lapor</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Denda</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <td key={j} className="px-6 py-4">
                          <div className="h-4 bg-slate-100 rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-slate-400 text-xs">
                      Belum ada laporan kerusakan.
                    </td>
                  </tr>
                ) : (
                  filtered.map((row, i) => {
                    const isFullyResolved = row.status === "resolved" && (row.fine_status === "Sudah Dibayar" || row.fine_amount === 0);

                    return (
                      <tr
                        key={row.id}
                        style={{ animationDelay: `${250 + i * 60}ms` }}
                        className={`hover:bg-slate-50/60 transition-colors group ${mounted ? "animate-fade-up" : "opacity-0"}`}
                      >
                        {/* Barang */}
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-semibold text-slate-800 text-xs">{row.item_name}</p>
                            <p className="text-[11px] text-slate-400">{row.item_code}</p>
                          </div>
                        </td>

                        {/* Pelapor */}
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <Avatar name={row.reporter_name} color={avatarColors[i % avatarColors.length]} />
                            <span className="font-medium text-slate-700 text-xs">{row.reporter_name}</span>
                          </div>
                        </td>

                        {/* Deskripsi */}
                        <td className="px-4 py-4 max-w-xs text-xs text-slate-600 truncate">
                          {row.description}
                        </td>

                        {/* Tanggal */}
                        <td className="px-4 py-4 text-xs text-slate-500">{row.reported_date}</td>

                        {/* Status */}
                        <td className="px-4 py-4">
                          <StatusBadge status={row.status} />
                        </td>

                        {/* Denda */}
                        <td className="px-4 py-4">
                          {row.fine_amount > 0 ? (
                            <div>
                              <p className="font-bold text-xs text-rose-600">
                                Rp {row.fine_amount.toLocaleString("id-ID")}
                              </p>
                              <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold mt-0.5 ${
                                row.fine_status === "Sudah Dibayar"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-amber-50 text-amber-700"
                              }`}>
                                {row.fine_status}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">-</span>
                          )}
                        </td>

                        {/* Aksi */}
                        <td className="px-6 py-4 text-right">
                          {isFullyResolved ? (
                            <button
                              onClick={() => setHistoryReport(row)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 active:scale-95 rounded-lg transition-all"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Lihat Riwayat
                            </button>
                          ) : (
                            <button
                              onClick={() => handleOpenActionModal(row)}
                              className={`px-3 py-1.5 text-xs font-semibold text-white rounded-lg transition-all shadow-xs ${
                                row.status === "pending"
                                  ? "bg-blue-600 hover:bg-blue-700"
                                  : row.status === "in_progress"
                                  ? "bg-emerald-600 hover:bg-emerald-700"
                                  : "bg-amber-600 hover:bg-amber-700"
                              }`}
                            >
                              {row.status === "pending"
                                ? "Tindak Lanjut"
                                : row.status === "in_progress"
                                ? "Tandai Selesai / Denda"
                                : "Konfirmasi Denda"}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Menampilkan {total > 0 ? (page - 1) * PAGE_SIZE + 1 : 0}–{Math.min(page * PAGE_SIZE, total)} dari {total} data
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: Math.min(totalPages, 3) }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  className={`w-8 h-8 rounded-lg text-xs font-medium transition-all active:scale-95 ${
                    page === n ? "bg-[#0785BC] text-white" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {n}
                </button>
              ))}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Tindak Lanjut & Atur Denda */}
      {actionReport && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">Tindak Lanjut & Atur Denda</h2>
                <p className="text-xs text-slate-400 mt-0.5">{actionReport.item_name} ({actionReport.item_code})</p>
              </div>
              <button
                onClick={() => setActionReport(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitAction} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Status Penanganan *</label>
                <select
                  value={actionStatus}
                  onChange={(e) => setActionStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0785BC]"
                >
                  <option value="Sedang Diperbaiki">Sedang Diperbaiki (Proses)</option>
                  <option value="Selesai">Selesai (Sudah Diperbaiki / Beres)</option>
                  <option value="Menunggu Review">Menunggu Review</option>
                  <option value="Ditolak">Ditolak</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Total Denda (Rp)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">Rp</span>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={fineAmount}
                    onChange={(e) => setFineAmount(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full pl-10 pr-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0785BC]"
                    placeholder="0"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">Kosongkan jika tidak dikenakan denda</p>
              </div>

              {Number(fineAmount) > 0 && (
                <>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Alasan Pengenaan Denda</label>
                    <input
                      type="text"
                      value={fineReason}
                      onChange={(e) => setFineReason(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0785BC]"
                      placeholder="contoh: Biaya ganti modul lensa retak"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Status Pembayaran Denda</label>
                    <select
                      value={fineStatus}
                      onChange={(e) => setFineStatus(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0785BC]"
                    >
                      <option value="Belum Dibayar">Belum Dibayar</option>
                      <option value="Sudah Dibayar">Sudah Dibayar</option>
                      <option value="Tidak Ada Denda">Tidak Ada Denda</option>
                    </select>
                  </div>
                </>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Catatan Admin</label>
                <textarea
                  rows={2}
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0785BC] resize-none"
                  placeholder="Catatan penanganan atau keterangan suku cadang..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActionReport(null)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-50 font-semibold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingAction}
                  className="inline-flex items-center gap-1.5 px-5 py-2 bg-[#0785BC] text-white font-semibold rounded-xl hover:bg-[#0672a0] disabled:opacity-60 transition-all shadow-sm"
                >
                  {submittingAction && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Simpan & Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Lihat Riwayat (Read-Only) */}
      {historyReport && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">Riwayat Penyelesaian Laporan</h2>
                <p className="text-xs text-slate-400 mt-0.5">ID: {historyReport.item_code}</p>
              </div>
              <button
                onClick={() => setHistoryReport(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-50">
                <span className="text-slate-400 font-medium">Barang:</span>
                <span className="font-bold text-slate-800">{historyReport.item_name}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-50">
                <span className="text-slate-400 font-medium">Pelapor:</span>
                <span className="font-semibold text-slate-700">{historyReport.reporter_name}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-50">
                <span className="text-slate-400 font-medium">Tanggal Lapor:</span>
                <span className="text-slate-600">{historyReport.reported_date}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-50">
                <span className="text-slate-400 font-medium">Status Penanganan:</span>
                <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                  <Check className="w-3.5 h-3.5" /> Selesai
                </span>
              </div>

              {historyReport.fine_amount > 0 && (
                <>
                  <div className="flex justify-between py-1.5 border-b border-slate-50">
                    <span className="text-slate-400 font-medium">Total Denda:</span>
                    <span className="font-bold text-rose-600">Rp {historyReport.fine_amount.toLocaleString("id-ID")}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-50">
                    <span className="text-slate-400 font-medium">Status Pembayaran:</span>
                    <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded">
                      {historyReport.fine_status}
                    </span>
                  </div>
                  {historyReport.fine_reason && (
                    <div className="py-1 border-b border-slate-50">
                      <span className="text-slate-400 font-medium block mb-0.5">Alasan Denda:</span>
                      <p className="text-slate-700">{historyReport.fine_reason}</p>
                    </div>
                  )}
                </>
              )}

              {historyReport.admin_note && (
                <div className="py-1">
                  <span className="text-slate-400 font-medium block mb-0.5">Catatan Tindak Lanjut:</span>
                  <p className="text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    {historyReport.admin_note}
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => setHistoryReport(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-200 transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Buat Laporan Baru */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h2 className="text-base font-bold text-slate-900">Buat Laporan Kerusakan Baru</h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateReport} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Pilih Barang yang Rusak *</label>
                <select
                  required
                  value={formData.item_id}
                  onChange={(e) => setFormData({ ...formData, item_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0785BC]"
                >
                  <option value="">Pilih Barang...</option>
                  {items.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Judul Kerusakan *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0785BC]"
                  placeholder="contoh: Layar LCD Bergaris / Mati Total"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Deskripsi & Kronologi *</label>
                <textarea
                  required
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0785BC] resize-none"
                  placeholder="Jelaskan kondisi kerusakan dan indikasi penyebab..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-50 font-semibold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-5 py-2 bg-[#0785BC] text-white font-semibold rounded-xl hover:bg-[#0672a0] disabled:opacity-60 transition-all shadow-sm"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Kirim Laporan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
