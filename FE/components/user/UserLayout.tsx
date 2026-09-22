"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import UserSidebar from "./Sidebar";
import UserNavbar from "./Navbar";
import api, { getAuthToken } from "@/lib/api";

interface UserLayoutProps {
  children: React.ReactNode;
  showSearch?: boolean;
  searchValue?: string;
  searchPlaceholder?: string;
  onSearchChange?: (value: string) => void;
  fullWidth?: boolean;
}

export default function UserLayout({
  children,
  showSearch = true,
  searchValue,
  searchPlaceholder = "Cari barang untuk dipinjam...",
  onSearchChange,
  fullWidth = false,
}: UserLayoutProps) {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      router.replace("/auth/login");
      return;
    }
    api.auth.me().then((res) => {
      if (res.status === "success" && res.data?.user) {
        setAuthorized(true);
      } else {
        router.replace("/auth/login");
      }
    }).catch(() => {
      router.replace("/auth/login");
    });
  }, [router]);

  if (!authorized) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#eef2f9]">
        <div className="w-8 h-8 border-4 border-[#0785BC] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-screen h-dvh min-w-0 overflow-hidden bg-[#eef2f9] text-slate-800">
      {/* Sidebar with PanelLeftClose / PanelLeft Minimize Support */}
      <UserSidebar
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
        onToggle={(next) => setCollapsed(next)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Navbar with notifications, settings & user profile */}
        <UserNavbar
          showSearch={showSearch}
          searchValue={searchValue}
          searchPlaceholder={searchPlaceholder}
          onSearchChange={onSearchChange}
        />

        {/* Page Content */}
        <main className={`min-w-0 flex-1 overflow-y-auto ${fullWidth ? "" : "p-3 sm:p-5 lg:p-8"}`}>
          {children}
        </main>
      </div>
    </div>
  );
}
