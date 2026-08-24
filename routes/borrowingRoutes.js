const express = require('express');
const router = express.Router();
const borrowingController = require('../controller/borrowingController');
const validateRequest = require('../middleware/validateRequest');
const { createBorrowingSchema, updateBorrowingStatusSchema } = require('../validations/borrowingValidation');

router.get('/', borrowingController.getAllBorrowings);
router.get('/:id', borrowingController.getBorrowingById);
router.post('/', validateRequest(createBorrowingSchema), borrowingController.createBorrowing);
router.patch('/:id/status', validateRequest(updateBorrowingStatusSchema), borrowingController.updateBorrowingStatus);

module.exports = router;
