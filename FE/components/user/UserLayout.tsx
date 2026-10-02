"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import UserSidebar from "./Sidebar";
import UserNavbar from "./Navbar";
import api, { getAuthToken, getCurrentUser, removeAuthToken } from "@/lib/api";
import { disconnectSocket, getSocket } from "@/lib/socket";
import { useLanguage } from "@/lib/i18n";

interface UserLayoutProps {
  children: React.ReactNode;
  showSearch?: boolean;
  searchValue?: string;
  searchPlaceholder?: string;
  onSearchChange?: (value: string) => void;
  fullWidth?: boolean;
  hideMobileTabs?: boolean;
}

export default function UserLayout({
  children,
  showSearch = true,
  searchValue,
  searchPlaceholder,
  onSearchChange,
  fullWidth = false,
  hideMobileTabs = false,
}: UserLayoutProps) {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { t: tr } = useLanguage();

  // Idle Session Timeout Enforcer (Standar 30 Menit / Mengikuti Pengaturan Admin)
  useEffect(() => {
    if (!authorized) return;
    let timeoutId: any = null;

    const resetIdleTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);

      let minutes = 30;
      try {
        const raw = localStorage.getItem("appSettings");
        if (raw) {
          const parsed = JSON.parse(raw);
          const timeoutVal = parsed.security?.userSessionTimeout || parsed.security?.sessionTimeout;
          if (timeoutVal) {
            minutes = Number(timeoutVal) || 30;
          }
        }
      } catch {}

      const ms = minutes * 60 * 1000;
      timeoutId = setTimeout(async () => {
        try {
          disconnectSocket();
          await api.auth.logout();
        } catch {}
        removeAuthToken();
        localStorage.clear();
        sessionStorage.clear();
        sessionStorage.setItem("logged_out", "true");
        window.location.replace("/auth/login?reason=timeout");
      }, ms);
    };

    const events = ["mousedown", "mousemove", "keydown", "scroll", "touchstart"];
    events.forEach((ev) => window.addEventListener(ev, resetIdleTimer, { passive: true }));
    window.addEventListener("settings-updated", resetIdleTimer);

    resetIdleTimer();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      events.forEach((ev) => window.removeEventListener(ev, resetIdleTimer));
      window.removeEventListener("settings-updated", resetIdleTimer);
    };
  }, [authorized, tr]);

  useEffect(() => {
    let isMounted = true;

    const checkAuth = async () => {
      if (!getCurrentUser() || (typeof window !== "undefined" && sessionStorage.getItem("logged_out") === "true")) {
        setAuthorized(false);
        window.location.replace("/auth/login");
        return;
      }

      try {
        const res = await api.auth.me();
        if (!isMounted) return;
        if (res.status === "success" && res.data?.user) {
          setAuthorized(true);
        } else {
          setAuthorized(false);
          window.location.replace("/auth/login");
        }
      } catch {
        if (!isMounted) return;
        setAuthorized(false);
        window.location.replace("/auth/login");
      }
    };

    checkAuth();

    // Prevent restoring stale authorized state via Chrome Back/Forward Cache (bfcache)
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted || !getCurrentUser() || (typeof window !== "undefined" && sessionStorage.getItem("logged_out") === "true")) {
        setAuthorized(false);
        window.location.replace("/auth/login");
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        if (!getCurrentUser() || (typeof window !== "undefined" && sessionStorage.getItem("logged_out") === "true")) {
          setAuthorized(false);
          window.location.replace("/auth/login");
        }
      }
    };

    window.addEventListener("pageshow", handlePageShow);
    window.addEventListener("focus", handleVisibility);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      isMounted = false;
      window.removeEventListener("pageshow", handlePageShow);
      window.removeEventListener("focus", handleVisibility);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  // Keep the authenticated user's socket alive across every user page.
  // This makes the user presence visible to admin even when the user is
  // currently on dashboard/catalog/settings instead of the chat page.
  useEffect(() => {
    if (!authorized) return;
    const socket = getSocket();
    return () => {
      // Do not disconnect here: the shared socket must survive navigation.
      void socket;
    };
  }, [authorized]);

  if (!authorized) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#eef2f9] dark:bg-[#0b1220]">
        <div className="w-8 h-8 border-4 border-[#0785BC] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-screen h-dvh min-w-0 overflow-hidden bg-[#eef2f9] text-slate-800 dark:bg-[#0b1220] dark:text-slate-100">
      {/* Desktop sidebar */}
      <div className="hidden md:block shrink-0">
        <UserSidebar
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed(!collapsed)}
          onToggle={(next) => setCollapsed(next)}
        />
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-slate-950/50 backdrop-blur-[2px] animate-fade-in"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute left-0 top-0 bottom-0 w-72 max-w-[85vw] animate-slide-in-left">
            <UserSidebar onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <UserNavbar
          showSearch={showSearch}
          searchValue={searchValue}
          searchPlaceholder={searchPlaceholder}
          onSearchChange={onSearchChange}
          onOpenSidebar={() => setMobileOpen(true)}
        />

        <main
          className={`min-w-0 flex-1 overflow-y-auto ${
            fullWidth ? "" : "p-3 sm:p-5 lg:p-8"
          }`}
        >
          {children}
        </main>

        {/* Mobile bottom nav — ala ChatGPT/n8n app feel */}
        {!hideMobileTabs && (
          <nav className="md:hidden shrink-0 border-t border-slate-200/80 bg-white/95 backdrop-blur px-2 py-2 dark:border-slate-800 dark:bg-[#111c30]/95">
            <MobileTabs onOpenMenu={() => setMobileOpen(true)} />
          </nav>
        )}
      </div>
    </div>
  );
}

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  PackageSearch,
  ClipboardList,
  MessageSquare,
  Menu,
} from "lucide-react";

function MobileTabs({ onOpenMenu }: { onOpenMenu: () => void }) {
  const pathname = usePathname();
  const tabs = [
    { href: "/user/dashboard", label: "Home", icon: LayoutDashboard },
    { href: "/user/item_catalog", label: "Katalog", icon: PackageSearch, prefix: true },
    { href: "/user/peminjaman", label: "Pinjam", icon: ClipboardList, prefix: true },
    { href: "/user/messages", label: "Chat", icon: MessageSquare },
  ];
  return (
    <div className="grid grid-cols-5 gap-1">
      {tabs.map((t) => {
        const Icon = t.icon;
        const active = (t as any).prefix
          ? pathname === t.href || pathname.startsWith(t.href + "/")
          : pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`flex flex-col items-center gap-1 rounded-xl py-1.5 text-[10px] font-semibold transition-colors ${
              active
                ? "text-[#0785BC] dark:text-sky-300"
                : "text-slate-500 dark:text-slate-400"
            }`}
          >
            <Icon className="w-5 h-5" />
            {t.label}
          </Link>
        );
      })}
      <button
        onClick={onOpenMenu}
        className="flex flex-col items-center gap-1 rounded-xl py-1.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400"
      >
        <Menu className="w-5 h-5" />
        Menu
      </button>
    </div>
  );
}
