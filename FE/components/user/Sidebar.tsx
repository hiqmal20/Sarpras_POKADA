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
import { getSocket } from "@/lib/socket";
import { useLanguage } from "@/lib/i18n";

interface NavItem {
  href: string;
  labelKey: string;
  fallback: string;
  icon: any;
  isMessages?: boolean;
  matchPrefix?: boolean;
}

interface NavGroup {
  titleKey: string;
  fallback: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    titleKey: "side.main",
    fallback: "Menu Utama",
    items: [
      { href: "/user/dashboard", labelKey: "nav.dashboard", fallback: "Dashboard", icon: LayoutDashboard },
      { href: "/user/messages", labelKey: "nav.messages", fallback: "Pesan Admin", icon: MessageSquare, isMessages: true },
    ],
  },
  {
    titleKey: "side.borrow",
    fallback: "Pinjam & Kembali",
    items: [
      { href: "/user/item_catalog", labelKey: "nav.catalog", fallback: "Kategori Barang", icon: PackageSearch, matchPrefix: true },
      { href: "/user/peminjaman", labelKey: "nav.borrow", fallback: "Peminjaman", icon: ClipboardList, matchPrefix: true },
      { href: "/user/pengembalian", labelKey: "nav.return", fallback: "Pengembalian", icon: PackageCheck },
    ],
  },
  {
    titleKey: "side.history",
    fallback: "Riwayat & Laporan",
    items: [
      { href: "/user/riwayat_peminjaman", labelKey: "nav.history", fallback: "Riwayat Peminjaman", icon: History },
      { href: "/user/laporan_kerusakan", labelKey: "nav.damage", fallback: "Laporan Kerusakan", icon: AlertTriangle },
    ],
  },
  {
    titleKey: "side.account",
    fallback: "Akun Saya",
    items: [
      { href: "/user/profile", labelKey: "nav.profile", fallback: "Profil Saya", icon: UserRound },
    ],
  },
];

interface UserSidebarProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onToggle?: (collapsed: boolean) => void;
  onNavigate?: () => void;
}

export default function UserSidebar({
  collapsed: controlledCollapsed,
  onToggleCollapse,
  onToggle,
  onNavigate,
}: UserSidebarProps) {
  const pathname = usePathname();
  const { t, lang } = useLanguage();
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
          const count = res.data.reduce((total: number, c: any) => total + (c.unread_count || 0), 0);
          setUnreadMsgCount(count);
        } else {
          setUnreadMsgCount(0);
        }
      } catch {
        setUnreadMsgCount(0);
      }
    }
    loadChatCount();

    const handleMessagesRead = () => {
      loadChatCount();
    };
    window.addEventListener("messages-read", handleMessagesRead);

    const interval = setInterval(loadChatCount, 30000);

    const socket = getSocket();
    if (socket) {
      socket.on("notification", loadChatCount);
      socket.on("chat_updated", loadChatCount);
      socket.on("new_message", loadChatCount);
      socket.on("messages_read", loadChatCount);
    }

    return () => {
      clearInterval(interval);
      window.removeEventListener("user-updated", syncUser);
      window.removeEventListener("storage", syncUser);
      window.removeEventListener("messages-read", handleMessagesRead);
      if (socket) {
        socket.off("notification", loadChatCount);
        socket.off("chat_updated", loadChatCount);
        socket.off("new_message", loadChatCount);
        socket.off("messages_read", loadChatCount);
      }
    };
  }, []);

  const displayName = currentUser?.name || currentUser?.full_name || "User Sarpras";
  const userRole =
    currentUser?.role === "Admin"
      ? (lang === "en" ? "Administrator" : "Administrator")
      : currentUser?.role === "Petugas"
        ? (lang === "en" ? "Staff" : "Petugas")
        : currentUser?.role || (lang === "en" ? "Borrower" : "Peminjam");
  const initials =
    displayName
      .split(" ")
      .filter(Boolean)
      .map((w: string) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "U";

  const labelOf = (key: string, fallback: string) => {
    const v = t(key);
    return v === key ? fallback : v;
  };

  return (
    <aside
      className={`bg-white dark:bg-[#111c30] border-r border-slate-200 dark:border-slate-800 flex flex-col h-screen h-dvh sticky top-0 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] z-30 shrink-0 select-none ${
        collapsed ? "w-20" : "w-64"
      }`}
    >
      <div className="h-16 px-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-[#111c30]">
        {!collapsed ? (
          <div className="flex items-center gap-2.5 min-w-0 pr-1">
            <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 shadow-2xs shrink-0 bg-white">
              <img
                src="/images/pokada.jpg"
                alt="Logo POKADA"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0">
              <h1 className="text-xs font-black tracking-tight text-slate-900 dark:text-white leading-tight truncate">
                SARPRAS<span className="text-[#0785BC] dark:text-sky-300">POKADA</span>
              </h1>
              <p className="text-[10px] text-slate-400 font-medium truncate leading-tight mt-0.5">
                Politeknik Karya Husada
              </p>
            </div>
          </div>
        ) : (
          <div className="mx-auto">
            <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 shadow-2xs bg-white">
              <img
                src="/images/pokada.jpg"
                alt="Logo POKADA"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        )}

        <button
          onClick={handleToggle}
          className={`p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${
            collapsed ? "hidden" : "block"
          }`}
          title={labelOf("nav.collapse", lang === "en" ? "Collapse Sidebar" : "Kecilkan Sidebar")}
        >
          <PanelLeftClose className="w-4 h-4" />
        </button>
      </div>

      {collapsed && (
        <div className="pt-2 px-3 pb-1 flex justify-center">
          <button
            onClick={handleToggle}
            className="p-1.5 rounded-lg text-slate-400 hover:text-[#0785BC] hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            title={labelOf("nav.expand", lang === "en" ? "Expand Sidebar" : "Perluas Sidebar")}
          >
            <PanelLeft className="w-4 h-4 text-[#0785BC] dark:text-sky-300" />
          </button>
        </div>
      )}

      <nav className="flex-1 py-3 px-3 overflow-y-auto space-y-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.titleKey}>
            {!collapsed && (
              <p className="px-2.5 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {labelOf(group.titleKey, group.fallback)}
              </p>
            )}
            <ul className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = item.matchPrefix
                  ? pathname === item.href || pathname.startsWith(item.href + "/")
                  : pathname === item.href;
                const badgeCount = item.isMessages ? unreadMsgCount : 0;
                const label = labelOf(item.labelKey, item.fallback);

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      title={collapsed ? label : undefined}
                      className={`group relative flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 ${
                        collapsed ? "justify-center" : ""
                      } ${
                        isActive
                          ? "bg-[#0785BC] text-white shadow-xs"
                          : "bg-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 shrink-0 transition-colors ${
                          isActive ? "text-white" : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200"
                        }`}
                      />

                      {!collapsed && <span className="truncate flex-1">{label}</span>}

                      {badgeCount > 0 && (
                        <span
                          className={`h-4 min-w-4 px-1 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shrink-0 ${
                            collapsed ? "absolute -top-1 -right-1" : ""
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
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
        <Link
          href="/user/profile"
          onClick={onNavigate}
          className={`flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-white dark:hover:bg-slate-800 hover:shadow-2xs transition-all ${
            collapsed ? "justify-center" : ""
          }`}
          title={collapsed ? displayName : labelOf("nav.open_profile", lang === "en" ? "Open My Profile" : "Buka Profil Saya")}
        >
          <div className="relative shrink-0">
            {currentUser?.foto ? (
              <img
                src={currentUser.foto}
                alt={displayName}
                className="w-8 h-8 rounded-lg object-cover border border-slate-200 dark:border-slate-700"
              />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-[#0785BC] text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                {initials}
              </div>
            )}
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#111c30]" />
          </div>

          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate leading-snug">{displayName}</p>
              <p className="text-[10px] text-slate-400 truncate">{userRole}</p>
            </div>
          )}
        </Link>
      </div>
    </aside>
  );
}
