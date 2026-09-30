"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Box,
  BookOpen,
  MessageSquare,
  Menu,
} from "lucide-react";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import api, { getAuthToken, getCurrentUser, isPrivilegedUser } from "@/lib/api";
import { disconnectSocket, getSocket } from "@/lib/socket";
import { useLanguage } from "@/lib/i18n";

interface AdminLayoutProps {
  children: React.ReactNode;
  showSearch?: boolean;
  searchValue?: string;
  searchPlaceholder?: string;
  onSearchChange?: (value: string) => void;
  fullWidth?: boolean;
  hideMobileTabs?: boolean;
}

export default function AdminLayout({
  children,
  showSearch = false,
  searchValue = "",
  searchPlaceholder,
  onSearchChange,
  fullWidth = false,
  hideMobileTabs = false,
}: AdminLayoutProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const [collapsed, setCollapsed] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      router.replace("/auth/login");
      return;
    }
    api.auth.getProfile().then((res) => {
      if (res.status === "success" && res.data?.user) {
        const u = res.data.user;
        const role = (u.role || "").toLowerCase();
        if (role !== "admin" && role !== "petugas") {
          router.replace("/user/dashboard");
        } else {
          setAuthorized(true);
        }
      } else {
        router.replace("/auth/login");
      }
    }).catch(() => {
      router.replace("/auth/login");
    });
  }, [router]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("sarpras_admin_sidebar_collapsed");
      if (saved !== null) {
        setCollapsed(saved === "true");
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!authorized || !getAuthToken()) return;
    const socket = getSocket();
    return () => {
      void socket;
    };
  }, [authorized]);

  // Idle Session Timeout Enforcer
  useEffect(() => {
    let timeoutId: any = null;

    const resetIdleTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);

      let minutes = 30;
      try {
        const raw = localStorage.getItem("appSettings");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.security?.sessionTimeout) {
            minutes = Number(parsed.security.sessionTimeout) || 30;
          }
        }
      } catch {}

      const ms = minutes * 60 * 1000;
      timeoutId = setTimeout(() => {
        alert(t("admin.nav.session_timeout", `Sesi Anda telah berakhir karena tidak ada aktivitas selama ${minutes} menit. Silakan login kembali.`));
        try {
          disconnectSocket();
          api.auth.logout();
        } catch {}
        localStorage.clear();
        window.location.href = "/auth/login?reason=timeout";
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
  }, []);

  const handleToggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("sarpras_admin_sidebar_collapsed", String(next));
      } catch {}
      return next;
    });
  };

  if (!authorized) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-[#0785BC] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-screen h-dvh overflow-hidden bg-[#f8fafc] text-slate-900">
      {/* Sleek ChatGPT / n8n Desktop Sidebar */}
      <div className="hidden md:block shrink-0">
        <Sidebar
          collapsed={collapsed}
          onToggleCollapse={handleToggleCollapse}
        />
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-slate-950/50 backdrop-blur-[2px] animate-fade-in"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute left-0 top-0 bottom-0 w-72 max-w-[85vw] animate-slide-in-left shadow-2xl">
            <Sidebar
              collapsed={false}
              onNavigate={() => setMobileOpen(false)}
              onCloseMobile={() => setMobileOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Main Canvas Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-dot-grid">
        {/* Top Command Bar / Navbar */}
        <Navbar
          showSearch={showSearch}
          searchValue={searchValue}
          searchPlaceholder={searchPlaceholder || t("admin.nav.search_ph_layout", "Cari data...")}
          onSearchChange={onSearchChange}
          onOpenSidebar={() => setMobileOpen(true)}
        />

        {/* Scrollable Canvas Workspace */}
        <main className={`flex-1 overflow-y-auto ${fullWidth ? "p-0" : "p-3 sm:p-5 lg:p-7"}`}>
          <div className="w-full min-w-0 h-full">
            {children}
          </div>
        </main>

        {/* Mobile bottom navigation bar */}
        {!hideMobileTabs && (
          <nav className="md:hidden shrink-0 border-t border-slate-200 bg-white/95 backdrop-blur px-2 py-2">
            <AdminMobileTabs onOpenMenu={() => setMobileOpen(true)} />
          </nav>
        )}
      </div>
    </div>
  );
}

function AdminMobileTabs({ onOpenMenu }: { onOpenMenu: () => void }) {
  const pathname = usePathname();
  const tabs = [
    { href: "/admin/dashboard_admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/barang", label: "Barang", icon: Box, prefix: true },
    { href: "/admin/manajemen_peminjaman", label: "Pinjam", icon: BookOpen, prefix: true },
    { href: "/admin/messages", label: "Pesan", icon: MessageSquare },
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
              active ? "text-[#0785BC]" : "text-slate-500"
            }`}
          >
            <Icon className="w-5 h-5" />
            {t.label}
          </Link>
        );
      })}
      <button
        onClick={onOpenMenu}
        className="flex flex-col items-center gap-1 rounded-xl py-1.5 text-[10px] font-semibold text-slate-500"
      >
        <Menu className="w-5 h-5" />
        Menu
      </button>
    </div>
  );
}
