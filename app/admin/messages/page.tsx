"use client";

import { useState } from "react";
import {
  Search,
  Send,
  Paperclip,
  Smile,
  Circle,
} from "lucide-react";
import { AdminLayout } from "@/components/admin";

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: "admin" | "user";
  text: string;
  timestamp: string;
  attachments?: {
    name: string;
    type: string;
    url: string;
  }[];
}

interface Conversation {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  lastMessage: string;
  timestamp: string;
  unread: boolean;
  online: boolean;
  replyTime?: string;
}

// Mock data
const mockConversations: Conversation[] = [
  {
    id: "1",
    userId: "USR001",
    userName: "Ahmad Subarjo",
    lastMessage: "Terima kasih atas bantuannya!",
    timestamp: "Just now",
    unread: true,
    online: true,
    replyTime: "Typically replies in 5 mins",
  },
  {
    id: "2",
    userId: "USR002",
    userName: "Budi Waseso",
    lastMessage: "Kapan saya bisa mengambil barangnya?",
    timestamp: "2 mins ago",
    unread: true,
    online: true,
    replyTime: "Typically replies in 10 mins",
  },
  {
    id: "3",
    userId: "USR003",
    userName: "Sarah Jenkins",
    lastMessage: "Baik, saya mengerti. Terima kasih",
    timestamp: "Yesterday",
    unread: false,
    online: false,
    replyTime: "Typically replies in 1 hour",
  },
  {
    id: "4",
    userId: "USR004",
    userName: "Rina Kartika",
    lastMessage: "Saya ingin melaporkan kerusakan pada laptop",
    timestamp: "Oct 12",
    unread: false,
    online: false,
    replyTime: "Typically replies in 30 mins",
  },
];

const mockMessages: Record<string, Message[]> = {
  "1": [
    {
      id: "msg1",
      senderId: "ADM001",
      senderName: "Admin Support",
      senderRole: "admin",
      text: "Halo! Saya Admin dari SARPRAS POKADA. Ada yang bisa saya bantu hari ini?",
      timestamp: "10:14 AM",
    },
    {
      id: "msg2",
      senderId: "USR001",
      senderName: "Ahmad Subarjo",
      senderRole: "user",
      text: "Hi, saya ingin menanyakan tentang status peminjaman Projector Epson yang saya ajukan kemarin.",
      timestamp: "10:16 AM",
    },
    {
      id: "msg3",
      senderId: "ADM001",
      senderName: "Admin Support",
      senderRole: "admin",
      text: "Baik, saya cek dulu ya. Peminjaman Anda untuk Projector Epson EB-X51 sudah disetujui dan siap diambil hari ini mulai jam 13:00.",
      timestamp: "10:18 AM",
    },
    {
      id: "msg4",
      senderId: "USR001",
      senderName: "Ahmad Subarjo",
      senderRole: "user",
      text: "Terima kasih atas bantuannya!",
      timestamp: "Just now",
    },
  ],
  "2": [
    {
      id: "msg1",
      senderId: "ADM001",
      senderName: "Admin Support",
      senderRole: "admin",
      text: "Halo Budi, ada yang bisa dibantu?",
      timestamp: "09:30 AM",
    },
    {
      id: "msg2",
      senderId: "USR002",
      senderName: "Budi Waseso",
      senderRole: "user",
      text: "Kapan saya bisa mengambil barangnya?",
      timestamp: "2 mins ago",
    },
  ],
};

export default function MessagesPage() {
  const [conversations, setConversations] = useState(mockConversations);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(
    mockConversations[0]
  );
  const [messages, setMessages] = useState<Message[]>(mockMessages["1"]);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const handleSelectConversation = (conv: Conversation) => {
    setSelectedConversation(conv);
    setMessages(mockMessages[conv.id] || []);
    
    // Mark as read
    setConversations(
      conversations.map((c) =>
        c.id === conv.id ? { ...c, unread: false } : c
      )
    );
  };

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedConversation) return;

    const newMsg: Message = {
      id: `msg${Date.now()}`,
      senderId: "ADM001",
      senderName: "Admin Support",
      senderRole: "admin",
      text: newMessage,
      timestamp: "Just now",
    };

    setMessages([...messages, newMsg]);
    setNewMessage("");

    // Update last message in conversation
    setConversations(
      conversations.map((c) =>
        c.id === selectedConversation.id
          ? { ...c, lastMessage: newMessage, timestamp: "Just now" }
          : c
      )
    );
  };

  const filteredConversations = conversations.filter((conv) =>
    conv.userName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="flex h-[calc(100vh-4rem)] bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {/* Sidebar - Conversations List */}
        <div className="w-80 border-r border-slate-200 flex flex-col">
          {/* Sidebar Header */}
          <div className="px-4 py-4 border-b border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-3">Support Messages</h2>
            
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0785BC] focus:border-transparent"
              />
            </div>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto">
            {filteredConversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => handleSelectConversation(conv)}
                className={`w-full px-4 py-3 flex items-start gap-3 hover:bg-slate-50 transition-colors border-b border-slate-100 ${
                  selectedConversation?.id === conv.id ? "bg-blue-50" : ""
                }`}
              >
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-[#0785BC] flex items-center justify-center text-white font-semibold">
                    {conv.userName.charAt(0)}
                  </div>
                  {conv.online && (
                    <Circle className="absolute bottom-0 right-0 w-3 h-3 fill-green-500 text-green-500" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-slate-900 text-sm truncate">
                      {conv.userName}
                    </h3>
                    <span className="text-xs text-slate-500 flex-shrink-0 ml-2">
                      {conv.timestamp}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 truncate">{conv.lastMessage}</p>
                </div>

                {/* Unread indicator */}
                {conv.unread && (
                  <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0 mt-2"></div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Main Chat Area */}
        {selectedConversation ? (
          <div className="flex-1 flex flex-col">
            {/* Chat Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-[#0785BC] flex items-center justify-center text-white font-semibold">
                    {selectedConversation.userName.charAt(0)}
                  </div>
                  {selectedConversation.online && (
                    <Circle className="absolute bottom-0 right-0 w-3 h-3 fill-green-500 text-green-500" />
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">
                    {selectedConversation.userName}
                  </h3>
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <Circle className="w-2 h-2 fill-green-600" />
                    {selectedConversation.online ? "Online" : "Offline"} •{" "}
                    {selectedConversation.replyTime}
                  </p>
                </div>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50">
              {/* Date Separator */}
              <div className="flex items-center justify-center">
                <div className="px-3 py-1 bg-slate-200 text-slate-600 text-xs font-medium rounded-full">
                  Today
                </div>
              </div>

              {/* Messages */}
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${
                    msg.senderRole === "admin" ? "justify-start" : "justify-end"
                  }`}
                >
                  <div
                    className={`flex items-start gap-2 max-w-[70%] ${
                      msg.senderRole === "admin" ? "flex-row" : "flex-row-reverse"
                    }`}
                  >
                    {/* Avatar */}
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0 ${
                        msg.senderRole === "admin" ? "bg-[#0785BC]" : "bg-slate-400"
                      }`}
                    >
                      {msg.senderName.charAt(0)}
                    </div>

                    {/* Message Bubble */}
                    <div>
                      <div
                        className={`px-4 py-2 rounded-2xl ${
                          msg.senderRole === "admin"
                            ? "bg-white text-slate-800 rounded-tl-none"
                            : "bg-[#0785BC] text-white rounded-tr-none"
                        }`}
                      >
                        <p className="text-sm leading-relaxed">{msg.text}</p>
                        
                        {/* Attachments */}
                        {msg.attachments && msg.attachments.length > 0 && (
                          <div className="mt-2 space-y-2">
                            {msg.attachments.map((att, idx) => (
                              <div
                                key={idx}
                                className="p-3 bg-slate-100 rounded-lg flex items-center gap-2"
                              >
                                <Paperclip className="w-4 h-4" />
                                <span className="text-sm">{att.name}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <p
                        className={`text-xs text-slate-500 mt-1 ${
                          msg.senderRole === "admin" ? "text-left" : "text-right"
                        }`}
                      >
                        {msg.timestamp}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Input Area */}
            <div className="px-6 py-4 border-t border-slate-200 bg-white">
              <div className="flex items-end gap-3">
                <button className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                  <Paperclip className="w-5 h-5" />
                </button>

                <div className="flex-1 relative">
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="Type your message..."
                    rows={1}
                    className="w-full px-4 py-3 pr-12 border border-slate-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-[#0785BC] focus:border-transparent"
                  />
                  <button className="absolute right-3 bottom-3 text-slate-400 hover:text-slate-600 transition-colors">
                    <Smile className="w-5 h-5" />
                  </button>
                </div>

                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim()}
                  className="p-3 bg-[#0785BC] text-white rounded-xl hover:bg-[#0672a0] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
              
              <p className="text-xs text-slate-500 text-center mt-2">
                Support team tersedia Sen-Jum, 09:00-17:00 WIB
              </p>
            </div>
          </div>
        ) : (
          // No conversation selected
          <div className="flex-1 flex items-center justify-center text-slate-500">
            <div className="text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Send className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-700 mb-2">
                Pilih Percakapan
              </h3>
              <p className="text-sm">
                Pilih percakapan dari daftar di sebelah kiri untuk memulai chat
              </p>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
