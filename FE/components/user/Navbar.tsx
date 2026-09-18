"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Search,
  Bell,
  Settings,
  User,
  LogOut,
  Package,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  X,
} from "lucide-react";
import api, { getCurrentUser, removeAuthToken } from "@/lib/api";
import { getNotificationTargetUrl, getNotificationActionLabel } from "@/lib/notificationHelper";
import BorrowingDetailModal from "./BorrowingDetailModal";

interface UserNavbarProps {
  /** Controlled search value — pass state + setter if you want two-way binding */
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  /** Search placeholder text */
  searchPlaceholder?: string;
  /** Whether to show the search bar (default: true) */
  showSearch?: boolean;
}

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time?: string;
  created_at?: string;
  is_read?: boolean;
  read?: boolean;
  type: string;
  action_url?: string;
  reference_id?: string;
  reference_type?: string;
}

export default function UserNavbar({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Cari barang untuk dipinjam...",
  showSearch = true,
}: UserNavbarProps) {
  const router = useRouter();
  const [internalSearch, setInternalSearch] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showBadge, setShowBadge] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [detailBorrowingId, setDetailBorrowingId] = useState<string | null>(null);

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Sync user profile from local storage & server API
  const syncUser = useCallback(() => {
    const user = getCurrentUser();
    if (user) {
      setCurrentUser(user);
    }
  }, []);

  useEffect(() => {
    syncUser();

    // Fetch fresh profile from API to ensure photo/name/role are up to date
    async function fetchFreshUser() {
      try {
        const res = await api.auth.getProfile();
        if (res.status === "success" && res.data) {
          const u = (res.data as any).user || res.data;
          setCurrentUser(u);
          localStorage.setItem("user", JSON.stringify(u));
        }
      } catch {
        // silent fallback to localStorage
      }
    }
    fetchFreshUser();

    window.addEventListener("user-updated", syncUser);
    window.addEventListener("storage", syncUser);

    async function loadNotifications() {
      try {
        const res = await api.notifications.getAll();
        if (res.status === "success" && Array.isArray(res.data)) {
          let appSettings: any = null;
          try {
            const raw = localStorage.getItem("appSettings");
            if (raw) appSettings = JSON.parse(raw);
          } catch {}

          const notifConfig = appSettings?.notifications;
          if (notifConfig && notifConfig.push === false) {
            setShowBadge(false);
          } else {
            setShowBadge(true);
          }

          setNotifications(
            res.data.map((n: any) => ({
              id: n.id,
              title: n.title,
              message: n.message,
              type: n.type || "sistem",
              action_url: n.action_url,
              reference_id: n.reference_id,
              reference_type: n.reference_type,
              is_read: n.is_read,
              read: n.is_read,
              created_at: n.created_at,
              time: n.created_at
                ? new Date(n.created_at).toLocaleTimeString("id-ID", {
                    hour: "2-digit",
                    minute: "2-digit",
                  }) + " WIB"
                : "Baru saja",
            }))
          );
        }
      } catch (err) {
        console.warn("Gagal memuat notifikasi user:", err);
      }
    }

    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);

    return () => {
      clearInterval(interval);
      window.removeEventListener("user-updated", syncUser);
      window.removeEventListener("storage", syncUser);
    };
  }, [syncUser]);

  // Detect scroll state for elevation shadow
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
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

  const unreadCount = notifications.filter((n) => !n.read && !n.is_read).length;

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.notifications.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true, is_read: true } : n))
      );
    } catch {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true, is_read: true } : n))
      );
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.notifications.markAllAsRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read: true, is_read: true }))
      );
    } catch {
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read: true, is_read: true }))
      );
    }
  };

  const handleClearNotification = async (id: string) => {
    try {
      await api.notifications.delete(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }
  };

  const extractBorrowCode = (notif: NotificationItem): string | null => {
    const combined = `${notif.title || ""} ${notif.message || ""}`;
    const m = combined.match(/(PJ-\d{8}-[A-Z0-9]+|PJ-[A-Z0-9-]+)/i);
    return m ? m[1] : null;
  };

  const handleNotificationClick = async (notif: NotificationItem) => {
    if (!notif.read && !notif.is_read) {
      handleMarkAsRead(notif.id);
    }
    setShowNotifDropdown(false);

    const type = (notif.type || "").toLowerCase();
    const isBorrowingType =
      type === "peminjaman" ||
      type === "borrowing" ||
      type === "pengembalian" ||
      type === "return";

    if (isBorrowingType) {
      let borrowingId =
        notif.reference_type === "borrowing" && notif.reference_id
          ? String(notif.reference_id)
          : null;

      if (!borrowingId) {
        const code = extractBorrowCode(notif);
        if (code) {
          try {
            const res = await api.borrowings.getAll({ limit: 100 });
            if (res.status === "success" && Array.isArray(res.data)) {
              const found = res.data.find(
                (b: any) => (b.borrow_code || "").toLowerCase() === code.toLowerCase()
              );
              if (found) borrowingId = found.id;
            }
          } catch {
            // fallback ke redirect bawah
          }
        }
      }

      if (borrowingId) {
        setDetailBorrowingId(borrowingId);
        return;
      }
    }

    const targetUrl = getNotificationTargetUrl(notif, false);
    router.push(targetUrl);
  };

  const handleLogout = () => {
    if (confirm("Apakah Anda yakin ingin logout?")) {
      removeAuthToken();
      router.push("/auth/login");
    }
  };

  const getNotifIcon = (type: string) => {
    const iconClass = "w-8 h-8 rounded-xl flex items-center justify-center shrink-0";
    switch (type) {
      case "peminjaman":
      case "borrowing":
        return (
          <div className={`${iconClass} bg-blue-50 text-[#0785BC]`}>
            <Package className="w-4 h-4" />
          </div>
        );
      case "pengembalian":
      case "return":
        return (
          <div className={`${iconClass} bg-emerald-50 text-emerald-600`}>
            <RotateCcw className="w-4 h-4" />
          </div>
        );
      case "kerusakan":
      case "damage":
        return (
          <div className={`${iconClass} bg-rose-50 text-rose-600`}>
            <AlertTriangle className="w-4 h-4" />
          </div>
        );
      default:
        return (
          <div className={`${iconClass} bg-slate-50 text-slate-500`}>
            <Bell className="w-4 h-4" />
          </div>
        );
    }
  };

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
      router.push(`/user/item_catalog?q=${encodeURIComponent(value)}`);
    }
  }

  // Display Name, Role, and Avatar photo from updated profile
  const displayName =
    currentUser?.name || currentUser?.full_name || "User Sarpras";
  const userRole =
    currentUser?.role === "Admin"
      ? "Administrator"
      : currentUser?.role === "Petugas"
      ? "Petugas"
      : currentUser?.role || "Peminjam";

  const userPhoto = currentUser?.foto || null;

  const initials =
    displayName
      .split(" ")
      .filter(Boolean)
      .map((w: string) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "U";

  return (
    <header
      className={`h-16 min-w-0 bg-white border-b border-slate-100 flex items-center justify-between px-3 sm:px-6 gap-3 sm:gap-4 sticky top-0 z-20 transition-all duration-200 ${
        scrolled ? "shadow-sm" : "shadow-none"
      }`}
    >
      {/* Left Section: Search bar or empty placeholder */}
      {showSearch ? (
        <div className="relative min-w-0 flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0785BC] transition-all"
          />
        </div>
      ) : (
        <div />
      )}

      {/* Right Section: Notifications, Settings & User Profile */}
      <div className="flex items-center gap-2 sm:gap-3 ml-auto">
        {/* Notifications Bell Icon with Badge & Dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => {
              setShowNotifDropdown(!showNotifDropdown);
              setShowProfileDropdown(false);
            }}
            className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
            title="Notifikasi"
            aria-label="Notifikasi"
          >
            <Bell className="w-5 h-5" />
            {showBadge && unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown Box */}
          {showNotifDropdown && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 max-h-[480px] overflow-y-auto animate-fade-in z-50">
              <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-xs text-slate-900">Notifikasi Sistem</h3>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="text-xs text-[#0785BC] hover:underline font-medium cursor-pointer"
                  >
                    Tandai dibaca
                  </button>
                )}
              </div>

              <div className="divide-y divide-slate-50">
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center text-slate-400 text-xs">
                    <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-slate-200" />
                    <p>Tidak ada notifikasi baru</p>
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif)}
                      className={`px-4 py-3 hover:bg-blue-50/50 cursor-pointer transition-all group ${
                        !notif.read && !notif.is_read ? "bg-blue-50/30" : ""
                      }`}
                    >
                      <div className="flex gap-3">
                        {getNotifIcon(notif.type)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-1">
                            <p className="font-semibold text-xs text-slate-900 leading-snug group-hover:text-[#0785BC] transition-colors">
                              {notif.title}
                            </p>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleClearNotification(notif.id);
                              }}
                              className="text-slate-300 hover:text-slate-500 p-0.5 rounded cursor-pointer"
                              title="Hapus notifikasi"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                            {notif.message}
                          </p>
                          <div className="flex items-center justify-between mt-2 text-[10px]">
                            <span className="text-slate-400">{notif.time}</span>
                            <div className="flex items-center gap-2">
                              {!notif.read && !notif.is_read && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMarkAsRead(notif.id);
                                  }}
                                  className="text-[#0785BC] font-semibold hover:underline cursor-pointer"
                                >
                                  Tandai dibaca
                                </button>
                              )}
                              <span className="text-[#0785BC] font-semibold flex items-center gap-0.5 group-hover:underline">
                                {getNotificationActionLabel(notif.type)} &rarr;
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Settings Icon Button */}
        <Link
          href="/user/settings"
          className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
          title="Pengaturan Akun"
          aria-label="Pengaturan Akun"
        >
          <Settings className="w-5 h-5" />
        </Link>

        {/* Profile Button with Photo, Name, Role & Dropdown */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => {
              setShowProfileDropdown(!showProfileDropdown);
              setShowNotifDropdown(false);
            }}
            className="flex items-center gap-2.5 pl-2 hover:bg-slate-50 rounded-xl transition-colors py-1 pr-1 cursor-pointer"
            title="Menu Akun"
            aria-label="Menu Akun"
          >
            {userPhoto ? (
              <img
                src={userPhoto}
                alt={displayName}
                className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-[#0785BC] text-white font-bold text-xs flex items-center justify-center shrink-0">
                {initials}
              </div>
            )}
            <div className="text-left hidden md:block">
              <p className="text-xs font-bold text-slate-800 leading-none truncate max-w-[140px]">
                {displayName}
              </p>
              <p className="text-[10px] text-[#0785BC] mt-0.5 font-medium truncate max-w-[140px]">
                {userRole}
              </p>
            </div>
          </button>

          {/* Profile Dropdown: Profil Saya & Logout */}
          {showProfileDropdown && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 animate-fade-in">
              <div className="px-4 py-2.5 border-b border-slate-100">
                <p className="font-bold text-xs text-slate-900 truncate">{displayName}</p>
                <p className="text-[11px] text-slate-400 truncate">
                  {currentUser?.email || "user@pokada.com"}
                </p>
              </div>

              <div className="py-1 text-xs">
                <Link
                  href="/user/profile"
                  onClick={() => setShowProfileDropdown(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-slate-700 hover:bg-slate-50 transition-colors font-medium"
                >
                  <User className="w-4 h-4 text-slate-400" />
                  Profil Saya
                </Link>
                <Link
                  href="/user/settings"
                  onClick={() => setShowProfileDropdown(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-slate-700 hover:bg-slate-50 transition-colors font-medium"
                >
                  <Settings className="w-4 h-4 text-slate-400" />
                  Pengaturan
                </Link>
              </div>

              <div className="border-t border-slate-100 pt-1">
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2.5 px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 transition-colors w-full font-semibold cursor-pointer"
                >
                  <LogOut className="w-4 h-4 text-rose-500" />
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <BorrowingDetailModal
        borrowingId={detailBorrowingId}
        onClose={() => setDetailBorrowingId(null)}
      />
    </header>
  );
}
