"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import api, { getAuthToken, getCurrentUser, isPrivilegedUser } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { useLanguage } from "@/lib/i18n";

interface AdminLayoutProps {
  children: React.ReactNode;
  showSearch?: boolean;
  searchValue?: string;
  searchPlaceholder?: string;
  onSearchChange?: (value: string) => void;
}

export default function AdminLayout({
  children,
  showSearch = false,
  searchValue = "",
  searchPlaceholder,
  onSearchChange,
}: AdminLayoutProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const [collapsed, setCollapsed] = useState(false);
  const [authorized, setAuthorized] = useState(false);

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
    <div className="flex h-screen overflow-hidden bg-[#f8fafc] text-slate-900">
      {/* Sleek ChatGPT / n8n Sidebar */}
      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={handleToggleCollapse}
      />

      {/* Main Canvas Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-dot-grid">
        {/* Top Command Bar / Navbar */}
        <Navbar
          showSearch={showSearch}
          searchValue={searchValue}
          searchPlaceholder={searchPlaceholder || t("admin.nav.search_ph_layout", "Cari data...")}
          onSearchChange={onSearchChange}
        />

        {/* Scrollable Canvas Workspace */}
        <main className="flex-1 p-4 sm:p-6 lg:p-7 overflow-y-auto">
          <div className="w-full min-w-0">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
