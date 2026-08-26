const express = require('express');
const router = express.Router();
const returnController = require('../controller/returnController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validateRequest');
const { createReturnSchema } = require('../validations/returnValidation');

// Semua route pengembalian butuh login
router.use(requireAuth);

// Admin & Petugas bisa lihat semua pengembalian
router.get('/', requireRole('Admin', 'Petugas'), returnController.getAllReturns);
router.get('/:id', requireRole('Admin', 'Petugas'), returnController.getReturnById);

// Admin & Petugas yang memproses pengembalian
router.post('/', requireRole('Admin', 'Petugas'), validateRequest(createReturnSchema), returnController.createReturn);

module.exports = router;
