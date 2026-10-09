const userService = require('../services/userService');
const { sendSuccess } = require('../utils/responseHandler');
const AppError = require('../utils/appError');
const { recordLog } = require('../services/auditLogService');

// Get all users
exports.getAllUsers = async (req, res, next) => {
  try {
    const result = await userService.findAllUsers(req.query);
    return sendSuccess(
      res,
      'Data pengguna berhasil dimuat',
      result.users,
      200,
      {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages
      }
    );
  } catch (err) {
    next(err);
  }
};

// Get user by ID
exports.getUserById = async (req, res, next) => {
  try {
    const data = await userService.findUserById(req.params.id);
    return sendSuccess(res, 'Detail pengguna berhasil dimuat', data, 200);
  } catch (err) {
    next(err);
  }
};

// Create user profile
exports.createUser = async (req, res, next) => {
  try {
    const data = await userService.createUserProfile(req.body);
    recordLog({
      action: 'CREATE_USER',
      entityType: 'users',
      entityId: data?.id,
      details: { email: data?.email, role: data?.role, nomor_induk: data?.nomor_induk },
      req
    });
    return sendSuccess(res, 'Profil pengguna berhasil disimpan', data, 201);
  } catch (err) {
    next(err);
  }
};

// Import users from CSV
exports.importUsers = async (req, res, next) => {
  try {
    if (!req.file) {
      return next(new AppError('File CSV wajib diunggah', 400));
    }

    const result = await userService.importUsersFromCSV(req.file.buffer);

    const message = `Import selesai: ${result.success.length} berhasil, ${result.failed.length} gagal`;
    return sendSuccess(res, message, result, result.failed.length > 0 ? 207 : 201);
  } catch (err) {
    next(err);
  }
};

// Upload profile photo (untuk user sendiri atau admin)
exports.uploadPhoto = async (req, res, next) => {
  try {
    if (!req.file) {
      return next(new AppError('File foto wajib diunggah', 400));
    }

    // User hanya bisa upload foto sendiri, kecuali Admin
    const targetUserId = req.params.id;
    const isAdmin = req.user.role === 'Admin';
    const isSelf = req.user.id === targetUserId;

    if (!isAdmin && !isSelf) {
      return next(new AppError('Anda tidak memiliki izin untuk mengunggah foto user lain', 403));
    }

    const updatedUser = await userService.uploadProfilePhoto(
      targetUserId,
      req.file.buffer,
      req.file.mimetype
    );

    return sendSuccess(res, 'Foto profil berhasil diunggah', updatedUser, 200);
  } catch (err) {
    next(err);
  }
};

// Update user profile
exports.updateUser = async (req, res, next) => {
  try {
    const isAdmin = req.user.role === 'Admin';
    let payload = req.body;
    if (!isAdmin) {
      const { name, no_hp, foto, nomor_induk, email } = req.body || {};
      payload = { name, no_hp, foto, nomor_induk, email };
      Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);
    }
    const data = await userService.updateUserProfile(req.params.id, payload);
    recordLog({
      action: 'UPDATE_USER',
      entityType: 'users',
      entityId: req.params.id,
      details: { changed_fields: Object.keys(payload) },
      req
    });
    return sendSuccess(res, 'Profil pengguna berhasil diperbarui', data, 200);
  } catch (err) {
    next(err);
  }
};

// Delete user
exports.deleteUser = async (req, res, next) => {
  try {
    await userService.deleteUser(req.params.id);
    recordLog({
      action: 'DELETE_USER',
      entityType: 'users',
      entityId: req.params.id,
      req
    });
    return sendSuccess(res, 'Pengguna berhasil dihapus', null, 200);
  } catch (err) {
    next(err);
  }
};
