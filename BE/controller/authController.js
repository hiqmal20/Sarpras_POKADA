const authService = require('../services/authService');
const { sendSuccess } = require('../utils/responseHandler');
const supabase = require('../config/supabaseClient');

// Register user baru
exports.register = async (req, res, next) => {
  try {
    const result = await authService.registerUser(req.body);
    return sendSuccess(res, 'Registrasi berhasil! Akun telah terdaftar.', result, 201);
  } catch (err) {
    next(err);
  }
};

// Login user
exports.login = async (req, res, next) => {
  try {
    const result = await authService.loginUser(req.body);
    return sendSuccess(res, 'Login berhasil!', result, 200);
  } catch (err) {
    next(err);
  }
};

// Refresh token
exports.refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ status: 'fail', message: 'refreshToken wajib diisi' });
    }
    const result = await authService.refreshToken(refreshToken);
    return sendSuccess(res, 'Token berhasil diperbarui', result, 200);
  } catch (err) {
    next(err);
  }
};

// Get profile user yang sedang login (Me)
exports.getMe = async (req, res, next) => {
  try {
    return sendSuccess(res, 'Profil berhasil dimuat', { user: req.user }, 200);
  } catch (err) {
    next(err);
  }
};

// Update profile user sendiri (termasuk foto)
exports.updateProfile = async (req, res, next) => {
  try {
    const userService = require('../services/userService');
    // Batasi field agar user biasa tidak bisa self-elevate role / status
    const { name, no_hp, foto, nomor_induk } = req.body;
    const updated = await userService.updateUserProfile(req.user.id, {
      name,
      no_hp,
      foto,
      nomor_induk
    });
    return sendSuccess(res, 'Profil berhasil diperbarui', { user: updated }, 200);
  } catch (err) {
    next(err);
  }
};

// Logout
exports.logout = async (req, res, next) => {
  try {
    await supabase.auth.signOut();
    return sendSuccess(res, 'Berhasil logout', null, 200);
  } catch (err) {
    next(err);
  }
};
