"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  BookOpen,
  Package,
  CheckCircle2,
  Clock,
  Layers,
} from "lucide-react";
import api from "@/lib/api";
import { UserLayout } from "@/components/user";
import { normalizeItem } from "@/lib/item";

// ── Types ──
type TabKey = "semua" | "paket";
type StatusFilter = "all" | "available" | "busy";

interface Item {
  id: string;
  name: string;
  category: string;
  description: string;
  stock: number;
  total_stock: number;
  status: "available" | "busy";
  return_info?: string; // e.g. "Return: Tomorrow"
  image?: string;
}

interface PackageItem {
  id: string;
  name: string;
  description?: string;
  image_url?: string;
  status?: string;
  packages_items?: Array<{ items?: { name?: string; image_url?: string } }>;
}

// ── Item Card ──
function ItemCard({ item, mounted, delay }: { item: Item; mounted: boolean; delay: number }) {
  const isBusy = item.status === "busy";
  return (
    <Link
      href={`/user/item_catalog/${item.id}`}
      style={{ animationDelay: `${delay}ms` }}
      className={`bg-white rounded-[22px] overflow-hidden flex flex-col shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200 group cursor-pointer border border-slate-100/80 ${mounted ? "animate-fade-up" : "opacity-0"}`}
    >
      {/* Image */}
      <div className="relative aspect-[16/10] bg-slate-100 overflow-hidden">
        {item.image ? (
          <Image src={item.image} alt={item.name} fill className="object-cover group-hover:scale-105 transition-transform duration-300" sizes="(max-width: 768px) 100vw, 33vw" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <BookOpen className="w-8 h-8 text-slate-300" />
          </div>
        )}
        <div className="absolute left-4 top-4">
          <span className="rounded-xl bg-white/95 px-3 py-1.5 text-xs font-semibold text-[#52627c] shadow-sm">Per Item</span>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-5">
        <p className="mb-1 text-xs font-bold uppercase tracking-wide text-[#0785BC]">{item.category}</p>
        <h3 className="mb-2 text-base font-bold leading-snug text-slate-900 group-hover:text-[#0785BC] transition-colors">{item.name}</h3>
        <p className="flex-1 text-xs leading-relaxed text-slate-500 line-clamp-2">{item.description}</p>
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
          <p className={`text-xs font-bold ${isBusy ? "text-amber-600" : "text-emerald-600"}`}>
            {isBusy ? "Sedang Dipinjam" : `Tersedia: ${item.stock} Unit`}
          </p>
          <span className="text-xs font-semibold text-[#0785BC] group-hover:translate-x-0.5 transition-transform">
            Pinjam &rarr;
          </span>
        </div>
      </div>
    </Link>
  );
}

// ── Mock data ──
const mockItems: Item[] = [
  {
    id: "1", name: "Epson Projector X41",    category: "Electronic", stock: 4, total_stock: 5, status: "available",
    description: "High brightness projector suitable for large meeting rooms. Includes HDMI and power cables.",
    image: "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "2", name: "Ergonomic Chair Pro",    category: "Furniture",  stock: 0, total_stock: 12, status: "busy", return_info: "Return: Tomorrow",
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
            Memuat katalog barang...
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
  const [items, setItems]               = useState<Item[]>([]);
  const [packages, setPackages]         = useState<PackageItem[]>([]);
  const [activeTab, setActiveTab]       = useState<TabKey>("semua");
  const [search, setSearch]             = useState(() => searchParams.get("q") || "");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [loading, setLoading]           = useState(true);
  const mounted = true;

  // Sync search input if query param changes
  useEffect(() => {
    const q = searchParams.get("q");
    if (q !== null) {
      setSearch(q);
    }
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
    const matchSearch = !search || item.name.toLowerCase().includes(search.toLowerCase()) || item.category.toLowerCase().includes(search.toLowerCase());
    const matchCat    = selectedCategory === "all" || item.category === selectedCategory;
    const matchStatus =
      statusFilter === "all" ||
      (statusFilter === "available" && item.status === "available") ||
      (statusFilter === "busy" && item.status === "busy");
    return matchSearch && matchCat && matchStatus;
  });

  return (
    <UserLayout
      showSearch={true}
      searchValue={search}
      onSearchChange={setSearch}
      searchPlaceholder="Cari barang untuk dipinjam..."
    >
      <div className="max-w-6xl mx-auto space-y-5 pb-10">
        <div className="rounded-2xl bg-[#eef3fb] px-5 py-6 md:px-8 md:py-8">
          <h1 className="text-2xl font-bold tracking-tight text-[#111a33] md:text-3xl">Buat Peminjaman Barang</h1>
          <p className="mt-2 text-sm text-[#607493] md:text-base">Pilih barang per item atau gunakan paket barang yang tersedia.</p>
          <div className="mt-8 flex gap-5 border-b border-[#dbe3ef]">
            {(["semua", "paket"] as TabKey[]).map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`flex items-center gap-2 border-b-2 px-5 pb-3 text-sm font-semibold transition cursor-pointer ${activeTab === tab ? "border-[#0785BC] text-[#0785BC]" : "border-transparent text-[#607493] hover:text-[#0785BC]"}`}>
                {tab === "semua" ? <Package className="h-5 w-5" /> : <Layers className="h-5 w-5 opacity-70" />}
                {tab === "semua" ? "Per Item" : "Per Paket"}
              </button>
            ))}
          </div>
          <div className="mt-6">
            {activeTab === "semua" && (
              <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                <p className="text-sm text-[#607493]">{filtered.length} barang ditemukan</p>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-slate-400 mr-1">Status:</span>
                  <button
                    onClick={() => setStatusFilter("all")}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition cursor-pointer ${statusFilter === "all" ? "bg-[#0785BC] text-white" : "bg-white text-slate-600 hover:bg-slate-100"}`}
                  >
                    Semua
                  </button>
                  <button
                    onClick={() => setStatusFilter("available")}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition cursor-pointer ${statusFilter === "available" ? "bg-emerald-600 text-white" : "bg-white text-slate-600 hover:bg-slate-100"}`}
                  >
                    Tersedia
                  </button>
                  <button
                    onClick={() => setStatusFilter("busy")}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition cursor-pointer ${statusFilter === "busy" ? "bg-amber-600 text-white" : "bg-white text-slate-600 hover:bg-slate-100"}`}
                  >
                    Sedang Dipinjam
                  </button>
                  {categories.length > 0 && (
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="ml-2 text-xs font-semibold bg-white border border-slate-200 rounded-full px-3 py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#0785BC]"
                    >
                      <option value="all">Semua Kategori</option>
                      {categories.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            )}

        {/* ── Catalog Grid ── */}
        <div className="w-full">
            {activeTab === "paket" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 w-full">
                {packages.map((pkg) => (
                  <Link key={pkg.id} href={`/user/peminjaman`} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all group flex flex-col justify-between">
                    <div>
                      <div className="aspect-[4/3] bg-slate-100 flex items-center justify-center overflow-hidden">
                        {pkg.image_url ? <img src={pkg.image_url} alt={pkg.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" /> : <BookOpen className="w-10 h-10 text-slate-300" />}
                      </div>
                      <div className="p-4">
                        <p className="text-[11px] font-semibold text-[#0785BC] uppercase tracking-wider">Paket Barang</p>
                        <h3 className="text-base font-bold text-slate-900 mt-1 group-hover:text-[#0785BC] transition-colors">{pkg.name}</h3>
                        <p className="text-xs text-slate-500 mt-2 line-clamp-2">{pkg.description || "Paket fasilitas sarpras"}</p>
                        <div className="mt-3 pt-3 border-t border-slate-100">
                          <p className="text-[11px] font-semibold text-slate-400 mb-1">Daftar isi paket</p>
                          <p className="text-xs text-slate-600 line-clamp-2">{pkg.packages_items?.map((x) => x.items?.name).filter(Boolean).join(", ") || "Item paket tersedia di database"}</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 pt-0 flex justify-end">
                      <span className="text-xs font-bold text-[#0785BC]">Ajukan Pinjam &rarr;</span>
                    </div>
                  </Link>
                ))}
                {packages.length === 0 && <div className="col-span-full text-center py-16 text-slate-400 text-sm bg-white rounded-2xl border border-slate-100">Belum ada paket barang.</div>}
              </div>
            ) : loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 w-full">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                    <div className="aspect-[4/3] bg-slate-100 animate-pulse" />
                    <div className="p-4 space-y-2">
                      <div className="h-3 bg-slate-100 rounded animate-pulse w-1/3" />
                      <div className="h-4 bg-slate-100 rounded animate-pulse w-2/3" />
                      <div className="h-3 bg-slate-100 rounded animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-20 text-slate-400 text-sm bg-white rounded-2xl border border-slate-100">
                Tidak ada barang yang sesuai filter.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 w-full">
                {filtered.map((item, i) => (
                  <ItemCard key={item.id} item={item} mounted={mounted} delay={100 + i * 75} />
                ))}
              </div>
             )}
           </div>
         </div>
         </div>
       </div>
       </UserLayout>
  );
}
