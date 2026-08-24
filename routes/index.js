const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const categoryRoutes = require('./categoryRoutes');
const itemRoutes = require('./itemRoutes');
const packageRoutes = require('./packageRoutes');
const borrowingRoutes = require('./borrowingRoutes');
const returnRoutes = require('./returnRoutes');
const damageReportRoutes = require('./damageReportRoutes');
const chatRoutes = require('./chatRoutes');
const notificationRoutes = require('./notificationRoutes');

// Daftarkan semua sub-routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/categories', categoryRoutes);
router.use('/items', itemRoutes);
router.use('/packages', packageRoutes);
router.use('/borrowings', borrowingRoutes);
router.use('/returns', returnRoutes);
router.use('/damage-reports', damageReportRoutes);
router.use('/chats', chatRoutes);
router.use('/notifications', notificationRoutes);

module.exports = router;
