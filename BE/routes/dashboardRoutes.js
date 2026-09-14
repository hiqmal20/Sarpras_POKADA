const express = require('express');
const router = express.Router();
const dashboardController = require('../controller/dashboardController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const { ROLES } = require('../constants/roles');

router.get('/', requireAuth, requireRole(ROLES.ADMIN, ROLES.PETUGAS), dashboardController.getStats);
router.get('/stats', requireAuth, requireRole(ROLES.ADMIN, ROLES.PETUGAS), dashboardController.getStats);

module.exports = router;
