const express = require('express');
const router = express.Router();
const auditLogController = require('../controller/auditLogController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const { ROLES } = require('../constants/roles');

// Hanya Admin yang dapat melihat riwayat audit logs
router.use(requireAuth);
router.get('/', requireRole(ROLES.ADMIN), auditLogController.getAllAuditLogs);

module.exports = router;
