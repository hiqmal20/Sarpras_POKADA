"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  Send,
  MessageSquare,
  Loader2,
  Trash2,
  RotateCcw,
  Check,
  CheckCheck,
  Clock3,
  Pencil,
  MoreVertical,
  Reply,
  X,
  ArrowLeft,
} from "lucide-react";
import { AdminLayout } from "@/components/admin";
import api, { getCurrentUser } from "@/lib/api";
import { getSocket, joinChatRoom, leaveChatRoom } from "@/lib/socket";
import { toast } from "@/components/Toast";
import {
  formatChatDateBadge,
  isDifferentDay,
  formatLastSeen,
  parseMessageContent,
  formatReplyMessage,
  getCleanMessagePreview,
  ReplyInfo,
} from "@/lib/chatHelper";

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  text: string;
  timestamp: string;
  rawDate?: string;
  isRead?: boolean;
}

interface Conversation {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userFoto?: string | null;
  lastMessage: string;
  timestamp: string;
  unread: boolean;
  lastSeen?: string | null;
}

export default function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const [lastSeenMap, setLastSeenMap] = useState<Record<string, string>>({});
  const lastPresenceAtRef = useRef(0);
  const presenceHydratedRef = useRef(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [openMessageMenu, setOpenMessageMenu] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<ReplyInfo | null>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);

  const selectedConvRef = useRef<Conversation | null>(null);
  selectedConvRef.current = selectedConversation;

  const joiningChatRef = useRef<string | null>(null);
  const chatListRef = useRef<{ id: string; lastMessage: string; timestamp: string }[]>([]);
  chatListRef.current = conversations;

  const playChatSound = () => {
    try {
      const ctxCtor = window.AudioContext || (window as any).webkitAudioContext;
      if (!ctxCtor) return;
      const ctx = new ctxCtor();
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.type = "sine";
      oscillator.frequency.value = 880;
      gain.gain.value = 0.05;
      oscillator.start();
      setTimeout(() => {
        oscillator.stop();
        ctx.close();
      }, 220);
    } catch {
      // silent
    }
  };

  const showChatToast = (title: string, body: string) => {
    const toastEl = document.createElement("div");
    toastEl.className =
      "fixed top-4 right-4 z-[100] max-w-xs w-full bg-slate-900 text-white rounded-2xl shadow-xl p-3.5 animate-fade-in flex items-start gap-2.5";
    toastEl.innerHTML = `
      <div class="w-8 h-8 rounded-xl bg-[#0785BC] text-white flex items-center justify-center font-bold text-xs shrink-0">💬</div>
      <div class="min-w-0">
        <p class="font-bold text-xs leading-snug truncate">${title}</p>
        <p class="text-[11px] text-slate-300 leading-relaxed line-clamp-2 mt-0.5">${body}</p>
      </div>
    `;
    document.body.appendChild(toastEl);
    setTimeout(() => toastEl.remove(), 4500);
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // Sync current user
  useEffect(() => {
    const user = getCurrentUser();
    if (user) setCurrentUser(user);
  }, []);

  // Fetch conversations
  const fetchChats = async (keepSelection = true) => {
    try {
      const res = await api.chats.getAll();
      if (res.status === "success" && Array.isArray(res.data)) {
        const user = currentUser || getCurrentUser();
        const initialLastSeen: Record<string, string> = {};
        const apiOnlineIds: string[] = [];
        const apiOfflineIds: string[] = [];

        const mapped: Conversation[] = (res.data as any[]).map((c) => {
          const partner = (c.user && c.user.id !== user?.id ? c.user : c.admin) || c.user || c.admin || {};
          const resolvedUserId = String(partner.id || (c.user_id !== user?.id ? c.user_id : c.admin_id) || c.user_id || "");
          const partnerLastSeen = c.partner_last_seen || partner.update_at || partner.last_seen || null;
          if (resolvedUserId && partnerLastSeen) {
            initialLastSeen[resolvedUserId] = partnerLastSeen;
          }
          if (resolvedUserId) {
            if (c.is_partner_online) {
              apiOnlineIds.push(resolvedUserId);
            } else if (c.is_partner_online === false) {
              apiOfflineIds.push(resolvedUserId);
            }
          }
          return {
            id: c.id,
            userId: resolvedUserId,
            userName: partner.name || "Pengguna",
            userEmail: partner.email || "-",
            userFoto: partner.foto || null,
            lastMessage: c.last_message || c.subject || "Percakapan baru",
            timestamp: c.last_message_at || c.updated_at
              ? new Date(c.last_message_at || c.updated_at).toLocaleTimeString("id-ID", {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "Baru saja",
            unread: c.unread_count ? c.unread_count > 0 : false,
            lastSeen: partnerLastSeen,
          };
        });

        if (Object.keys(initialLastSeen).length > 0) {
          setLastSeenMap((prev) => ({ ...initialLastSeen, ...prev }));
        }

        // API hanya mengisi snapshot awal; event Socket.IO tetap menjadi sumber utama.
        if (!presenceHydratedRef.current) {
          setOnlineUserIds(new Set(apiOnlineIds));
          presenceHydratedRef.current = true;
        }

        setConversations(mapped);
        mapped.forEach((c) => {
          joinChatRoom(c.id);
        });

        if (!keepSelection || !selectedConvRef.current) {
          if (mapped.length > 0) {
            handleSelectConversation(mapped[0]);
          }
        } else {
          // Update selected conversation data if still exists
          const current = mapped.find((m) => m.id === selectedConvRef.current?.id);
          if (current) {
            setSelectedConversation((prev) => (prev ? { ...prev, ...current, unread: false } : current));
          }
        }
      }
    } catch (err) {
      console.warn("Gagal memuat percakapan:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChats(false);
  }, []);

  // Fetch messages when conversation changes & sync periodically
  useEffect(() => {
    if (!selectedConversation?.id) return;
    const chatId = selectedConversation.id;
    let isSubscribed = true;

    async function fetchMsgs(isInitial = false) {
      try {
        const res = await api.chats.getMessages(chatId);
        if (isSubscribed && res.status === "success" && Array.isArray(res.data)) {
          const user = currentUser || getCurrentUser();
          const msgs: Message[] = (res.data as any[]).map((m) => {
            const sender = m.sender || {};
            const senderRole = String(sender.role || "").toLowerCase();
            const isMe =
              (user?.id && (m.sender_id === user.id || sender.id === user.id)) ||
              ["admin", "petugas"].includes(senderRole);
            return {
              id: String(m.id),
              senderId: String(sender.id || m.sender_id || ""),
              senderName: sender.name || (isMe ? "Admin Support" : "User"),
              senderRole: isMe ? "admin" : "user",
              text: m.message,
              rawDate: m.created_at || new Date().toISOString(),
              timestamp: m.created_at
                ? new Date(m.created_at).toLocaleTimeString("id-ID", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "",
              isRead: Boolean(m.is_read),
            };
          });

          setMessages((prev) => {
            if (msgs.length === 0 && prev.length === 0) return prev;
            // Pertahankan status dibaca (read) agar tidak revert false saat polling race (cegah flicker 2→1)
            const merged = msgs.map((m) => {
              const existing = prev.find((p) => p.id === m.id);
              if (existing?.isRead && !m.isRead) return { ...m, isRead: true };
              return m;
            });
            const hasChanged =
              merged.length !== prev.length ||
              merged.some(
                (m, idx) =>
                  !prev[idx] ||
                  prev[idx].id !== m.id ||
                  prev[idx].isRead !== m.isRead ||
                  prev[idx].text !== m.text
              );
            if (!hasChanged) return prev;
            const tempMsgs = prev.filter(
              (p) => p.id.startsWith("temp-") && !merged.some((m) => m.text === p.text)
            );
            const combined = [...merged, ...tempMsgs];
            const seen = new Set<string>();
            return combined.filter((m) => {
              if (!m.id || seen.has(m.id)) return false;
              seen.add(m.id);
              return true;
            });
          });

          if (isInitial) {
            setTimeout(() => scrollToBottom("auto"), 60);
          }
        }
      } catch (err) {
        console.warn("Gagal memuat pesan:", err);
      }
    }

    fetchMsgs(true);

    const interval = setInterval(() => {
      fetchMsgs(false);
    }, 10000);

    const handleFocus = () => fetchMsgs(false);
    window.addEventListener("focus", handleFocus);

    return () => {
      isSubscribed = false;
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
  }, [selectedConversation?.id]);

  const upsertIncomingMessage = (msg: any) => {
    if (!msg) return;
    const incomingChatId = String(msg.chat_id || msg.chatId || "");
    const currentChatId = String(selectedConvRef.current?.id || "");
    const user = currentUser || getCurrentUser();
    const sender = msg.sender || {};
    const senderId = String(sender.id || msg.sender_id || "");
    const myId = String(user?.id || "");
    const senderRole = String(sender.role || "").toLowerCase();
    const isMe = (myId && senderId === myId) || ["admin", "petugas"].includes(senderRole);
    const isCurrentChat = Boolean(incomingChatId && currentChatId && incomingChatId === currentChatId);

    if (isCurrentChat) {
      const formattedMsg: Message = {
        id: String(msg.id || `msg-${Date.now()}`),
        senderId,
        senderName: sender.name || (isMe ? "Admin Support" : "User"),
        senderRole: isMe ? "admin" : "user",
        text: msg.message || "",
        rawDate: msg.created_at || new Date().toISOString(),
        timestamp: msg.created_at
          ? new Date(msg.created_at).toLocaleTimeString("id-ID", {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "Baru saja",
        isRead: Boolean(msg.is_read),
      };

      setMessages((prev) => {
        if (prev.some((m) => String(m.id) === formattedMsg.id)) {
          return prev.filter(
            (m) => !(m.id.startsWith("temp-") && m.text === formattedMsg.text)
          );
        }
        const tempIndex = prev.findIndex(
          (m) =>
            m.id.startsWith("temp-") &&
            m.text === formattedMsg.text
        );
        if (tempIndex >= 0) {
          const next = [...prev];
          next[tempIndex] = formattedMsg;
          return next;
        }
        return [...prev, formattedMsg];
      });

      setTimeout(() => scrollToBottom("smooth"), 50);

      if (!isMe && currentChatId) {
        const socket = getSocket();
        api.chats.markAsRead(currentChatId);
        if (socket?.connected) socket.emit("mark_as_read", currentChatId);
        window.dispatchEvent(new CustomEvent("messages-read", { detail: { chatId: currentChatId } }));
      }
    } else if (!isMe) {
      playChatSound();
      showChatToast(`Pesan baru dari ${sender.name || "Pengguna"}`, msg.message || "Pesan baru");
    }

    setConversations((prev) => {
      const exists = prev.some((c) => String(c.id) === incomingChatId);
      const updated = prev.map((c) => {
        if (String(c.id) === incomingChatId) {
          return {
            ...c,
            lastMessage: msg.message || c.lastMessage,
            timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
            unread: !isCurrentChat && !isMe,
          };
        }
        return c;
      });
      if (!exists && incomingChatId) {
        joinChatRoom(incomingChatId);
        fetchChats(true);
        return updated;
      }
      return updated.sort((a, b) => (String(a.id) === incomingChatId ? -1 : String(b.id) === incomingChatId ? 1 : 0));
    });
  };

  // Setup WebSocket listeners
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleNewMessage = (msg: any) => {
      upsertIncomingMessage(msg);
    };

    const handleNotification = (payload: any) => {
      if (payload?.message) {
        upsertIncomingMessage(payload.message);
      } else if (payload?.chatId) {
        joinChatRoom(payload.chatId);
        fetchChats(true);
      }
    };

    const handleChatUpdated = (payload?: { chatId?: string; message?: any }) => {
      if (payload?.chatId) joinChatRoom(payload.chatId);
      if (payload?.message) {
        upsertIncomingMessage(payload.message);
      } else {
        fetchChats(true);
      }
    };

    const handleMessagesRead = (data: { chatId: string; readBy?: string }) => {
      // Abaikan echo dari diri sendiri (pengaman lapis kedua setelah BE memakai
      // socket.to / except): event ini hanya valid bila readBy = lawan bicara.
      // Tanpa ini, pesan milik admin ikut ditandai dibaca lalu dikoreksi saat
      // sinkronisasi DB → terlihat seperti flicker ceklis 2 → 1.
      const me = String(getCurrentUser()?.id || "");
      if (data.readBy && me && String(data.readBy) === me) return;
      setConversations((prev) =>
        prev.map((c) => (c.id === data.chatId ? { ...c, unread: false } : c))
      );
      if (selectedConvRef.current?.id === data.chatId) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.senderRole === "admin" ? { ...msg, isRead: true } : msg
          )
        );
      }
    };

    const handleOnlineUsersList = (data: { onlineUserIds?: string[]; lastSeenMap?: Record<string, string> } | string[]) => {
      lastPresenceAtRef.current = Date.now();
      const ids = (Array.isArray(data) ? data : data?.onlineUserIds || [])
        .map((id) => String(id || "").trim())
        .filter((id) => id && id !== "undefined" && id !== "null");
      setOnlineUserIds(new Set(ids));
      if (!Array.isArray(data) && data?.lastSeenMap) {
        setLastSeenMap((prev) => ({ ...prev, ...data.lastSeenMap }));
      }
    };

    const handleUserStatusChange = (data: { userId: string; online: boolean; last_seen?: string }) => {
      const targetId = String(data?.userId || "");
      if (!targetId) return;
      if (data.last_seen) {
        const seenStr = String(data.last_seen);
        setLastSeenMap((prev) => ({ ...prev, [targetId]: seenStr }));
      }
      setOnlineUserIds((prev) => {
        const next = new Set(prev);
        if (data.online) {
          next.add(targetId);
        } else {
          next.delete(targetId);
        }
        return next;
      });
    };

    const handleUserTyping = (data: { chatId: string }) => {
      if (data.chatId === selectedConvRef.current?.id) {
        setIsTyping(true);
      }
    };

    const handleUserStopTyping = (data: { chatId: string }) => {
      if (data.chatId === selectedConvRef.current?.id) {
        setIsTyping(false);
      }
    };

    const handleUserOnline = (data: { userId?: string }) => {
      if (data?.userId) {
        setOnlineUserIds((prev) => new Set(prev).add(String(data.userId)));
      }
    };

    const handleUserOffline = (data: { userId?: string; lastSeen?: string }) => {
      if (data?.userId) {
        const idStr = String(data.userId);
        setOnlineUserIds((prev) => {
          const next = new Set(prev);
          next.delete(idStr);
          return next;
        });
        if (data.lastSeen) {
          setLastSeenMap((prev) => ({ ...prev, [idStr]: String(data.lastSeen) }));
        }
      }
    };

    const handlePresenceSnapshot = (users: { userId?: string; id?: string }[]) => {
      if (Array.isArray(users)) {
        // Replace (bukan merge) agar user yang sudah offline tidak nyangkut online
        const ids = users
          .map((u) => String(u.userId || u.id || "").trim())
          .filter((id) => id && id !== "undefined" && id !== "null");
        setOnlineUserIds(new Set(ids));
      }
    };

    const handleMessageUpdated = (data: any) => {
      if (!data) return;
      const msgId = String(data.id || data.messageId || "");
      const newText = data.message || data.text || "";
      setMessages((prev) => prev.map((m) => (m.id === msgId ? { ...m, text: newText } : m)));
    };

    const handleMessageDeleted = (data: { chatId?: string; messageId?: string }) => {
      if (!data?.messageId) return;
      setMessages((prev) => prev.filter((m) => m.id !== String(data.messageId)));
    };

    const requestOnlineUsers = () => {
      if (socket.connected) {
        socket.emit("get_online_users");
        socket.emit("check_online_users");
      }
    };

    const handleSocketReconnect = () => {
      presenceHydratedRef.current = false;
      const current = selectedConvRef.current;
      if (current) joinChatRoom(current.id);
      requestOnlineUsers();
    };

    const handleChatCleared = (data: { chatId: string }) => {
      if (selectedConvRef.current?.id === data.chatId) {
        setMessages([]);
      }
      setConversations((prev) =>
        prev.map((c) => (c.id === data.chatId ? { ...c, lastMessage: "(Riwayat pesan dibersihkan)" } : c))
      );
    };

    const handleChatDeleted = (data: { chatId: string }) => {
      setConversations((prev) => {
        const remaining = prev.filter((c) => c.id !== data.chatId);
        if (selectedConvRef.current?.id === data.chatId) {
          if (remaining.length > 0) {
            handleSelectConversation(remaining[0]);
          } else {
            setSelectedConversation(null);
            setMessages([]);
          }
        }
        return remaining;
      });
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
              timestamp: realMsg.created_at
                ? new Date(realMsg.created_at).toLocaleTimeString("id-ID", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : m.timestamp,
              isRead: Boolean(realMsg.is_read),
            };
          }
          return m;
        });
      });
    };

    const handleSocketError = (err: any) => {
      console.warn("⚠️ Socket error received in admin chat:", err);
    };

    socket.on("message_sent", handleMessageSent);
    socket.on("error", handleSocketError);
    socket.on("new_message", handleNewMessage);
    socket.on("notification", handleNotification);
    socket.on("chat_updated", handleChatUpdated);
    socket.on("messages_read", handleMessagesRead);
    socket.on("online_users_list", handleOnlineUsersList);
    socket.on("user_status_change", handleUserStatusChange);
    socket.on("user_online", handleUserOnline);
    socket.on("user_offline", handleUserOffline);
    socket.on("presence_snapshot", handlePresenceSnapshot);
    socket.on("message_updated", handleMessageUpdated);
    socket.on("message_deleted", handleMessageDeleted);
    socket.on("user_typing", handleUserTyping);
    socket.on("user_stop_typing", handleUserStopTyping);
    socket.on("chat_cleared", handleChatCleared);
    socket.on("chat_deleted", handleChatDeleted);
    // Dengarkan koneksi socket secara langsung. Event window tetap dipertahankan
    // sebagai fallback untuk kompatibilitas dengan inisialisasi socket lama.
    const handleSocketDisconnect = () => {
      // Socket admin sendiri terputus; jangan menganggap user online sampai
      // snapshot baru diterima setelah reconnect.
      setOnlineUserIds(new Set());
    };
    socket.on("connect", handleSocketReconnect);
    socket.on("disconnect", handleSocketDisconnect);
    window.addEventListener("socket-connected", handleSocketReconnect);

    // Initial check online users & fallback sync ringan.
    requestOnlineUsers();
    const onlineInterval = setInterval(requestOnlineUsers, 15000);
    // Refresh daftar percakapan hanya untuk user baru; jangan gunakan hasilnya
    // untuk menimpa presence realtime yang sudah diterima dari socket.
    const chatListInterval = setInterval(() => fetchChats(true), 30000);

    return () => {
      clearInterval(onlineInterval);
      clearInterval(chatListInterval);
      socket.off("connect", handleSocketReconnect);
      socket.off("disconnect", handleSocketDisconnect);
      socket.off("message_sent", handleMessageSent);
      socket.off("error", handleSocketError);
      socket.off("new_message", handleNewMessage);
      socket.off("notification", handleNotification);
      socket.off("chat_updated", handleChatUpdated);
      socket.off("messages_read", handleMessagesRead);
      socket.off("online_users_list", handleOnlineUsersList);
      socket.off("user_status_change", handleUserStatusChange);
      socket.off("user_online", handleUserOnline);
      socket.off("user_offline", handleUserOffline);
      socket.off("presence_snapshot", handlePresenceSnapshot);
      socket.off("message_updated", handleMessageUpdated);
      socket.off("message_deleted", handleMessageDeleted);
      socket.off("user_typing", handleUserTyping);
      socket.off("user_stop_typing", handleUserStopTyping);
      socket.off("chat_cleared", handleChatCleared);
      socket.off("chat_deleted", handleChatDeleted);
      window.removeEventListener("socket-connected", handleSocketReconnect);
    };
  }, []);

  // Join chat room when selectedConversation changes
  useEffect(() => {
    if (!selectedConversation) return;
    if (joiningChatRef.current === selectedConversation.id) return;
    joiningChatRef.current = selectedConversation.id;

    joinChatRoom(selectedConversation.id);
    setTimeout(() => {
      const socket = getSocket();
      if (socket?.connected) socket.emit("mark_as_read", selectedConversation.id);
    }, 300);

    // Mark as read via API & update sidebar
    api.chats.markAsRead(selectedConversation.id);
    setTimeout(() => scrollToBottom("auto"), 100);
    window.dispatchEvent(new CustomEvent("messages-read", { detail: { chatId: selectedConversation.id } }));

    joiningChatRef.current = null;
  }, [selectedConversation?.id]);

  const handleSelectConversation = (conv: Conversation) => {
    setSelectedConversation(conv);
    setReplyingTo(null);
    setConversations((prev) =>
      prev.map((c) => (c.id === conv.id ? { ...c, unread: false } : c))
    );
    joinChatRoom(conv.id);
    const socket = getSocket();
    api.chats.markAsRead(conv.id);
    if (socket?.connected) {
      socket.emit("mark_as_read", conv.id);
    }
    setTimeout(() => scrollToBottom("auto"), 100);
    window.dispatchEvent(new CustomEvent("messages-read", { detail: { chatId: conv.id } }));
  };

  const handleClearHistory = async () => {
    if (!selectedConversation) return;
    if (!confirm(`Bersihkan semua riwayat pesan dengan ${selectedConversation.userName}?`)) return;

    try {
      const chatId = selectedConversation.id;
      setMessages([]);
      const socket = getSocket();
      if (socket?.connected) {
        socket.emit("clear_chat", chatId);
      }
      await api.chats.clearMessages(chatId);
      setConversations((prev) =>
        prev.map((c) => (c.id === chatId ? { ...c, lastMessage: "(Riwayat dibersihkan)" } : c))
      );
      toast.success("Riwayat pesan berhasil dibersihkan.", "Riwayat Bersih");
    } catch (err: any) {
      toast.error(err.message || "Gagal membersihkan riwayat pesan.", "Gagal");
    }
  };

  const handleDeleteConversation = async (chatId: string) => {
    if (!chatId) return;
    if (!confirm("Hapus seluruh sesi percakapan ini? Tindakan ini tidak dapat dibatalkan.")) return;

    try {
      const socket = getSocket();
      if (socket?.connected) {
        socket.emit("delete_chat", chatId);
      }
      await api.chats.deleteChat(chatId);
      setConversations((prev) => {
        const remaining = prev.filter((c) => c.id !== chatId);
        if (selectedConversation?.id === chatId) {
          if (remaining.length > 0) {
            handleSelectConversation(remaining[0]);
          } else {
            setSelectedConversation(null);
            setMessages([]);
          }
        }
        return remaining;
      });
      toast.success("Percakapan berhasil dihapus.", "Dihapus");
    } catch (err: any) {
      toast.error(err.message || "Gagal menghapus percakapan.", "Gagal");
    }
  };

  const handleSaveEditMessage = async (msg: Message) => {
    if (!selectedConversation || !editingText.trim()) return;
    const newText = editingText.trim();
    const parsed = parseMessageContent(msg.text);
    const finalEditedText = parsed.replyTo
      ? formatReplyMessage(parsed.replyTo, newText)
      : newText;
    try {
      const res = await api.chats.updateMessage(selectedConversation.id, msg.id, finalEditedText);
      if (res.status === "success") {
        setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, text: finalEditedText } : m)));
        const socket = getSocket();
        if (socket?.connected) {
          socket.emit("edit_message", {
            chatId: selectedConversation.id,
            messageId: msg.id,
            message: finalEditedText,
          });
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Gagal mengedit pesan.", "Gagal");
    } finally {
      setEditingMessageId(null);
      setEditingText("");
    }
  };

  const handleStartReply = (msg: Message) => {
    const parsed = parseMessageContent(msg.text);
    setReplyingTo({
      id: msg.id,
      senderName: msg.senderRole === "admin" ? "Anda" : msg.senderName,
      text: parsed.text,
    });
    setEditingMessageId(null);
    setTimeout(() => messageInputRef.current?.focus(), 50);
  };

  const handleDeleteSingleMessage = async (messageId: string) => {
    if (!selectedConversation || !confirm("Hapus pesan ini?")) return;
    try {
      const res = await api.chats.deleteMessage(selectedConversation.id, messageId);
      if (res.status === "success") {
        setMessages((prev) => prev.filter((m) => m.id !== messageId));
        const socket = getSocket();
        if (socket?.connected) {
          socket.emit("delete_message", {
            chatId: selectedConversation.id,
            messageId,
          });
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Gagal menghapus pesan.", "Gagal");
    }
  };

  const handleTypingInput = (value: string) => {
    setNewMessage(value);

    const socket = getSocket();
    if (socket && selectedConversation) {
      socket.emit("typing", selectedConversation.id);

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit("stop_typing", selectedConversation.id);
      }, 1500);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    const messageText = newMessage.trim();
    const finalMessage = replyingTo
      ? formatReplyMessage(replyingTo, messageText)
      : messageText;
    setReplyingTo(null);
    setNewMessage("");
    setSending(true);

    const socket = getSocket();
    if (socket) {
      socket.emit("stop_typing", selectedConversation.id);
    }

    const tempId = `temp-${Date.now()}`;
    const nowIso = new Date().toISOString();
    const optimisticMsg: Message = {
      id: tempId,
      senderId: currentUser?.id || "admin",
      senderName: currentUser?.name || "Admin Support",
      senderRole: "admin",
      text: finalMessage,
      rawDate: nowIso,
      timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
      isRead: false,
    };

    setMessages((prev) => [...prev, optimisticMsg]);

    setConversations((prev) =>
      prev.map((c) =>
        c.id === selectedConversation.id
          ? { ...c, lastMessage: messageText, timestamp: "Baru saja" }
          : c
      )
    );

    try {
      if (socket && socket.connected) {
        socket.emit("send_message", {
          chatId: selectedConversation.id,
          message: finalMessage,
          tempId,
        });
      } else {
        const res = await api.chats.sendMessage(selectedConversation.id, {
          message: finalMessage,
        });
        if (res?.status === "success" && res?.data) {
          const realId = String(res.data.id);
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
                    rawDate: res.data.created_at || m.rawDate,
                    timestamp: res.data.created_at
                      ? new Date(res.data.created_at).toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : m.timestamp,
                    isRead: Boolean(res.data.is_read),
                  }
                : m
            );
          });
        }
      }
    } catch (err) {
      console.error("Gagal mengirim pesan:", err);
    } finally {
      setSending(false);
    }
  };

  const filteredConversations = conversations.filter(
    (conv) =>
      conv.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.userEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AdminLayout fullWidth hideMobileTabs={Boolean(selectedConversation)}>
      <div className="flex h-full min-h-[32rem] flex-col overflow-hidden bg-white lg:flex-row">
        {/* Sidebar Percakapan (ChatGPT Chat History Style) */}
        <div className={`w-full shrink-0 bg-white border-b border-slate-100 flex flex-col h-full lg:w-80 lg:border-b-0 lg:border-r ${selectedConversation ? "hidden lg:flex" : "flex"}`}>
          <div className="p-4 border-b border-slate-100 bg-white">
            <div className="flex items-center justify-between mb-2.5">
              <h2 className="text-base font-bold text-slate-900">Pesan Pengguna</h2>
              <span className="text-[10px] font-mono text-slate-400">{filteredConversations.length} obrolan</span>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Cari percakapan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-100/80 hover:bg-slate-100 focus:bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0785BC]/30 focus:border-[#0785BC] transition-all"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100/80">
            {loading ? (
              <div className="p-3 space-y-2.5">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-14 bg-slate-200/60 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                <MessageSquare className="w-6 h-6 mx-auto mb-2 text-slate-300" />
                Belum ada percakapan dari pengguna.
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isSelected = selectedConversation?.id === conv.id;
                return (
                  <div
                    key={conv.id}
                    className={`w-full text-left p-4 transition-all group flex items-start gap-3 cursor-pointer relative ${
                      isSelected ? "bg-blue-50/50 border-l-4 border-[#0785BC]" : "hover:bg-slate-50"
                    }`}
                    onClick={() => handleSelectConversation(conv)}
                  >
                    <div className="relative shrink-0">
                      {conv.userFoto ? (
                        <img
                          src={conv.userFoto}
                          alt={conv.userName}
                          className="w-9 h-9 rounded-lg object-cover border border-slate-200 shrink-0"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#0785BC] to-[#044c6d] text-white flex items-center justify-center font-bold text-xs">
                          {(conv.userName || "U").charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-white transition-all duration-300 ${
                          onlineUserIds.has(conv.userId) ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]" : "bg-slate-300"
                        }`}
                        title={onlineUserIds.has(conv.userId) ? "Online — pengguna sedang aktif" : `Offline — ${formatLastSeen(lastSeenMap[conv.userId] || conv.lastSeen || null, false).text}`}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <h3 className={`font-semibold text-xs truncate ${isSelected ? "text-[#0785BC]" : "text-slate-900"}`}>
                            {conv.userName}
                          </h3>
                          {onlineUserIds.has(conv.userId) ? (
                            <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                              <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                              Online
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-1 py-0.2 rounded text-[9px] font-medium bg-slate-100 text-slate-400 border border-slate-200 shrink-0">
                              Offline
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-mono text-slate-400 shrink-0 ml-1.5">
                          {conv.timestamp}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate leading-snug">{getCleanMessagePreview(conv.lastMessage)}</p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 mt-0.5">
                      {conv.unread && (
                        <div className="w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteConversation(conv.id);
                        }}
                        title="Hapus sesi percakapan"
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Area Chat (ChatGPT Canvas Style) */}
        {selectedConversation ? (
          <div className="flex-1 flex flex-col h-full bg-[#f8faff] min-w-0">
            {/* Header Chat */}
            <div className="h-16 px-3 sm:px-6 bg-white border-b border-slate-100 flex items-center justify-between shrink-0 gap-2">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => setSelectedConversation(null)}
                  className="lg:hidden p-1.5 -ml-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors shrink-0 cursor-pointer"
                  title="Kembali ke daftar pesan"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="relative shrink-0">
                  {selectedConversation.userFoto ? (
                    <img
                      src={selectedConversation.userFoto}
                      alt={selectedConversation.userName}
                      className="w-8 h-8 rounded-lg object-cover border border-slate-200 shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-[#0785BC] text-white flex items-center justify-center font-bold text-xs">
                      {(selectedConversation.userName || "U").charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-white transition-all duration-300 ${
                      onlineUserIds.has(selectedConversation.userId) ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)] animate-pulse" : "bg-slate-300"
                    }`}
                    title={onlineUserIds.has(selectedConversation.userId) ? "Online" : "Offline"}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <h3 className="font-bold text-slate-900 text-xs sm:text-sm truncate">{selectedConversation.userName}</h3>
                    {(() => {
                      const isOnline = onlineUserIds.has(selectedConversation.userId);
                      return isOnline ? (
                        <span
                          title="Pengguna sedang online"
                          className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Online
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-500 border border-slate-200 shrink-0"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                          Offline
                        </span>
                      );
                    })()}
                  </div>
                  {(() => {
                    const isOnline = onlineUserIds.has(selectedConversation.userId);
                    const lastSeenTime = lastSeenMap[selectedConversation.userId] || selectedConversation.lastSeen;
                    const statusInfo = formatLastSeen(lastSeenTime, isOnline);
                    return (
                      <p className="text-[10px] sm:text-[11px] text-slate-500 truncate mt-0.5">
                        <span className="text-slate-400 font-mono text-[10px]">{selectedConversation.userEmail}</span>
                        <span className="text-slate-300 mx-1">•</span>
                        <span className={isOnline ? "text-emerald-600 font-semibold" : "text-slate-500"}>
                          {isOnline ? "Aktif sekarang" : statusInfo.text}
                        </span>
                      </p>
                    );
                  })()}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={handleClearHistory}
                  title="Bersihkan riwayat pesan"
                  className="inline-flex items-center gap-1 p-1.5 sm:px-2.5 sm:py-1 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 rounded-lg border border-slate-200 transition-all active:scale-95 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                  <span className="hidden sm:inline">Bersihkan</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteConversation(selectedConversation.id)}
                  title="Hapus seluruh sesi"
                  className="inline-flex items-center gap-1 p-1.5 sm:px-2.5 sm:py-1 text-xs font-medium text-rose-600 bg-white hover:bg-rose-50 rounded-lg border border-rose-200 transition-all active:scale-95 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                  <span className="hidden sm:inline">Hapus</span>
                </button>
              </div>
            </div>

            {/* Pesan Stream */}
            <div className="flex-1 p-3 sm:p-5 overflow-y-auto space-y-3">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 text-xs py-10">
                  <MessageSquare className="w-8 h-8 mb-2 text-slate-300" />
                  <p>Mulai percakapan langsung dengan pengguna ini.</p>
                </div>
              ) : (
                messages
                  .filter((msg, idx, arr) => arr.findIndex((m) => m.id === msg.id) === idx)
                  .sort((a, b) => new Date(a.rawDate || 0).getTime() - new Date(b.rawDate || 0).getTime())
                  .map((msg, index, arr) => {
                    const showDateBadge =
                      index === 0 ||
                      isDifferentDay(msg.rawDate, arr[index - 1]?.rawDate);
                    const parsed = parseMessageContent(msg.text);

                    return (
                      <React.Fragment key={msg.id ? `msg-${msg.id}` : `idx-${index}`}>
                      {showDateBadge && (
                        <div className="w-full flex justify-center my-3 select-none">
                          <span className="px-3 py-1 rounded-full text-[11px] font-medium text-slate-500 bg-slate-100/90 shadow-2xs border border-slate-200/80">
                            {formatChatDateBadge(msg.rawDate)}
                          </span>
                        </div>
                      )}
                      <div
                        id={`msg-${msg.id}`}
                        className={`flex group/bubble items-end gap-1.5 transition-all ${
                          msg.senderRole === "admin" ? "justify-end" : "justify-start"
                        }`}
                      >
                        {msg.senderRole === "admin" && !editingMessageId && (
                          <button
                            type="button"
                            onClick={() => handleStartReply(msg)}
                            className="opacity-0 group-hover/bubble:opacity-100 p-1 text-slate-400 hover:text-[#0785BC] hover:bg-slate-100 rounded-full transition-all shrink-0 mb-1"
                            title="Balas pesan ini"
                          >
                            <Reply className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <div
                          className={`relative w-fit min-w-[70px] max-w-[min(26rem,82vw)] text-xs transition-all ${
                            msg.senderRole === "admin"
                              ? "bg-[#0785BC] text-white rounded-2xl rounded-tr-xs shadow-xs pl-3.5 pr-7 py-2"
                              : "bg-white text-slate-800 border border-slate-200/90 shadow-2xs rounded-2xl rounded-tl-xs px-3.5 py-2"
                          }`}
                        >
                          {/* Quoted Message Preview inside Bubble */}
                          {parsed.replyTo && (
                            <div
                              onClick={() => {
                                const target = document.getElementById(`msg-${parsed.replyTo?.id}`);
                                if (target) {
                                  target.scrollIntoView({ behavior: "smooth", block: "center" });
                                  target.classList.add("ring-2", "ring-sky-400", "rounded-2xl");
                                  setTimeout(() => target.classList.remove("ring-2", "ring-sky-400", "rounded-2xl"), 1500);
                                }
                              }}
                              className={`mb-1.5 px-2.5 py-1.5 rounded-lg border-l-[3px] text-left cursor-pointer transition-opacity hover:opacity-90 select-none ${
                                msg.senderRole === "admin"
                                  ? "border-white bg-black/20 text-white"
                                  : "border-[#0785BC] bg-slate-100/90 text-slate-800"
                              }`}
                            >
                              <div className={`text-[10px] font-bold flex items-center gap-1 ${
                                msg.senderRole === "admin" ? "text-white" : "text-[#0785BC]"
                              }`}>
                                <Reply className="w-2.5 h-2.5" />
                                <span>{parsed.replyTo.senderName}</span>
                              </div>
                              <p className={`text-[11px] truncate mt-0.5 ${
                                msg.senderRole === "admin" ? "text-white/80" : "text-slate-600"
                              }`}>
                                {parsed.replyTo.text}
                              </p>
                            </div>
                          )}

                          {editingMessageId === msg.id ? (
                            <div className="flex items-center gap-2">
                              <input
                                value={editingText}
                                onChange={(e) => setEditingText(e.target.value)}
                                className="min-w-44 rounded-lg px-2.5 py-1 text-xs text-slate-900 bg-white shadow-inner focus:outline-none focus:ring-2 focus:ring-white"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleSaveEditMessage(msg);
                                  if (e.key === "Escape") {
                                    setEditingMessageId(null);
                                    setEditingText("");
                                  }
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveEditMessage(msg)}
                                title="Simpan perubahan"
                                className="p-1 hover:bg-white/20 rounded transition-colors text-white"
                              >
                                <CheckCheck className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingMessageId(null);
                                  setEditingText("");
                                }}
                                title="Batal"
                                className="p-1 hover:bg-white/20 rounded transition-colors text-white/80"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <p className="leading-relaxed whitespace-pre-wrap">{parsed.text}</p>
                          )}

                          {msg.senderRole === "admin" &&
                            editingMessageId !== msg.id &&
                            typeof msg.id === "string" &&
                            !msg.id.startsWith("temp-") && (
                              <details className="absolute right-1.5 top-1.5 z-10">
                                <summary className="list-none cursor-pointer rounded-full p-0.5 text-sky-200/80 hover:bg-white/15 hover:text-white transition-colors">
                                  <MoreVertical className="h-3 w-3" />
                                </summary>
                                <div className="absolute right-0 bottom-full mb-1 z-20 min-w-28 overflow-hidden rounded-xl bg-white py-1 text-left text-xs text-slate-700 shadow-xl border border-slate-200 animate-scale-in">
                                  <button type="button" onClick={() => handleStartReply(msg)} className="flex w-full items-center gap-2 px-3 py-1.5 hover:bg-slate-50 transition-colors"><Reply className="h-3.5 w-3.5 text-slate-500" /> Balas</button>
                                  <button type="button" onClick={() => { setEditingMessageId(msg.id); setEditingText(parsed.text); }} className="flex w-full items-center gap-2 px-3 py-1.5 hover:bg-slate-50 transition-colors"><Pencil className="h-3.5 w-3.5 text-slate-500" /> Edit</button>
                                  <button type="button" onClick={() => handleDeleteSingleMessage(msg.id)} className="flex w-full items-center gap-2 px-3 py-1.5 text-rose-600 hover:bg-rose-50 transition-colors"><Trash2 className="h-3.5 w-3.5 text-rose-500" /> Hapus</button>
                                </div>
                              </details>
                            )}

                          <div
                            className={`flex items-center gap-1 mt-1 font-mono text-[9px] justify-end ${
                              msg.senderRole === "admin" ? "text-sky-100" : "text-slate-400"
                            }`}
                          >
                            <span>{msg.timestamp}</span>
                            {msg.senderRole === "admin" && (
                              (() => {
                                const isTemp = typeof msg.id === "string" && msg.id.startsWith("temp-");
                                const isUserOnline = selectedConversation?.userId
                                  ? onlineUserIds.has(selectedConversation.userId)
                                  : false;
                                const tick = msg.isRead
                                  ? "read"
                                  : isUserOnline && !isTemp
                                    ? "delivered"
                                    : "sent";
                                return (
                                  <span
                                    className="transition-colors duration-200"
                                    title={
                                      isTemp
                                        ? "Mengirim..."
                                        : tick === "read"
                                          ? "Dibaca oleh pengguna ✓✓"
                                          : tick === "delivered"
                                            ? "Terkirim ke pengguna (Online) ✓✓"
                                            : "Terkirim ke server (Offline) ✓"
                                    }
                                  >
                                    {isTemp ? (
                                      <Clock3 className="w-3.5 h-3.5 text-sky-100/70 animate-pulse" />
                                    ) : tick === "read" ? (
                                      <CheckCheck className="w-3.5 h-3.5 text-[#38bdf8] stroke-[2.5] drop-shadow-[0_0_3px_rgba(56,189,248,0.7)]" />
                                    ) : tick === "delivered" ? (
                                      <CheckCheck className="w-3.5 h-3.5 text-sky-100/90 stroke-[2]" />
                                    ) : (
                                      <Check className="w-3.5 h-3.5 text-sky-100/70 stroke-[2]" />
                                    )}
                                  </span>
                                );
                              })()
                            )}
                          </div>
                        </div>
                        {msg.senderRole !== "admin" && (
                          <button
                            type="button"
                            onClick={() => handleStartReply(msg)}
                            className="opacity-0 group-hover/bubble:opacity-100 p-1 text-slate-400 hover:text-[#0785BC] hover:bg-slate-100 rounded-full transition-all shrink-0 mb-1"
                            title="Balas pesan ini"
                          >
                            <Reply className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </React.Fragment>
                  );
                })
              )}

              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-[11px] text-slate-500 italic shadow-2xs">
                    Pengguna sedang mengetik...
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Box (ChatGPT Prompt Input Aesthetic) */}
            <div className="p-2.5 sm:p-3 border-t border-slate-100 bg-white">
              {replyingTo && (
                <div className="max-w-4xl mx-auto mb-2 flex items-center justify-between gap-2 px-3 py-2 bg-slate-100/90 border-l-4 border-[#0785BC] rounded-r-xl shadow-2xs animate-in fade-in slide-in-from-bottom-1 duration-150">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#0785BC]">
                      <Reply className="w-3 h-3" />
                      <span>Membalas {replyingTo.senderName}</span>
                    </div>
                    <p className="text-[11px] text-slate-600 truncate mt-0.5">
                      {replyingTo.text}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReplyingTo(null)}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-200/60 transition-colors"
                    title="Batal membalas"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              <div className="flex items-center gap-2 max-w-4xl mx-auto bg-slate-50/80 border border-slate-200 rounded-xl p-1.5 focus-within:ring-2 focus-within:ring-[#0785BC]/20 focus-within:border-[#0785BC] transition-all">
                <input
                  ref={messageInputRef}
                  type="text"
                  value={newMessage}
                  onChange={(e) => handleTypingInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                    if (e.key === "Escape" && replyingTo) {
                      setReplyingTo(null);
                    }
                  }}
                  placeholder={replyingTo ? `Balas ke ${replyingTo.senderName}...` : "Ketik pesan balasan..."}
                  className="flex-1 px-3 py-1.5 text-xs bg-transparent border-none focus:outline-none text-slate-800 placeholder-slate-400 min-w-0"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || sending}
                  className="p-2 bg-[#0785BC] hover:bg-[#0672a0] text-white rounded-lg disabled:opacity-40 transition-colors shrink-0 active:scale-95 shadow-xs"
                  title="Kirim Pesan"
                >
                  {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="hidden lg:flex flex-1 items-center justify-center text-slate-400 text-xs bg-[#fafafa]">
            <div className="text-center">
              <MessageSquare className="w-9 h-9 mx-auto mb-2 text-slate-300" />
              <p className="font-semibold text-slate-700">Pusat Layanan & Chat Pengguna</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Pilih salah satu percakapan di sebelah kiri untuk melihat pesan.</p>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

