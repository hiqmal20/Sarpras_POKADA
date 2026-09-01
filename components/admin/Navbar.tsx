"use client";

import { Bell, Settings, User, LogOut, Shield, HelpCircle, X } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getCurrentUser, removeAuthToken } from "@/lib/api";

interface NavbarProps {
  showSearch?: boolean;
  searchValue?: string;
  searchPlaceholder?: string;
  onSearchChange?: (value: string) => void;
}

// Mock notifications
const mockNotifications = [
  {
    id: "1",
    title: "Peminjaman Baru",
    message: "Ahmad Subarjo mengajukan peminjaman Projector Epson",
    time: "5 menit lalu",
    read: false,
    type: "borrowing"
  },
  {
    id: "2",
    title: "Pengembalian",
    message: "Budi Waseso mengembalikan Kamera Canon 90D",
    time: "1 jam lalu",
    read: false,
    type: "return"
  },
  {
    id: "3",
    title: "Laporan Kerusakan",
    message: "Kerusakan dilaporkan pada Laptop Thinkpad T14",
    time: "3 jam lalu",
    read: true,
    type: "damage"
  },
  {
    id: "4",
    title: "User Baru",
    message: "Sarah Jenkins mendaftar sebagai user baru",
    time: "5 jam lalu",
    read: true,
    type: "user"
  }
];

export default function Navbar({ 
  showSearch = false, 
  searchValue = "", 
  searchPlaceholder = "Search...",
  onSearchChange 
}: NavbarProps) {
  const router = useRouter();
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [notifications, setNotifications] = useState(mockNotifications);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const user = getCurrentUser();
    setCurrentUser(user);
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifDropdown(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfileDropdown(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkAsRead = (id: string) => {
    setNotifications(notifications.map(n => 
      n.id === id ? { ...n, read: true } : n
    ));
  };

  const handleMarkAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const handleClearNotification = (id: string) => {
    setNotifications(notifications.filter(n => n.id !== id));
  };

  const handleLogout = () => {
    if (confirm("Apakah Anda yakin ingin logout?")) {
      removeAuthToken();
      router.push("/auth/login");
    }
  };

  const getNotifIcon = (type: string) => {
    const iconClass = "w-8 h-8 rounded-full flex items-center justify-center";
    switch (type) {
      case "borrowing":
        return <div className={`${iconClass} bg-blue-100 text-blue-600`}>📦</div>;
      case "return":
        return <div className={`${iconClass} bg-green-100 text-green-600`}>✓</div>;
      case "damage":
        return <div className={`${iconClass} bg-red-100 text-red-600`}>⚠️</div>;
      case "user":
        return <div className={`${iconClass} bg-purple-100 text-purple-600`}>👤</div>;
      default:
        return <div className={`${iconClass} bg-gray-100 text-gray-600`}>🔔</div>;
    }
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 gap-4 sticky top-0 z-20">
      {/* Left Section: Search Bar (if enabled) */}
      {showSearch ? (
        <div className="relative flex-1 max-w-md">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400">
            🔍
          </div>
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

      {/* Right Section: Notifications, Settings & User */}
      <div className="flex items-center gap-3">
        {/* Notifications Dropdown */}
        <div className="relative" ref={notifRef}>
          <button 
            onClick={() => {
              setShowNotifDropdown(!showNotifDropdown);
              setShowProfileDropdown(false);
            }}
            className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifDropdown && (
            <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 py-2 max-h-[500px] overflow-y-auto">
              {/* Header */}
              <div className="px-4 py-2 border-b border-gray-200 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Notifikasi</h3>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="text-xs text-[#0785BC] hover:underline"
                  >
                    Tandai semua dibaca
                  </button>
                )}
              </div>

              {/* Notifications List */}
              <div className="divide-y divide-gray-100">
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center text-gray-500">
                    <Bell className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>Tidak ada notifikasi</p>
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`px-4 py-3 hover:bg-gray-50 transition-colors ${
                        !notif.read ? "bg-blue-50/50" : ""
                      }`}
                    >
                      <div className="flex gap-3">
                        {getNotifIcon(notif.type)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-medium text-sm text-gray-900">
                              {notif.title}
                            </p>
                            <button
                              onClick={() => handleClearNotification(notif.id)}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          <p className="text-sm text-gray-600 mt-0.5">
                            {notif.message}
                          </p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-gray-500">{notif.time}</span>
                            {!notif.read && (
                              <button
                                onClick={() => handleMarkAsRead(notif.id)}
                                className="text-xs text-[#0785BC] hover:underline"
                              >
                                Tandai dibaca
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              {notifications.length > 0 && (
                <div className="px-4 py-2 border-t border-gray-200">
                  <Link
                    href="/admin/notifications"
                    className="text-sm text-[#0785BC] hover:underline font-medium block text-center"
                  >
                    Lihat semua notifikasi
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Settings Button */}
        <Link
          href="/admin/settings"
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Settings className="w-5 h-5" />
        </Link>

        {/* Profile Dropdown */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => {
              setShowProfileDropdown(!showProfileDropdown);
              setShowNotifDropdown(false);
            }}
            className="flex items-center gap-3 pl-3 border-l border-gray-200 hover:bg-gray-50 rounded-r-lg transition-colors"
          >
            <div className="w-9 h-9 rounded-full bg-[#0785BC] flex items-center justify-center text-white font-bold text-sm">
              {currentUser?.full_name?.charAt(0) || "A"}
            </div>
            <div className="text-left pr-3 hidden md:block">
              <p className="text-sm font-semibold text-gray-800">
                {currentUser?.full_name || "Admin User"}
              </p>
              <p className="text-xs text-gray-500">
                {currentUser?.role === "admin" ? "Administrator" : "User"}
              </p>
            </div>
          </button>

          {/* Profile Dropdown */}
          {showProfileDropdown && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2">
              {/* User Info */}
              <div className="px-4 py-3 border-b border-gray-200">
                <p className="font-semibold text-gray-900">
                  {currentUser?.full_name || "Admin User"}
                </p>
                <p className="text-sm text-gray-500">{currentUser?.email || "admin@pokada.com"}</p>
              </div>

              {/* Menu Items */}
              <div className="py-2">
                <Link
                  href="/admin/profile"
                  className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <User className="w-4 h-4" />
                  Profil Saya
                </Link>

                <Link
                  href="/admin/settings"
                  className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  Pengaturan
                </Link>

                <Link
                  href="/admin/settings?tab=security"
                  className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Shield className="w-4 h-4" />
                  Keamanan
                </Link>

                <Link
                  href="/help"
                  className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <HelpCircle className="w-4 h-4" />
                  Bantuan
                </Link>
              </div>

              {/* Logout */}
              <div className="border-t border-gray-200 pt-2">
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors w-full"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
