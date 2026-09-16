"use client";

import { useState } from "react";
import UserSidebar from "./Sidebar";
import UserNavbar from "./Navbar";

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
  const [collapsed, setCollapsed] = useState(false);

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
