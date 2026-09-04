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
    const data = await chatService.findAllChats(query);
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
    const data = await chatService.createNewChat(req.body);
    return sendSuccess(res, 'Ruang chat berhasil dibuat', data, 201);
  } catch (err) {
    next(err);
  }
};

exports.sendMessage = async (req, res, next) => {
  try {
    req.body.sender_id = req.user.id;
    const data = await chatService.postMessage(req.params.chatId, req.body, req.user.id, req.user.role);
    return sendSuccess(res, 'Pesan terkirim', data, 201);
  } catch (err) {
    next(err);
  }
};

exports.markAsRead = async (req, res, next) => {
  try {
    await chatService.markChatAsRead(req.params.chatId, req.user.id);
    return sendSuccess(res, 'Pesan telah ditandai sebagai dibaca', null, 200);
  } catch (err) {
    next(err);
  }
};
