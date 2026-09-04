const express = require('express');
const router = express.Router();
const userController = require('../controller/userController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const { uploadCSV, uploadImage } = require('../middleware/uploadMiddleware');

// Semua route users butuh login
router.use(requireAuth);

// Route spesifik harus di atas route dengan parameter (:id)
router.get('/', userController.getAllUsers);
router.post('/', requireRole('Admin'), userController.createUser);

// Import CSV — harus SEBELUM /:id agar tidak dianggap sebagai id
router.post('/import', requireRole('Admin'), uploadCSV.single('file'), userController.importUsers);

// Upload foto profil — user bisa upload foto sendiri, admin bisa upload untuk siapa saja
router.post('/:id/photo', uploadImage.single('photo'), userController.uploadPhoto);

// Route dengan parameter
router.get('/:id', userController.getUserById);
router.put('/:id', requireRole('Admin'), userController.updateUser);
router.delete('/:id', requireRole('Admin'), userController.deleteUser);

module.exports = router;
