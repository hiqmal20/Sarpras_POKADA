"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Search,
  Send,
  Loader2,
  Shield,
  MessageSquare,
  Check,
  CheckCheck,
  Headphones,
  Pencil,
  Trash2,
  Eraser,
  ChevronDown,
  Reply,
  X,
  Clock3,
  CircleDot,
  ArrowLeft,
} from "lucide-react";
import api, { getCurrentUser } from "@/lib/api";
import { getSocket, joinChatRoom } from "@/lib/socket";
import {
  formatChatDateBadge,
  isDifferentDay,
  formatLastSeen,
  parseMessageContent,
  getCleanMessagePreview,
  resolveReplyInfo,
  ReplyInfo,
} from "@/lib/chatHelper";
import { UserLayout } from "@/components/user";
import { toast } from "@/components/Toast";
import { useLanguage } from "@/lib/i18n";

interface Conversation {
  id: string;
  adminId?: string;
  title: string;
  preview: string;
  time: string;
  unread?: boolean;
  isOnline?: boolean;
  lastSeen?: string | null;
}

interface Message {
  id: string;
  sender_id: string;
  isMe: boolean;
  senderName: string;
  senderRole: string;
  senderFoto?: string | null;
  text: string;
  time: string;
  rawDate?: string;
  isRead?: boolean;
  reply_to_message_id?: string | null;
  reply_to?: any;
  replyTo?: ReplyInfo | null;
}

export default function UserMessagesPage() {
  const { t, lang } = useLanguage();
  const bottomRef = useRef<HTMLDivElement>(null);

  const [currentUser, setCurrentUser] = useState<any>(null);
  const currentUserRef = useRef<any>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [searchConv, setSearchConv] = useState("");
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [adminOnline, setAdminOnline] = useState(false);
  const [adminLastSeen, setAdminLastSeen] = useState<string | null>(null);
  const [isAdminTyping, setIsAdminTyping] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [openMessageMenu, setOpenMessageMenu] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<ReplyInfo | null>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);

  const activeIdRef = useRef<string | null>(null);
  const convAdminRef = useRef<Record<string, string>>({});
  const [convAdminMap, setConvAdminMap] = useState<Record<string, string>>({});
  const presenceSetRef = useRef<Set<string>>(new Set());

  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  const [onlineStaffIds, setOnlineStaffIds] = useState<Set<string>>(new Set());
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const [lastSeenMap, setLastSeenMap] = useState<Record<string, string>>({});

  const handleTouchStart = (m: Message) => {
    touchTimeoutRef.current = setTimeout(() => {
      handleStartReply(m);
      if (typeof window !== "undefined" && "vibrate" in navigator) {
        try {
          navigator.vibrate(40);
        } catch {
          // ignore
        }
      }
    }, 450);
  };

  const handleTouchEnd = () => {
    if (touchTimeoutRef.current) {
      clearTimeout(touchTimeoutRef.current);
      touchTimeoutRef.current = null;
    }
  };

  const handleScrollToMessage = (targetId: string) => {
    if (!targetId) return;
    const target = document.getElementById(`msg-${targetId}`);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightedMessageId(targetId);
      if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current);
      highlightTimeoutRef.current = setTimeout(() => {
        setHighlightedMessageId(null);
      }, 1800);
    } else {
      const exists = messages.some((m) => m.id === targetId);
      if (exists) {
        setTimeout(() => {
          const el = document.getElementById(`msg-${targetId}`);
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
            setHighlightedMessageId(targetId);
            if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current);
            highlightTimeoutRef.current = setTimeout(() => {
              setHighlightedMessageId(null);
            }, 1800);
          }
        }, 80);
      } else {
        toast.info("Pesan asli tidak ditemukan atau telah dihapus.");
      }
    }
  };

  const isStaffRole = (role?: string) => {
    const normalized = String(role || "").trim().toLowerCase();
    return ["admin", "administrator", "petugas", "staff"].includes(normalized);
  };

  const getConvStatus = useCallback(
    (conv: Conversation) => {
      const adminId = conv.adminId || convAdminMap[conv.id];
      if (adminId) {
        const isOnline = onlineStaffIds.has(adminId) || onlineUserIds.has(adminId);
        const lastSeen = lastSeenMap[adminId] || conv.lastSeen || null;
        return { isOnline, lastSeen };
      }
      const isOnline = onlineStaffIds.size > 0;
      const staffLastSeens = Object.values(lastSeenMap);
      const lastSeen = isOnline ? null : (staffLastSeens[0] || conv.lastSeen || null);
      return { isOnline, lastSeen };
    },
    [onlineStaffIds, onlineUserIds, lastSeenMap, convAdminMap]
  );

  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [, setPresenceTick] = useState(0);

  // Refresh "X menit lalu" setiap 60 detik agar terlihat live
  useEffect(() => {
    const id = setInterval(() => setPresenceTick((t) => t + 1), 60000);
    return () => clearInterval(id);
  }, []);

  // Close message dropdown menu on click outside or escape
  useEffect(() => {
    if (!openMessageMenu) return;
    const handleClickOutside = () => setOpenMessageMenu(null);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenMessageMenu(null);
    };
    window.addEventListener("click", handleClickOutside);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("click", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [openMessageMenu]);

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    bottomRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isAdminTyping]);

  // Sync current user on mount
  useEffect(() => {
    const user = getCurrentUser();
    if (user) setCurrentUser(user);
  }, []);

  const playNotificationSound = () => {
    try {
      const ctxCtor = window.AudioContext || (window as any).webkitAudioContext;
      if (!ctxCtor) return;
      const ctx = new ctxCtor();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = 800;
      gain.gain.value = 0.05;
      osc.start();
      setTimeout(() => {
        osc.stop();
        ctx.close();
      }, 200);
    } catch (_) {}
  };

  // Fetch or create user chat session connected to admin
  const loadConversations = useCallback(async () => {
    try {
      const res = await api.chats.getAll();
      if (res.status === "success" && Array.isArray(res.data) && res.data.length > 0) {
        const presenceSet = presenceSetRef.current;
        const initialStaffOnline: string[] = [];
        const initialLastSeen: Record<string, string> = {};

        const mapped: Conversation[] = (res.data as any[]).map((c) => {
          const partner = c.admin || {};
          const adminId = String(partner.id || (c as any).admin_id || "");
          if (adminId) {
            convAdminRef.current[String(c.id)] = adminId;
            if (c.is_partner_online) initialStaffOnline.push(adminId);
            if (c.partner_last_seen) initialLastSeen[adminId] = c.partner_last_seen;
          } else {
            if (c.is_partner_online) initialStaffOnline.push("__general_staff__");
            if (c.partner_last_seen) initialLastSeen["__general_staff__"] = c.partner_last_seen;
          }
          const online = presenceSet.size > 0
            ? (adminId ? presenceSet.has(adminId) : (presenceSet.size > 0 || initialStaffOnline.length > 0))
            : Boolean(c.is_partner_online);
          return {
            id: c.id,
            adminId,
            title: partner.name || c.subject || "Admin Support Sarpras",
            preview: c.last_message || c.subject || "Percakapan aktif dengan Admin",
            time: c.last_message_at || c.updated_at
              ? new Date(c.last_message_at || c.updated_at).toLocaleTimeString("id-ID", {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "Baru saja",
            unread: Boolean(c.unread_count && c.unread_count > 0),
            isOnline: online,
            lastSeen: c.partner_last_seen || null,
          };
        });

        const adminMap: Record<string, string> = {};
        (res.data as any[]).forEach((c) => {
          const partner = c.admin || {};
          const adminId = String(partner.id || (c as any).admin_id || "");
          if (adminId) adminMap[String(c.id)] = adminId;
        });
        setConvAdminMap((prev) => ({ ...prev, ...adminMap }));

        if (initialStaffOnline.length > 0) {
          setOnlineStaffIds((prev) => new Set([...prev, ...initialStaffOnline]));
        }
        if (Object.keys(initialLastSeen).length > 0) {
          setLastSeenMap((prev) => ({ ...initialLastSeen, ...prev }));
        }

        // Sinkron banner chat aktif ke admin lawan bicara
        const target = mapped.find((m) => m.id === activeIdRef.current) || mapped[0];
        if (target) {
          setAdminOnline(Boolean(target.isOnline));
          setAdminLastSeen(target.lastSeen || null);
          if (!activeIdRef.current) {
            setActiveId(target.id);
          }
        }

        // Terapkan kembali status realtime yang mungkin diterima sebelum API selesai.
        const mappedWithPresence = mapped.map((conv) => ({
          ...conv,
          isOnline: conv.adminId ? presenceSetRef.current.has(String(conv.adminId)) : conv.isOnline,
        }));
        setConversations(mappedWithPresence);
        const activeWithPresence = mappedWithPresence.find((m) => m.id === activeIdRef.current) || mappedWithPresence[0];
        setAdminOnline(Boolean(activeWithPresence?.isOnline));
        mappedWithPresence.forEach((conv) => joinChatRoom(conv.id));

        if (!activeIdRef.current && mapped.length > 0) {
          setActiveId(mapped[0].id);
        }
      } else {
        const user = getCurrentUser();
        const createRes = await api.chats.create({
          subject: "Bantuan & Konsultasi Admin Sarpras",
          user_id: user?.id,
        });

        if (createRes.status === "success" && createRes.data) {
          const newConv: Conversation = {
            id: createRes.data.id,
            title: "Admin Support Sarpras",
            preview: "Percakapan baru dengan Admin",
            time: "Baru saja",
            unread: false,
            isOnline: false,
          };
          setConversations([newConv]);
          joinChatRoom(newConv.id);
          setActiveId(newConv.id);
        }
      }
    } catch (err) {
      console.warn("Gagal memuat percakapan user:", err);
    } finally {
      setLoadingChats(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();

    // Reconcile presence secara berkala sebagai fallback jika event Socket.IO
    // terlewat ketika browser/login melakukan reconnect. Ini bukan refresh
    // halaman; hanya mengambil status presence terbaru dan mempertahankan UI.
    const presenceSync = window.setInterval(async () => {
      try {
        const res = await api.chats.getAll();
        if (res.status !== "success" || !Array.isArray(res.data)) return;
        const serverPresence = new Map<string, boolean>();
        (res.data as any[]).forEach((chat) => {
          const partnerId = String(chat.admin?.id || chat.admin_id || "");
          if (partnerId) serverPresence.set(partnerId, Boolean(chat.is_partner_online));
        });
        setConversations((prev) => prev.map((chat) =>
          serverPresence.has(String(chat.adminId))
            ? { ...chat, isOnline: serverPresence.get(String(chat.adminId)) }
            : chat
        ));
        const activeAdmin = activeIdRef.current ? convAdminRef.current[activeIdRef.current] : "";
        if (activeAdmin && serverPresence.has(activeAdmin)) {
          setAdminOnline(Boolean(serverPresence.get(activeAdmin)));
        }
      } catch (_) {
        // Socket.IO tetap menjadi sumber realtime utama.
      }
    }, 3000);
    return () => window.clearInterval(presenceSync);
  }, [loadConversations]);

  // Sinkron banner Online/LastSeen mengikuti percakapan yang sedang dibuka & presence realtime
  useEffect(() => {
    if (!activeId) {
      setAdminOnline(onlineStaffIds.size > 0);
      setAdminLastSeen(Object.values(lastSeenMap)[0] || null);
      return;
    }
    const conv = conversations.find((c) => c.id === activeId);
    if (conv) {
      const status = getConvStatus(conv);
      setAdminOnline(status.isOnline);
      setAdminLastSeen(status.lastSeen);
    } else {
      setAdminOnline(onlineStaffIds.size > 0);
      setAdminLastSeen(Object.values(lastSeenMap)[0] || null);
    }
  }, [activeId, conversations, getConvStatus, onlineStaffIds, lastSeenMap]);

  // Load messages from database for the active chat
  const fetchMessages = useCallback(
    async (isPolling = false) => {
      if (!activeId) return;
      if (!isPolling) setLoadingMessages(true);

      try {
        const res = await api.chats.getMessages(activeId);
        if (res.status === "success" && Array.isArray(res.data)) {
          const user = currentUser || getCurrentUser();
          const userId = user?.id;

          const mapped: Message[] = (res.data as any[]).map((m) => {
            const sender = m.sender || {};
            const senderRole = String(sender.role || "");
            const sid = String(sender.id || m.sender_id || "");
            const isMe = sid
              ? Boolean(userId && sid === String(userId))
              : !["admin", "administrator", "petugas", "staff"].includes(senderRole.toLowerCase());
            const parsed = parseMessageContent(m.message);
            const replyInfo = resolveReplyInfo(m, userId);

            return {
              id: String(m.id),
              sender_id: String(m.sender_id || sender.id || ""),
              isMe,
              senderName: isMe
                ? user?.name || "Saya"
                : sender.name || "Admin Support Sarpras",
              senderRole: isMe ? "user" : "admin",
              senderFoto: sender.foto || null,
              text: parsed.text,
              rawDate: m.created_at || new Date().toISOString(),
              time: m.created_at
                ? new Date(m.created_at).toLocaleTimeString("id-ID", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "",
              isRead: Boolean(m.is_read),
              reply_to_message_id: m.reply_to_message_id || null,
              reply_to: m.reply_to || null,
              replyTo: replyInfo,
            };
          });

          setMessages((previous) => {
            // Pertahankan status dibaca agar tidak revert saat polling race dengan event read (cegah flicker 2→1)
            const merged = mapped.map((m) => {
              const existing = previous.find((p) => p.id === m.id);
              if (existing?.isRead && !m.isRead) return { ...m, isRead: true };
              return m;
            });
            const pending = previous.filter(
              (message) =>
                message.id.startsWith("temp-") &&
                !merged.some((item) => item.text === message.text)
            );
            const combined = [...merged, ...pending];
            const seen = new Set<string>();
            const next = combined.filter((m) => {
              if (!m.id || seen.has(m.id)) return false;
              seen.add(m.id);
              return true;
            });
            const changed =
              next.length !== previous.length ||
              next.some(
                (m, idx) =>
                  !previous[idx] ||
                  previous[idx].id !== m.id ||
                  previous[idx].isRead !== m.isRead ||
                  previous[idx].text !== m.text
              );
            return changed ? next : previous;
          });
        }
      } catch (err) {
        console.warn("Gagal mengambil pesan:", err);
      } finally {
        if (!isPolling) setLoadingMessages(false);
      }
    },
    [activeId, currentUser]
  );

  // When activeId changes, join room, mark as read, and fetch
  useEffect(() => {
    if (!activeId) return;

    setReplyingTo(null);
    joinChatRoom(activeId);
    fetchMessages(false);

    // Tandai pesan sudah dibaca via API & Socket
    api.chats.markAsRead(activeId);
    const socket = getSocket();
    if (socket?.connected) {
      socket.emit("mark_as_read", activeId);
    }
    window.dispatchEvent(new CustomEvent("messages-read", { detail: { chatId: activeId } }));

    // Reset unread status di conversation list
    setConversations((prev) =>
      prev.map((c) => (c.id === activeId ? { ...c, unread: false } : c))
    );

    const interval = setInterval(() => {
      fetchMessages(true);
    }, 3000);

    return () => clearInterval(interval);
  }, [activeId, fetchMessages]);

  // Setup WebSocket listeners
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleNewMessage = (msg: any) => {
      if (!msg) return;
      const incomingChatId = String(msg.chat_id || msg.chatId || "");
      const currentActiveId = String(activeIdRef.current || "");
      const user = currentUserRef.current || getCurrentUser();
      const userId = user?.id;
      const sender = msg.sender || {};
      const senderRole = String(sender.role || "");
      const senderId = String(sender.id || msg.sender_id || "");
      // Pesan sendiri = senderId sama dengan id saya; bila senderId kosong,
      // tentukan dari role (Admin/Petugas = lawan bicara, selain itu = saya).
      const isMe = senderId
        ? Boolean(userId && senderId === String(userId))
        : !["admin", "administrator", "petugas", "staff"].includes(senderRole.toLowerCase());

      if (incomingChatId === currentActiveId) {
        const cleanText = getCleanMessagePreview(msg.message || "");
        const replyInfo = resolveReplyInfo(msg, userId);

        const formatted: Message = {
          id: String(msg.id || `msg-${Date.now()}`),
          sender_id: senderId,
          isMe,
          senderName: isMe ? user?.name || "Saya" : sender.name || "Admin Support Sarpras",
          senderRole: isMe ? "user" : "admin",
          senderFoto: sender.foto || null,
          text: cleanText,
          rawDate: msg.created_at || new Date().toISOString(),
          time: msg.created_at
            ? new Date(msg.created_at).toLocaleTimeString("id-ID", {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "Baru saja",
          isRead: Boolean(msg.is_read),
          reply_to_message_id: msg.reply_to_message_id || null,
          reply_to: msg.reply_to || null,
          replyTo: replyInfo,
        };

        setMessages((prev) => {
          if (prev.some((m) => String(m.id) === formatted.id)) {
            return prev.filter(
              (m) => !(m.id.startsWith("temp-") && (m.text === formatted.text || m.id === msg.tempId))
            );
          }
          const tempIdx = prev.findIndex(
            (m) => m.id.startsWith("temp-") && (m.text === formatted.text || m.id === msg.tempId)
          );
          if (tempIdx >= 0) {
            const next = [...prev];
            next[tempIdx] = formatted;
            return next;
          }
          return [...prev, formatted];
        });

        if (!isMe && currentActiveId) {
          api.chats.markAsRead(currentActiveId);
          if (socket.connected) socket.emit("mark_as_read", currentActiveId);
          window.dispatchEvent(new CustomEvent("messages-read", { detail: { chatId: currentActiveId } }));
        }
      } else if (!isMe) {
        playNotificationSound();
      }

      if (!isMe && senderId && incomingChatId) {
        convAdminRef.current[incomingChatId] = senderId;
        if (isStaffRole(senderRole)) {
          setOnlineStaffIds((prev) => new Set(prev).add(senderId));
        }
      }

      setConversations((prev) =>
        prev.map((c) =>
          String(c.id) === incomingChatId
            ? {
                ...c,
                adminId: !isMe && senderId ? senderId : c.adminId,
                title: !isMe && sender.name ? sender.name : c.title,
                preview: msg.message || c.preview,
                time: "Baru saja",
                unread: incomingChatId !== currentActiveId && !isMe,
              }
            : c
        )
      );
    };

    const handleMessagesRead = (data: { chatId: string; readBy?: string }) => {
      // Abaikan echo dari diri sendiri (pengaman lapis kedua setelah BE memakai
      // socket.to / except): event ini hanya valid bila readBy = lawan bicara.
      const me = String(currentUserRef.current?.id || getCurrentUser()?.id || "");
      if (data.readBy && me && String(data.readBy) === me) return;
      if (data.chatId === activeIdRef.current) {
        // Semua pesan milik user ditandai isRead: true (centang 2 biru/cyan)
        setMessages((prev) =>
          prev.map((m) => (m.isMe ? { ...m, isRead: true } : m))
        );
      }
      setConversations((prev) =>
        prev.map((c) => (c.id === data.chatId ? { ...c, unread: false } : c))
      );
    };

    const handleMessageUpdated = (data: any) => {
      if (!data) return;
      const msgId = String(data.id || data.messageId || "");
      const newText = data.message || data.text || "";
      setMessages((prev) =>
        prev.map((m) => (m.id === msgId ? { ...m, text: newText } : m))
      );
    };

    const handleMessageDeleted = (data: { chatId?: string; messageId?: string }) => {
      if (!data?.messageId) return;
      setMessages((prev) => prev.filter((m) => m.id !== String(data.messageId)));
    };

    const handleChatCleared = (data: { chatId: string }) => {
      if (data.chatId === activeIdRef.current) {
        setMessages([]);
      }
      setConversations((prev) =>
        prev.map((c) =>
          c.id === data.chatId ? { ...c, preview: "(Riwayat dibersihkan)" } : c
        )
      );
    };

    const handleChatDeleted = (data: { chatId: string }) => {
      setConversations((prev) => {
        const remaining = prev.filter((c) => c.id !== data.chatId);
        if (activeIdRef.current === data.chatId) {
          setActiveId(remaining[0]?.id || null);
          setMessages([]);
        }
        return remaining;
      });
    };

    const handleUserTyping = (data: { chatId?: string; user?: any }) => {
      if (data?.chatId === activeIdRef.current && !["mahasiswa", "dosen"].includes(String(data.user?.role || "").toLowerCase())) {
        setIsAdminTyping(true);
      }
    };

    const handleUserStopTyping = (data: { chatId?: string }) => {
      if (data?.chatId === activeIdRef.current) {
        setIsAdminTyping(false);
      }
    };

    const handlePresenceSnapshot = (users: { role?: string; userId?: string; id?: string }[]) => {
      if (Array.isArray(users)) {
        const allIds: string[] = [];
        const staffIds: string[] = [];
        users.forEach((u) => {
          const uid = String((u as any).userId || (u as any).id || "").trim();
          if (uid) {
            allIds.push(uid);
            if (isStaffRole(u.role) || Object.values(convAdminRef.current).includes(uid)) {
              staffIds.push(uid);
            }
          }
        });
        setOnlineUserIds(new Set(allIds));
        setOnlineStaffIds(new Set(staffIds));
        presenceSetRef.current = new Set(allIds);

        setConversations((prev) =>
          prev.map((c) => {
            const adminId = c.adminId || convAdminRef.current[c.id];
            const isOnline = adminId ? staffIds.includes(adminId) : staffIds.length > 0;
            return { ...c, isOnline };
          })
        );
      }
    };

    const handleUserOnline = (data: { role?: string; userId?: string; id?: string }) => {
      const userId = String((data as any).userId || (data as any).id || "").trim();
      if (!userId) return;
      setOnlineUserIds((prev) => new Set(prev).add(userId));
      presenceSetRef.current.add(userId);
      if (isStaffRole(data?.role) || Object.values(convAdminRef.current).includes(userId)) {
        setOnlineStaffIds((prev) => new Set(prev).add(userId));
      }
      setConversations((prev) =>
        prev.map((c) => {
          const adminId = c.adminId || convAdminRef.current[c.id];
          if (adminId === userId || (!adminId && isStaffRole(data?.role))) {
            return { ...c, isOnline: true };
          }
          return c;
        })
      );
    };

    const handleUserOffline = (data: { role?: string; lastSeen?: string; userId?: string; id?: string }) => {
      const userId = String((data as any).userId || (data as any).id || "").trim();
      if (!userId) return;
      setOnlineUserIds((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
      presenceSetRef.current.delete(userId);
      const isStaff = isStaffRole(data?.role) || Object.values(convAdminRef.current).includes(userId);
      if (isStaff) {
        setOnlineStaffIds((prev) => {
          const next = new Set(prev);
          next.delete(userId);
          next.delete("__general_staff__");
          return next;
        });
      }
      if (data.lastSeen) {
        setLastSeenMap((prev) => ({ ...prev, [userId]: String(data.lastSeen) }));
      }
      setConversations((prev) =>
        prev.map((c) => {
          const adminId = c.adminId || convAdminRef.current[c.id];
          if (adminId === userId) {
            return { ...c, isOnline: false, lastSeen: data.lastSeen || c.lastSeen };
          }
          return c;
        })
      );
    };

    const handleOnlineUsersList = (data: { onlineUserIds?: string[]; onlineStaffIds?: string[]; onlineProfiles?: any[]; lastSeenMap?: Record<string, string> } | string[]) => {
      const ids = (Array.isArray(data) ? data : data?.onlineUserIds || [])
        .map((id) => String(id || "").trim())
        .filter((id) => id && id !== "undefined" && id !== "null");
      setOnlineUserIds(new Set(ids));
      presenceSetRef.current = new Set(ids);

      let detectedStaffIds: string[] = [];
      if (!Array.isArray(data)) {
        if (data?.onlineStaffIds && Array.isArray(data.onlineStaffIds)) {
          detectedStaffIds = data.onlineStaffIds.map(String);
          setOnlineStaffIds(new Set(detectedStaffIds));
        } else if (data?.onlineProfiles && Array.isArray(data.onlineProfiles)) {
          detectedStaffIds = data.onlineProfiles
            .filter((p: any) => isStaffRole(p.role) || Object.values(convAdminRef.current).includes(String(p.userId || p.id)))
            .map((p: any) => String(p.userId || p.id));
          setOnlineStaffIds(new Set(detectedStaffIds));
        }
        if (data?.lastSeenMap) {
          setLastSeenMap((prev) => ({ ...prev, ...data.lastSeenMap }));
        }
      }

      setConversations((prev) =>
        prev.map((c) => {
          const adminId = c.adminId || convAdminRef.current[c.id];
          const isOnline = adminId
            ? ids.includes(adminId)
            : detectedStaffIds.length > 0;
          return { ...c, isOnline };
        })
      );
    };

    const handleUserStatusChange = (data: { role?: string; online?: boolean; last_seen?: string; userId?: string; id?: string }) => {
      const userId = String((data as any).userId || (data as any).id || "").trim();
      if (!userId) return;

      const isStaff = isStaffRole(data.role) || Object.values(convAdminRef.current).includes(userId);

      if (data.last_seen) {
        setLastSeenMap((prev) => ({ ...prev, [userId]: String(data.last_seen) }));
      }

      setOnlineUserIds((prev) => {
        const next = new Set(prev);
        if (data.online) next.add(userId);
        else next.delete(userId);
        return next;
      });

      if (isStaff) {
        setOnlineStaffIds((prev) => {
          const next = new Set(prev);
          if (data.online) {
            next.add(userId);
          } else {
            next.delete(userId);
            next.delete("__general_staff__");
          }
          return next;
        });
      }

      setConversations((prev) =>
        prev.map((c) => {
          const adminId = c.adminId || convAdminRef.current[c.id];
          if (adminId === userId) {
            return {
              ...c,
              isOnline: Boolean(data.online),
              lastSeen: data.last_seen || c.lastSeen,
            };
          }
          return c;
        })
      );
    };

    const handleMessageSent = (data: { success: boolean; tempId?: string; message: any }) => {
      if (!data?.message) return;
      const realMsg = data.message;
      const realId = String(realMsg.id);

      setMessages((prev) => {
        const alreadyExists = prev.some((m) => m.id === realId);
        if (alreadyExists) {
          return prev.filter(
            (m) =>
              !(
                (data.tempId && m.id === data.tempId) ||
                (m.id.startsWith("temp-") && m.text === realMsg.message)
              )
          );
        }

        let replaced = false;
        return prev.map((m) => {
          if (
            !replaced &&
            ((data.tempId && m.id === data.tempId) ||
              (m.id.startsWith("temp-") && m.text === realMsg.message))
          ) {
            replaced = true;
            return {
              ...m,
              id: realId,
              rawDate: realMsg.created_at || m.rawDate,
              time: realMsg.created_at
                ? new Date(realMsg.created_at).toLocaleTimeString("id-ID", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : m.time,
              isRead: Boolean(realMsg.is_read),
            };
          }
          return m;
        });
      });
    };

    socket.on("message_sent", handleMessageSent);
    socket.on("new_message", handleNewMessage);
    socket.on("messages_read", handleMessagesRead);
    socket.on("message_updated", handleMessageUpdated);
    socket.on("message_deleted", handleMessageDeleted);
    socket.on("chat_cleared", handleChatCleared);
    socket.on("chat_deleted", handleChatDeleted);
    socket.on("user_typing", handleUserTyping);
    socket.on("user_stop_typing", handleUserStopTyping);
    socket.on("presence_snapshot", handlePresenceSnapshot);
    socket.on("online_users_list", handleOnlineUsersList);
    socket.on("user_online", handleUserOnline);
    socket.on("user_offline", handleUserOffline);
    socket.on("user_status_change", handleUserStatusChange);

    const requestPresence = () => {
      const s = getSocket();
      if (s && s.connected) {
        s.emit("get_online_users");
        s.emit("check_online_users");
      }
    };

    // Minta snapshot segera saat halaman/socket aktif dan setiap reconnect.
    requestPresence();
    const handleSocketReconnect = () => requestPresence();
    const handleSocketDisconnect = () => {
      // Jangan menunggu pindah halaman: jika koneksi socket user putus,
      // refresh snapshot ketika koneksi kembali agar status admin langsung akurat.
      setIsAdminTyping(false);
    };
    socket.on("connect", handleSocketReconnect);
    socket.on("disconnect", handleSocketDisconnect);
    window.addEventListener("socket-connected", handleSocketReconnect);

    if (socket.connected) requestPresence();
    // Backup retries untuk memastikan snapshot diminta jika socket baru terhubung beberapa saat setelah mount
    const t1 = setTimeout(requestPresence, 400);
    const t2 = setTimeout(requestPresence, 1200);
    const t3 = setTimeout(requestPresence, 3000);

    // Fallback ringan berbasis socket (bukan HTTP polling), untuk menangani
    // event presence yang terlewat saat koneksi sempat reconnect.
    const presenceInterval = setInterval(requestPresence, 15000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearInterval(presenceInterval);
      socket.off("connect", handleSocketReconnect);
      socket.off("disconnect", handleSocketDisconnect);
      window.removeEventListener("socket-connected", handleSocketReconnect);
      socket.off("message_sent", handleMessageSent);
      socket.off("new_message", handleNewMessage);
      socket.off("messages_read", handleMessagesRead);
      socket.off("message_updated", handleMessageUpdated);
      socket.off("message_deleted", handleMessageDeleted);
      socket.off("chat_cleared", handleChatCleared);
      socket.off("chat_deleted", handleChatDeleted);
      socket.off("user_typing", handleUserTyping);
      socket.off("user_stop_typing", handleUserStopTyping);
      socket.off("presence_snapshot", handlePresenceSnapshot);
      socket.off("online_users_list", handleOnlineUsersList);
      socket.off("user_online", handleUserOnline);
      socket.off("user_offline", handleUserOffline);
      socket.off("user_status_change", handleUserStatusChange);
    };
  }, []);

  // Handle typing input
  const handleInputChange = (value: string) => {
    setInput(value);

    const socket = getSocket();
    if (socket && activeId) {
      socket.emit("typing", activeId);

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit("stop_typing", activeId);
      }, 1500);
    }
  };

  // Send message to Database and Admin
  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = input.trim();
    if (!text || !activeId || sending) return;

    const currentReply = replyingTo;
    setReplyingTo(null);
    setSending(true);
    setInput("");

    const socket = getSocket();
    if (socket) {
      socket.emit("stop_typing", activeId);
    }

    const tempId = `temp-${Date.now()}`;
    const nowIso = new Date().toISOString();
    const optimisticMsg: Message = {
      id: tempId,
      sender_id: currentUser?.id || "me",
      isMe: true,
      senderName: currentUser?.name || "Saya",
      senderRole: "user",
      text: text,
      rawDate: nowIso,
      time: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
      isRead: false,
      reply_to_message_id: currentReply?.id || null,
      replyTo: currentReply,
    };

    setMessages((prev) => [...prev, optimisticMsg]);

    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeId ? { ...c, preview: text, time: "Baru saja" } : c
      )
    );

    try {
      if (socket && socket.connected) {
        socket.emit("send_message", {
          chatId: activeId,
          message: text,
          reply_to_message_id: currentReply?.id || null,
          tempId,
        });
      } else {
        const result = await api.chats.sendMessage(activeId, {
          message: text,
          reply_to_message_id: currentReply?.id || null,
        });
        if (result.status !== "success") {
          setMessages((prev) => prev.filter((message) => message.id !== tempId));
        } else if (result.data) {
          const realId = String(result.data.id);
          const resolvedReply = resolveReplyInfo(result.data, currentUser?.id) || currentReply;
          setMessages((prev) => {
            const alreadyExists = prev.some((m) => m.id === realId);
            if (alreadyExists) {
              return prev.filter((m) => m.id !== tempId);
            }
            return prev.map((m) =>
              m.id === tempId
                ? {
                    ...m,
                    id: realId,
                    rawDate: result.data.created_at || m.rawDate,
                    time: result.data.created_at
                      ? new Date(result.data.created_at).toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : m.time,
                    isRead: Boolean(result.data.is_read),
                    replyTo: resolvedReply,
                    reply_to_message_id: result.data.reply_to_message_id || currentReply?.id || null,
                  }
                : m
            );
          });
        }
      }
    } catch (err) {
      console.error("Gagal mengirim pesan ke database:", err);
    } finally {
      setSending(false);
    }
  };

  const handleStartReply = (m: Message) => {
    const cleanSnippet = getCleanMessagePreview(m.text);
    setReplyingTo({
      id: m.id,
      senderName: m.isMe ? "Anda" : m.senderName,
      text: cleanSnippet.length > 120 ? cleanSnippet.slice(0, 117) + "..." : cleanSnippet,
      senderId: m.sender_id,
    });
    setEditingMessageId(null);
    setOpenMessageMenu(null);
    setTimeout(() => messageInputRef.current?.focus(), 50);
  };

  const handleEditMessage = async (message: Message) => {
    if (!activeId || !editingText.trim()) return;
    const newText = editingText.trim();
    try {
      const res = await api.chats.updateMessage(activeId, message.id, newText);
      if (res.status === "success") {
        setMessages((prev) =>
          prev.map((item) => (item.id === message.id ? { ...item, text: newText } : item))
        );
        const socket = getSocket();
        if (socket?.connected) {
          socket.emit("edit_message", {
            chatId: activeId,
            messageId: message.id,
            message: newText,
          });
        }
        setEditingMessageId(null);
        setEditingText("");
      }
    } catch (err: any) {
      toast.error(err.message || "Gagal mengedit pesan.", "Gagal");
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!activeId || !window.confirm("Hapus pesan ini?")) return;
    try {
      const res = await api.chats.deleteMessage(activeId, messageId);
      if (res.status === "success") {
        setMessages((prev) => prev.filter((item) => item.id !== messageId));
        const socket = getSocket();
        if (socket?.connected) {
          socket.emit("delete_message", { chatId: activeId, messageId });
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Gagal menghapus pesan.", "Gagal");
    }
  };

  const handleClearChat = async () => {
    if (!activeId || !window.confirm("Bersihkan seluruh pesan dalam chat ini?")) return;
    try {
      const socket = getSocket();
      const res = await api.chats.clearMessages(activeId);
      if (res.status === "success") {
        setMessages([]);
        socket?.emit("clear_chat", { chatId: activeId });
        toast.success("Seluruh pesan berhasil dibersihkan.", "Chat Dibersihkan");
      }
    } catch (err: any) {
      toast.error(err.message || "Gagal membersihkan chat.", "Gagal");
    }
  };

  const handleDeleteChat = async () => {
    if (!activeId || !window.confirm("Hapus seluruh chat ini?")) return;
    try {
      const socket = getSocket();
      if (socket?.connected) {
        socket.emit("delete_chat", activeId);
      }
      const res = await api.chats.deleteChat(activeId);
      if (res.status === "success") {
        const remaining = conversations.filter((item) => item.id !== activeId);
        setConversations(remaining);
        setActiveId(remaining[0]?.id || null);
        setMessages([]);
        toast.success("Percakapan berhasil dihapus.", "Dihapus");
      }
    } catch (err: any) {
      toast.error(err.message || "Gagal menghapus percakapan.", "Gagal");
    }
  };

  const filteredConvs = conversations.filter((c) =>
    !searchConv || c.title.toLowerCase().includes(searchConv.toLowerCase())
  );

  return (
    <UserLayout fullWidth={true} showSearch={false} hideMobileTabs={Boolean(activeId)}>
      <div className="flex min-w-0 h-full min-h-[32rem] flex-col overflow-hidden bg-white lg:flex-row">
        {/* ── Left Pane: Conversation List ── */}
        <div className={`w-full shrink-0 bg-white border-b border-slate-100 flex flex-col h-full lg:w-80 lg:border-b-0 lg:border-r ${activeId ? "hidden lg:flex" : "flex"}`}>
          {/* Header */}
          <div className="p-4 border-b border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-slate-900">{t("chat.user_title", "Pesan Bantuan")}</h2>
              <span
                className={`w-2.5 h-2.5 rounded-full transition-colors duration-200 ${
                  adminOnline ? "bg-emerald-500 animate-pulse shadow-[0_0_6px_rgba(16,185,129,0.7)]" : "bg-slate-300"
                }`}
                title={adminOnline ? t("msg.online", "Admin Online — siap membalas") : `Admin Offline — ${formatLastSeen(adminLastSeen, false).text}`}
              />
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder={t("chat.search_conv", "Cari percakapan...")}
                value={searchConv}
                onChange={(e) => setSearchConv(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0785BC] transition-all"
              />
            </div>
          </div>

          {/* Conversation Items */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
            {loadingChats ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="p-4 flex gap-3 animate-pulse">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-slate-100 rounded w-1/2" />
                    <div className="h-2.5 bg-slate-100 rounded w-3/4" />
                  </div>
                </div>
              ))
            ) : filteredConvs.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs">
                {t("msg.no_conv", "Tidak ada percakapan aktif.")}
              </div>
            ) : (
              filteredConvs.map((conv) => {
                const isActive = activeId === conv.id;
                const convStatus = getConvStatus(conv);
                return (
                  <button
                    key={conv.id}
                    onClick={() => setActiveId(conv.id)}
                    className={`w-full text-left p-4 transition-all flex items-start gap-3 cursor-pointer ${
                      isActive
                        ? "bg-blue-50/50 border-l-4 border-[#0785BC]"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-[#0785BC]/10 text-[#0785BC] flex items-center justify-center shrink-0 relative">
                      <Headphones className="w-5 h-5" />
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white transition-colors duration-200 ${
                          convStatus.isOnline ? "bg-emerald-500 animate-pulse shadow-[0_0_5px_rgba(16,185,129,0.7)]" : "bg-slate-300"
                        }`}
                        title={convStatus.isOnline ? "Admin online — siap membalas" : `Admin offline — ${formatLastSeen(convStatus.lastSeen || null, false).text}`}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <p className="text-xs font-bold text-slate-800 truncate">
                          {conv.title}
                        </p>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {conv.time}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 truncate">{getCleanMessagePreview(conv.preview)}</p>
                    </div>

                    {conv.unread && (
                      <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0 mt-1" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ── Right Pane: Chat Window ── */}
        <div className={`flex-1 flex flex-col h-full bg-[#f8faff] min-w-0 ${activeId ? "flex" : "hidden lg:flex"}`}>
          {/* Chat Header */}
          <div className="h-16 px-4 sm:px-6 bg-white border-b border-slate-100 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setActiveId(null)}
                className="lg:hidden p-1.5 -ml-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors shrink-0"
                title="Kembali ke daftar pesan"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="w-10 h-10 rounded-xl bg-[#0785BC] text-white flex items-center justify-center shrink-0 shadow-xs shadow-[#0785BC]/20">
                <Shield className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                    Admin Support Sarpras
                  </h3>
                  {(() => {
                    const statusInfo = formatLastSeen(adminLastSeen, adminOnline);
                    if (statusInfo.isOnline) {
                      return (
                        <span
                          title="Admin sedang online — balasan akan cepat"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm"
                        >
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]" />
                          </span>
                          Online • Aktif sekarang
                        </span>
                      );
                    }
                    return (
                      <span
                        title={statusInfo.text}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-50 text-slate-600 border border-slate-200 shadow-sm max-w-[18rem]"
                      >
                        <Clock3 className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{statusInfo.text}</span>
                      </span>
                    );
                  })()}
                </div>
                <p className="text-[11px] text-slate-400 truncate flex items-center gap-1">
                  {adminOnline ? (
                    <>
                      <CircleDot className="w-3 h-3 text-emerald-500" />
                      {t("msg.ready_online", "Petugas siap membalas — sedang online")}
                    </>
                  ) : (
                    t("msg.help_sub", "Petugas siap membantu kendala dan pengajuan fasilitas Anda")
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleClearChat}
                className="rounded-lg p-2 text-slate-400 hover:bg-amber-50 hover:text-amber-600 transition-colors"
                title="Bersihkan semua pesan"
                aria-label="Bersihkan chat"
              >
                <Eraser className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleDeleteChat}
                className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
                title={t("chat.delete_conv", "Hapus percakapan")}
                aria-label={t("chat.delete_conv", "Hapus chat")}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Messages Bubble Scroll Area */}
          <div className="flex-1 p-3 sm:p-5 overflow-y-auto space-y-3 sm:space-y-4">
            {loadingMessages ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin text-[#0785BC] mb-2" />
                <p className="text-xs">{t("msg.loading_chat", "Memuat riwayat chat...")}</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6">
                <div className="w-16 h-16 rounded-2xl bg-blue-50 text-[#0785BC] flex items-center justify-center mb-3">
                  <MessageSquare className="w-8 h-8" />
                </div>
                <h4 className="text-sm font-bold text-slate-800">
                  {t("msg.start_title", "Mulai Percakapan dengan Admin")}
                </h4>
                <p className="text-xs text-slate-400 mt-1 max-w-sm">
                  {t("msg.start_sub", "Silakan tanyakan ketersediaan barang, konfirmasi peminjaman, atau bantuan sarpras lainnya.")}
                </p>
              </div>
            ) : (
              messages
                .filter((m, idx, arr) => arr.findIndex((item) => item.id === m.id) === idx)
                .sort((a, b) => new Date(a.rawDate || 0).getTime() - new Date(b.rawDate || 0).getTime())
                .map((m, index, arr) => {
                  const showDateBadge =
                    index === 0 || isDifferentDay(m.rawDate, arr[index - 1]?.rawDate);
                  const parsed = parseMessageContent(m.text);

                  if (m.isMe) {
                    // User's own message (right side)
                    return (
                      <React.Fragment key={m.id ? `msg-${m.id}` : `idx-${index}`}>
                      {showDateBadge && (
                        <div className="w-full flex justify-center my-3 select-none">
                          <span className="px-3 py-1 rounded-full text-[11px] font-medium text-slate-500 bg-slate-100/90 shadow-2xs border border-slate-200/80">
                            {formatChatDateBadge(m.rawDate)}
                          </span>
                        </div>
                      )}
                      <div
                        id={`msg-${m.id}`}
                        onTouchStart={() => handleTouchStart(m)}
                        onTouchEnd={handleTouchEnd}
                        onTouchMove={handleTouchEnd}
                        className={`flex justify-end items-end gap-1.5 group/bubble transition-all duration-300 rounded-2xl ${
                          highlightedMessageId === m.id
                            ? "ring-2 ring-amber-300 ring-offset-2 ring-offset-[#f8faff]"
                            : ""
                        }`}
                      >
                        {!editingMessageId && (
                          <button
                            type="button"
                            onClick={() => handleStartReply(m)}
                            className="opacity-0 group-hover/bubble:opacity-100 p-1 text-slate-400 hover:text-[#0785BC] hover:bg-slate-100 rounded-full transition-all shrink-0 mb-1 max-sm:opacity-70"
                            title="Balas pesan ini"
                          >
                            <Reply className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <div
                          className={`relative w-fit max-w-[min(26rem,82vw)] bg-[#0785BC] text-white rounded-2xl rounded-tr-xs shadow-xs transition-all ${
                            editingMessageId === m.id
                              ? "p-3 w-full max-w-sm"
                              : "pl-3.5 pr-7 py-2"
                          }`}
                        >
                          {/* Quoted Message Preview inside Bubble */}
                          {m.replyTo && (
                            <div
                              onClick={() => handleScrollToMessage(m.replyTo!.id)}
                              className="mb-1.5 px-2 py-1 rounded-md border-l-[3px] border-[#bfeeff] bg-black/25 text-white text-left cursor-pointer transition-all hover:bg-black/35 select-none max-w-[19rem]"
                            >
                              <div className="text-[10px] font-bold text-[#bfeeff] flex items-center gap-1">
                                <Reply className="w-2.5 h-2.5" />
                                <span>{m.replyTo.senderName}</span>
                              </div>
                              <p className={`text-[11px] text-white/80 truncate mt-0.5 ${
                                m.replyTo.isDeleted ? "italic opacity-80" : ""
                              }`}>
                                {m.replyTo.text}
                              </p>
                            </div>
                          )}

                          {editingMessageId === m.id ? (
                            <div className="flex flex-col gap-2 w-full">
                              <span className="text-[11px] font-medium text-white/90">
                                Edit Pesan
                              </span>
                              <input
                                value={editingText}
                                onChange={(e) => setEditingText(e.target.value)}
                                className="w-full rounded-lg px-2.5 py-1.5 text-xs text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#8ed8f5]"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleEditMessage(m);
                                  if (e.key === "Escape") setEditingMessageId(null);
                                }}
                              />
                              <div className="flex items-center justify-end gap-1.5 pt-0.5">
                                <button
                                  type="button"
                                  onClick={() => setEditingMessageId(null)}
                                  className="px-2 py-0.5 rounded text-[11px] text-white/80 hover:bg-white/20 transition-colors"
                                >
                                  Batal
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleEditMessage(m)}
                                  className="px-2.5 py-0.5 rounded text-[11px] font-semibold bg-white text-[#0785BC] hover:bg-white/90 shadow-xs transition-colors flex items-center gap-1"
                                >
                                  <CheckCheck className="w-3 h-3" />
                                  Simpan
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="flex flex-wrap items-end justify-end gap-x-2 gap-y-0.5">
                                <p className="text-xs sm:text-[13px] whitespace-pre-wrap leading-relaxed break-words">
                                  {parsed.text}
                                </p>
                                <div className="flex items-center gap-1 text-[10px] text-white/80 font-mono select-none shrink-0 self-end ml-auto pb-0.5">
                                  <span>{m.time}</span>
                                  {(() => {
                                    const isTemp = typeof m.id === "string" && m.id.startsWith("temp-");
                                    if (isTemp) {
                                      return (
                                        <span title="Mengirim...">
                                          <Clock3 className="w-3 h-3 text-white/70 animate-pulse" />
                                        </span>
                                      );
                                    }
                                    if (m.isRead) {
                                      return (
                                        <span title="Dibaca oleh Admin ✓✓">
                                          <CheckCheck className="w-3.5 h-3.5 text-[#38bdf8] stroke-[2.5] drop-shadow-[0_0_3px_rgba(56,189,248,0.7)]" />
                                        </span>
                                      );
                                    }
                                    if (adminOnline) {
                                      return (
                                        <span title="Terkirim ke Admin ✓✓">
                                          <CheckCheck className="w-3.5 h-3.5 text-white/80 stroke-[2]" />
                                        </span>
                                      );
                                    }
                                    return (
                                      <span title="Terkirim ke server ✓">
                                        <Check className="w-3.5 h-3.5 text-white/60 stroke-[2]" />
                                      </span>
                                    );
                                  })()}
                                </div>
                              </div>

                              {typeof m.id === "string" && !m.id.startsWith("temp-") && (
                                <div className="absolute right-1 top-1 z-20">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenMessageMenu(openMessageMenu === m.id ? null : m.id);
                                    }}
                                    className={`p-1 rounded-full text-white/70 hover:text-white hover:bg-white/20 transition-all ${
                                      openMessageMenu === m.id
                                        ? "opacity-100 bg-white/20 text-white"
                                        : "opacity-0 group-hover/bubble:opacity-100 focus:opacity-100 max-sm:opacity-60"
                                    }`}
                                    title="Opsi pesan"
                                    aria-label="Menu pesan"
                                  >
                                    <ChevronDown className="w-3.5 h-3.5" />
                                  </button>

                                  {openMessageMenu === m.id && (
                                    <div
                                      onClick={(e) => e.stopPropagation()}
                                      className={`absolute right-0 z-30 min-w-[136px] rounded-xl bg-white/95 backdrop-blur-sm p-1.5 text-slate-700 shadow-xl border border-slate-200/90 animate-in fade-in zoom-in-95 duration-100 ${
                                        index >= messages.length - 2
                                          ? "bottom-full mb-1.5"
                                          : "top-full mt-1.5"
                                      }`}
                                    >
                                      <button
                                        type="button"
                                        onClick={() => handleStartReply(m)}
                                        className="flex w-full items-center gap-2.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:text-[#0785BC] hover:bg-[#eef7fc] rounded-lg transition-colors group/item"
                                      >
                                        <div className="w-5 h-5 rounded-md bg-slate-100 text-slate-500 flex items-center justify-center group-hover/item:bg-[#0785BC]/15 group-hover/item:text-[#0785BC] transition-colors">
                                          <Reply className="h-3 w-3" />
                                        </div>
                                        <span>Balas</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOpenMessageMenu(null);
                                          setEditingMessageId(m.id);
                                          setEditingText(parsed.text);
                                        }}
                                        className="flex w-full items-center gap-2.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:text-[#0785BC] hover:bg-[#eef7fc] rounded-lg transition-colors group/item"
                                      >
                                        <div className="w-5 h-5 rounded-md bg-slate-100 text-slate-500 flex items-center justify-center group-hover/item:bg-[#0785BC]/15 group-hover/item:text-[#0785BC] transition-colors">
                                          <Pencil className="h-3 w-3" />
                                        </div>
                                        <span>Edit</span>
                                      </button>
                                      <div className="h-px bg-slate-100 my-1" />
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOpenMessageMenu(null);
                                          handleDeleteMessage(m.id);
                                        }}
                                        className="flex w-full items-center gap-2.5 px-2.5 py-1.5 text-xs font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50/80 rounded-lg transition-colors group/item"
                                      >
                                        <div className="w-5 h-5 rounded-md bg-rose-50 text-rose-500 flex items-center justify-center group-hover/item:bg-rose-100 group-hover/item:text-rose-600 transition-colors">
                                          <Trash2 className="h-3 w-3" />
                                        </div>
                                        <span>Hapus</span>
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </React.Fragment>
                  );
                }

                // Admin's message (left side)
                return (
                  <React.Fragment key={m.id ? `msg-${m.id}` : `idx-${index}`}>
                    {showDateBadge && (
                      <div className="w-full flex justify-center my-3 select-none">
                        <span className="px-3 py-1 rounded-full text-[11px] font-medium text-slate-500 bg-slate-100/90 shadow-2xs border border-slate-200/80">
                          {formatChatDateBadge(m.rawDate)}
                        </span>
                      </div>
                    )}
                    <div
                      id={`msg-${m.id}`}
                      onTouchStart={() => handleTouchStart(m)}
                      onTouchEnd={handleTouchEnd}
                      onTouchMove={handleTouchEnd}
                      className={`flex items-start gap-2.5 max-w-[min(26rem,82vw)] group/bubble transition-all duration-300 rounded-2xl ${
                        highlightedMessageId === m.id
                          ? "ring-2 ring-amber-300 ring-offset-2 ring-offset-[#f8faff]"
                          : ""
                      }`}
                    >
                      <div className="w-7 h-7 rounded-full bg-[#0785BC] text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 shadow-xs">
                        A
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-[11px] font-semibold text-slate-700">
                            {m.senderName}
                          </span>
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-blue-50 text-[#0785BC]">
                            Petugas
                          </span>
                        </div>
                        <div className="w-fit max-w-full bg-white border border-slate-200/80 text-slate-800 rounded-2xl rounded-tl-xs px-3.5 py-2 shadow-xs">
                          {/* Quoted Message Preview inside Bubble */}
                          {m.replyTo && (
                            <div
                              onClick={() => handleScrollToMessage(m.replyTo!.id)}
                              className="mb-1.5 px-2 py-1 rounded-md border-l-[3px] border-[#0785BC] bg-slate-100/95 text-slate-800 text-left cursor-pointer transition-all hover:bg-slate-200/90 select-none max-w-[19rem]"
                            >
                              <div className="text-[10px] font-bold text-[#0785BC] flex items-center gap-1">
                                <Reply className="w-2.5 h-2.5" />
                                <span>{m.replyTo.senderName}</span>
                              </div>
                              <p className={`text-[11px] text-slate-600 truncate mt-0.5 ${
                                m.replyTo.isDeleted ? "italic opacity-80" : ""
                              }`}>
                                {m.replyTo.text}
                              </p>
                            </div>
                          )}
                          <div className="flex flex-wrap items-end justify-end gap-x-2.5 gap-y-0.5">
                            <p className="text-xs sm:text-[13px] whitespace-pre-wrap leading-relaxed break-words">
                              {parsed.text}
                            </p>
                            <span className="text-[10px] text-slate-400 select-none shrink-0 self-end ml-auto font-mono pb-0.5">
                              {m.time}
                            </span>
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleStartReply(m)}
                        className="opacity-0 group-hover/bubble:opacity-100 p-1 text-slate-400 hover:text-[#0785BC] hover:bg-slate-100 rounded-full transition-all shrink-0 self-center max-sm:opacity-70"
                        title="Balas pesan ini"
                      >
                        <Reply className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </React.Fragment>
                );
              })
            )}

            {isAdminTyping && (
              <div className="flex items-center gap-2 text-slate-400 text-xs italic">
                <div className="bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-2xs text-[11px] text-slate-500">
                  {t("chat.typing_admin", "Admin sedang mengetik...")}
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Chat Input Bar */}
          <div className="p-2.5 sm:p-4 bg-white border-t border-slate-100 shrink-0">
            {replyingTo && (
              <div className="max-w-4xl mx-auto mb-2 flex items-center justify-between gap-2 px-3 py-2 bg-slate-100/90 border-l-4 border-[#0785BC] rounded-r-xl shadow-2xs animate-in fade-in slide-in-from-bottom-1 duration-150">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#0785BC]">
                    <Reply className="w-3 h-3" />
                    <span>{t("chat.replying_to", "Membalas")} {replyingTo.senderName}</span>
                  </div>
                  <p className="text-[11px] text-slate-600 truncate mt-0.5">
                    {replyingTo.text}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setReplyingTo(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-200/60 transition-colors cursor-pointer"
                  title={t("chat.cancel_reply", "Batal membalas")}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            <form onSubmit={handleSend} className="flex items-center gap-2 max-w-4xl mx-auto">
              <input
                ref={messageInputRef}
                type="text"
                value={input}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                  if (e.key === "Escape" && replyingTo) {
                    setReplyingTo(null);
                  }
                }}
                placeholder={replyingTo ? `${t("chat.reply", "Balas")} ${replyingTo.senderName}...` : t("chat.type_user_ph", "Tulis pesan ke admin sarpras... (Enter untuk kirim)")}
                disabled={sending || !activeId}
                className="flex-1 min-w-0 px-3.5 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0785BC] transition-all text-slate-800 placeholder-slate-400"
              />

              <button
                type="submit"
                disabled={!input.trim() || sending || !activeId}
                className="px-3.5 sm:px-5 py-2 sm:py-2.5 bg-[#0785BC] hover:bg-[#0672a0] text-white rounded-2xl font-semibold text-xs sm:text-sm flex items-center gap-2 shadow-xs transition-all disabled:opacity-50 cursor-pointer shrink-0"
              >
                {sending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span className="hidden sm:inline">{t("msg.send", "Kirim")}</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </UserLayout>
  );
}

