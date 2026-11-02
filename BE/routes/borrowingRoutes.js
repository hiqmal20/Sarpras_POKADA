const express = require('express');
const router = express.Router();
const borrowingController = require('../controller/borrowingController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const { ROLES } = require('../constants/roles');
const validateRequest = require('../middleware/validateRequest');
const { uuidParamHandler } = require('../middleware/validateUuid');
const { createBorrowingSchema, updateBorrowingStatusSchema } = require('../validations/borrowingValidation');

router.param('id', uuidParamHandler);
router.use(requireAuth);

router.get('/', borrowingController.getAllBorrowings);
router.get('/check-active', requireAuth, borrowingController.checkActiveBorrowing);
router.get('/:id', borrowingController.getBorrowingById);
router.post('/', validateRequest(createBorrowingSchema), borrowingController.createBorrowing);
router.patch('/:id/status', requireRole(ROLES.ADMIN, ROLES.PETUGAS), validateRequest(updateBorrowingStatusSchema), borrowingController.updateBorrowingStatus);

module.exports = router;
