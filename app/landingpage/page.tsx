"use client";

import { useState } from "react";
import { Search, MapPin, Hourglass, Camera, Search as SearchIcon, Calendar, Shield, Menu, X } from "lucide-react";

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white rounded"></div>
              </div>
              <span className="text-lg sm:text-xl font-bold text-gray-900">SARPRAS</span>
            </div>

            {/* Search Bar - Desktop */}
            <div className="hidden lg:flex flex-1 max-w-md mx-8">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Cari barang untuk disewa..."
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-3 lg:gap-6">
              <a href="#" className="text-blue-600 font-medium hover:text-blue-700 text-sm lg:text-base">
                Beranda
              </a>
              <a href="#" className="text-gray-600 hover:text-gray-900 text-sm lg:text-base">
                Jelajahi
              </a>
              <a href="#" className="text-gray-600 hover:text-gray-900 text-sm lg:text-base">
                Cara Kerja
              </a>
              <button className="bg-blue-600 text-white px-3 lg:px-5 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm lg:text-base whitespace-nowrap">
                Daftarkan Barang
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6 text-gray-700" />
              ) : (
                <Menu className="w-6 h-6 text-gray-700" />
              )}
            </button>
          </div>

          {/* Mobile Search Bar */}
          <div className="lg:hidden pb-3">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Cari barang untuk disewa..."
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 bg-white">
            <div className="px-4 py-3 space-y-3">
              <a href="#" className="block text-blue-600 font-medium hover:text-blue-700 py-2">
                Beranda
              </a>
              <a href="#" className="block text-gray-600 hover:text-gray-900 py-2">
                Jelajahi
              </a>
              <a href="#" className="block text-gray-600 hover:text-gray-900 py-2">
                Cara Kerja
              </a>
              <button className="w-full bg-blue-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors">
                Daftarkan Barang
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-20">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Left Column */}
          <div className="space-y-4 sm:space-y-6 order-2 lg:order-1">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium">
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-600 rounded-full"></div>
              <span className="whitespace-nowrap">Ekonomi Sirkular: Masa Depan Lebih Baik.</span>
            </div>

            {/* Heading */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-gray-900 leading-tight">
              Akses Tanpa <span className="text-blue-600">Batas</span>,<br />
              Kurangi Jejak Karbon.
            </h1>

            {/* Description */}
            <p className="text-gray-600 text-base sm:text-lg leading-relaxed">
              Sewa barang berkualitas tinggi dari komunitas terpercaya. 
              Dari kamera pro hingga perlengkapan berkemah, nikmati 
              akses kapan saja tanpa perlu membelinya.
            </p>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-2">
              <button className="w-full sm:w-auto bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm sm:text-base">
                Mulai Meminjam
              </button>
              <button className="w-full sm:w-auto bg-white text-gray-900 px-6 py-3 rounded-lg font-medium border border-gray-300 hover:bg-gray-50 transition-colors text-sm sm:text-base">
                Pelajari Lebih Lanjut
              </button>
            </div>
          </div>

          {/* Right Column */}
          <div className="relative order-1 lg:order-2">
            {/* Main Image Placeholder */}
            <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-gradient-to-br from-blue-100 to-blue-50 aspect-[4/5] max-w-md mx-auto lg:max-w-none">
              <div className="absolute inset-0 flex items-center justify-center">
                <Camera className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 text-blue-300" />
              </div>
              
              {/* Floating Card 1 - Top */}
              <div className="absolute top-4 sm:top-6 lg:top-8 left-4 sm:left-6 lg:left-8 bg-white rounded-lg sm:rounded-xl shadow-lg p-2.5 sm:p-3 lg:p-4 flex items-center gap-2 sm:gap-3 max-w-[calc(100%-2rem)] sm:max-w-none">
                <div className="bg-green-100 p-1.5 sm:p-2 rounded-lg flex-shrink-0">
                  <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-semibold text-gray-900 truncate">Transaksi Aman</p>
                  <p className="text-[10px] sm:text-xs text-gray-500">Jaminan 100%</p>
                </div>
              </div>

              {/* Floating Card 2 - Bottom */}
              <div className="absolute bottom-4 sm:bottom-6 lg:bottom-8 right-4 sm:right-6 lg:right-8 bg-white rounded-lg sm:rounded-xl shadow-lg p-2.5 sm:p-3 lg:p-4 flex items-center gap-2 sm:gap-3 max-w-[calc(100%-2rem)] sm:max-w-none">
                <div className="bg-orange-100 p-1.5 sm:p-2 rounded-lg flex-shrink-0">
                  <Hourglass className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-semibold text-gray-900 truncate">Bor Listrik Pro</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Cara Kerja Section */}
      <section className="bg-gradient-to-b from-white to-gray-50 py-12 sm:py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center mb-8 sm:mb-10 lg:mb-12">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 sm:mb-4 px-4">
              Cara Kerja SARPRAS POKADA
            </h2>
            <p className="text-gray-600 text-sm sm:text-base lg:text-lg max-w-3xl mx-auto px-4 leading-relaxed">
              Tiga langkah mudah untuk mengakses barang impian Anda. Tanpa ribet, aman, dan 
              mendukung gaya hidup berkelanjutan.
            </p>
          </div>

          {/* Cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-6 lg:gap-8">
            {/* Card 1 */}
            <div className="bg-white rounded-xl sm:rounded-2xl p-6 sm:p-7 lg:p-8 shadow-sm hover:shadow-md transition-shadow">
              <div className="bg-blue-50 w-14 h-14 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl flex items-center justify-center mb-4 sm:mb-5 lg:mb-6">
                <SearchIcon className="w-7 h-7 sm:w-8 sm:h-8 text-blue-600" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 sm:mb-3">
                1. Temukan Barang
              </h3>
              <p className="text-gray-600 text-sm sm:text-base leading-relaxed">
                Jelajahi ribuan barang berkualitas tinggi dari berbagai kategori. 
                Gunakan filter cerdas untuk menemukan yang tepat.
              </p>
            </div>

            {/* Card 2 */}
            <div className="bg-white rounded-xl sm:rounded-2xl p-6 sm:p-7 lg:p-8 shadow-sm hover:shadow-md transition-shadow">
              <div className="bg-green-50 w-14 h-14 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl flex items-center justify-center mb-4 sm:mb-5 lg:mb-6">
                <Calendar className="w-7 h-7 sm:w-8 sm:h-8 text-green-600" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 sm:mb-3">
                2. Peminjaman Mudah
              </h3>
              <p className="text-gray-600 text-sm sm:text-base leading-relaxed">
                Pilih tanggal pinjam yang diinginkan, lakukan booking kami 
                akan mengatur jadwal dan keterbukaan secara otomatis.
              </p>
            </div>

            {/* Card 3 */}
            <div className="bg-white rounded-xl sm:rounded-2xl p-6 sm:p-7 lg:p-8 shadow-sm hover:shadow-md transition-shadow sm:col-span-2 lg:col-span-1">
              <div className="bg-blue-50 w-14 h-14 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl flex items-center justify-center mb-4 sm:mb-5 lg:mb-6">
                <Shield className="w-7 h-7 sm:w-8 sm:h-8 text-blue-600" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 sm:mb-3">
                3. Transaksi Aman
              </h3>
              <p className="text-gray-600 text-sm sm:text-base leading-relaxed">
                Bertemu atau gunakan jasa kurir terpercaya. Pembayaran 
                ditahan hingga barang diterima dengan aman.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-blue-900 text-white py-10 sm:py-12 lg:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-6 lg:gap-8 mb-6 sm:mb-8">
            {/* Column 1 - SARPRAS POKADA */}
            <div className="sm:col-span-2 lg:col-span-1">
              <h3 className="text-base sm:text-lg font-bold mb-3 sm:mb-4">SARPRAS POKADA</h3>
              <p className="text-blue-200 text-sm leading-relaxed mb-3 sm:mb-4">
                Membangun komunitas untuk masa depan yang lebih berkelanjutan melalui berbagi.
              </p>
              <p className="text-blue-300 text-xs">
                © 2024 Lendi.onic. Circular economy for a better planet.
              </p>
            </div>

            {/* Column 2 - Platform */}
            <div>
              <h3 className="text-base sm:text-lg font-bold mb-3 sm:mb-4">Platform</h3>
              <ul className="space-y-2 text-blue-200 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Jelajahi Barang</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Cara Menyewa</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Daftarkan Barang</a></li>
              </ul>
            </div>

            {/* Column 3 - Perusahaan */}
            <div>
              <h3 className="text-base sm:text-lg font-bold mb-3 sm:mb-4">Perusahaan</h3>
              <ul className="space-y-2 text-blue-200 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Tentang Kami</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Sustainability Report</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Karir</a></li>
              </ul>
            </div>

            {/* Column 4 - Bantuan & Legal */}
            <div>
              <h3 className="text-base sm:text-lg font-bold mb-3 sm:mb-4">Bantuan & Legal</h3>
              <ul className="space-y-2 text-blue-200 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Pusat Bantuan</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact Us</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
              </ul>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
