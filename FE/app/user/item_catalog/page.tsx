"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  BookOpen,
  Filter,
  Package,
  Layers,
  CheckCircle2,
  AlertCircle,
  Search,
  ArrowRight,
  Sparkles,
  X,
  Boxes,
  Eye,
  Clock,
  MapPin,
  Wrench,
  Tag,
} from "lucide-react";
import api from "@/lib/api";
import UserSidebar from "@/components/user/Sidebar";
import UserNavbar from "@/components/user/Navbar";

// ── Types ──
type TabKey = "semua" | "paket";

interface Item {
  id: string;
  name: string;
  code?: string;
  category: string;
  description: string;
  stock: number;
  total_stock: number;
  status: "available" | "busy";
  return_info?: string;
  damage_reason?: string | null;
  image?: string;
}

interface PackageItem {
  id: string;
  name: string;
  description: string;
  status: string;
  categories?: string[];
  is_available?: boolean;
  has_empty_item?: boolean;
  damage_reason?: string | null;
  image?: string;
  items_count: number;
  items_list: Array<{ name: string; code: string; quantity: number; available_stock?: number; category?: string }>;
}

function useMount() {
  const [m, setM] = useState(false);
  useEffect(() => { setM(true); }, []);
  return m;
}

// ── Availability badge ──
function AvailBadge({ status, returnInfo, damageReason }: { status: Item["status"]; returnInfo?: string; damageReason?: string | null }) {
  if (status === "available")
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500 text-white shadow-2xs">
        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> Siap Dipinjam
      </span>
    );
  if (returnInfo === "Dalam Perbaikan") {
    return (
      <span
        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-amber-500 text-white shadow-2xs"
        title={damageReason || "Sedang dalam perbaikan teknisi"}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> Dalam Perbaikan
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-slate-900/80 backdrop-blur-xs text-white border border-white/20 shadow-2xs">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
      {returnInfo || "Sedang Dipinjam"}
    </span>
  );
}

// ── Item Card ──
function ItemCard({
  item,
  mounted,
  delay,
  onOpenDetail,
}: {
  item: Item;
  mounted: boolean;
  delay: number;
  onOpenDetail: (item: Item) => void;
}) {
  const isBusy = item.status === "busy" || item.stock === 0;
  return (
    <div
      style={{ animationDelay: `${delay}ms` }}
      className={`group bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 ${
        mounted ? "animate-fade-up" : "opacity-0"
      }`}
    >
      {/* Image */}
      <div
        className="relative aspect-[4/3] bg-slate-100 overflow-hidden cursor-pointer"
        onClick={() => onOpenDetail(item)}
      >
        {item.image ? (
          <Image src={item.image} alt={item.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" sizes="33vw" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-tr from-slate-100 to-slate-50">
            <BookOpen className="w-10 h-10 text-slate-300 group-hover:scale-110 transition-transform" />
          </div>
        )}
        <div className="absolute top-3 right-3">
          <AvailBadge status={item.status} returnInfo={item.return_info} damageReason={item.damage_reason} />
        </div>
        {item.code && (
          <div className="absolute bottom-3 left-3">
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-white/90 backdrop-blur-xs text-slate-800 shadow-2xs">
              {item.code}
            </span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-5 flex flex-col flex-1">
        <span className="text-[10px] font-bold text-[#0785BC] uppercase tracking-wider mb-1 bg-blue-50 px-2 py-0.5 rounded-md self-start">
          {item.category}
        </span>
        <h3
          onClick={() => onOpenDetail(item)}
          className="text-base font-bold text-slate-900 leading-snug mb-1.5 mt-1 group-hover:text-[#0785BC] transition-colors cursor-pointer"
        >
          {item.name}
        </h3>
        <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 flex-1">{item.description}</p>

        {item.damage_reason && (
          <div className="mt-2.5 p-2 rounded-xl bg-amber-50 border border-amber-200/80 text-[11px] text-amber-800 flex items-center gap-1.5">
            <Wrench className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span className="truncate">Perbaikan: {item.damage_reason}</span>
          </div>
        )}

        <div className="flex items-center justify-between mt-4 pt-3.5 border-t border-slate-100 gap-2">
          <div>
            <span className="text-[10px] text-slate-400 block">Stok Tersedia</span>
            <span className={`text-xs font-extrabold ${item.stock === 0 ? "text-rose-600" : "text-slate-800"}`}>
              {item.stock} <span className="text-slate-400 font-normal">/ {item.total_stock} unit</span>
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onOpenDetail(item)}
              className="px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-all active:scale-95"
            >
              Detail
            </button>
            <Link
              href={`/user/item_catalog/${item.id}`}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all active:scale-95 shadow-2xs ${
                isBusy
                  ? "bg-slate-100 text-slate-400 cursor-not-allowed pointer-events-none"
                  : "bg-gradient-to-r from-[#0785BC] to-[#0672a0] text-white hover:from-[#0672a0] hover:to-[#055c82] hover:shadow-md"
              }`}
            >
              {isBusy ? (item.return_info === "Dalam Perbaikan" ? "Diperbaiki" : "Habis") : "Pinjam"}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Package Card ──
function PackageCard({
  pkg,
  mounted,
  delay,
  onOpenDetail,
}: {
  pkg: PackageItem;
  mounted: boolean;
  delay: number;
  onOpenDetail: (pkg: PackageItem) => void;
}) {
  const isPkgUnavailable = pkg.is_available === false || ["Non-Aktif", "Nonaktif", "Tidak Aktif"].includes(pkg.status);

  return (
    <div
      style={{ animationDelay: `${delay}ms` }}
      className={`group bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 ${
        mounted ? "animate-fade-up" : "opacity-0"
      }`}
    >
      <div
        className="relative aspect-[16/9] bg-slate-100 overflow-hidden cursor-pointer"
        onClick={() => onOpenDetail(pkg)}
      >
        {pkg.image ? (
          <img
            src={pkg.image}
            alt={pkg.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50/70 via-cyan-50/40 to-slate-100">
            <Layers className="w-10 h-10 text-[#0785BC]/60 group-hover:scale-110 transition-transform" />
          </div>
        )}
        <div className="absolute top-3 right-3">
          {pkg.status === "Dalam Pemeliharaan" || pkg.damage_reason ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-amber-500 text-white shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> Dalam Perbaikan
            </span>
          ) : isPkgUnavailable ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-slate-900/80 text-white shadow-2xs">
              {pkg.has_empty_item ? "Item Kosong" : "Non-Aktif"}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-white/90 backdrop-blur-xs text-[#0785BC] shadow-2xs">
              Bundling Paket
            </span>
          )}
        </div>
      </div>

      <div className="p-5 flex flex-col flex-1 justify-between">
        <div>
          <h3
            onClick={() => onOpenDetail(pkg)}
            className="text-base font-extrabold text-slate-900 group-hover:text-[#0785BC] transition-colors leading-snug cursor-pointer"
          >
            {pkg.name}
          </h3>
          <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">{pkg.description}</p>

          {pkg.categories && pkg.categories.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap mt-2">
              {pkg.categories.map((cat, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-blue-50 text-[#0785BC] border border-blue-100"
                >
                  <Tag className="w-2.5 h-2.5" />
                  {cat}
                </span>
              ))}
            </div>
          )}

          {pkg.damage_reason && (
            <div className="mt-2.5 p-2 rounded-xl bg-amber-50 border border-amber-200/80 text-[11px] text-amber-800 flex items-center gap-1.5">
              <Wrench className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span className="truncate">{pkg.damage_reason}</span>
            </div>
          )}

          <div className="mt-4">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Isi Paket ({pkg.items_count} Barang):
            </p>
            <div className="space-y-1.5 mb-4 max-h-32 overflow-y-auto">
              {pkg.items_list.length === 0 ? (
                <p className="text-xs text-slate-400 italic">Perlengkapan acara terstandar</p>
              ) : (
                pkg.items_list.map((it, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs bg-slate-50 p-2 rounded-xl border border-slate-100">
                    <div className="min-w-0 pr-2">
                      <span className="font-semibold text-slate-700 truncate block">{it.name}</span>
                      {it.category && (
                        <span className="text-[10px] text-slate-400 font-medium">{it.category}</span>
                      )}
                    </div>
                    <span className="font-bold text-[#0785BC] shrink-0 ml-2">{it.quantity} unit</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => onOpenDetail(pkg)}
            className="px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-all active:scale-95"
          >
            Detail
          </button>
          <Link
            href={`/user/item_catalog/${pkg.id}`}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all shadow-2xs active:scale-95 ${
              isPkgUnavailable
                ? "bg-slate-100 text-slate-400 cursor-not-allowed pointer-events-none"
                : "bg-gradient-to-r from-[#0785BC] to-[#0672a0] text-white hover:from-[#0672a0] hover:to-[#055c82] hover:shadow-md"
            }`}
          >
            {isPkgUnavailable ? (pkg.status === "Dalam Pemeliharaan" || pkg.damage_reason ? "Diperbaiki" : (pkg.has_empty_item ? "Item Kosong" : "Non-Aktif")) : "Pinjam Paket"}
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ItemCatalogPage() {
  const [items, setItems]               = useState<Item[]>([]);
  const [packages, setPackages]         = useState<PackageItem[]>([]);
  const [categories, setCategories]     = useState<string[]>([]);
  const [activeTab, setActiveTab]       = useState<TabKey>("semua");
  const [search, setSearch]             = useState("");
  const [checkedCats, setCheckedCats]   = useState<Set<string>>(new Set());
  const [showAvailable, setShowAvail]   = useState(true);
  const [showBusy, setShowBusy]         = useState(false);
  const [loading, setLoading]           = useState(true);
  const [selectedDetailItem, setSelectedDetailItem] = useState<Item | null>(null);
  const [selectedDetailPkg, setSelectedDetailPkg]   = useState<PackageItem | null>(null);
  const mounted = useMount();

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [itemsRes, catsRes, pkgRes, damageRes] = await Promise.all([
          api.items.getAll({ limit: 100 }),
          api.categories.getAll(),
          api.packages.getAll(),
          api.damageReports.getAll(),
        ]);

        const activeDamages = Array.isArray(damageRes?.data)
          ? damageRes.data.filter((d: any) => d.status !== "Selesai")
          : [];
        const damageByItemId: Record<string, any> = {};
        const damageByPkgId: Record<string, any> = {};
        activeDamages.forEach((d: any) => {
          if (d.item_id) damageByItemId[d.item_id] = d;
          if (d.package_id) damageByPkgId[d.package_id] = d;
        });

        if (itemsRes.status === "success" && Array.isArray(itemsRes.data)) {
          const mapped: Item[] = itemsRes.data.map((i: any) => {
            const avail = i.available_stock ?? i.stock ?? 0;
            const activeDmg = damageByItemId[i.id];
            const damagedCount = activeDamages.filter((d: any) => d.item_id === i.id).length;

            // Barang per item hanya 'busy' jika seluruh stok habis (avail === 0)
            const isZeroAvail = avail === 0 || i.status === "Stok Kosong" || (i.status === "Dalam Pemeliharaan" && avail === 0);
            const isAvailable = !isZeroAvail;

            const damageReason = activeDmg
              ? (damagedCount > 0
                  ? `${damagedCount} unit sedang dalam perbaikan (${activeDmg.title})`
                  : `Sebagian unit sedang dalam perbaikan (${activeDmg.title})`)
              : null;

            const returnInfo = isZeroAvail
              ? (activeDmg || i.status === "Dalam Pemeliharaan" ? "Dalam Perbaikan" : "Stok Habis")
              : "Siap Dipinjam";

            return {
              id: i.id,
              name: i.name,
              code: i.code,
              category: i.categories?.name || i.category || "Sarana",
              description: i.description || "Barang inventaris siap digunakan untuk kegiatan kampus.",
              stock: avail,
              total_stock: i.stock || avail,
              status: isAvailable ? "available" : "busy",
              return_info: returnInfo,
              damage_reason: damageReason,
              image: i.image_url || undefined,
            };
          });
          setItems(mapped);
        }

        if (catsRes.status === "success" && Array.isArray(catsRes.data)) {
          setCategories(catsRes.data.map((c: any) => c.name));
        }

        if (pkgRes.status === "success" && Array.isArray(pkgRes.data)) {
          const mappedPkg: PackageItem[] = pkgRes.data.map((p: any) => {
            const pItems = p.packages_items || [];
            const activeDmgPkg = damageByPkgId[p.id];

            // Paket hanya tidak tersedia jika ada komponen barang yang stoknya kurang dari kebutuhan paket
            const unavailableComp = pItems.find(
              (pi: any) => (pi.items?.available_stock ?? pi.items?.stock ?? 0) < (pi.quantity || 1)
            );
            const hasEmpty = Boolean(unavailableComp);
            const isManualInactive = ["Non-Aktif", "Nonaktif", "Tidak Aktif"].includes(p.status);
            const isPkgUnderRepair = p.status === "Dalam Pemeliharaan" || Boolean(activeDmgPkg);
            const isAvail = !hasEmpty && !isManualInactive && !isPkgUnderRepair && p.is_available !== false;

            const pkgDamageReason = p.damage_reason || (activeDmgPkg
              ? `Paket sedang diperbaiki (${activeDmgPkg.title})`
              : (unavailableComp && damageByItemId[unavailableComp.items?.id || unavailableComp.item_id]
                  ? `Komponen "${unavailableComp.items?.name || 'Barang'}" stok kurang karena unit sedang diperbaiki`
                  : null));

            const categoriesList = p.categories || Array.from(
              new Set(
                pItems
                  .map((pi: any) => pi.items?.categories?.name || pi.items?.category)
                  .filter(Boolean)
              )
            );

            return {
              id: p.id,
              name: p.name,
              description: p.description || "Paket gabungan inventaris siap pakai.",
              status: isPkgUnderRepair ? "Dalam Pemeliharaan" : (isManualInactive ? "Non-Aktif" : (hasEmpty ? "Non-Aktif" : (p.status || "Aktif"))),
              is_available: isAvail,
              damage_reason: pkgDamageReason,
              has_empty_item: hasEmpty,
              image: p.image_url || undefined,
              categories: categoriesList,
              items_count: pItems.length,
              items_list: pItems.map((pi: any) => ({
                name: pi.items?.name || "Aset",
                code: pi.items?.code || "-",
                quantity: pi.quantity || 1,
                available_stock: pi.items?.available_stock ?? 0,
                category: pi.items?.categories?.name || pi.items?.category || "Umum",
              })),
            };
          });
          setPackages(mappedPkg);
        }
      } catch (err) {
        console.warn("Gagal memuat katalog:", err);
      } finally {
        setLoading(false);
      }
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
    setCheckedCats(new Set());
    setShowAvail(true);
    setShowBusy(false);
    setSearch("");
  }

  const filteredItems = items.filter((item) => {
    const matchSearch =
      !search ||
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      (item.code && item.code.toLowerCase().includes(search.toLowerCase()));
    const matchCat   = checkedCats.size === 0 || checkedCats.has(item.category);
    const matchAvail =
      (showAvailable && item.status === "available") ||
      (showBusy && item.status === "busy") ||
      (!showAvailable && !showBusy);
    return matchSearch && matchCat && matchAvail;
  });

  const filteredPackages = packages.filter((p) => {
    const pkgCats = (p.categories || []).map((c) => c.toLowerCase());
    const matchSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase()) ||
      pkgCats.some((c) => c.includes(search.toLowerCase())) ||
      p.items_list.some(
        (it) =>
          it.name.toLowerCase().includes(search.toLowerCase()) ||
          it.code.toLowerCase().includes(search.toLowerCase()) ||
          it.category?.toLowerCase().includes(search.toLowerCase())
      );

    const matchCat =
      checkedCats.size === 0 ||
      (p.categories || []).some((c) => checkedCats.has(c)) ||
      p.items_list.some((it) => it.category && checkedCats.has(it.category));

    return matchSearch && matchCat;
  });

  return (
    <div className="flex h-screen overflow-hidden bg-[#eef2f9] text-slate-800">
      {/* ── Sidebar ── */}
      <UserSidebar />

      {/* ── Main ── */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <UserNavbar searchValue={search} onSearchChange={setSearch} />

        <div className="flex-1 overflow-y-auto">
          <div className="p-8 max-w-7xl mx-auto space-y-6">
            {/* Page header */}
            <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${mounted ? "animate-fade-up" : "opacity-0"}`}>
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
                  Katalog Sarana & Prasarana
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Jelajahi dan ajukan peminjaman fasilitas untuk menunjang kegiatan akademik & organisasi.
                </p>
              </div>

              {/* Tab Selector */}
              <div className="flex bg-white p-1 rounded-2xl border border-slate-200/80 shadow-2xs self-start sm:self-auto">
                <button
                  onClick={() => setActiveTab("semua")}
                  className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                    activeTab === "semua"
                      ? "bg-[#0785BC] text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Satuan ({items.length})
                </button>
                <button
                  onClick={() => setActiveTab("paket")}
                  className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                    activeTab === "paket"
                      ? "bg-[#0785BC] text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Paket Bundling ({packages.length})
                </button>
              </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-6 items-start">
              {/* ── Filter Panel ── */}
              {activeTab === "semua" && (
                <aside className={`w-full lg:w-60 shrink-0 ${mounted ? "animate-slide-in-left" : "opacity-0"}`}>
                  <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 space-y-5">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-slate-600" />
                        <span className="text-xs font-extrabold text-slate-800">Filter Kategori</span>
                      </div>
                      {checkedCats.size > 0 && (
                        <button
                          onClick={resetFilters}
                          className="text-[11px] text-[#0785BC] font-semibold hover:underline"
                        >
                          Reset
                        </button>
                      )}
                    </div>

                    {/* Category Checkboxes */}
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">
                        Kategori Inventaris
                      </p>
                      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        {categories.map((cat) => (
                          <label key={cat} className="flex items-center gap-2.5 cursor-pointer group text-xs text-slate-700">
                            <input
                              type="checkbox"
                              checked={checkedCats.has(cat)}
                              onChange={() => toggleCat(cat)}
                              className="rounded border-slate-300 text-[#0785BC] focus:ring-[#0785BC]"
                            />
                            <span className="group-hover:text-slate-900">{cat}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Availability */}
                    <div className="pt-3 border-t border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">
                        Ketersediaan
                      </p>
                      <div className="space-y-2 text-xs">
                        <label className="flex items-center gap-2.5 cursor-pointer text-slate-700">
                          <input
                            type="checkbox"
                            checked={showAvailable}
                            onChange={(e) => setShowAvail(e.target.checked)}
                            className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                          />
                          <span>Siap Dipinjam</span>
                        </label>
                        <label className="flex items-center gap-2.5 cursor-pointer text-slate-700">
                          <input
                            type="checkbox"
                            checked={showBusy}
                            onChange={(e) => setShowBusy(e.target.checked)}
                            className="rounded border-slate-300 text-amber-500 focus:ring-amber-500"
                          />
                          <span>Sedang Dipinjam</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </aside>
              )}

              {/* ── Items / Packages Grid ── */}
              <div className="flex-1 w-full">
                {loading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-2xs">
                        <div className="aspect-[4/3] bg-slate-100 animate-pulse" />
                        <div className="p-5 space-y-2.5">
                          <div className="h-3.5 bg-slate-100 rounded animate-pulse w-1/3" />
                          <div className="h-4.5 bg-slate-100 rounded animate-pulse w-3/4" />
                          <div className="h-3 bg-slate-100 rounded animate-pulse w-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : activeTab === "semua" ? (
                  filteredItems.length === 0 ? (
                    <div className="bg-white rounded-3xl border border-slate-100 p-16 text-center text-slate-400">
                      <BookOpen className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                      <p className="font-bold text-slate-700 text-base">Tidak ada barang yang cocok</p>
                      <p className="text-xs text-slate-400 mt-1">
                        Sesuaikan kata kunci pencarian atau reset filter kategori.
                      </p>
                      <button
                        onClick={resetFilters}
                        className="mt-4 px-4 py-2 bg-blue-50 text-[#0785BC] rounded-xl text-xs font-bold hover:bg-blue-100 transition-colors"
                      >
                        Reset Semua Filter
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                      {filteredItems.map((item, i) => (
                        <ItemCard
                          key={item.id}
                          item={item}
                          mounted={mounted}
                          delay={100 + i * 50}
                          onOpenDetail={(it) => setSelectedDetailItem(it)}
                        />
                      ))}
                    </div>
                  )
                ) : (
                  /* Paket Tab */
                  filteredPackages.length === 0 ? (
                    <div className="bg-white rounded-3xl border border-slate-100 p-16 text-center text-slate-400">
                      <Layers className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                      <p className="font-bold text-slate-700 text-base">Belum ada paket bundling aktif</p>
                      <p className="text-xs text-slate-400 mt-1">Silakan pilih opsi barang satuan pada tab sebelah.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                      {filteredPackages.map((pkg, i) => (
                        <PackageCard
                          key={pkg.id}
                          pkg={pkg}
                          mounted={mounted}
                          delay={100 + i * 50}
                          onOpenDetail={(p) => setSelectedDetailPkg(p)}
                        />
                      ))}
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ── Modal Detail Barang (User View) ── */}
      {selectedDetailItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full overflow-hidden border border-slate-100 shadow-2xl flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#0785BC]/10 text-[#0785BC] flex items-center justify-center shadow-2xs">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Detail Barang</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Informasi spesifikasi dan ketersediaan aset</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedDetailItem(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5">
              {/* Photo Showcase */}
              <div className="relative w-full h-52 rounded-2xl overflow-hidden border border-slate-100 bg-slate-900/5 group">
                {selectedDetailItem.image ? (
                  <>
                    <img
                      src={selectedDetailItem.image}
                      alt={selectedDetailItem.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  </>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-100 via-blue-50/40 to-slate-200/50 p-6 text-center">
                    <BookOpen className="w-10 h-10 text-slate-300 mb-2" />
                    <p className="text-xs font-bold text-slate-600">Tidak Ada Foto Barang</p>
                  </div>
                )}
                <div className="absolute top-3 left-3 flex gap-1.5">
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-white/90 backdrop-blur-md text-[#0785BC] shadow-sm">
                    {selectedDetailItem.category}
                  </span>
                </div>
                <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between text-white">
                  <h2 className="text-lg font-black leading-tight drop-shadow-md">{selectedDetailItem.name}</h2>
                  <AvailBadge status={selectedDetailItem.status} returnInfo={selectedDetailItem.return_info} />
                </div>
              </div>

              {/* Damage / Maintenance Alert */}
              {selectedDetailItem.damage_reason && (
                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200/90 flex items-start gap-2.5 text-xs text-amber-900 animate-fade-in">
                  <Wrench className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-amber-950">
                      {selectedDetailItem.status === "available"
                        ? "Informasi Sebagian Unit Dalam Perbaikan"
                        : "Sedang Dalam Perbaikan / Pemeliharaan"}
                    </p>
                    <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                      {selectedDetailItem.status === "available"
                        ? `Catatan teknisi: ${selectedDetailItem.damage_reason}. Sisa ${selectedDetailItem.stock} unit lainnya dalam kondisi baik dan dapat diajukan untuk peminjaman.`
                        : `Seluruh unit barang ini sedang ditarik untuk perbaikan akibat: "${selectedDetailItem.damage_reason}".`}
                    </p>
                  </div>
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-100">
                  <p className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider">Stok Tersedia</p>
                  <p className="text-lg font-extrabold text-emerald-700 mt-0.5">
                    {selectedDetailItem.stock} <span className="text-xs font-normal text-emerald-600">/ {selectedDetailItem.total_stock} unit</span>
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Kode Aset</p>
                  <p className="text-sm font-mono font-bold text-slate-800 mt-1">{selectedDetailItem.code || "-"}</p>
                </div>
              </div>

              {/* Description */}
              <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/40">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Deskripsi Barang</p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {selectedDetailItem.description || "Tidak ada deskripsi rinci untuk barang ini."}
                </p>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
              <button
                type="button"
                onClick={() => setSelectedDetailItem(null)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 text-xs font-bold rounded-xl transition-colors"
              >
                Tutup
              </button>
              <Link
                href={`/user/item_catalog/${selectedDetailItem.id}`}
                className={`inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white rounded-xl transition-all shadow-2xs ${
                  selectedDetailItem.status === "busy"
                    ? "bg-slate-300 pointer-events-none cursor-not-allowed"
                    : "bg-[#0785BC] hover:bg-[#0672a0] hover:shadow-md"
                }`}
              >
                {selectedDetailItem.status === "busy"
                  ? (selectedDetailItem.return_info === "Dalam Perbaikan" ? "Sedang Diperbaiki" : "Stok Habis")
                  : "Ajukan Peminjaman"}
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Detail Paket (User View) ── */}
      {selectedDetailPkg && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full overflow-hidden border border-slate-100 shadow-2xl flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#0785BC]/10 text-[#0785BC] flex items-center justify-center shadow-2xs">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Detail Paket Bundling</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Gabungan aset terstandarisasi untuk kegiatan</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedDetailPkg(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5">
              {/* Photo Showcase */}
              <div className="relative w-full h-52 rounded-2xl overflow-hidden border border-slate-100 bg-slate-900/5 group">
                {selectedDetailPkg.image ? (
                  <>
                    <img
                      src={selectedDetailPkg.image}
                      alt={selectedDetailPkg.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  </>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-100 via-blue-50/40 to-slate-200/50 p-6 text-center">
                    <Layers className="w-10 h-10 text-[#0785BC]/60 mb-2" />
                    <p className="text-xs font-bold text-slate-600">Tidak Ada Foto Paket</p>
                  </div>
                )}
                <div className="absolute top-3 left-3">
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-white/90 backdrop-blur-md text-[#0785BC] shadow-sm">
                    Bundling Paket
                  </span>
                </div>
                <div className="absolute bottom-3 left-3 right-3 text-white">
                  <h2 className="text-lg font-black leading-tight drop-shadow-md">{selectedDetailPkg.name}</h2>
                </div>
              </div>

              {/* Status Alert if Inactive or Empty or Damaged */}
              {(selectedDetailPkg.is_available === false || selectedDetailPkg.damage_reason) && (
                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-2.5 text-xs text-amber-800 animate-fade-in">
                  <Wrench className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-amber-900">
                      {selectedDetailPkg.damage_reason
                        ? "Sedang Dalam Perbaikan / Pemeliharaan"
                        : (selectedDetailPkg.has_empty_item ? "Item Kosong / Stok Kurang" : "Paket Non-Aktif")}
                    </p>
                    <p className="text-[11px] text-amber-700 mt-0.5 leading-relaxed">
                      {selectedDetailPkg.damage_reason
                        ? selectedDetailPkg.damage_reason + ". Paket tidak dapat dipinjam saat ini."
                        : (selectedDetailPkg.has_empty_item
                            ? "Salah satu komponen barang dalam paket ini sedang kosong atau tidak mencukupi, sehingga paket tidak dapat dipinjam per paket saat ini."
                            : "Paket ini sedang dinonaktifkan oleh petugas sarpras.")}
                    </p>
                  </div>
                </div>
              )}

              {/* Description */}
              <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/40">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Deskripsi Paket</p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {selectedDetailPkg.description || "Paket bundling inventaris siap pakai."}
                </p>
              </div>

              {/* Items in Package */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-800">
                  Komponen Termasuk ({selectedDetailPkg.items_count} Macam Barang)
                </p>
                <div className="border border-slate-100 rounded-2xl divide-y divide-slate-100 bg-slate-50/30 overflow-hidden">
                  {selectedDetailPkg.items_list.map((it, idx) => (
                    <div key={idx} className="p-3 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-slate-800">{it.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[11px] font-mono text-slate-400">Kode: {it.code}</span>
                          {it.category && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded font-semibold bg-blue-50 text-[#0785BC] border border-blue-100">
                              {it.category}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-[#0785BC]/10 text-[#0785BC]">
                          {it.quantity} unit
                        </span>
                        {it.available_stock !== undefined && (
                          <p className={`text-[10px] mt-0.5 font-semibold ${
                            it.available_stock < it.quantity ? "text-rose-500 font-bold" : "text-emerald-600"
                          }`}>
                            {it.available_stock < it.quantity ? `Sisa ${it.available_stock} (Kurang)` : `Tersedia: ${it.available_stock}`}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
              <button
                type="button"
                onClick={() => setSelectedDetailPkg(null)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 text-xs font-bold rounded-xl transition-colors"
              >
                Tutup
              </button>
              <Link
                href={`/user/item_catalog/${selectedDetailPkg.id}`}
                className={`inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white rounded-xl transition-all shadow-2xs ${
                  selectedDetailPkg.is_available === false || ["Non-Aktif", "Nonaktif", "Tidak Aktif"].includes(selectedDetailPkg.status)
                    ? "bg-slate-300 pointer-events-none cursor-not-allowed"
                    : "bg-[#0785BC] hover:bg-[#0672a0] hover:shadow-md active:scale-95"
                }`}
              >
                {selectedDetailPkg.is_available === false || ["Non-Aktif", "Nonaktif", "Tidak Aktif"].includes(selectedDetailPkg.status) ? "Paket Kosong / Non-Aktif" : "Pinjam Paket Ini"}
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
