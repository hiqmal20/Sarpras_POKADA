const chatService = require('../services/chatService');
const { sendSuccess } = require('../utils/responseHandler');
const { ROLES } = require('../constants/roles');

exports.getChats = async (req, res, next) => {
  try {
    const isPrivileged = [ROLES.ADMIN, ROLES.PETUGAS].includes(req.user.role);
    const query = { ...req.query };
    if (!isPrivileged) {
      query.user_id = req.user.id;
    }
    const data = await chatService.findAllChats(query, req.user.id);

    const onlineUsers = req.app.get('onlineUsers');
    const lastSeenMap = req.app.get('lastSeenMap');

    const enriched = data.map((c) => {
      const partner = (c.user && c.user.id !== req.user.id ? c.user : c.admin) || c.user || c.admin || {};
      const partnerId = partner.id || (c.user_id !== req.user.id ? c.user_id : c.admin_id);
      const isOnline = Boolean(partnerId && onlineUsers && onlineUsers.has(partnerId));
      const lastSeen = partnerId && lastSeenMap ? (lastSeenMap.get(partnerId) || null) : null;
      return {
        ...c,
        is_partner_online: isOnline,
        partner_last_seen: lastSeen
      };
    });

    return sendSuccess(res, 'Daftar chat berhasil dimuat', enriched, 200, { total: enriched.length });
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
    const data = await chatService.createNewChat(req.body);
    const io = req.app.get('io');
    if (io) {
      io.emit('chat_created', data);
    }
    return sendSuccess(res, 'Ruang chat berhasil dibuat', data, 201);
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
      io.to(req.params.chatId).emit('new_message', data);
      io.to(req.params.chatId).emit('chat_updated', { chatId: req.params.chatId, message: data });
    }
    return sendSuccess(res, 'Pesan terkirim', data, 201);
  } catch (err) {
    next(err);
  }
};

exports.markAsRead = async (req, res, next) => {
  try {
    await chatService.markChatAsRead(req.params.chatId, req.user.id, req.user.role);
    const io = req.app.get('io');
    if (io) {
      // Kecualikan socket milik pembaca agar tidak echo ke dirinya sendiri
      // (echo inilah yang bikin ceklis 2 balik jadi 1 saat sinkronisasi ulang).
      const onlineUsers = req.app.get('onlineUsers');
      const readerSockets = onlineUsers ? Array.from(onlineUsers.get(req.user.id) || []) : [];
      io.to(req.params.chatId).except(readerSockets).emit('messages_read', {
        chatId: req.params.chatId,
        readBy: req.user.id,
        timestamp: new Date().toISOString()
      });
    }
    return sendSuccess(res, 'Pesan telah ditandai sebagai dibaca', null, 200);
  } catch (err) {
    next(err);
  }
};

exports.updateChatStatus = async (req, res, next) => {
  try {
    const data = await chatService.updateChatStatus(req.params.chatId, req.body.status, req.user.id, req.user.role);
    return sendSuccess(res, 'Status chat berhasil diubah', data, 200);
  } catch (err) {
    next(err);
  }
};

exports.updateMessage = async (req, res, next) => {
  try {
    const data = await chatService.updateMessage(req.params.chatId, req.params.messageId, req.body.message, req.user.id, req.user.role);
    const io = req.app.get('io');
    if (io) {
      io.to(req.params.chatId).emit('message_updated', data);
    }
    return sendSuccess(res, 'Pesan berhasil diubah', data, 200);
  } catch (err) {
    next(err);
  }
};

exports.deleteMessage = async (req, res, next) => {
  try {
    await chatService.deleteMessage(req.params.chatId, req.params.messageId, req.user.id, req.user.role);
    const io = req.app.get('io');
    if (io) {
      io.to(req.params.chatId).emit('message_deleted', {
        chatId: req.params.chatId,
        messageId: req.params.messageId
      });
    }
    return sendSuccess(res, 'Pesan berhasil dihapus', null, 200);
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
    }
    return sendSuccess(res, 'Chat berhasil dihapus', null, 200);
  } catch (err) {
    next(err);
  }
};
