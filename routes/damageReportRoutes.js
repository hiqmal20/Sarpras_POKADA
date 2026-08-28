const express = require('express');
const router = express.Router();
const damageReportController = require('../controller/damageReportController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const { ROLES } = require('../constants/roles');
const validateRequest = require('../middleware/validateRequest');
const { createDamageReportSchema, updateDamageReportStatusSchema } = require('../validations/damageReportValidation');

router.use(requireAuth);

router.get('/', damageReportController.getAllReports);
router.get('/:id', damageReportController.getReportById);
router.post('/', validateRequest(createDamageReportSchema), damageReportController.createReport);
router.patch('/:id/status', requireRole(ROLES.ADMIN, ROLES.PETUGAS), validateRequest(updateDamageReportStatusSchema), damageReportController.updateReportStatus);

module.exports = router;
