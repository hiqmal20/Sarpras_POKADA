const express = require('express');
const router = express.Router();
const userController = require('../controller/userController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validateRequest');
const { createUserSchema, updateUserSchema } = require('../validations/userValidation');
const { ROLES } = require('../constants/roles');

router.use(requireAuth);

router.get('/', requireRole(ROLES.ADMIN, ROLES.PETUGAS), userController.getAllUsers);
router.get('/:id', requireRole(ROLES.ADMIN, ROLES.PETUGAS), userController.getUserById);
router.post('/', requireRole(ROLES.ADMIN), validateRequest(createUserSchema), userController.createUser);
router.put('/:id', requireRole(ROLES.ADMIN), validateRequest(updateUserSchema), userController.updateUser);
router.delete('/:id', requireRole(ROLES.ADMIN), userController.deleteUser);

module.exports = router;

