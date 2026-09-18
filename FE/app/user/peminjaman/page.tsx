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
  if (isItemEmpty(item)) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-600 border border-rose-200">
        <Clock className="w-3 h-3" />
        Stok Habis
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
      <Check className="w-3 h-3" />
      Tersedia: {item.stock}
    </span>
  );
}

// ── Item Card ──
function ItemCard({ item }: { item: Item }) {
  const empty = isItemEmpty(item);
  return (
    <Link
      href={`/user/item_catalog/${item.id}`}
      aria-disabled={empty}
      className={`bg-white rounded-2xl border overflow-hidden flex flex-col h-full transition-all duration-200 group ${
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
          Per Item
        </span>
        {empty ? (
          <span className="absolute top-2.5 right-2.5 rounded-full bg-rose-600 px-2.5 py-1 text-[10px] font-extrabold text-white shadow-md">
            Stok Habis
          </span>
        ) : (
          <span className="absolute top-2.5 right-2.5 rounded-full bg-emerald-500 px-2.5 py-1 text-[10px] font-extrabold text-white shadow-md">
            {item.stock} Tersedia
          </span>
        )}
        {empty && (
          <span className="absolute bottom-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-slate-900/80 px-3 py-1 text-[10px] font-bold text-white backdrop-blur">
            Tidak dapat dipinjam saat ini
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
              Lihat <ChevronRight className="w-3.5 h-3.5" />
            </span>
          ) : (
            <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-[#0785BC] shrink-0">
              Pinjam <ChevronRight className="w-3.5 h-3.5" />
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

// ── Package Card ──
function PackageCard({ pkg }: { pkg: PackageItem }) {
  const isi =
    pkg.packages_items?.map((x) => x.items?.name).filter(Boolean).join(", ") || "Paket fasilitas sarpras";
  const available = getPackageAvailability(pkg);
  return (
    <Link
      href={`/user/item_catalog?paket=${pkg.id}`}
      aria-disabled={!available}
      className={`bg-white rounded-2xl border overflow-hidden flex flex-col h-full transition-all duration-200 group ${
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
          Per Paket
        </span>
        {available ? (
          <span className="absolute top-2.5 right-2.5 rounded-full bg-emerald-500 px-2.5 py-1 text-[10px] font-extrabold text-white shadow-md">
            Tersedia
          </span>
        ) : (
          <span className="absolute top-2.5 right-2.5 rounded-full bg-rose-600 px-2.5 py-1 text-[10px] font-extrabold text-white shadow-md">
            Stok Habis
          </span>
        )}
        {!available && (
          <span className="absolute bottom-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-slate-900/80 px-3 py-1 text-[10px] font-bold text-white backdrop-blur">
            Salah satu isi paket habis
          </span>
        )}
      </div>
      <div className="p-4 flex flex-1 flex-col">
        <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-violet-600">Paket Barang</p>
        <h3 className="text-[13px] font-bold text-slate-900 mt-1 leading-[1.45] group-hover:text-[#0785BC] transition-colors line-clamp-2 min-h-[2.6rem]">
          {pkg.name}
        </h3>
        <p className="text-xs text-slate-500 mt-1 leading-relaxed line-clamp-2 min-h-[2rem] flex-1">{isi}</p>
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
          {available ? (
            <span className="text-[11px] font-semibold text-slate-400">Klik untuk ajukan</span>
          ) : (
            <span className="text-[11px] font-bold text-rose-600">Tidak dapat dipinjam</span>
          )}
          <span className={`inline-flex items-center gap-0.5 text-[11px] font-bold shrink-0 ${available ? "text-[#0785BC]" : "text-slate-400"}`}>
            {available ? "Ajukan Pinjam" : "Lihat"} <ChevronRight className="w-3.5 h-3.5" />
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

// ── Mock data ──
const mockItems: Item[] = [
  {
    id: "1", name: "Epson Projector X41", category: "Electronic", stock: 4, total_stock: 5, status: "available",
    description: "High brightness projector suitable for large meeting rooms. Includes HDMI and power cables.",
    image: "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "2", name: "Ergonomic Chair Pro", category: "Furniture", stock: 0, total_stock: 12, status: "busy",
    description: "Adjustable lumbar support chair for extended desk work. Mesh back for breathability.",
    image: "https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "3", name: "Shure Wireless Mic Set", category: "Electronic", stock: 2, total_stock: 2, status: "available",
    description: "Dual channel wireless microphone system. Ideal for presentations and events.",
    image: "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=600&q=80",
  },
];

export default function ItemCatalogPage() {
  return (
    <Suspense
      fallback={
        <UserLayout showSearch={false}>
          <div className="max-w-6xl mx-auto p-12 text-center text-sm text-slate-400">
            Memuat peminjaman...
          </div>
        </UserLayout>
      }
    >
      <ItemCatalogContent />
    </Suspense>
  );
}

function ItemCatalogContent() {
  const searchParams = useSearchParams();
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
          setItems(mockItems);
        }
        if (packagesRes.status === "success" && Array.isArray(packagesRes.data)) {
          setPackages(packagesRes.data as PackageItem[]);
        }
      } catch {
        setItems(mockItems);
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
  const shownLabel = showItems ? "barang" : "paket";

  return (
    <UserLayout
      showSearch={true}
      searchValue={search}
      onSearchChange={setSearch}
      searchPlaceholder="Cari barang untuk dipinjam..."
    >
      <div className="max-w-6xl mx-auto space-y-6 pb-10">
        <div className="relative overflow-hidden rounded-2xl bg-slate-900 px-5 py-6 md:px-7 text-white shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-[#0B3B60] via-[#0785BC]/60 to-transparent" />
          <div className="absolute inset-0 bg-dot-grid-dark opacity-60" />
          <div className="absolute -left-12 -bottom-16 w-52 h-52 rounded-full bg-[#0aa5e0]/30 blur-2xl" />
          <div className="absolute right-10 -top-14 w-40 h-40 rounded-full border-[18px] border-white/10" />
          <div className="absolute right-28 bottom-[-2.5rem] w-20 h-20 rounded-full bg-white/10 backdrop-blur-sm" />
          <div className="relative flex flex-col lg:flex-row lg:items-center gap-5">
            <div className="flex-1 min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-sky-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Pinjam & Kembali
              </div>
              <h1 className="mt-2.5 text-2xl md:text-[28px] font-extrabold tracking-tight leading-tight">Peminjaman Saya</h1>
              <p className="mt-2 text-sm text-slate-300 max-w-xl leading-relaxed">
                Pilih barang per item atau gunakan paket barang yang tersedia, lalu ajukan langsung dari sini.
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-slate-900 shadow-sm">
                  <Package className="w-3.5 h-3.5 text-[#0785BC]" /> {items.length} Barang
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/15 px-3 py-1.5 text-white backdrop-blur">
                  <Layers className="w-3.5 h-3.5 text-sky-300" /> {packages.length} Paket
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/15 px-3 py-1.5 text-white backdrop-blur">
                  <BookOpen className="w-3.5 h-3.5 text-sky-300" /> {categories.length} Kategori
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
              { key: "semua", label: "Per Item", icon: Package },
              { key: "paket", label: "Per Paket", icon: Layers },
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
            <span className="font-bold text-slate-800">{shownCount}</span> {shownLabel} ditemukan
          </p>
          {showItems && categories.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-400">Kategori:</span>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="text-xs font-semibold bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0785BC]/30 focus:border-[#0785BC]"
              >
                <option value="all">Semua Kategori</option>
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
              <p className="text-sm font-bold text-slate-700">Tidak ada {shownLabel} yang sesuai</p>
              <p className="text-xs text-slate-400 mt-1">
                Coba kata kunci atau kategori lain.
              </p>
            </div>
          ) : showItems ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 items-stretch">
              {filtered.map((item) => (
                <ItemCard key={item.id} item={item} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 items-stretch">
              {filteredPackages.map((pkg) => (
                <PackageCard key={pkg.id} pkg={pkg} />
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center gap-2 text-xs text-slate-400">
          <Calendar className="w-3.5 h-3.5 shrink-0" />
          <span>Klik kartu barang untuk melihat detail dan mengajukan peminjaman.</span>
        </div>
      </div>
    </UserLayout>
  );
}
