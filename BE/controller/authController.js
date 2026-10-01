const authService = require('../services/authService');
const { sendSuccess } = require('../utils/responseHandler');

// Register user baru
exports.register = async (req, res, next) => {
  try {
    const result = await authService.registerUser(req.body);
    setAuthCookies(res, result);
    return sendSuccess(res, 'Registrasi berhasil! Akun telah terdaftar.', { user: result.user }, 201);
  } catch (err) {
    next(err);
  }
};

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  path: '/'
};

const setAuthCookies = (res, result) => {
  if (result.token) res.cookie('access_token', result.token, { ...cookieOptions, maxAge: 60 * 60 * 1000 });
  if (result.refreshToken) res.cookie('refresh_token', result.refreshToken, { ...cookieOptions, maxAge: 30 * 24 * 60 * 60 * 1000 });
};

// Login user
exports.login = async (req, res, next) => {
  try {
    const result = await authService.loginUser(req.body);
    setAuthCookies(res, result);
    return sendSuccess(res, 'Login berhasil!', { user: result.user }, 200);
  } catch (err) {
    next(err);
  }
};

// Refresh token
exports.refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body || {};
    if (!refreshToken && !req.cookies?.refresh_token) {
      return res.status(400).json({ status: 'fail', message: 'refreshToken wajib diisi' });
    }
    const tokenFromCookie = req.cookies?.refresh_token;
    const result = await authService.refreshToken(tokenFromCookie || refreshToken);
    setAuthCookies(res, result);
    return sendSuccess(res, 'Token berhasil diperbarui', null, 200);
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
    const { name, no_hp, foto, nomor_induk, email } = req.body;
    const updated = await userService.updateUserProfile(req.user.id, {
      name,
      no_hp,
      foto,
      nomor_induk,
      email
    });
    return sendSuccess(res, 'Profil berhasil diperbarui', { user: updated }, 200);
  } catch (err) {
    next(err);
  }
};

exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const result = await authService.changePassword(req.user, currentPassword, newPassword);
    return sendSuccess(res, 'Password berhasil diubah', result, 200);
  } catch (err) {
    next(err);
  }
};

// Logout
exports.logout = async (req, res, next) => {
  try {
    res.clearCookie('access_token', cookieOptions);
    res.clearCookie('refresh_token', cookieOptions);
    return sendSuccess(res, 'Berhasil logout', null, 200);
  } catch (err) {
    next(err);
  }
};
