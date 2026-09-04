"use client";

import { useState, useEffect, useRef } from "react";
import {
  Search,
  Paperclip,
  Smile,
  Send,
  MoreVertical,
  Wrench,
} from "lucide-react";
import api from "@/lib/api";
import UserSidebar from "@/components/user/Sidebar";
import UserNavbar from "@/components/user/Navbar";

// ── Types ──
interface Conversation {
  id: string;
  title: string;
  preview: string;
  time: string;
  unread?: boolean;
}

interface Message {
  id: string;
  from: "admin" | "user";
  text: string;
  time: string;
  attachment?: { name: string; subtitle: string; body: string };
}

function useMount() {
  const [m, setM] = useState(false);
  useEffect(() => { setM(true); }, []);
  return m;
}

// ── Static mock conversations ──
const mockConversations: Conversation[] = [
  { id: "1", title: "Admin Support - Maya",  preview: "We've resolved the issue with your recent listing.", time: "Just now", unread: true },
  { id: "2", title: "Account Verification",  preview: "Your ID has been successfully verified.",             time: "Yesterday" },
  { id: "3", title: "Dispute Resolution",    preview: "Ticket #4928 closed.",                               time: "Oct 12" },
];

const mockMessages: Message[] = [
  {
    id: "1", from: "admin", time: "10:14 AM",
    text: "Hello! I'm Maya from PinjamBarang Support. I see you had a question about adjusting the deposit amount on your Power Drill listing. How can I help you with that today?",
  },
  {
    id: "2", from: "user", time: "10:16 AM",
    text: "Hi Maya. Yes, I want to increase the deposit from $20 to $50 because I just bought a new battery for it, but the app isn't letting me edit it while it's currently rented out.",
  },
  {
    id: "3", from: "admin", time: "10:18 AM",
    text: "Ah, I understand! For security reasons, deposit amounts are locked while a loan is active. However, since you are a Verified Lender, I can manually apply this change for future bookings once the current rental ends tomorrow.",
  },
  {
    id: "4", from: "admin", time: "Just now",
    text: "I've prepared the update for this listing. We've resolved the issue with your recent listing and the new deposit will be $50.",
    attachment: { name: "Makita Power Drill 18V", subtitle: "Listing #88392", body: "" },
  },
];

export default function MessagesPage() {
  const mounted = useMount();
  const bottomRef = useRef<HTMLDivElement>(null);

  const [conversations, setConversations] = useState<Conversation[]>(mockConversations);
  const [activeId, setActiveId]           = useState("1");
  const [messages, setMessages]           = useState<Message[]>(mockMessages);
  const [input, setInput]                 = useState("");
  const [searchConv, setSearchConv]       = useState("");
  const [loading, setLoading]             = useState(false);

  // Scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load chats from API on mount
  useEffect(() => {
    async function fetchChats() {
      const res = await api.chats.getAll();
      if (res.status === "success" && res.data && (res.data as any[]).length > 0) {
        setConversations(res.data as Conversation[]);
        setActiveId((res.data as any[])[0].id);
      }
    }
    fetchChats();
  }, []);

  // Load messages when conversation changes
  useEffect(() => {
    if (!activeId) return;
    async function fetchMessages() {
      setLoading(true);
      const res = await api.chats.getMessages(activeId);
      if (res.status === "success" && res.data && (res.data as any[]).length > 0) {
        setMessages(res.data as Message[]);
      } else {
        setMessages(mockMessages); // fallback
      }
      setLoading(false);
    }
    fetchMessages();
  }, [activeId]);

  async function handleSend() {
    const text = input.trim();
    if (!text) return;
    const newMsg: Message = {
      id: Date.now().toString(),
      from: "user",
      text,
      time: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages((prev) => [...prev, newMsg]);
    setInput("");

    // Update preview in conversation list
    setConversations((prev) =>
      prev.map((c) => c.id === activeId ? { ...c, preview: text, time: "Just now" } : c)
    );

    // Send via API
    await api.chats.sendMessage(activeId, { message: text });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const activeConv = conversations.find((c) => c.id === activeId);
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
              placeholder="Search conversations..."
              value={searchConv}
              onChange={(e) => setSearchConv(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0785BC] transition-all"
            />
          </div>
        </div>

        <ul className="flex-1 overflow-y-auto divide-y divide-slate-50">
          {filteredConvs.map((conv) => (
            <li key={conv.id}>
              <button
                onClick={() => setActiveId(conv.id)}
                className={`w-full text-left px-4 py-3.5 transition-colors hover:bg-slate-50 ${
                  activeId === conv.id ? "bg-slate-50 border-l-2 border-[#0785BC]" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-[#0785BC] flex items-center justify-center shrink-0 relative">
                      <span className="text-white text-[10px] font-bold">A</span>
                      {conv.unread && (
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white" />
                      )}
                    </div>
                    <p className="text-xs font-semibold text-slate-800 truncate">{conv.title}</p>
                  </div>
                  <span className="text-[10px] text-slate-400 shrink-0">{conv.time}</span>
                </div>
                <p className="text-xs text-slate-400 leading-snug line-clamp-2 pl-10">{conv.preview}</p>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* ── Chat Area ── */}
      <div className="flex-1 flex flex-col bg-white min-w-0">
        {/* Chat header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#0785BC] flex items-center justify-center shrink-0">
              <span className="text-white text-xs font-bold">A</span>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">{activeConv?.title ?? "Admin Support"}</p>
              <p className="text-xs text-emerald-500 font-medium">
                ● Online · Typically replies in 5 mins
              </p>
            </div>
          </div>
          <button className="p-2 rounded-xl text-slate-400 hover:bg-slate-50 transition-colors">
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Date divider */}
          <div className="flex items-center justify-center">
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-500">Today</span>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-100 animate-pulse shrink-0" />
                  <div className="w-56 h-12 bg-slate-100 rounded-2xl animate-pulse" />
                </div>
              ))}
            </div>
          ) : (
            messages.map((msg, i) => {
              const isUser = msg.from === "user";
              return (
                <div
                  key={msg.id}
                  style={{ animationDelay: `${i * 40}ms` }}
                  className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""} animate-fade-up`}
                >
                  {/* Avatar */}
                  {!isUser && (
                    <div className="w-8 h-8 rounded-full bg-[#0785BC] flex items-center justify-center shrink-0 self-end">
                      <span className="text-white text-[10px] font-bold">A</span>
                    </div>
                  )}
                  {isUser && (
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center shrink-0 self-end">
                      <span className="text-slate-500 text-[10px] font-bold">P</span>
                    </div>
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
                    <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                      isUser
                        ? "bg-[#0785BC] text-white rounded-br-sm"
                        : "bg-slate-100 text-slate-800 rounded-bl-sm"
                    }`}>
                      {msg.text}
                    </div>
                    <p className="text-[10px] text-slate-400">{msg.time}</p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input area */}
        <div className="px-6 py-4 border-t border-slate-100">
          <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5">
            <button className="text-slate-400 hover:text-slate-600 transition-colors shrink-0">
              <Paperclip className="w-4 h-4" />
            </button>
            <input
              type="text"
              placeholder="Type your message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
            />
            <button className="text-slate-400 hover:text-slate-600 transition-colors shrink-0">
              <Smile className="w-4 h-4" />
            </button>
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="w-8 h-8 rounded-xl bg-[#0785BC] hover:bg-[#0672a0] flex items-center justify-center shrink-0 transition-all active:scale-90 disabled:opacity-40"
            >
              <Send className="w-3.5 h-3.5 text-white" />
            </button>
          </div>
          <p className="text-[11px] text-slate-400 text-center mt-2">
            Our support team is available Mon–Fri, 9AM–6PM EST.
          </p>
        </div>
      </div>
      </div>
    </div>
  );
}
