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
  Pencil,
  X,
} from "lucide-react";
import { AdminLayout } from "@/components/admin";
import api, { getCurrentUser } from "@/lib/api";
import { getSocket, joinChatRoom, leaveChatRoom } from "@/lib/socket";
import { formatChatDateBadge, isDifferentDay, formatLastSeen } from "@/lib/chatHelper";

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
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");

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
        const mapped: Conversation[] = (res.data as any[]).map((c) => {
          const partner = (c.user && c.user.id !== user?.id ? c.user : c.admin) || c.user || c.admin || {};
          const resolvedUserId = String(partner.id || (c.user_id !== user?.id ? c.user_id : c.admin_id) || c.user_id || "");
          const partnerLastSeen = c.partner_last_seen || partner.last_seen || null;
          if (resolvedUserId && partnerLastSeen) {
            initialLastSeen[resolvedUserId] = partnerLastSeen;
          }
          if (c.is_partner_online && resolvedUserId) {
            setOnlineUserIds((prev) => new Set(prev).add(resolvedUserId));
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
          setLastSeenMap((prev) => ({ ...prev, ...initialLastSeen }));
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
            const hasChanged =
              msgs.length !== prev.length ||
              msgs.some(
                (m, idx) =>
                  !prev[idx] ||
                  prev[idx].id !== m.id ||
                  prev[idx].isRead !== m.isRead ||
                  prev[idx].text !== m.text
              );
            if (!hasChanged) return prev;
            const tempMsgs = prev.filter(
              (p) => p.id.startsWith("temp-") && !msgs.some((m) => m.text === p.text)
            );
            return [...msgs, ...tempMsgs];
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
        if (prev.some((m) => String(m.id) === formattedMsg.id)) return prev;
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

    const handleMessagesRead = (data: { chatId: string }) => {
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
      const ids = Array.isArray(data) ? data : data?.onlineUserIds || [];
      setOnlineUserIds(new Set(ids.map(String)));
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
        const ids = users.map((u) => String(u.userId || u.id)).filter(Boolean);
        setOnlineUserIds((prev) => new Set([...prev, ...ids]));
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
    window.addEventListener("socket-connected", handleSocketReconnect);

    // Initial check online users & periodic sync
    requestOnlineUsers();
    const onlineInterval = setInterval(requestOnlineUsers, 8000);

    return () => {
      clearInterval(onlineInterval);
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
    } catch (err: any) {
      alert("Gagal membersihkan riwayat pesan: " + (err.message || err));
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
    } catch (err: any) {
      alert("Gagal menghapus percakapan: " + (err.message || err));
    }
  };

  const handleSaveEditMessage = async (msg: Message) => {
    if (!selectedConversation || !editingText.trim()) return;
    const newText = editingText.trim();
    try {
      const res = await api.chats.updateMessage(selectedConversation.id, msg.id, newText);
      if (res.status === "success") {
        setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, text: newText } : m)));
        const socket = getSocket();
        if (socket?.connected) {
          socket.emit("edit_message", {
            chatId: selectedConversation.id,
            messageId: msg.id,
            message: newText,
          });
        }
      }
    } catch (err: any) {
      alert("Gagal mengedit pesan: " + (err.message || err));
    } finally {
      setEditingMessageId(null);
      setEditingText("");
    }
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
      alert("Gagal menghapus pesan: " + (err.message || err));
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
      text: messageText,
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
          message: messageText,
        });
      } else {
        await api.chats.sendMessage(selectedConversation.id, {
          message: messageText,
        });
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
    <AdminLayout>
      <div className="flex h-[calc(100vh-8.5rem)] bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
        {/* Sidebar Percakapan (ChatGPT Chat History Style) */}
        <div className="w-80 border-r border-slate-200/90 flex flex-col bg-slate-50/40">
          <div className="p-3.5 border-b border-slate-200/80 bg-white">
            <div className="flex items-center justify-between mb-2.5">
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono">Percakapan Aktif</h2>
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
                    className={`w-full px-3.5 py-3 flex items-start gap-3 hover:bg-slate-100/70 transition-all group cursor-pointer relative ${
                      isSelected ? "bg-white shadow-2xs border-l-2 border-[#0785BC]" : ""
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
                        className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-white ${
                          onlineUserIds.has(conv.userId) ? "bg-emerald-500" : "bg-slate-300"
                        }`}
                        title={onlineUserIds.has(conv.userId) ? "Online" : "Offline"}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <h3 className={`font-semibold text-xs truncate ${isSelected ? "text-[#0785BC]" : "text-slate-900"}`}>
                          {conv.userName}
                        </h3>
                        <span className="text-[10px] font-mono text-slate-400 shrink-0 ml-1.5">
                          {conv.timestamp}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate leading-snug">{conv.lastMessage}</p>
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
          <div className="flex-1 flex flex-col min-w-0 bg-white">
            {/* Header Chat */}
            <div className="px-5 py-3 border-b border-slate-200/80 flex items-center justify-between bg-slate-50/40">
              <div className="flex items-center gap-3">
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
                    className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full ring-2 ring-white ${
                      onlineUserIds.has(selectedConversation.userId) ? "bg-emerald-500" : "bg-slate-300"
                    }`}
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 text-xs">{selectedConversation.userName}</h3>
                    {(() => {
                      const isOnline = onlineUserIds.has(selectedConversation.userId);
                      const lastSeenTime = lastSeenMap[selectedConversation.userId] || selectedConversation.lastSeen;
                      const statusInfo = formatLastSeen(lastSeenTime, isOnline);

                      if (statusInfo.isOnline) {
                        return (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            LIVE
                          </span>
                        );
                      }
                      return (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-500 bg-slate-100 border border-slate-200">
                          {statusInfo.text}
                        </span>
                      );
                    })()}
                  </div>
                  <p className="text-[10px] font-mono text-slate-400">{selectedConversation.userEmail}</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleClearHistory}
                  title="Bersihkan riwayat pesan"
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 rounded-lg border border-slate-200 transition-all active:scale-95"
                >
                  <RotateCcw className="w-3 h-3 text-slate-500" />
                  Bersihkan
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteConversation(selectedConversation.id)}
                  title="Hapus seluruh sesi"
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-rose-600 bg-white hover:bg-rose-50 rounded-lg border border-rose-200 transition-all active:scale-95"
                >
                  <Trash2 className="w-3 h-3 text-rose-500" />
                  Hapus
                </button>
              </div>
            </div>

            {/* Pesan Stream */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-[#fafafa]/80">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 text-xs py-10">
                  <MessageSquare className="w-8 h-8 mb-2 text-slate-300" />
                  <p>Mulai percakapan langsung dengan pengguna ini.</p>
                </div>
              ) : (
                messages.map((msg, index) => {
                  const showDateBadge =
                    index === 0 ||
                    isDifferentDay(msg.rawDate, messages[index - 1].rawDate);

                  return (
                    <React.Fragment key={msg.id || index}>
                      {showDateBadge && (
                        <div className="flex justify-center my-2 sticky top-1 z-10 select-none">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono text-slate-500 bg-white shadow-2xs border border-slate-200/80">
                            {formatChatDateBadge(msg.rawDate)}
                          </span>
                        </div>
                      )}
                      <div
                        className={`flex ${msg.senderRole === "admin" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[72%] px-3.5 py-2.5 rounded-xl text-xs ${
                            msg.senderRole === "admin"
                              ? "bg-[#0785BC] text-white rounded-br-none shadow-xs"
                              : "bg-white text-slate-800 border border-slate-200/80 shadow-2xs rounded-bl-none"
                          }`}
                        >
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
                            <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                          )}

                          {msg.senderRole === "admin" &&
                            editingMessageId !== msg.id &&
                            typeof msg.id === "string" &&
                            !msg.id.startsWith("temp-") && (
                              <div className="mt-1 flex justify-end gap-2 text-sky-200/80">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingMessageId(msg.id);
                                    setEditingText(msg.text);
                                  }}
                                  title="Edit pesan"
                                  className="hover:text-white transition-colors"
                                >
                                  <Pencil className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteSingleMessage(msg.id)}
                                  title="Hapus pesan"
                                  className="hover:text-rose-200 transition-colors"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            )}

                          <div
                            className={`flex items-center gap-1 mt-1 font-mono text-[9px] ${
                              msg.senderRole === "admin" ? "text-sky-100 justify-end" : "text-slate-400 justify-start"
                            }`}
                          >
                            <span>{msg.timestamp}</span>
                            {msg.senderRole === "admin" && (
                              <span title={msg.isRead ? "Dibaca" : "Terkirim"}>
                                {msg.isRead ? (
                                  <CheckCheck className="w-3.5 h-3.5 text-cyan-200 stroke-[2.5]" />
                                ) : (
                                  <Check className="w-3.5 h-3.5 text-sky-200/80 stroke-[2]" />
                                )}
                              </span>
                            )}
                          </div>
                        </div>
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
            <div className="p-3 border-t border-slate-200/80 bg-white">
              <div className="flex items-center gap-2 max-w-4xl mx-auto bg-slate-50/80 border border-slate-200 rounded-xl p-1.5 focus-within:ring-2 focus-within:ring-[#0785BC]/20 focus-within:border-[#0785BC] transition-all">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => handleTypingInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Ketik pesan balasan... (Tekan Enter untuk kirim)"
                  className="flex-1 px-3 py-1.5 text-xs bg-transparent border-none focus:outline-none text-slate-800 placeholder-slate-400"
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
          <div className="flex-1 flex items-center justify-center text-slate-400 text-xs bg-[#fafafa]">
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
