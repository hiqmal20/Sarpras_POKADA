"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import api, { getCurrentUser } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import {
  LayoutDashboard,
  BookOpen,
  MessageSquare,
  User,
  Settings,
  HelpCircle,
  LogOut,
  ClipboardList,
  Menu,
} from "lucide-react";

const navItems = [
  { href: "/user/dashboard",           label: "Dashboard",      icon: LayoutDashboard },
  { href: "/user/item_catalog",        label: "Catalog",        icon: BookOpen },
  { href: "/user/riwayat_peminjaman",  label: "My Rentals",     icon: ClipboardList },
  { href: "/user/messages",            label: "Messages Admin", icon: MessageSquare },
  { href: "/user/profile",             label: "Profile",        icon: User },
];

const navBottom = [
  { href: "/help",   label: "Help Center", icon: HelpCircle },
  { href: "/logout", label: "Logout",      icon: LogOut },
];

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: (collapsed: boolean) => void;
}

export default function UserSidebar({ collapsed: controlledCollapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(controlledCollapsed ?? false);
  const [unreadMsgCount, setUnreadMsgCount] = useState<number>(0);

  // Sync with controlled prop
  useEffect(() => {
    if (controlledCollapsed !== undefined) setCollapsed(controlledCollapsed);
  }, [controlledCollapsed]);

  useEffect(() => {
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

    const socket = getSocket();
    if (socket) {
      socket.on("notification", loadChatCount);
      socket.on("chat_updated", loadChatCount);
      socket.on("messages_read", loadChatCount);
    }

    return () => {
      window.removeEventListener("messages-read", handleMessagesRead);
      if (socket) {
        socket.off("notification", loadChatCount);
        socket.off("chat_updated", loadChatCount);
        socket.off("messages_read", loadChatCount);
      }
    };
  }, []);

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    onToggle?.(next);
  }

  return (
    <aside
      className={`shrink-0 bg-white flex flex-col justify-between sticky top-0 h-screen border-r border-slate-100 transition-all duration-300 ease-in-out ${
        collapsed ? "w-16" : "w-52"
      }`}
    >
      <div className="overflow-hidden">
        {/* Logo + hamburger toggle */}
        <div className={`flex items-center border-b border-slate-100 h-[69px] ${collapsed ? "flex-col justify-center gap-1 px-2 py-2" : "justify-between px-5"}`}>
          {!collapsed && (
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#0785BC] flex items-center justify-center shrink-0">
                <span className="text-white text-xs font-extrabold">S</span>
              </div>
              <span className="text-base font-extrabold text-[#0785BC] tracking-tight whitespace-nowrap">
                SARPRAS
              </span>
            </div>
          )}

          {collapsed && (
            <div className="w-8 h-8 rounded-lg bg-[#0785BC] flex items-center justify-center shrink-0">
              <span className="text-white text-xs font-extrabold">S</span>
            </div>
          )}

          {/* Hamburger */}
          <button
            onClick={toggle}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors shrink-0"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <Menu className="w-4 h-4" />
          </button>
        </div>

        {/* User info */}
        {!collapsed && (
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#0785BC]/20 flex items-center justify-center text-[#0785BC] font-bold text-sm shrink-0">
              P
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-800 truncate">Welcome back</p>
              <p className="text-[11px] text-slate-400 truncate">Verified Member</p>
            </div>
          </div>
        )}

        {collapsed && (
          <div className="flex justify-center py-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-full bg-[#0785BC]/20 flex items-center justify-center text-[#0785BC] font-bold text-sm">
              P
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="px-2 py-3 space-y-0.5">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || pathname.startsWith(href + "/");
            const isMessages = href === "/user/messages";
            const badgeCount = isMessages ? unreadMsgCount : 0;

            return (
              <Link
                key={href}
                href={href}
                title={collapsed ? label : undefined}
                className={`flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-150 relative ${
                  collapsed ? "justify-center px-0 py-2.5" : "px-3 py-2.5"
                } ${
                  isActive
                    ? "text-[#0785BC] font-semibold bg-[#0785BC]/10"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-[#0785BC]" : ""}`} />
                {!collapsed && <span className="truncate">{label}</span>}
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
            );
          })}

          {/* Settings */}
          <div className={`${collapsed ? "" : "pt-2"}`}>
            {!collapsed && (
              <p className="px-3 pb-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider" />
            )}
            <Link
              href="/user/settings"
              title={collapsed ? "Settings" : undefined}
              className={`flex items-center gap-3 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors ${
                collapsed ? "justify-center px-0 py-2.5" : "px-3 py-2.5"
              }`}
            >
              <Settings className="w-4 h-4 shrink-0" />
              {!collapsed && <span>Settings</span>}
            </Link>
          </div>
        </nav>
      </div>

      {/* Bottom: nav + toggle button */}
      <div>
        <div className="px-2 py-3 border-t border-slate-100 space-y-0.5">
          {navBottom.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={`flex items-center gap-3 rounded-xl text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors ${
                collapsed ? "justify-center px-0 py-2.5" : "px-3 py-2.5"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {!collapsed && <span>{label}</span>}
            </Link>
          ))}
        </div>
      </div>
    </aside>
  );
}
