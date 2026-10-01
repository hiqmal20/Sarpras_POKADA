"use client";

import {
  Bell,
  Settings,
  User,
  LogOut,
  Shield,
  X,
  Search,
  Package,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ChevronRight,
  Languages,
  Sun,
  Moon,
  Menu,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import api, { getCurrentUser, removeAuthToken } from "@/lib/api";
import { disconnectSocket } from "@/lib/socket";
import { getNotificationTargetUrl, getNotificationActionLabel } from "@/lib/notificationHelper";
import { useLanguage } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";

interface NavbarProps {
  showSearch?: boolean;
  searchValue?: string;
  searchPlaceholder?: string;
  onSearchChange?: (value: string) => void;
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
}



export default function Navbar({
  showSearch = false,
  searchValue = "",
  searchPlaceholder,
  onSearchChange,
  onOpenSidebar,
}: NavbarProps) {
  const { t, lang, setLang } = useLanguage();
  const { theme, toggle } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showBadge, setShowBadge] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [scrolled, setScrolled] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const syncUser = () => {
      const user = getCurrentUser();
      if (user) setCurrentUser(user);
    };

    syncUser();
    window.addEventListener("user-updated", syncUser);
    window.addEventListener("storage", syncUser);

    async function loadNotifications() {
      try {
        const res = await api.notifications.getAll();
        if (res.status === "success" && Array.isArray(res.data)) {
          let appSettings: any = null;
          try {
            const rawSettings = localStorage.getItem("appSettings");
            if (rawSettings) appSettings = JSON.parse(rawSettings);
          } catch {}

          const notifConfig = appSettings?.notifications;
          if (notifConfig && notifConfig.push === false) {
            setShowBadge(false);
          } else {
            setShowBadge(true);
          }

          let items = res.data;
          if (notifConfig) {
            if (notifConfig.borrowing === false) {
              items = items.filter((n: any) => n.type !== "peminjaman");
            }
            if (notifConfig.return === false) {
              items = items.filter((n: any) => n.type !== "pengembalian");
            }
            if (notifConfig.damage === false) {
              items = items.filter((n: any) => n.type !== "laporan" && n.type !== "kerusakan");
            }
          }

          setNotifications(
            items.map((n: any) => ({
              id: n.id,
              title: n.title,
              message: n.message,
              type: n.type || "sistem",
              action_url: n.action_url,
              is_read: n.is_read,
              read: n.is_read,
              created_at: n.created_at,
              time: n.created_at
                ? new Date(n.created_at).toLocaleTimeString(lang === "en" ? "en-US" : "id-ID", { hour: "2-digit", minute: "2-digit" }) + (lang === "en" ? "" : " WIB")
                : (lang === "en" ? "Just now" : "Baru saja"),
            }))
          );
        }
      } catch (err) {
        console.warn("Gagal memuat notifikasi:", err);
      }
    }
    loadNotifications();

    const interval = setInterval(loadNotifications, 30000);
    window.addEventListener("settings-updated", loadNotifications);

    return () => {
      clearInterval(interval);
      window.removeEventListener("settings-updated", loadNotifications);
      window.removeEventListener("user-updated", syncUser);
      window.removeEventListener("storage", syncUser);
    };
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true, is_read: true })));
    } catch {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true, is_read: true })));
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

  const handleNotificationClick = async (notif: NotificationItem) => {
    if (!notif.read && !notif.is_read) {
      handleMarkAsRead(notif.id);
    }
    setShowNotifDropdown(false);
    const targetUrl = getNotificationTargetUrl(notif, true);
    router.push(targetUrl);
  };

  const handleLogout = () => {
    if (confirm(t("admin.nav.logout_confirm", "Apakah Anda yakin ingin logout?"))) {
      // Putuskan socket lebih dulu agar server langsung mengirim status offline.
      disconnectSocket();
      removeAuthToken();
      router.push("/auth/login");
    }
  };

  const getNotifIcon = (type: string) => {
    const iconClass = "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border";
    switch (type) {
      case "peminjaman":
      case "borrowing":
        return (
          <div className={`${iconClass} bg-sky-50 text-[#0785BC] border-sky-100`}>
            <Package className="w-4 h-4" />
          </div>
        );
      case "pengembalian":
      case "return":
        return (
          <div className={`${iconClass} bg-emerald-50 text-emerald-600 border-emerald-100`}>
            <RotateCcw className="w-4 h-4" />
          </div>
        );
      case "kerusakan":
      case "damage":
        return (
          <div className={`${iconClass} bg-rose-50 text-rose-600 border-rose-100`}>
            <AlertTriangle className="w-4 h-4" />
          </div>
        );
      default:
        return (
          <div className={`${iconClass} bg-slate-50 text-slate-500 border-slate-200`}>
            <Bell className="w-4 h-4" />
          </div>
        );
    }
  };

  const displayName = currentUser?.name || currentUser?.full_name || "Admin User";
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .map((w: string) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "A";

  const routeBreadcrumbMap: Record<string, { section: string; title: string }> = {
    "/admin/dashboard_admin": { section: t("admin.nav.main", "Menu Utama"), title: t("admin.nav.dashboard", "Dashboard") },
    "/admin/messages": { section: t("admin.nav.main", "Menu Utama"), title: t("admin.nav.messages", "Pesan & Live Chat") },
    "/admin/barang": { section: t("admin.nav.inventory", "Inventaris"), title: t("admin.nav.items", "Barang Per Item") },
    "/admin/paket": { section: t("admin.nav.inventory", "Inventaris"), title: t("admin.nav.packages", "Paket Barang") },
    "/admin/kategori_barang": { section: t("admin.nav.inventory", "Inventaris"), title: t("admin.nav.categories", "Kategori Barang") },
    "/admin/manajemen_peminjaman": { section: t("admin.nav.operations", "Operasional Sarpras"), title: t("admin.nav.borrowing", "Peminjaman") },
    "/admin/pengembalian": { section: t("admin.nav.operations", "Operasional Sarpras"), title: t("admin.nav.returns", "Pengembalian") },
    "/admin/rekap_laporan": { section: t("admin.nav.operations", "Operasional Sarpras"), title: t("admin.nav.damage", "Laporan Kerusakan") },
    "/admin/manajemen_user": { section: t("admin.nav.system", "Administrasi Sistem"), title: t("admin.nav.users", "Manajemen Pengguna") },
    "/admin/settings": { section: t("admin.nav.system", "Administrasi Sistem"), title: t("admin.nav.settings", "Pengaturan Sistem") },
    "/admin/profile": { section: t("admin.nav.profile", "Profil Saya"), title: t("admin.nav.profile", "Profil Saya") },
  };

  const breadcrumb = routeBreadcrumbMap[pathname] || { section: "Admin", title: "Portal Sarpras" };

  return (
    <header
      className={`h-16 border-b border-slate-200 bg-white/95 backdrop-blur-md flex items-center justify-between px-3 sm:px-6 gap-2 sm:gap-4 sticky top-0 z-20 transition-all duration-200 ${
        scrolled ? "shadow-2xs border-slate-200" : ""
      }`}
    >
      {/* ── Left: Breadcrumb & Search Bar ── */}
      <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
        <button
          type="button"
          onClick={onOpenSidebar}
          className="md:hidden p-2 -ml-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors shrink-0"
          aria-label="Buka Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 shrink-0 font-medium">
          <span className="text-slate-500 font-semibold">{breadcrumb.section}</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
          <span className="text-slate-900 font-bold">{breadcrumb.title}</span>
        </div>

        {showSearch && (
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder={searchPlaceholder || t("admin.nav.search_ph", "Cari data sarpras...")}
              value={searchValue}
              onChange={(e) => onSearchChange?.(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0785BC]/20 focus:border-[#0785BC] transition-all text-slate-800 placeholder-slate-400"
            />
          </div>
        )}
      </div>

      {/* ── Right: Status Kampus, Notifikasi, Settings, Profil ── */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Status Sistem Kampus */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 border border-emerald-200 text-emerald-700">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>{t("admin.nav.sys_active", "Sistem Aktif")}</span>
        </div>

        {/* Language Switcher */}
        <button
          onClick={() => setLang(lang === "id" ? "en" : "id")}
          className="h-8 px-2 rounded-xl text-[11px] font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 flex items-center gap-1.5 border border-transparent hover:border-slate-200 transition-colors"
          title="Language / Bahasa"
        >
          <Languages className="w-3.5 h-3.5" />
          {lang.toUpperCase()}
        </button>

        {/* Theme Switcher */}
        <button
          onClick={toggle}
          className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          title={theme === "dark" ? "Mode Terang / Light" : "Mode Gelap / Dark"}
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Notifications Dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => {
              setShowNotifDropdown(!showNotifDropdown);
              setShowProfileDropdown(false);
            }}
            className="relative p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-xl transition-colors"
            title={t("admin.nav.notif", "Notifikasi")}
          >
            <Bell className="w-4 h-4" />
            {showBadge && unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Popover */}
          {showNotifDropdown && (
            <div className="fixed inset-x-3 top-16 sm:absolute sm:inset-auto sm:right-0 sm:mt-2 w-auto sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 max-h-[calc(100vh-80px)] sm:max-h-[460px] overflow-y-auto animate-scale-in z-50">
              <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-xs text-slate-900">{t("admin.nav.notif_system", "Notifikasi Sistem")}</h3>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-100">
                      {unreadCount} {t("admin.nav.new", "baru")}
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="text-xs text-[#0785BC] hover:underline font-semibold"
                  >
                    {t("admin.nav.mark_all", "Tandai dibaca")}
                  </button>
                )}
              </div>

              <div className="divide-y divide-slate-50">
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center text-slate-400 text-xs">
                    <CheckCircle2 className="w-7 h-7 mx-auto mb-1.5 text-slate-300" />
                    <p>{t("admin.nav.no_notif", "Tidak ada notifikasi baru")}</p>
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif)}
                      className={`px-4 py-3 hover:bg-slate-50 cursor-pointer transition-all group ${
                        !notif.read && !notif.is_read ? "bg-sky-50/40" : ""
                      }`}
                    >
                      <div className="flex gap-2.5">
                        {getNotifIcon(notif.type)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-1">
                            <p className="font-semibold text-xs text-slate-900 leading-snug group-hover:text-[#0785BC] transition-colors truncate">
                              {notif.title}
                            </p>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleClearNotification(notif.id);
                              }}
                              className="text-slate-300 hover:text-slate-500 p-0.5 rounded"
                              title={t("admin.nav.del_notif", "Hapus notifikasi")}
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
                            {notif.message}
                          </p>
                          <div className="flex items-center justify-between mt-1.5 text-[10px]">
                            <span className="text-slate-400">{notif.time}</span>
                            <span className="text-[#0785BC] font-semibold flex items-center gap-0.5 group-hover:underline">
                              {getNotificationActionLabel(notif.type, lang)} &rarr;
                            </span>
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

        {/* Settings button */}
        <Link
          href="/admin/settings"
          className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-xl transition-colors"
          title={t("nav.settings", "Pengaturan")}
        >
          <Settings className="w-4 h-4" />
        </Link>

        {/* User Dropdown */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => {
              setShowProfileDropdown(!showProfileDropdown);
              setShowNotifDropdown(false);
            }}
            className="flex items-center gap-2 pl-2 pr-2.5 py-1 hover:bg-slate-50 rounded-xl transition-colors"
          >
            {currentUser?.foto ? (
              <img
                src={currentUser.foto}
                alt={displayName}
                className="w-8 h-8 rounded-full object-cover border border-slate-200"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-[#0785BC] text-white font-bold text-xs flex items-center justify-center shadow-2xs">
                {initials}
              </div>
            )}
            <div className="text-left hidden md:block">
              <p className="text-xs font-bold text-slate-800 leading-none">{displayName}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {currentUser?.role === "Admin" ? t("profile.role_admin", "Administrator") : t("profile.role_staff", "Petugas")}
              </p>
            </div>
          </button>

          {showProfileDropdown && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 py-1.5 animate-scale-in z-50">
              <div className="px-4 py-2.5 border-b border-slate-100">
                <p className="font-bold text-xs text-slate-900">{displayName}</p>
                <p className="text-[11px] text-slate-400 truncate">{currentUser?.email || "admin@pokada.com"}</p>
              </div>

              <div className="py-1 text-xs">
                <Link
                  href="/admin/profile"
                  onClick={() => setShowProfileDropdown(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  {t("admin.nav.profile", "Profil Saya")}
                </Link>

                <Link
                  href="/admin/settings"
                  onClick={() => setShowProfileDropdown(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <Settings className="w-3.5 h-3.5 text-slate-400" />
                  {t("nav.settings", "Pengaturan")}
                </Link>

                <Link
                  href="/admin/settings?tab=security"
                  onClick={() => setShowProfileDropdown(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <Shield className="w-3.5 h-3.5 text-slate-400" />
                  {t("admin.nav.security", "Keamanan Akun")}
                </Link>
              </div>

              <div className="border-t border-slate-100 pt-1">
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2.5 px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 transition-colors w-full font-semibold"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  {t("nav.logout", "Logout")}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
