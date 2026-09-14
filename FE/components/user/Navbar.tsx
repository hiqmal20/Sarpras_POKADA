"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, MessageSquare, Bell, CheckCircle2, X } from "lucide-react";
import Link from "next/link";
import api, { getCurrentUser } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { getNotificationTargetUrl, getNotificationActionLabel } from "@/lib/notificationHelper";

interface UserNavbarProps {
  /** Controlled search value — pass state + setter if you want two-way binding */
  searchValue?: string;
  onSearchChange?: (value: string) => void;
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
  type: string;
  action_url?: string;
}

export default function UserNavbar({
  searchValue,
  onSearchChange,
  showSearch = true,
}: UserNavbarProps) {
  const [internalSearch, setInternalSearch] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [unreadMsgCount, setUnreadMsgCount] = useState(0);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const notifRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Detect scroll untuk shadow & transisi
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Load notifications & chat unread count
  useEffect(() => {
    async function loadData() {
      try {
        const [notifRes, chatRes] = await Promise.all([
          api.notifications.getAll(),
          api.chats.getAll(),
        ]);

        if (notifRes.status === "success" && Array.isArray(notifRes.data)) {
          const mapped = notifRes.data.map((n: any) => ({
            id: n.id,
            title: n.title,
            message: n.message,
            type: n.type || "sistem",
            action_url: n.action_url,
            is_read: n.is_read,
            created_at: n.created_at,
            time: n.created_at
              ? new Date(n.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB"
              : "Baru saja",
          }));
          setNotifications(mapped);
          const unread = mapped.filter((n: any) => !n.is_read).length;
          setUnreadNotifCount(unread);
        }

        if (chatRes.status === "success" && Array.isArray(chatRes.data)) {
          const totalUnread = chatRes.data.reduce((sum: number, c: any) => sum + (c.unread_count || 0), 0);
          setUnreadMsgCount(totalUnread);
        }
      } catch (err) {
        console.warn("Gagal memuat status notifikasi:", err);
      }
    }

    loadData();

    const handleMessagesRead = () => {
      loadData();
    };
    window.addEventListener("messages-read", handleMessagesRead);

    const socket = getSocket();
    if (socket) {
      socket.on("notification", loadData);
      socket.on("chat_updated", loadData);
      socket.on("new_message", loadData);
      socket.on("messages_read", loadData);
    }

    const interval = setInterval(loadData, 15000);

    return () => {
      clearInterval(interval);
      window.removeEventListener("messages-read", handleMessagesRead);
      if (socket) {
        socket.off("notification", loadData);
        socket.off("chat_updated", loadData);
        socket.off("new_message", loadData);
        socket.off("messages_read", loadData);
      }
    };
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkAllAsRead = async () => {
    try {
      await api.notifications.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadNotifCount(0);
    } catch {
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadNotifCount(0);
    }
  };

  const handleMarkOneAsRead = async (id: string) => {
    try {
      await api.notifications.markAsRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
      setUnreadNotifCount((prev) => Math.max(0, prev - 1));
    } catch {
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
      setUnreadNotifCount((prev) => Math.max(0, prev - 1));
    }
  };

  const handleNotificationClick = async (notif: NotificationItem) => {
    if (!notif.is_read) {
      handleMarkOneAsRead(notif.id);
    }
    setShowNotifDropdown(false);
    const targetUrl = getNotificationTargetUrl(notif, false);
    router.push(targetUrl);
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
          className="relative p-2 rounded-xl text-slate-500 hover:bg-slate-50 transition-colors"
          aria-label="Pesan"
        >
          <MessageSquare className="w-5 h-5" />
          {unreadMsgCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
              {unreadMsgCount}
            </span>
          )}
        </Link>

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifDropdown(!showNotifDropdown)}
            className="relative p-2 rounded-xl text-slate-500 hover:bg-slate-50 transition-colors"
            aria-label="Notifikasi"
          >
            <Bell className="w-5 h-5" />
            {unreadNotifCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {unreadNotifCount}
              </span>
            )}
          </button>

          {showNotifDropdown && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 max-h-[420px] overflow-y-auto animate-fade-in z-50">
              <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-xs text-slate-900">Notifikasi</h3>
                {unreadNotifCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="text-xs text-[#0785BC] hover:underline font-medium"
                  >
                    Tandai semua dibaca
                  </button>
                )}
              </div>

              <div className="divide-y divide-slate-50">
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center text-slate-400 text-xs">
                    <CheckCircle2 className="w-7 h-7 mx-auto mb-2 text-slate-200" />
                    <p>Tidak ada notifikasi baru</p>
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif)}
                      className={`px-4 py-3 hover:bg-blue-50/50 cursor-pointer transition-all group ${
                        !notif.is_read ? "bg-blue-50/40" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <p className="font-semibold text-xs text-slate-900 group-hover:text-[#0785BC] transition-colors">{notif.title}</p>
                        {!notif.is_read && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkOneAsRead(notif.id);
                            }}
                            className="text-[10px] text-[#0785BC] hover:underline shrink-0"
                          >
                            Tandai dibaca
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{notif.message}</p>
                      <div className="flex items-center justify-between mt-2 text-[10px]">
                        <span className="text-slate-400">{notif.time}</span>
                        <span className="text-[#0785BC] font-semibold flex items-center gap-0.5 group-hover:underline">
                          {getNotificationActionLabel(notif.type)} &rarr;
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
