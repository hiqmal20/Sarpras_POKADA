"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  RotateCcw,
  Users,
  AlertTriangle,
  Tag,
  Settings,
  MessageSquare,
  Box,
  Package,
} from "lucide-react";

const navItems = [
  { href: "/admin/dashboard_admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/barang", label: "Barang Per Item", icon: Box },
  { href: "/admin/paket", label: "Paket Barang", icon: Package },
  { href: "/admin/manajemen_peminjaman", label: "Peminjaman", icon: BookOpen },
  { href: "/admin/pengembalian", label: "Pengembalian", icon: RotateCcw },
  { href: "/admin/manajemen_user", label: "Manage User", icon: Users },
  { href: "/admin/rekap_laporan", label: "Laporan Kerusakan", icon: AlertTriangle },
  { href: "/admin/kategori_barang", label: "Kategori Barang", icon: Tag },
  { href: "/admin/messages", label: "Messages", icon: MessageSquare },
  { href: "/admin/settings", label: "Pengaturan", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen sticky top-0">
      {/* Header / Logo */}
      <div className="px-6 py-6 border-b border-gray-100">
        <h1 className="text-lg font-bold text-[#0785BC]">SARPRAS POKADA</h1>
        <p className="text-xs text-gray-400 mt-0.5">Internal Lending Platform</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 overflow-y-auto">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            const isMessages = item.href === "/admin/messages";
            const unreadCount = isMessages ? 3 : 0; // Mock unread count
            
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 relative ${
                    isActive
                      ? "bg-[#0785BC] text-white shadow-sm"
                      : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span>{item.label}</span>
                  {unreadCount > 0 && (
                    <span className="ml-auto w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer / User Info */}
      <div className="px-4 py-4 border-t border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-semibold text-sm flex-shrink-0">
            A
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">Admin User</p>
            <p className="text-xs text-gray-500 truncate">System Administrator</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
