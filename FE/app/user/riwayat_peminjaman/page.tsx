"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ClipboardList,
  Calendar,
  UserCircle2,
  XCircle,
  CheckCircle2,
  Clock,
} from "lucide-react";
import api from "@/lib/api";
import UserSidebar from "@/components/user/Sidebar";
import UserNavbar from "@/components/user/Navbar";

type TabKey = "semua" | "active" | "returned" | "rejected";

interface Rental {
  id: string;
  item_name: string;
  category?: string;
  image?: string;
  borrow_date: string;
  return_date?: string;
  owner?: string;
  status: "active" | "pending" | "returned" | "rejected";
}

function useMount() {
  const [m, setM] = useState(false);
  useEffect(() => { setM(true); }, []);
  return m;
}

// ── Status badge ──
function StatusBadge({ status }: { status: Rental["status"] }) {
  if (status === "active" || status === "pending")
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500 text-white">
        <span className="w-1.5 h-1.5 rounded-full bg-white" />
        Aktif
      </span>
    );
  if (status === "returned")
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
        <CheckCircle2 className="w-3 h-3" />
        Selesai
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-500 border border-red-200">
      <XCircle className="w-3 h-3" />
      Dibatalkan
    </span>
  );
}

// ── Rental Card ──
function RentalCard({ rental, mounted, delay }: { rental: Rental; mounted: boolean; delay: number }) {
  const dateRange = rental.return_date
    ? `${rental.borrow_date} - ${rental.return_date}`
    : `Rencana: ${rental.borrow_date}`;

  return (
    <div
      style={{ animationDelay: `${delay}ms` }}
      className={`bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex hover:shadow-md transition-all duration-200 ${mounted ? "animate-fade-up" : "opacity-0"}`}
    >
      {/* Image */}
      <div className="relative w-44 shrink-0 bg-slate-100 overflow-hidden">
        {rental.image ? (
          <Image src={rental.image} alt={rental.item_name} fill className="object-cover" sizes="176px" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ClipboardList className="w-8 h-8 text-slate-300" />
          </div>
        )}
        {rental.category && (
          <span className="absolute top-3 left-3 px-2 py-0.5 rounded text-[10px] font-semibold bg-white/90 text-slate-700">
            {rental.category}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 p-5 flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-3 mb-3">
            <h3 className="text-base font-bold text-slate-900 leading-snug">{rental.item_name}</h3>
            <StatusBadge status={rental.status} />
          </div>
          <div className="space-y-1.5 text-sm text-slate-500">
            <p className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              {dateRange}
            </p>
            {rental.owner && (
              <p className="flex items-center gap-2">
                <UserCircle2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                Pemilik: {rental.owner}
              </p>
            )}
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-100">
          <Link
            href={`/user/item_catalog/${rental.id}`}
            className="px-4 py-1.5 text-sm font-semibold border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 active:scale-95 transition-all inline-block"
          >
            Detail
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── Mock data ──
const mockRentals: Rental[] = [
  {
    id: "1", item_name: "Kamera DSLR Canon 5D Mark IV", category: "Elektronik",
    image: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=600&q=80",
    borrow_date: "12 Okt 2023", return_date: "15 Okt 2023", owner: "Budi Santoso", status: "active",
  },
  {
    id: "2", item_name: "Bor Listrik Bosch GSB 120-LI",
    image: "https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=600&q=80",
    borrow_date: "01 Sep 2023", return_date: "03 Sep 2023", owner: "Toko Perkakas Jaya", status: "returned",
  },
  {
    id: "3", item_name: "Sepeda Gunung Polygon Xtrada",
    image: "https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=600&q=80",
    borrow_date: "20 Ags 2023", owner: "Andi Sepeda", status: "rejected",
  },
];

const tabs: { key: TabKey; label: string }[] = [
  { key: "semua",    label: "Semua" },
  { key: "active",   label: "Aktif" },
  { key: "returned", label: "Selesai" },
  { key: "rejected", label: "Dibatalkan" },
];

export default function RiwayatPeminjamanPage() {
  const [rentals, setRentals]     = useState<Rental[]>([]);
  const [loading, setLoading]     = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("semua");
  const mounted = useMount();

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const res = await api.borrowings.getAll({ limit: 20 });
      if (res.status === "success" && res.data && (res.data as any[]).length > 0) {
        setRentals(res.data as Rental[]);
      } else {
        setRentals(mockRentals);
      }
      setLoading(false);
    }
    fetchData();
  }, []);

  const filtered = rentals.filter((r) => {
    if (activeTab === "semua")    return true;
    if (activeTab === "active")   return r.status === "active" || r.status === "pending";
    if (activeTab === "returned") return r.status === "returned";
    if (activeTab === "rejected") return r.status === "rejected";
    return true;
  });

  return (
    <div className="flex h-screen overflow-hidden bg-[#eef2f9] text-slate-800">
      {/* ── Sidebar ── */}
      <UserSidebar />

      {/* ── Main ── */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <UserNavbar />
        <div className="flex-1 overflow-y-auto">
          <div className="p-8">
            {/* Page header */}
            <div className={`mb-6 ${mounted ? "animate-fade-up" : "opacity-0"}`}>
              <h1 className="text-2xl font-bold text-slate-900">Riwayat Peminjaman</h1>
              <p className="text-sm text-slate-500 mt-0.5">Kelola dan pantau semua barang yang Anda pinjam.</p>
            </div>

            {/* Tabs */}
            <div className={`flex gap-0 border-b border-slate-200 mb-6 ${mounted ? "animate-fade-up delay-75" : "opacity-0"}`}>
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition-all -mb-px ${
                    activeTab === tab.key
                      ? "border-[#0785BC] text-[#0785BC]"
                      : "border-transparent text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Cards */}
            {loading ? (
              <div className="grid grid-cols-2 gap-5">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white rounded-2xl border border-slate-100 flex overflow-hidden h-40">
                    <div className="w-44 bg-slate-100 animate-pulse shrink-0" />
                    <div className="flex-1 p-5 space-y-3">
                      <div className="h-4 bg-slate-100 rounded animate-pulse w-2/3" />
                      <div className="h-3 bg-slate-100 rounded animate-pulse w-1/2" />
                      <div className="h-3 bg-slate-100 rounded animate-pulse w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-20 text-slate-400 text-sm">
                Tidak ada riwayat peminjaman.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-5">
                {filtered.map((rental, i) => (
                  <RentalCard key={rental.id} rental={rental} mounted={mounted} delay={100 + i * 75} />
                ))}
              </div>
            )}
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
