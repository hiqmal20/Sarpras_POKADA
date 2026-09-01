"use client";

import { useState } from "react";
import {
  Send,
  Paperclip,
  Smile,
  Circle,
  ArrowLeft,
} from "lucide-react";

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

// Mock data - conversation with Admin Support
const mockMessages: Message[] = [
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
    senderName: "User",
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
];

export default function UserMessagesPage() {
  const [messages, setMessages] = useState<Message[]>(mockMessages);
  const [newMessage, setNewMessage] = useState("");

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    const newMsg: Message = {
      id: `msg${Date.now()}`,
      senderId: "USR001",
      senderName: "User",
      senderRole: "user",
      text: newMessage,
      timestamp: "Just now",
    };

    setMessages([...messages, newMsg]);
    setNewMessage("");
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Chat Container */}
      <div className="max-w-4xl mx-auto h-screen flex flex-col bg-white shadow-lg">
        {/* Chat Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-white sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.history.back()}
              className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-[#0785BC] flex items-center justify-center text-white font-semibold">
                A
              </div>
              <Circle className="absolute bottom-0 right-0 w-3 h-3 fill-green-500 text-green-500" />
            </div>
            
            <div>
              <h3 className="font-semibold text-slate-900">Admin Support - POKADA</h3>
              <p className="text-xs text-green-600 flex items-center gap-1">
                <Circle className="w-2 h-2 fill-green-600" />
                Online • Typically replies in 5 mins
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
                msg.senderRole === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`flex items-start gap-2 max-w-[70%] ${
                  msg.senderRole === "user" ? "flex-row-reverse" : "flex-row"
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
                      msg.senderRole === "user"
                        ? "bg-[#0785BC] text-white rounded-tr-none"
                        : "bg-white text-slate-800 rounded-tl-none shadow-sm"
                    }`}
                  >
                    <p className="text-sm leading-relaxed">{msg.text}</p>
                    
                    {/* Attachments */}
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="mt-2 space-y-2">
                        {msg.attachments.map((att, idx) => (
                          <div
                            key={idx}
                            className={`p-3 rounded-lg flex items-center gap-2 ${
                              msg.senderRole === "user"
                                ? "bg-blue-600"
                                : "bg-slate-100"
                            }`}
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
                      msg.senderRole === "user" ? "text-right" : "text-left"
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
        <div className="px-6 py-4 border-t border-slate-200 bg-white sticky bottom-0">
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
    </div>
  );
}
