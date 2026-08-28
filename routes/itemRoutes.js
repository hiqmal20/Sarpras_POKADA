const express = require('express');
const router = express.Router();
const itemController = require('../controller/itemController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const { ROLES } = require('../constants/roles');
const validateRequest = require('../middleware/validateRequest');
const { createItemSchema, updateItemSchema } = require('../validations/itemValidation');

router.use(requireAuth);

router.get('/', itemController.getAllItems);
router.get('/:id', itemController.getItemById);
router.post('/', requireRole(ROLES.ADMIN, ROLES.PETUGAS), validateRequest(createItemSchema), itemController.createItem);
router.put('/:id', requireRole(ROLES.ADMIN, ROLES.PETUGAS), validateRequest(updateItemSchema), itemController.updateItem);
router.delete('/:id', requireRole(ROLES.ADMIN), itemController.deleteItem);

module.exports = router;
