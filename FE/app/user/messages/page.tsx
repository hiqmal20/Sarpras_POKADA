"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Search,
  Send,
  Loader2,
  Shield,
  MessageSquare,
  CheckCheck,
  Headphones,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { io, type Socket } from "socket.io-client";
import api, { API_BASE_URL, getAuthToken, getCurrentUser } from "@/lib/api";
import { UserLayout } from "@/components/user";

interface Conversation {
  id: string;
  title: string;
  preview: string;
  time: string;
  unread?: boolean;
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
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const socketRef = useRef<Socket | null>(null);

  // Scroll smoothly to bottom when messages update
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Sync current user on mount
  useEffect(() => {
    const user = getCurrentUser();
    if (user) setCurrentUser(user);
  }, []);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) return;
    const socketUrl = API_BASE_URL.replace(/\/api\/?$/, "");
    const socket = io(socketUrl, { auth: { token }, transports: ["websocket", "polling"] });
    socketRef.current = socket;
    socket.on("presence_snapshot", (users: { role?: string }[]) => setAdminOnline(users.some((item) => item.role === "Admin" || item.role === "Petugas")));
    socket.on("user_online", (data: { role?: string }) => {
      if (data.role === "Admin" || data.role === "Petugas") setAdminOnline(true);
    });
    socket.on("user_offline", (data: { role?: string }) => {
      if (data.role === "Admin" || data.role === "Petugas") setAdminOnline(false);
    });
    return () => { socket.disconnect(); socketRef.current = null; };
  }, []);

  // Fetch or create user chat session connected to admin
  const loadConversations = useCallback(async () => {
    try {
      const res = await api.chats.getAll();
      if (res.status === "success" && Array.isArray(res.data) && res.data.length > 0) {
        const mapped: Conversation[] = (res.data as any[]).map((c) => {
          const partner = c.admin || {};
          return {
            id: c.id,
            title: partner.name || c.subject || "Admin Support Sarpras",
            preview: c.last_message || c.subject || "Percakapan aktif dengan Admin",
            time: c.updated_at
              ? new Date(c.updated_at).toLocaleTimeString("id-ID", {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "Baru saja",
            unread: Boolean(c.unread_count && c.unread_count > 0),
          };
        });

        setConversations(mapped);
        if (!activeId && mapped.length > 0) {
          setActiveId(mapped[0].id);
        }
      } else {
        // If no conversation exists in database yet, automatically create one with Admin!
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
          };
          setConversations([newConv]);
          setActiveId(newConv.id);
        }
      }
    } catch (err) {
      console.warn("Gagal memuat percakapan user:", err);
    } finally {
      setLoadingChats(false);
    }
  }, [activeId]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Load real-time messages from database for the active chat
  const fetchMessages = useCallback(
    async (isPolling = false) => {
      if (!activeId) return;
      if (!isPolling) setLoadingMessages(true);

      try {
        const res = await api.chats.getMessages(activeId);
        if (res.status === "success" && Array.isArray(res.data)) {
          const user = getCurrentUser();
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
              time: m.created_at
                ? new Date(m.created_at).toLocaleTimeString("id-ID", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "",
            };
          });

          setMessages((previous) => {
            const pending = previous.filter((message) => message.id.startsWith("temp-") && !mapped.some((item) => item.text === message.text));
            return [...mapped, ...pending];
          });
        }
      } catch (err) {
        console.warn("Gagal mengambil pesan:", err);
      } finally {
        if (!isPolling) setLoadingMessages(false);
      }
    },
    [activeId]
  );

  // Load messages on activeId change and set up real-time polling interval (every 3 seconds)
  useEffect(() => {
    if (!activeId) return;
    fetchMessages(false);

    const interval = setInterval(() => {
      fetchMessages(true);
    }, 3000);

    return () => clearInterval(interval);
  }, [activeId, fetchMessages]);

  // Send message to Database and Admin
  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = input.trim();
    if (!text || !activeId || sending) return;

    setSending(true);
    setInput("");

    // Optimistic UI message
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: Message = {
      id: tempId,
      sender_id: currentUser?.id || "me",
      isMe: true,
      senderName: currentUser?.name || "Saya",
      senderRole: "user",
      text,
      time: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, optimisticMsg]);

    // Update conversation preview
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeId ? { ...c, preview: text, time: "Baru saja" } : c
      )
    );

    try {
      const result = await api.chats.sendMessage(activeId, { message: text });
      if (result.status !== "success") {
        setMessages((prev) => prev.filter((message) => message.id !== tempId));
      }
    } catch (err) {
      console.error("Gagal mengirim pesan ke database:", err);
    } finally {
      setSending(false);
    }
  };

  const handleEditMessage = async (message: Message) => {
    if (!activeId || !editingText.trim()) return;
    const res = await api.chats.updateMessage(activeId, message.id, editingText.trim());
    if (res.status === "success") {
      setMessages((prev) => prev.map((item) => item.id === message.id ? { ...item, text: editingText.trim() } : item));
      setEditingMessageId(null);
      setEditingText("");
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!activeId || !window.confirm("Hapus pesan ini?")) return;
    const res = await api.chats.deleteMessage(activeId, messageId);
    if (res.status === "success") setMessages((prev) => prev.filter((item) => item.id !== messageId));
  };

  const handleDeleteChat = async () => {
    if (!activeId || !window.confirm("Hapus seluruh chat ini?")) return;
    const res = await api.chats.deleteChat(activeId);
    if (res.status === "success") {
      const remaining = conversations.filter((item) => item.id !== activeId);
      setConversations(remaining);
      setActiveId(remaining[0]?.id || null);
      setMessages([]);
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
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" title="Terhubung" />
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
                      <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white" />
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
<span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${adminOnline ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-slate-50 text-slate-500 border-slate-200"}`}>
                     {adminOnline ? "Online" : "Offline"}
                   </span>
                </div>
                <p className="text-[11px] text-slate-400 truncate">
                  Petugas siap membantu kendala dan pengajuan fasilitas Anda
                </p>
              </div>
              <button onClick={handleDeleteChat} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label="Hapus chat">
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
              messages.map((m) => {
                if (m.isMe) {
                  // User's own message (right side)
                  return (
                    <div key={m.id} className="flex justify-end items-end gap-2">
                       <div className="max-w-md sm:max-w-lg bg-[#0785BC] text-white rounded-2xl rounded-br-xs px-4 py-3 shadow-xs">
                         {editingMessageId === m.id ? (
                           <div className="flex gap-2">
                             <input value={editingText} onChange={(e) => setEditingText(e.target.value)} className="min-w-40 rounded px-2 py-1 text-slate-900" autoFocus />
                             <button onClick={() => handleEditMessage(m)} aria-label="Simpan"><CheckCheck className="h-4 w-4" /></button>
                             <button onClick={() => setEditingMessageId(null)} aria-label="Batal"><X className="h-4 w-4" /></button>
                           </div>
                         ) : <p className="text-xs sm:text-sm whitespace-pre-wrap leading-relaxed">{m.text}</p>}
                         {editingMessageId !== m.id && typeof m.id === "string" && !m.id.startsWith("temp-") && (
                           <div className="mt-1 flex justify-end gap-2 text-white/70">
                             <button onClick={() => { setEditingMessageId(m.id); setEditingText(m.text); }} aria-label="Edit pesan"><Pencil className="h-3 w-3" /></button>
                             <button onClick={() => handleDeleteMessage(m.id)} aria-label="Hapus pesan"><Trash2 className="h-3 w-3" /></button>
                           </div>
                         )}
                        <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-white/80">
                          <span>{m.time}</span>
                          <CheckCheck className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    </div>
                  );
                }

                // Admin's message (left side)
                return (
                  <div key={m.id} className="flex items-start gap-3 max-w-md sm:max-w-lg">
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
                        <p className="text-[10px] text-slate-400 mt-1 text-right">
                          {m.time}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          {/* Chat Input Bar */}
          <div className="p-4 bg-white border-t border-slate-100 shrink-0">
            <form onSubmit={handleSend} className="flex items-center gap-2 max-w-4xl mx-auto">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Tulis pesan ke admin sarpras..."
                disabled={sending || !activeId}
                className="flex-1 px-4 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0785BC] transition-all"
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
