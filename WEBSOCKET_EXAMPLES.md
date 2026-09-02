# 💻 WebSocket Chat - Contoh Implementasi Frontend

## 📦 Install Socket.IO Client

```bash
npm install socket.io-client
```

---

## 1️⃣ React + Hooks Example

```javascript
// hooks/useChat.js
import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';

export const useChat = (token) => {
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    if (!token) return;

    const newSocket = io('http://localhost:5000', {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('✅ Connected');
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('❌ Disconnected');
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Connection error:', error.message);
    });

    newSocket.on('error', (error) => {
      console.error('Server error:', error.message);
      alert(error.message);
    });

    newSocket.on('new_message', (message) => {
      setMessages((prev) => [...prev, message]);
    });

    newSocket.on('user_typing', () => {
      setIsTyping(true);
    });

    newSocket.on('user_stop_typing', () => {
      setIsTyping(false);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [token]);

  const joinChat = (chatId) => {
    if (socket) {
      socket.emit('join_chat', chatId);
    }
  };

  const leaveChat = (chatId) => {
    if (socket) {
      socket.emit('leave_chat', chatId);
    }
  };

  const sendMessage = (chatId, message) => {
    if (socket && message.trim()) {
      socket.emit('send_message', { chatId, message: message.trim() });
    }
  };

  const startTyping = (chatId) => {
    if (socket) {
      socket.emit('typing', chatId);
    }
  };

  const stopTyping = (chatId) => {
    if (socket) {
      socket.emit('stop_typing', chatId);
    }
  };

  const handleTypingDebounced = (chatId) => {
    startTyping(chatId);
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      stopTyping(chatId);
    }, 1000);
  };

  return {
    socket,
    messages,
    isConnected,
    isTyping,
    joinChat,
    leaveChat,
    sendMessage,
    handleTypingDebounced
  };
};

// components/ChatRoom.jsx
import { useState, useEffect } from 'react';
import { useChat } from '../hooks/useChat';

export default function ChatRoom({ chatId, token }) {
  const {
    messages,
    isConnected,
    isTyping,
    joinChat,
    leaveChat,
    sendMessage,
    handleTypingDebounced
  } = useChat(token);

  const [inputMessage, setInputMessage] = useState('');

  useEffect(() => {
    if (chatId) {
      joinChat(chatId);
    }
    return () => {
      if (chatId) {
        leaveChat(chatId);
      }
    };
  }, [chatId]);

  const handleSend = () => {
    if (inputMessage.trim()) {
      sendMessage(chatId, inputMessage);
      setInputMessage('');
    }
  };

  return (
    <div className="chat-room">
      <div className="status">
        {isConnected ? '🟢 Online' : '🔴 Offline'}
      </div>

      <div className="messages">
        {messages.map((msg) => (
          <div key={msg.id} className="message">
            <img src={msg.sender.foto} alt={msg.sender.name} />
            <div>
              <strong>{msg.sender.name}</strong>
              <p>{msg.message}</p>
              <small>{new Date(msg.created_at).toLocaleTimeString()}</small>
            </div>
          </div>
        ))}
        {isTyping && <div className="typing">Sedang mengetik...</div>}
      </div>

      <div className="input-box">
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => {
            setInputMessage(e.target.value);
            handleTypingDebounced(chatId);
          }}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              handleSend();
            }
          }}
          placeholder="Ketik pesan..."
        />
        <button onClick={handleSend}>Kirim</button>
      </div>
    </div>
  );
}
```

---

## 2️⃣ Vue 3 Composition API Example

```javascript
// composables/useChat.js
import { ref, onMounted, onUnmounted } from 'vue';
import { io } from 'socket.io-client';

export function useChat(token) {
  const socket = ref(null);
  const messages = ref([]);
  const isConnected = ref(false);
  const isTyping = ref(false);

  onMounted(() => {
    if (!token) return;

    socket.value = io('http://localhost:5000', {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    socket.value.on('connect', () => {
      console.log('✅ Connected');
      isConnected.value = true;
    });

    socket.value.on('disconnect', () => {
      console.log('❌ Disconnected');
      isConnected.value = false;
    });

    socket.value.on('new_message', (message) => {
      messages.value.push(message);
    });

    socket.value.on('user_typing', () => {
      isTyping.value = true;
    });

    socket.value.on('user_stop_typing', () => {
      isTyping.value = false;
    });
  });

  onUnmounted(() => {
    if (socket.value) {
      socket.value.close();
    }
  });

  const joinChat = (chatId) => {
    if (socket.value) {
      socket.value.emit('join_chat', chatId);
    }
  };

  const sendMessage = (chatId, message) => {
    if (socket.value && message.trim()) {
      socket.value.emit('send_message', { chatId, message: message.trim() });
    }
  };

  const startTyping = (chatId) => {
    if (socket.value) {
      socket.value.emit('typing', chatId);
    }
  };

  return {
    socket,
    messages,
    isConnected,
    isTyping,
    joinChat,
    sendMessage,
    startTyping
  };
}

// components/ChatRoom.vue
<template>
  <div class="chat-room">
    <div class="status">
      <span v-if="isConnected">🟢 Online</span>
      <span v-else>🔴 Offline</span>
    </div>

    <div class="messages">
      <div v-for="msg in messages" :key="msg.id" class="message">
        <img :src="msg.sender.foto" :alt="msg.sender.name" />
        <div>
          <strong>{{ msg.sender.name }}</strong>
          <p>{{ msg.message }}</p>
          <small>{{ formatTime(msg.created_at) }}</small>
        </div>
      </div>
      <div v-if="isTyping" class="typing">Sedang mengetik...</div>
    </div>

    <div class="input-box">
      <input
        v-model="inputMessage"
        @input="startTyping(chatId)"
        @keypress.enter="handleSend"
        placeholder="Ketik pesan..."
      />
      <button @click="handleSend">Kirim</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useChat } from '../composables/useChat';

const props = defineProps({
  chatId: String,
  token: String
});

const { messages, isConnected, isTyping, joinChat, sendMessage, startTyping } = useChat(props.token);
const inputMessage = ref('');

onMounted(() => {
  joinChat(props.chatId);
});

const handleSend = () => {
  if (inputMessage.value.trim()) {
    sendMessage(props.chatId, inputMessage.value);
    inputMessage.value = '';
  }
};

const formatTime = (timestamp) => {
  return new Date(timestamp).toLocaleTimeString();
};
</script>
```

---

## 3️⃣ Vanilla JavaScript Example

```html
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Real-Time Chat</title>
  <script src="https://cdn.socket.io/4.7.2/socket.io.min.js"></script>
  <style>
    body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; }
    #messages { border: 1px solid #ddd; height: 400px; overflow-y: auto; padding: 10px; }
    .message { margin: 10px 0; padding: 10px; background: #f5f5f5; border-radius: 5px; }
    .me { background: #dcf8c6; text-align: right; }
    .typing { color: #888; font-style: italic; }
    #status { margin-bottom: 10px; }
    .online { color: green; }
    .offline { color: red; }
    input { width: 80%; padding: 10px; }
    button { width: 18%; padding: 10px; }
  </style>
</head>
<body>
  <h1>Real-Time Chat</h1>
  <div id="status">Status: <span id="connection-status">Connecting...</span></div>
  
  <div id="messages"></div>
  <div id="typing-indicator" style="display: none;" class="typing">Seseorang sedang mengetik...</div>
  
  <div style="margin-top: 20px;">
    <input type="text" id="message-input" placeholder="Ketik pesan..." />
    <button onclick="sendMessage()">Kirim</button>
  </div>

  <script>
    // Config
    const SOCKET_URL = 'http://localhost:5000';
    const TOKEN = 'your_jwt_token_here'; // Ganti dengan token dari login
    const CHAT_ID = 'your_chat_id_here'; // Ganti dengan chat ID

    // State
    let socket = null;
    let currentUserId = null;

    // Connect
    socket = io(SOCKET_URL, {
      auth: { token: TOKEN },
      transports: ['websocket', 'polling']
    });

    // Connection events
    socket.on('connect', () => {
      console.log('✅ Connected');
      document.getElementById('connection-status').textContent = 'Online';
      document.getElementById('connection-status').className = 'online';
      
      // Auto join chat
      socket.emit('join_chat', CHAT_ID);
    });

    socket.on('disconnect', () => {
      console.log('❌ Disconnected');
      document.getElementById('connection-status').textContent = 'Offline';
      document.getElementById('connection-status').className = 'offline';
    });

    socket.on('connect_error', (error) => {
      console.error('Connection error:', error.message);
      alert('Gagal connect: ' + error.message);
    });

    // Chat joined
    socket.on('chat_joined', (data) => {
      console.log('Joined chat:', data.chatId);
    });

    // New message
    socket.on('new_message', (message) => {
      addMessageToUI(message);
    });

    // Typing indicator
    socket.on('user_typing', (data) => {
      document.getElementById('typing-indicator').style.display = 'block';
    });

    socket.on('user_stop_typing', (data) => {
      document.getElementById('typing-indicator').style.display = 'none';
    });

    // Functions
    function addMessageToUI(message) {
      const messagesDiv = document.getElementById('messages');
      const messageDiv = document.createElement('div');
      messageDiv.className = 'message ' + (message.sender_id === currentUserId ? 'me' : '');
      
      messageDiv.innerHTML = `
        <strong>${message.sender.name}</strong>
        <p>${message.message}</p>
        <small>${new Date(message.created_at).toLocaleTimeString()}</small>
      `;
      
      messagesDiv.appendChild(messageDiv);
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }

    function sendMessage() {
      const input = document.getElementById('message-input');
      const message = input.value.trim();
      
      if (message && socket) {
        socket.emit('send_message', {
          chatId: CHAT_ID,
          message: message
        });
        
        input.value = '';
      }
    }

    // Typing indicator
    let typingTimeout;
    document.getElementById('message-input').addEventListener('input', () => {
      socket.emit('typing', CHAT_ID);
      
      clearTimeout(typingTimeout);
      typingTimeout = setTimeout(() => {
        socket.emit('stop_typing', CHAT_ID);
      }, 1000);
    });

    // Enter to send
    document.getElementById('message-input').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        sendMessage();
      }
    });
  </script>
</body>
</html>
```

---

## 4️⃣ Testing dengan Socket.IO Client Tool

Buka browser dan akses: **https://socket.io/socket.io-client-tool/**

1. **Server URL:** `http://localhost:5000`
2. **Auth:**
   ```json
   {
     "token": "eyJhbGciOi..."
   }
   ```
3. **Connect** → Tunggu status "Connected"
4. **Emit event:**
   - Event name: `join_chat`
   - Data: `"chat-uuid-here"`
5. **Emit event:**
   - Event name: `send_message`
   - Data:
     ```json
     {
       "chatId": "chat-uuid",
       "message": "Test message"
     }
     ```

---

## ✅ Best Practices

1. **Error Handling:** Selalu handle event `error` dan `connect_error`
2. **Reconnection:** Socket.IO auto-reconnect, tapi siapkan UI feedback
3. **Cleanup:** Disconnect socket saat component unmount
4. **Typing Indicator:** Gunakan debounce untuk mengurangi spam event
5. **Message History:** Load history dari REST API dulu, lalu real-time dari socket
6. **Offline Support:** Simpan pesan di localStorage jika disconnect, kirim ulang saat connect

---

Selamat coding! 🚀
