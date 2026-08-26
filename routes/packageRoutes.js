const express = require('express');
const router = express.Router();
const packageController = require('../controller/packageController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validateRequest');
const { createPackageSchema, updatePackageSchema } = require('../validations/packageValidation');

// Semua route paket butuh login
router.use(requireAuth);

// Semua user bisa lihat paket
router.get('/', packageController.getAllPackages);
router.get('/:id', packageController.getPackageById);

// Hanya Admin & Petugas yang bisa kelola paket
router.post('/', requireRole('Admin', 'Petugas'), validateRequest(createPackageSchema), packageController.createPackage);
router.put('/:id', requireRole('Admin', 'Petugas'), validateRequest(updatePackageSchema), packageController.updatePackage);
router.delete('/:id', requireRole('Admin'), packageController.deletePackage);

module.exports = router;
