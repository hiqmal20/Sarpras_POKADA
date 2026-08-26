const express = require('express');
const router = express.Router();
const borrowingController = require('../controller/borrowingController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validateRequest');
const { createBorrowingSchema, updateBorrowingStatusSchema } = require('../validations/borrowingValidation');

// Semua route peminjaman butuh login
router.use(requireAuth);

// Admin & Petugas bisa lihat semua peminjaman, user biasa juga bisa (filter by user_id di query)
router.get('/', borrowingController.getAllBorrowings);
router.get('/:id', borrowingController.getBorrowingById);

// Semua user yang login bisa buat peminjaman
router.post('/', validateRequest(createBorrowingSchema), borrowingController.createBorrowing);

// Hanya Admin & Petugas yang bisa ubah status peminjaman (approve/reject/dll)
router.patch('/:id/status', requireRole('Admin', 'Petugas'), validateRequest(updateBorrowingStatusSchema), borrowingController.updateBorrowingStatus);

module.exports = router;
