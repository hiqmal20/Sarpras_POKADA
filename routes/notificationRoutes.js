const express = require('express');
const router = express.Router();
const notificationController = require('../controller/notificationController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const { ROLES } = require('../constants/roles');

router.use(requireAuth);

router.get('/', notificationController.getUserNotifications);
router.post('/', requireRole(ROLES.ADMIN, ROLES.PETUGAS), notificationController.createNotification);
router.patch('/:id/read', notificationController.markAsRead);
router.post('/read-all', notificationController.markAllAsRead);
router.delete('/:id', notificationController.deleteNotification);

module.exports = router;
