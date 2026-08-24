const rateLimit = require('express-rate-limit');

// Rate limiter khusus untuk endpoint autentikasi (Login & Register) - Anti Brute-Force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 10, // Maksimal 10 percobaan per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'fail',
    message: 'Terlalu banyak percobaan akses dari IP ini. Silakan coba lagi setelah 15 menit.'
  }
});

// General API rate limiter - Proteksi DDoS / Spam request
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 200, // Maksimal 200 request per IP
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
