"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  BookOpen,
  Package,
  Layers,
  Calendar,
  ChevronRight,
  Clock,
  Check,
} from "lucide-react";
import api from "@/lib/api";
import { UserLayout } from "@/components/user";
import { normalizeItem } from "@/lib/item";
import { useLanguage } from "@/lib/i18n";

// ── Types ──
type TabKey = "semua" | "paket";

interface Item {
  id: string;
  name: string;
  category: string;
  description: string;
  stock: number;
  total_stock: number;
  status: "available" | "busy";
  image?: string;
}

interface PackageItem {
  id: string;
  name: string;
  description?: string;
  image_url?: string;
  status?: string;
  is_available?: boolean;
  packages_items?: Array<{ quantity?: number; items?: { name?: string; image_url?: string; available_stock?: number; stock?: number } }>;
}

// ── Status stock badge ──
function isItemEmpty(item: Item) {
  return item.status === "busy" || Number(item.stock ?? 0) <= 0;
}

function getPackageAvailability(pkg: PackageItem) {
  if (pkg.is_available === false) return false;
  const rows = pkg.packages_items || [];
  if (rows.length === 0) return true;
  return !rows.some((r: any) => {
    const avail = Number(r.items?.available_stock ?? r.items?.stock ?? 0);
    return avail < 1;
  });
}

function StockBadge({ item }: { item: Item }) {
  const { t } = useLanguage();
  const tr = (k: string, fb: string) => {
    const v = t(k);
    return v === k ? fb : v;
  };
  if (isItemEmpty(item)) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-600 border border-rose-200">
        <Clock className="w-3 h-3" />
        {tr("common.stock_out", "Stok Habis")}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
      <Check className="w-3 h-3" />
      {tr("common.available", "Tersedia")}: {item.stock}
    </span>
  );
}

// ── Item Card ──
function ItemCard({ item }: { item: Item }) {
  const { t } = useLanguage();
  const tr = (k: string, fb: string) => {
    const v = t(k);
    return v === k ? fb : v;
  };
  const empty = isItemEmpty(item);
  return (
    <Link
      href={`/user/item_catalog/${item.id}`}
      aria-disabled={empty}
      className={`bg-white rounded-2xl border overflow-hidden flex flex-col h-full transition-all duration-300 group animate-fade-up ${
        empty
          ? "border-rose-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.05)]"
          : "border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.05)] overflow-hidden hover:shadow-[0_10px_28px_-10px_rgba(7,133,188,0.25)] hover:-translate-y-[2px] hover:border-[#0785BC]/30 cursor-pointer"
      }`}
    >
      <div className="relative h-[152px] bg-slate-100 overflow-hidden shrink-0">
        {item.image ? (
          <img
            src={item.image}
            alt={item.name}
            className={`w-full h-full object-cover transition-transform duration-300 ${empty ? "grayscale opacity-60" : "group-hover:scale-105"}`}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <BookOpen className="w-8 h-8 text-slate-300" />
          </div>
        )}
        {empty && <div className="absolute inset-0 bg-slate-900/25" />}
        <span className="absolute top-2.5 left-2.5 rounded-lg bg-white/95 px-2 py-1 text-[10px] font-bold text-slate-600 shadow-sm">
          {tr("borrow.per_item_badge", "Per Item")}
        </span>
        {empty ? (
          <span className="absolute top-2.5 right-2.5 rounded-full bg-rose-600 px-2.5 py-1 text-[10px] font-extrabold text-white shadow-md">
            {tr("common.stock_out", "Stok Habis")}
          </span>
        ) : (
          <span className="absolute top-2.5 right-2.5 rounded-full bg-emerald-500 px-2.5 py-1 text-[10px] font-extrabold text-white shadow-md">
            {item.stock} {tr("common.available", "Tersedia")}
          </span>
        )}
        {empty && (
          <span className="absolute bottom-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-slate-900/80 px-3 py-1 text-[10px] font-bold text-white backdrop-blur">
            {tr("borrow.cannot_borrow_now", "Tidak dapat dipinjam saat ini")}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#0785BC] truncate">
          {item.category}
        </p>
        <h3 className="mt-1 text-[13px] font-bold leading-[1.45] text-slate-900 group-hover:text-[#0785BC] transition-colors line-clamp-2 min-h-[2.6rem]">
          {item.name}
        </h3>
        <p className="mt-1 text-xs leading-relaxed text-slate-500 line-clamp-2 min-h-[2rem] flex-1">
          {item.description}
        </p>
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
          <StockBadge item={item} />
          {empty ? (
            <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-slate-400 shrink-0">
              {tr("borrow.view", "Lihat")} <ChevronRight className="w-3.5 h-3.5" />
            </span>
          ) : (
            <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-[#0785BC] shrink-0">
              {tr("borrow.borrow_action", "Pinjam")} <ChevronRight className="w-3.5 h-3.5" />
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

// ── Package Card ──
function PackageCard({ pkg }: { pkg: PackageItem }) {
  const { t } = useLanguage();
  const tr = (k: string, fb: string) => {
    const v = t(k);
    return v === k ? fb : v;
  };
  const isi =
    pkg.packages_items?.map((x) => x.items?.name).filter(Boolean).join(", ") || tr("borrow.pkg_default", "Paket fasilitas sarpras");
  const available = getPackageAvailability(pkg);
  return (
    <Link
      href={`/user/item_catalog?paket=${pkg.id}`}
      aria-disabled={!available}
      className={`bg-white rounded-2xl border overflow-hidden flex flex-col h-full transition-all duration-300 group animate-fade-up ${
        available
          ? "border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.05)] overflow-hidden hover:shadow-[0_10px_28px_-10px_rgba(7,133,188,0.25)] hover:-translate-y-[2px] hover:border-[#0785BC]/30 cursor-pointer"
          : "border-rose-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.05)]"
      }`}
    >
      <div className="relative h-[152px] bg-slate-100 flex items-center justify-center overflow-hidden shrink-0">
        {pkg.image_url ? (
          <img
            src={pkg.image_url}
            alt={pkg.name}
            className={`w-full h-full object-cover transition-transform duration-300 ${available ? "group-hover:scale-105" : "grayscale opacity-60"}`}
          />
        ) : (
          <BookOpen className="w-8 h-8 text-slate-300" />
        )}
        {!available && <div className="absolute inset-0 bg-slate-900/25" />}
        <span className="absolute top-2.5 left-2.5 rounded-lg bg-white/95 px-2 py-1 text-[10px] font-bold text-slate-600 shadow-sm">
          {tr("borrow.per_package_badge", "Per Paket")}
        </span>
        {available ? (
          <span className="absolute top-2.5 right-2.5 rounded-full bg-emerald-500 px-2.5 py-1 text-[10px] font-extrabold text-white shadow-md">
            {tr("common.available", "Tersedia")}
          </span>
        ) : (
          <span className="absolute top-2.5 right-2.5 rounded-full bg-rose-600 px-2.5 py-1 text-[10px] font-extrabold text-white shadow-md">
            {tr("common.stock_out", "Stok Habis")}
          </span>
        )}
        {!available && (
          <span className="absolute bottom-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-slate-900/80 px-3 py-1 text-[10px] font-bold text-white backdrop-blur">
            {tr("catalog.pkg_empty_one", "Salah satu isi paket habis")}
          </span>
        )}
      </div>
      <div className="p-4 flex flex-1 flex-col">
        <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-violet-600">{tr("borrow.package_label", "Paket Barang")}</p>
        <h3 className="text-[13px] font-bold text-slate-900 mt-1 leading-[1.45] group-hover:text-[#0785BC] transition-colors line-clamp-2 min-h-[2.6rem]">
          {pkg.name}
        </h3>
        <p className="text-xs text-slate-500 mt-1 leading-relaxed line-clamp-2 min-h-[2rem] flex-1">{isi}</p>
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
          {available ? (
            <span className="text-[11px] font-semibold text-slate-400">{tr("borrow.click_to_request", "Klik untuk ajukan")}</span>
          ) : (
            <span className="text-[11px] font-bold text-rose-600">{tr("borrow.cannot_borrow", "Tidak dapat dipinjam")}</span>
          )}
          <span className={`inline-flex items-center gap-0.5 text-[11px] font-bold shrink-0 ${available ? "text-[#0785BC]" : "text-slate-400"}`}>
            {available ? tr("borrow.request_borrow", "Ajukan Pinjam") : tr("borrow.view", "Lihat")} <ChevronRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}

// ── Skeleton ──
function CardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
      <div className="h-40 bg-slate-100 animate-pulse" />
      <div className="p-4 space-y-2">
        <div className="h-3 bg-slate-100 rounded animate-pulse w-1/3" />
        <div className="h-4 bg-slate-100 rounded animate-pulse w-2/3" />
        <div className="h-3 bg-slate-100 rounded animate-pulse" />
      </div>
    </div>
  );
}

export default function ItemCatalogPage() {
  return (
    <Suspense fallback={<BorrowLoadingFallback />}>
      <ItemCatalogContent />
    </Suspense>
  );
}

function BorrowLoadingFallback() {
  const { t } = useLanguage();
  const tr = (k: string, fb: string) => {
    const v = t(k);
    return v === k ? fb : v;
  };
  return (
    <UserLayout showSearch={false}>
      <div className="max-w-6xl mx-auto p-12 text-center text-sm text-slate-400">
        {tr("borrow.loading", "Memuat peminjaman...")}
      </div>
    </UserLayout>
  );
}

function ItemCatalogContent() {
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const tr = (k: string, fb: string) => {
    const v = t(k);
    return v === k ? fb : v;
  };
  const [items, setItems] = useState<Item[]>([]);
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>("semua");
  const [search, setSearch] = useState(() => searchParams.get("q") || "");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = searchParams.get("q");
    if (q !== null) setSearch(q);
  }, [searchParams]);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [itemsRes, packagesRes] = await Promise.all([
          api.items.getAll({ limit: 100 }),
          api.packages.getAll(),
        ]);
        if (itemsRes.status === "success" && itemsRes.data && (itemsRes.data as any[]).length > 0) {
          setItems((itemsRes.data as any[]).map(normalizeItem) as Item[]);
        } else {
          setItems([]);
        }
        if (packagesRes.status === "success" && Array.isArray(packagesRes.data)) {
          setPackages(packagesRes.data as PackageItem[]);
        }
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const categories = Array.from(new Set(items.map((it) => it.category).filter(Boolean)));

  const filtered = items.filter((item) => {
    const q = search.trim().toLowerCase();
    const matchSearch =
      !q ||
      item.name.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q);
    const matchCat = selectedCategory === "all" || item.category === selectedCategory;
    return matchSearch && matchCat;
  });

  const qPkg = search.trim().toLowerCase();
  const filteredPackages = packages.filter((pkg) => {
    if (!qPkg) return true;
    const isi = (pkg.packages_items || []).map((r) => r.items?.name || "").join(" ").toLowerCase();
    return pkg.name.toLowerCase().includes(qPkg) || isi.includes(qPkg);
  });

  const showItems = activeTab === "semua";
  const shownCount = showItems ? filtered.length : filteredPackages.length;
  const shownLabel = showItems ? tr("borrow.item_word", "barang") : tr("borrow.package_word", "paket");

  return (
    <UserLayout
      showSearch={true}
      searchValue={search}
      onSearchChange={setSearch}
      searchPlaceholder={tr("borrow.search_ph", "Cari barang untuk dipinjam...")}
    >
      <div className="user-page-shell w-full min-w-0 space-y-6">
        <div className="user-page-hero relative overflow-hidden rounded-[1.35rem] bg-slate-950 px-5 py-6 md:px-8 md:py-7 text-white shadow-[0_16px_38px_-18px_rgba(7,133,188,0.65)]">
          <div className="absolute inset-0 bg-gradient-to-br from-[#0B3B60] via-[#0785BC]/60 to-transparent" />
          <div className="absolute inset-0 bg-dot-grid-dark opacity-60" />
          <div className="absolute -left-12 -bottom-16 w-52 h-52 rounded-full bg-[#0aa5e0]/30 blur-2xl" />
          <div className="absolute right-10 -top-14 w-40 h-40 rounded-full border-[18px] border-white/10" />
          <div className="absolute right-28 bottom-[-2.5rem] w-20 h-20 rounded-full bg-white/10 backdrop-blur-sm" />
          <div className="relative flex flex-col lg:flex-row lg:items-center gap-5">
            <div className="flex-1 min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-sky-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {tr("borrow.tag", "Pinjam & Kembali")}
              </div>
              <h1 className="mt-2.5 text-2xl md:text-[28px] font-extrabold tracking-tight leading-tight">{tr("borrow.title", "Peminjaman")}</h1>
              <p className="mt-2 text-sm text-slate-300 max-w-xl leading-relaxed">
                {tr("borrow.subtitle", "Pilih barang per item atau gunakan paket barang yang tersedia, lalu ajukan langsung dari sini.")}
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-slate-900 shadow-sm">
                  <Package className="w-3.5 h-3.5 text-[#0785BC]" /> {items.length} {tr("borrow.items", "Barang")}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/15 px-3 py-1.5 text-white backdrop-blur">
                  <Layers className="w-3.5 h-3.5 text-sky-300" /> {packages.length} {tr("borrow.packages", "Paket")}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/15 px-3 py-1.5 text-white backdrop-blur">
                  <BookOpen className="w-3.5 h-3.5 text-sky-300" /> {categories.length} {tr("borrow.categories", "Kategori")}
                </span>
              </div>
            </div>
            <div className="hidden lg:flex items-center gap-3 shrink-0">
              <div className="w-20 h-20 rounded-2xl bg-white/10 border border-white/15 backdrop-blur flex items-center justify-center rotate-6">
                <Package className="w-9 h-9 text-white" />
              </div>
              <div className="w-20 h-20 rounded-2xl bg-white text-[#0785BC] flex items-center justify-center -rotate-6 shadow-xl">
                <Layers className="w-9 h-9" />
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-6 border-b border-slate-200">
          {(
            [
              { key: "semua", label: tr("borrow.per_item", "Per Item"), icon: Package },
              { key: "paket", label: tr("borrow.per_package", "Per Paket"), icon: Layers },
            ] as Array<{ key: TabKey; label: string; icon: any }>
          ).map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-1 pb-3 text-sm font-semibold border-b-2 -mb-px transition cursor-pointer ${
                  active
                    ? "border-[#0785BC] text-[#0785BC]"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-500">
            <span className="font-bold text-slate-800">{shownCount}</span> {shownLabel} {tr("borrow.found", "ditemukan")}
          </p>
          {showItems && categories.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-400">{tr("borrow.category_label", "Kategori:")}</span>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="text-xs font-semibold bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0785BC]/30 focus:border-[#0785BC]"
              >
                <option value="all">{tr("borrow.all_categories", "Semua Kategori")}</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="mt-5">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          ) : shownCount === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 py-16 px-6 text-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-3">
                {showItems ? (
                  <Package className="w-7 h-7 text-slate-300" />
                ) : (
                  <Layers className="w-7 h-7 text-slate-300" />
                )}
              </div>
              <p className="text-sm font-bold text-slate-700">{showItems ? tr("borrow.empty_match_items", "Tidak ada barang yang sesuai") : tr("borrow.empty_match_packages", "Tidak ada paket yang sesuai")}</p>
              <p className="text-xs text-slate-400 mt-1">
                {tr("borrow.try_other", "Coba kata kunci atau kategori lain.")}
              </p>
            </div>
          ) : showItems ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 items-stretch">
              {filtered.map((item, index) => (
                <div key={item.id} style={{ animationDelay: `${index * 45}ms` }}>
                  <ItemCard item={item} />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 items-stretch">
              {filteredPackages.map((pkg, index) => (
                <div key={pkg.id} style={{ animationDelay: `${index * 45}ms` }}>
                  <PackageCard pkg={pkg} />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center gap-2 text-xs text-slate-400">
          <Calendar className="w-3.5 h-3.5 shrink-0" />
          <span>{tr("borrow.hint", "Klik kartu barang untuk melihat detail dan mengajukan peminjaman.")}</span>
        </div>
      </div>
    </UserLayout>
  );
}
