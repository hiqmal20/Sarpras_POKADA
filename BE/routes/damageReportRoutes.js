const express = require('express');
const router = express.Router();
const damageReportController = require('../controller/damageReportController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const { ROLES } = require('../constants/roles');
const validateRequest = require('../middleware/validateRequest');
const { createDamageReportSchema, updateDamageReportSchema } = require('../validations/damageReportValidation');

router.use(requireAuth);

// GET semua laporan
router.get('/', damageReportController.getAllReports);

// GET detail laporan
router.get('/:id', damageReportController.getReportById);

// POST buat laporan baru — User atau Admin/Petugas
router.post(
  '/',
  validateRequest(createDamageReportSchema),
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
