const rateLimit = require('express-rate-limit');

// Rate limiter khusus endpoint Login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 60, // Cukup longgar agar retry setelah timeout tidak terblokir
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'fail',
    message: 'Terlalu banyak percobaan login dari perangkat ini. Silakan tunggu beberapa menit.'
  }
});

// Rate limiter khusus endpoint Refresh Token (background refresh)
const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 150, // Cukup besar untuk menangani tab terbuka dan polling background
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'fail',
    message: 'Batas pembaruan sesi tercapai. Silakan login kembali.'
  }
});

// Rate limiter autentikasi umum (register, change-password)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'fail',
    message: 'Terlalu banyak percobaan autentikasi. Silakan coba lagi nanti.'
  }
});

// General API rate limiter - Proteksi DDoS / Spam request
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 menit
  max: 600, // Maksimal 600 request per IP per menit (longgar untuk polling realtime FE & multi-tab)
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'fail',
    message: 'Batas permintaan API tercapai. Silakan coba beberapa saat lagi.'
  }
});

module.exports = {
  authLimiter,
  loginLimiter,
  refreshLimiter,
  apiLimiter
};
