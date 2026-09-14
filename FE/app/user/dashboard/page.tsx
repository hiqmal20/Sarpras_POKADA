"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  BookOpen,
  MessageSquare,
  MoreVertical,
  Laptop,
  Camera,
  Printer,
  ClipboardList,
  ArrowRight,
  AlertTriangle,
  Package,
  Clock,
  CheckCircle2,
  XCircle,
  TrendingUp,
  ArrowUpRight,
} from "lucide-react";
import api, { getCurrentUser } from "@/lib/api";
import UserSidebar from "@/components/user/Sidebar";
import UserNavbar from "@/components/user/Navbar";

// ── Types ──
interface BorrowingItem {
  id: string;
  borrow_code: string;
  item_name: string;
  purpose: string;
  borrow_date: string;
  status: "approved" | "pending" | "active" | "rejected" | "returned";
  raw_status: string;
}

function useMount() {
  const [m, setM] = useState(false);
  useEffect(() => { setM(true); }, []);
  return m;
}

// ── Modern Status pill ──
function StatusPill({ status }: { status: BorrowingItem["status"] }) {
  if (status === "approved" || status === "active") {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        Dipinjam
      </span>
    );
  }
  if (status === "pending") {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 shadow-2xs">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
        Menunggu
      </span>
    );
  }
  if (status === "returned") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
        <CheckCircle2 className="w-3 h-3 text-slate-500" />
        Selesai
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-600 border border-rose-200">
      <XCircle className="w-3 h-3" />
      Ditolak
    </span>
  );
}

// ── Catalog Preview Card ──
function RecentCard({ src, label, code }: { src: string; label: string; code?: string }) {
  return (
    <Link href="/user/item_catalog" className="relative rounded-2xl overflow-hidden flex-1 aspect-[4/3] bg-slate-200 group cursor-pointer shadow-2xs hover:shadow-md transition-all">
      <Image src={src} alt={label} fill className="object-cover group-hover:scale-105 transition-transform duration-300" sizes="50vw" />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent" />
      <div className="absolute bottom-3 left-3 right-3 text-white">
        {code && <span className="text-[9px] font-mono font-semibold px-1.5 py-0.5 bg-white/20 backdrop-blur-xs rounded mb-1 inline-block">{code}</span>}
        <p className="text-xs font-bold leading-snug line-clamp-1">{label}</p>
      </div>
    </Link>
  );
}

const catalogHighlights = [
  { src: "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=400&q=80", label: "Proyektor LCD Epson", code: "BRG-PRJ-001" },
  { src: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=400&q=80", label: "Kamera DSLR Canon", code: "BRG-CAM-002" },
];

export default function UserDashboardPage() {
  const [borrowings, setBorrowings] = useState<BorrowingItem[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    pending: 0,
    damage: 0,
  });
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const mounted = useMount();

  // Get current hour for greeting
  const hour = new Date().getHours();
  const greeting = hour < 11 ? "Selamat Pagi" : hour < 15 ? "Selamat Siang" : hour < 18 ? "Selamat Sore" : "Selamat Malam";

  useEffect(() => {
    const user = getCurrentUser();
    if (user) setCurrentUser(user);

    async function fetchData() {
      setLoading(true);
      try {
        const [borrowRes, damageRes] = await Promise.all([
          api.borrowings.getAll({ limit: 50 }),
          api.damageReports.getAll({ limit: 50 }),
        ]);

        if (borrowRes.status === "success" && Array.isArray(borrowRes.data)) {
          const list: BorrowingItem[] = borrowRes.data.map((b: any) => {
            const rawStatus = (b.status || "").toLowerCase();
            let st: BorrowingItem["status"] = "pending";
            if (rawStatus.includes("dipinjam") || rawStatus === "active" || rawStatus.includes("setuju")) {
              st = "active";
            } else if (rawStatus.includes("kembali") || rawStatus.includes("selesai") || rawStatus === "returned") {
              st = "returned";
            } else if (rawStatus.includes("tolak") || rawStatus === "rejected") {
              st = "rejected";
            }

            const firstItem = b.borrowings_items?.[0]?.items || {};

            return {
              id: b.id,
              borrow_code: b.borrow_code || `PJ-${String(b.id).substring(0, 6)}`,
              item_name: firstItem.name || b.purpose || "Peminjaman Inventaris",
              purpose: b.purpose || "Keperluan operasional kampus",
              borrow_date: b.borrow_date
                ? new Date(b.borrow_date).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })
                : "-",
              status: st,
              raw_status: b.status || "Pending",
            };
          });

          setBorrowings(list.slice(0, 5));

          const activeCount = list.filter((b) => b.status === "active").length;
          const pendingCount = list.filter((b) => b.status === "pending").length;
          const damageCount = damageRes.status === "success" && Array.isArray(damageRes.data) ? damageRes.data.length : 0;

          setStats({
            total: list.length,
            active: activeCount,
            pending: pendingCount,
            damage: damageCount,
          });
        }
      } catch (err) {
        console.warn("Gagal memuat dashboard user:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const statCards = [
    {
      label: "Total Peminjaman",
      badge: "Riwayat Anda",
      badgeColor: "bg-blue-50 text-blue-700 border-blue-100",
      value: stats.total,
      sub: "Total permohonan diajukan",
      link: "/user/riwayat_peminjaman",
      icon: <ClipboardList className="w-5 h-5 text-[#0785BC]" />,
      bg: "bg-blue-500/10 border-blue-500/20 text-[#0785BC]",
    },
    {
      label: "Sedang Dipinjam",
      badge: "Aset Aktif",
      badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-100",
      value: stats.active,
      sub: "Barang siap digunakan",
      link: "/user/riwayat_peminjaman",
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-600" />,
      bg: "bg-emerald-500/10 border-emerald-500/20 text-emerald-600",
    },
    {
      label: "Menunggu Persetujuan",
      badge: "Dalam Review",
      badgeColor: "bg-amber-50 text-amber-700 border-amber-100",
      value: stats.pending,
      sub: "Menunggu approval admin",
      link: "/user/riwayat_peminjaman",
      icon: <Clock className="w-5 h-5 text-amber-600" />,
      bg: "bg-amber-500/10 border-amber-500/20 text-amber-600",
    },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-[#eef2f9] text-slate-800">
      {/* ── Sidebar ── */}
      <UserSidebar />

      {/* ── Main ── */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <UserNavbar />

        <div className="flex-1 overflow-y-auto">
          <div className="p-8 space-y-6 max-w-6xl mx-auto">
            {/* ── Modern Hero greeting ── */}
            <div
              className={`rounded-3xl bg-gradient-to-r from-[#0785BC] via-[#056f9e] to-[#045c82] px-8 py-7 text-white shadow-md relative overflow-hidden ${
                mounted ? "animate-fade-up" : "opacity-0"
              }`}
            >
              <div className="relative z-10">
                <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-white/20 backdrop-blur-xs border border-white/20 inline-block mb-2">
                  Portal Mahasiswa & Civitas POKADA
                </span>
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                  {greeting}, {currentUser?.name || "Civitas Kampus"}!
                </h1>
                <p className="text-blue-100 text-xs md:text-sm mt-1 max-w-xl">
                  Akses inventaris sarana dan prasarana kampus dengan cepat, transparan, dan terintegrasi secara real-time.
                </p>

                <div className="flex items-center gap-3 mt-4">
                  <Link
                    href="/user/item_catalog"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white text-[#0785BC] text-xs font-bold rounded-xl shadow-xs hover:bg-blue-50 active:scale-95 transition-all"
                  >
                    <BookOpen className="w-4 h-4" />
                    Cari & Pinjam Barang
                  </Link>
                  <Link
                    href="/user/riwayat_peminjaman"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl border border-white/20 backdrop-blur-xs transition-all"
                  >
                    <ClipboardList className="w-4 h-4" />
                    Cek Status Peminjaman
                  </Link>
                </div>
              </div>

              {/* Decorative circle glow */}
              <div className="absolute right-0 top-0 w-80 h-80 bg-cyan-400/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
            </div>

            {/* ── Stat Cards ── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4.5">
              {statCards.map((card, i) => (
                <Link
                  href={card.link}
                  key={card.label}
                  style={{ animationDelay: `${i * 75}ms` }}
                  className={`group bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:border-slate-200 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between ${
                    mounted ? "animate-fade-up" : "opacity-0"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border mb-2 ${card.badgeColor}`}>
                        {card.badge}
                      </span>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{card.label}</p>
                    </div>
                    <div className={`w-11 h-11 rounded-2xl ${card.bg} border flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
                      {card.icon}
                    </div>
                  </div>

                  <div className="mt-3">
                    <p className="text-3xl font-extrabold text-slate-900 tabular-nums">
                      {loading ? (
                        <span className="inline-block w-16 h-8 bg-slate-100 rounded animate-pulse" />
                      ) : (
                        card.value
                      )}
                    </p>
                    <div className="pt-3 mt-2 border-t border-slate-50 flex items-center justify-between text-xs">
                      <span className="text-[11px] text-slate-400">{card.sub}</span>
                      <ArrowUpRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-[#0785BC] transition-colors" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* ── Content Grid: Status Peminjaman & Quick Actions ── */}
            <div className={`grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch ${mounted ? "animate-fade-up delay-200" : "opacity-0"}`}>
              {/* Status Peminjaman Aktif */}
              <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Status Peminjaman Anda</h2>
                    <p className="text-xs text-slate-400 mt-0.5">Daftar pengajuan terkini dari akun Anda</p>
                  </div>
                  <Link href="/user/riwayat_peminjaman" className="text-xs font-semibold text-[#0785BC] hover:underline flex items-center gap-1">
                    Lihat Semua <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                <div className="flex-1 divide-y divide-slate-50">
                  {loading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-4 px-6 py-4">
                        <div className="w-9 h-9 rounded-xl bg-slate-100 animate-pulse" />
                        <div className="flex-1 space-y-2">
                          <div className="h-3.5 bg-slate-100 rounded animate-pulse w-1/3" />
                          <div className="h-2.5 bg-slate-100 rounded animate-pulse w-1/4" />
                        </div>
                      </div>
                    ))
                  ) : borrowings.length === 0 ? (
                    <div className="p-10 text-center text-slate-400 text-xs">
                      <Package className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                      <p className="font-semibold text-slate-600">Belum ada peminjaman aktif.</p>
                      <Link href="/user/item_catalog" className="text-[#0785BC] underline mt-1 inline-block">
                        Jelajahi katalog barang & mulai pinjam
                      </Link>
                    </div>
                  ) : (
                    borrowings.map((b) => (
                      <div
                        key={b.id}
                        className="flex items-center justify-between gap-4 px-6 py-3.5 hover:bg-slate-50/70 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#0785BC] flex items-center justify-center shrink-0 border border-blue-100">
                            <Package className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 text-xs truncate">{b.item_name}</p>
                            <p className="text-[11px] text-slate-500 truncate mt-0.5">
                              {b.borrow_code} • {b.purpose}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-[11px] text-slate-400 hidden sm:inline-block">
                            {b.borrow_date}
                          </span>
                          <StatusPill status={b.status} />
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="px-6 py-3 bg-slate-50/50 border-t border-slate-50 text-right">
                  <span className="text-[11px] text-slate-400">Pastikan menjaga kondisi fisik barang selama peminjaman.</span>
                </div>
              </div>

              {/* Right column: Rekomendasi + Quick Actions */}
              <div className="flex flex-col gap-5">
                {/* Highlight Katalog */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-base font-bold text-slate-900">Aset Kampus Populer</h2>
                    <Link href="/user/item_catalog" className="text-xs text-[#0785BC] font-semibold hover:underline">
                      Katalog
                    </Link>
                  </div>
                  <div className="flex gap-3">
                    {catalogHighlights.map((item) => (
                      <RecentCard key={item.label} src={item.src} label={item.label} code={item.code} />
                    ))}
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex-1 flex flex-col justify-between">
                  <h2 className="text-base font-bold text-slate-900 mb-2">Aksi Cepat</h2>
                  <div className="space-y-1.5">
                    {[
                      { href: "/user/item_catalog", label: "Cari Barang di Katalog", icon: BookOpen, color: "bg-blue-50 text-[#0785BC]" },
                      { href: "/user/riwayat_peminjaman", label: "Riwayat & Pengembalian", icon: ClipboardList, color: "bg-emerald-50 text-emerald-600" },
                      { href: "/user/messages", label: "Hubungi Petugas (Chat)", icon: MessageSquare, color: "bg-purple-50 text-purple-600" },
                      { href: "/user/riwayat_peminjaman", label: "Laporan Kerusakan & Denda", icon: AlertTriangle, color: "bg-rose-50 text-rose-500" },
                    ].map(({ href, label, icon: Icon, color }) => (
                      <Link
                        key={label}
                        href={href}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors group border border-transparent hover:border-slate-100"
                      >
                        <div className={`w-8 h-8 rounded-xl ${color} flex items-center justify-center shrink-0`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-semibold text-slate-700 group-hover:text-slate-900 transition-colors">
                          {label}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-600 group-hover:translate-x-0.5 transition-all ml-auto" />
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
