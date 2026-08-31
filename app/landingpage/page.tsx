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
  Tent,
  Building2,
  HelpCircle,
  MapPin,
  Clock,
  Sparkle
} from "lucide-react";

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeNav, setActiveNav] = useState<string>("beranda");
  const [activeTab, setActiveTab] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

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
      const yOffset = -80; // Offset navbar height
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };

  // ScrollSpy with IntersectionObserver for smooth active nav tracking
  useEffect(() => {
    const sections = ["beranda", "cara-kerja", "katalog", "faq"];
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
    { id: "all", label: "Semua Kategori", icon: Layers },
    { id: "camera", label: "Kamera & Foto", icon: Camera },
    { id: "audio", label: "Sound & Audio", icon: Mic },
    { id: "lab", label: "Peralatan Lab", icon: Laptop },
    { id: "outdoor", label: "Outdoor & Event", icon: Tent },
    { id: "room", label: "Ruangan & Aula", icon: Building2 },
  ];

  const featuredItems = [
    {
      id: "1",
      name: "Sony Alpha A7 III + Lensa 28-70mm",
      category: "camera",
      categoryName: "Kamera & Foto",
      stock: 3,
      location: "Lab Multimedia Gedung B",
      image: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=600&q=80",
      status: "Tersedia",
    },
    {
      id: "2",
      name: "Wireless Mic Hollyland Lark M1 (Dual)",
      category: "audio",
      categoryName: "Sound & Audio",
      stock: 5,
      location: "Studio Podcast POKADA",
      image: "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=600&q=80",
      status: "Tersedia",
    },
    {
      id: "3",
      name: "Projector Epson EB-E500 3300 Lumens",
      category: "lab",
      categoryName: "Peralatan Lab",
      stock: 4,
      location: "Ruang Sarpras Utama",
      image: "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=600&q=80",
      status: "Tersedia",
    },
    {
      id: "4",
      name: "Tenda Dome Kapasitas 4 Orang + Matras",
      category: "outdoor",
      categoryName: "Outdoor & Event",
      stock: 6,
      location: "Gudang UKM Pecinta Alam",
      image: "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=600&q=80",
      status: "Tersedia",
    },
    {
      id: "5",
      name: "Bor Listrik Impact Drill Pro 13mm",
      category: "lab",
      categoryName: "Peralatan Lab",
      stock: 2,
      location: "Bengkel Teknik Mesin",
      image: "https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=600&q=80",
      status: "Tersedia",
    },
    {
      id: "6",
      name: "Ruang Diskusi Kolaboratif Smart TV",
      category: "room",
      categoryName: "Ruangan & Aula",
      stock: 2,
      location: "Perpustakaan Lt. 2",
      image: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=600&q=80",
      status: "Tersedia",
    },
  ];

  const filteredItems = featuredItems.filter((item) => {
    const matchCategory = activeTab === "all" || item.category === activeTab;
    const matchSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.categoryName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.location.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  const faqs = [
    {
      q: "Siapa saja yang dapat meminjam sarana & prasarana di POKADA?",
      a: "Seluruh civitas akademika aktif (Mahasiswa, Dosen, dan Staff) yang telah terdaftar dan memverifikasi akun di portal SARPRAS POKADA.",
    },
    {
      q: "Berapa lama batas waktu peminjaman barang?",
      a: "Batas peminjaman standar adalah 1-3 hari kalender dan dapat diperpanjang atas persetujuan petugas sarpras sebelum masa tenggat berakhir.",
    },
    {
      q: "Bagaimana proses pengambilan dan pengembalian barang?",
      a: "Setelah mendapat persetujuan, datang ke lokasi sarpras untuk mengambil barang dan mengembalikannya setelah selesai digunakan.",
    },
    {
      q: "Apa yang terjadi jika barang mengalami kendala atau kerusakan?",
      a: "Peminjam wajib melaporkan kondisi melalui fitur 'Lapor Kerusakan' di sistem. Petugas akan memverifikasi kondisi awal dan riwayat serah terima.",
    },
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-[#0785BC]/20">
      {/* Header / Navigation Bar */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-xs transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <button
              onClick={() => handleScrollTo("beranda")}
              className="flex items-center gap-2.5 flex-shrink-0 group text-left cursor-pointer focus:outline-none"
            >
              <div className="relative w-8 h-8 flex items-center justify-center">
                {/* SVG Exact Brand Logo */}
                <img
                  className="w-8 h-8 transition-transform duration-300 group-hover:scale-105"
                  src="/images/pokada.jpg"
                  alt="Logo POKADA"
                />
              </div>
              <span className="text-xl font-extrabold tracking-tight text-[#0785BC]">
                SARPRAS
              </span>
            </button>

            {/* Center Search Bar (Desktop) */}
            <div className="hidden md:flex flex-1 max-w-md mx-6 lg:mx-10">
              <div className="relative w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 transition-colors group-focus-within:text-[#0785BC]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari barang untuk disewa..."
                  className="w-full pl-11 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-full focus:outline-none focus:ring-2 focus:ring-[#0785BC] focus:bg-white focus:border-transparent transition-all duration-200 text-slate-800 placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Desktop Navigation Links with Smooth Animated Underline */}
            <nav className="hidden md:flex items-center gap-6 lg:gap-8">
              <button
                onClick={() => handleScrollTo("beranda")}
                className={`text-sm font-semibold relative py-2 transition-colors duration-200 cursor-pointer ${
                  activeNav === "beranda" ? "text-[#0785BC]" : "text-slate-600 hover:text-[#0785BC]"
                }`}
              >
                Beranda
                <span
                  className={`absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#0785BC] rounded-full transition-all duration-300 ease-out ${
                    activeNav === "beranda" ? "opacity-100 scale-x-100" : "opacity-0 scale-x-0"
                  }`}
                />
              </button>

              <button
                onClick={() => handleScrollTo("katalog")}
                className={`text-sm font-medium relative py-2 transition-colors duration-200 cursor-pointer ${
                  activeNav === "katalog" ? "text-[#0785BC] font-semibold" : "text-slate-600 hover:text-[#0785BC]"
                }`}
              >
                Jelajahi
                <span
                  className={`absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#0785BC] rounded-full transition-all duration-300 ease-out ${
                    activeNav === "katalog" ? "opacity-100 scale-x-100" : "opacity-0 scale-x-0"
                  }`}
                />
              </button>

              <button
                onClick={() => handleScrollTo("cara-kerja")}
                className={`text-sm font-medium relative py-2 transition-colors duration-200 cursor-pointer ${
                  activeNav === "cara-kerja" ? "text-[#0785BC] font-semibold" : "text-slate-600 hover:text-[#0785BC]"
                }`}
              >
                Cara Kerja
                <span
                  className={`absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#0785BC] rounded-full transition-all duration-300 ease-out ${
                    activeNav === "cara-kerja" ? "opacity-100 scale-x-100" : "opacity-0 scale-x-0"
                  }`}
                />
              </button>

              <Link
                href="/auth/login"
                className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-semibold text-white bg-[#0785BC] hover:bg-[#0672a0] active:bg-[#055d82] rounded-full transition-all duration-200 shadow-sm hover:shadow active:scale-95"
              >
                Daftarkan Barang
              </Link>
            </nav>

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

          {/* Search bar on Mobile */}
          <div className="md:hidden pb-4">
            <div className="relative w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari barang untuk disewa..."
                className="w-full pl-11 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-full focus:outline-none focus:ring-2 focus:ring-[#0785BC] text-slate-800 transition-all duration-200"
              />
            </div>
          </div>
        </div>

        {/* Mobile Dropdown Menu with Smooth Animation */}
        <div
          className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out border-t border-slate-100 bg-white ${
            mobileMenuOpen ? "max-h-80 opacity-100 shadow-xl" : "max-h-0 opacity-0"
          }`}
        >
          <div className="px-4 py-4 space-y-2">
            <button
              onClick={() => handleScrollTo("beranda")}
              className={`w-full text-left px-4 py-2.5 text-sm font-semibold rounded-xl transition-colors ${
                activeNav === "beranda" ? "bg-[#0785BC]/10 text-[#0785BC]" : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              Beranda
            </button>
            <button
              onClick={() => handleScrollTo("katalog")}
              className={`w-full text-left px-4 py-2.5 text-sm font-medium rounded-xl transition-colors ${
                activeNav === "katalog" ? "bg-[#0785BC]/10 text-[#0785BC]" : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              Jelajahi
            </button>
            <button
              onClick={() => handleScrollTo("cara-kerja")}
              className={`w-full text-left px-4 py-2.5 text-sm font-medium rounded-xl transition-colors ${
                activeNav === "cara-kerja" ? "bg-[#0785BC]/10 text-[#0785BC]" : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              Cara Kerja
            </button>
            <button
              onClick={() => handleScrollTo("faq")}
              className={`w-full text-left px-4 py-2.5 text-sm font-medium rounded-xl transition-colors ${
                activeNav === "faq" ? "bg-[#0785BC]/10 text-[#0785BC]" : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              FAQ
            </button>
            <div className="pt-2">
              <Link
                href="/auth/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full flex items-center justify-center px-4 py-3 text-sm font-bold text-white bg-[#0785BC] hover:bg-[#0672a0] rounded-full shadow-sm"
              >
                Daftarkan Barang
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section id="beranda" className="relative overflow-hidden pt-8 pb-16 lg:pt-16 lg:pb-24 ">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-12 gap-10 lg:gap-12 items-center ">
            {/* Left Text Column */}
            <div className="lg:col-span-6 space-y-6 text-left">
              {/* Pill Badge */}
              

              {/* Main Heading */}
              <h1 className="text-4x1 sm:text-5xl lg:text-[56px] font-black text-slate-900 tracking-tight leading-[1.15] mt-9">
                Smart  <span className="text-[#0785BC]">Sarpras</span>,<br />
                Untuk Smart kampus.
              </h1>

              {/* Subheading */}
              <p className="text-slate-600 text-base sm:text-lg leading-relaxed max-w-xl">
                Digitalisasi pengelolaan sarana dan prasarana untuk menciptakan sistem 
                kampus yang lebih efisien, transparan, dan terorganisir.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-wrap items-center gap-3.5 pt-2">
                <Link
                  href="/auth/login"
                  className="inline-flex items-center justify-center px-7 py-3 text-sm sm:text-base font-semibold text-white bg-[#0785BC] hover:bg-[#0672a0] active:bg-[#055d82] rounded-full transition-all duration-200 shadow-md hover:shadow-lg active:scale-95"
                >
                  Mulai Meminjam
                </Link>
                <button
                  onClick={() => handleScrollTo("cara-kerja")}
                  className="inline-flex items-center justify-center px-7 py-3 text-sm sm:text-base font-semibold text-[#0785BC] bg-white border border-[#0785BC] hover:bg-[#0785BC]/5 rounded-full transition-all duration-200 active:scale-95 cursor-pointer"
                >
                  Pelajari Lebih Lanjut
                </button>
              </div>

              {/* Mini stats */}
              <div className="pt-6 border-t border-slate-100 grid grid-cols-3 gap-4 max-w-lg">
                <div>
                  <p className="text-2xl font-extrabold text-[#0785BC]">500+</p>
                  <p className="text-xs text-slate-500 font-medium">Aset Kampus</p>
                </div>
                <div>
                  <p className="text-2xl font-extrabold text-[#0785BC]">100%</p>
                  <p className="text-xs text-slate-500 font-medium">Terverifikasi</p>
                </div>
                <div>
                  <p className="text-2xl font-extrabold text-[#10B981]">0 Kg</p>
                  <p className="text-xs text-slate-500 font-medium">Emisi Baru</p>
                </div>
              </div>
            </div>

            {/* Right Hero Image Column with Floating Cards */}
            <div className="lg:col-span-6 relative">
              <div className="relative mx-auto max-w-lg lg:max-w-none">
                {/* Main Hero Image Container */}
                <div className="relative rounded-3xl overflow-hidden shadow-2xl aspect-[4/3] sm:aspect-[16/11] bg-slate-100 border border-slate-200/60 transition-transform duration-500 hover:scale-[1.01]">
                  <Image
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1200&q=85"
                    alt="Mahasiswa menggunakan sarpras kampus"
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    priority
                    className="object-cover object-center"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent"></div>
                </div>

                {/* Floating Card 1: Top-Left (Transaksi Aman - Jaminan 100%) */}
                <div className="absolute top-4 left-4 sm:top-6 sm:left-6 bg-white/95 backdrop-blur-md px-4 py-3 rounded-2xl shadow-xl border border-white/60 flex items-center gap-3 transform -rotate-1 hover:rotate-0 transition-all duration-300 hover:shadow-2xl">
                  <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-6 h-6 fill-emerald-600 text-white" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-slate-900 leading-tight">
                      Peminjaman 
                    </p>
                    <p className="text-[11px] text-slate-500 font-medium">Jaminan 100%</p>
                  </div>
                </div>

                {/* Floating Card 2: Bottom-Right (Bor Listrik Pro) */}
                <div className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 bg-white/95 backdrop-blur-md px-4 py-2.5 rounded-2xl shadow-xl border border-white/60 flex items-center gap-3 transform rotate-1 hover:rotate-0 transition-all duration-300 hover:shadow-2xl">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    <Image
                      src="https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=120&q=80"
                      alt="Bor Listrik"
                      width={36}
                      height={36}
                      className="object-cover"
                    />
                  </div>
                  <span className="text-xs sm:text-sm font-bold text-slate-900 pr-1">
                    Bor Listrik Pro
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Cara Kerja Section */}
      <section id="cara-kerja" className="py-16 sm:py-20 lg:py-24 bg-[#fafcff] border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight">
              Cara Kerja SARPRAS POKADA
            </h2>
            <p className="mt-3 text-sm sm:text-base text-slate-600 leading-relaxed">
              Tiga langkah mudah untuk mengakses barang impian Anda. Tanpa ribet, aman, dan
              mendukung gaya hidup berkelanjutan.
            </p>
          </div>

          {/* 3 Step Cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {/* Step 1 */}
            <div className="bg-white rounded-2xl p-8 border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col items-center text-center group">
              <div className="w-16 h-16 rounded-full bg-[#0785BC]/10 text-[#0785BC] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Search className="w-7 h-7 stroke-[2.2]" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-2.5 group-hover:text-[#0785BC] transition-colors">
                1. Temukan Barang
              </h3>
              <p className="text-slate-500 text-sm leading-relaxed">
                Jelajahi ribuan barang berkualitas dari komunitas kami. Gunakan filter cerdas untuk
                menemukan yang tepat.
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-white rounded-2xl p-8 border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col items-center text-center group">
              <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Calendar className="w-7 h-7 stroke-[2.2]" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-2.5 group-hover:text-emerald-600 transition-colors">
                2. Peminjaman Mudah
              </h3>
              <p className="text-slate-500 text-sm leading-relaxed">
                Pilih tanggal pinjam yang diinginkan. Sistem kami akan mengatur jadwal dan
                ketersediaan secara otomatis.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-white rounded-2xl p-8 border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col items-center text-center group sm:col-span-2 lg:col-span-1">
              <div className="w-16 h-16 rounded-full bg-[#0785BC]/10 text-[#0785BC] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <ShieldCheck className="w-7 h-7 stroke-[2.2]" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-2.5 group-hover:text-[#0785BC] transition-colors">
                3. Semua Lebih Teratur
              </h3>
              <p className="text-slate-500 text-sm leading-relaxed">
                Pantau peminjaman, cek status pengajuan, dan 
                lihat riwayat sarpras dengan praktis dalam satu platform.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Katalog Barang Interaktif Section */}
      <section id="katalog" className="py-16 sm:py-20 lg:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold tracking-wider text-[#0785BC] uppercase mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              Katalog Sarana Kampus
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              Pilihan Barang Terpopuler
            </h2>
          </div>
          <p className="text-slate-500 text-sm max-w-md">
            Pilih dan pinjam peralatan praktikum, dokumentasi organisasi, hingga ruangan dengan mudah.
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-8 no-scrollbar">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeTab === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveTab(cat.id)}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                  isActive
                    ? "bg-[#0785BC] text-white shadow-md scale-105"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <Icon className="w-4 h-4" />
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Item Cards Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="group bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col"
            >
              {/* Image Thumbnail */}
              <div className="relative aspect-[16/10] bg-slate-100 overflow-hidden">
                <Image
                  src={item.image}
                  alt={item.name}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <span className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm text-[#0785BC] text-[11px] font-bold px-2.5 py-1 rounded-full shadow-xs">
                  {item.categoryName}
                </span>
                <span className="absolute top-3 right-3 bg-emerald-500 text-white text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                  {item.status}
                </span>
              </div>

              {/* Card Body */}
              <div className="p-5 flex flex-col flex-1 justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-base group-hover:text-[#0785BC] transition-colors line-clamp-1">
                    {item.name}
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span className="line-clamp-1">{item.location}</span>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                  <div className="text-xs">
                    <span className="text-slate-400">Sisa Stok:</span>{" "}
                    <span className="font-bold text-[#0785BC]">{item.stock} Unit</span>
                  </div>
                  <Link
                    href="/auth/login"
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#0785BC] hover:text-[#0672a0] group/btn"
                  >
                    Pinjam Sekarang
                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover/btn:translate-x-0.5" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredItems.length === 0 && (
          <div className="text-center py-16 bg-slate-50 rounded-2xl">
            <p className="text-slate-500 text-sm">Tidak ada barang yang cocok dengan pencarian Anda.</p>
          </div>
        )}
      </section>

      {/* Banner CTA Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="relative rounded-3xl bg-gradient-to-r from-[#0785BC] via-[#0672a0] to-[#0785BC] text-white p-8 sm:p-12 overflow-hidden shadow-xl">
          <div className="relative z-10 max-w-2xl space-y-4">
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              Punya Perlengkapan yang Jarang Terpakai?
            </h2>
            <p className="text-blue-50 text-sm sm:text-base leading-relaxed">
              Daftarkan inventaris UKM, Lab, atau jurusanmu agar bisa dimanfaatkan secara produktif oleh sesama mahasiswa.
            </p>
            <div className="pt-2">
              <Link
                href="/auth/register"
                className="inline-flex items-center justify-center px-6 py-3 text-sm font-bold text-[#0785BC] bg-white hover:bg-slate-50 rounded-full transition-all duration-200 shadow-md active:scale-95"
              >
                Daftarkan Sarpras Sekarang
              </Link>
            </div>
          </div>
          <div className="absolute right-0 bottom-0 top-0 w-1/3 opacity-15 bg-radial from-white to-transparent pointer-events-none"></div>
        </div>
      </section>

      {/* FAQ Section with Smooth CSS Grid Transition */}
      <section id="faq" className="py-16 sm:py-20 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-1 text-xs font-bold text-[#0785BC] uppercase tracking-wider mb-2">
            <HelpCircle className="w-4 h-4" />
            Tanya Jawab
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            Pertanyaan yang Sering Diajukan
          </h2>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                className={`border rounded-2xl bg-white transition-all duration-300 ${
                  isOpen ? "border-[#0785BC]/40 shadow-md" : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <button
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full px-6 py-4 text-left flex items-center justify-between gap-4 font-semibold text-slate-900 text-sm sm:text-base hover:text-[#0785BC] transition-colors cursor-pointer"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-slate-400 transition-transform duration-300 flex-shrink-0 ${
                      isOpen ? "rotate-180 text-[#0785BC]" : ""
                    }`}
                  />
                </button>
                <div
                  className={`grid transition-all duration-300 ease-in-out ${
                    isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className="px-6 pb-5 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                      {faq.a}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Footer (Harmonized Brand Blue #0785BC / #066089) */}
      <footer className="bg-[#0785BC] text-white pt-16 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8 mb-12">
            {/* Col 1 */}
            <div className="space-y-4">
              <h3 className="text-lg font-extrabold tracking-tight text-white">
                SARPRAS POKADA
              </h3>
              <p className="text-blue-50 text-sm leading-relaxed">
                Membangun komunitas untuk masa depan yang lebih berkelanjutan melalui berbagi.
              </p>
              <div className="flex items-start gap-3 text-blue-50 text-sm leading-relaxed">
                <img src="/images/phone (1).png" alt="phone" className="h-10 w-auto mt-0.5" />
                <div className="flex flex-col">
                  <span className="font-semibold text-blue-100">Customer Service</span>
                  <span className="font-bold text-white">+021-2780-1509</span>
                </div>
              </div>

              <div className="mt-10 flex items-start gap-3 text-blue-50 text-sm leading-relaxed">
                <img src="/images/maps-and-flags (1).png" alt="location" className="h-10 w-auto mt-0.5" />
                <div className="flex flex-col">
                  <span className="font-semibold text-blue-100">Gedung Atlanta</span>
                  <span className="text-white">Jl. Margonda Raya No. 28 Kel. Pondok Cina, Kec. Beji, Kota Depok, Jawa Barat 16424</span>
                </div>
              </div>

              <div className="mt-10 flex items-center gap-3 text-blue-50 text-sm leading-relaxed">
                <img src="/images/whatsapp (1).png" alt="whatsapp" className="h-10 w-auto" />
                <span className=" text-blue-100">0821 1376 7144</span>
              </div>

              <div className="mt-10 flex items-center gap-3 text-blue-50 text-sm leading-relaxed">
                <img src="/images/mail (1).png" alt="mail" className="h-10 w-auto" />
                <span className=" text-blue-100">khj@khj.ac.id</span>
              </div>
              <p className="text-blue-100/80 text-xs pt-2">
                © 2026 POKADA.
              </p>
            </div>

            {/* Col 2 */}
            <div className="space-y-5">
              <h4 className="text-base font-extrabold uppercase tracking-[0.12em] text-white">
                Platform
              </h4>
              <ul className="space-y-3 text-sm text-blue-50">
                <li>
                  <button
                    onClick={() => handleScrollTo("katalog")}
                    className="hover:text-white transition-colors cursor-pointer text-left"
                  >
                    Jelajahi Barang
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => handleScrollTo("cara-kerja")}
                    className="hover:text-white transition-colors cursor-pointer text-left"
                  >
                    Cara Menyewa
                  </button>
                </li>
                <li>
                  <Link href="/auth/login" className="hover:text-white transition-colors">
                    Daftarkan Barang
                  </Link>
                </li>
              </ul>
            </div>

            {/* Col 3 */}
            <div className="space-y-5">
              <h4 className="text-base font-extrabold uppercase tracking-[0.12em] text-white">
                Perusahaan
              </h4>
              <ul className="space-y-3 text-sm text-blue-50">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Tentang Kami
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Sustainability Report
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Karier
                  </a>
                </li>
              </ul>
            </div>

            {/* Col 4 */}
            <div className="space-y-5">
              <h4 className="text-base font-extrabold uppercase tracking-[0.12em] text-white">
                Bantuan & Legal
              </h4>
              <ul className="space-y-3 text-sm text-blue-50">
                <li>
                  <button
                    onClick={() => handleScrollTo("faq")}
                    className="hover:text-white transition-colors cursor-pointer text-left"
                  >
                    Pusat Bantuan
                  </button>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Contact Us
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Terms of Service
                  </a>
                </li>
              </ul>
            </div>
          </div> 
        </div>
      </footer>
    </div>
  );
}
