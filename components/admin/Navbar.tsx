"use client";

import { Bell, Settings, Search } from "lucide-react";

interface NavbarProps {
  showSearch?: boolean;
  searchValue?: string;
  searchPlaceholder?: string;
  onSearchChange?: (value: string) => void;
}

export default function Navbar({ 
  showSearch = false, 
  searchValue = "", 
  searchPlaceholder = "Search...",
  onSearchChange 
}: NavbarProps) {
  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 gap-4">
      {/* Left Section: Search Bar (if enabled) */}
      {showSearch ? (
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange?.(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0785BC] focus:border-transparent transition-all"
          />
        </div>
      ) : (
        <div />
      )}

      {/* Right Section: Notifications & Settings */}
      <div className="flex items-center gap-3">
        {/* Notifications */}
        <button className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>

        {/* Settings */}
        <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
          <Settings className="w-5 h-5" />
        </button>

        {/* User Avatar */}
        <div className="flex items-center gap-3 pl-3 border-l border-gray-200">
          <div className="w-9 h-9 rounded-full bg-[#0785BC] flex items-center justify-center text-white font-bold text-sm">
            A
          </div>
        </div>
      </div>
    </header>
  );
}
