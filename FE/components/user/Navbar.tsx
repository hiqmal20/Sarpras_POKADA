"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, MessageSquare, Bell } from "lucide-react";
import Link from "next/link";

interface UserNavbarProps {
  /** Controlled search value — pass state + setter if you want two-way binding */
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  /** Whether to show the search bar (default: true) */
  showSearch?: boolean;
}

export default function UserNavbar({
  searchValue,
  onSearchChange,
  showSearch = true,
}: UserNavbarProps) {
  // Internal state for uncontrolled usage
  const [internalSearch, setInternalSearch] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const router = useRouter();

  // Detect scroll untuk shadow & transisi
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isControlled = searchValue !== undefined;
  const value = isControlled ? searchValue : internalSearch;

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    if (isControlled) {
      onSearchChange?.(v);
    } else {
      setInternalSearch(v);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !isControlled) {
      // Navigate to catalog with search query when uncontrolled
      router.push(`/user/item_catalog?q=${encodeURIComponent(value)}`);
    }
  }

  return (
    <header
      className={`bg-white/80 backdrop-blur-md border-b border-slate-100 px-8 py-3 flex items-center gap-4 sticky top-0 z-10 transition-all duration-300 ease-in-out ${
        scrolled ? "shadow-md" : "shadow-none"
      }`}
    >
      {/* Search bar */}
      {showSearch && (
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari barang untuk disewa..."
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-full focus:outline-none focus:ring-2 focus:ring-[#0785BC] transition-all"
          />
        </div>
      )}

      {/* Action icons */}
      <div className="ml-auto flex items-center gap-2">
        <Link
          href="/user/messages"
          className="p-2 rounded-xl text-slate-500 hover:bg-slate-50 transition-colors"
          aria-label="Pesan"
        >
          <MessageSquare className="w-5 h-5" />
        </Link>
        <button
          className="relative p-2 rounded-xl text-slate-500 hover:bg-slate-50 transition-colors"
          aria-label="Notifikasi"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>
      </div>
    </header>
  );
}
