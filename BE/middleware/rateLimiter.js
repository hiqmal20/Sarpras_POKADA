const rateLimit = require('express-rate-limit');

// Rate limiter khusus untuk endpoint autentikasi (Login & Register) - Anti Brute-Force
// [TESTING MODE]: Dibebaskan sementara (pass-through) agar tidak terblokir saat testing berulang kali
// Untuk mengaktifkan kembali saat production, cukup kembalikan ke rateLimit({ windowMs: 15*60*1000, max: 10, ... })
const authLimiter = (req, res, next) => next();

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
