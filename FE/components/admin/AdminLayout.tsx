"use client";

import { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import api from "@/lib/api";

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
  searchPlaceholder = "Cari data...",
  onSearchChange,
}: AdminLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("sarpras_admin_sidebar_collapsed");
      if (saved !== null) {
        setCollapsed(saved === "true");
      }
    } catch {}
  }, []);

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
        alert(`Sesi Anda telah berakhir karena tidak ada aktivitas selama ${minutes} menit. Silakan login kembali.`);
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
          searchPlaceholder={searchPlaceholder}
          onSearchChange={onSearchChange}
        />

        {/* Scrollable Canvas Workspace */}
        <main className="flex-1 p-5 md:p-7 overflow-y-auto">
          <div className="max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
