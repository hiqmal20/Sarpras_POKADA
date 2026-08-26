const express = require('express');
const router = express.Router();
const notificationController = require('../controller/notificationController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

// Semua route notifikasi butuh login
router.use(requireAuth);

// Semua user bisa lihat notifikasi miliknya
router.get('/', notificationController.getUserNotifications);
router.patch('/:id/read', notificationController.markAsRead);
router.post('/read-all', notificationController.markAllAsRead);
router.delete('/:id', notificationController.deleteNotification);

// Hanya Admin & Petugas yang bisa buat notifikasi manual
router.post('/', requireRole('Admin', 'Petugas'), notificationController.createNotification);

module.exports = router;
