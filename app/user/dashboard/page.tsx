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
} from "lucide-react";
import api from "@/lib/api";
import UserSidebar from "@/components/user/Sidebar";
import UserNavbar from "@/components/user/Navbar";

// ── Types ──
interface BorrowingStatus {
  id: string;
  item_name: string;
  requester: string;
  department: string;
  status: "approved" | "pending" | "active" | "rejected";
  icon: React.ElementType;
}

function useMount() {
  const [m, setM] = useState(false);
  useEffect(() => { setM(true); }, []);
  return m;
}

// ── Status pill ──
function StatusPill({ status }: { status: BorrowingStatus["status"] }) {
  const map: Record<string, string> = {
    approved: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    pending:  "bg-red-50   text-red-500   border border-red-200",
    active:   "bg-blue-50  text-blue-600  border border-blue-200",
    rejected: "bg-slate-100 text-slate-500 border border-slate-200",
  };
  const label: Record<string, string> = {
    approved: "Approved", pending: "Pending", active: "Active", rejected: "Rejected",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${map[status]}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${
        status === "approved" ? "bg-emerald-500" :
        status === "pending"  ? "bg-red-400" :
        status === "active"   ? "bg-blue-500" : "bg-slate-400"
      }`} />
      {label[status]}
    </span>
  );
}

// ── Recent item card ──
function RecentCard({ src, label }: { src: string; label: string }) {
  return (
    <div className="relative rounded-2xl overflow-hidden flex-1 aspect-[3/4] bg-slate-200 group cursor-pointer">
      <Image src={src} alt={label} fill className="object-cover group-hover:scale-105 transition-transform duration-300" sizes="50vw" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
      <p className="absolute bottom-3 left-3 text-white text-xs font-semibold leading-tight">{label}</p>
    </div>
  );
}

// ── Mock data ──
const mockBorrowings: BorrowingStatus[] = [
  { id: "1", item_name: "MacBook Pro M2",    requester: "Sarah J.", department: "IT Dept",  status: "approved", icon: Laptop },
  { id: "2", item_name: "Sony A7IV Camera",  requester: "Mark D.",  department: "Media",    status: "pending",  icon: Camera },
  { id: "3", item_name: "Epson L3150 Printer",requester: "Budi S.", department: "HR Dept",  status: "active",   icon: Printer },
];

const recentItems = [
  { src: "https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?auto=format&fit=crop&w=400&q=80", label: "Ergo Chair V2" },
  { src: "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=400&q=80", label: "4K Projector"  },
];

export default function UserDashboardPage() {
  const [borrowings, setBorrowings] = useState<BorrowingStatus[]>([]);
  const [stats, setStats]           = useState({ total: 34, pending: 34, rejected: 34 });
  const [loading, setLoading]       = useState(true);
  const mounted = useMount();

  // Get current hour for greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const res = await api.borrowings.getAll({ limit: 10 });
        if (res.status === "success" && res.data && (res.data as any[]).length > 0) {
          setBorrowings(res.data as any);
          return;
        }
      } catch { /* silent */ }
      setBorrowings(mockBorrowings);
      setLoading(false);
    }
    fetchData();
    setLoading(false);
  }, []);

  const statCards = [
    { label: "Total Peminjaman",       value: stats.total,    color: "text-slate-900" },
    { label: "Menunggu Persetujuan",   value: stats.pending,  color: "text-slate-900" },
    { label: "Ditolak",                value: stats.rejected, color: "text-slate-900" },
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
          <div className="p-8 space-y-6 max-w-5xl">
            {/* ── Hero greeting ── */}
            <div
              className={`rounded-2xl bg-gradient-to-br from-[#dbeeff] via-[#e8f4ff] to-[#f0f8ff] px-8 py-8 ${mounted ? "animate-fade-up" : "opacity-0"}`}
            >
              <h1 className="text-3xl font-bold text-slate-900">
                {greeting}, <span className="text-[#0785BC]">POKADA.</span>
              </h1>
              <p className="text-slate-500 mt-1.5 text-sm">What assets do you need today?</p>
            </div>

            {/* ── Stat Cards ── */}
            <div className="grid grid-cols-3 gap-4">
              {statCards.map((s, i) => (
                <div
                  key={s.label}
                  style={{ animationDelay: `${i * 75}ms` }}
                  className={`bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center justify-between hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 ${mounted ? "animate-fade-up" : "opacity-0"}`}
                >
                  <div>
                    <p className="text-sm text-slate-500 font-medium mb-1">{s.label}</p>
                    <p className={`text-3xl font-bold tabular-nums ${s.color} ${mounted ? "animate-count-up" : ""}`}>
                      {s.value}
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
                    <ClipboardList className="w-5 h-5 text-orange-400" />
                  </div>
                </div>
              ))}
            </div>

            {/* ── Status + Right Column ── */}
            <div className={`grid grid-cols-3 gap-5 items-stretch ${mounted ? "animate-fade-up delay-200" : "opacity-0"}`}>
              {/* Status Peminjaman */}
              <div className="col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col">
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                  <h2 className="text-base font-bold text-slate-900">Status Peminjaman</h2>
                  <Link href="/user/riwayat_peminjaman" className="text-xs font-semibold text-[#0785BC] hover:underline">
                    View All
                  </Link>
                </div>

                <ul className="divide-y divide-slate-50 flex-1">
                  {loading
                    ? Array.from({ length: 3 }).map((_, i) => (
                        <li key={i} className="flex items-center gap-4 px-5 py-4">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 animate-pulse" />
                          <div className="flex-1 space-y-2">
                            <div className="h-3 bg-slate-100 rounded animate-pulse w-1/3" />
                            <div className="h-2.5 bg-slate-100 rounded animate-pulse w-1/4" />
                          </div>
                        </li>
                      ))
                    : borrowings.map((b, i) => {
                        const Icon = b.icon ?? Laptop;
                        return (
                          <li
                            key={b.id}
                            style={{ animationDelay: `${300 + i * 60}ms` }}
                            className={`flex items-center gap-4 px-5 py-4 hover:bg-slate-50/60 transition-colors group ${mounted ? "animate-fade-up" : "opacity-0"}`}
                          >
                            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 group-hover:bg-[#0785BC]/10 transition-colors">
                              <Icon className="w-4 h-4 text-slate-400 group-hover:text-[#0785BC] transition-colors" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-slate-800 truncate">{b.item_name}</p>
                              <p className="text-xs text-slate-400 mt-0.5">
                                Req. by {b.requester} • {b.department}
                              </p>
                            </div>
                            <StatusPill status={b.status} />
                            <button className="p-1 rounded-lg text-slate-300 hover:bg-slate-100 hover:text-slate-500 transition-colors">
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          </li>
                        );
                      })}
                </ul>

                {/* filler agar card kiri memenuhi tinggi kolom kanan */}
                <div className="flex-1" />
              </div>

              {/* Right column: Recent Additions + Quick Actions */}
              <div className="flex flex-col gap-4">
                {/* Recent Additions */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                  <h2 className="text-base font-bold text-slate-900 mb-4">Recent Additions</h2>
                  <div className="flex gap-3 h-44">
                    {recentItems.map((item) => (
                      <RecentCard key={item.label} src={item.src} label={item.label} />
                    ))}
                  </div>
                </div>

                {/* Quick Actions — flex-1 agar mengisi sisa tinggi */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex-1">
                  <h2 className="text-base font-bold text-slate-900 mb-3">Aksi Cepat</h2>
                  <div className="space-y-1">
                    {[
                      { href: "/user/item_catalog",       label: "Browse Catalog",     icon: BookOpen,      color: "bg-blue-50 text-[#0785BC]"     },
                      { href: "/user/riwayat_peminjaman",  label: "Riwayat Saya",       icon: ClipboardList, color: "bg-emerald-50 text-emerald-600" },
                      { href: "/user/messages",            label: "Hubungi Support",    icon: MessageSquare, color: "bg-purple-50 text-purple-600"   },
                      { href: "/user/rekap_laporan",       label: "Laporkan Kerusakan", icon: AlertTriangle, color: "bg-orange-50 text-orange-500"   },
                    ].map(({ href, label, icon: Icon, color }) => (
                      <Link
                        key={href}
                        href={href}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors group"
                      >
                        <div className={`w-7 h-7 rounded-lg ${color} flex items-center justify-center shrink-0`}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900 transition-colors">{label}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-400 group-hover:translate-x-0.5 transition-all ml-auto" />
                      </Link>
                    ))}
                  </div>
                </div>
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
