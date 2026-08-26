const express = require('express');
const router = express.Router();
const categoryController = require('../controller/categoryController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validateRequest');
const { createCategorySchema, updateCategorySchema } = require('../validations/categoryValidation');

// Semua route kategori butuh login
router.use(requireAuth);

// Semua user bisa lihat kategori
router.get('/', categoryController.getAllCategories);
router.get('/:id', categoryController.getCategoryById);

// Hanya Admin & Petugas yang bisa kelola kategori
router.post('/', requireRole('Admin', 'Petugas'), validateRequest(createCategorySchema), categoryController.createCategory);
router.put('/:id', requireRole('Admin', 'Petugas'), validateRequest(updateCategorySchema), categoryController.updateCategory);
router.delete('/:id', requireRole('Admin'), categoryController.deleteCategory);

module.exports = router;
