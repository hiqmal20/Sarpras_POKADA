const express = require('express');
const router = express.Router();
const categoryController = require('../controller/categoryController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const { ROLES } = require('../constants/roles');
const validateRequest = require('../middleware/validateRequest');
const { uuidParamHandler } = require('../middleware/validateUuid');
const { createCategorySchema, updateCategorySchema } = require('../validations/categoryValidation');

router.param('id', uuidParamHandler);
router.use(requireAuth);

router.get('/', categoryController.getAllCategories);
router.get('/:id', categoryController.getCategoryById);
router.post('/', requireRole(ROLES.ADMIN, ROLES.PETUGAS), validateRequest(createCategorySchema), categoryController.createCategory);
router.put('/:id', requireRole(ROLES.ADMIN, ROLES.PETUGAS), validateRequest(updateCategorySchema), categoryController.updateCategory);
router.delete('/:id', requireRole(ROLES.ADMIN), categoryController.deleteCategory);

module.exports = router;
