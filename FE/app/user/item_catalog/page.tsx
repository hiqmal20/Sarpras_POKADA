"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  BookOpen,
  Filter,
  ClipboardList,
} from "lucide-react";
import api from "@/lib/api";
import UserSidebar from "@/components/user/Sidebar";
import UserNavbar from "@/components/user/Navbar";

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
  return_info?: string; // e.g. "Return: Tomorrow"
  image?: string;
}

interface Category { id: string; name: string; }

function useMount() {
  const [m, setM] = useState(false);
  useEffect(() => { setM(true); }, []);
  return m;
}

// ── Availability badge ──
function AvailBadge({ status, returnInfo }: { status: Item["status"]; returnInfo?: string }) {
  if (status === "available")
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500 text-white">
        <span className="w-1.5 h-1.5 rounded-full bg-white" /> Available
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-white/90 text-slate-700 border border-slate-200">
      <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
      Busy{returnInfo ? ` (${returnInfo})` : ""}
    </span>
  );
}

// ── Item Card ──
function ItemCard({ item, mounted, delay }: { item: Item; mounted: boolean; delay: number }) {
  const isBusy = item.status === "busy";
  return (
    <div
      style={{ animationDelay: `${delay}ms` }}
      className={`bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col hover:shadow-lg hover:-translate-y-1 transition-all duration-200 ${mounted ? "animate-fade-up" : "opacity-0"}`}
    >
      {/* Image */}
      <div className="relative aspect-[4/3] bg-slate-100 overflow-hidden">
        {item.image ? (
          <Image src={item.image} alt={item.name} fill className="object-cover" sizes="33vw" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <BookOpen className="w-8 h-8 text-slate-300" />
          </div>
        )}
        <div className="absolute top-3 right-3">
          <AvailBadge status={item.status} returnInfo={item.return_info} />
        </div>
      </div>

      {/* Body */}
      <div className="p-4 flex flex-col flex-1">
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
          {item.category}
        </p>
        <h3 className="text-base font-bold text-slate-900 leading-snug mb-2">{item.name}</h3>
        <p className="text-xs text-slate-500 leading-relaxed line-clamp-3 flex-1">{item.description}</p>

        <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
          <p className="text-xs text-slate-400">
            Stock: <span className="font-semibold text-slate-600">{item.stock}/{item.total_stock}</span>
          </p>
          <Link
            href={`/user/item_catalog/${item.id}`}
            className={`px-4 py-1.5 text-sm font-semibold rounded-xl transition-all active:scale-95 ${
              isBusy
                ? "bg-slate-100 text-slate-400 cursor-not-allowed pointer-events-none"
                : "bg-[#0785BC] text-white hover:bg-[#0672a0]"
            }`}
          >
            Pinjam
          </Link>
        </div>
      </div>
    </div>
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

const allCategories = ["Electronic", "Furniture", "Stationery"];

export default function ItemCatalogPage() {
  const [items, setItems]               = useState<Item[]>([]);
  const [categories, setCategories]     = useState<string[]>(allCategories);
  const [activeTab, setActiveTab]       = useState<TabKey>("semua");
  const [search, setSearch]             = useState("");
  const [checkedCats, setCheckedCats]   = useState<Set<string>>(new Set(["Electronic", "Furniture"]));
  const [showAvailable, setShowAvail]   = useState(true);
  const [showBusy, setShowBusy]         = useState(false);
  const [loading, setLoading]           = useState(true);
  const mounted = useMount();

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const [itemsRes, catsRes] = await Promise.all([
        api.items.getAll({ limit: 20 }),
        api.categories.getAll(),
      ]);
      if (itemsRes.status === "success" && itemsRes.data && (itemsRes.data as any[]).length > 0) {
        setItems(itemsRes.data as Item[]);
      } else {
        setItems(mockItems);
      }
      if (catsRes.status === "success" && catsRes.data && (catsRes.data as any[]).length > 0) {
        setCategories((catsRes.data as any[]).map((c) => c.name));
      }
      setLoading(false);
    }
    fetchData();
  }, []);

  function toggleCat(cat: string) {
    setCheckedCats((prev) => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  }

  function resetFilters() {
    setCheckedCats(new Set(["Electronic", "Furniture"]));
    setShowAvail(true);
    setShowBusy(false);
    setSearch("");
  }

  const filtered = items.filter((item) => {
    const matchSearch = !search || item.name.toLowerCase().includes(search.toLowerCase());
    const matchCat    = checkedCats.size === 0 || checkedCats.has(item.category);
    const matchAvail  = (showAvailable && item.status === "available") || (showBusy && item.status === "busy") || (!showAvailable && !showBusy);
    return matchSearch && matchCat && matchAvail;
  });

  return (
    <div className="flex h-screen overflow-hidden bg-[#eef2f9] text-slate-800">
      {/* ── Sidebar ── */}
      <UserSidebar />

      {/* ── Main ── */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <UserNavbar
          searchValue={search}
          onSearchChange={setSearch}
        />

        <div className="flex-1 overflow-y-auto">
          <div className="p-8">
            {/* Page header */}
            <div className={`mb-6 ${mounted ? "animate-fade-up" : "opacity-0"}`}>
              <h1 className="text-2xl font-bold text-slate-900">Item Catalog</h1>
              <p className="text-sm text-slate-500 mt-0.5">Browse and request facility resources for your activities.</p>
            </div>

            {/* Tabs */}
            <div className={`flex gap-0 border-b border-slate-200 mb-6 ${mounted ? "animate-fade-up delay-75" : "opacity-0"}`}>
              {(["semua", "paket"] as TabKey[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition-all -mb-px ${
                    activeTab === tab
                      ? "border-[#0785BC] text-[#0785BC]"
                      : "border-transparent text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {tab === "semua" ? "Semua Barang" : "Paket Barang"}
                </button>
              ))}
            </div>

            <div className="flex gap-6">
              {/* ── Filter Panel ── */}
              <aside className={`w-52 shrink-0 ${mounted ? "animate-slide-in-left" : "opacity-0"}`}>
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Filter className="w-4 h-4 text-slate-600" />
                    <span className="text-sm font-bold text-slate-700">Filters</span>
                  </div>

                  {/* Category */}
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Category</p>
                  <div className="space-y-2 mb-5">
                    {categories.map((cat) => (
                      <label key={cat} className="flex items-center gap-2.5 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={checkedCats.has(cat)}
                          onChange={() => toggleCat(cat)}
                          className="w-4 h-4 rounded border-slate-300 text-[#0785BC] accent-[#0785BC] cursor-pointer"
                        />
                        <span className="text-sm text-slate-600 group-hover:text-slate-900 transition-colors">{cat}</span>
                      </label>
                    ))}
                  </div>

                  {/* Availability */}
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Availability</p>
                  <div className="space-y-2 mb-5">
                    <label className="flex items-center gap-2.5 cursor-pointer group">
                      <input type="checkbox" checked={showAvailable} onChange={(e) => setShowAvail(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 accent-[#0785BC] cursor-pointer" />
                      <span className="text-sm text-slate-600 group-hover:text-slate-900 transition-colors">Available</span>
                    </label>
                    <label className="flex items-center gap-2.5 cursor-pointer group">
                      <input type="checkbox" checked={showBusy} onChange={(e) => setShowBusy(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 accent-[#0785BC] cursor-pointer" />
                      <span className="text-sm text-slate-600 group-hover:text-slate-900 transition-colors">Busy</span>
                    </label>
                  </div>

                  <button
                    onClick={resetFilters}
                    className="w-full py-2 text-sm font-semibold border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 active:scale-95 transition-all"
                  >
                    Reset Filters
                  </button>
                </div>
              </aside>

              {/* ── Items Grid ── */}
              <div className="flex-1">
                {loading ? (
                  <div className="grid grid-cols-3 gap-5">
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
                  <div className="text-center py-20 text-slate-400 text-sm">
                    Tidak ada barang yang sesuai filter.
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-5">
                    {filtered.map((item, i) => (
                      <ItemCard key={item.id} item={item} mounted={mounted} delay={100 + i * 75} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Footer — di luar scroll area, selalu menetap di bawah ── */}
        <footer className="bg-[#1a2f5a] text-white px-8 py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shrink-0">
          <div>
            <p className="text-sm font-extrabold tracking-tight">SARPRAS<br />POKADA</p>
          </div>
          <p className="text-xs text-slate-400">© 2024 LendLoop. Circular economy for a better planet.</p>
          <nav className="flex items-center gap-5 text-xs text-slate-400">
            <Link href="#" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="#" className="hover:text-white transition-colors">Terms of Service</Link>
            <Link href="#" className="hover:text-white transition-colors">Sustainability Report</Link>
            <Link href="#" className="hover:text-white transition-colors">Contact Us</Link>
          </nav>
        </footer>
      </main>
    </div>
  );
}
