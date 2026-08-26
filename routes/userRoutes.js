const express = require('express');
const router = express.Router();
const userController = require('../controller/userController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

// Semua route users butuh login
router.use(requireAuth);

// Semua user bisa lihat list & detail user
router.get('/', userController.getAllUsers);
router.get('/:id', userController.getUserById);

// Hanya Admin yang bisa create, update, delete user
router.post('/', requireRole('Admin'), userController.createUser);
router.put('/:id', requireRole('Admin'), userController.updateUser);
router.delete('/:id', requireRole('Admin'), userController.deleteUser);

module.exports = router;
