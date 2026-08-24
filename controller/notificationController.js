const notificationService = require('../services/notificationService');
const { sendSuccess } = require('../utils/responseHandler');

// Get notifications for user
exports.getUserNotifications = async (req, res, next) => {
  try {
    const result = await notificationService.findAllNotifications(req.query);
    return sendSuccess(res, 'Notifikasi berhasil dimuat', result.notifications, 200, {
      total: result.total,
      unreadCount: result.unreadCount
    });
  } catch (err) {
    next(err);
  }
};

// Create notification
exports.createNotification = async (req, res, next) => {
  try {
    const data = await notificationService.createNotification(req.body);
    return sendSuccess(res, 'Notifikasi berhasil dibuat', data, 201);
  } catch (err) {
    next(err);
  }
};

// Mark single notification as read
exports.markAsRead = async (req, res, next) => {
  try {
    const data = await notificationService.markAsRead(req.params.id);
    return sendSuccess(res, 'Notifikasi ditandai telah dibaca', data, 200);
  } catch (err) {
    next(err);
  }
};

// Mark all notifications for a user as read
exports.markAllAsRead = async (req, res, next) => {
  try {
    await notificationService.markAllAsRead(req.body.user_id);
    return sendSuccess(res, 'Semua notifikasi telah ditandai dibaca', null, 200);
  } catch (err) {
    next(err);
  }
};

// Delete notification
exports.deleteNotification = async (req, res, next) => {
  try {
    await notificationService.deleteNotification(req.params.id);
    return sendSuccess(res, 'Notifikasi berhasil dihapus', null, 200);
  } catch (err) {
    next(err);
  }
};
