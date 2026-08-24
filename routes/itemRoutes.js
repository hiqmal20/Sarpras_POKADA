const express = require('express');
const router = express.Router();
const itemController = require('../controller/itemController');
const validateRequest = require('../middleware/validateRequest');
const { createItemSchema, updateItemSchema } = require('../validations/itemValidation');

router.get('/', itemController.getAllItems);
router.get('/:id', itemController.getItemById);
router.post('/', validateRequest(createItemSchema), itemController.createItem);
router.put('/:id', validateRequest(updateItemSchema), itemController.updateItem);
router.delete('/:id', itemController.deleteItem);

module.exports = router;
