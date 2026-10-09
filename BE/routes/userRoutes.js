const express = require('express');
const router = express.Router();
const userController = require('../controller/userController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const { uploadCSV, uploadImage } = require('../middleware/uploadMiddleware');
const { uuidParamHandler } = require('../middleware/validateUuid');

router.param('id', uuidParamHandler);

// Semua route users butuh login
router.use(requireAuth);

// Route spesifik harus di atas route dengan parameter (:id)
router.get('/', requireRole('Admin', 'Petugas'), userController.getAllUsers);
router.post('/', requireRole('Admin'), userController.createUser);

// Import CSV — harus SEBELUM /:id agar tidak dianggap sebagai id
router.post('/import', requireRole('Admin'), uploadCSV.single('file'), userController.importUsers);

// Upload foto profil — user bisa upload foto sendiri, admin bisa upload untuk siapa saja
router.post('/:id/photo', uploadImage.single('photo'), userController.uploadPhoto);

// Route dengan parameter
router.get('/:id', (req, res, next) => {
  if (['Admin', 'Petugas'].includes(req.user.role) || req.user.id === req.params.id) {
    return next();
  }
  return res.status(403).json({
    status: 'fail',
    message: 'Akses ditolak: Anda tidak memiliki izin untuk melihat profil pengguna ini.'
  });
}, userController.getUserById);
router.put('/:id', (req, res, next) => {
  if (req.user.role === 'Admin' || req.user.id === req.params.id) {
    return next();
  }
  return res.status(403).json({
    status: 'fail',
    message: 'Akses ditolak: Anda tidak memiliki izin untuk mengubah data user ini.'
  });
}, userController.updateUser);
router.delete('/:id', requireRole('Admin'), userController.deleteUser);

module.exports = router;
