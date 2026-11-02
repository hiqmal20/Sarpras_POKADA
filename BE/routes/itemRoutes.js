const express = require('express');
const router = express.Router();
const itemController = require('../controller/itemController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const { ROLES } = require('../constants/roles');
const validateRequest = require('../middleware/validateRequest');
const { uuidParamHandler } = require('../middleware/validateUuid');
const { createItemSchema, updateItemSchema } = require('../validations/itemValidation');

router.param('id', uuidParamHandler);

// Public read: izinkan pengunjung landing page & publik melihat katalog barang
router.get('/', itemController.getAllItems);
router.get('/:id', itemController.getItemById);

// Protected routes: mutasi data mewajibkan autentikasi & hak akses
router.use(requireAuth);
router.post('/', requireRole(ROLES.ADMIN, ROLES.PETUGAS), validateRequest(createItemSchema), itemController.createItem);
router.put('/:id', requireRole(ROLES.ADMIN, ROLES.PETUGAS), validateRequest(updateItemSchema), itemController.updateItem);
router.delete('/:id', requireRole(ROLES.ADMIN), itemController.deleteItem);

module.exports = router;
