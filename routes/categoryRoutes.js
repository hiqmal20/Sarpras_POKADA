const express = require('express');
const router = express.Router();
const categoryController = require('../controller/categoryController');
const validateRequest = require('../middleware/validateRequest');
const { createCategorySchema, updateCategorySchema } = require('../validations/categoryValidation');

router.get('/', categoryController.getAllCategories);
router.get('/:id', categoryController.getCategoryById);
router.post('/', validateRequest(createCategorySchema), categoryController.createCategory);
router.put('/:id', validateRequest(updateCategorySchema), categoryController.updateCategory);
router.delete('/:id', categoryController.deleteCategory);

module.exports = router;
