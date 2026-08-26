const express = require('express');
const router = express.Router();
const damageReportController = require('../controller/damageReportController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validateRequest');
const { createDamageReportSchema, updateDamageReportStatusSchema } = require('../validations/damageReportValidation');

// Semua route laporan kerusakan butuh login
router.use(requireAuth);

// Admin & Petugas bisa lihat semua laporan
router.get('/', requireRole('Admin', 'Petugas'), damageReportController.getAllReports);
router.get('/:id', requireRole('Admin', 'Petugas'), damageReportController.getReportById);

// Semua user yang login bisa buat laporan kerusakan
router.post('/', validateRequest(createDamageReportSchema), damageReportController.createReport);

// Hanya Admin & Petugas yang bisa update status laporan
router.patch('/:id/status', requireRole('Admin', 'Petugas'), validateRequest(updateDamageReportStatusSchema), damageReportController.updateReportStatus);

module.exports = router;
