const chatService = require('../services/chatService');
const supabase = require('../config/supabaseClient');
const { sendSuccess } = require('../utils/responseHandler');
const { ROLES } = require('../constants/roles');

exports.getChats = async (req, res, next) => {
  try {
    const isPrivileged = [ROLES.ADMIN, ROLES.PETUGAS].includes(req.user.role);
    const query = { ...req.query };
    if (!isPrivileged) {
      query.user_id = req.user.id;
    }
    const io = req.app.get('io');
    const data = await chatService.findAllChats(query, req.user.id, io);
    return sendSuccess(res, 'Daftar chat berhasil dimuat', data, 200, { total: data.length });
  } catch (err) {
    next(err);
  }
};

exports.getChatMessages = async (req, res, next) => {
  try {
    const data = await chatService.findChatMessages(req.params.chatId, req.user.id, req.user.role);
    return sendSuccess(res, 'Pesan chat berhasil dimuat', data, 200, { total: data.length });
  } catch (err) {
    next(err);
  }
};

exports.createChat = async (req, res, next) => {
  try {
    req.body.user_id = req.user.id;
    const data = await chatService.getOrCreateChat(req.body);
    return sendSuccess(res, 'Ruang chat berhasil disiapkan', data, 201);
  } catch (err) {
    next(err);
  }
};

exports.sendMessage = async (req, res, next) => {
  try {
    req.body.sender_id = req.user.id;
    const data = await chatService.postMessage(req.params.chatId, req.body, req.user.id, req.user.role);

    const io = req.app.get('io');
    if (io) {
      const now = new Date().toISOString();
      const chatPayload = data;
      const sender = data.sender || req.user;
      const messageText = data.message || req.body.message || '';
      const isAdmin = ['Admin', 'Petugas'].includes(req.user.role);

      const receivePayload = {
        type: 'new_message',
        title: `Pesan baru dari ${sender.name || req.user.name || 'Pengguna'}`,
        body: messageText.length > 60 ? messageText.substring(0, 60) + '...' : messageText,
        chatId: req.params.chatId,
        message: chatPayload,
        sender,
        timestamp: now
      };

      const chatUpdate = {
        chatId: req.params.chatId,
        message: chatPayload,
        sender: req.user
      };

      io.to(req.params.chatId).emit('new_message', chatPayload);
      io.to('admins').emit('new_message', chatPayload);

      if (isAdmin) {
        // Admin membalas: kirim ke pemilik chat langsung (chat_updated + notification + new_message)
        const { data: chatRow } = await supabase
          .from('chats')
          .select('user_id, admin_id')
          .eq('id', req.params.chatId)
          .single();

        if (chatRow?.user_id) {
          io.to(`user:${chatRow.user_id}`).emit('new_message', chatPayload);
          io.to(`user:${chatRow.user_id}`).emit('chat_updated', chatUpdate);
          io.to(`user:${chatRow.user_id}`).emit('notification', receivePayload);
        }
        if (chatRow?.admin_id && chatRow.admin_id !== req.user.id) {
          io.to(`user:${chatRow.admin_id}`).emit('new_message', chatPayload);
          io.to(`user:${chatRow.admin_id}`).emit('chat_updated', chatUpdate);
        }
      } else {
        // User mengirim: broadcast ke semua admin/petugas
        io.to('admins').emit('chat_updated', chatUpdate);
        io.to('admins').emit('notification', receivePayload);

        const { data: chatRow } = await supabase
          .from('chats')
          .select('user_id, admin_id')
          .eq('id', req.params.chatId)
          .single();

        if (chatRow?.admin_id && chatRow.admin_id !== req.user.id) {
          io.to(`user:${chatRow.admin_id}`).emit('new_message', chatPayload);
          io.to(`user:${chatRow.admin_id}`).emit('chat_updated', chatUpdate);
          io.to(`user:${chatRow.admin_id}`).emit('notification', receivePayload);
        }
      }
    }

    return sendSuccess(res, 'Pesan terkirim', data, 201);
  } catch (err) {
    next(err);
  }
};

exports.markAsRead = async (req, res, next) => {
  try {
    await chatService.markChatAsRead(req.params.chatId, req.user.id);
    const io = req.app.get('io');
    if (io) {
      const readEvent = {
        chatId: req.params.chatId,
        readBy: req.user.id,
        timestamp: new Date().toISOString()
      };
      io.to(req.params.chatId).emit('messages_read', readEvent);
      io.to('admins').emit('messages_read', readEvent);
      io.to(`user:${req.user.id}`).emit('messages_read', readEvent);

      // Notify partner
      const { data: chat } = await supabase.from('chats').select('user_id, admin_id').eq('id', req.params.chatId).maybeSingle();
      if (chat?.user_id) io.to(`user:${chat.user_id}`).emit('messages_read', readEvent);
      if (chat?.admin_id) io.to(`user:${chat.admin_id}`).emit('messages_read', readEvent);
    }
    return sendSuccess(res, 'Pesan telah ditandai sebagai dibaca', null, 200);
  } catch (err) {
    next(err);
  }
};

exports.clearChatMessages = async (req, res, next) => {
  try {
    await chatService.clearChatMessages(req.params.chatId, req.user.id, req.user.role);
    const io = req.app.get('io');
    if (io) {
      io.to(req.params.chatId).emit('chat_cleared', { chatId: req.params.chatId });
      io.to('admins').emit('chat_cleared', { chatId: req.params.chatId });
    }
    return sendSuccess(res, 'Riwayat pesan berhasil dibersihkan', null, 200);
  } catch (err) {
    next(err);
  }
};

exports.deleteChat = async (req, res, next) => {
  try {
    await chatService.deleteChat(req.params.chatId, req.user.id, req.user.role);
    const io = req.app.get('io');
    if (io) {
      io.to(req.params.chatId).emit('chat_deleted', { chatId: req.params.chatId });
      io.to('admins').emit('chat_deleted', { chatId: req.params.chatId });
    }
    return sendSuccess(res, 'Percakapan berhasil dihapus', null, 200);
  } catch (err) {
    next(err);
  }
};
