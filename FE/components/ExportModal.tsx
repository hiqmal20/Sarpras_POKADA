"use client";

import { useState } from "react";
import {
  Download,
  Upload,
  X,
  FileSpreadsheet,
  FileText,
  Calendar,
  Check,
  Loader2,
  Clock,
  Layers,
  Sparkles,
} from "lucide-react";
import {
  DateRangeFilter,
  ExportFormat,
  DATE_RANGE_OPTIONS,
  exportDataset,
  exportComprehensiveSystemArchive,
  filterDataByDateRange,
  downloadStructuredTemplate,
} from "@/lib/exportUtils";
import { toast } from "@/components/Toast";
import { useLanguage } from "@/lib/i18n";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  moduleName?: string; // e.g. "Peminjaman", "Pengembalian", "Inventaris", "Laporan Kerusakan", "Semua Data"
  isMasterArchive?: boolean;
  // If exporting specific dataset directly:
  data?: any[];
  dateFieldGetter?: (item: any) => string | Date | undefined | null;
  dataRowMapper?: (item: any) => Record<string, any>;
  filenamePrefix?: string;

  // Import capability inside the same modal
  allowImport?: boolean;
  importTitle?: string;
  importTemplateFilename?: string;
  importTemplateHeader?: string;
  importTemplateContent?: string;
  onExecuteImport?: (file: File) => Promise<{ success: number; failed: number } | any>;
}

export default function ExportModal({
  isOpen,
  onClose,
  title = "Kelola Data (Ekspor / Impor)",
  description = "Pilih aksi ekspor laporan atau impor berkas massal.",
  moduleName = "Data",
  isMasterArchive = false,
  data = [],
  dateFieldGetter,
  dataRowMapper,
  filenamePrefix = "Laporan",
  allowImport = false,
  importTitle = "Impor Berkas CSV",
  importTemplateFilename = "template.csv",
  importTemplateHeader = "Format CSV",
  importTemplateContent = "",
  onExecuteImport,
}: ExportModalProps) {
  const { t, lang } = useLanguage();
  const [activeTab, setActiveTab] = useState<"export" | "import">("export");
  const [selectedRange, setSelectedRange] = useState<DateRangeFilter>("all");
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>("xlsx");
  const [exporting, setExporting] = useState(false);

  // Custom Calendar date range state
  const currentYear = new Date().getFullYear();
  const [customStartDate, setCustomStartDate] = useState<string>(`${currentYear}-01-01`);
  const [customEndDate, setCustomEndDate] = useState<string>(new Date().toISOString().slice(0, 10));

  // Import state
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importSummary, setImportSummary] = useState<{ success: number; failed: number } | null>(null);

  if (!isOpen) return null;

  // Quick year presets (current year down to 4 years prior)
  const quickYears = [currentYear, currentYear - 1, currentYear - 2, currentYear - 3, currentYear - 4];

  const handleSelectYear = (year: number) => {
    setSelectedRange("custom");
    setCustomStartDate(`${year}-01-01`);
    setCustomEndDate(`${year}-12-31`);
  };

  // Compute preview count if single dataset
  let matchedCount = data.length;
  if (!isMasterArchive && dateFieldGetter) {
    matchedCount = filterDataByDateRange(data, dateFieldGetter, selectedRange, customStartDate, customEndDate).length;
  }

  const handleExecuteExport = async () => {
    setExporting(true);
    try {
      if (isMasterArchive) {
        await exportComprehensiveSystemArchive(selectedRange, selectedFormat, customStartDate, customEndDate);
        onClose();
      } else {
        const filteredItems = dateFieldGetter
          ? filterDataByDateRange(data, dateFieldGetter, selectedRange, customStartDate, customEndDate)
          : data;

        const rows = dataRowMapper
          ? filteredItems.map(dataRowMapper)
          : filteredItems;

      exportDataset(filenamePrefix, moduleName, rows, selectedFormat);
      toast.success(`Data ${moduleName} berhasil diekspor ke format ${selectedFormat.toUpperCase()}!`, "Ekspor Berhasil");
      onClose();
    }
  } catch (err: any) {
    console.error("Gagal melakukan ekspor:", err);
    toast.error(err.message || "Terjadi kesalahan saat memproses ekspor data.", "Ekspor Gagal");
  } finally {
      setExporting(false);
    }
  };

  // Parses importTemplateContent CSV into array of objects for Excel/CSV template download
  const getParsedTemplateRows = (): Record<string, any>[] => {
    if (!importTemplateContent) return [];
    const lines = importTemplateContent.trim().split("\n");
    if (lines.length === 0) return [];
    const headers = lines[0].split(",").map((h) => h.trim());
    const sampleRows: Record<string, any>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const vals = lines[i].split(",").map((v) => v.trim());
      const row: Record<string, any> = {};
      headers.forEach((h, idx) => {
        row[h] = vals[idx] ?? "";
      });
      sampleRows.push(row);
    }
    return sampleRows.length > 0 ? sampleRows : [Object.fromEntries(headers.map((h) => [h, ""]))];
  };

  const handleDownloadTemplate = (format: "xlsx" | "csv") => {
    const rows = getParsedTemplateRows();
    const cleanPrefix = importTemplateFilename.replace(/\.(csv|xlsx)$/i, "");
    if (rows.length > 0) {
      downloadStructuredTemplate(cleanPrefix, rows, format);
    } else {
      // Fallback
      const blob = new Blob(["\uFEFF" + (importTemplateContent || "")], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${cleanPrefix}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleExecuteImportAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile || !onExecuteImport) return;

    setImporting(true);
    setImportSummary(null);
    try {
      const res = await onExecuteImport(importFile);
      if (res) {
        const succ = res.success ?? (res.data?.success?.length || 0);
        const fail = res.failed ?? (res.data?.failed?.length || 0);
        setImportSummary({ success: succ, failed: fail });
        if (fail === 0) {
          toast.success(`Seluruh ${succ} data berhasil diimpor!`, "Impor Selesai");
          setTimeout(() => {
            onClose();
          }, 1500);
        } else {
          toast.warning(`Impor selesai: ${succ} data masuk, ${fail} data gagal/duplikat.`, "Sebagian Gagal");
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Gagal memproses impor berkas.", "Impor Gagal");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[100] p-3 sm:p-6 animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full p-4 sm:p-6 shadow-2xl border border-slate-200 animate-scale-in my-auto max-h-[92dvh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#0785BC]/10 text-[#0785BC] flex items-center justify-center border border-[#0785BC]/20 shrink-0">
              {activeTab === "export" ? <Download className="w-5 h-5" /> : <Upload className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-snug">{title}</h2>
              <p className="text-[11px] text-slate-400 mt-0.5">{description}</p>
            </div>
          </div>
          <button
            onClick={() => {
              setImportFile(null);
              setImportSummary(null);
              onClose();
            }}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher: Ekspor Data vs Impor CSV */}
        {allowImport && (
          <div className="flex p-1 bg-slate-100 rounded-2xl border border-slate-200/60 mb-4">
            <button
              type="button"
              onClick={() => setActiveTab("export")}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                activeTab === "export"
                  ? "bg-white text-[#0785BC] shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              {t("export.tab_export", "Ekspor Data")}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("import")}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                activeTab === "import"
                  ? "bg-white text-[#0785BC] shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              {t("export.tab_import", "Impor Berkas")}
            </button>
          </div>
        )}

        {/* Content Tab: EXPORT */}
        {activeTab === "export" && (
          <div className="space-y-4 text-xs">
            {/* Rentang Waktu */}
            <div>
              <label className="block font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#0785BC]" />
                {lang === "en" ? "Time Filter (Select Date Range)" : t("export.date_range", "Pilih Kategori Waktu (Filter Rentang Tanggal)")}
              </label>
              <div className="space-y-1.5">
                {[
                  { key: "today" as DateRangeFilter, label: lang === "en" ? "Today" : "Hari Ini", sublabel: lang === "en" ? "Activity since 00:00 today" : "Aktivitas sejak pukul 00:00 hari ini" },
                  { key: "7days" as DateRangeFilter, label: lang === "en" ? "Last 7 Days" : "7 Hari Terakhir", sublabel: lang === "en" ? "Past 1 week activity" : "Aktivitas 1 minggu terakhir" },
                  { key: "30days" as DateRangeFilter, label: lang === "en" ? "Last 30 Days" : "30 Hari Terakhir", sublabel: lang === "en" ? "Past 1 month activity" : "Aktivitas 1 bulan terakhir" },
                  { key: "1year" as DateRangeFilter, label: lang === "en" ? "Last 1 Year" : "1 Tahun Terakhir", sublabel: lang === "en" ? "Past 1 calendar/fiscal year" : "Aktivitas 1 tahun buku berjalan" },
                  { key: "custom" as DateRangeFilter, label: lang === "en" ? "Custom Range (Pick Dates / Year)" : "Kustom Kalender (Pilih Tanggal / Tahun)", sublabel: lang === "en" ? "Pick specific years or flexible start & end dates" : "Cari data spesifik dari tahun sebelumnya atau rentang bebas" },
                  { key: "all" as DateRangeFilter, label: lang === "en" ? "All Time" : "Semua Periode", sublabel: lang === "en" ? "Entire historical data across platform" : "Seluruh data riil sejak awal platform" },
                ].map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setSelectedRange(opt.key)}
                    className={`w-full p-2.5 rounded-xl text-left border transition-all flex items-center justify-between cursor-pointer ${
                      selectedRange === opt.key
                        ? "border-[#0785BC] bg-blue-50/60 ring-2 ring-[#0785BC]/20 text-[#0785BC]"
                        : "border-slate-200/80 hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <div>
                      <p className="font-bold text-xs leading-snug">{opt.label}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{opt.sublabel}</p>
                    </div>
                    {selectedRange === opt.key && (
                      <div className="w-4.5 h-4.5 rounded-full bg-[#0785BC] text-white flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}
                  </button>
                ))}
              </div>

              {/* Interactive Calendar Date Range Picker (shown when custom is selected) */}
              {selectedRange === "custom" && (
                <div className="mt-3 p-3.5 bg-blue-50/40 rounded-2xl border border-blue-200/80 space-y-3 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-[#0785BC]" />
                      {lang === "en" ? "Select Calendar Dates" : "Pilih Tanggal Kalender"}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">{lang === "en" ? "Flexible year & date range" : "Bebas pilih tahun & tanggal"}</span>
                  </div>

                  {/* Quick Year Shortcuts */}
                  <div>
                    <p className="text-[10px] font-semibold text-slate-500 mb-1.5">{lang === "en" ? "Quick Select Year:" : "Pilih Tahun Cepat:"}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {quickYears.map((yr) => {
                        const isThisYear = customStartDate === `${yr}-01-01` && customEndDate === `${yr}-12-31`;
                        return (
                          <button
                            key={yr}
                            type="button"
                            onClick={() => handleSelectYear(yr)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                              isThisYear
                                ? "bg-[#0785BC] text-white border-[#0785BC] shadow-2xs"
                                : "bg-white text-slate-700 border-slate-200 hover:border-[#0785BC] hover:text-[#0785BC]"
                            }`}
                          >
                            {lang === "en" ? `Year ${yr}` : `Tahun ${yr}`}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Dual Calendar Pickers */}
                  <div className="grid grid-cols-2 gap-2.5 pt-1">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        {lang === "en" ? "From Date" : "Dari Tanggal"}
                      </label>
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0785BC]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        {lang === "en" ? "To Date" : "Sampai Tanggal"}
                      </label>
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0785BC]"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Format Pilihan */}
            <div>
              <label className="block font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                {lang === "en" ? "Select File Format" : t("export.select_format", "Pilih Format Berkas")}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedFormat("xlsx")}
                  className={`p-2.5 rounded-xl border text-left transition-all flex items-center gap-2 cursor-pointer ${
                    selectedFormat === "xlsx"
                      ? "border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-500/20 text-emerald-800"
                      : "border-slate-200 hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 font-bold text-xs">
                    XLS
                  </div>
                  <div>
                    <p className="font-bold text-xs">Excel (.xlsx)</p>
                    <p className="text-[10px] text-slate-400">{lang === "en" ? "Neat & formatted spreadsheet" : "Kolom rapi & terstruktur"}</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedFormat("csv")}
                  className={`p-2.5 rounded-xl border text-left transition-all flex items-center gap-2 cursor-pointer ${
                    selectedFormat === "csv"
                      ? "border-blue-500 bg-blue-50/60 ring-2 ring-blue-500/20 text-blue-800"
                      : "border-slate-200 hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 font-bold text-xs">
                    CSV
                  </div>
                  <div>
                    <p className="font-bold text-xs">Teks (.csv)</p>
                    <p className="text-[10px] text-slate-400">{lang === "en" ? "UTF-8 BOM Excel ready" : "UTF-8 BOM siap Excel"}</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Preview Info */}
            <div className="bg-slate-50 border border-slate-200/70 p-3 rounded-xl flex items-center justify-between text-xs text-slate-600">
              {isMasterArchive ? (
                <span className="flex items-center gap-1.5 text-slate-700 font-semibold text-[11px]">
                  <Layers className="w-3.5 h-3.5 text-[#0785BC] shrink-0" />
                  {lang === "en" ? "All 5 core modules: Borrowings, Returns, Items, Damage Reports & Users" : "Seluruh 5 modul: Peminjaman, Pengembalian, Inventaris, Kerusakan & User"}
                </span>
              ) : (
                <span className="text-[11px]">
                  {lang === "en" ? "Filtered data:" : "Data terfilter:"} <strong className="font-bold text-slate-900">{matchedCount} {lang === "en" ? "rows" : "baris"}</strong>
                  {selectedRange === "custom" && (
                    <span className="text-slate-400 ml-1">({customStartDate} {lang === "en" ? "to" : "s/d"} {customEndDate})</span>
                  )}
                </span>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 font-semibold rounded-xl transition-colors text-xs cursor-pointer"
              >
                {t("common.cancel", "Batal")}
              </button>
              <button
                type="button"
                disabled={exporting || (!isMasterArchive && matchedCount === 0)}
                onClick={handleExecuteExport}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#0785BC] to-[#0672a0] hover:from-[#0672a0] hover:to-[#055c82] text-white font-bold rounded-xl shadow-sm hover:shadow transition-all disabled:opacity-50 text-xs cursor-pointer"
              >
                {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                {lang === "en" ? "Download Data" : t("export.download_btn", "Unduh Data")} ({selectedFormat.toUpperCase()})
              </button>
            </div>
          </div>
        )}

        {/* Content Tab: IMPORT */}
        {activeTab === "import" && allowImport && (
          <form onSubmit={handleExecuteImportAction} className="space-y-4 text-xs">
            {/* Template Download Card */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/70 space-y-2.5">
              <div className="min-w-0">
                <p className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  {importTitle}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {importTemplateHeader || "Gunakan template resmi untuk format kolom yang terstruktur dan rapi"}
                </p>
              </div>

              {/* Download Buttons: XLSX and CSV */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleDownloadTemplate("xlsx")}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-xl border border-emerald-200 text-xs transition-colors"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  Template Excel (.xlsx)
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadTemplate("csv")}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-xl border border-blue-200 text-xs transition-colors"
                >
                  <FileText className="w-3.5 h-3.5 text-blue-600" />
                  Template CSV (.csv)
                </button>
              </div>
            </div>

            {/* File Input */}
            <div>
              <label className="block font-bold text-slate-700 mb-1.5">Pilih Berkas (.csv / .xlsx) *</label>
              <input
                type="file"
                accept=".csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                required
                onChange={(e) => {
                  setImportFile(e.target.files?.[0] || null);
                  setImportSummary(null);
                }}
                className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-[#0785BC] hover:file:bg-blue-100 border border-slate-200 rounded-2xl p-2 cursor-pointer bg-slate-50"
              />
            </div>

            {/* Result Feedback */}
            {importSummary && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl space-y-1">
                <p className="font-bold text-slate-900 text-xs">Hasil Pemrosesan:</p>
                <p className="text-emerald-700 font-semibold">• Berhasil diimpor: {importSummary.success} baris</p>
                {importSummary.failed > 0 && (
                  <p className="text-rose-600 font-semibold">• Gagal: {importSummary.failed} baris</p>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 font-semibold rounded-xl text-xs"
              >
                Tutup
              </button>
              <button
                type="submit"
                disabled={importing || !importFile}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#0785BC] text-white font-bold rounded-xl hover:bg-[#0672a0] disabled:opacity-50 transition-all shadow-sm text-xs"
              >
                {importing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Mulai Impor Data
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
