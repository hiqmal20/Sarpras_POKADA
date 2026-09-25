"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { isItemEmptyStock, isPackageEmptyStock, normalizeItem } from "@/lib/item";
import {
  ArrowLeft,
  ArrowRight,
  Armchair,
  Camera,
  Car,
  CheckCircle2,
  ChevronRight,
  CookingPot,
  Cpu,
  FlaskConical,
  Layers,
  LayoutGrid,
  Music,
  Package,
  Pencil,
  Trophy,
  Wifi,
  X,
  AlertTriangle,
} from "lucide-react";
import api from "@/lib/api";
import { UserLayout } from "@/components/user";
import { useLanguage } from "@/lib/i18n";

type DetailTab = "item" | "paket";

interface Catalog {
  id: string;
  name: string;
  description: string;
  image?: string;
  itemCount: number;
  packageCount: number;
}

const COVERS = [
  "from-[#0785BC] to-[#0aa5e0]",
  "from-violet-600 to-indigo-500",
  "from-emerald-600 to-teal-500",
  "from-amber-500 to-orange-500",
  "from-rose-500 to-pink-500",
  "from-cyan-600 to-sky-500",
];

function catalogIcon(name: string) {
  const n = name.toLowerCase();
  if (n.includes("elektron") || n.includes("komputer") || n.includes("laptop")) return Cpu;
  if (n.includes("furni") || n.includes("mebel") || n.includes("kursi") || n.includes("meja")) return Armchair;
  if (n.includes("olahraga") || n.includes("sport")) return Trophy;
  if (n.includes("musik") || n.includes("audio") || n.includes("sound") || n.includes("mic")) return Music;
  if (n.includes("lab")) return FlaskConical;
  if (n.includes("tulis") || n.includes("atk") || n.includes("spidol") || n.includes("kertas")) return Pencil;
  if (n.includes("kendaraan") || n.includes("mobil") || n.includes("motor")) return Car;
  if (n.includes("dapur") || n.includes("masak")) return CookingPot;
  if (n.includes("jaringan") || n.includes("network") || n.includes("wifi")) return Wifi;
  if (n.includes("foto") || n.includes("kamera") || n.includes("video") || n.includes("multimedia")) return Camera;
  return LayoutGrid;
}

const norm = (v: any) => String(v ?? "").toLowerCase().trim();

function itemMatches(item: any, cat: Catalog) {
  if (item.category_id && item.category_id === cat.id) return true;
  if (norm(item.category) === norm(cat.name)) return true;
  if (norm(item.categories?.name) === norm(cat.name)) return true;
  return false;
}

function pkgMatches(pkg: any, cat: Catalog) {
  const target = norm(cat.name);
  const list: string[] = Array.isArray(pkg.categories) ? pkg.categories : [];
  if (list.some((c) => norm(c) === target)) return true;
  const parts = String(pkg.category ?? "").split(",").map((s) => norm(s));
  if (parts.includes(target)) return true;
  const rows = pkg.packages_items || [];
  if (
    rows.some(
      (r: any) =>
        norm(r.items?.categories?.name) === target || norm(r.items?.category) === target
    )
  )
    return true;
  return false;
}

export default function UserCatalogPage() {
  return (
    <Suspense fallback={<CatalogLoadingFallback />}>
      <UserCatalogContent />
    </Suspense>
  );
}

function CatalogLoadingFallback() {
  const { t } = useLanguage();
  const tr = (k: string, fb: string) => {
    const v = t(k);
    return v === k ? fb : v;
  };
  return <div className="max-w-6xl mx-auto p-12 text-center text-sm text-slate-400">{tr("catalog.loading", "Memuat katalog...")}</div>;
}

function UserCatalogContent() {
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const tr = (k: string, fb: string) => {
    const v = t(k);
    return v === k ? fb : v;
  };
  const [categories, setCategories] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedCatalog, setSelectedCatalog] = useState<Catalog | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>("item");

  const [selectedPkg, setSelectedPkg] = useState<any>(null);
  const [extraItems, setExtraItems] = useState<any[]>([]);
  const [borrowDate, setBorrowDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [purpose, setPurpose] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    const pkgId = searchParams.get("paket");
    if (pkgId && packages.length > 0 && !selectedPkg) {
      const found = packages.find((p: any) => String(p.id) === pkgId);
      if (found) {
        setSelectedPkg(found);
        setExtraItems([]);
        setFeedback(
          isPackageEmptyStock(found)
            ? { type: "error", text: tr("catalog.pkg_unavailable", "Paket ini sedang tidak tersedia karena salah satu isinya habis.") }
            : null
        );
        window.history.replaceState(null, "", "/user/item_catalog");
      }
    }
  }, [searchParams, packages, selectedPkg]);

  useEffect(() => {
    const q = searchParams.get("q");
    if (q !== null) setSearch(q);
  }, [searchParams]);

  useEffect(() => {
    async function load() {
      try {
        const [catRes, itemsRes, packagesRes] = await Promise.all([
          api.categories.getAll(),
          api.items.getAll({ limit: 100 }),
          api.packages.getAll(),
        ]);
        if (catRes.status === "success" && Array.isArray(catRes.data)) setCategories(catRes.data);
        if (itemsRes.status === "success" && Array.isArray(itemsRes.data))
          setItems(itemsRes.data.map(normalizeItem));
        if (packagesRes.status === "success" && Array.isArray(packagesRes.data))
          setPackages(packagesRes.data);
      } catch {
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const catalogs: Catalog[] = useMemo(() => {
    if (categories.length > 0) {
      return categories.map((c: any) => {
        const name = c.name || tr("catalog.no_name", "Tanpa Nama");
        const matchedItems = items.filter((it) => itemMatches(it, { id: c.id, name } as Catalog));
        const matchedPkgs = packages.filter((p) => pkgMatches(p, { id: c.id, name } as Catalog));
        const cover =
          matchedItems.find((it: any) => it.image)?.image ||
          matchedPkgs.find((p: any) => p.image_url)?.image_url;
        return {
          id: String(c.id),
          name,
          description: c.description || `${matchedItems.length} ${tr("catalog.items_word", "barang")} • ${matchedPkgs.length} ${tr("catalog.packages_word", "paket")} ${tr("catalog.in_catalog", "tersedia dalam katalog ini")}.`,
          image: cover,
          itemCount: matchedItems.length,
          packageCount: matchedPkgs.length,
        };
      });
    }
    const grouped = new Map<string, { items: any[]; image?: string }>();
    items.forEach((it: any) => {
      const key = it.category || tr("catalog.no_category", "Tanpa Kategori");
      if (!grouped.has(key)) grouped.set(key, { items: [] });
      const g = grouped.get(key)!;
      g.items.push(it);
      if (!g.image && it.image) g.image = it.image;
    });
    return Array.from(grouped.entries()).map(([name, g], idx) => {
      const matchedPkgs = packages.filter((p) => pkgMatches(p, { id: `local-${idx}`, name } as Catalog));
      return {
        id: `local-${idx}`,
        name,
        description: `${g.items.length} ${tr("catalog.items_word", "barang")} • ${matchedPkgs.length} ${tr("catalog.packages_word", "paket")} ${tr("catalog.in_catalog", "tersedia dalam katalog ini")}.`,
        image: g.image,
        itemCount: g.items.length,
        packageCount: matchedPkgs.length,
      };
    });
  }, [categories, items, packages, t]);

  const q = search.trim().toLowerCase();
  const visibleCatalogs = catalogs.filter(
    (c) => !q || c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q)
  );

  const detailItems = !selectedCatalog
    ? []
    : items.filter(
        (it: any) =>
          itemMatches(it, selectedCatalog) &&
          (!q || it.name.toLowerCase().includes(q))
      );

  const detailPackages = !selectedCatalog
    ? []
    : packages.filter((p: any) => {
        if (!pkgMatches(p, selectedCatalog)) return false;
        if (!q) return true;
        const isi = (p.packages_items || [])
          .map((r: any) => r.items?.name || "")
          .join(" ")
          .toLowerCase();
        return p.name.toLowerCase().includes(q) || isi.includes(q);
      });

  const availableItems = items.filter((it: any) => !isItemEmptyStock(it));

  async function submitPackage(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedPkg || !borrowDate || !returnDate || !purpose.trim()) {
      setFeedback({ type: "error", text: tr("catalog.fill_all", "Lengkapi semua data peminjaman.") });
      return;
    }
    if (isPackageEmptyStock(selectedPkg)) {
      setFeedback({ type: "error", text: tr("catalog.pkg_unavailable", "Paket ini sedang tidak tersedia karena salah satu isinya habis.") });
      return;
    }
    if (returnDate < borrowDate) {
      setFeedback({ type: "error", text: tr("catalog.return_before_start", "Tanggal pengembalian tidak boleh sebelum tanggal mulai.") });
      return;
    }
    setFeedback(null);
    setSubmitting(true);
    const packageItems = (selectedPkg.packages_items || [])
      .map((row: any) => ({ item_id: row.item_id || row.items?.id, quantity: row.quantity || 1 }))
      .filter((row: any) => row.item_id);
    const extras = extraItems.map((it: any) => ({ item_id: it.id, quantity: 1 }));
    const uniqueItems = [...packageItems, ...extras].filter(
      (it, idx, arr) => arr.findIndex((x) => x.item_id === it.item_id) === idx
    );
    const validItems = uniqueItems.filter((it) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(it.item_id)
    );
    if (validItems.length === 0) {
      setFeedback({ type: "error", text: tr("catalog.pkg_no_valid", "Paket ini belum memiliki item database yang valid.") });
      setSubmitting(false);
      return;
    }
    const result = await api.borrowings.create({
      purpose: `[Paket: ${selectedPkg.name}] ${purpose.trim()}`,
      borrow_date: borrowDate,
      return_date: returnDate,
      items: validItems,
    });
    setSubmitting(false);
    if (result.status === "success") {
      setFeedback({ type: "success", text: tr("catalog.pkg_success", "Pengajuan peminjaman paket berhasil dikirim dan menunggu persetujuan admin.") });
      setSelectedPkg(null);
      setExtraItems([]);
      setBorrowDate("");
      setReturnDate("");
      setPurpose("");
    } else {
      const errMsg =
        result.errors?.map((e: any) => e.message).join(", ") ||
        result.message ||
        tr("catalog.pkg_fail", "Pengajuan peminjaman gagal dikirim.");
      setFeedback({ type: "error", text: errMsg });
    }
  }

  function openCatalog(cat: Catalog) {
    setSelectedCatalog(cat);
    setDetailTab("item");
    setFeedback(null);
  }

  return (
    <UserLayout
      showSearch={true}
      searchValue={search}
      onSearchChange={setSearch}
      searchPlaceholder={tr("catalog.search_ph", "Cari katalog atau barang...")}
    >
      <div className="user-page-shell w-full min-w-0 space-y-6">
        {feedback && !selectedPkg && (
          <div
            className={`rounded-xl border p-4 text-sm flex items-center justify-between gap-2 ${
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
            <button type="button" onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {!selectedCatalog ? (
          <>
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0785BC] to-[#0aa5e0] px-5 py-6 md:px-7 text-white shadow-sm">
              <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-white/10" />
              <div className="absolute right-20 bottom-[-3rem] w-32 h-32 rounded-full bg-white/10" />
              <div className="relative">
                <p className="text-xs font-semibold uppercase tracking-widest text-white/70">{tr("catalog.brand", "Sarpras Pokada")}</p>
                <h1 className="mt-1 text-2xl md:text-3xl font-extrabold tracking-tight">{tr("catalog.title", "Katalog Barang")}</h1>
                <p className="mt-2 text-sm text-white/80 max-w-xl">
                  {tr("catalog.hero_desc", "Jelajahi katalog yang tersedia, lalu klik salah satu katalog untuk melihat daftar barang per item dan per paket di dalamnya.")}
                </p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
                  <span className="rounded-full bg-white/15 px-3 py-1.5 backdrop-blur">{catalogs.length} {tr("catalog.catalogs", "Katalog")}</span>
                  <span className="rounded-full bg-white/15 px-3 py-1.5 backdrop-blur">{items.length} {tr("catalog.items", "Barang")}</span>
                  <span className="rounded-full bg-white/15 px-3 py-1.5 backdrop-blur">{packages.length} {tr("catalog.packages", "Paket")}</span>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="bg-white rounded-2xl border border-slate-200/70 overflow-hidden">
                    <div className="h-[148px] bg-slate-100 animate-pulse" />
                    <div className="p-4 space-y-2">
                      <div className="h-3.5 bg-slate-100 rounded animate-pulse w-2/3" />
                      <div className="h-3 bg-slate-100 rounded animate-pulse" />
                      <div className="h-3 bg-slate-100 rounded animate-pulse w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : visibleCatalogs.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200/70 p-12 text-center">
                <LayoutGrid className="w-9 h-9 mx-auto mb-3 text-slate-200" />
                <p className="text-sm font-bold text-slate-600">{tr("catalog.no_match", "Belum ada katalog yang sesuai pencarian.")}</p>
                <p className="text-xs text-slate-400 mt-1">{tr("catalog.no_match_sub", "Coba kata kunci lain atau hubungi admin sarpras.")}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {visibleCatalogs.map((cat, idx) => {
                  const Icon = catalogIcon(cat.name);
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => openCatalog(cat)}
                      className="group text-left bg-white rounded-2xl border border-slate-200/70 shadow-[0_1px_2px_rgba(15,23,42,0.05)] overflow-hidden hover:shadow-[0_10px_28px_-10px_rgba(7,133,188,0.25)] hover:-translate-y-[2px] hover:border-[#0785BC]/30 transition-all duration-200 cursor-pointer flex flex-col"
                    >
                      <div className={`relative h-[148px] bg-gradient-to-br ${COVERS[idx % COVERS.length]} flex items-center justify-center overflow-hidden shrink-0`}>
                        {cat.image ? (
                          <>
                            <img src={cat.image} alt={cat.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
                          </>
                        ) : (
                          <Icon className="w-12 h-12 text-white/90 group-hover:scale-110 transition-transform duration-300" />
                        )}
                        <span className="absolute top-2.5 left-2.5 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-bold text-slate-700 shadow-sm">
                          {tr("catalog.catalogs", "Katalog")}
                        </span>
                        <span className="absolute bottom-2.5 left-2.5 rounded-full bg-black/35 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur">
                          {cat.itemCount} Item • {cat.packageCount} {tr("catalog.packages", "Paket")}
                        </span>
                      </div>
                      <div className="p-4 flex flex-col flex-1">
                        <h3 className="text-[13px] font-extrabold leading-snug text-slate-900 group-hover:text-[#0785BC] transition-colors line-clamp-1">
                          {cat.name}
                        </h3>
                        <p className="mt-1 text-xs leading-relaxed text-slate-500 line-clamp-2 min-h-[2rem]">
                          {cat.description}
                        </p>
                        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-slate-400">
                            {tr("catalog.click_to_view", "Klik untuk lihat isi")}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0785BC] group-hover:gap-1.5 transition-all">
                            {tr("catalog.view", "Lihat")} <ArrowRight className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setSelectedCatalog(null)}
              className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-[#0785BC] transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> {tr("common.back_catalog", "Kembali ke Katalog")}
            </button>

            <div className="bg-white rounded-2xl border border-slate-200/70 shadow-[0_1px_2px_rgba(15,23,42,0.05)] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-[#0785BC]/10 text-[#0785BC] flex items-center justify-center shrink-0">
                {(() => {
                  const Icon = catalogIcon(selectedCatalog.name);
                  return <Icon className="w-6 h-6" />;
                })()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#0785BC]">{tr("catalog.catalogs", "Katalog")}</p>
                <h1 className="text-lg font-extrabold tracking-tight text-slate-900 truncate">{selectedCatalog.name}</h1>
                <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{selectedCatalog.description}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <span className="rounded-full bg-blue-50 border border-blue-100 text-[#0785BC] px-2.5 py-1 text-[11px] font-bold">
                  {detailItems.length} Item
                </span>
                <span className="rounded-full bg-violet-50 border border-violet-100 text-violet-700 px-2.5 py-1 text-[11px] font-bold">
                  {detailPackages.length} {tr("catalog.packages", "Paket")}
                </span>
              </div>
            </div>

            <div className="flex gap-2 border-b border-slate-200">
              <button
                type="button"
                onClick={() => setDetailTab("item")}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 -mb-px transition cursor-pointer ${
                  detailTab === "item" ? "border-[#0785BC] text-[#0785BC]" : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                <Package className="w-4 h-4" /> {tr("catalog.per_item", "Per Item")} ({detailItems.length})
              </button>
              <button
                type="button"
                onClick={() => setDetailTab("paket")}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 -mb-px transition cursor-pointer ${
                  detailTab === "paket" ? "border-[#0785BC] text-[#0785BC]" : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                <Layers className="w-4 h-4" /> {tr("catalog.per_package", "Per Paket")} ({detailPackages.length})
              </button>
            </div>

            {detailTab === "item" ? (
              detailItems.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200/70 p-12 text-center text-sm text-slate-400">
                  <Package className="w-9 h-9 mx-auto mb-2 text-slate-200" />
                  {tr("catalog.empty_items", "Tidak ada barang per item dalam katalog ini.")}
                </div>
              ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {detailItems.map((it: any) => {
                    const empty = isItemEmptyStock(it);
                    return (
                      <div key={it.id} className={`group bg-white rounded-2xl border overflow-hidden transition-all flex flex-col ${empty ? "border-rose-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.05)]" : "border-slate-200/70 shadow-[0_1px_2px_rgba(15,23,42,0.05)] hover:shadow-[0_10px_28px_-10px_rgba(7,133,188,0.25)] hover:-translate-y-[2px] hover:border-[#0785BC]/30"}`}>
                        <div className="relative h-[148px] bg-slate-100 overflow-hidden shrink-0">
                          {it.image ? (
                            <img src={it.image} alt={it.name} className={`w-full h-full object-cover transition-transform duration-300 ${empty ? "grayscale opacity-60" : "group-hover:scale-105"}`} />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="w-8 h-8 text-slate-300" />
                            </div>
                          )}
                          {empty && <div className="absolute inset-0 bg-slate-900/25" />}
                          <span className="absolute top-2.5 left-2.5 px-2 py-1 rounded-lg bg-white/95 text-[10px] font-bold text-slate-600 shadow-sm">
                            {tr("catalog.per_item_badge", "Per Item")}
                          </span>
                          {empty ? (
                            <span className="absolute top-2.5 right-2.5 rounded-full bg-rose-600 px-2.5 py-1 text-[10px] font-extrabold text-white shadow-md">{tr("common.stock_out", "Stok Habis")}</span>
                          ) : (
                            <span className="absolute top-2.5 right-2.5 rounded-full bg-emerald-500 px-2.5 py-1 text-[10px] font-extrabold text-white shadow-md">{it.stock} {tr("common.available", "Tersedia")}</span>
                          )}
                          {empty && (
                            <span className="absolute bottom-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-slate-900/80 px-3 py-1 text-[10px] font-bold text-white backdrop-blur">{tr("catalog.cannot_borrow_now", "Tidak dapat dipinjam saat ini")}</span>
                          )}
                        </div>
                        <div className="p-4 flex flex-1 flex-col">
                          <p className="text-[10px] uppercase font-bold tracking-[0.08em] text-[#0785BC] truncate">{selectedCatalog.name}</p>
                          <h3 className="text-[13px] font-extrabold text-slate-900 mt-1 leading-snug line-clamp-1">{it.name}</h3>
                          <p className="text-xs text-slate-500 mt-1 leading-relaxed line-clamp-2 min-h-[2rem] flex-1">{it.description}</p>
                          <p className={`mt-2.5 text-[11px] font-bold ${empty ? "text-rose-600" : "text-emerald-600"}`}>
                            {empty ? tr("catalog.out_borrowed", "Stok Habis / Dipinjam") : `${tr("catalog.available_units", "Tersedia")}: ${it.stock} Unit`}
                          </p>
                          {empty ? (
                            <span className="mt-2.5 w-full inline-flex items-center justify-center gap-1 rounded-xl bg-slate-100 text-slate-400 text-xs font-bold py-2 cursor-not-allowed">
                              {tr("common.stock_out", "Stok Habis")} <ChevronRight className="w-3.5 h-3.5" />
                            </span>
                          ) : (
                            <Link
                              href={`/user/item_catalog/${it.id}`}
                              className="mt-2.5 w-full inline-flex items-center justify-center gap-1 rounded-xl bg-[#0785BC] hover:bg-[#0672a0] text-white text-xs font-bold py-2 transition-colors"
                            >
                              {tr("catalog.borrow_item_btn", "Pinjam Barang")} <ChevronRight className="w-3.5 h-3.5" />
                            </Link>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            ) : detailPackages.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200/70 p-12 text-center text-sm text-slate-400">
                <Layers className="w-9 h-9 mx-auto mb-2 text-slate-200" />
                {tr("catalog.empty_packages", "Tidak ada paket barang dalam katalog ini.")}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {detailPackages.map((pkg: any) => {
                  const isi = (pkg.packages_items || [])
                    .map((r: any) => r.items?.name)
                    .filter(Boolean)
                    .join(", ");
                  const empty = isPackageEmptyStock(pkg);
                  return (
                    <div key={pkg.id} className={`group bg-white rounded-2xl border overflow-hidden transition-all flex flex-col ${empty ? "border-rose-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.05)]" : "border-slate-200/70 shadow-[0_1px_2px_rgba(15,23,42,0.05)] hover:shadow-[0_10px_28px_-10px_rgba(7,133,188,0.25)] hover:-translate-y-[2px] hover:border-[#0785BC]/30"}`}>
                      <div className="relative h-[148px] bg-slate-100 overflow-hidden flex items-center justify-center shrink-0">
                        {pkg.image_url ? (
                          <img src={pkg.image_url} alt={pkg.name} className={`w-full h-full object-cover transition-transform duration-300 ${empty ? "grayscale opacity-60" : "group-hover:scale-105"}`} />
                        ) : (
                          <Layers className="w-8 h-8 text-slate-300" />
                        )}
                        {empty && <div className="absolute inset-0 bg-slate-900/25" />}
                        <span className="absolute top-2.5 left-2.5 px-2 py-1 rounded-lg bg-white/95 text-[10px] font-bold text-slate-600 shadow-sm">
                          {tr("catalog.per_package_badge", "Per Paket")}
                        </span>
                        {empty ? (
                          <span className="absolute top-2.5 right-2.5 rounded-full bg-rose-600 px-2.5 py-1 text-[10px] font-extrabold text-white shadow-md">{tr("common.stock_out", "Stok Habis")}</span>
                        ) : (
                          <span className="absolute top-2.5 right-2.5 rounded-full bg-emerald-500 px-2.5 py-1 text-[10px] font-extrabold text-white shadow-md">{tr("common.available", "Tersedia")}</span>
                        )}
                        {empty && (
                          <span className="absolute bottom-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-slate-900/80 px-3 py-1 text-[10px] font-bold text-white backdrop-blur">{tr("catalog.pkg_empty_one", "Salah satu isi paket habis")}</span>
                        )}
                      </div>
                      <div className="p-4 flex flex-1 flex-col">
                        <p className="text-[10px] uppercase font-bold tracking-[0.08em] text-violet-600">{tr("catalog.package_label", "Paket Barang")}</p>
                        <h3 className="text-[13px] font-extrabold text-slate-900 mt-1 leading-snug line-clamp-1">{pkg.name}</h3>
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed line-clamp-2 min-h-[2rem] flex-1">
                          {isi ? `${tr("catalog.contents_prefix", "Isi:")} ${isi}` : pkg.description || tr("catalog.pkg_default_desc", "Paket fasilitas sarpras")}
                        </p>
                        {empty ? (
                          <span className="mt-2.5 w-full inline-flex items-center justify-center gap-1 rounded-xl bg-slate-100 text-slate-400 text-xs font-bold py-2 cursor-not-allowed">
                            {tr("common.stock_out", "Stok Habis")} <ChevronRight className="w-3.5 h-3.5" />
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedPkg(pkg);
                              setExtraItems([]);
                              setFeedback(null);
                            }}
                            className="mt-2.5 w-full inline-flex items-center justify-center gap-1 rounded-xl bg-[#0785BC] hover:bg-[#0672a0] text-white text-xs font-bold py-2 transition-colors cursor-pointer"
                          >
                            {tr("catalog.request_pkg_btn", "Ajukan Pinjam Paket")} <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {selectedPkg && (
          <div
            className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-[2px] overflow-y-auto p-5 sm:p-8"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setSelectedPkg(null);
            }}
          >
            <div className="max-w-[1120px] mx-auto mb-7">
              <button
                type="button"
                onClick={() => setSelectedPkg(null)}
                className="inline-flex items-center gap-2 text-sm font-semibold text-white hover:text-slate-200 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" /> {tr("common.back_catalog", "Kembali ke Katalog")}
              </button>
            </div>
            <div className="w-full max-w-[1120px] mx-auto grid grid-cols-1 lg:grid-cols-[352px_minmax(0,1fr)] gap-5 items-start">
              <section className="bg-white rounded-3xl shadow-sm overflow-hidden">
                <div className="h-[210px] bg-slate-100 flex items-center justify-center overflow-hidden">
                  {selectedPkg.image_url ? (
                    <img src={selectedPkg.image_url} alt={selectedPkg.name} className="w-full h-full object-cover" />
                  ) : (
                    <Layers className="w-20 h-20 text-slate-300" />
                  )}
                </div>
                <div className="p-7">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#0785BC]">{tr("catalog.package_label", "Paket Barang")}</p>
                  <h2 className="text-2xl font-bold text-slate-900 mt-2">{selectedPkg.name}</h2>
                  <p className="text-sm text-slate-500 mt-3">
                    {selectedPkg.description || tr("catalog.pkg_default_desc", "Paket fasilitas sarpras.")}
                  </p>
                  <div className="mt-4 rounded-xl bg-slate-50 border border-slate-100 p-3">
                    <p className="text-[11px] font-bold text-slate-500 mb-1">{tr("catalog.contents_title", "ISI PAKET")}</p>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {(selectedPkg.packages_items || []).map((r: any) => r.items?.name).filter(Boolean).join(", ") || tr("catalog.pkg_list_default", "Daftar item paket")}
                    </p>
                  </div>
                </div>
              </section>
              <form onSubmit={submitPackage} className="bg-white rounded-3xl shadow-sm p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-[#0785BC] uppercase">{tr("catalog.summary", "Borrow Summary")}</p>
                    <h2 className="text-lg font-bold text-slate-900 mt-1">{tr("catalog.modal_title", "Ajukan Peminjaman Paket")}</h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedPkg(null)}
                    className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                {feedback && (
                  <div
                    className={`rounded-xl border p-3 text-xs flex gap-2 ${
                      feedback.type === "success"
                        ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                        : "bg-rose-50 border-rose-200 text-rose-700"
                    }`}
                  >
                    {feedback.type === "success" ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                    )}
                    <span>{feedback.text}</span>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-semibold text-slate-600">{tr("catalog.add_extra", "Tambahkan barang lain (opsional)")}</label>
                  <select
                    onChange={(e) => {
                      const item = availableItems.find((x: any) => x.id === e.target.value);
                      if (item && !extraItems.some((x: any) => x.id === item.id))
                        setExtraItems((cur) => [...cur, item]);
                      e.target.value = "";
                    }}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-sm"
                  >
                    <option value="">{tr("catalog.pick_extra", "Pilih barang tambahan...")}</option>
                    {availableItems
                      .filter((it: any) => !extraItems.some((x: any) => x.id === it.id))
                      .map((it: any) => (
                        <option key={it.id} value={it.id}>
                          {it.name}
                        </option>
                      ))}
                  </select>
                  {extraItems.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {extraItems.map((it: any) => (
                        <button
                          key={it.id}
                          type="button"
                          onClick={() => setExtraItems((cur) => cur.filter((x: any) => x.id !== it.id))}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 text-xs text-slate-700 cursor-pointer"
                        >
                          {it.name} ×
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <label className="block text-xs font-semibold text-slate-600">
                  {tr("catalog.start_date", "Tanggal Mulai")}
                  <input
                    required
                    type="date"
                    value={borrowDate}
                    onChange={(e) => setBorrowDate(e.target.value)}
                    min={new Date().toISOString().slice(0, 10)}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-sm"
                  />
                </label>
                <label className="block text-xs font-semibold text-slate-600">
                  {tr("catalog.end_date", "Tanggal Pengembalian")}
                  <input
                    required
                    type="date"
                    value={returnDate}
                    onChange={(e) => setReturnDate(e.target.value)}
                    min={borrowDate || new Date().toISOString().slice(0, 10)}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-sm"
                  />
                </label>
                <label className="block text-xs font-semibold text-slate-600">
                  {tr("catalog.purpose", "Tujuan Peminjaman")}
                  <textarea
                    required
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    rows={4}
                    placeholder={tr("catalog.purpose_ph", "Jelaskan keperluan peminjaman...")}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-sm resize-none"
                  />
                </label>
                <button
                  disabled={submitting}
                  className="w-full rounded-xl bg-[#0785BC] hover:bg-[#0672a0] text-white py-3 text-sm font-bold disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {submitting ? tr("catalog.sending", "Mengirim...") : tr("catalog.submit", "Ajukan Peminjaman")}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </UserLayout>
  );
}
