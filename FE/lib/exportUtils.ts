import * as XLSX from "xlsx";
import api from "./api";
import { toast } from "@/components/Toast";

export type DateRangeFilter = "today" | "7days" | "30days" | "1year" | "custom" | "all";
export type ExportFormat = "xlsx" | "csv";

export interface DateRangeOption {
  key: DateRangeFilter;
  label: string;
  sublabel: string;
}

export const DATE_RANGE_OPTIONS: DateRangeOption[] = [
  { key: "today", label: "Hari Ini", sublabel: "Aktivitas sejak pukul 00:00 hari ini" },
  { key: "7days", label: "7 Hari Terakhir", sublabel: "Aktivitas 1 minggu terakhir" },
  { key: "30days", label: "30 Hari Terakhir", sublabel: "Aktivitas 1 bulan terakhir" },
  { key: "1year", label: "1 Tahun Terakhir", sublabel: "Aktivitas 1 tahun buku berjalan" },
  { key: "custom", label: "Kustom Kalender (Pilih Tanggal / Tahun)", sublabel: "Cari data spesifik dari tahun sebelumnya atau rentang bebas" },
  { key: "all", label: "Semua Periode", sublabel: "Seluruh data riil sejak awal platform" },
];

/**
 * Format timestamp into clean, readable Indonesian date & time
 */
export function formatDateTimeDisplay(val?: string | Date | null): string {
  if (!val) return "-";
  const d = new Date(val);
  if (isNaN(d.getTime())) return String(val);
  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Format date only (day-month-year)
 */
export function formatDateOnlyDisplay(val?: string | Date | null): string {
  if (!val) return "-";
  const d = new Date(val);
  if (isNaN(d.getTime())) return String(val);
  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Auto-fit column widths based on cell content length
 */
export function autoFitColumns(rows: Record<string, any>[]): { wch: number }[] {
  if (!rows || rows.length === 0) return [];
  const keys = Object.keys(rows[0]);
  return keys.map((key) => {
    const maxLen = Math.max(
      key.length,
      ...rows.slice(0, 150).map((r) => {
        const val = r[key];
        if (val === null || val === undefined) return 0;
        return String(val).length;
      })
    );
    return { wch: Math.min(Math.max(maxLen + 4, 13), 50) };
  });
}

/**
 * Filter data array by date range based on specified date field
 */
export function filterDataByDateRange<T>(
  data: T[],
  dateGetter: (item: T) => string | Date | undefined | null,
  range: DateRangeFilter,
  customStart?: string,
  customEnd?: string
): T[] {
  if (range === "all") return data;

  if (range === "custom") {
    const start = customStart ? new Date(customStart + "T00:00:00") : null;
    const end = customEnd ? new Date(customEnd + "T23:59:59") : null;

    return data.filter((item) => {
      const rawVal = dateGetter(item);
      if (!rawVal) return false;
      const itemDate = new Date(rawVal);
      if (isNaN(itemDate.getTime())) return false;
      if (start && itemDate < start) return false;
      if (end && itemDate > end) return false;
      return true;
    });
  }

  const now = new Date();
  let thresholdDate: Date;

  if (range === "today") {
    thresholdDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  } else if (range === "7days") {
    thresholdDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  } else if (range === "30days") {
    thresholdDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  } else if (range === "1year") {
    thresholdDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
  } else {
    return data;
  }

  return data.filter((item) => {
    const rawVal = dateGetter(item);
    if (!rawVal) return false;
    const itemDate = new Date(rawVal);
    if (isNaN(itemDate.getTime())) return false;
    return itemDate >= thresholdDate;
  });
}

/**
 * Export single dataset to CSV or Excel with clean headers & column widths
 */
export function exportDataset(
  filenamePrefix: string,
  sheetName: string,
  rows: Record<string, any>[],
  format: ExportFormat = "xlsx"
): void {
  if (!rows || rows.length === 0) {
    toast.warning("Tidak ada data yang sesuai dengan filter untuk diekspor.", "Data Kosong");
    return;
  }

  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = autoFitColumns(rows);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.substring(0, 31));

  const dateSlug = new Date().toISOString().slice(0, 10);
  const filename = `${filenamePrefix}_${dateSlug}.${format}`;

  if (format === "csv") {
    const csvContent = XLSX.utils.sheet_to_csv(ws);
    // Prepend UTF-8 BOM so Excel opens CSV with proper encoding
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } else {
    XLSX.writeFile(wb, filename, { bookType: "xlsx" });
  }
}

/**
 * Download a structured import/export template in XLSX or CSV
 */
export function downloadStructuredTemplate(
  templateName: string,
  sampleRows: Record<string, any>[],
  format: ExportFormat = "xlsx"
): void {
  const ws = XLSX.utils.json_to_sheet(sampleRows);
  ws["!cols"] = autoFitColumns(sampleRows);

  const filename = `${templateName}_Template.${format}`;

  if (format === "csv") {
    const csvContent = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } else {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, filename, { bookType: "xlsx" });
  }
}

/**
 * Fetch all related modules and create a Comprehensive Master Archive
 * Includes both single items & bundling packages, with correct borrower relations
 */
export async function exportComprehensiveSystemArchive(
  range: DateRangeFilter,
  format: ExportFormat = "xlsx",
  customStart?: string,
  customEnd?: string
): Promise<{ success: boolean; totalRows: number }> {
  const [borrowRes, returnRes, itemRes, packageRes, damageRes, userRes] = await Promise.all([
    api.borrowings.getAll({ limit: 1000 }),
    api.returns.getAll({ limit: 1000 }),
    api.items.getAll({ limit: 1000 }),
    api.packages.getAll(),
    api.damageReports.getAll({ limit: 1000 }),
    api.users.getAll({ limit: 1000 }),
  ]);

  const rawBorrowings = borrowRes.status === "success" && Array.isArray(borrowRes.data) ? borrowRes.data : [];
  const rawReturns    = returnRes.status === "success" && Array.isArray(returnRes.data) ? returnRes.data : [];
  const rawItems      = itemRes.status === "success" && Array.isArray(itemRes.data) ? itemRes.data : [];
  const rawPackages   = packageRes.status === "success" && Array.isArray(packageRes.data) ? packageRes.data : [];
  const rawDamages    = damageRes.status === "success" && Array.isArray(damageRes.data) ? damageRes.data : [];
  const rawUsers      = userRes.status === "success" && Array.isArray(userRes.data) ? userRes.data : [];

  // Filter each module by date
  const filteredBorrowings = filterDataByDateRange(rawBorrowings, (b) => b.borrow_date || b.created_at, range, customStart, customEnd);
  const filteredReturns    = filterDataByDateRange(rawReturns, (r) => r.return_date || r.actual_return_date || r.created_at || r.borrowings?.borrow_date, range, customStart, customEnd);
  const filteredItems      = filterDataByDateRange(rawItems, (i) => i.created_at || i.update_at, range, customStart, customEnd);
  const filteredPackages   = filterDataByDateRange(rawPackages, (p) => p.created_at, range, customStart, customEnd);
  const filteredDamages    = filterDataByDateRange(rawDamages, (d) => d.created_at, range, customStart, customEnd);
  const filteredUsers      = filterDataByDateRange(rawUsers, (u) => u.created_at, range, customStart, customEnd);

  // 1. Peminjaman Rows
  const borrowingRows = filteredBorrowings.map((b: any) => {
    const u = b.users || {};
    const itemsList = (b.borrowings_items || [])
      .map((bi: any) => `${bi.items?.name || "Barang"} (${bi.quantity || 1}x)`)
      .join(", ");
    const estDate = b.planned_return_date || (b.borrow_date ? new Date(new Date(b.borrow_date).getTime() + 7 * 86400000) : null);

    return {
      "Kode Peminjaman": b.borrow_code || "-",
      "Nama Peminjam": u.name || b.borrower_name || "-",
      "Nomor Induk / NIM": u.nomor_induk || "-",
      Email: u.email || "-",
      "No HP": u.no_hp || "-",
      "Daftar Barang Dipinjam": itemsList || b.purpose || "-",
      "Tanggal Pinjam": formatDateTimeDisplay(b.borrow_date || b.created_at),
      "Estimasi Batas Kembali": formatDateTimeDisplay(estDate),
      "Tanggal Selesai": b.actual_return_date ? formatDateTimeDisplay(b.actual_return_date) : "-",
      Status: b.status || "-",
      Keperluan: b.purpose || "-",
      "Catatan Admin": b.admin_notes || b.admin_note || "-",
    };
  });

  // 2. Pengembalian Rows (Properly resolves borrower user, dates, and condition)
  const returnRows = filteredReturns.map((r: any) => {
    const b = r.borrowings || {};
    const borrower = b.users || r.users || {};
    const receiver = r.receiver || {};
    const estDate = b.planned_return_date || (b.borrow_date ? new Date(new Date(b.borrow_date).getTime() + 7 * 86400000) : null);

    return {
      "Kode Peminjaman": b.borrow_code || r.borrow_code || "-",
      "Nama Peminjam": borrower.name || r.borrower_name || "-",
      "Nomor Induk / NIM": borrower.nomor_induk || "-",
      "Email Peminjam": borrower.email || r.borrower_email || "-",
      "No HP Peminjam": borrower.no_hp || r.borrower_phone || "-",
      "Tanggal Pinjam": formatDateTimeDisplay(b.borrow_date || r.borrow_date),
      "Batas Waktu Kembali": formatDateTimeDisplay(estDate || r.due_date),
      "Tanggal Resmi Kembali": formatDateTimeDisplay(r.return_date || r.actual_return_date || r.created_at),
      "Kondisi Barang": r.condition || "Baik",
      Status: b.status || r.status || "Dikembalikan",
      "Petugas Penerima": receiver.name || r.receiver_name || "-",
      "Catatan Pengembalian": r.note || r.notes || "-",
    };
  });

  // 3. Inventaris Barang Rows (INCLUDES BOTH Single Items and Package Bundles)
  const singleItemRows = (range === "all" ? rawItems : filteredItems).map((i: any) => ({
    "Tipe Aset": "Barang Satuan",
    "Kode Aset": i.code || "-",
    "Nama Aset": i.name || "-",
    Kategori: i.categories?.name || i.category || "Umum",
    "Total Stok / Komponen": `${i.stock ?? 0} Unit`,
    "Stok Tersedia / Ketersediaan": `${i.available_stock ?? i.stock ?? 0} Unit Siap Pinjam`,
    Kondisi: i.condition || "Baik",
    Status: i.status || "Tersedia",
    Lokasi: i.location || "Gudang Sarpras",
    "Deskripsi / Komponen": i.description || "-",
  }));

  const packageInventoryRows = (range === "all" ? rawPackages : filteredPackages).map((p: any) => {
    const compList = (p.packages_items || [])
      .map((pi: any) => `${pi.items?.name || "Item"} (${pi.quantity || 1}x)`)
      .join(", ");
    const totalUnitCount = (p.packages_items || []).reduce((sum: number, pi: any) => sum + (Number(pi.quantity) || 1), 0);
    const availText = p.is_available ? "Lengkap / Siap Dipinjam" : "Stok Komponen Terbatas";

    return {
      "Tipe Aset": "Paket Bundling",
      "Kode Aset": p.code || `PKG-${String(p.id).substring(0, 8).toUpperCase()}`,
      "Nama Aset": p.name || "-",
      Kategori: "Paket Sarpras",
      "Total Stok / Komponen": `${p.packages_items?.length || 0} Jenis Item (${totalUnitCount} Unit)`,
      "Stok Tersedia / Ketersediaan": availText,
      Kondisi: "Baik",
      Status: p.status || "Aktif",
      Lokasi: "Gudang Utama / Lab",
      "Deskripsi / Komponen": p.description ? `${p.description} [Isi: ${compList}]` : `[Isi: ${compList}]`,
    };
  });

  const combinedInventoryRows = [...singleItemRows, ...packageInventoryRows];

  // 4. Dedicated Paket Sarpras Detailed Breakdown Sheet
  const packageDetailRows = (range === "all" ? rawPackages : filteredPackages).map((p: any) => {
    const compList = (p.packages_items || [])
      .map((pi: any) => `${pi.items?.name || "Barang"} (${pi.quantity || 1} unit)`)
      .join("; ");
    const totalUnits = (p.packages_items || []).reduce((acc: number, pi: any) => acc + (Number(pi.quantity) || 1), 0);

    return {
      "Kode Paket": p.code || `PKG-${String(p.id).substring(0, 8).toUpperCase()}`,
      "Nama Paket": p.name || "-",
      "Deskripsi Paket": p.description || "-",
      Status: p.status || "Aktif",
      Ketersediaan: p.is_available ? "Lengkap (Siap Pakai)" : "Sebagian Dipinjam / Terbatas",
      "Jumlah Jenis Item": p.packages_items?.length || 0,
      "Total Unit Barang": totalUnits,
      "Daftar Komponen Barang": compList || "-",
      "Tanggal Dibuat": formatDateOnlyDisplay(p.created_at),
    };
  });

  // 5. Laporan Kerusakan Rows
  const damageRows = filteredDamages.map((d: any) => ({
    "Kode Laporan": d.report_code || `LPR-${String(d.id).substring(0, 8).toUpperCase()}`,
    "Kode Barang": d.items?.code || "-",
    "Nama Barang": d.items?.name || d.title || "-",
    "Nama Pelapor": d.users?.name || "-",
    "Role Pelapor": d.users?.role || "-",
    "Tanggal Lapor": formatDateTimeDisplay(d.created_at),
    "Judul Kerusakan": d.title || "-",
    "Deskripsi / Kronologi": d.description || "-",
    "Status Penanganan": d.status || "-",
    "Nominal Denda (Rp)": Number(d.fine_amount) || 0,
    "Alasan Denda": d.fine_reason || "-",
    "Status Denda": d.fine_status || "Tidak Ada Denda",
    "Catatan Petugas": d.admin_note || "-",
  }));

  // 6. Pengguna Civitas Rows
  const userRows = (range === "all" ? rawUsers : filteredUsers).map((u: any) => ({
    "Nomor Induk / NIM": u.nomor_induk || "-",
    "Nama Lengkap": u.name || "-",
    Email: u.email || "-",
    "No Telepon": u.no_hp || "-",
    Peran: u.role || "-",
    "Status Akun": u.status || "Aktif",
    "Tanggal Registrasi": formatDateTimeDisplay(u.created_at),
  }));

  const wb = XLSX.utils.book_new();

  if (borrowingRows.length > 0) {
    const ws = XLSX.utils.json_to_sheet(borrowingRows);
    ws["!cols"] = autoFitColumns(borrowingRows);
    XLSX.utils.book_append_sheet(wb, ws, "Peminjaman");
  }
  if (returnRows.length > 0) {
    const ws = XLSX.utils.json_to_sheet(returnRows);
    ws["!cols"] = autoFitColumns(returnRows);
    XLSX.utils.book_append_sheet(wb, ws, "Pengembalian");
  }
  if (combinedInventoryRows.length > 0) {
    const ws = XLSX.utils.json_to_sheet(combinedInventoryRows);
    ws["!cols"] = autoFitColumns(combinedInventoryRows);
    XLSX.utils.book_append_sheet(wb, ws, "Inventaris_Barang");
  }
  if (packageDetailRows.length > 0) {
    const ws = XLSX.utils.json_to_sheet(packageDetailRows);
    ws["!cols"] = autoFitColumns(packageDetailRows);
    XLSX.utils.book_append_sheet(wb, ws, "Paket_Sarpras");
  }
  if (damageRows.length > 0) {
    const ws = XLSX.utils.json_to_sheet(damageRows);
    ws["!cols"] = autoFitColumns(damageRows);
    XLSX.utils.book_append_sheet(wb, ws, "Laporan_Kerusakan");
  }
  if (userRows.length > 0) {
    const ws = XLSX.utils.json_to_sheet(userRows);
    ws["!cols"] = autoFitColumns(userRows);
    XLSX.utils.book_append_sheet(wb, ws, "Pengguna_Civitas");
  }

  const totalRows = borrowingRows.length + returnRows.length + combinedInventoryRows.length + damageRows.length + userRows.length;

  if (totalRows === 0) {
    toast.warning("Tidak ada data riil ditemukan dalam rentang waktu yang dipilih.", "Data Kosong");
    return { success: false, totalRows: 0 };
  }

  const dateSlug = new Date().toISOString().slice(0, 10);
  const rangeSlug = range === "custom" && customStart && customEnd ? `${customStart}_sd_${customEnd}` : range;
  const filename = `SARPRAS_POKADA_Master_Archive_${rangeSlug}_${dateSlug}.${format}`;

  if (format === "csv") {
    const consolidated = [
      ...borrowingRows.map((r) => ({ Modul: "PEMINJAMAN", ...r })),
      ...returnRows.map((r) => ({ Modul: "PENGEMBALIAN", ...r })),
      ...combinedInventoryRows.map((r) => ({ Modul: "INVENTARIS", ...r })),
      ...damageRows.map((r) => ({ Modul: "KERUSAKAN", ...r })),
    ];
    const wsConsolidated = XLSX.utils.json_to_sheet(consolidated);
    wsConsolidated["!cols"] = autoFitColumns(consolidated);
    const csvContent = XLSX.utils.sheet_to_csv(wsConsolidated);
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } else {
    XLSX.writeFile(wb, filename, { bookType: "xlsx" });
  }

  return { success: true, totalRows };
}
