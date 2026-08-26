const express = require('express');
const router = express.Router();
const itemController = require('../controller/itemController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validateRequest');
const { createItemSchema, updateItemSchema } = require('../validations/itemValidation');

// Semua route barang butuh login
router.use(requireAuth);

// Semua user bisa lihat barang
router.get('/', itemController.getAllItems);
router.get('/:id', itemController.getItemById);

// Hanya Admin & Petugas yang bisa kelola barang
router.post('/', requireRole('Admin', 'Petugas'), validateRequest(createItemSchema), itemController.createItem);
router.put('/:id', requireRole('Admin', 'Petugas'), validateRequest(updateItemSchema), itemController.updateItem);
router.delete('/:id', requireRole('Admin'), itemController.deleteItem);

module.exports = router;
