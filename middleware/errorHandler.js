const { sendError } = require('../utils/responseHandler');

const errorHandler = (err, req, res, next) => {
  if (process.env.NODE_ENV !== 'production') {
    console.error('Error:', err);
  } else {
    console.error('Error:', err.message);
  }

  // PostgreSQL duplicate key
  if (err.code === '23505') {
    return sendError(res, 'Data duplikat telah terdaftar di sistem', 400);
  }

  // PostgreSQL foreign key violation
  if (err.code === '23503') {
    return sendError(res, 'Relasi data tidak ditemukan atau melanggar batasan database', 400);
  }

  // CORS
  if (err.message === 'Not allowed by CORS') {
    return sendError(res, 'Akses ditolak oleh CORS', 403);
  }

  // Multer file size exceeded
  if (err.name === 'MulterError' && err.code === 'LIMIT_FILE_SIZE') {
    return sendError(res, 'Ukuran file terlalu besar. Maksimal 2MB untuk CSV dan 5MB untuk gambar', 400);
  }

  // Multer error lainnya
  if (err.name === 'MulterError') {
    return sendError(res, 'Gagal mengunggah file: ' + err.message, 400);
  }

  // Error filter file bukan CSV
  if (err.message && err.message.includes('Hanya file CSV')) {
    return sendError(res, err.message, 400);
  }

  // Error filter file bukan gambar
  if (err.message && err.message.includes('Hanya file gambar')) {
    return sendError(res, err.message, 400);
  }

  const statusCode = err.statusCode || 500;
  const isOperational = err.isOperational || false;

  const message = isOperational
    ? err.message
    : statusCode === 500
      ? 'Terjadi kesalahan internal server'
      : err.message;

  return sendError(res, message, statusCode);
};

module.exports = errorHandler;
