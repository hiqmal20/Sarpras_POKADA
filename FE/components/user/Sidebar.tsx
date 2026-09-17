"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  PackageSearch,
  ClipboardList,
  PackageCheck,
  History,
  MessageSquare,
  AlertTriangle,
  UserRound,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import api, { getCurrentUser } from "@/lib/api";

const navItems = [
  { href: "/user/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/user/peminjaman", label: "Katalog Barang", icon: PackageSearch },
  { href: "/user/item_catalog", label: "Peminjaman Saya", icon: ClipboardList },
  { href: "/user/pengembalian", label: "Pengembalian", icon: PackageCheck },
  { href: "/user/laporan_kerusakan", label: "Laporan Kerusakan", icon: AlertTriangle },
  { href: "/user/riwayat_peminjaman", label: "Riwayat Peminjaman", icon: History },
  { href: "/user/messages", label: "Pesan Admin", icon: MessageSquare },
  { href: "/user/profile", label: "Profil Saya", icon: UserRound },
];

interface UserSidebarProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onToggle?: (collapsed: boolean) => void;
}

export default function UserSidebar({
  collapsed: controlledCollapsed,
  onToggleCollapse,
  onToggle,
}: UserSidebarProps) {
  const pathname = usePathname();
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [unreadMsgCount, setUnreadMsgCount] = useState<number>(0);

  const isControlled = controlledCollapsed !== undefined;
  const collapsed = isControlled ? controlledCollapsed : internalCollapsed;

  const handleToggle = () => {
    if (isControlled) {
      onToggleCollapse?.();
      onToggle?.(!controlledCollapsed);
    } else {
      setInternalCollapsed((prev) => !prev);
      onToggle?.(!internalCollapsed);
    }
  };

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
          const count = res.data.filter(
            (c: any) => Boolean(c.unread_count && c.unread_count > 0)
          ).length;
          setUnreadMsgCount(count);
        }
      } catch {
        setUnreadMsgCount(0);
      }
    }

    const handleMessagesRead = () => {
      setUnreadMsgCount(0);
    };

    loadChatCount();
    const interval = setInterval(loadChatCount, 10000);
    window.addEventListener("messages-read", handleMessagesRead);

    return () => {
      clearInterval(interval);
      window.removeEventListener("messages-read", handleMessagesRead);
      window.removeEventListener("user-updated", syncUser);
      window.removeEventListener("storage", syncUser);
    };
  }, []);

  const displayName = currentUser?.name || currentUser?.full_name || "User Sarpras";
  const userRole =
    currentUser?.role === "Admin"
      ? "Administrator"
      : currentUser?.role === "Petugas"
      ? "Petugas"
      : currentUser?.role || "Peminjam";

  const initials =
    displayName
      .split(" ")
      .filter(Boolean)
      .map((w: string) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "U";

  return (
    <aside
className={`hidden md:flex bg-white border-r border-slate-100 flex-col h-screen h-dvh sticky top-0 transition-all duration-300 z-30 shrink-0 ${
         collapsed ? "w-[72px]" : "w-64"
       }`}
    >
      {/* Header / Logo + PanelLeftClose Toggle */}
      <div className={`border-b border-slate-100 flex items-center ${collapsed ? "justify-center px-2 py-3" : "justify-between px-4 py-4"}`}>
        {!collapsed && (
          <div className="flex items-center gap-2.5 min-w-0 pr-2">
            <div className="w-8 h-8 rounded-xl bg-[#0785BC] flex items-center justify-center shrink-0 shadow-sm shadow-[#0785BC]/20">
              <span className="text-white text-xs font-black">S</span>
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-bold text-[#0785BC] whitespace-nowrap tracking-tight leading-none">
                SARPRAS POKADA
              </h1>
              <p className="text-[10px] text-slate-400 truncate mt-1">Lending & Facilities</p>
            </div>
          </div>
        )}

        {/* Panel Left Close / Open toggle button */}
        <button
          onClick={handleToggle}
          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-xl transition-colors mx-auto shrink-0"
          title={collapsed ? "Perluas Sidebar" : "Kecilkan Sidebar"}
          aria-label={collapsed ? "Perluas Sidebar" : "Kecilkan Sidebar"}
        >
          {collapsed ? (
             <PanelLeft className="w-4 h-4 text-[#0785BC]" />
          ) : (
             <PanelLeftClose className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 py-8 px-4 overflow-y-auto">
        <ul className="space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== "/user/dashboard" && pathname.startsWith(item.href + "/"));
            const isMessages = item.href === "/user/messages";
            const badgeCount = isMessages ? unreadMsgCount : 0;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 relative ${
                     collapsed ? "justify-center px-2" : ""

                  } ${
                    isActive
                      ? "bg-[#0785BC] text-white shadow-xs"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 shrink-0 ${
                      isActive ? "text-white" : "text-slate-400"
                    }`}
                  />
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

      {/* User Info Preview (Tanpa Tombol Logout) */}
      <div className="p-6 border-t border-slate-100 bg-slate-50/50">
        {!collapsed ? (
          <Link
            href="/user/profile"
            className="flex items-center gap-2.5 min-w-0 p-1 hover:bg-slate-100/70 rounded-xl transition-all"
            title="Klik untuk membuka profil"
          >
            {currentUser?.foto ? (
              <img
                src={currentUser.foto}
                alt={displayName}
                className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-[#0785BC]/20 text-[#0785BC] font-bold text-xs flex items-center justify-center shrink-0">
                {initials}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-800 truncate leading-tight">
                {displayName}
              </p>
              <p className="text-[10px] text-slate-400 truncate mt-0.5">{userRole}</p>
            </div>
          </Link>
        ) : null}
      </div>
    </aside>
  );
}
