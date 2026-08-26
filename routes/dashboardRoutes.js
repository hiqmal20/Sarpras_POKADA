const express = require('express');
const router = express.Router();
const dashboardController = require('../controller/dashboardController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

// Hanya Admin & Petugas yang bisa akses dashboard stats
router.get('/stats', requireAuth, requireRole('Admin', 'Petugas'), dashboardController.getStats);

module.exports = router;
