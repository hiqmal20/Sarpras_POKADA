const express = require('express');
const router = express.Router();
const returnController = require('../controller/returnController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const { ROLES } = require('../constants/roles');
const validateRequest = require('../middleware/validateRequest');
const { createReturnSchema } = require('../validations/returnValidation');

router.use(requireAuth);

router.get('/', requireRole(ROLES.ADMIN, ROLES.PETUGAS), returnController.getAllReturns);
router.get('/:id', requireAuth, returnController.getReturnById);
router.post('/', requireRole(ROLES.ADMIN, ROLES.PETUGAS), validateRequest(createReturnSchema), returnController.createReturn);

module.exports = router;
