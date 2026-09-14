"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  Paperclip,
  Smile,
  Send,
  MoreVertical,
  Wrench,
  Loader2,
  MessageSquare,
  Trash2,
  RotateCcw,
  Check,
  CheckCheck,
} from "lucide-react";
import api, { getCurrentUser } from "@/lib/api";
import { getSocket, joinChatRoom } from "@/lib/socket";
import UserSidebar from "@/components/user/Sidebar";
import UserNavbar from "@/components/user/Navbar";
import { formatChatDateBadge, isDifferentDay, formatLastSeen } from "@/lib/chatHelper";

// ── Types ──
interface Conversation {
  id: string;
  adminId?: string;
  title: string;
  preview: string;
  time: string;
  unread?: boolean;
  lastSeen?: string | null;
}

interface Message {
  id: string;
  from: "admin" | "user";
  text: string;
  time: string;
  rawDate?: string;
  attachment?: { name: string; subtitle: string; body: string };
  isRead?: boolean;
}

export default function UserMessagesPage() {
  const bottomRef = useRef<HTMLDivElement>(null);
  const activeIdRef = useRef<string>("");
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [searchConv, setSearchConv] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isAdminTyping, setIsAdminTyping] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAdminOnline, setIsAdminOnline] = useState(false);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const [lastSeenMap, setLastSeenMap] = useState<Record<string, string>>({});

  activeIdRef.current = activeId;

  const joiningChatRef = useRef<string | null>(null);

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
      oscillator.frequency.value = 660;
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
      "fixed top-4 right-4 z-[100] max-w-xs w-full bg-slate-900 text-white rounded-2xl shadow-xl p-3.5 flex items-start gap-2.5";
    toastEl.innerHTML = `
      <div class="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold text-xs shrink-0">💬</div>
      <div class="min-w-0">
        <p class="font-bold text-xs leading-snug truncate">${title}</p>
        <p class="text-[11px] text-slate-300 leading-relaxed line-clamp-2 mt-0.5">${body}</p>
      </div>
    `;
    document.body.appendChild(toastEl);
    setTimeout(() => toastEl.remove(), 4500);
  };

  // Scroll to bottom on new message
  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    bottomRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isAdminTyping]);

  // Sync user info
  useEffect(() => {
    const user = getCurrentUser();
    if (user) setCurrentUser(user);
  }, []);

  // Fetch or create user chat session
  const fetchChats = async () => {
    setLoading(true);
    try {
      const res = await api.chats.getAll();
      let chatsList = res.status === "success" && Array.isArray(res.data) ? (res.data as any[]) : [];

      // Jika belum ada chat untuk user ini, buatkan chat resmi otomatis
      if (chatsList.length === 0) {
        const createRes = await api.chats.create({
          subject: "Bantuan & Konsultasi SARPRAS",
        });
        if (createRes.status === "success" && createRes.data) {
          chatsList = [createRes.data];
        }
      }

      if (chatsList.length > 0) {
        const initialLastSeen: Record<string, string> = {};
        const mapped: Conversation[] = chatsList.map((c) => {
          if (typeof c.has_online_admin === "boolean") {
            setIsAdminOnline(c.has_online_admin);
          }
          const adminId = String(c.admin_id || c.admin?.id || "");
          const partnerLastSeen = c.partner_last_seen || c.admin?.last_seen || null;
          if (adminId && partnerLastSeen) {
            initialLastSeen[adminId] = partnerLastSeen;
          }
          return {
            id: c.id,
            adminId,
            title: c.admin?.name ? `Admin - ${c.admin.name}` : "Admin Support POKADA",
            preview: c.last_message || c.subject || "Konsultasi SARPRAS",
            time: c.last_message_at || c.updated_at
              ? new Date(c.last_message_at || c.updated_at).toLocaleTimeString("id-ID", {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "Baru saja",
            unread: (c.unread_count || 0) > 0,
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
        setActiveId(mapped[0].id);
      }
    } catch (err) {
      console.warn("Gagal memuat chat user:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChats();
  }, []);

  // Load messages when conversation changes & sync periodically
  useEffect(() => {
    if (!activeId) return;
    const currentActiveId = activeId;
    let isSubscribed = true;

    async function fetchMessages(isInitial = false) {
      try {
        const res = await api.chats.getMessages(currentActiveId);
        if (isSubscribed && res.status === "success" && Array.isArray(res.data)) {
          const user = currentUser || getCurrentUser();
          const msgs: Message[] = (res.data as any[]).map((m) => {
            const sender = m.sender || {};
            const senderRole = String(sender.role || "").toLowerCase();
            const isUser =
              (user?.id && (m.sender_id === user.id || sender.id === user.id)) ||
              (!["admin", "petugas"].includes(senderRole) &&
                (!sender.role || senderRole === "mahasiswa" || senderRole === "dosen" || senderRole === "staff"));
            return {
              id: String(m.id),
              from: isUser ? "user" : "admin",
              text: m.message,
              rawDate: m.created_at || new Date().toISOString(),
              time: m.created_at
                ? new Date(m.created_at).toLocaleTimeString("id-ID", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "",
              attachment: m.attachment_url
                ? { name: "Lampiran", subtitle: m.attachment_url, body: "" }
                : undefined,
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

          // Mark as read di backend
          api.chats.markAsRead(currentActiveId);
          window.dispatchEvent(new CustomEvent("messages-read", { detail: { chatId: currentActiveId } }));
        }
      } catch (err) {
        console.warn("Gagal memuat pesan:", err);
      }
    }

    fetchMessages(true);

    const interval = setInterval(() => {
      fetchMessages(false);
    }, 2000);

    const handleFocus = () => fetchMessages(false);
    window.addEventListener("focus", handleFocus);

    return () => {
      isSubscribed = false;
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
  }, [activeId]);

  const upsertIncomingMessage = (msg: any) => {
    if (!msg) return;
    const currentChat = String(activeIdRef.current || "");
    const incomingChatId = String(msg.chat_id || msg.chatId || "");
    const user = currentUser || getCurrentUser();
    const sender = msg.sender || {};
    const myId = String(user?.id || "");
    const senderId = String(sender.id || msg.sender_id || "");
    const senderRole = String(sender.role || "").toLowerCase();
    const isUser =
      (myId && senderId === myId) ||
      (!["admin", "petugas"].includes(senderRole) && (!sender.role || ["mahasiswa", "dosen", "staff"].includes(senderRole)));
    const isCurrentChat = Boolean(incomingChatId && currentChat && incomingChatId === currentChat);

    if (isCurrentChat) {
      const formattedMsg: Message = {
        id: String(msg.id || `msg-${Date.now()}`),
        from: isUser ? "user" : "admin",
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
        if (prev.some((m) => String(m.id) === formattedMsg.id)) return prev;
        const tempIndex = prev.findIndex(
          (m) => m.id.startsWith("temp-") && m.text === formattedMsg.text
        );
        if (tempIndex >= 0) {
          const next = [...prev];
          next[tempIndex] = formattedMsg;
          return next;
        }
        return [...prev, formattedMsg];
      });

      setTimeout(() => scrollToBottom("smooth"), 50);

      if (!isUser && currentChat) {
        const socket = getSocket();
        api.chats.markAsRead(currentChat);
        if (socket?.connected) socket.emit("mark_as_read", currentChat);
        window.dispatchEvent(new CustomEvent("messages-read", { detail: { chatId: currentChat } }));
      }
    } else if (!isUser) {
      playChatSound();
      showChatToast(`Pesan baru dari ${sender.name || "Admin"}`, msg.message || "Pesan baru");
    }

    // Update conversation list preview
    setConversations((prev) => {
      const exists = prev.some((c) => String(c.id) === incomingChatId);
      const updated = prev.map((c) =>
        String(c.id) === incomingChatId
          ? {
              ...c,
              preview: msg.message || c.preview,
              time: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
              unread: incomingChatId !== currentChat,
            }
          : c
      );
      if (!exists && incomingChatId) {
        joinChatRoom(incomingChatId);
        fetchChats();
        return updated;
      }
      return updated.sort((a, b) => (String(a.id) === incomingChatId ? -1 : String(b.id) === incomingChatId ? 1 : 0));
    });
  };

  // Join chat room and setup socket listeners
  useEffect(() => {
    if (!activeId || joiningChatRef.current === activeId) return;
    joiningChatRef.current = activeId;
    joinChatRoom(activeId);
    setTimeout(() => {
      const socket = getSocket();
      if (socket?.connected) socket.emit("mark_as_read", activeId);
    }, 300);
    setTimeout(() => scrollToBottom("auto"), 100);
    joiningChatRef.current = null;
  }, [activeId]);

  // Socket listener sekali pasang (tidak tergantung activeId agar tidak pasang-lepas)
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
      }
    };

    const handleChatUpdated = (payload?: { chatId?: string; message?: any }) => {
      if (payload?.chatId) joinChatRoom(payload.chatId);
      if (payload?.message) {
        upsertIncomingMessage(payload.message);
      } else {
        fetchChats();
      }
    };

    const handleMessagesRead = (data: { chatId: string }) => {
      setConversations((prev) =>
        prev.map((c) => (c.id === data.chatId ? { ...c, unread: false } : c))
      );
      if (activeIdRef.current === data.chatId) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.from === "user" ? { ...msg, isRead: true } : msg
          )
        );
      }
    };

    const handleOnlineUsersList = (data: { onlineUserIds?: string[]; hasOnlineAdmin?: boolean; lastSeenMap?: Record<string, string> } | string[]) => {
      const hasAdmin = !Array.isArray(data) && typeof data?.hasOnlineAdmin === "boolean" ? data.hasOnlineAdmin : false;
      const ids = Array.isArray(data) ? data : data?.onlineUserIds || [];
      setOnlineUserIds(new Set(ids.map(String)));
      setIsAdminOnline(hasAdmin);
      if (!Array.isArray(data) && data?.lastSeenMap) {
        setLastSeenMap((prev) => ({ ...prev, ...data.lastSeenMap }));
      }
    };

    const handleUserStatusChange = (data: { userId: string; online: boolean; isAdmin?: boolean; hasOnlineAdmin?: boolean; last_seen?: string }) => {
      const targetId = String(data?.userId || "");
      if (targetId) {
        if (data.last_seen) {
          const seenStr = String(data.last_seen);
          setLastSeenMap((prev) => ({ ...prev, [targetId]: seenStr }));
        }
        setOnlineUserIds((prev) => {
          const next = new Set(prev);
          if (data.online) next.add(targetId);
          else next.delete(targetId);
          return next;
        });
      }
      if (typeof data?.hasOnlineAdmin === "boolean") {
        setIsAdminOnline(data.hasOnlineAdmin);
      } else if (data?.isAdmin) {
        setIsAdminOnline(Boolean(data.online));
      }
    };

    const requestOnlineStatus = () => {
      if (socket.connected) {
        socket.emit("check_online_users");
        socket.emit("get_online_users");
      }
    };

    const handleSocketReconnect = () => {
      if (activeIdRef.current) joinChatRoom(activeIdRef.current);
      requestOnlineStatus();
    };

    const handleUserTyping = (data: { chatId: string; user?: any }) => {
      if (data.chatId === activeIdRef.current) {
        setIsAdminTyping(true);
      }
    };

    const handleUserStopTyping = (data: { chatId: string }) => {
      if (data.chatId === activeIdRef.current) {
        setIsAdminTyping(false);
      }
    };

    const handleChatCleared = (data: { chatId: string }) => {
      if (activeIdRef.current === data.chatId) {
        setMessages([]);
      }
      setConversations((prev) =>
        prev.map((c) => (c.id === data.chatId ? { ...c, preview: "(Riwayat pesan dibersihkan)" } : c))
      );
    };

    const handleChatDeleted = (data: { chatId: string }) => {
      setConversations((prev) => {
        const remaining = prev.filter((c) => c.id !== data.chatId);
        if (activeIdRef.current === data.chatId) {
          if (remaining.length > 0) {
            setActiveId(remaining[0].id);
          } else {
            setActiveId("");
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
    socket.on("user_typing", handleUserTyping);
    socket.on("user_stop_typing", handleUserStopTyping);
    socket.on("chat_cleared", handleChatCleared);
    socket.on("chat_deleted", handleChatDeleted);
    window.addEventListener("socket-connected", handleSocketReconnect);

    // Check online status initially & periodic sync
    requestOnlineStatus();
    const onlineInterval = setInterval(requestOnlineStatus, 8000);

    return () => {
      clearInterval(onlineInterval);
      socket.off("new_message", handleNewMessage);
      socket.off("notification", handleNotification);
      socket.off("chat_updated", handleChatUpdated);
      socket.off("messages_read", handleMessagesRead);
      socket.off("online_users_list", handleOnlineUsersList);
      socket.off("user_status_change", handleUserStatusChange);
      socket.off("user_typing", handleUserTyping);
      socket.off("user_stop_typing", handleUserStopTyping);
      socket.off("chat_cleared", handleChatCleared);
      socket.off("chat_deleted", handleChatDeleted);
      window.removeEventListener("socket-connected", handleSocketReconnect);
    };
  }, []);

  const handleClearHistory = async () => {
    if (!activeId) return;
    if (!confirm("Bersihkan seluruh riwayat percakapan ini?")) return;

    try {
      setMessages([]);
      const socket = getSocket();
      if (socket?.connected) {
        socket.emit("clear_chat", activeId);
      }
      await api.chats.clearMessages(activeId);
      setConversations((prev) =>
        prev.map((c) => (c.id === activeId ? { ...c, preview: "(Riwayat pesan dibersihkan)" } : c))
      );
    } catch (err: any) {
      alert("Gagal membersihkan riwayat pesan: " + (err.message || err));
    }
  };

  const handleDeleteChat = async (chatId: string) => {
    if (!chatId) return;
    if (!confirm("Hapus seluruh percakapan ini?")) return;

    try {
      const socket = getSocket();
      if (socket?.connected) {
        socket.emit("delete_chat", chatId);
      }
      await api.chats.deleteChat(chatId);
      setConversations((prev) => {
        const remaining = prev.filter((c) => c.id !== chatId);
        if (activeId === chatId) {
          if (remaining.length > 0) {
            setActiveId(remaining[0].id);
          } else {
            setActiveId("");
            setMessages([]);
          }
        }
        return remaining;
      });
    } catch (err: any) {
      alert("Gagal menghapus percakapan: " + (err.message || err));
    }
  };

  const handleInputChange = (val: string) => {
    setInput(val);

    const socket = getSocket();
    if (socket && activeId) {
      socket.emit("typing", activeId);

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit("stop_typing", activeId);
      }, 1500);
    }
  };

  async function handleSend() {
    const text = input.trim();
    if (!text || !activeId) return;

    const socket = getSocket();
    if (socket) {
      socket.emit("stop_typing", activeId);
    }

    const tempId = `temp-${Date.now()}`;
    const nowIso = new Date().toISOString();
    const newMsg: Message = {
      id: tempId,
      from: "user",
      text,
      rawDate: nowIso,
      time: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
      isRead: false,
    };

    setMessages((prev) => [...prev, newMsg]);
    setInput("");
    setSending(true);

    // Update preview in conversation list
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeId
          ? { ...c, preview: text, time: "Baru saja", unread: false }
          : c
      )
    );

    try {
      if (socket && socket.connected) {
        socket.emit("send_message", {
          chatId: activeId,
          message: text,
        });
      } else {
        await api.chats.sendMessage(activeId, { message: text });
      }
    } catch (err) {
      console.error("Gagal mengirim pesan user:", err);
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const activeConv = conversations.find((c) => c.id === activeId);
  const isSupportOnline = Boolean((activeConv?.adminId && onlineUserIds.has(activeConv.adminId)) || isAdminOnline);
  const filteredConvs = conversations.filter((c) =>
    !searchConv || c.title.toLowerCase().includes(searchConv.toLowerCase())
  );

  return (
    <div className="flex flex-col h-screen bg-[#eef2f9] text-slate-800 overflow-hidden">
      {/* ── Navbar ── */}
      <UserNavbar showSearch={false} />

      <div className="flex flex-1 overflow-hidden">
        {/* ── Sidebar ── */}
        <UserSidebar />

        {/* ── Conversation List ── */}
        <div className="w-64 shrink-0 bg-white border-r border-slate-100 flex flex-col">
          <div className="px-4 pt-5 pb-3">
            <h2 className="text-base font-bold text-slate-900 mb-3">Support Messages</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Cari percakapan..."
                value={searchConv}
                onChange={(e) => setSearchConv(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0785BC] transition-all"
              />
            </div>
          </div>

          <ul className="flex-1 overflow-y-auto divide-y divide-slate-50">
            {loading ? (
              <div className="p-4 space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="h-12 bg-slate-100 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : filteredConvs.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400">
                Belum ada pesan.
              </div>
            ) : (
              filteredConvs.map((conv) => {
                const isItemAdminOnline = Boolean((conv.adminId && onlineUserIds.has(conv.adminId)) || isAdminOnline);
                return (
                <li key={conv.id}>
                  <div
                    onClick={() => {
                      setActiveId(conv.id);
                      joinChatRoom(conv.id);
                      api.chats.markAsRead(conv.id);
                      const socket = getSocket();
                      if (socket?.connected) socket.emit("mark_as_read", conv.id);
                      setConversations((prev) =>
                        prev.map((c) => (c.id === conv.id ? { ...c, unread: false } : c))
                      );
                      setTimeout(() => scrollToBottom("auto"), 100);
                      window.dispatchEvent(new CustomEvent("messages-read", { detail: { chatId: conv.id } }));
                    }}
                    className={`w-full text-left px-4 py-3.5 transition-colors hover:bg-slate-50 cursor-pointer group flex items-start justify-between gap-2 ${
                      activeId === conv.id ? "bg-slate-50 border-l-2 border-[#0785BC]" : ""
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-[#0785BC] flex items-center justify-center shrink-0 relative text-white text-[10px] font-bold">
                            A
                            <span
                              className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${
                                isItemAdminOnline ? "bg-emerald-500" : "bg-slate-300"
                              }`}
                              title={isItemAdminOnline ? "Online" : "Offline"}
                            />
                            {conv.unread && (
                              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white" />
                            )}
                          </div>
                          <p className="text-xs font-semibold text-slate-800 truncate">{conv.title}</p>
                        </div>
                        <span className="text-[10px] text-slate-400 shrink-0">{conv.time}</span>
                      </div>
                      <p className="text-xs text-slate-400 leading-snug line-clamp-2 pl-10">{conv.preview}</p>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteChat(conv.id);
                      }}
                      title="Hapus percakapan"
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all shrink-0 mt-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </li>
              );
            })
            )}
          </ul>
        </div>

        {/* ── Chat Area ── */}
        <div className="flex-1 flex flex-col bg-white min-w-0">
          {/* Chat header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="relative shrink-0">
                <div className="w-9 h-9 rounded-full bg-[#0785BC] flex items-center justify-center">
                  <span className="text-white text-xs font-bold">A</span>
                </div>
                <span
                  className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${
                    isSupportOnline ? "bg-emerald-500" : "bg-slate-300"
                  }`}
                  title={isSupportOnline ? "Online" : "Offline"}
                />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">{activeConv?.title ?? "Admin Support SARPRAS"}</p>
                {(() => {
                  const adminId = activeConv?.adminId;
                  const lastSeenTime = (adminId && lastSeenMap[adminId]) || activeConv?.lastSeen;
                  const statusInfo = formatLastSeen(lastSeenTime, isSupportOnline);

                  if (statusInfo.isOnline) {
                    return (
                      <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Online · Petugas Siap Membantu
                      </p>
                    );
                  }
                  return (
                    <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                      {statusInfo.text}
                    </p>
                  );
                })()}
              </div>
            </div>
            {/* Action Buttons: Bersihkan Riwayat & Hapus Chat */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleClearHistory}
                title="Bersihkan riwayat pesan dalam obrolan ini"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition-all active:scale-95"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                Bersihkan Riwayat
              </button>
              <button
                type="button"
                onClick={() => handleDeleteChat(activeId)}
                title="Hapus sesi percakapan"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl border border-rose-200/60 transition-all active:scale-95"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                Hapus Chat
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 bg-slate-50/40">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 text-xs">
                <MessageSquare className="w-8 h-8 mb-2 text-slate-300" />
                <p>Mulai percakapan dengan Admin SARPRAS POKADA.</p>
              </div>
            ) : (
              messages.map((msg, i) => {
                const isUser = msg.from === "user";
                const showDateBadge =
                  i === 0 || isDifferentDay(msg.rawDate, messages[i - 1].rawDate);

                return (
                  <React.Fragment key={msg.id || i}>
                    {showDateBadge && (
                      <div className="flex justify-center my-3 sticky top-1 z-10 select-none">
                        <span className="px-3.5 py-1 rounded-full text-[11px] font-semibold bg-white/90 text-slate-600 shadow-2xs border border-slate-200/80 backdrop-blur-xs">
                          {formatChatDateBadge(msg.rawDate)}
                        </span>
                      </div>
                    )}
                    <div
                      className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}
                    >
                      {/* Avatar */}
                      {!isUser && (
                        <div className="w-8 h-8 rounded-full bg-[#0785BC] flex items-center justify-center shrink-0 self-end text-white text-[10px] font-bold">
                          A
                        </div>
                      )}
                      {isUser && (
                        currentUser?.foto ? (
                          <img
                            src={currentUser.foto}
                            alt="Me"
                            className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0 self-end"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-[#0785BC] flex items-center justify-center shrink-0 self-end text-white text-[10px] font-bold">
                            {(currentUser?.name || "U").charAt(0).toUpperCase()}
                          </div>
                        )
                      )}

                      <div className={`max-w-sm space-y-1 ${isUser ? "items-end" : "items-start"} flex flex-col`}>
                        {/* Attachment card */}
                        {msg.attachment && (
                          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 w-full mb-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Wrench className="w-3.5 h-3.5 text-slate-500" />
                              <p className="text-xs font-bold text-slate-700">{msg.attachment.name}</p>
                            </div>
                            <p className="text-[11px] text-[#0785BC] font-semibold">{msg.attachment.subtitle}</p>
                          </div>
                        )}

                        {/* Bubble */}
                        <div className={`px-4 py-2.5 rounded-2xl text-xs leading-relaxed ${
                          isUser
                            ? "bg-[#0785BC] text-white rounded-br-none"
                            : "bg-white text-slate-800 border border-slate-100 shadow-2xs rounded-bl-none"
                        }`}>
                          <p>{msg.text}</p>
                          <div className={`flex items-center gap-1 mt-1 ${isUser ? "text-blue-100 justify-end" : "text-slate-400 justify-start"}`}>
                            <span className="text-[10px]">{msg.time}</span>
                            {isUser && (
                              <span title={msg.isRead ? "Dibaca" : "Terkirim"}>
                                {msg.isRead ? (
                                  <CheckCheck className="w-3.5 h-3.5 text-sky-300 stroke-[2.5]" />
                                ) : (
                                  <Check className="w-3.5 h-3.5 text-blue-200/70 stroke-[2]" />
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </React.Fragment>
                );
              })
            )}

            {isAdminTyping && (
              <div className="flex items-center gap-2 text-xs text-slate-400 italic">
                <div className="w-6 h-6 rounded-full bg-[#0785BC] text-white flex items-center justify-center text-[9px] font-bold">
                  A
                </div>
                <span>Admin sedang mengetik...</span>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input area */}
          <div className="px-6 py-4 border-t border-slate-100 bg-white">
            <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5">
              <button className="text-slate-400 hover:text-slate-600 transition-colors shrink-0" type="button">
                <Paperclip className="w-4 h-4" />
              </button>
              <input
                type="text"
                placeholder="Ketik pesan Anda..."
                value={input}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 bg-transparent text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none"
              />
              <button className="text-slate-400 hover:text-slate-600 transition-colors shrink-0" type="button">
                <Smile className="w-4 h-4" />
              </button>
              <button
                onClick={handleSend}
                disabled={!input.trim() || sending}
                className="w-8 h-8 rounded-xl bg-[#0785BC] hover:bg-[#0672a0] flex items-center justify-center shrink-0 transition-all active:scale-90 disabled:opacity-40"
              >
                {sending ? <Loader2 className="w-3.5 h-3.5 text-white animate-spin" /> : <Send className="w-3.5 h-3.5 text-white" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-400 text-center mt-2">
              Tim support SARPRAS POKADA melayani konsultasi operasional kampus.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
