const express = require('express');
const router = express.Router();
const returnController = require('../controller/returnController');
const validateRequest = require('../middleware/validateRequest');
const { createReturnSchema } = require('../validations/returnValidation');

router.get('/', returnController.getAllReturns);
router.get('/:id', returnController.getReturnById);
router.post('/', validateRequest(createReturnSchema), returnController.createReturn);

module.exports = router;
