const express = require('express');
const router = express.Router();
const damageReportController = require('../controller/damageReportController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const { ROLES } = require('../constants/roles');
const validateRequest = require('../middleware/validateRequest');
const { uuidParamHandler } = require('../middleware/validateUuid');
const { createDamageReportSchema, updateDamageReportSchema } = require('../validations/damageReportValidation');

router.param('id', uuidParamHandler);
router.use(requireAuth);

// GET semua laporan
router.get('/', damageReportController.getAllReports);

// GET detail laporan
router.get('/:id', damageReportController.getReportById);

// User terautentikasi juga dapat membuat laporan miliknya sendiri
router.post(
  '/',
  validateRequest(createDamageReportSchema),
  (req, res, next) => {
    const isPrivileged = [ROLES.ADMIN, ROLES.PETUGAS].includes(req.user.role);
    if (!isPrivileged) req.body.user_id = req.user.id;
    next();
  },
  damageReportController.createReport
);

// PATCH update laporan (status, denda, kondisi) — Admin/Petugas saja
router.patch(
  '/:id',
  requireRole(ROLES.ADMIN, ROLES.PETUGAS),
  validateRequest(updateDamageReportSchema),
  damageReportController.updateReport
);

module.exports = router;
