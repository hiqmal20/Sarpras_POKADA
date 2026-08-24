const express = require('express');
const router = express.Router();
const notificationController = require('../controller/notificationController');

router.get('/', notificationController.getUserNotifications);
router.post('/', notificationController.createNotification);
router.patch('/:id/read', notificationController.markAsRead);
router.post('/read-all', notificationController.markAllAsRead);
router.delete('/:id', notificationController.deleteNotification);

module.exports = router;
