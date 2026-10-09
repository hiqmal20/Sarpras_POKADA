"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { isItemEmptyStock, isPackageEmptyStock, normalizeItem } from "@/lib/item";
import { getSocket } from "@/lib/socket";
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
  Sparkles,
  Boxes,
  FolderKanban,
  Check,
  Search,
  SlidersHorizontal,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import api from "@/lib/api";
import { UserLayout } from "@/components/user";
import { useLanguage } from "@/lib/i18n";

type DetailTab = "item" | "paket";
type FilterMode = "all" | "has_items" | "has_packages";

interface Catalog {
  id: string;
  name: string;
  description: string;
  image?: string;
  itemCount: number;
  packageCount: number;
}

const COVERS = [
  "from-[#0785BC] via-[#0992cf] to-[#0aa5e0]",
  "from-violet-600 via-purple-600 to-indigo-500",
  "from-emerald-600 via-teal-600 to-cyan-500",
  "from-amber-500 via-orange-500 to-rose-500",
  "from-rose-500 via-pink-600 to-purple-500",
  "from-cyan-600 via-sky-600 to-blue-500",
];

function catalogIcon(name: string) {
  const n = name.toLowerCase();
  if (n.includes("elektron") || n.includes("komputer") || n.includes("laptop")) return Cpu;
  if (n.includes("furni") || n.includes("mebel") || n.includes("kursi") || n.includes("meja"))
    return Armchair;
  if (n.includes("olahraga") || n.includes("sport")) return Trophy;
  if (n.includes("musik") || n.includes("audio") || n.includes("sound") || n.includes("mic"))
    return Music;
  if (n.includes("lab")) return FlaskConical;
  if (n.includes("tulis") || n.includes("atk") || n.includes("spidol") || n.includes("kertas"))
    return Pencil;
  if (n.includes("kendaraan") || n.includes("mobil") || n.includes("motor")) return Car;
  if (n.includes("dapur") || n.includes("masak")) return CookingPot;
  if (n.includes("jaringan") || n.includes("network") || n.includes("wifi")) return Wifi;
  if (n.includes("foto") || n.includes("kamera") || n.includes("video") || n.includes("multimedia"))
    return Camera;
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
  const parts = String(pkg.category ?? "")
    .split(",")
    .map((s) => norm(s));
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
  return (
    <div className="max-w-6xl mx-auto p-12 text-center text-sm text-slate-400">
      {tr("catalog.loading", "Memuat katalog...")}
    </div>
  );
}

function UserCatalogContent() {
  const router = useRouter();
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
  const [filterMode, setFilterMode] = useState<FilterMode>("all");

  useEffect(() => {
    const pkgId = searchParams.get("paket");
    if (pkgId) {
      router.push(`/user/item_catalog/package/${pkgId}`);
    }
  }, [searchParams, router]);

  useEffect(() => {
    const q = searchParams.get("q");
    if (q !== null) setSearch(q);
  }, [searchParams]);

  const loadData = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Real-time WebSocket connection to receive instant stock, item, and package updates
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleStockUpdate = (payload?: any) => {
      if (payload?.item) {
        setItems((prev) =>
          prev.map((it) => (it.id === payload.item.id ? normalizeItem(payload.item) : it))
        );
      }
      loadData();
    };

    socket.on("stock_updated", handleStockUpdate);
    socket.on("item_updated", handleStockUpdate);
    socket.on("item_created", handleStockUpdate);
    socket.on("item_deleted", handleStockUpdate);
    socket.on("package_updated", handleStockUpdate);
    socket.on("package_created", handleStockUpdate);
    socket.on("package_deleted", handleStockUpdate);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        loadData();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", handleVisibility);

    return () => {
      socket.off("stock_updated", handleStockUpdate);
      socket.off("item_updated", handleStockUpdate);
      socket.off("item_created", handleStockUpdate);
      socket.off("item_deleted", handleStockUpdate);
      socket.off("package_updated", handleStockUpdate);
      socket.off("package_created", handleStockUpdate);
      socket.off("package_deleted", handleStockUpdate);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", handleVisibility);
    };
  }, [loadData]);

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
          description:
            c.description ||
            `${matchedItems.length} ${tr("catalog.items_word", "barang")} • ${
              matchedPkgs.length
            } ${tr("catalog.packages_word", "paket")} ${tr(
              "catalog.in_catalog",
              "tersedia dalam kategori ini"
            )}.`,
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
      const matchedPkgs = packages.filter((p) =>
        pkgMatches(p, { id: `local-${idx}`, name } as Catalog)
      );
      return {
        id: `local-${idx}`,
        name,
        description: `${g.items.length} ${tr("catalog.items_word", "barang")} • ${
          matchedPkgs.length
        } ${tr("catalog.packages_word", "paket")} ${tr(
          "catalog.in_catalog",
          "tersedia dalam kategori ini"
        )}.`,
        image: g.image,
        itemCount: g.items.length,
        packageCount: matchedPkgs.length,
      };
    });
  }, [categories, items, packages, t]);

  const q = search.trim().toLowerCase();
  const visibleCatalogs = useMemo(() => {
    return catalogs.filter((c) => {
      const matchSearch =
        !q || c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q);
      if (!matchSearch) return false;
      if (filterMode === "has_items") return c.itemCount > 0;
      if (filterMode === "has_packages") return c.packageCount > 0;
      return true;
    });
  }, [catalogs, q, filterMode]);

  const detailItems = !selectedCatalog
    ? []
    : items.filter(
        (it: any) =>
          itemMatches(it, selectedCatalog) && (!q || it.name.toLowerCase().includes(q))
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

  function openCatalog(cat: Catalog) {
    setSelectedCatalog(cat);
    setDetailTab("item");
  }

  return (
    <UserLayout
      showSearch={true}
      searchValue={search}
      onSearchChange={setSearch}
      searchPlaceholder={tr("catalog.search_ph", "Cari kategori, nama barang, atau paket...")}
    >
      <div className="user-page-shell w-full min-w-0 space-y-6 pb-12">
        {!selectedCatalog ? (
          <>
            {/* ══════════════════════════════════════════════════════════
                HERO BANNER: Modern Gradient + Interactive Metrics
               ══════════════════════════════════════════════════════════ */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0672a0] via-[#0785BC] to-[#0aa5e0] dark:from-[#0d2238] dark:via-[#091f35] dark:to-[#071728] p-6 sm:p-8 md:p-10 text-white shadow-lg shadow-[#0785BC]/15 border border-[#0785BC]/20">
              {/* Background ambient lighting glows */}
              <div className="absolute -right-16 -top-16 w-80 h-80 rounded-full bg-white/10 dark:bg-sky-500/10 blur-3xl pointer-events-none" />
              <div className="absolute -left-10 -bottom-10 w-64 h-64 rounded-full bg-[#0aa5e0]/20 blur-2xl pointer-events-none" />

              <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6 lg:gap-10">
                {/* Left Text Header */}
                <div className="max-w-2xl min-w-0">
                  

                  <h1 className="mt-3 text-2xl sm:text-3xl md:text-4xl font-black tracking-tight leading-tight">
                    {tr("catalog.title", "Kategori Fasilitas & Barang")}
                  </h1>

                  <p className="mt-2.5 text-xs sm:text-sm text-sky-100/90 dark:text-slate-300 leading-relaxed">
                    {tr(
                      "catalog.hero_desc",
                      "Jelajahi seluruh kategori fasilitas sarana dan prasarana. Pilih kategori untuk melihat unit barang perorangan maupun paket bundling siap pakai."
                    )}
                  </p>
                </div>

                {/* Right Stat Glass Cards (3 Metric Pillars) */}
                <div className="grid grid-cols-3 gap-2.5 sm:gap-3.5 shrink-0 w-full lg:w-auto">
                  <div className="bg-white/15 dark:bg-white/5 backdrop-blur-md rounded-2xl p-3 sm:p-4 border border-white/20 flex flex-col justify-between text-center min-w-[85px] sm:min-w-[105px]">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-white/20 flex items-center justify-center mx-auto mb-1.5 text-white">
                      <LayoutGrid className="w-4 h-4" />
                    </div>
                    <span className="text-xl sm:text-2xl font-black leading-none">{catalogs.length}</span>
                    <span className="text-[10px] sm:text-[11px] font-semibold text-sky-100/80 mt-1">
                      Kategori
                    </span>
                  </div>

                  <div className="bg-white/15 dark:bg-white/5 backdrop-blur-md rounded-2xl p-3 sm:p-4 border border-white/20 flex flex-col justify-between text-center min-w-[85px] sm:min-w-[105px]">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-white/20 flex items-center justify-center mx-auto mb-1.5 text-white">
                      <Package className="w-4 h-4" />
                    </div>
                    <span className="text-xl sm:text-2xl font-black leading-none">{items.length}</span>
                    <span className="text-[10px] sm:text-[11px] font-semibold text-sky-100/80 mt-1">
                      Barang
                    </span>
                  </div>

                  <div className="bg-white/15 dark:bg-white/5 backdrop-blur-md rounded-2xl p-3 sm:p-4 border border-white/20 flex flex-col justify-between text-center min-w-[85px] sm:min-w-[105px]">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-white/20 flex items-center justify-center mx-auto mb-1.5 text-white">
                      <Layers className="w-4 h-4" />
                    </div>
                    <span className="text-xl sm:text-2xl font-black leading-none">{packages.length}</span>
                    <span className="text-[10px] sm:text-[11px] font-semibold text-sky-100/80 mt-1">
                      Paket
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ══════════════════════════════════════════════════════════
                QUICK FILTER & SEARCH BAR
               ══════════════════════════════════════════════════════════ */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                <button
                  type="button"
                  onClick={() => setFilterMode("all")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    filterMode === "all"
                      ? "bg-[#0785BC] text-white shadow-xs shadow-[#0785BC]/30"
                      : "bg-white dark:bg-[#111c30] text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  Semua Kategori ({catalogs.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode("has_items")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    filterMode === "has_items"
                      ? "bg-[#0785BC] text-white shadow-xs shadow-[#0785BC]/30"
                      : "bg-white dark:bg-[#111c30] text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  <Package className="w-3.5 h-3.5" />
                  Ada Barang
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode("has_packages")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    filterMode === "has_packages"
                      ? "bg-[#0785BC] text-white shadow-xs shadow-[#0785BC]/30"
                      : "bg-white dark:bg-[#111c30] text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  Ada Paket
                </button>
              </div>

              {/* Result counter indicator */}
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                {q && (
                  <span className="flex items-center gap-1 font-semibold text-[#0785BC]">
                    Pencarian: &quot;{q}&quot;
                    <button
                      type="button"
                      onClick={() => setSearch("")}
                      className="hover:text-rose-600 ml-1 cursor-pointer"
                      title="Hapus pencarian"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                )}
                <span>
                  Menampilkan <b>{visibleCatalogs.length}</b> dari {catalogs.length} kategori
                </span>
              </div>
            </div>

            {/* ══════════════════════════════════════════════════════════
                MODERN CATEGORY CARDS GRID
               ══════════════════════════════════════════════════════════ */}
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 items-stretch">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div
                    key={i}
                    className="bg-white dark:bg-[#111c30] rounded-3xl border border-slate-200/70 dark:border-slate-800 overflow-hidden shadow-xs animate-pulse"
                  >
                    <div className="h-[180px] bg-slate-200 dark:bg-slate-800" />
                    <div className="p-5 space-y-3">
                      <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-2/3" />
                      <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded" />
                      <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/2" />
                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 h-8" />
                    </div>
                  </div>
                ))}
              </div>
            ) : visibleCatalogs.length === 0 ? (
              <div className="bg-white dark:bg-[#111c30] rounded-3xl border border-slate-200/80 dark:border-slate-800 p-12 text-center shadow-xs">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-3">
                  <LayoutGrid className="w-7 h-7" />
                </div>
                <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100">
                  {tr("catalog.no_match", "Belum ada kategori yang sesuai pencarian.")}
                </h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  {tr("catalog.no_match_sub", "Coba kata kunci lain atau pilih filter Semua Kategori.")}
                </p>
                {q && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="mt-4 px-4 py-2 rounded-xl bg-[#0785BC] text-white text-xs font-bold hover:bg-[#0672a0] transition-colors cursor-pointer"
                  >
                    Reset Pencarian
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 items-stretch">
                {visibleCatalogs.map((cat, idx) => {
                  const Icon = catalogIcon(cat.name);
                  const hasStock = cat.itemCount > 0 || cat.packageCount > 0;
                  const coverGradient = COVERS[idx % COVERS.length];

                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => openCatalog(cat)}
                      className="group text-left bg-white dark:bg-[#111c30] rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.06)] hover:shadow-[0_16px_36px_-8px_rgba(7,133,188,0.22)] hover:-translate-y-1.5 transition-all duration-300 overflow-hidden flex flex-col cursor-pointer"
                    >
                      {/* Media Cover Showcase */}
                      <div className="relative h-[180px] sm:h-[195px] overflow-hidden bg-slate-900 shrink-0">
                        {cat.image ? (
                          <>
                            <img
                              src={cat.image}
                              alt={cat.name}
                              className="absolute inset-0 w-full h-full object-cover group-hover:scale-108 transition-transform duration-500"
                            />
                            {/* Deep rich vignette overlay for readability */}
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-slate-950/20" />
                          </>
                        ) : (
                          <div
                            className={`absolute inset-0 bg-gradient-to-br ${coverGradient} flex items-center justify-center overflow-hidden`}
                          >
                            <div className="absolute -right-6 -bottom-6 w-36 h-36 rounded-full bg-white/10 blur-xl pointer-events-none" />
                            <div className="w-20 h-20 rounded-3xl bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform duration-300">
                              <Icon className="w-10 h-10 drop-shadow-sm" />
                            </div>
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />
                          </div>
                        )}

                        {/* Top Left: Category Badge */}
                        <div className="absolute top-3 left-3">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/95 dark:bg-slate-900/90 backdrop-blur-md text-[11px] font-bold text-[#0785BC] dark:text-sky-300 shadow-xs border border-white/40 dark:border-slate-700">
                            <Icon className="w-3.5 h-3.5 text-[#0785BC]" />
                            Kategori
                          </span>
                        </div>

                        {/* Top Right: Status availability */}
                        <div className="absolute top-3 right-3">
                          {hasStock ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-500/90 text-white backdrop-blur-md text-[10px] font-bold shadow-xs">
                              <Check className="w-3 h-3" />
                              Siap Pinjam
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-900/80 text-slate-300 backdrop-blur-md text-[10px] font-bold shadow-xs border border-white/10">
                              Belum Ada Item
                            </span>
                          )}
                        </div>

                        {/* Bottom Overlay Pills on Image */}
                        <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/55 backdrop-blur-md text-white text-[11px] font-semibold border border-white/10 shadow-xs">
                            <Package className="w-3.5 h-3.5 text-sky-300" />
                            {cat.itemCount} Barang
                          </span>
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/55 backdrop-blur-md text-white text-[11px] font-semibold border border-white/10 shadow-xs">
                            <Layers className="w-3.5 h-3.5 text-violet-300" />
                            {cat.packageCount} Paket
                          </span>
                        </div>
                      </div>

                      {/* Card Content */}
                      <div className="p-5 sm:p-6 flex flex-col flex-1">
                        <div className="flex-1">
                          <h3 className="text-base sm:text-lg font-extrabold leading-snug text-slate-900 dark:text-white group-hover:text-[#0785BC] dark:group-hover:text-sky-400 transition-colors line-clamp-1">
                            {cat.name}
                          </h3>
                          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2 min-h-[2.3rem]">
                            {cat.description}
                          </p>
                        </div>

                        {/* Mini Asset Distribution Grid */}
                        <div className="mt-4 grid grid-cols-2 gap-2">
                          <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center gap-2">
                            <div className="w-6 h-6 rounded-lg bg-sky-100 dark:bg-sky-950/60 text-[#0785BC] flex items-center justify-center shrink-0">
                              <Package className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200 leading-none">
                                {cat.itemCount} Unit
                              </p>
                              <p className="text-[9px] text-slate-400 mt-0.5">Per Item</p>
                            </div>
                          </div>

                          <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center gap-2">
                            <div className="w-6 h-6 rounded-lg bg-violet-100 dark:bg-violet-950/60 text-violet-600 flex items-center justify-center shrink-0">
                              <Layers className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200 leading-none">
                                {cat.packageCount} Paket
                              </p>
                              <p className="text-[9px] text-slate-400 mt-0.5">Bundling</p>
                            </div>
                          </div>
                        </div>

                        {/* Divider & Modern Action Footer */}
                        <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                          <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                            Buka koleksi fasilitas
                          </span>
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 group-hover:bg-[#0785BC] text-slate-700 dark:text-slate-200 group-hover:text-white text-xs font-bold transition-all shadow-2xs">
                            <span>Jelajahi</span>
                            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
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
          /* ══════════════════════════════════════════════════════════
              VIEW INSIDE SELECTED CATEGORY (Item & Package listings)
             ══════════════════════════════════════════════════════════ */
          <>
            {/* Top Navigation */}
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setSelectedCatalog(null)}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-[#111c30] border border-slate-200/80 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-[#0785BC] hover:border-[#0785BC]/30 shadow-xs transition-all cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{tr("common.back_catalog", "Kembali ke Semua Kategori")}</span>
              </button>

              <span className="text-xs text-slate-400 font-medium hidden sm:inline">
                Kategori Terpilih
              </span>
            </div>

            {/* Selected Category Modern Header Banner */}
            <div className="bg-white dark:bg-[#111c30] rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-[0_4px_24px_-4px_rgba(15,23,42,0.06)] p-5 sm:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#0785BC] to-[#0aa5e0] text-white flex items-center justify-center shadow-md shadow-[#0785BC]/20 shrink-0">
                  {(() => {
                    const Icon = catalogIcon(selectedCatalog.name);
                    return <Icon className="w-7 h-7" />;
                  })()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#0785BC] dark:text-sky-300">
                      Kategori Fasilitas
                    </span>
                    <span className="text-xs text-slate-300 dark:text-slate-700">•</span>
                    <span className="text-xs text-slate-500 font-medium">Aktif</span>
                  </div>
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white truncate mt-0.5">
                    {selectedCatalog.name}
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 max-w-2xl">
                    {selectedCatalog.description}
                  </p>
                </div>
              </div>

              {/* Quick Summary Pill on Header */}
              <div className="flex items-center gap-2 shrink-0">
                <span className="px-3 py-1.5 rounded-xl bg-sky-50 dark:bg-sky-950/60 border border-sky-200/80 dark:border-sky-800 text-[#0785BC] dark:text-sky-300 text-xs font-bold flex items-center gap-1.5 shadow-2xs">
                  <Package className="w-3.5 h-3.5" />
                  {detailItems.length} Barang
                </span>
                <span className="px-3 py-1.5 rounded-xl bg-violet-50 dark:bg-violet-950/60 border border-violet-200/80 dark:border-violet-800 text-violet-700 dark:text-violet-300 text-xs font-bold flex items-center gap-1.5 shadow-2xs">
                  <Layers className="w-3.5 h-3.5" />
                  {detailPackages.length} Paket
                </span>
              </div>
            </div>

            {/* Segmented Control Pill Switcher */}
            <div className="flex p-1.5 bg-slate-200/70 dark:bg-slate-800/80 rounded-2xl w-full sm:w-fit gap-1">
              <button
                type="button"
                onClick={() => setDetailTab("item")}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  detailTab === "item"
                    ? "bg-white dark:bg-[#111c30] text-[#0785BC] dark:text-sky-300 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Package className="w-4 h-4" />
                <span>{tr("catalog.per_item", "Daftar Per Item")}</span>
                <span className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-extrabold">
                  {detailItems.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setDetailTab("paket")}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  detailTab === "paket"
                    ? "bg-white dark:bg-[#111c30] text-violet-600 dark:text-violet-400 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>{tr("catalog.per_package", "Paket Bundling")}</span>
                <span className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-extrabold">
                  {detailPackages.length}
                </span>
              </button>
            </div>

            {/* Content Tabs */}
            {detailTab === "item" ? (
              detailItems.length === 0 ? (
                <div className="bg-white dark:bg-[#111c30] rounded-3xl border border-slate-200/80 dark:border-slate-800 p-12 text-center text-sm text-slate-400">
                  <Package className="w-10 h-10 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                  <p className="font-bold text-slate-600 dark:text-slate-300">
                    {tr("catalog.empty_items", "Tidak ada barang per item dalam kategori ini.")}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-stretch">
                  {detailItems.map((it: any) => {
                    const empty = isItemEmptyStock(it);
                    return (
                      <div
                        key={it.id}
                        className={`group bg-white dark:bg-[#111c30] rounded-3xl border overflow-hidden transition-all duration-300 flex flex-col ${
                          empty
                            ? "border-rose-200/80 dark:border-rose-900/50 shadow-xs"
                            : "border-slate-200/80 dark:border-slate-800 shadow-[0_4px_16px_-4px_rgba(15,23,42,0.05)] hover:shadow-[0_12px_28px_-8px_rgba(7,133,188,0.2)] hover:-translate-y-1 hover:border-[#0785BC]/30"
                        }`}
                      >
                        <div className="relative h-[160px] bg-slate-100 dark:bg-slate-900 overflow-hidden shrink-0">
                          {it.image ? (
                            <img
                              src={it.image}
                              alt={it.name}
                              className={`w-full h-full object-cover transition-transform duration-300 ${
                                empty ? "grayscale opacity-60" : "group-hover:scale-105"
                              }`}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-300">
                              <Package className="w-10 h-10 stroke-[1.2]" />
                            </div>
                          )}
                          {empty && <div className="absolute inset-0 bg-slate-950/30" />}
                          <span className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-xl bg-white/95 dark:bg-slate-900/90 text-[10px] font-bold text-[#0785BC] dark:text-sky-300 shadow-xs border border-white/40 dark:border-slate-700">
                            Per Item
                          </span>
                          {empty ? (
                            <span className="absolute top-2.5 right-2.5 rounded-full bg-rose-600 px-2.5 py-1 text-[10px] font-extrabold text-white shadow-sm">
                              {tr("common.stock_out", "Stok Habis")}
                            </span>
                          ) : (
                            <span className="absolute top-2.5 right-2.5 rounded-full bg-emerald-500 px-2.5 py-1 text-[10px] font-extrabold text-white shadow-sm">
                              {it.stock} {tr("common.available", "Tersedia")}
                            </span>
                          )}
                        </div>

                        <div className="p-4 sm:p-5 flex flex-1 flex-col">
                          <p className="text-[10px] uppercase font-bold tracking-[0.08em] text-[#0785BC] truncate">
                            {selectedCatalog.name}
                          </p>
                          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white mt-1 leading-snug line-clamp-1 group-hover:text-[#0785BC] transition-colors">
                            {it.name}
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed line-clamp-2 min-h-[2rem] flex-1">
                            {it.description}
                          </p>
                          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <span
                              className={`text-[11px] font-bold ${
                                empty ? "text-rose-600" : "text-emerald-600 dark:text-emerald-400"
                              }`}
                            >
                              {empty ? "Habis / Dipinjam" : `Stok: ${it.stock} Unit`}
                            </span>
                          </div>

                          {empty ? (
                            <span className="mt-3 w-full inline-flex items-center justify-center gap-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 text-xs font-bold py-2.5 cursor-not-allowed">
                              {tr("common.stock_out", "Stok Habis")}
                            </span>
                          ) : (
                            <Link
                              href={`/user/item_catalog/${it.id}`}
                              className="mt-3 w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#0785BC] hover:bg-[#0672a0] text-white text-xs font-bold py-2.5 shadow-sm shadow-[#0785BC]/25 transition-all active:scale-98"
                            >
                              <span>{tr("catalog.borrow_item_btn", "Pinjam Barang")}</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </Link>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            ) : detailPackages.length === 0 ? (
              <div className="bg-white dark:bg-[#111c30] rounded-3xl border border-slate-200/80 dark:border-slate-800 p-12 text-center text-sm text-slate-400">
                <Layers className="w-10 h-10 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                <p className="font-bold text-slate-600 dark:text-slate-300">
                  {tr("catalog.empty_packages", "Tidak ada paket barang dalam kategori ini.")}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-stretch">
                {detailPackages.map((pkg: any) => {
                  const isi = (pkg.packages_items || [])
                    .map((r: any) => r.items?.name)
                    .filter(Boolean)
                    .join(", ");
                  const empty = isPackageEmptyStock(pkg);
                  return (
                    <div
                      key={pkg.id}
                      className={`group bg-white dark:bg-[#111c30] rounded-3xl border overflow-hidden transition-all duration-300 flex flex-col ${
                        empty
                          ? "border-rose-200/80 dark:border-rose-900/50 shadow-xs"
                          : "border-slate-200/80 dark:border-slate-800 shadow-[0_4px_16px_-4px_rgba(15,23,42,0.05)] hover:shadow-[0_12px_28px_-8px_rgba(124,58,237,0.2)] hover:-translate-y-1 hover:border-violet-500/30"
                      }`}
                    >
                      <div className="relative h-[160px] bg-slate-100 dark:bg-slate-900 overflow-hidden flex items-center justify-center shrink-0">
                        {pkg.image_url ? (
                          <img
                            src={pkg.image_url}
                            alt={pkg.name}
                            className={`w-full h-full object-cover transition-transform duration-300 ${
                              empty ? "grayscale opacity-60" : "group-hover:scale-105"
                            }`}
                          />
                        ) : (
                          <Layers className="w-10 h-10 text-slate-300 stroke-[1.2]" />
                        )}
                        {empty && <div className="absolute inset-0 bg-slate-950/30" />}
                        <span className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-xl bg-white/95 dark:bg-slate-900/90 text-[10px] font-bold text-violet-600 dark:text-violet-400 shadow-xs border border-white/40 dark:border-slate-700">
                          Paket Bundling
                        </span>
                        {empty ? (
                          <span className="absolute top-2.5 right-2.5 rounded-full bg-rose-600 px-2.5 py-1 text-[10px] font-extrabold text-white shadow-sm">
                            Sebagian Habis
                          </span>
                        ) : (
                          <span className="absolute top-2.5 right-2.5 rounded-full bg-emerald-500 px-2.5 py-1 text-[10px] font-extrabold text-white shadow-sm">
                            Paket Lengkap
                          </span>
                        )}
                      </div>

                      <div className="p-4 sm:p-5 flex flex-1 flex-col">
                        <p className="text-[10px] uppercase font-bold tracking-[0.08em] text-violet-600">
                          {selectedCatalog.name}
                        </p>
                        <h3 className="text-sm font-extrabold text-slate-900 dark:text-white mt-1 leading-snug line-clamp-1 group-hover:text-violet-600 transition-colors">
                          {pkg.name}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed line-clamp-2 min-h-[2rem] flex-1">
                          {isi
                            ? `Komponen: ${isi}`
                            : pkg.description || "Paket fasilitas sarpras kampus."}
                        </p>

                        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                          <span className="text-[11px] font-bold text-violet-600 dark:text-violet-400">
                            {(pkg.packages_items || []).length} Item Termasuk
                          </span>
                        </div>

                        {empty ? (
                          <span className="mt-3 w-full inline-flex items-center justify-center gap-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 text-xs font-bold py-2.5 cursor-not-allowed">
                            Paket Tidak Tersedia
                          </span>
                        ) : (
                          <Link
                            href={`/user/item_catalog/package/${pkg.id}`}
                            className="mt-3 w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-[#0785BC] hover:from-violet-700 hover:to-[#0672a0] text-white text-xs font-bold py-2.5 shadow-sm shadow-violet-500/25 transition-all active:scale-98 cursor-pointer"
                          >
                            <span>Ajukan Pinjam Paket</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </UserLayout>
  );
}
