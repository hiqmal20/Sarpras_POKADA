const chatService = require('../services/chatService');
const { sendSuccess } = require('../utils/responseHandler');

// Get all chats
exports.getChats = async (req, res, next) => {
  try {
    const data = await chatService.findAllChats(req.query);
    return sendSuccess(res, 'Daftar chat berhasil dimuat', data, 200, { total: data.length });
  } catch (err) {
    next(err);
  }
};

// Get messages in a specific chat
exports.getChatMessages = async (req, res, next) => {
  try {
    const data = await chatService.findChatMessages(req.params.chatId);
    return sendSuccess(res, 'Pesan chat berhasil dimuat', data, 200, { total: data.length });
  } catch (err) {
    next(err);
  }
};

// Create new chat
exports.createChat = async (req, res, next) => {
  try {
    const data = await chatService.createNewChat(req.body);
    return sendSuccess(res, 'Ruang chat berhasil dibuat', data, 201);
  } catch (err) {
    next(err);
  }
};

// Send message
exports.sendMessage = async (req, res, next) => {
  try {
    const data = await chatService.postMessage(req.params.chatId, req.body);
    return sendSuccess(res, 'Pesan terkirim', data, 201);
  } catch (err) {
    next(err);
  }
};

// Mark as read
exports.markAsRead = async (req, res, next) => {
  try {
    await chatService.markChatAsRead(req.params.chatId, req.body.user_id);
    return sendSuccess(res, 'Pesan telah ditandai sebagai dibaca', null, 200);
  } catch (err) {
    next(err);
  }
};
