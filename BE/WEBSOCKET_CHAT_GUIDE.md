# ⚡ WebSocket Real-Time Chat - Panduan Lengkap

## 🎯 Overview

Backend sekarang sudah support **WebSocket** menggunakan **Socket.IO** untuk real-time chat antara admin dan users.

**Fitur:**
- ✅ Real-time messaging (pesan langsung diterima tanpa refresh)
- ✅ Typing indicator (tampilkan "sedang mengetik...")
- ✅ Online/offline status
- ✅ Auto-join chat rooms
- ✅ Message read status
- ✅ Authentication via JWT token
- ✅ Multi-room support

---

## 📦 Dependencies yang Sudah Diinstall

```json
{
  "socket.io": "^4.7.2",
  "jsonwebtoken": "^9.0.2"
}
```

---

## 🚀 Server Setup

### **WebSocket URL:**
```
ws://localhost:5000
```

### **Production URL (sesuaikan dengan domain):**
```
wss://your-domain.com
```

---

## 🔐 Authentication

Setiap koneksi WebSocket **wajib** menyertakan JWT token untuk autentikasi.

**Cara kirim token:**

### **Option 1: Via auth object (Recommended)**
```javascript
const socket = io('http://localhost:5000', {
  auth: {
    token: 'your_jwt_token_here'
  }
});
```

### **Option 2: Via headers**
```javascript
const socket = io('http://localhost:5000', {
  extraHeaders: {
    Authorization: 'Bearer your_jwt_token_here'
  }
});
```

---

## 📡 WebSocket Events

### **Events dari Client ke Server:**

| Event | Data | Keterangan |
|-------|------|------------|
| `join_chat` | `chatId` (string) | Bergabung ke room chat |
| `leave_chat` | `chatId` (string) | Keluar dari room chat |
| `send_message` | `{ chatId, message, attachment_url? }` | Kirim pesan |
| `typing` | `chatId` (string) | User sedang mengetik |
| `stop_typing` | `chatId` (string) | User berhenti mengetik |
| `mark_as_read` | `chatId` (string) | Tandai semua pesan sebagai dibaca |

### **Events dari Server ke Client:**

| Event | Data | Keterangan |
|-------|------|------------|
| `chat_joined` | `{ chatId, chat, message }` | Konfirmasi join berhasil |
| `new_message` | `message object` | Pesan baru masuk |
| `message_sent` | `{ success, message }` | Konfirmasi pesan terkirim |
| `user_joined` | `{ user, timestamp }` | User lain join chat |
| `user_left` | `{ user, timestamp }` | User lain keluar chat |
| `user_typing` | `{ user }` | User lain sedang mengetik |
| `user_stop_typing` | `{ user }` | User lain berhenti mengetik |
| `messages_read` | `{ chatId, readBy, timestamp }` | Pesan sudah dibaca |
| `error` | `{ message }` | Error dari server |

---

## 💻 Implementasi Frontend

### **1. Install Socket.IO Client (React/Vue/Vanilla JS)**

```bash
npm install socket.io-client
```

### **2. Setup Connection (React Example)**

```javascript
import { io } from 'socket.io-client';
import { useEffect, useState } from 'react';

function ChatComponent() {
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);

  // Ambil token dari storage/context
  const token = localStorage.getItem('token');

  useEffect(() => {
    // Connect to WebSocket
    const newSocket = io('http://localhost:5000', {
      auth: {
        token: token
      },
      transports: ['websocket', 'polling']
    });

    // Connection success
    newSocket.on('connect', () => {
      console.log('✅ Connected to WebSocket');
    });

    // Connection error
    newSocket.on('connect_error', (error) => {
      console.error('❌ Connection error:', error.message);
    });

    // Error dari server
    newSocket.on('error', (error) => {
      console.error('Server error:', error.message);
    });

    setSocket(newSocket);

    // Cleanup on unmount
    return () => {
      newSocket.close();
    };
  }, [token]);

  // Join chat room
  const joinChat = (chatId) => {
    if (socket) {
      socket.emit('join_chat', chatId);
    }
  };

  // Listen for chat joined confirmation
  useEffect(() => {
    if (!socket) return;

    socket.on('chat_joined', (data) => {
      console.log('Joined chat:', data.chatId);
    });

    // Listen for new messages
    socket.on('new_message', (message) => {
      setMessages((prev) => [...prev, message]);
    });

    // Listen for typing indicator
    socket.on('user_typing', (data) => {
      setIsTyping(true);
    });

    socket.on('user_stop_typing', (data) => {
      setIsTyping(false);
    });

    return () => {
      socket.off('chat_joined');
      socket.off('new_message');
      socket.off('user_typing');
      socket.off('user_stop_typing');
    };
  }, [socket]);

  // Send message
  const sendMessage = (chatId, message) => {
    if (socket && message.trim()) {
      socket.emit('send_message', {
        chatId,
        message: message.trim()
      });
    }
  };

  // Typing indicator
  const handleTyping = (chatId) => {
    if (socket) {
      socket.emit('typing', chatId);
    }
  };

  const handleStopTyping = (chatId) => {
    if (socket) {
      socket.emit('stop_typing', chatId);
    }
  };

  return (
    <div>
      <h2>Real-Time Chat</h2>
      
      {/* Message list */}
      <div className="messages">
        {messages.map((msg) => (
          <div key={msg.id}>
            <strong>{msg.sender.name}:</strong> {msg.message}
          </div>
        ))}
        {isTyping && <div>Seseorang sedang mengetik...</div>}
      </div>

      {/* Input */}
      <input
        type="text"
        onFocus={() => handleTyping('chat-id')}
        onBlur={() => handleStopTyping('chat-id')}
        onKeyPress={(e) => {
          if (e.key === 'Enter') {
            sendMessage('chat-id', e.target.value);
            e.target.value = '';
          }
        }}
      />
    </div>
  );
}
```

---

## 🧪 Testing WebSocket dengan Postman/Thunder Client

### **Testing Tools:**
- **Postman** (support WebSocket)
- **Socket.IO Client Tester** (online tool)
- **wscat** (command line)

### **Testing Flow:**

#### **1. Get JWT Token (REST API)**
```
POST http://localhost:5000/api/auth/login

Body:
{
  "email": "admin@gmail.com",
  "nomor_induk": "ADM001",
  "password": "Admin123"
}

Response:
{
  "data": {
    "token": "eyJhbGciOi..."  ← Copy this
  }
}
```

#### **2. Connect WebSocket**
```
URL: ws://localhost:5000
Auth: { "token": "eyJhbGci..." }
```

#### **3. Join Chat Room**
```javascript
// Emit event
{
  "event": "join_chat",
  "data": "chat-uuid-here"
}

// Expect response
{
  "event": "chat_joined",
  "data": {
    "chatId": "...",
    "message": "Berhasil bergabung ke chat room"
  }
}
```

#### **4. Send Message**
```javascript
// Emit event
{
  "event": "send_message",
  "data": {
    "chatId": "chat-uuid",
    "message": "Halo, ini pesan real-time!"
  }
}

// Expect response (all users in room)
{
  "event": "new_message",
  "data": {
    "id": "msg-uuid",
    "chat_id": "...",
    "sender_id": "...",
    "message": "Halo, ini pesan real-time!",
    "created_at": "...",
    "sender": {
      "name": "Admin POKADA",
      "foto": "...",
      "role": "Admin"
    }
  }
}
```

---

## 📱 Flow Penggunaan Chat

### **User Side:**

1. **User login** → dapat JWT token
2. **User connect WebSocket** dengan token
3. **User create chat baru** via REST API `POST /api/chats`
4. **User emit `join_chat`** dengan chatId
5. **User emit `send_message`** untuk kirim pesan
6. **User listen `new_message`** untuk terima pesan real-time

### **Admin Side:**

1. **Admin login** → dapat JWT token
2. **Admin connect WebSocket** dengan token
3. **Admin GET list chats** via REST API `GET /api/chats`
4. **Admin emit `join_chat`** untuk chat yang ingin dibalas
5. **Admin emit `send_message`** untuk balas user
6. **Admin listen `new_message`** untuk terima pesan user real-time

---

## 🔄 Hybrid Approach: REST API + WebSocket

Chat masih support **REST API** untuk fallback:

### **REST API Endpoints:**

| Method | Endpoint | Keterangan |
|--------|----------|------------|
| GET | `/api/chats` | List semua chat |
| POST | `/api/chats` | Buat chat baru |
| GET | `/api/chats/:id/messages` | Get chat messages (history) |
| POST | `/api/chats/:id/messages` | Kirim pesan (fallback jika WebSocket gagal) |

**Use Case:** Ambil history pesan lama via REST, lalu real-time baru via WebSocket.

---

## 🛡️ Security

- ✅ Setiap koneksi WebSocket wajib autentikasi dengan JWT token
- ✅ Verifikasi akses ke chat room (user hanya bisa akses chat miliknya)
- ✅ Admin/Petugas bisa akses semua chat
- ✅ Token expired otomatis disconnect
- ✅ CORS protection

---

## 🐛 Troubleshooting

### **Error: "Authentication error: Token tidak ditemukan"**
- Token tidak dikirim saat connect
- Kirim token via `auth: { token: '...' }`

### **Error: "Authentication error: Token tidak valid"**
- Token expired atau salah
- Login ulang untuk dapat token baru

### **Error: "Chat tidak ditemukan"**
- chatId salah atau chat tidak ada di database
- Verifikasi chatId dengan `GET /api/chats`

### **Error: "Akses ditolak ke chat ini"**
- User coba akses chat orang lain
- User biasa hanya bisa akses chat miliknya sendiri

### **WebSocket not connecting**
- Cek server sudah running
- Cek CORS origin sudah sesuai
- Cek firewall tidak blokir WebSocket

---

## 📊 Monitoring

Cek jumlah koneksi aktif:
```
GET http://localhost:5000/api/health

Response:
{
  "websocket": {
    "enabled": true,
    "connections": 5  ← Jumlah koneksi aktif
  }
}
```

---

## ✅ Checklist Testing

- [ ] Connect WebSocket dengan token
- [ ] Join chat room berhasil
- [ ] Send message berhasil
- [ ] Receive message real-time
- [ ] Typing indicator berfungsi
- [ ] User joined/left notification
- [ ] Mark as read berfungsi
- [ ] Error handling bekerja
- [ ] Disconnect cleanup berjalan

---

## 🎨 UI/UX Recommendations

- Tampilkan status "Online" saat user connect
- Tampilkan "Sedang mengetik..." saat `user_typing` event
- Auto-scroll ke pesan terbaru saat `new_message`
- Tampilkan checkmark/double-check untuk message status
- Play sound notification saat pesan baru
- Badge counter untuk unread messages

---

Selamat! Real-time chat sudah siap digunakan! 🚀
