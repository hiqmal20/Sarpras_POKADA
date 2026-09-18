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
  X,
} from "lucide-react";
import api, { getCurrentUser } from "@/lib/api";
import { getSocket, joinChatRoom, leaveChatRoom } from "@/lib/socket";
import { formatChatDateBadge, isDifferentDay, formatLastSeen } from "@/lib/chatHelper";
import { UserLayout } from "@/components/user";

interface Conversation {
  id: string;
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
}

export default function UserMessagesPage() {
  const bottomRef = useRef<HTMLDivElement>(null);

  const [currentUser, setCurrentUser] = useState<any>(null);
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

  const activeIdRef = useRef<string | null>(null);
  activeIdRef.current = activeId;

  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        const mapped: Conversation[] = (res.data as any[]).map((c) => {
          const partner = c.admin || {};
          if (c.is_partner_online) {
            setAdminOnline(true);
          }
          if (c.partner_last_seen) {
            setAdminLastSeen(c.partner_last_seen);
          }
          return {
            id: c.id,
            title: partner.name || c.subject || "Admin Support Sarpras",
            preview: c.last_message || c.subject || "Percakapan aktif dengan Admin",
            time: c.last_message_at || c.updated_at
              ? new Date(c.last_message_at || c.updated_at).toLocaleTimeString("id-ID", {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "Baru saja",
            unread: Boolean(c.unread_count && c.unread_count > 0),
            isOnline: Boolean(c.is_partner_online),
            lastSeen: c.partner_last_seen || null,
          };
        });

        setConversations(mapped);
        mapped.forEach((conv) => joinChatRoom(conv.id));

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
  }, [loadConversations]);

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
            const isMe = Boolean(
              sender.id === userId ||
              m.sender_id === userId ||
              (sender.role !== "Admin" && sender.role !== "Petugas" && !sender.role)
            );

            return {
              id: String(m.id),
              sender_id: String(m.sender_id || sender.id || ""),
              isMe,
              senderName: isMe
                ? user?.name || "Saya"
                : sender.name || "Admin Support Sarpras",
              senderRole: isMe ? "user" : "admin",
              senderFoto: sender.foto || null,
              text: m.message || "",
              rawDate: m.created_at || new Date().toISOString(),
              time: m.created_at
                ? new Date(m.created_at).toLocaleTimeString("id-ID", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "",
              isRead: Boolean(m.is_read),
            };
          });

          setMessages((previous) => {
            const pending = previous.filter(
              (message) =>
                message.id.startsWith("temp-") &&
                !mapped.some((item) => item.text === message.text)
            );
            return [...mapped, ...pending];
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
    }, 10000);

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
      const user = currentUser || getCurrentUser();
      const userId = user?.id;
      const sender = msg.sender || {};
      const senderId = String(sender.id || msg.sender_id || "");
      const isMe = Boolean(
        userId && (senderId === userId || (sender.role !== "Admin" && sender.role !== "Petugas" && !sender.role))
      );

      if (incomingChatId === currentActiveId) {
        const formatted: Message = {
          id: String(msg.id || `msg-${Date.now()}`),
          sender_id: senderId,
          isMe,
          senderName: isMe ? user?.name || "Saya" : sender.name || "Admin Support Sarpras",
          senderRole: isMe ? "user" : "admin",
          senderFoto: sender.foto || null,
          text: msg.message || "",
          rawDate: msg.created_at || new Date().toISOString(),
          time: msg.created_at
            ? new Date(msg.created_at).toLocaleTimeString("id-ID", {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "Baru saja",
          isRead: Boolean(msg.is_read),
        };

        setMessages((prev) => {
          if (prev.some((m) => String(m.id) === formatted.id)) return prev;
          const tempIdx = prev.findIndex(
            (m) => m.id.startsWith("temp-") && m.text === formatted.text
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

      setConversations((prev) =>
        prev.map((c) =>
          String(c.id) === incomingChatId
            ? {
                ...c,
                preview: msg.message || c.preview,
                time: "Baru saja",
                unread: incomingChatId !== currentActiveId && !isMe,
              }
            : c
        )
      );
    };

    const handleMessagesRead = (data: { chatId: string }) => {
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
      if (data?.chatId === activeIdRef.current && data.user?.role !== "Mahasiswa" && data.user?.role !== "Dosen") {
        setIsAdminTyping(true);
      }
    };

    const handleUserStopTyping = (data: { chatId?: string }) => {
      if (data?.chatId === activeIdRef.current) {
        setIsAdminTyping(false);
      }
    };

    const handlePresenceSnapshot = (users: { role?: string; userId?: string }[]) => {
      if (Array.isArray(users)) {
        const hasAdmin = users.some((u) => u.role === "Admin" || u.role === "Petugas");
        setAdminOnline(hasAdmin);
      }
    };

    const handleUserOnline = (data: { role?: string }) => {
      if (data?.role === "Admin" || data?.role === "Petugas") {
        setAdminOnline(true);
      }
    };

    const handleUserOffline = (data: { role?: string; lastSeen?: string }) => {
      if (data?.role === "Admin" || data?.role === "Petugas") {
        setAdminOnline(false);
        if (data.lastSeen) setAdminLastSeen(data.lastSeen);
      }
    };

    const handleUserStatusChange = (data: { role?: string; online?: boolean; last_seen?: string }) => {
      if (data?.role === "Admin" || data?.role === "Petugas") {
        setAdminOnline(Boolean(data.online));
        if (data.last_seen) setAdminLastSeen(data.last_seen);
      }
    };

    socket.on("new_message", handleNewMessage);
    socket.on("messages_read", handleMessagesRead);
    socket.on("message_updated", handleMessageUpdated);
    socket.on("message_deleted", handleMessageDeleted);
    socket.on("chat_cleared", handleChatCleared);
    socket.on("chat_deleted", handleChatDeleted);
    socket.on("user_typing", handleUserTyping);
    socket.on("user_stop_typing", handleUserStopTyping);
    socket.on("presence_snapshot", handlePresenceSnapshot);
    socket.on("user_online", handleUserOnline);
    socket.on("user_offline", handleUserOffline);
    socket.on("user_status_change", handleUserStatusChange);

    if (socket.connected) {
      socket.emit("get_online_users");
    }

    return () => {
      socket.off("new_message", handleNewMessage);
      socket.off("messages_read", handleMessagesRead);
      socket.off("message_updated", handleMessageUpdated);
      socket.off("message_deleted", handleMessageDeleted);
      socket.off("chat_cleared", handleChatCleared);
      socket.off("chat_deleted", handleChatDeleted);
      socket.off("user_typing", handleUserTyping);
      socket.off("user_stop_typing", handleUserStopTyping);
      socket.off("presence_snapshot", handlePresenceSnapshot);
      socket.off("user_online", handleUserOnline);
      socket.off("user_offline", handleUserOffline);
      socket.off("user_status_change", handleUserStatusChange);
    };
  }, [currentUser]);

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
      text,
      rawDate: nowIso,
      time: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
      isRead: false,
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
        });
      } else {
        const result = await api.chats.sendMessage(activeId, { message: text });
        if (result.status !== "success") {
          setMessages((prev) => prev.filter((message) => message.id !== tempId));
        }
      }
    } catch (err) {
      console.error("Gagal mengirim pesan ke database:", err);
    } finally {
      setSending(false);
    }
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
      alert("Gagal mengedit pesan: " + (err.message || err));
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
      alert("Gagal menghapus pesan: " + (err.message || err));
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
      }
    } catch (err: any) {
      alert("Gagal menghapus percakapan: " + (err.message || err));
    }
  };

  const filteredConvs = conversations.filter((c) =>
    !searchConv || c.title.toLowerCase().includes(searchConv.toLowerCase())
  );

  return (
    <UserLayout fullWidth={true} showSearch={false}>
      <div className="flex min-w-0 h-full min-h-[32rem] flex-col overflow-hidden bg-white lg:flex-row">
        {/* ── Left Pane: Conversation List ── */}
        <div className="w-full shrink-0 bg-white border-b border-slate-100 flex flex-col h-80 lg:h-full lg:w-80 lg:border-b-0 lg:border-r">
          {/* Header */}
          <div className="p-4 border-b border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-slate-900">Pesan Bantuan</h2>
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  adminOnline ? "bg-emerald-500 animate-pulse" : "bg-slate-300"
                }`}
                title={adminOnline ? "Admin Online" : "Admin Offline"}
              />
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Cari percakapan..."
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
                Tidak ada percakapan aktif.
              </div>
            ) : (
              filteredConvs.map((conv) => {
                const isActive = activeId === conv.id;
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
                        className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${
                          adminOnline ? "bg-emerald-500 animate-pulse" : "bg-slate-300"
                        }`}
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
                      <p className="text-xs text-slate-500 truncate">{conv.preview}</p>
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
        <div className="flex-1 flex flex-col h-full bg-[#f8faff] min-w-0">
          {/* Chat Header */}
          <div className="h-16 px-6 bg-white border-b border-slate-100 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-[#0785BC] text-white flex items-center justify-center shrink-0 shadow-xs shadow-[#0785BC]/20">
                <Shield className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                    Admin Support Sarpras
                  </h3>
                  {(() => {
                    const statusInfo = formatLastSeen(adminLastSeen, adminOnline);
                    if (statusInfo.isOnline) {
                      return (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold border bg-emerald-50 text-emerald-700 border-emerald-100 inline-flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Online
                        </span>
                      );
                    }
                    return (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-medium border bg-slate-50 text-slate-500 border-slate-200">
                        {statusInfo.text}
                      </span>
                    );
                  })()}
                </div>
                <p className="text-[11px] text-slate-400 truncate">
                  Petugas siap membantu kendala dan pengajuan fasilitas Anda
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleDeleteChat}
                className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                title="Hapus percakapan"
                aria-label="Hapus chat"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Messages Bubble Scroll Area */}
          <div className="flex-1 p-6 overflow-y-auto space-y-4">
            {loadingMessages ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin text-[#0785BC] mb-2" />
                <p className="text-xs">Memuat riwayat chat...</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6">
                <div className="w-16 h-16 rounded-2xl bg-blue-50 text-[#0785BC] flex items-center justify-center mb-3">
                  <MessageSquare className="w-8 h-8" />
                </div>
                <h4 className="text-sm font-bold text-slate-800">
                  Mulai Percakapan dengan Admin
                </h4>
                <p className="text-xs text-slate-400 mt-1 max-w-sm">
                  Silakan tanyakan ketersediaan barang, konfirmasi peminjaman, atau bantuan sarpras lainnya.
                </p>
              </div>
            ) : (
              messages.map((m, index) => {
                const showDateBadge =
                  index === 0 || isDifferentDay(m.rawDate, messages[index - 1]?.rawDate);

                if (m.isMe) {
                  // User's own message (right side)
                  return (
                    <React.Fragment key={m.id || index}>
                      {showDateBadge && (
                        <div className="flex justify-center my-2 sticky top-1 z-10 select-none">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono text-slate-500 bg-white shadow-2xs border border-slate-200/80">
                            {formatChatDateBadge(m.rawDate)}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-end items-end gap-2">
                        <div className="max-w-md sm:max-w-lg bg-[#0785BC] text-white rounded-2xl rounded-br-xs px-4 py-3 shadow-xs">
                          {editingMessageId === m.id ? (
                            <div className="flex items-center gap-2">
                              <input
                                value={editingText}
                                onChange={(e) => setEditingText(e.target.value)}
                                className="min-w-40 rounded px-2 py-1 text-xs text-slate-900 bg-white focus:outline-none"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleEditMessage(m);
                                  if (e.key === "Escape") setEditingMessageId(null);
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => handleEditMessage(m)}
                                title="Simpan"
                                className="p-1 hover:bg-white/20 rounded transition-colors text-white"
                              >
                                <CheckCheck className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingMessageId(null)}
                                title="Batal"
                                className="p-1 hover:bg-white/20 rounded transition-colors text-white/80"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ) : (
                            <p className="text-xs sm:text-sm whitespace-pre-wrap leading-relaxed">
                              {m.text}
                            </p>
                          )}

                          {editingMessageId !== m.id &&
                            typeof m.id === "string" &&
                            !m.id.startsWith("temp-") && (
                              <div className="mt-1 flex justify-end gap-2 text-white/70 hover:text-white">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingMessageId(m.id);
                                    setEditingText(m.text);
                                  }}
                                  title="Edit pesan"
                                  className="hover:text-white transition-colors"
                                >
                                  <Pencil className="h-3 w-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteMessage(m.id)}
                                  title="Hapus pesan"
                                  className="hover:text-rose-200 transition-colors"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            )}

                          <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-white/80 font-mono">
                            <span>{m.time}</span>
                            <span title={m.isRead ? "Dibaca oleh Admin" : "Terkirim"}>
                              {m.isRead ? (
                                <CheckCheck className="w-3.5 h-3.5 text-cyan-200 stroke-[2.5]" />
                              ) : (
                                <Check className="w-3.5 h-3.5 text-white/70 stroke-[2]" />
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    </React.Fragment>
                  );
                }

                // Admin's message (left side)
                return (
                  <React.Fragment key={m.id || index}>
                    {showDateBadge && (
                      <div className="flex justify-center my-2 sticky top-1 z-10 select-none">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono text-slate-500 bg-white shadow-2xs border border-slate-200/80">
                          {formatChatDateBadge(m.rawDate)}
                        </span>
                      </div>
                    )}
                    <div className="flex items-start gap-3 max-w-md sm:max-w-lg">
                      <div className="w-8 h-8 rounded-xl bg-[#0785BC] text-white flex items-center justify-center text-xs font-bold shrink-0 mt-1 shadow-xs">
                        A
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold text-slate-800">
                            {m.senderName}
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-blue-50 text-[#0785BC]">
                            Petugas
                          </span>
                        </div>
                        <div className="bg-white border border-slate-200/80 text-slate-800 rounded-2xl rounded-tl-xs px-4 py-3 shadow-xs">
                          <p className="text-xs sm:text-sm whitespace-pre-wrap leading-relaxed">
                            {m.text}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-1 text-right font-mono">
                            {m.time}
                          </p>
                        </div>
                      </div>
                    </div>
                  </React.Fragment>
                );
              })
            )}

            {isAdminTyping && (
              <div className="flex items-center gap-2 text-slate-400 text-xs italic">
                <div className="bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-2xs text-[11px] text-slate-500">
                  Admin sedang mengetik...
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Chat Input Bar */}
          <div className="p-4 bg-white border-t border-slate-100 shrink-0">
            <form onSubmit={handleSend} className="flex items-center gap-2 max-w-4xl mx-auto">
              <input
                type="text"
                value={input}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Tulis pesan ke admin sarpras... (Tekan Enter untuk kirim)"
                disabled={sending || !activeId}
                className="flex-1 px-4 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0785BC] transition-all text-slate-800 placeholder-slate-400"
              />

              <button
                type="submit"
                disabled={!input.trim() || sending || !activeId}
                className="px-5 py-2.5 bg-[#0785BC] hover:bg-[#0672a0] text-white rounded-2xl font-semibold text-xs sm:text-sm flex items-center gap-2 shadow-xs transition-all disabled:opacity-50 cursor-pointer"
              >
                {sending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span className="hidden sm:inline">Kirim</span>
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
