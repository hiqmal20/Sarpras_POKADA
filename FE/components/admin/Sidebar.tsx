"use client";

import { useState, useEffect } from "react";
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
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import api, { getCurrentUser } from "@/lib/api";

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

interface SidebarProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function Sidebar({ collapsed = false, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [unreadMsgCount, setUnreadMsgCount] = useState<number>(1);

  useEffect(() => {
    const syncUser = () => {
      const user = getCurrentUser();
      if (user) setCurrentUser(user);
    };

    syncUser();
    window.addEventListener("user-updated", syncUser);
    window.addEventListener("storage", syncUser);

    async function loadChatCount() {
      try {
        const res = await api.chats.getAll();
        if (res.status === "success" && Array.isArray(res.data)) {
          // Hitung chat yang belum selesai / unread
          const count = res.data.filter((c: any) => c.unread_count > 0 || c.status === "Open").length;
          setUnreadMsgCount(count > 0 ? count : (res.data.length > 0 ? 1 : 0));
        }
      } catch {
        setUnreadMsgCount(1);
      }
    }
    loadChatCount();

    return () => {
      window.removeEventListener("user-updated", syncUser);
      window.removeEventListener("storage", syncUser);
    };
  }, []);

  const displayName = currentUser?.name || currentUser?.full_name || "Admin User";
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .map((w: string) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "A";

  return (
    <aside
      className={`bg-white border-r border-slate-100 flex flex-col h-screen sticky top-0 transition-all duration-300 z-30 shrink-0 ${
        collapsed ? "w-20" : "w-64"
      }`}
    >
      {/* Header / Logo */}
      <div className="px-4 py-5 border-b border-slate-100 flex items-center justify-between">
        {!collapsed && (
          <div className="min-w-0 pr-2">
            <h1 className="text-base font-bold text-[#0785BC] truncate tracking-tight">SARPRAS POKADA</h1>
            <p className="text-[10px] text-slate-400 truncate">Internal Lending Platform</p>
          </div>
        )}
        <button
          onClick={onToggleCollapse}
          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-xl transition-colors mx-auto"
          title={collapsed ? "Perluas Sidebar" : "Kecilkan Sidebar"}
        >
          {collapsed ? <PanelLeft className="w-5 h-5 text-[#0785BC]" /> : <PanelLeftClose className="w-5 h-5" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 overflow-y-auto">
        <ul className="space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            const isMessages = item.href === "/admin/messages";
            const badgeCount = isMessages ? unreadMsgCount : 0;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 relative ${
                    collapsed ? "justify-center" : ""
                  } ${
                    isActive
                      ? "bg-[#0785BC] text-white shadow-xs"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                  {badgeCount > 0 && (
                    <span
                      className={`w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shrink-0 ${
                        collapsed ? "absolute -top-1 -right-1" : "ml-auto"
                      }`}
                    >
                      {badgeCount}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer / User Info */}
      <div className="p-3 border-t border-slate-100">
        <div className={`flex items-center gap-3 ${collapsed ? "justify-center" : ""}`}>
          {currentUser?.foto ? (
            <img
              src={currentUser.foto}
              alt={displayName}
              className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-[#0785BC] text-white flex items-center justify-center font-bold text-xs shrink-0">
              {initials}
            </div>
          )}
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-800 truncate">{displayName}</p>
              <p className="text-[10px] text-slate-400 truncate">
                {currentUser?.role === "Admin" ? "Administrator" : "Petugas"}
              </p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
