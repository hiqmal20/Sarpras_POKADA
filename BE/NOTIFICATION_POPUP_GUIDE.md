# 🔔 Pop-up Notification untuk Chat - Panduan Lengkap

## 🎯 Overview

Backend WebSocket sekarang mengirim event **`notification`** khusus untuk trigger pop-up notifikasi di frontend.

**Event `notification` dikirim ketika:**
- ✅ User menerima pesan baru dari user lain
- ✅ Hanya ke receiver (tidak ke sender)
- ✅ Include info: sender name, message preview, chatId

---

## 📡 WebSocket Event: `notification`

### **Data Structure:**
```javascript
{
  type: 'new_message',
  title: 'Pesan baru dari Ahmad Zaki',
  body: 'Halo admin, saya mau pinjam mic untuk...',
  chatId: 'uuid-chat',
  sender: {
    id: 'uuid',
    name: 'Ahmad Zaki',
    foto: 'https://...',
    role: 'Mahasiswa'
  },
  timestamp: '2026-09-02T10:30:00Z'
}
```

### **Cara Listen:**
```javascript
socket.on('notification', (data) => {
  // Show pop-up notification
  showNotification(data);
  
  // Play sound
  playNotificationSound();
  
  // Update unread badge
  incrementUnreadCount(data.chatId);
});
```

---

## 🔔 Implementasi: Browser Notification API

### **1. Request Permission (saat user login)**

```javascript
// Request permission untuk notifikasi
async function requestNotificationPermission() {
  if ('Notification' in window) {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      console.log('✅ Notification permission granted');
      return true;
    } else {
      console.log('❌ Notification permission denied');
      return false;
    }
  }
  return false;
}

// Panggil saat user login
requestNotificationPermission();
```

### **2. Show Desktop Notification**

```javascript
function showDesktopNotification(data) {
  // Cek permission
  if ('Notification' in window && Notification.permission === 'granted') {
    const notification = new Notification(data.title, {
      body: data.body,
      icon: data.sender.foto || '/default-avatar.png',
      badge: '/logo.png',
      tag: data.chatId, // Prevent duplicate notifications
      requireInteraction: false, // Auto-close after timeout
      silent: false // Allow sound
    });

    // Click notification → open chat
    notification.onclick = () => {
      window.focus();
      // Navigate to chat
      navigateToChat(data.chatId);
      notification.close();
    };

    // Auto-close after 5 seconds
    setTimeout(() => {
      notification.close();
    }, 5000);
  }
}
```

### **3. Listen WebSocket Event**

```javascript
socket.on('notification', (data) => {
  // Desktop notification
  showDesktopNotification(data);
  
  // In-app toast (optional)
  showToast(data.title, data.body);
  
  // Play sound
  playNotificationSound();
  
  // Update badge
  updateUnreadBadge(data.chatId);
});
```

---

## 🔊 Implementasi: Sound Notification

### **1. Prepare Audio File**

Simpan file audio di folder `public/sounds/`:
- `notification.mp3`
- `message.wav`

### **2. Play Sound Function**

```javascript
// Create audio instance (reusable)
const notificationSound = new Audio('/sounds/notification.mp3');

function playNotificationSound() {
  // Clone audio untuk allow multiple plays
  const sound = notificationSound.cloneNode();
  sound.volume = 0.5; // 50% volume
  sound.play().catch(err => {
    console.error('Failed to play sound:', err);
  });
}

// Play when notification event received
socket.on('notification', (data) => {
  playNotificationSound();
});
```

### **3. User Setting: Enable/Disable Sound**

```javascript
// Save to localStorage
function setNotificationSound(enabled) {
  localStorage.setItem('notificationSoundEnabled', enabled);
}

function isNotificationSoundEnabled() {
  return localStorage.getItem('notificationSoundEnabled') !== 'false';
}

// Play conditionally
socket.on('notification', (data) => {
  if (isNotificationSoundEnabled()) {
    playNotificationSound();
  }
});
```

---

## 🎨 Implementasi: In-App Toast/Snackbar

### **React Example (with react-hot-toast)**

#### **Install:**
```bash
npm install react-hot-toast
```

#### **Setup:**
```javascript
import toast, { Toaster } from 'react-hot-toast';

// In App.js
function App() {
  return (
    <>
      <Toaster position="top-right" />
      {/* Your app content */}
    </>
  );
}
```

#### **Show Toast:**
```javascript
import toast from 'react-hot-toast';

socket.on('notification', (data) => {
  toast.custom((t) => (
    <div
      className={`${
        t.visible ? 'animate-enter' : 'animate-leave'
      } max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
      onClick={() => {
        navigateToChat(data.chatId);
        toast.dismiss(t.id);
      }}
    >
      <div className="flex-1 w-0 p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0 pt-0.5">
            <img
              className="h-10 w-10 rounded-full"
              src={data.sender.foto}
              alt={data.sender.name}
            />
          </div>
          <div className="ml-3 flex-1">
            <p className="text-sm font-medium text-gray-900">
              {data.title}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              {data.body}
            </p>
          </div>
        </div>
      </div>
      <div className="flex border-l border-gray-200">
        <button
          onClick={() => toast.dismiss(t.id)}
          className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-indigo-600 hover:text-indigo-500"
        >
          Close
        </button>
      </div>
    </div>
  ), {
    duration: 5000
  });
  
  // Play sound
  playNotificationSound();
});
```

---

## 📱 Complete React Implementation

```javascript
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import toast, { Toaster } from 'react-hot-toast';

function ChatApp() {
  const [socket, setSocket] = useState(null);
  const [notificationPermission, setNotificationPermission] = useState('default');

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window) {
      Notification.requestPermission().then(permission => {
        setNotificationPermission(permission);
      });
    }
  }, []);

  // Setup socket connection
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const newSocket = io('http://localhost:5000', {
      auth: { token }
    });

    // Handle notification event
    newSocket.on('notification', (data) => {
      handleNotification(data);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  // Notification handler
  const handleNotification = (data) => {
    // 1. Desktop notification (jika permission granted)
    if (notificationPermission === 'granted') {
      showDesktopNotification(data);
    }

    // 2. In-app toast
    showToast(data);

    // 3. Play sound
    playNotificationSound();

    // 4. Update unread badge
    updateUnreadBadge(data.chatId);
  };

  const showDesktopNotification = (data) => {
    const notification = new Notification(data.title, {
      body: data.body,
      icon: data.sender.foto || '/default-avatar.png',
      tag: data.chatId
    });

    notification.onclick = () => {
      window.focus();
      // Navigate to chat
      window.location.href = `/chat/${data.chatId}`;
      notification.close();
    };

    setTimeout(() => notification.close(), 5000);
  };

  const showToast = (data) => {
    toast.custom((t) => (
      <div
        className="notification-toast"
        onClick={() => {
          window.location.href = `/chat/${data.chatId}`;
          toast.dismiss(t.id);
        }}
      >
        <img src={data.sender.foto} alt={data.sender.name} />
        <div>
          <p className="title">{data.title}</p>
          <p className="body">{data.body}</p>
        </div>
      </div>
    ), {
      duration: 5000,
      position: 'top-right'
    });
  };

  const playNotificationSound = () => {
    const sound = new Audio('/sounds/notification.mp3');
    sound.volume = 0.5;
    sound.play().catch(err => console.error('Sound error:', err));
  };

  const updateUnreadBadge = (chatId) => {
    // Update unread count in state/context
    // This will show badge on chat list
  };

  return (
    <>
      <Toaster />
      {/* Your chat UI */}
    </>
  );
}
```

---

## 🔕 User Settings: Enable/Disable Notifications

```javascript
function NotificationSettings() {
  const [desktopNotif, setDesktopNotif] = useState(true);
  const [soundNotif, setSoundNotif] = useState(true);
  const [inAppNotif, setInAppNotif] = useState(true);

  useEffect(() => {
    // Load from localStorage
    setDesktopNotif(localStorage.getItem('desktopNotif') !== 'false');
    setSoundNotif(localStorage.getItem('soundNotif') !== 'false');
    setInAppNotif(localStorage.getItem('inAppNotif') !== 'false');
  }, []);

  const handleToggle = (type, value) => {
    localStorage.setItem(type, value);
    
    if (type === 'desktopNotif') setDesktopNotif(value);
    if (type === 'soundNotif') setSoundNotif(value);
    if (type === 'inAppNotif') setInAppNotif(value);
  };

  return (
    <div className="settings">
      <h3>Pengaturan Notifikasi</h3>
      
      <div className="setting-item">
        <label>
          <input
            type="checkbox"
            checked={desktopNotif}
            onChange={(e) => handleToggle('desktopNotif', e.target.checked)}
          />
          Desktop Notification (Pop-up)
        </label>
      </div>

      <div className="setting-item">
        <label>
          <input
            type="checkbox"
            checked={soundNotif}
            onChange={(e) => handleToggle('soundNotif', e.target.checked)}
          />
          Sound Notification
        </label>
      </div>

      <div className="setting-item">
        <label>
          <input
            type="checkbox"
            checked={inAppNotif}
            onChange={(e) => handleToggle('inAppNotif', e.target.checked)}
          />
          In-App Toast
        </label>
      </div>
    </div>
  );
}

// Use in notification handler
socket.on('notification', (data) => {
  const desktopEnabled = localStorage.getItem('desktopNotif') !== 'false';
  const soundEnabled = localStorage.getItem('soundNotif') !== 'false';
  const toastEnabled = localStorage.getItem('inAppNotif') !== 'false';

  if (desktopEnabled) showDesktopNotification(data);
  if (toastEnabled) showToast(data);
  if (soundEnabled) playNotificationSound();
});
```

---

## 🔴 Badge Counter (Unread Messages)

```javascript
function useChatNotifications() {
  const [unreadCounts, setUnreadCounts] = useState({});

  useEffect(() => {
    socket.on('notification', (data) => {
      // Increment unread count for this chat
      setUnreadCounts(prev => ({
        ...prev,
        [data.chatId]: (prev[data.chatId] || 0) + 1
      }));
    });

    return () => {
      socket.off('notification');
    };
  }, []);

  const markChatAsRead = (chatId) => {
    setUnreadCounts(prev => ({
      ...prev,
      [chatId]: 0
    }));

    // Emit to server
    socket.emit('mark_as_read', chatId);
  };

  const getTotalUnread = () => {
    return Object.values(unreadCounts).reduce((sum, count) => sum + count, 0);
  };

  return {
    unreadCounts,
    markChatAsRead,
    getTotalUnread
  };
}

// Use in component
function ChatList() {
  const { unreadCounts, markChatAsRead, getTotalUnread } = useChatNotifications();

  return (
    <div>
      <h2>Chats ({getTotalUnread()} unread)</h2>
      {chats.map(chat => (
        <div
          key={chat.id}
          onClick={() => markChatAsRead(chat.id)}
        >
          {chat.subject}
          {unreadCounts[chat.id] > 0 && (
            <span className="badge">{unreadCounts[chat.id]}</span>
          )}
        </div>
      ))}
    </div>
  );
}
```

---

## ⚠️ Important Notes

### **1. Browser Notification Permission:**
- User **MUST grant permission** saat pertama kali
- Permission bersifat **persistent** (saved in browser)
- Tidak bisa force grant, harus user yang klik "Allow"

### **2. Notification Only Works in HTTPS:**
- Localhost HTTP: ✅ Works
- Production HTTP: ❌ Not allowed
- Production HTTPS: ✅ Works

### **3. Sound Autoplay Policy:**
- Browser block autoplay audio by default
- Sound MUST triggered by **user interaction first**
- Solution: Play sound after user click something

### **4. Tab/Window Focus:**
- Desktop notification biasanya hanya muncul jika tab **tidak aktif**
- Jika tab aktif, lebih baik pakai in-app toast

---

## 🧪 Testing Flow

1. **Open 2 browsers** (atau incognito + normal)
2. **Browser A:** Login sebagai User
3. **Browser B:** Login sebagai Admin
4. **Browser A:** Create chat → join chat
5. **Browser B:** Join chat yang sama
6. **Browser A:** Kirim pesan
7. **Browser B:** ✅ Should receive:
   - Desktop notification (pop-up)
   - Toast notification (in-app)
   - Sound alert
   - Unread badge

---

## ✅ Checklist

- [ ] Request notification permission saat login
- [ ] Listen event `notification` dari socket
- [ ] Implement desktop notification (Notification API)
- [ ] Add sound notification
- [ ] Add in-app toast/snackbar
- [ ] Add unread badge counter
- [ ] User settings untuk enable/disable notif
- [ ] Handle notification click → navigate to chat
- [ ] Test dengan 2 browser berbeda

---

Sekarang admin akan dapat **pop-up notification** saat user kirim pesan! 🔔
