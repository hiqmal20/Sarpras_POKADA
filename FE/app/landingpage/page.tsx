"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Search,
  CheckCircle2,
  Calendar,
  ShieldCheck,
  Menu,
  X,
  ArrowRight,
  Sparkles,
  Layers,
  ChevronDown,
  Camera,
  Laptop,
  Mic,
  Building2,
  HelpCircle,
  MapPin,
  Clock,
  Sparkle,
  Cpu,
  Activity,
  QrCode,
  GraduationCap,
  Stethoscope,
  Database,
  Share2,
  ArrowUpRight,
  FileText,
  Phone,
  Mail,
  MessageSquare,
  ExternalLink,
  Shield,
  Zap,
} from "lucide-react";

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeNav, setActiveNav] = useState<string>("beranda");
  const [activeTab, setActiveTab] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [activeWorkflowStep, setActiveWorkflowStep] = useState<number>(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto-cycle workflow animation every 3.5s like n8n active runner
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveWorkflowStep((prev) => (prev + 1) % 4);
    }, 3500);
    return () => clearInterval(timer);
  }, []);

  // Smooth scroll handler for nav items
  const handleScrollTo = (id: string, e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    setActiveNav(id);
    setMobileMenuOpen(false);

    if (id === "beranda") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const element = document.getElementById(id);
    if (element) {
      const yOffset = -80;
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };

  // ScrollSpy with IntersectionObserver
  useEffect(() => {
    const sections = ["beranda", "alur-kerja", "katalog", "tentang", "faq"];
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 120;

      for (const sectionId of sections) {
        if (sectionId === "beranda" && window.scrollY < 200) {
          setActiveNav("beranda");
          break;
        }
        const el = document.getElementById(sectionId);
        if (el) {
          const top = el.offsetTop - 100;
          const height = el.offsetHeight;
          if (scrollPosition >= top && scrollPosition < top + height) {
            setActiveNav(sectionId);
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const categories = [
    { id: "all", label: "Semua Sarpras", icon: Layers },
    { id: "health", label: "Lab Keperawatan & Medis", icon: Stethoscope },
    { id: "mik", label: "Lab MIK & Komputer", icon: Laptop },
    { id: "multimedia", label: "Studio & Audio Visual", icon: Camera },
    { id: "auditorium", label: "Ruangan & Aula", icon: Building2 },
  ];

  // Data aset sarpras nyata sesuai konteks Politeknik Karya Husada (POKADA - khj.ac.id)
  const featuredItems = [
    {
      id: "1",
      name: "Tensimeter Digital Omron & Doppler Vaskular",
      category: "health",
      categoryName: "Lab Keperawatan & Medis",
      stock: 6,
      location: "Lab Praktikum Keperawatan Lt. 6",
      image: "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=600&q=80",
      status: "Tersedia",
      code: "BRG-MED-001",
      condition: "Sangat Baik",
    },
    {
      id: "2",
      name: "Phantom Manekin Resusitasi CPR & Anatomi",
      category: "health",
      categoryName: "Lab Keperawatan & Medis",
      stock: 4,
      location: "Lab Keperawatan Gawat Darurat",
      image: "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=600&q=80",
      status: "Tersedia",
      code: "BRG-MED-002",
      condition: "Terstandarisasi",
    },
    {
      id: "3",
      name: "Workstation PC Core i7 Lab Health Data Science",
      category: "mik",
      categoryName: "Lab MIK & Komputer",
      stock: 12,
      location: "Lab Komputer SIMRS Gedung Atlanta",
      image: "https://images.unsplash.com/photo-1581092921461-eab62e97a780?auto=format&fit=crop&w=600&q=80",
      status: "Tersedia",
      code: "BRG-MIK-003",
      condition: "Optimal",
    },
    {
      id: "4",
      name: "Wireless Mic Hollyland Lark M1 & Audio Mixer",
      category: "multimedia",
      categoryName: "Studio & Audio Visual",
      stock: 5,
      location: "Studio Podcast & Media POKADA",
      image: "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=600&q=80",
      status: "Tersedia",
      code: "BRG-SND-004",
      condition: "Siap Pakai",
    },
    {
      id: "5",
      name: "Projector Epson EB-E500 3300 Lumens + Screen",
      category: "multimedia",
      categoryName: "Studio & Audio Visual",
      stock: 4,
      location: "Ruang Sarpras Utama Gedung Atlanta",
      image: "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=600&q=80",
      status: "Tersedia",
      code: "BRG-PRJ-005",
      condition: "Prima",
    },
    {
      id: "6",
      name: "Aula Utama & Ruang Seminar Gedung Atlanta",
      category: "auditorium",
      categoryName: "Ruangan & Aula",
      stock: 2,
      location: "Gedung Atlanta Lt. 6 POKADA",
      image: "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=600&q=80",
      status: "Tersedia",
      code: "RNG-AULA-006",
      condition: "Kapasitas 150 Orang",
    },
  ];

  const filteredItems = featuredItems.filter((item) => {
    const matchCategory = activeTab === "all" || item.category === activeTab;
    const matchSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.categoryName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.code.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  // Alur Kerja Interaktif ala n8n AI Workflow Nodes
  const workflowNodes = [
    {
      step: 1,
      tag: "Trigger Node",
      title: "Pilih Sarpras & Jadwal",
      desc: "Mahasiswa / Dosen memilih peralatan praktikum atau ruangan dengan kalender ketersediaan real-time.",
      badge: "Katalog Mandiri",
      icon: GraduationCap,
      color: "from-blue-500 to-[#0785BC]",
      output: "Kode PJ-2026xxxx Terbit",
    },
    {
      step: 2,
      tag: "Verification Engine",
      title: "Validasi Kuota Otomatis",
      desc: "Sistem cerdas memeriksa sisa stok aset fisik, riwayat peminjam, serta jadwal bentrok secara otomatis.",
      badge: "Instant Checking",
      icon: Cpu,
      color: "from-blue-500 to-sky-500",
      output: "Stok Terverifikasi Aman",
    },
    {
      step: 3,
      tag: "Approval Gate",
      title: "Persetujuan Petugas SARPRAS",
      desc: "Admin memverifikasi tujuan peminjaman melalui portal admin satu pintu.",
      badge: "Notifikasi Real-Time",
      icon: ShieldCheck,
      color: "from-[#0785BC] to-teal-500",
      output: "Status: Disetujui",
    },
    {
      step: 4,
      tag: "Execution Node",
      title: "Serah Terima & Digital Return",
      desc: "Peralatan diambil di Gedung Atlanta POKADA, kondisi dicek transparan hingga pengembalian selesai.",
      badge: "Paperless & Rapi",
      icon: CheckCircle2,
      color: "from-emerald-500 to-teal-600",
      output: "Aset Kembali Sempurna",
    },
  ];

  const faqs = [
    {
      q: "Siapa saja yang berhak meminjam sarana & prasarana di POKADA?",
      a: "Seluruh civitas akademika aktif Politeknik Karya Husada (Mahasiswa DIII Keperawatan, STr Kebidanan, Profesi Bidan, STr MIK, serta Dosen & Staff) yang telah terdaftar dengan NIM/NIP valid.",
    },
    {
      q: "Bagaimana jika barang yang ingin dipinjam adalah paket bundling?",
      a: "Sistem SARPRAS POKADA menyediakan fitur 'Paket Bundling' lengkap untuk seminar atau praktikum kelompok. Ketersediaan paket otomatis memvalidasi seluruh unit komponen di dalamnya.",
    },
    {
      q: "Berapa lama batas peminjaman aset praktikum kampus?",
      a: "Peminjaman standar berkisar 1 hingga 3 hari kerja dan dapat diperpanjang atas konfirmasi petugas SARPRAS sebelum batas tanggal kembali tercapai.",
    },
    {
      q: "Di mana lokasi serah terima dan pengambilan sarpras fisik?",
      a: "Seluruh penyerahan aset fisik terpusat di Unit SARPRAS POKADA, Gedung Atlanta Jl. Margonda Raya No. 28, Depok atau di laboratorium terkait sesuai petunjuk notifikasi.",
    },
    {
      q: "Apa yang harus dilakukan jika terjadi kendala atau kerusakan alat?",
      a: "Peminjam dapat langsung memanfaatkan menu 'Lapor Kerusakan' di portal akun. Admin akan segera memverifikasi kondisi awal dan tindak lanjut perbaikan.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#fafcff] text-slate-900 selection:bg-[#0785BC]/20 font-sans antialiased overflow-x-hidden w-full max-w-full">
      {/* â”€â”€ Ambient Background Glow (ChatGPT / AI Aesthetic) â”€â”€ */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden max-w-full">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[320px] sm:w-[600px] lg:w-[900px] h-[300px] sm:h-[500px] bg-gradient-to-b from-[#0785BC]/15 via-sky-300/10 to-transparent blur-3xl rounded-full opacity-70 animate-glow-pulse" />
        <div className="absolute top-[800px] left-0 w-[240px] sm:w-[500px] h-[240px] sm:h-[500px] bg-blue-100/30 blur-3xl rounded-full opacity-50" />
        <div className="absolute top-[1600px] right-0 w-[240px] sm:w-[500px] h-[240px] sm:h-[500px] bg-teal-100/30 blur-3xl rounded-full opacity-40" />
      </div>

      {/* â”€â”€ Top Floating Notification Bar (Live System Status) â”€â”€ */}
      <div className="relative z-50 bg-[#0B132B] text-white py-2 px-3 sm:px-4 text-xs font-medium border-b border-slate-800 overflow-hidden">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 min-w-0">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="flex h-2 w-2 relative shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-slate-300 truncate text-[11px] sm:text-xs">
              Portal Sarpras Resmi <strong className="text-white">POKADA</strong>
              <span className="hidden sm:inline"> - Politeknik Karya Husada</span>
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0 text-[11px] text-slate-400">
            <a
              href="https://khj.ac.id"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors flex items-center gap-1 shrink-0"
            >
              khj.ac.id <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>

      {/* â”€â”€ Main Navigation Bar â”€â”€ */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200/70 shadow-2xs transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-18">
            {/* Logo Brand */}
            <button
              onClick={() => handleScrollTo("beranda")}
              className="flex items-center gap-3 group text-left cursor-pointer focus:outline-none"
            >
              <div className="relative w-9 h-9 rounded-xl overflow-hidden border border-slate-200 shadow-2xs flex items-center justify-center bg-white group-hover:scale-105 transition-transform">
                <img
                  src="/images/pokada.jpg"
                  alt="Logo POKADA"
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-lg font-black tracking-tight text-slate-900 leading-none">
                    SARPRAS<span className="text-[#0785BC]">POKADA</span>
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-medium leading-tight mt-0.5">
                  Politeknik Karya Husada
                </p>
              </div>
            </button>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1 lg:gap-2">
              <button
                onClick={() => handleScrollTo("beranda")}
                className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-all cursor-pointer ${
                  activeNav === "beranda"
                    ? "bg-[#0785BC]/10 text-[#0785BC]"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/60"
                }`}
              >
                Beranda
              </button>
              <button
                onClick={() => handleScrollTo("alur-kerja")}
                className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-all cursor-pointer ${
                  activeNav === "alur-kerja"
                    ? "bg-[#0785BC]/10 text-[#0785BC]"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/60"
                }`}
              >
                Alur Kerja
              </button>
              <button
                onClick={() => handleScrollTo("katalog")}
                className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-all cursor-pointer ${
                  activeNav === "katalog"
                    ? "bg-[#0785BC]/10 text-[#0785BC]"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/60"
                }`}
              >
                Katalog Sarpras
              </button>
              <button
                onClick={() => handleScrollTo("faq")}
                className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-all cursor-pointer ${
                  activeNav === "faq"
                    ? "bg-[#0785BC]/10 text-[#0785BC]"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/60"
                }`}
              >
                Bantuan & FAQ
              </button>
            </nav>

            {/* Right Action CTA */}
            <div className="hidden md:flex items-center gap-2.5">
              <Link
                href="/auth/login"
                className="px-4 py-2 text-xs font-bold text-slate-700 hover:text-[#0785BC] hover:bg-slate-100/70 rounded-full transition-colors"
              >
                Masuk Akun
              </Link>
              <Link
                href="/auth/register"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#0785BC] hover:bg-[#0672a0] active:scale-95 rounded-full transition-all shadow-sm hover:shadow-md"
              >
                Daftar <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Mobile Menu Trigger */}
            <div className="flex md:hidden items-center gap-2">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X className="w-6 h-6 text-[#0785BC]" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-100 bg-white/95 backdrop-blur-xl px-4 py-4 space-y-2 animate-fade-in shadow-xl">
            <button
              onClick={() => handleScrollTo("beranda")}
              className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 rounded-xl hover:bg-slate-50"
            >
              Beranda
            </button>
            <button
              onClick={() => handleScrollTo("alur-kerja")}
              className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 rounded-xl hover:bg-slate-50"
            >
              Alur Kerja
            </button>
            <button
              onClick={() => handleScrollTo("katalog")}
              className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 rounded-xl hover:bg-slate-50"
            >
              Katalog Sarpras
            </button>
            <button
              onClick={() => handleScrollTo("faq")}
              className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 rounded-xl hover:bg-slate-50"
            >
              Bantuan & FAQ
            </button>
            <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
              <Link
                href="/auth/login"
                className="w-full text-center py-2.5 text-xs font-bold text-slate-700 border border-slate-200 rounded-xl"
              >
                Masuk Akun
              </Link>
              <Link
                href="/auth/register"
                className="w-full text-center py-2.5 text-xs font-bold text-white bg-[#0785BC] rounded-xl"
              >
                Daftar
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* â”€â”€ HERO SECTION (ChatGPT & n8n Inspired) â”€â”€ */}
      <section id="beranda" className="relative pt-8 sm:pt-12 pb-14 sm:pb-20 lg:pt-20 lg:pb-28 overflow-hidden w-full">
        {/* Subtle n8n Workflow Background Grid Canvas */}
        <div className="absolute inset-0 bg-workflow-grid opacity-60 pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-10 w-full min-w-0">
          <div className="grid lg:grid-cols-12 gap-8 lg:gap-8 items-center w-full min-w-0">
            {/* Left: Text & Prompt-Style Search */}
            <div className="lg:col-span-6 space-y-5 sm:space-y-6 text-left w-full min-w-0">
              {/* Pill Badge */}
              <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 rounded-full bg-blue-50/80 border border-blue-200/60 shadow-2xs text-[#0785BC] text-[11px] sm:text-xs font-bold max-w-full overflow-hidden">
                <Sparkles className="w-3.5 h-3.5 animate-spin text-[#0785BC] shrink-0" style={{ animationDuration: "6s" }} />
                <span className="truncate">Smart Campus Facilities</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#0785BC] shrink-0" />
                <span className="text-slate-600 font-semibold shrink-0">Gedung Atlanta</span>
              </div>

              {/* Main Headline */}
              <h1 className="text-3xl sm:text-5xl lg:text-[54px] font-black tracking-tight text-slate-900 leading-[1.15] break-words">
                Pengelolaan Sarpras Kampus{" "}
                <span className="bg-gradient-to-r from-[#0785BC] via-[#0785BC] to-teal-600 bg-clip-text text-transparent">
                  Cerdas & Otomatis.
                </span>
              </h1>

              {/* Subheading */}
              <p className="text-slate-600 text-xs sm:text-base leading-relaxed max-w-xl">
                Solusi satu pintu peminjaman sarana prasarana akademik di{" "}
                <strong className="text-slate-800 font-bold">Politeknik Karya Husada (POKADA)</strong>.
                Dari laboratorium keperawatan, data kesehatan, studio multimedia, hingga aula seminar kampus.
              </p>

              {/* ChatGPT Prompt-Style Quick Search Bar */}
              <div className="bg-white p-2 sm:p-2.5 rounded-2xl border border-slate-200/80 shadow-lg shadow-blue-500/5 transition-all focus-within:border-[#0785BC] focus-within:ring-3 focus-within:ring-[#0785BC]/15 max-w-xl w-full">
                <div className="flex items-center gap-1.5 sm:gap-2 px-1 sm:px-2 min-w-0">
                  <Search className="w-4 h-4 text-slate-400 shrink-0" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari alat praktikum, tensimeter, aula..."
                    className="w-full min-w-0 flex-1 text-xs sm:text-sm bg-transparent border-0 focus:outline-none text-slate-800 placeholder:text-slate-400"
                  />
                  <button
                    onClick={() => handleScrollTo("katalog")}
                    className="px-3 sm:px-4 py-2 bg-[#0785BC] hover:bg-[#0672a0] text-white text-xs font-bold rounded-xl transition-all shrink-0 active:scale-95 shadow-xs cursor-pointer"
                  >
                    Temukan
                  </button>
                </div>

                {/* Quick Chips */}
                <div className="flex items-center gap-1.5 flex-wrap pt-2 px-1 sm:px-2 border-t border-slate-100 mt-2 text-[11px] text-slate-400 min-w-0">
                  <span className="font-semibold text-slate-500 shrink-0">Paling Dicari:</span>
                  <button
                    onClick={() => {
                      setSearchQuery("Tensimeter");
                      handleScrollTo("katalog");
                    }}
                    className="px-2 py-0.5 rounded-md bg-[#eef7fc] hover:bg-[#d9effa] hover:text-[#0785BC] text-[#0785BC] transition-colors cursor-pointer"
                  >
                    Tensimeter
                  </button>
                  <button
                    onClick={() => {
                      setSearchQuery("Workstation");
                      handleScrollTo("katalog");
                    }}
                    className="px-2 py-0.5 rounded-md bg-[#eef7fc] hover:bg-[#d9effa] hover:text-[#0785BC] text-[#0785BC] transition-colors cursor-pointer"
                  >
                    Lab MIK
                  </button>
                  <button
                    onClick={() => {
                      setSearchQuery("Projector");
                      handleScrollTo("katalog");
                    }}
                    className="px-2 py-0.5 rounded-md bg-[#eef7fc] hover:bg-[#d9effa] hover:text-[#0785BC] text-[#0785BC] transition-colors cursor-pointer"
                  >
                    Proyektor
                  </button>
                  <button
                    onClick={() => {
                      setSearchQuery("Aula");
                      handleScrollTo("katalog");
                    }}
                    className="px-2 py-0.5 rounded-md bg-[#eef7fc] hover:bg-[#d9effa] hover:text-[#0785BC] text-[#0785BC] transition-colors cursor-pointer"
                  >
                    Ruang Aula
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-2">
                <Link
                  href="/auth/login"
                  className="w-full sm:w-auto px-6 py-3 text-xs sm:text-sm font-bold text-white bg-[#0785BC] hover:bg-[#0672a0] rounded-xl transition-all shadow-md hover:shadow-lg active:scale-95 flex items-center justify-center gap-2 text-center"
                >
                  <Zap className="w-4 h-4 fill-white" />
                  Mulai Ajukan Pinjam
                </Link>
                <button
                  onClick={() => handleScrollTo("alur-kerja")}
                  className="w-full sm:w-auto px-6 py-3 text-xs sm:text-sm font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer text-center"
                >
                  Lihat Cara Kerja
                </button>
              </div>

              {/* Campus Verified Telemetry Stats */}
              <div className="pt-4 grid grid-cols-3 gap-2 sm:gap-4 border-t border-slate-200/70 max-w-lg w-full">
                <div className="min-w-0">
                  <p className="text-lg sm:text-2xl font-black text-[#0785BC] truncate">500+</p>
                  <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium truncate">Aset Kampus</p>
                </div>
                <div className="min-w-0">
                  <p className="text-lg sm:text-2xl font-black text-[#0785BC] truncate">4 Prodi</p>
                  <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium truncate">Terintegrasi</p>
                </div>
                <div className="min-w-0">
                  <p className="text-lg sm:text-2xl font-black text-emerald-600 truncate">100%</p>
                  <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium truncate">Valid & Paperless</p>
                </div>
              </div>
            </div>

            {/* Right: n8n AI Animated Workflow Canvas Visualizer */}
            <div className="lg:col-span-6 relative w-full min-w-0">
              {/* Outer decorative card */}
              <div className="relative rounded-3xl bg-gradient-to-br from-white via-slate-50 to-blue-50/40 p-4 sm:p-6 border border-slate-200/90 shadow-2xl shadow-blue-500/10 backdrop-blur-md w-full min-w-0 overflow-hidden">
                {/* Header of Canvas */}
                <div className="flex items-center justify-between border-b border-slate-200/70 pb-3 mb-4 gap-2">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-400 inline-block" />
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Alur Sistem Aktif
                    </span>
                  </div>
                </div>

                {/* Animated Workflow Flow Canvas */}
                <div className="space-y-3 relative w-full min-w-0">
                  {/* Visual Node Connectors with SVG Animated Flow Line */}
                  <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-slate-200 pointer-events-none hidden sm:block">
                    <div
                      className="w-full bg-[#0785BC] transition-all duration-700"
                      style={{ height: `${(activeWorkflowStep + 1) * 25}%` }}
                    />
                  </div>

                  {workflowNodes.map((node, idx) => {
                    const Icon = node.icon;
                    const isActive = activeWorkflowStep === idx;
                    return (
                      <div
                        key={node.step}
                        onClick={() => setActiveWorkflowStep(idx)}
                        className={`relative p-3 sm:p-4 rounded-2xl border transition-all duration-300 cursor-pointer w-full min-w-0 overflow-hidden ${
                          isActive
                            ? "bg-white border-[#0785BC] ring-2 ring-[#0785BC]/20 shadow-md sm:translate-x-1"
                            : "bg-white/70 border-slate-200/70 hover:bg-white hover:border-slate-300 shadow-2xs"
                        }`}
                      >
                        <div className="flex items-start gap-2.5 sm:gap-3.5 min-w-0">
                          <div
                            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0 font-bold transition-transform ${
                              isActive
                                ? `bg-gradient-to-br ${node.color} text-white shadow-xs scale-105`
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1.5 sm:gap-2">
                              <span className="text-[10px] font-mono font-bold text-[#0785BC] uppercase tracking-wider truncate">
                                {node.tag}
                              </span>
                              <span
                                className={`text-[10px] font-semibold px-2 py-0.5 rounded-md shrink-0 ${
                                  isActive
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : "bg-slate-100 text-slate-500"
                                }`}
                              >
                                {isActive ? "â— Berjalan" : "Siap"}
                              </span>
                            </div>

                            <p className="text-xs font-bold text-slate-900 mt-0.5 truncate">{node.title}</p>
                            <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-relaxed">
                              {node.desc}
                            </p>

                            {isActive && (
                              <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-[#0785BC] font-semibold animate-fade-in gap-2">
                                <span className="truncate">Hasil: {node.output}</span>
                                <span className="flex items-center gap-0.5 shrink-0">
                                  Berikutnya &rarr;
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Floating Interactive Telemetry Card (n8n Live Output preview) */}
                <div className="mt-4 p-3 rounded-2xl bg-[#0B132B] text-white border border-slate-800 shadow-lg flex items-center justify-between gap-2.5 text-xs w-full min-w-0">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className="w-7 h-7 rounded-lg bg-[#0785BC] flex items-center justify-center shrink-0">
                      <QrCode className="w-4 h-4 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-white text-[11px] truncate">
                        Aset Siap: Tensimeter & Manekin CPR
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">
                        Lokasi: Gedung Atlanta POKADA Lt. 6
                      </p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                    Terverifikasi
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* â”€â”€ ALUR KERJA AUTOMATION SECTION (n8n style) â”€â”€ */}
      <section id="alur-kerja" className="py-20 bg-white border-y border-slate-100 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-[#0785BC] mb-3">
              <Cpu className="w-3.5 h-3.5" /> ALUR KERJA TERPADU
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Peminjaman Tanpa Kertas & Antrean
            </h2>
            <p className="text-slate-500 text-sm mt-2 leading-relaxed">
              Didesain khusus untuk efisiensi dosen, mahasiswa, dan staf di lingkungan Politeknik Karya Husada.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-slate-50/70 p-6 rounded-3xl border border-slate-200/70 hover:border-[#0785BC]/50 hover:bg-white hover:shadow-xl transition-all duration-300 group">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#0785BC] border border-blue-100 flex items-center justify-center font-bold text-lg mb-4 group-hover:scale-110 transition-transform">
                <Search className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-mono font-bold text-[#0785BC] uppercase tracking-wider">Langkah 01</span>
              <h3 className="text-base font-bold text-slate-900 mt-1 mb-2">Eksplorasi Sarpras & Stok</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Cari peralatan praktikum keperawatan, komputer lab MIK, proyektor, hingga ruang seminar dengan informasi ketersediaan real-time.
              </p>
            </div>

            <div className="bg-slate-50/70 p-6 rounded-3xl border border-slate-200/70 hover:border-[#0785BC]/50 hover:bg-white hover:shadow-xl transition-all duration-300 group">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center font-bold text-lg mb-4 group-hover:scale-110 transition-transform">
                <Calendar className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-mono font-bold text-blue-600 uppercase tracking-wider">Langkah 02</span>
              <h3 className="text-base font-bold text-slate-900 mt-1 mb-2">Pengajuan Cepat & Approval</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Tentukan tanggal pinjam dan selesai. Petugas SARPRAS akan memvalidasi permohonan melalui sistem dan mengirim notifikasi status.
              </p>
            </div>

            <div className="bg-slate-50/70 p-6 rounded-3xl border border-slate-200/70 hover:border-[#0785BC]/50 hover:bg-white hover:shadow-xl transition-all duration-300 group">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center font-bold text-lg mb-4 group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-mono font-bold text-emerald-600 uppercase tracking-wider">Langkah 03</span>
              <h3 className="text-base font-bold text-slate-900 mt-1 mb-2">Serah Terima & Digital Return</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Ambil peralatan di Gedung Atlanta POKADA dengan bukti transaksi digital. Pengembalian dan kondisi barang dicatat transparan.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* â”€â”€ KATALOG SARANA & PRASARANA KAMPUS â”€â”€ */}
      <section id="katalog" className="py-20 bg-[#fafcff]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-[#0785BC]/10 text-[#0785BC] mb-2">
                <Layers className="w-3.5 h-3.5" /> KATALOG SARANA POKADA
              </div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                Peralatan Praktikum & Fasilitas Kampus
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Fasilitas pendukung DIII Keperawatan, STr Kebidanan, Profesi Bidan, dan STr Manajemen Informasi Kesehatan.
              </p>
            </div>

            <Link
              href="/auth/login"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0785BC] hover:underline self-start md:self-auto"
            >
              Lihat Seluruh Aset di Portal &rarr;
            </Link>
          </div>

          {/* Category Filter Buttons */}
          <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6 scrollbar-none w-full max-w-full">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const isActive = activeTab === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveTab(cat.id)}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                    isActive
                      ? "bg-[#0785BC] text-white shadow-sm scale-102"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* Items Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden flex flex-col hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group"
              >
                {/* Image */}
                <div className="relative aspect-[16/10] bg-slate-100 overflow-hidden">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-3 left-3">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-white/90 backdrop-blur-md text-slate-800 shadow-2xs">
                      {item.categoryName}
                    </span>
                  </div>
                  <div className="absolute top-3 right-3">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500 text-white shadow-2xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      {item.status}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-5 flex flex-col flex-1 justify-between space-y-4">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-[#0785BC] bg-blue-50 px-2 py-0.5 rounded">
                      {item.code}
                    </span>
                    <h3 className="font-bold text-slate-900 text-sm mt-1.5 group-hover:text-[#0785BC] transition-colors leading-snug">
                      {item.name}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{item.location}</span>
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Sisa Stok:</span>
                      <span className="text-xs font-bold text-slate-800">
                        {item.stock} Unit ({item.condition})
                      </span>
                    </div>

                    <Link
                      href="/auth/login"
                      className="px-3.5 py-1.5 text-xs font-bold text-white bg-[#0785BC] hover:bg-[#0672a0] rounded-xl transition-colors shadow-2xs"
                    >
                      Pinjam &rarr;
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* â”€â”€ BENTAR KAMPUS POKADA CTA BANNER â”€â”€ */}
      <section className="py-12 bg-white w-full overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full min-w-0">
          <div className="relative rounded-3xl bg-gradient-to-r from-[#0785BC] via-[#066d9b] to-[#0B132B] p-6 sm:p-12 text-white overflow-hidden shadow-2xl">
            <div className="absolute right-0 top-0 bottom-0 w-1/2 opacity-10 pointer-events-none bg-dot-grid-dark" />
            <div className="relative z-10 max-w-2xl space-y-4">
              <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-white/15 text-white backdrop-blur-md inline-block">
                Civitas Akademika Politeknik Karya Husada
              </span>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-tight">
                Punya Kebutuhan Praktikum atau Acara Kampus?
              </h2>
              <p className="text-blue-100 text-xs sm:text-sm leading-relaxed">
                Manfaatkan inventaris laboratorium resmi, peralatan dokumentasi, hingga aula seminar untuk menunjang prestasi dan kelancaran kegiatan akademik Anda.
              </p>
              <div className="pt-2 flex flex-col sm:flex-row sm:items-center gap-3 w-full">
                <Link
                  href="/auth/login"
                  className="w-full sm:w-auto px-6 py-3 text-xs sm:text-sm font-bold text-[#0785BC] bg-white hover:bg-slate-100 rounded-xl transition-all shadow-md active:scale-95 text-center"
                >
                  Ajukan Sekarang di Portal
                </Link>
                <a
                  href="https://pmbonline.khj.ac.id/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto px-5 py-3 text-xs sm:text-sm font-semibold text-white/90 hover:text-white border border-white/30 hover:border-white rounded-xl transition-all text-center"
                >
                  PMB Online POKADA
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* â”€â”€ FAQ SECTION â”€â”€ */}
      <section id="faq" className="py-20 bg-[#fafcff]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-[#0785BC]/10 text-[#0785BC] mb-2">
              <HelpCircle className="w-3.5 h-3.5" /> PUSAT INFORMASI
            </div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">
              Pertanyaan yang Sering Diajukan
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Panduan seputar aturan dan tata kelola peminjaman sarana prasarana POKADA.
            </p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden transition-colors"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full px-6 py-4 text-left flex items-center justify-between gap-4 font-bold text-xs sm:text-sm text-slate-900 hover:text-[#0785BC] transition-colors cursor-pointer"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 transition-transform duration-300 shrink-0 ${
                        isOpen ? "rotate-180 text-[#0785BC]" : ""
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-4 pt-1 text-xs text-slate-500 leading-relaxed border-t border-slate-100 animate-fade-in">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* â”€â”€ FOOTER (ChatGPT & Claude Style: Clean, Sophisticated, Minimalist) â”€â”€ */}
      <footer className="bg-[#0A0F1D] text-slate-400 pt-16 pb-12 border-t border-slate-800/80 w-full overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full min-w-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-8 pb-14 border-b border-slate-800">
            {/* Col 1: Brand & Campus Bio (Colspan 2) */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center gap-3">
                <img
                  src="/images/pokada.jpg"
                  alt="Logo POKADA"
                  className="w-8 h-8 rounded-lg object-cover border border-slate-700"
                />
                <span className="text-lg font-black tracking-tight text-white">
                  SARPRAS<span className="text-[#0785BC]">POKADA</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
                Sistem Informasi Pengelolaan Sarana dan Prasarana Kampus Politeknik Karya Husada (POKADA).
                Mewujudkan tata kelola fasilitas akademik yang transparan, modern, dan efisien.
              </p>

              {/* Campus Address & Contacts */}
              <div className="space-y-2 pt-2 text-xs text-slate-300">
                <p className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-[#0785BC] shrink-0 mt-0.5" />
                  <span>Gedung Atlanta, Jl. Margonda Raya No. 28, Pondok Cina, Beji, Kota Depok, Jawa Barat 16424</span>
                </p>
                <p className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-[#0785BC] shrink-0" />
                  <span>021-2780-1509 Â· WhatsApp: 0821 1376 7144</span>
                </p>
                <p className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-[#0785BC] shrink-0" />
                  <span>khj@khj.ac.id</span>
                </p>
              </div>
            </div>

            {/* Col 2: Fasilitas & Sarpras */}
            <div className="space-y-3 text-xs">
              <p className="font-bold text-white uppercase tracking-wider text-[11px]">
                Fasilitas Kampus
              </p>
              <ul className="space-y-2">
                <li>
                  <button
                    onClick={() => {
                      setActiveTab("health");
                      handleScrollTo("katalog");
                    }}
                    className="hover:text-white transition-colors cursor-pointer"
                  >
                    Lab Keperawatan & Medis
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => {
                      setActiveTab("mik");
                      handleScrollTo("katalog");
                    }}
                    className="hover:text-white transition-colors cursor-pointer"
                  >
                    Lab MIK & Komputer SIMRS
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => {
                      setActiveTab("multimedia");
                      handleScrollTo("katalog");
                    }}
                    className="hover:text-white transition-colors cursor-pointer"
                  >
                    Studio Podcast & Media
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => {
                      setActiveTab("auditorium");
                      handleScrollTo("katalog");
                    }}
                    className="hover:text-white transition-colors cursor-pointer"
                  >
                    Aula Gedung Atlanta
                  </button>
                </li>
                <li>
                  <Link href="/auth/login" className="hover:text-white transition-colors">
                    Paket Bundling Sarpras
                  </Link>
                </li>
              </ul>
            </div>

            {/* Col 3: Portal Akademik KHJ */}
            <div className="space-y-3 text-xs">
              <p className="font-bold text-white uppercase tracking-wider text-[11px]">
                Portal Akademik KHJ
              </p>
              <ul className="space-y-2">
                <li>
                  <a
                    href="https://portalmhs.khj.ac.id/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white transition-colors inline-flex items-center gap-1"
                  >
                    Portal Mahasiswa <ArrowUpRight className="w-3 h-3" />
                  </a>
                </li>
                <li>
                  <a
                    href="https://portal.khj.ac.id/portaldos/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white transition-colors inline-flex items-center gap-1"
                  >
                    Portal Dosen <ArrowUpRight className="w-3 h-3" />
                  </a>
                </li>
                <li>
                  <a
                    href="https://slims.khj.ac.id/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white transition-colors inline-flex items-center gap-1"
                  >
                    E-Library (SLiMS) <ArrowUpRight className="w-3 h-3" />
                  </a>
                </li>
                <li>
                  <a
                    href="https://lms.khj.ac.id/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white transition-colors inline-flex items-center gap-1"
                  >
                    LMS POKADA <ArrowUpRight className="w-3 h-3" />
                  </a>
                </li>
                <li>
                  <a
                    href="https://pmbonline.khj.ac.id/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white transition-colors inline-flex items-center gap-1"
                  >
                    PMB Online POKADA <ArrowUpRight className="w-3 h-3" />
                  </a>
                </li>
              </ul>
            </div>

            {/* Col 4: Kebijakan & Layanan */}
            <div className="space-y-3 text-xs">
              <p className="font-bold text-white uppercase tracking-wider text-[11px]">
                Kebijakan & Bantuan
              </p>
              <ul className="space-y-2">
                <li>
                  <button onClick={() => handleScrollTo("faq")} className="hover:text-white transition-colors">
                    Pusat Bantuan & FAQ
                  </button>
                </li>
                <li>
                  <button onClick={() => handleScrollTo("alur-kerja")} className="hover:text-white transition-colors">
                    SOP Peminjaman Alat
                  </button>
                </li>
                <li>
                  <Link href="/auth/login" className="hover:text-white transition-colors">
                    Pelaporan Kerusakan
                  </Link>
                </li>
                <li>
                  <a
                    href="https://spmi.khj.ac.id/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white transition-colors inline-flex items-center gap-1"
                  >
                    SPMI POKADA <ArrowUpRight className="w-3 h-3" />
                  </a>
                </li>
                <li>
                  <a
                    href="https://journal.khj.ac.id/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white transition-colors inline-flex items-center gap-1"
                  >
                    Jurnal Ilmiah <ArrowUpRight className="w-3 h-3" />
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Claude / ChatGPT Signature Bottom Bar */}
          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-slate-300 font-medium">
                Seluruh Sistem Sarpras Operasional (Uptime 99.9%)
              </span>
            </div>

            <div className="text-slate-500 text-center sm:text-right">
              <p>Â© 2026 Politeknik Karya Husada (POKADA). All rights reserved.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
