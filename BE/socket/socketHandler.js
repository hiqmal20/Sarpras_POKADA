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
  const onlineUsers = new Map();
  const onlineProfiles = new Map();

  const broadcastPresence = (user, isOnline) => {
    io.emit(isOnline ? 'user_online' : 'user_offline', {
      userId: user.id,
      role: user.role,
      name: user.name,
      lastSeen: isOnline ? null : new Date().toISOString()
    });
  };

  // Middleware: Autentikasi socket connection
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        return next(new Error('Authentication error: Token tidak ditemukan'));
      }

      // Verifikasi token dengan Supabase
      const { data: authData, error: authError } = await supabase.auth.getUser(token);

      if (authError || !authData?.user) {
        return next(new Error('Authentication error: Token tidak valid'));
      }

      // Ambil profil user dari tabel users
      const { data: userProfile } = await supabase
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (!userProfile) {
        return next(new Error('Authentication error: User tidak ditemukan'));
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
    const userSockets = onlineUsers.get(user.id) || new Set();
    userSockets.add(socket.id);
    onlineUsers.set(user.id, userSockets);
    onlineProfiles.set(user.id, { userId: user.id, role: user.role, name: user.name });
    if (userSockets.size === 1) broadcastPresence(user, true);
    socket.emit('presence_snapshot', Array.from(onlineProfiles.values()));
    console.log(`✅ Socket connected: ${user.name} (${user.email}) - ${socket.id}`);

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
        const isAdmin = [ROLES.ADMIN, ROLES.PETUGAS].includes(user.role);
        const isParticipant = chat.user_id === user.id || chat.admin_id === user.id;

        if (!isAdmin && !isParticipant) {
          return socket.emit('error', { message: 'Akses ditolak ke chat ini' });
        }

        // Join room
        socket.join(chatId);
        socket.currentChatId = chatId;

        console.log(`👥 ${user.name} joined chat room: ${chatId}`);

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

        const isAdmin = [ROLES.ADMIN, ROLES.PETUGAS].includes(user.role);
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

        // Broadcast pesan ke semua user di room (termasuk sender)
        io.to(chatId).emit('new_message', newMsg);

        // Kirim notifikasi khusus ke user lain di room (exclude sender)
        // Notifikasi ini untuk trigger pop-up/sound di frontend
        socket.to(chatId).emit('notification', {
          type: 'new_message',
          title: `Pesan baru dari ${user.name}`,
          body: message.length > 50 ? message.substring(0, 50) + '...' : message,
          chatId: chatId,
          sender: {
            id: user.id,
            name: user.name,
            foto: user.foto,
            role: user.role
          },
          timestamp: now
        });

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

        socket.to(chatId).emit('messages_read', {
          chatId,
          readBy: user.id,
          timestamp: new Date().toISOString()
        });
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
          broadcastPresence(user, false);
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
