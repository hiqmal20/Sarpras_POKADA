const rateLimit = require('express-rate-limit');

// Rate limiter autentikasi: tetap cukup longgar untuk testing, tetapi mencegah brute-force.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'fail', message: 'Terlalu banyak percobaan autentikasi. Silakan coba lagi nanti.' }
});

// General API rate limiter - Proteksi DDoS / Spam request
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 menit
  max: 300, // Maksimal 300 request per IP per menit (longgar untuk polling realtime FE)
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'fail',
    message: 'Batas permintaan API tercapai. Silakan coba beberapa saat lagi.'
  }
});

module.exports = {
  authLimiter,
  apiLimiter
};
