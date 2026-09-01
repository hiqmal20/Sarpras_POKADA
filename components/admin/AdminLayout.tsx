"use client";

import Sidebar from "./Sidebar";
import Navbar from "./Navbar";

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
  searchPlaceholder = "Search...",
  onSearchChange
}: AdminLayoutProps) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Navbar */}
        <Navbar 
          showSearch={showSearch}
          searchValue={searchValue}
          searchPlaceholder={searchPlaceholder}
          onSearchChange={onSearchChange}
        />

        {/* Page Content */}
        <main className="flex-1 p-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
