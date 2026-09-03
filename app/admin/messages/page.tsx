"use client";

import { useState, useEffect } from "react";
import {
  Search,
  Send,
  Circle,
  MessageSquare,
  Loader2,
} from "lucide-react";
import { AdminLayout } from "@/components/admin";
import api, { getCurrentUser } from "@/lib/api";

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  text: string;
  timestamp: string;
}

interface Conversation {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  lastMessage: string;
  timestamp: string;
  unread: boolean;
}

export default function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const user = getCurrentUser();
    if (user) setCurrentUser(user);

    async function fetchChats() {
      setLoading(true);
      try {
        const res = await api.chats.getAll();
        if (res.status === "success" && Array.isArray(res.data) && res.data.length > 0) {
          const mapped: Conversation[] = (res.data as any[]).map((c) => {
            const partner = c.user || c.admin || {};
            return {
              id: c.id,
              userId: partner.id || "",
              userName: partner.name || "Pengguna",
              userEmail: partner.email || "-",
              lastMessage: c.last_message || c.subject || "Percakapan baru",
              timestamp: c.updated_at
                ? new Date(c.updated_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
                : "Baru saja",
              unread: c.unread_count ? c.unread_count > 0 : false,
            };
          });
          setConversations(mapped);
          setSelectedConversation(mapped[0]);
        }
      } catch (err) {
        console.warn("Gagal memuat percakapan:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchChats();
  }, []);

  // Fetch messages when selectedConversation changes
  useEffect(() => {
    if (!selectedConversation) return;

    async function fetchMsgs() {
      try {
        const res = await api.chats.getMessages(selectedConversation!.id);
        if (res.status === "success" && Array.isArray(res.data)) {
          const msgs: Message[] = (res.data as any[]).map((m) => {
            const sender = m.sender || {};
            const isMe = sender.id === currentUser?.id || sender.role === "Admin";
            return {
              id: m.id,
              senderId: sender.id || "",
              senderName: sender.name || (isMe ? "Admin Support" : "User"),
              senderRole: isMe ? "admin" : "user",
              text: m.message,
              timestamp: m.created_at
                ? new Date(m.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
                : "",
            };
          });
          setMessages(msgs);
        }
      } catch (err) {
        console.warn("Gagal memuat pesan:", err);
      }
    }
    fetchMsgs();
  }, [selectedConversation, currentUser]);

  const handleSelectConversation = (conv: Conversation) => {
    setSelectedConversation(conv);
    setConversations((prev) =>
      prev.map((c) => (c.id === conv.id ? { ...c, unread: false } : c))
    );
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    const messageText = newMessage.trim();
    setNewMessage("");
    setSending(true);

    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: Message = {
      id: tempId,
      senderId: currentUser?.id || "admin",
      senderName: currentUser?.name || "Admin Support",
      senderRole: "admin",
      text: messageText,
      timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      const res = await api.chats.sendMessage(selectedConversation.id, {
        message: messageText,
      });

      if (res.status === "success" && res.data) {
        setConversations((prev) =>
          prev.map((c) =>
            c.id === selectedConversation.id
              ? { ...c, lastMessage: messageText, timestamp: "Baru saja" }
              : c
          )
        );
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
      <div className="flex h-[calc(100vh-8rem)] bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {/* Sidebar Percakapan */}
        <div className="w-80 border-r border-slate-100 flex flex-col">
          <div className="p-4 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-900 mb-2.5">Pesan Dukungan</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Cari percakapan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0785BC]"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
            {loading ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-12 bg-slate-100 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs">
                Belum ada percakapan aktif dari pengguna.
              </div>
            ) : (
              filteredConversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => handleSelectConversation(conv)}
                  className={`w-full px-4 py-3 flex items-start gap-3 hover:bg-slate-50 text-left transition-colors ${
                    selectedConversation?.id === conv.id ? "bg-blue-50/70" : ""
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-[#0785BC] text-white flex items-center justify-center font-bold text-xs shrink-0">
                    {(conv.userName || "U").charAt(0).toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <h3 className="font-semibold text-slate-900 text-xs truncate">
                        {conv.userName}
                      </h3>
                      <span className="text-[10px] text-slate-400 shrink-0 ml-2">
                        {conv.timestamp}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 truncate">{conv.lastMessage}</p>
                  </div>

                  {conv.unread && (
                    <div className="w-2 h-2 rounded-full bg-[#0785BC] shrink-0 mt-2" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Area Chat */}
        {selectedConversation ? (
          <div className="flex-1 flex flex-col">
            {/* Header Chat */}
            <div className="px-6 py-3.5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#0785BC] text-white flex items-center justify-center font-bold text-xs shrink-0">
                  {(selectedConversation.userName || "U").charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-xs">{selectedConversation.userName}</h3>
                  <p className="text-[11px] text-slate-400">{selectedConversation.userEmail}</p>
                </div>
              </div>
            </div>

            {/* Pesan */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3.5 bg-slate-50/50">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 text-xs">
                  <MessageSquare className="w-8 h-8 mb-2 text-slate-300" />
                  <p>Mulai percakapan dengan pengguna ini.</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.senderRole === "admin" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-xs ${
                        msg.senderRole === "admin"
                          ? "bg-[#0785BC] text-white rounded-tr-none"
                          : "bg-white text-slate-800 border border-slate-100 shadow-2xs rounded-tl-none"
                      }`}
                    >
                      <p className="leading-relaxed">{msg.text}</p>
                      <p
                        className={`text-[10px] mt-1 ${
                          msg.senderRole === "admin" ? "text-blue-100 text-right" : "text-slate-400 text-left"
                        }`}
                      >
                        {msg.timestamp}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Input Box */}
            <div className="p-4 border-t border-slate-100 bg-white">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Ketik pesan..."
                  className="flex-1 px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0785BC]"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || sending}
                  className="p-2.5 bg-[#0785BC] text-white rounded-xl hover:bg-[#0672a0] disabled:opacity-50 transition-colors shrink-0"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-400 text-xs">
            <div className="text-center">
              <MessageSquare className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p>Pilih percakapan untuk memulai chat.</p>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
