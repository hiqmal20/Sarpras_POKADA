const supabase = require('../config/supabaseClient');
const { ROLES } = require('../constants/roles');

/**
 * Socket.IO WebSocket Handler untuk Real-Time Chat
 * 
 * Events dari client:
 * - 'join_chat' → user bergabung ke room chat tertentu
 * - 'leave_chat' → user keluar dari room chat
 * - 'send_message' → user kirim pesan ke chat room
 * - 'typing' → user sedang mengetik
 * - 'stop_typing' → user berhenti mengetik
 * 
 * Events ke client:
 * - 'new_message' → pesan baru diterima
 * - 'message_sent' → konfirmasi pesan terkirim
 * - 'user_typing' → ada user yang mengetik
 * - 'user_stop_typing' → user berhenti mengetik
 * - 'error' → ada error terjadi
 */

module.exports = (io) => {
  // In-memory online user tracking
  const onlineUsers = new Map(); // userId -> Set of socket IDs
  const onlineAdmins = new Set(); // Set of admin user IDs
  const lastSeenUsers = new Map(); // userId -> ISO timestamp

  io.onlineUsers = onlineUsers;
  io.onlineAdmins = onlineAdmins;
  io.lastSeenUsers = lastSeenUsers;

  let _hasLastSeenColumn = null;
  async function checkLastSeenColumn() {
    if (_hasLastSeenColumn !== null) return _hasLastSeenColumn;
    try {
      const { error } = await supabase.from('users').select('last_seen').limit(1);
      _hasLastSeenColumn = !error;
    } catch {
      _hasLastSeenColumn = false;
    }
    return _hasLastSeenColumn;
  }

  async function recordUserLastSeen(userId, timestamp) {
    if (!userId) return;
    lastSeenUsers.set(userId, timestamp);
    try {
      const hasCol = await checkLastSeenColumn();
      if (hasCol) {
        await supabase.from('users').update({ last_seen: timestamp }).eq('id', userId);
      }
    } catch (err) {
      console.warn(`[Socket] Gagal simpan last_seen untuk ${userId}:`, err.message);
    }
  }

  // Middleware: Autentikasi socket connection
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        return next(new Error('Authentication error: Token tidak ditemukan'));
      }

      // Verifikasi token dengan Supabase
      const { data: authData, error: authError } = await supabase.auth.getUser(token);
      let targetUserId = authData?.user?.id;

      if (authError || !authData?.user) {
        // Fallback: decode JWT jika token expired
        try {
          const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
          targetUserId = payload?.sub || payload?.id;
        } catch (_) {}
      }

      if (!targetUserId) {
        return next(new Error('Authentication error: Token tidak valid'));
      }

      // Ambil profil user dari tabel users
      const { data: userProfile } = await supabase
        .from('users')
        .select('*')
        .eq('id', targetUserId)
        .maybeSingle();

      if (!userProfile) {
        if (authData?.user) {
          socket.user = {
            id: authData.user.id,
            email: authData.user.email,
            name: authData.user.user_metadata?.name || authData.user.email?.split('@')[0] || 'User',
            role: authData.user.user_metadata?.role || 'Mahasiswa',
            foto: null
          };
          return next();
        }
        return next(new Error('Authentication error: User tidak ditemukan'));
      }

      if (userProfile.status === 'Nonaktif') {
        return next(new Error('Authentication error: Akun dinonaktifkan'));
      }

      // Simpan data user di socket
      socket.user = userProfile;
      next();
    } catch (err) {
      next(new Error('Authentication error: ' + err.message));
    }
  });

  // Connection established
  io.on('connection', (socket) => {
    const user = socket.user;
    console.log(`✅ Socket connected: ${user.name} (${user.email}) - ${socket.id}`);

    // Join personal user room
    socket.join(`user:${user.id}`);

    // Online tracking
    const nowIso = new Date().toISOString();
    recordUserLastSeen(user.id, nowIso);

    if (!onlineUsers.has(user.id)) {
      onlineUsers.set(user.id, new Set());
    }
    onlineUsers.get(user.id).add(socket.id);

    // If admin or petugas, join admins room (case-insensitive check)
    const userRole = String(user?.role || '').toLowerCase();
    const userEmail = String(user?.email || '').toLowerCase();
    const isAdmin = ['admin', 'petugas'].includes(userRole) || userEmail.includes('admin') || userEmail.includes('sarpras');
    if (isAdmin) {
      socket.join('admins');
      onlineAdmins.add(user.id);
      console.log(`🛡️ Socket ${user.name} joined 'admins' room`);
    }

    // Broadcast user online status ke semua client
    io.emit('user_status_change', {
      userId: user.id,
      userName: user.name,
      role: user.role,
      online: true,
      last_seen: nowIso,
      isAdmin,
      hasOnlineAdmin: onlineAdmins.size > 0
    });

    const sendOnlineList = (target = socket) => {
      target.emit('online_users_list', {
        onlineUserIds: Array.from(onlineUsers.keys()),
        lastSeenMap: Object.fromEntries(lastSeenUsers),
        hasOnlineAdmin: onlineAdmins.size > 0
      });
    };

    // Kirim list user online ke client yang baru terhubung
    sendOnlineList();

    socket.on('check_online_users', () => sendOnlineList());
    socket.on('get_online_users', () => sendOnlineList());

    // Event: User bergabung ke chat room
    socket.on('join_chat', async (chatId) => {
      try {
        // Verifikasi akses ke chat
        const { data: chat, error } = await supabase
          .from('chats')
          .select('id, user_id, admin_id, subject, status')
          .eq('id', chatId)
          .single();

        if (error || !chat) {
          return socket.emit('error', { message: 'Chat tidak ditemukan' });
        }

        // Cek apakah user boleh akses chat ini
        const isParticipant = chat.user_id === user.id || chat.admin_id === user.id;

        if (!isAdmin && !isParticipant) {
          return socket.emit('error', { message: 'Akses ditolak ke chat ini' });
        }

        // Join room
        socket.join(chatId);
        socket.currentChatId = chatId;

        console.log(`👥 ${user.name} joined chat room: ${chatId}`);

        // Tandai pesan sebagai dibaca saat bergabung
        await supabase
          .from('chat_messages')
          .update({ is_read: true })
          .eq('chat_id', chatId)
          .neq('sender_id', user.id);

        const readEventData = {
          chatId,
          readBy: user.id,
          timestamp: new Date().toISOString()
        };

        io.to(chatId).emit('messages_read', readEventData);
        io.to('admins').emit('messages_read', readEventData);
        if (chat.user_id) io.to(`user:${chat.user_id}`).emit('messages_read', readEventData);
        if (chat.admin_id) io.to(`user:${chat.admin_id}`).emit('messages_read', readEventData);

        // Notify lain-lain user di room
        socket.to(chatId).emit('user_joined', {
          user: {
            id: user.id,
            name: user.name,
            foto: user.foto,
            role: user.role
          },
          timestamp: new Date().toISOString()
        });

        // Konfirmasi ke sender
        socket.emit('chat_joined', {
          chatId,
          chat,
          message: 'Berhasil bergabung ke chat room'
        });
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    // Event: User keluar dari chat room
    socket.on('leave_chat', (chatId) => {
      if (socket.currentChatId === chatId) {
        socket.leave(chatId);
        socket.currentChatId = null;
        console.log(`👋 ${user.name} left chat room: ${chatId}`);

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
      const { chatId, message, attachment_url } = data;

      try {
        if (!chatId || !message) {
          return socket.emit('error', { message: 'chatId dan message wajib diisi' });
        }

        // Verifikasi akses
        const { data: chat } = await supabase
          .from('chats')
          .select('user_id, admin_id')
          .eq('id', chatId)
          .single();

        if (!chat) {
          return socket.emit('error', { message: 'Chat tidak ditemukan' });
        }

        const isParticipant = chat.user_id === user.id || chat.admin_id === user.id;

        if (!isAdmin && !isParticipant) {
          return socket.emit('error', { message: 'Akses ditolak' });
        }

        const now = new Date().toISOString();

        // Simpan pesan ke database
        const { data: newMsg, error: msgError } = await supabase
          .from('chat_messages')
          .insert([{
            chat_id: chatId,
            sender_id: user.id,
            message,
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

        // Update timestamp chat
        await supabase
          .from('chats')
          .update({ updated_at: now })
          .eq('id', chatId);

        // Broadcast pesan ke room chat dan direct target rooms agar instan tanpa refresh
        io.to(chatId).emit('new_message', newMsg);
        io.to('admins').emit('new_message', newMsg);
        if (chat.user_id) {
          io.to(`user:${chat.user_id}`).emit('new_message', newMsg);
        }
        if (chat.admin_id) {
          io.to(`user:${chat.admin_id}`).emit('new_message', newMsg);
        }

        // Notifikasi & update chat ke receiver di luar room spesifik
        const notifPayload = {
          type: 'new_message',
          title: `Pesan baru dari ${user.name}`,
          body: message.length > 60 ? message.substring(0, 60) + '...' : message,
          chatId: chatId,
          message: newMsg,
          sender: {
            id: user.id,
            name: user.name,
            foto: user.foto,
            role: user.role
          },
          timestamp: now
        };

        const updatePayload = {
          chatId,
          message: newMsg,
          sender: user,
          unread: true
        };

        if (isAdmin) {
          // Admin mengirim ke user
          const userNotif = { ...notifPayload, action_url: '/user/messages' };
          socket.to(`user:${chat.user_id}`).emit('notification', userNotif);
          socket.to(`user:${chat.user_id}`).emit('chat_updated', updatePayload);
        } else {
          // User mengirim ke admin
          const adminNotif = { ...notifPayload, action_url: '/admin/messages' };
          socket.to('admins').emit('notification', adminNotif);
          socket.to('admins').emit('chat_updated', updatePayload);
          if (chat.admin_id) {
            socket.to(`user:${chat.admin_id}`).emit('notification', adminNotif);
            socket.to(`user:${chat.admin_id}`).emit('chat_updated', updatePayload);
          }
        }

        // Konfirmasi ke sender
        socket.emit('message_sent', {
          success: true,
          message: newMsg
        });

        console.log(`💬 ${user.name} sent message to chat ${chatId}`);
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    // Event: User sedang mengetik
    socket.on('typing', (chatId) => {
      if (socket.currentChatId === chatId) {
        socket.to(chatId).emit('user_typing', {
          chatId,
          user: {
            id: user.id,
            name: user.name,
            foto: user.foto
          }
        });
      }
    });

    // Event: User berhenti mengetik
    socket.on('stop_typing', (chatId) => {
      if (socket.currentChatId === chatId) {
        socket.to(chatId).emit('user_stop_typing', {
          chatId,
          user: {
            id: user.id,
            name: user.name
          }
        });
      }
    });

    // Event: Mark pesan sebagai sudah dibaca
    socket.on('mark_as_read', async (chatId) => {
      try {
        await supabase
          .from('chat_messages')
          .update({ is_read: true })
          .eq('chat_id', chatId)
          .neq('sender_id', user.id);

        const readEventData = {
          chatId,
          readBy: user.id,
          timestamp: new Date().toISOString()
        };

        io.to(chatId).emit('messages_read', readEventData);
        io.to('admins').emit('messages_read', readEventData);
        socket.emit('messages_read', readEventData);

        const { data: chat } = await supabase
          .from('chats')
          .select('user_id, admin_id')
          .eq('id', chatId)
          .maybeSingle();

        if (chat?.user_id) io.to(`user:${chat.user_id}`).emit('messages_read', readEventData);
        if (chat?.admin_id) io.to(`user:${chat.admin_id}`).emit('messages_read', readEventData);
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    // Event: Bersihkan riwayat chat
    socket.on('clear_chat', async (chatId) => {
      try {
        await supabase
          .from('chat_messages')
          .delete()
          .eq('chat_id', chatId);

        await supabase
          .from('chats')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', chatId);

        io.to(chatId).emit('chat_cleared', { chatId, clearedBy: user.id });
        io.to('admins').emit('chat_cleared', { chatId, clearedBy: user.id });
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    // Event: Hapus sesi percakapan
    socket.on('delete_chat', async (chatId) => {
      try {
        await supabase
          .from('chat_messages')
          .delete()
          .eq('chat_id', chatId);

        await supabase
          .from('chats')
          .delete()
          .eq('id', chatId);

        io.to(chatId).emit('chat_deleted', { chatId, deletedBy: user.id });
        io.to('admins').emit('chat_deleted', { chatId, deletedBy: user.id });
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    // Disconnect
    socket.on('disconnect', () => {
      console.log(`❌ Socket disconnected: ${user.name} - ${socket.id}`);

      if (onlineUsers.has(user.id)) {
        onlineUsers.get(user.id).delete(socket.id);
        if (onlineUsers.get(user.id).size === 0) {
          onlineUsers.delete(user.id);
          const disconnectTime = new Date().toISOString();
          recordUserLastSeen(user.id, disconnectTime);

          if (isAdmin) {
            onlineAdmins.delete(user.id);
          }
          io.emit('user_status_change', {
            userId: user.id,
            userName: user.name,
            role: user.role,
            online: false,
            last_seen: disconnectTime,
            isAdmin,
            hasOnlineAdmin: onlineAdmins.size > 0
          });
        }
      }
      
      // Notify room jika user masih di chat
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
