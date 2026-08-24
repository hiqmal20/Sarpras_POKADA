const { sendError } = require('../utils/responseHandler');

// Centralized Error Handler Middleware
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Terjadi kesalahan internal server';

  // Handle Supabase/PostgreSQL duplicate key error (23505)
  if (err.code === '23505') {
    return sendError(res, 'Data duplikat telah terdaftar di sistem', 400);
  }

  // Handle Supabase foreign key constraint violation (23503)
  if (err.code === '23503') {
    return sendError(res, 'Relasi data tidak ditemukan atau melanggar batasan database', 400);
  }

  return sendError(res, message, statusCode);
};

module.exports = errorHandler;
