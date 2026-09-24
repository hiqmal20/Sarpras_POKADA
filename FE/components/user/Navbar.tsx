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
  Sun,
  Moon,
  Languages,
  Menu,
} from "lucide-react";
import api, { getCurrentUser, removeAuthToken } from "@/lib/api";
import { getNotificationTargetUrl, getNotificationActionLabel } from "@/lib/notificationHelper";
import { useLanguage } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import BorrowingDetailModal from "./BorrowingDetailModal";

interface UserNavbarProps {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  showSearch?: boolean;
  onOpenSidebar?: () => void;
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
  searchPlaceholder,
  showSearch = true,
  onOpenSidebar,
}: UserNavbarProps) {
  const router = useRouter();
  const { t, lang, setLang } = useLanguage();
  const { theme, toggle } = useTheme();
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

  const tr = (key: string, fallback: string) => {
    const v = t(key);
    return v === key ? fallback : v;
  };

  const syncUser = useCallback(() => {
    const user = getCurrentUser();
    if (user) setCurrentUser(user);
  }, []);

  useEffect(() => {
    syncUser();
    async function fetchFreshUser() {
      try {
        const res = await api.auth.getProfile();
        if (res.status === "success" && res.data) {
          const u = (res.data as any).user || res.data;
          setCurrentUser(u);
          localStorage.setItem("user", JSON.stringify(u));
        }
      } catch {}
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
          setShowBadge(!(notifConfig && notifConfig.push === false));
          let items = res.data;
          if (notifConfig) {
            if (notifConfig.borrowing === false) items = items.filter((n: any) => n.type !== "peminjaman");
            if (notifConfig.return === false) items = items.filter((n: any) => n.type !== "pengembalian");
            if (notifConfig.damage === false) items = items.filter((n: any) => n.type !== "laporan" && n.type !== "kerusakan");
          }
          setNotifications(
            items.map((n: any) => ({
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
                ? new Date(n.created_at).toLocaleTimeString(lang === "en" ? "en-US" : "id-ID", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : tr("common.loading", "Baru saja"),
            }))
          );
        }
      } catch (err) {
        console.warn("Gagal memuat notifikasi user:", err);
      }
    }

    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    window.addEventListener("settings-updated", loadNotifications);
    window.addEventListener("language-changed", loadNotifications as any);
    return () => {
      clearInterval(interval);
      window.removeEventListener("settings-updated", loadNotifications);
      window.removeEventListener("language-changed", loadNotifications as any);
      window.removeEventListener("user-updated", syncUser);
      window.removeEventListener("storage", syncUser);
    };
  }, [syncUser, lang]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) setShowNotifDropdown(false);
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) setShowProfileDropdown(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read && !n.is_read).length;

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.notifications.markAsRead(id);
    } catch {}
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true, is_read: true } : n)));
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.notifications.markAllAsRead();
    } catch {}
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true, is_read: true })));
  };

  const handleClearNotification = async (id: string) => {
    try {
      await api.notifications.delete(id);
    } catch {}
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const extractBorrowCode = (notif: NotificationItem): string | null => {
    const combined = `${notif.title || ""} ${notif.message || ""}`;
    const m = combined.match(/(PJ-\d{8}-[A-Z0-9]+|PJ-[A-Z0-9-]+)/i);
    return m ? m[1] : null;
  };

  const handleNotificationClick = async (notif: NotificationItem) => {
    if (!notif.read && !notif.is_read) handleMarkAsRead(notif.id);
    setShowNotifDropdown(false);
    const type = (notif.type || "").toLowerCase();
    const isBorrowingType = type === "peminjaman" || type === "borrowing" || type === "pengembalian" || type === "return";
    if (isBorrowingType) {
      let borrowingId = notif.reference_type === "borrowing" && notif.reference_id ? String(notif.reference_id) : null;
      if (!borrowingId) {
        const code = extractBorrowCode(notif);
        if (code) {
          try {
            const res = await api.borrowings.getAll({ limit: 100 });
            if (res.status === "success" && Array.isArray(res.data)) {
              const found = res.data.find((b: any) => (b.borrow_code || "").toLowerCase() === code.toLowerCase());
              if (found) borrowingId = found.id;
            }
          } catch {}
        }
      }
      if (borrowingId) {
        setDetailBorrowingId(borrowingId);
        return;
      }
    }
    router.push(getNotificationTargetUrl(notif, false));
  };

  const handleLogout = () => {
    if (confirm(tr("nav.logout_confirm", "Apakah Anda yakin ingin logout?"))) {
      removeAuthToken();
      router.push("/auth/login");
    }
  };

  const getNotifIcon = (type: string) => {
    const iconClass = "w-8 h-8 rounded-xl flex items-center justify-center shrink-0";
    switch (type) {
      case "peminjaman":
      case "borrowing":
        return <div className={`${iconClass} bg-blue-50 dark:bg-sky-950/60 text-[#0785BC] dark:text-sky-300`}><Package className="w-4 h-4" /></div>;
      case "pengembalian":
      case "return":
        return <div className={`${iconClass} bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-300`}><RotateCcw className="w-4 h-4" /></div>;
      case "kerusakan":
      case "damage":
        return <div className={`${iconClass} bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-300`}><AlertTriangle className="w-4 h-4" /></div>;
      default:
        return <div className={`${iconClass} bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-300`}><Bell className="w-4 h-4" /></div>;
    }
  };

  const isControlled = searchValue !== undefined;
  const value = isControlled ? searchValue : internalSearch;
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    if (isControlled) onSearchChange?.(v);
    else setInternalSearch(v);
  }
  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !isControlled) router.push(`/user/item_catalog?q=${encodeURIComponent(value)}`);
  }

  const displayName = currentUser?.name || currentUser?.full_name || tr("common.user_fallback", "User Sarpras");
  const rawRole = currentUser?.role || "";
  const userRole =
    rawRole === "Admin"
      ? tr("profile.role_admin", "Administrator")
      : rawRole === "Petugas"
        ? tr("profile.role_staff", "Petugas")
        : rawRole || tr("profile.role_borrower", "Peminjam");
  const userPhoto = currentUser?.foto || null;
  const initials = displayName.split(" ").filter(Boolean).map((w: string) => w[0]).slice(0, 2).join("").toUpperCase() || "U";
  const placeholder = searchPlaceholder || tr("nav.search", "Cari barang untuk dipinjam...");

  return (
    <header
      className={`min-h-16 min-w-0 bg-white/90 dark:bg-[#111c30]/90 backdrop-blur border-b border-slate-100 dark:border-slate-800 flex items-center justify-between px-3 sm:px-6 gap-2 sm:gap-4 sticky top-0 z-20 transition-all duration-200 py-2 ${
        scrolled ? "shadow-sm" : "shadow-none"
      }`}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <button onClick={onOpenSidebar} className="md:hidden p-2 -ml-1 rounded-xl text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Menu">
          <Menu className="w-5 h-5" />
        </button>
        {showSearch ? (
          <div className="relative min-w-0 flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder={placeholder}
              value={value}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0785BC] transition-all"
            />
          </div>
        ) : <div className="hidden sm:block" />}
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2 ml-auto shrink-0">
        <button
          onClick={() => setLang(lang === "id" ? "en" : "id")}
          className="h-9 px-2.5 rounded-xl text-[11px] font-bold text-slate-600 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
          title="Language / Bahasa"
        >
          <Languages className="w-4 h-4" />
          {lang.toUpperCase()}
        </button>
        <button
          onClick={toggle}
          className="p-2 rounded-xl text-slate-500 dark:text-amber-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title={theme === "dark" ? "Light mode" : "Dark mode"}
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        <div className="relative" ref={notifRef}>
          <button
            onClick={() => { setShowNotifDropdown(!showNotifDropdown); setShowProfileDropdown(false); }}
            className="relative p-2 text-slate-500 dark:text-slate-300 hover:text-slate-700 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            title={tr("nav.notifications", "Notifikasi")}
            aria-label="Notifikasi"
          >
            <Bell className="w-5 h-5" />
            {showBadge && unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-4 h-4 px-1 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
          {showNotifDropdown && (
            <div className="fixed sm:absolute right-2 sm:right-0 mt-2 w-[calc(100vw-1rem)] sm:w-96 bg-white dark:bg-[#16233d] rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 py-2 max-h-[480px] overflow-y-auto animate-fade-in z-50">
              <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                <h3 className="font-bold text-xs text-slate-900 dark:text-white">{tr("nav.notifications", "Notifikasi Sistem")}</h3>
                {unreadCount > 0 && (
                  <button onClick={handleMarkAllAsRead} className="text-xs text-[#0785BC] dark:text-sky-300 hover:underline font-medium cursor-pointer">
                    {tr("nav.mark_read", "Tandai dibaca")}
                  </button>
                )}
              </div>
              <div className="divide-y divide-slate-50 dark:divide-slate-800">
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center text-slate-400 text-xs">
                    <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-slate-200 dark:text-slate-600" />
                    <p>{tr("nav.no_notif", "Tidak ada notifikasi baru")}</p>
                  </div>
                ) : notifications.map((notif) => (
                  <div key={notif.id} onClick={() => handleNotificationClick(notif)}
                    className={`px-4 py-3 hover:bg-blue-50/50 dark:hover:bg-slate-800/70 cursor-pointer transition-all group ${!notif.read && !notif.is_read ? "bg-blue-50/30 dark:bg-sky-950/30" : ""}`}>
                    <div className="flex gap-3">
                      {getNotifIcon(notif.type)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-1">
                          <p className="font-semibold text-xs text-slate-900 dark:text-slate-100 leading-snug group-hover:text-[#0785BC] dark:group-hover:text-sky-300 transition-colors">{notif.title}</p>
                          <button type="button" onClick={(e) => { e.stopPropagation(); handleClearNotification(notif.id); }}
                            className="text-slate-300 hover:text-slate-500 p-0.5 rounded cursor-pointer" title="Hapus">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{notif.message}</p>
                        <div className="flex items-center justify-between mt-2 text-[10px]">
                          <span className="text-slate-400">{notif.time}</span>
                          <div className="flex items-center gap-2">
                            {!notif.read && !notif.is_read && (
                              <button type="button" onClick={(e) => { e.stopPropagation(); handleMarkAsRead(notif.id); }}
                                className="text-[#0785BC] dark:text-sky-300 font-semibold hover:underline cursor-pointer">
                                {tr("nav.mark_read", "Tandai dibaca")}
                              </button>
                            )}
                            <span className="text-[#0785BC] dark:text-sky-300 font-semibold flex items-center gap-0.5 group-hover:underline">
                              {getNotificationActionLabel(notif.type, lang)} &rarr;
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <Link href="/user/settings" className="hidden sm:flex p-2 text-slate-500 dark:text-slate-300 hover:text-slate-700 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors" title={tr("nav.settings", "Pengaturan")}>
          <Settings className="w-5 h-5" />
        </Link>

        <div className="relative" ref={profileRef}>
          <button onClick={() => { setShowProfileDropdown(!showProfileDropdown); setShowNotifDropdown(false); }}
            className="flex items-center gap-2.5 pl-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors py-1 pr-1 cursor-pointer" title="Menu Akun">
            {userPhoto ? <img src={userPhoto} alt={displayName} className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0" />
              : <div className="w-8 h-8 rounded-full bg-[#0785BC] text-white font-bold text-xs flex items-center justify-center shrink-0">{initials}</div>}
            <div className="text-left hidden lg:block">
              <p className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-none truncate max-w-[140px]">{displayName}</p>
              <p className="text-[10px] text-[#0785BC] dark:text-sky-300 mt-0.5 font-medium truncate max-w-[140px]">{userRole}</p>
            </div>
          </button>
          {showProfileDropdown && (
            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-[#16233d] rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 py-2 z-50 animate-fade-in">
              <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-700">
                <p className="font-bold text-xs text-slate-900 dark:text-white truncate">{displayName}</p>
                <p className="text-[11px] text-slate-400 truncate">{currentUser?.email || "user@pokada.com"}</p>
              </div>
              <div className="py-1 text-xs">
                <Link href="/user/profile" onClick={() => setShowProfileDropdown(false)} className="flex items-center gap-2.5 px-4 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium">
                  <User className="w-4 h-4 text-slate-400" />{tr("nav.profile_menu", "Profil Saya")}
                </Link>
                <Link href="/user/settings" onClick={() => setShowProfileDropdown(false)} className="flex items-center gap-2.5 px-4 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium">
                  <Settings className="w-4 h-4 text-slate-400" />{tr("nav.settings", "Pengaturan")}
                </Link>
              </div>
              <div className="border-t border-slate-100 dark:border-slate-700 pt-1">
                <button onClick={handleLogout} className="flex items-center gap-2.5 px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 w-full font-semibold cursor-pointer">
                  <LogOut className="w-4 h-4 text-rose-500" />{tr("nav.logout", "Logout")}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      <BorrowingDetailModal borrowingId={detailBorrowingId} onClose={() => setDetailBorrowingId(null)} />
    </header>
  );
}
