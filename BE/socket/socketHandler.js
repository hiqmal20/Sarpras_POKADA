const supabase = require('../config/supabaseClient');
const { ROLES } = require('../constants/roles');

/**
 * Socket.IO WebSocket Handler untuk Real-Time Chat & Presence
 */

module.exports = (io, app) => {
  const onlineUsers = new Map(); // userId -> Set of socket.ids
  const onlineProfiles = new Map(); // userId -> { userId, role, name }
  const lastSeenMap = new Map(); // userId -> ISO date string

  if (app) {
    app.set('onlineUsers', onlineUsers);
    app.set('onlineProfiles', onlineProfiles);
    app.set('lastSeenMap', lastSeenMap);
  }

  const broadcastPresence = (user, isOnline) => {
    const lastSeen = isOnline ? null : (lastSeenMap.get(user.id) || new Date().toISOString());
    if (isOnline) {
      lastSeenMap.delete(user.id);
    } else {
      lastSeenMap.set(user.id, lastSeen);
    }

    // Format for user messages page
    io.emit(isOnline ? 'user_online' : 'user_offline', {
      userId: user.id,
      role: user.role,
      name: user.name,
      lastSeen
    });

    // Format for admin messages page
    io.emit('user_status_change', {
      userId: user.id,
      online: isOnline,
      last_seen: lastSeen,
      role: user.role,
      name: user.name
    });
  };

  const getOnlinePayload = () => ({
    onlineUserIds: Array.from(onlineUsers.keys()),
    lastSeenMap: Object.fromEntries(lastSeenMap)
  });

  // Middleware: Autentikasi socket connection (wajib Supabase getUser, tanpa fallback decode)
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];

      if (!token) {
        return next(new Error('Authentication error: Token tidak ditemukan'));
      }

      // Verifikasi token via Supabase Auth — wajib valid
      const { data: authData, error: authError } = await supabase.auth.getUser(token);
      if (authError || !authData?.user) {
        return next(new Error('Authentication error: Token tidak valid atau kadaluarsa'));
      }
      const userId = authData.user.id;

      // Ambil profil user dari tabel users
      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError || !userProfile) {
        return next(new Error('Authentication error: User tidak ditemukan'));
      }

      socket.user = userProfile;
      next();
    } catch (err) {
      next(new Error('Authentication error: ' + err.message));
    }
  });

  // Connection established
  const HEARTBEAT_TIMEOUT = 45 * 1000;
  const presenceSweeper = setInterval(() => {
    const now = Date.now();
    for (const [userId, sockets] of onlineUsers.entries()) {
      for (const socketId of sockets) {
        const activeSocket = io.sockets.sockets.get(socketId);
        if (activeSocket && now - (activeSocket.lastPresenceHeartbeat || 0) > HEARTBEAT_TIMEOUT) {
          activeSocket.disconnect(true);
        }
      }
    }
  }, 15000);

  io.on('connection', (socket) => {
    const user = socket.user;
    const userSockets = onlineUsers.get(user.id) || new Set();
    userSockets.add(socket.id);
    onlineUsers.set(user.id, userSockets);
    socket.lastPresenceHeartbeat = Date.now();
    onlineProfiles.set(user.id, { userId: user.id, role: user.role, name: user.name });

    // Auto-join personal room dan admin room untuk notifikasi & chat instan
    socket.join(user.id);
    socket.join(`user:${user.id}`);
    if ([ROLES.ADMIN, ROLES.PETUGAS].includes(user.role)) {
      socket.join('admins');
      socket.join('role:admin');
      socket.join('role:petugas');
    }

    if (userSockets.size === 1) {
      broadcastPresence(user, true);
      const now = new Date().toISOString();
      // Presence disimpan di memory; jangan menulis update_at setiap koneksi
      // karena sebagian skema users tidak memiliki kolom tersebut.
      void now;
    }

    // Kirim state online users awal ke client yang baru connect.
    // Snapshot hanya berisi user yang benar-benar memiliki socket aktif.
    socket.emit('presence_snapshot', Array.from(onlineProfiles.values()));
    socket.emit('online_users_list', getOnlinePayload());
    console.log(`✅ Socket connected: ${user.name} (${user.email}) [${user.role}] - ${socket.id}`);

    // Heartbeat eksplisit menjaga presence tetap akurat saat koneksi tidak
    // langsung memicu event disconnect (misalnya laptop sleep atau jaringan putus).
    socket.on('presence_heartbeat', () => {
      socket.lastPresenceHeartbeat = Date.now();
    });

    // Handler event query status online dari client
    socket.on('get_online_users', () => {
      socket.emit('online_users_list', getOnlinePayload());
      socket.emit('presence_snapshot', Array.from(onlineProfiles.values()));
    });

    socket.on('check_online_users', () => {
      socket.emit('online_users_list', getOnlinePayload());
      socket.emit('presence_snapshot', Array.from(onlineProfiles.values()));
    });

    // Event: User bergabung ke chat room
    socket.on('join_chat', (chatId) => {
      try {
        if (!chatId) return;
        socket.join(chatId);
        socket.currentChatId = chatId;
        socket.emit('chat_joined', { chatId, message: 'Berhasil bergabung ke chat room' });
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    // Event: User keluar dari chat room
    socket.on('leave_chat', (chatId) => {
      if (chatId) {
        socket.leave(chatId);
        if (socket.currentChatId === chatId) {
          socket.currentChatId = null;
        }
        socket.to(chatId).emit('user_left', {
          user: {
            id: user.id,
            name: user.name
          },
          timestamp: new Date().toISOString()
        });
      }
    });

    // Event: Kirim pesan
    socket.on('send_message', async (data) => {
      const { chatId, message, attachment_url, tempId } = data;

      try {
        if (!chatId || !message || !message.trim()) {
          return socket.emit('error', { message: 'chatId dan message wajib diisi' });
        }

        const now = new Date().toISOString();

        // 1. Simpan pesan langsung ke DB
        const { data: newMsg, error: msgError } = await supabase
          .from('chat_messages')
          .insert([{
            chat_id: chatId,
            sender_id: user.id,
            message: message.trim(),
            attachment_url: attachment_url || null,
            is_read: false,
            created_at: now
          }])
          .select(`
            *,
            sender:users!chat_messages_sender_id_fkey (id, name, foto, role)
          `)
          .single();

        if (msgError) throw msgError;

        // 2. Broadcast INSTAN ke room chat dan room admin/user terkait (tanpa tunggu update chats)
        io.to(chatId).emit('new_message', newMsg);
        io.to(chatId).emit('chat_updated', { chatId, message: newMsg });
        io.to('admins').emit('new_message', newMsg);
        io.to('admins').emit('chat_updated', { chatId, message: newMsg });

        // Konfirmasi terkirim ke sender segera agar ikon jam langsung berubah jadi centang
        socket.emit('message_sent', {
          success: true,
          tempId: tempId || null,
          message: newMsg
        });

        // 3. Update status & timestamp chat di background (non-blocking)
        supabase
          .from('chats')
          .update({ updated_at: now })
          .eq('id', chatId)
          .then(() => {})
          .catch((err) => console.error('Gagal update updated_at chat:', err));

        // 4. Notifikasi ke peserta chat lain
        socket.to(chatId).emit('notification', {
          type: 'new_message',
          title: `Pesan baru dari ${user.name}`,
          body: message.length > 50 ? message.substring(0, 50) + '...' : message,
          chatId,
          message: newMsg,
          sender: {
            id: user.id,
            name: user.name,
            foto: user.foto,
            role: user.role
          },
          timestamp: now
        });

        console.log(`💬 ${user.name} sent message to chat ${chatId}`);
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    // Event: User sedang mengetik
    socket.on('typing', (chatId) => {
      if (chatId) {
        socket.to(chatId).emit('user_typing', {
          chatId,
          user: {
            id: user.id,
            name: user.name,
            foto: user.foto,
            role: user.role
          }
        });
      }
    });

    // Event: User berhenti mengetik
    socket.on('stop_typing', (chatId) => {
      if (chatId) {
        socket.to(chatId).emit('user_stop_typing', {
          chatId,
          user: {
            id: user.id,
            name: user.name,
            role: user.role
          }
        });
      }
    });

    // Event: Mark pesan sebagai sudah dibaca
    socket.on('mark_as_read', async (chatId) => {
      try {
        if (!chatId) return;

        await supabase
          .from('chat_messages')
          .update({ is_read: true })
          .eq('chat_id', chatId)
          .neq('sender_id', user.id);

        // Broadcast ke room KECUALI pengirim (socket.to) agar tidak echo:
        // tanpa ini, pesan milik pembaca ikut ditandai dibaca lalu terkoreksi
        // saat sinkronisasi DB → terlihat seperti flicker ceklis 2 → 1.
        socket.to(chatId).emit('messages_read', {
          chatId,
          readBy: user.id,
          timestamp: new Date().toISOString()
        });
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    // Event: Edit pesan via WebSocket
    socket.on('edit_message', async (data) => {
      try {
        const { chatId, messageId, message: newContent } = data;
        if (!chatId || !messageId || !newContent || !newContent.trim()) return;

        const { data: updatedMsg, error } = await supabase
          .from('chat_messages')
          .update({ message: newContent.trim() })
          .eq('id', messageId)
          .eq('chat_id', chatId)
          .select(`*, sender:users!chat_messages_sender_id_fkey (id, name, foto, role)`)
          .single();

        if (error) throw error;

        io.to(chatId).emit('message_updated', updatedMsg);
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    // Event: Hapus pesan tunggal via WebSocket
    socket.on('delete_message', async (data) => {
      try {
        const { chatId, messageId } = data;
        if (!chatId || !messageId) return;

        const { error } = await supabase
          .from('chat_messages')
          .delete()
          .eq('id', messageId)
          .eq('chat_id', chatId);

        if (error) throw error;

        io.to(chatId).emit('message_deleted', { chatId, messageId });
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    // Event: Bersihkan riwayat percakapan
    socket.on('clear_chat', async (chatId) => {
      try {
        if (!chatId) return;
        await supabase.from('chat_messages').delete().eq('chat_id', chatId);
        io.to(chatId).emit('chat_cleared', { chatId });
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    // Event: Hapus seluruh sesi percakapan
    socket.on('delete_chat', async (chatId) => {
      try {
        if (!chatId) return;
        await supabase.from('chat_messages').delete().eq('chat_id', chatId);
        await supabase.from('chats').delete().eq('id', chatId);
        io.to(chatId).emit('chat_deleted', { chatId });
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    // Disconnect
    socket.on('disconnect', () => {
      console.log(`❌ Socket disconnected: ${user.name} - ${socket.id}`);
      const userSockets = onlineUsers.get(user.id);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          onlineUsers.delete(user.id);
          onlineProfiles.delete(user.id);
          const now = new Date().toISOString();
          lastSeenMap.set(user.id, now);
          broadcastPresence(user, false);
        }
      }

      if (socket.currentChatId) {
        socket.to(socket.currentChatId).emit('user_left', {
          user: {
            id: user.id,
            name: user.name
          },
          timestamp: new Date().toISOString()
        });
      }
    });
  });
};
