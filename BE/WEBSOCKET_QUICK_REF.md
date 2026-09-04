# ⚡ WebSocket Chat - Quick Reference

## 🔗 Connection

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:5000', {
  auth: { token: 'your_jwt_token' }
});
```

---

## 📤 Emit Events (Client → Server)

| Event | Data | Example |
|-------|------|---------|
| `join_chat` | chatId | `socket.emit('join_chat', 'uuid-chat')` |
| `leave_chat` | chatId | `socket.emit('leave_chat', 'uuid-chat')` |
| `send_message` | `{ chatId, message }` | `socket.emit('send_message', { chatId: 'uuid', message: 'Hi!' })` |
| `typing` | chatId | `socket.emit('typing', 'uuid-chat')` |
| `stop_typing` | chatId | `socket.emit('stop_typing', 'uuid-chat')` |
| `mark_as_read` | chatId | `socket.emit('mark_as_read', 'uuid-chat')` |

---

## 📥 Listen Events (Server → Client)

| Event | Data | Example |
|-------|------|---------|
| `connect` | - | `socket.on('connect', () => console.log('Connected'))` |
| `disconnect` | - | `socket.on('disconnect', () => console.log('Disconnected'))` |
| `chat_joined` | `{ chatId, chat }` | `socket.on('chat_joined', (data) => ...)` |
| `new_message` | message object | `socket.on('new_message', (msg) => addMessage(msg))` |
| `message_sent` | `{ success, message }` | `socket.on('message_sent', (data) => ...)` |
| `user_typing` | `{ user }` | `socket.on('user_typing', () => showTyping())` |
| `user_stop_typing` | `{ user }` | `socket.on('user_stop_typing', () => hideTyping())` |
| `user_joined` | `{ user, timestamp }` | `socket.on('user_joined', (data) => ...)` |
| `user_left` | `{ user, timestamp }` | `socket.on('user_left', (data) => ...)` |
| `error` | `{ message }` | `socket.on('error', (err) => alert(err.message))` |

---

## 💬 Complete Chat Flow

```javascript
// 1. Connect
const socket = io('http://localhost:5000', {
  auth: { token: token }
});

// 2. Listen for connection
socket.on('connect', () => {
  console.log('Connected!');
  // Auto join chat after connect
  socket.emit('join_chat', chatId);
});

// 3. Listen for chat joined
socket.on('chat_joined', (data) => {
  console.log('Joined chat:', data.chatId);
});

// 4. Listen for new messages
socket.on('new_message', (message) => {
  // Add message to UI
  addMessageToChat(message);
});

// 5. Send message
function sendMessage(chatId, text) {
  socket.emit('send_message', {
    chatId: chatId,
    message: text
  });
}

// 6. Typing indicator
let typingTimeout;
function handleTyping(chatId) {
  socket.emit('typing', chatId);
  
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    socket.emit('stop_typing', chatId);
  }, 1000);
}

// 7. Listen for typing
socket.on('user_typing', () => {
  showTypingIndicator();
});

socket.on('user_stop_typing', () => {
  hideTypingIndicator();
});

// 8. Cleanup
socket.on('disconnect', () => {
  console.log('Disconnected');
});
```

---

## 🎯 Message Object Structure

```json
{
  "id": "uuid",
  "chat_id": "uuid",
  "sender_id": "uuid",
  "message": "Halo, ini pesan saya",
  "attachment_url": null,
  "is_read": false,
  "created_at": "2026-09-02T10:30:00Z",
  "sender": {
    "id": "uuid",
    "name": "Ahmad Zaki",
    "foto": "https://...",
    "role": "Mahasiswa"
  }
}
```

---

## 🔐 Authentication

Token dikirim saat connect:
```javascript
const socket = io(URL, {
  auth: {
    token: 'eyJhbGciOiJIUzI1NiIs...'
  }
});
```

Ambil token dari login:
```javascript
const response = await fetch('http://localhost:5000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, nomor_induk, password })
});

const { data } = await response.json();
const token = data.token; // ← Use this for socket
```

---

## ⚠️ Error Handling

```javascript
socket.on('connect_error', (error) => {
  console.error('Connection failed:', error.message);
  // Handle: token expired, network error, etc.
});

socket.on('error', (error) => {
  console.error('Server error:', error.message);
  // Handle: access denied, chat not found, etc.
});
```

---

## 🔄 Reconnection

Socket.IO auto-reconnect dengan exponential backoff.

Customize reconnection:
```javascript
const socket = io(URL, {
  auth: { token },
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5
});

socket.on('reconnect', (attemptNumber) => {
  console.log('Reconnected after', attemptNumber, 'attempts');
  // Re-join chat rooms
  socket.emit('join_chat', chatId);
});
```

---

## 📱 Multi-Room Support

User bisa join multiple chats:

```javascript
// Join chat A
socket.emit('join_chat', 'chat-a-uuid');

// Join chat B
socket.emit('join_chat', 'chat-b-uuid');

// Send to specific chat
socket.emit('send_message', {
  chatId: 'chat-a-uuid',
  message: 'Message to chat A'
});

// Leave chat A
socket.emit('leave_chat', 'chat-a-uuid');
```

---

## 🧪 Testing Commands

```bash
# Get token
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@gmail.com","nomor_induk":"ADM001","password":"Admin123"}'

# Get chat list
curl http://localhost:5000/api/chats \
  -H "Authorization: Bearer YOUR_TOKEN"

# Connect WebSocket (use browser console or Postman)
const socket = io('http://localhost:5000', {
  auth: { token: 'YOUR_TOKEN' }
});

socket.emit('join_chat', 'CHAT_ID');
socket.emit('send_message', { chatId: 'CHAT_ID', message: 'Test' });
```

---

## ✅ Checklist

- [ ] Install socket.io-client
- [ ] Get JWT token from login
- [ ] Connect socket with token
- [ ] Listen for `connect` event
- [ ] Emit `join_chat` with chatId
- [ ] Listen for `new_message`
- [ ] Emit `send_message` to send
- [ ] Implement typing indicator
- [ ] Handle errors
- [ ] Cleanup on unmount

---

**Server URL:**
- Development: `http://localhost:5000`
- Production: `https://your-domain.com`

**WebSocket transports:**
- Primary: WebSocket
- Fallback: Long-polling

---

Ready to chat in real-time! 🚀
