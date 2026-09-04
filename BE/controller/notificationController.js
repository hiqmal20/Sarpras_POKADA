const notificationService = require('../services/notificationService');
const { sendSuccess } = require('../utils/responseHandler');

exports.getUserNotifications = async (req, res, next) => {
  try {
    const query = { ...req.query, user_id: req.user.id };
    const result = await notificationService.findAllNotifications(query);
    return sendSuccess(res, 'Notifikasi berhasil dimuat', result.notifications, 200, {
      total: result.total,
      unreadCount: result.unreadCount
    });
  } catch (err) {
    next(err);
  }
};

exports.createNotification = async (req, res, next) => {
  try {
    const data = await notificationService.createNotification(req.body);
    return sendSuccess(res, 'Notifikasi berhasil dibuat', data, 201);
  } catch (err) {
    next(err);
  }
};

exports.markAsRead = async (req, res, next) => {
  try {
    const data = await notificationService.markAsRead(req.params.id, req.user.id);
    return sendSuccess(res, 'Notifikasi ditandai telah dibaca', data, 200);
  } catch (err) {
    next(err);
  }
};

exports.markAllAsRead = async (req, res, next) => {
  try {
    await notificationService.markAllAsRead(req.user.id);
    return sendSuccess(res, 'Semua notifikasi telah ditandai dibaca', null, 200);
  } catch (err) {
    next(err);
  }
};

exports.deleteNotification = async (req, res, next) => {
  try {
    await notificationService.deleteNotification(req.params.id, req.user.id);
    return sendSuccess(res, 'Notifikasi berhasil dihapus', null, 200);
  } catch (err) {
    next(err);
  }
};
