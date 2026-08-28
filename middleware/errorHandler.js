const { sendError } = require('../utils/responseHandler');

const errorHandler = (err, req, res, next) => {
  if (process.env.NODE_ENV !== 'production') {
    console.error('Error:', err);
  } else {
    console.error('Error:', err.message);
  }

  if (err.code === '23505') {
    return sendError(res, 'Data duplikat telah terdaftar di sistem', 400);
  }

  if (err.code === '23503') {
    return sendError(res, 'Relasi data tidak ditemukan atau melanggar batasan database', 400);
  }

  if (err.message === 'Not allowed by CORS') {
    return sendError(res, 'Akses ditolak oleh CORS', 403);
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
