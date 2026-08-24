const userService = require('../services/userService');
const { sendSuccess } = require('../utils/responseHandler');

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
    return sendSuccess(res, 'Profil pengguna berhasil disimpan', data, 201);
  } catch (err) {
    next(err);
  }
};

// Update user profile
exports.updateUser = async (req, res, next) => {
  try {
    const data = await userService.updateUserProfile(req.params.id, req.body);
    return sendSuccess(res, 'Profil pengguna berhasil diperbarui', data, 200);
  } catch (err) {
    next(err);
  }
};

// Delete user
exports.deleteUser = async (req, res, next) => {
  try {
    await userService.deleteUser(req.params.id);
    return sendSuccess(res, 'Pengguna berhasil dihapus', null, 200);
  } catch (err) {
    next(err);
  }
};
